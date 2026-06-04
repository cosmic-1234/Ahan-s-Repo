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
    apiKeyConfigured: !!process.env.GEMINI_API_KEY || !!process.env.ANTHROPIC_API_KEY,
    activeProvider: activeProviderName,
    claudeConfigured: !!process.env.ANTHROPIC_API_KEY,
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
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
  console.log(`  Claude (Anthropic): ${process.env.ANTHROPIC_API_KEY ? 'Configured ✓' : 'NOT SET ✗'}`);
  console.log(`  Gemini (Google):    ${process.env.GEMINI_API_KEY ? 'Configured ✓' : 'NOT SET ✗'}`);
  console.log(`  Active Provider:    ${activeProviderName.toUpperCase()} ⚡`);
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
