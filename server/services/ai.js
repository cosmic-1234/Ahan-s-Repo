const groq = require('./groq');
const gemini = require('./gemini');

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isRateLimitError(error) {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

/**
 * Returns true if the error is a daily token quota exhaustion (TPD).
 * These won't recover with a short retry — need to fall back to another provider.
 */
function isDailyQuotaError(error) {
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('tokens per day') ||
    msg.includes('tpd') ||
    msg.includes('daily') ||
    // Groq TPD errors mention "limit" and a large token count
    (msg.includes('429') && msg.includes('please try again in') && (
      msg.includes('hour') || msg.includes('min')
    ))
  );
}

function isGeminiAvailable() {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Invokes a Groq AI method with up to 2 retries on transient rate-limit errors.
 * On daily quota exhaustion, immediately falls back to Gemini if available.
 */
async function invokeWithFallback(serviceMethod, ...args) {
  let lastGroqError;

  // --- Try Groq first ---
  const maxRetries = 2;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI] Groq '${serviceMethod}' attempt ${attempt}...`);
      const result = await groq[serviceMethod](...args);
      console.log(`[AI] Groq '${serviceMethod}' succeeded.`);
      return result;
    } catch (err) {
      lastGroqError = err;
      console.error(`[AI] Groq '${serviceMethod}' attempt ${attempt} failed: ${err.message}`);

      if (isDailyQuotaError(err)) {
        // Daily limit hit — no point retrying, fall through to Gemini immediately
        console.warn(`[AI] Groq daily token quota exhausted. Falling back to Gemini...`);
        break;
      } else if (isRateLimitError(err) && attempt < maxRetries) {
        // Transient per-minute rate limit — short wait then retry
        const delay = 8000 * attempt; // 8s, 16s
        console.warn(`[AI] Groq rate limited (transient). Waiting ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        // Non-rate-limit error — fail fast, no point retrying
        break;
      }
    }
  }

  // --- Fall back to Gemini ---
  if (isGeminiAvailable()) {
    try {
      console.log(`[AI] Gemini '${serviceMethod}' fallback attempt...`);
      const result = await gemini[serviceMethod](...args);
      console.log(`[AI] Gemini '${serviceMethod}' fallback succeeded.`);
      return result;
    } catch (geminiErr) {
      console.error(`[AI] Gemini '${serviceMethod}' fallback failed: ${geminiErr.message}`);
      // Throw Groq error if both fail (Groq is primary)
      throw lastGroqError;
    }
  }

  // No fallback available — throw the last Groq error
  throw lastGroqError;
}

// Determine active provider name for health check display
function getActiveProviderName() {
  // This is the primary — Gemini is a fallback
  if (process.env.GROQ_API_KEY) return 'groq-llama-3.3-70b';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  return 'none';
}

module.exports = {
  analyzeProblem:    (...args) => invokeWithFallback('analyzeProblem',    ...args),
  extractDocument:   (...args) => invokeWithFallback('extractDocument',   ...args),
  comparePartners:   (...args) => invokeWithFallback('comparePartners',   ...args),
  addPartnerFromText:(...args) => invokeWithFallback('addPartnerFromText',...args),
  activeProviderName: getActiveProviderName(),
};
