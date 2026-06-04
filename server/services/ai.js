/**
 * AI Dispatcher — Multi-Provider with Automatic Fallback
 * ─────────────────────────────────────────────────────────────────────────────
 * Provider priority (configured via env vars):
 *   1. OpenRouter  — FREE, no daily token limits, Llama 3.3 70B
 *                    Set: OPENROUTER_API_KEY=sk-or-v1-...
 *   2. Groq        — FREE, 100K tokens/day limit (resets midnight UTC)
 *                    Supports up to 3 keys for rotation:
 *                    Set: GROQ_API_KEY=gsk_...
 *                         GROQ_API_KEY_2=gsk_...   (optional)
 *                         GROQ_API_KEY_3=gsk_...   (optional)
 *
 * Token efficiency: prompts are trimmed to use ~70% fewer tokens than before.
 * Each analysis uses ~1,200–1,800 tokens (vs 4,500–6,000 before).
 * 20 analyses = ~30,000 tokens max — well within any provider limit.
 */

const openrouter = require('./openrouter');
const groq = require('./groq');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Groq multi-key rotation ──────────────────────────────────────────────
function getGroqKeys() {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
  ].filter(Boolean);
}

// Override groq's API key dynamically
function setGroqKey(key) {
  process.env.GROQ_API_KEY = key;
  // Force re-init of groq client by clearing the require cache
  const id = require.resolve('./groq');
  delete require.cache[id];
}

function isRateLimitError(err) {
  const msg = (err.message || '').toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

function isDailyQuotaError(err) {
  const msg = (err.message || '').toLowerCase();
  return (
    msg.includes('tokens per day') ||
    msg.includes('tpd') ||
    (msg.includes('429') && (msg.includes('hour') || msg.includes('min') || msg.includes('day')))
  );
}

// ── Try Groq with key rotation ───────────────────────────────────────────
async function tryGroq(serviceMethod, ...args) {
  const keys = getGroqKeys();
  if (!keys.length) throw new Error('No GROQ_API_KEY configured');

  let lastError;
  for (const key of keys) {
    // Temporarily set this key
    const originalKey = process.env.GROQ_API_KEY;
    process.env.GROQ_API_KEY = key;

    try {
      const groqModule = require('./groq'); // fresh require (may be cached)
      const result = await groqModule[serviceMethod](...args);
      return result;
    } catch (err) {
      lastError = err;
      process.env.GROQ_API_KEY = originalKey;

      if (isDailyQuotaError(err)) {
        console.warn(`[AI] Groq key ...${key.slice(-6)} hit daily quota. Trying next key...`);
        continue; // try next key
      } else if (isRateLimitError(err)) {
        console.warn(`[AI] Groq transient rate limit. Waiting 8s...`);
        await sleep(8000);
        continue;
      } else {
        break; // non-rate-limit error, stop trying keys
      }
    }
  }
  throw lastError;
}

// ── Main dispatcher ──────────────────────────────────────────────────────
async function invoke(serviceMethod, ...args) {
  // 1. Try OpenRouter first (no daily limits)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      console.log(`[AI] OpenRouter '${serviceMethod}'...`);
      const result = await openrouter[serviceMethod](...args);
      console.log(`[AI] OpenRouter '${serviceMethod}' ✓`);
      return result;
    } catch (err) {
      console.error(`[AI] OpenRouter '${serviceMethod}' failed: ${err.message}`);
      if (isRateLimitError(err)) {
        // Per-minute rate limit on free tier — short wait then try Groq
        console.warn('[AI] OpenRouter rate limited. Waiting 15s then falling back to Groq...');
        await sleep(15000);
      }
      // Fall through to Groq
    }
  }

  // 2. Try Groq (with multi-key rotation)
  if (getGroqKeys().length > 0) {
    try {
      console.log(`[AI] Groq '${serviceMethod}'...`);
      const result = await tryGroq(serviceMethod, ...args);
      console.log(`[AI] Groq '${serviceMethod}' ✓`);
      return result;
    } catch (err) {
      console.error(`[AI] Groq '${serviceMethod}' all keys exhausted: ${err.message}`);
      throw err;
    }
  }

  throw new Error('No AI provider configured. Please set OPENROUTER_API_KEY or GROQ_API_KEY in environment variables.');
}

// ── Active provider label for health endpoint ───────────────────────────
function getActiveProviderName() {
  if (process.env.OPENROUTER_API_KEY) return 'openrouter-llama-3.3-70b';
  if (process.env.GROQ_API_KEY) return 'groq-llama-3.3-70b';
  return 'none';
}

module.exports = {
  analyzeProblem:     (...args) => invoke('analyzeProblem',     ...args),
  extractDocument:    (...args) => invoke('extractDocument',    ...args),
  comparePartners:    (...args) => invoke('comparePartners',    ...args),
  addPartnerFromText: (...args) => invoke('addPartnerFromText', ...args),
  activeProviderName: getActiveProviderName(),
};
