const gemini = require('./gemini');
const claude = require('./claude');

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if error is a quota/rate-limit error that warrants switching to fallback
function isQuotaError(error) {
  const msg = (error.message || '').toLowerCase();
  const status = error.status;
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('quota exceeded') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  );
}

// Check if error is a transient network error worth retrying on same provider
function isTransientError(error) {
  const msg = (error.message || '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('service unavailable') ||
    msg.includes('timeout') ||
    msg.includes('fetch failed') ||
    msg.includes('network')
  );
}

/**
 * Try Gemini first. On quota errors, instantly switch to Claude.
 * Only retry on transient network errors (up to 2 extra attempts).
 */
async function invokeWithFallback(serviceMethod, ...args) {
  // --- Attempt Gemini (up to 2 tries for transient errors only) ---
  let geminiError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[AI] Trying Gemini '${serviceMethod}' (attempt ${attempt})...`);
      const result = await gemini[serviceMethod](...args);
      console.log(`[AI] Gemini '${serviceMethod}' succeeded.`);
      return result;
    } catch (err) {
      geminiError = err;
      if (isQuotaError(err)) {
        // Quota exhausted — no point retrying Gemini, go to Claude immediately
        console.warn(`[AI] Gemini quota/rate-limit hit for '${serviceMethod}'. Switching to Claude instantly.`);
        break;
      } else if (isTransientError(err) && attempt < 2) {
        // Transient error — wait briefly and retry once
        console.warn(`[AI] Gemini transient error for '${serviceMethod}': ${err.message}. Retrying in 3s...`);
        await sleep(3000);
      } else {
        // Unknown error — fall through to Claude
        console.warn(`[AI] Gemini error for '${serviceMethod}': ${err.message}. Switching to Claude.`);
        break;
      }
    }
  }

  // --- Fallback to Claude ---
  try {
    console.log(`[AI] Using Claude as fallback for '${serviceMethod}'...`);
    const result = await claude[serviceMethod](...args);
    console.log(`[AI] Claude '${serviceMethod}' succeeded.`);
    return result;
  } catch (claudeErr) {
    console.error(`[AI] Claude also failed for '${serviceMethod}': ${claudeErr.message}`);
    // Throw the Claude error (more recent), but include Gemini context
    throw new Error(
      `Both Gemini and Claude failed for '${serviceMethod}'. ` +
      `Gemini: ${geminiError?.message || 'unknown'}. Claude: ${claudeErr.message}`
    );
  }
}

module.exports = {
  analyzeProblem: async (...args) => invokeWithFallback('analyzeProblem', ...args),
  extractDocument: async (...args) => invokeWithFallback('extractDocument', ...args),
  comparePartners: async (...args) => invokeWithFallback('comparePartners', ...args),
  addPartnerFromText: async (...args) => invokeWithFallback('addPartnerFromText', ...args),
  activeProviderName: 'gemini+claude-fallback'
};
