require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const analysesPath = path.join(dataDir, 'analyses.json');
if (!fs.existsSync(analysesPath)) {
  fs.writeFileSync(analysesPath, '[]');
}

// Routes
app.use('/api/partners', require('./routes/partners'));
app.use('/api/analyze', require('./routes/analyze'));
app.use('/api/compare', require('./routes/compare'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/export', require('./routes/export'));
// Serve static assets in production if built
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`  Serving static assets from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  
  // Wildcard handler to support client-side routing (React Router)
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Health check
app.get('/api/health', (req, res) => {
  const { activeProviderName } = require('./services/ai');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!(process.env.OPENROUTER_API_KEY || process.env.GROQ_API_KEY),
    activeProvider: activeProviderName,
    openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
    groqConfigured: !!process.env.GROQ_API_KEY,
    groqKeys: [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean).length,
  });
});

// AI Credits endpoint — fetches live usage from OpenRouter
app.get('/api/credits', async (req, res) => {
  try {
    const provider = process.env.OPENROUTER_API_KEY ? 'openrouter' : 'groq';

    if (process.env.OPENROUTER_API_KEY) {
      // OpenRouter provides key info: usage, limit, is_free_tier
      const resp = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
      });
      if (!resp.ok) throw new Error(`OpenRouter auth check failed: ${resp.status}`);
      const json = await resp.json();
      const data = json.data || json;
      const isFree = data.is_free_tier ?? true;
      const usage  = data.usage  ?? 0;  // credits used (USD)
      const limit  = data.limit  ?? null; // null = unlimited on free tier

      return res.json({
        provider: 'OpenRouter (Llama 3.3 70B)',
        isFree,
        // Free tier: no hard credit limit, just rate limits per minute
        creditsUsed:      isFree ? null : usage,
        creditsRemaining: isFree ? null : (limit ? limit - usage : null),
        creditLimit:      isFree ? null : limit,
        usagePct:         (!isFree && limit) ? Math.round((usage / limit) * 100) : 0,
        // Rate limit info from OpenRouter
        rateLimit: data.rate_limit || null,
        status: isFree ? 'free_unlimited' : (limit && usage >= limit * 0.9 ? 'near_limit' : 'ok'),
        label: isFree
          ? '∞ Free Tier — No Daily Limit'
          : `$${(limit - usage).toFixed(4)} remaining of $${limit?.toFixed(2)}`,
      });
    }

    // Groq fallback info
    if (process.env.GROQ_API_KEY) {
      const groqKeys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3,
      ].filter(Boolean).length;
      return res.json({
        provider: 'Groq (Llama 3.3 70B)',
        isFree: true,
        creditsUsed: null,
        creditsRemaining: null,
        status: 'ok',
        groqKeys,
        label: `Free tier · ${groqKeys} key${groqKeys > 1 ? 's' : ''} · 100K tokens/day each`,
      });
    }

    res.status(503).json({ error: 'No AI provider configured' });
  } catch (err) {
    console.error('[Credits]', err.message);
    res.status(500).json({ error: 'Failed to fetch credit info', details: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, async () => {
  const { activeProviderName } = require('./services/ai');
  const { useMongo, getPartners } = require('./services/db');
  console.log(`\n  Partnership Fitment Agent API Server`);
  console.log(`  ────────────────────────────────────`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`  OpenRouter (Llama 3.3): ${process.env.OPENROUTER_API_KEY ? 'Configured ✓ PRIMARY' : 'NOT SET — get free key at openrouter.ai'}`);
  console.log(`  Groq (Llama 3.3 70B):  ${process.env.GROQ_API_KEY ? 'Configured ✓ fallback' : 'NOT SET'}`);
  const groqKeys = [process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean).length;
  if (groqKeys) console.log(`  Groq extra keys:       ${groqKeys} additional rotation key(s) ✓`);
  console.log(`  Active Provider:       ${activeProviderName.toUpperCase()} ⚡`);
  console.log(`  Database Mode:      ${useMongo ? 'MongoDB 🗄️' : 'Local JSON Files 📁'}`);
  
  if (useMongo) {
    try {
      await getPartners();
    } catch (e) {
      console.error('  MongoDB connection test failed:', e.message);
    }
  }
  console.log(`  Data dir:           ${dataDir}`);
  console.log('');
});
