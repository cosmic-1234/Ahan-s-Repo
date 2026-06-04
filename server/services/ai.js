const groq = require('./groq');

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isRateLimitError(error) {
  const msg = (error.message || '').toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

/**
 * Invokes a Groq AI method with up to 3 retries on rate-limit errors (exponential backoff).
 * Groq free tier: 14,400 req/day — effectively unlimited for normal use.
 */
async function invokeGroq(serviceMethod, ...args) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI] Groq '${serviceMethod}' attempt ${attempt}...`);
      const result = await groq[serviceMethod](...args);
      console.log(`[AI] Groq '${serviceMethod}' succeeded.`);
      return result;
    } catch (err) {
      lastError = err;
      console.error(`[AI] Groq '${serviceMethod}' attempt ${attempt} failed: ${err.message}`);

      if (isRateLimitError(err) && attempt < maxRetries) {
        const delay = 10000 * attempt; // 10s, 20s
        console.warn(`[AI] Rate limited. Waiting ${delay / 1000}s before retry...`);
        await sleep(delay);
      } else if (!isRateLimitError(err)) {
        // Non-rate-limit error — fail fast
        break;
      }
    }
  }

  throw lastError;
}

module.exports = {
  analyzeProblem: async (...args) => invokeGroq('analyzeProblem', ...args),
  extractDocument: async (...args) => invokeGroq('extractDocument', ...args),
  comparePartners: async (...args) => invokeGroq('comparePartners', ...args),
  addPartnerFromText: async (...args) => invokeGroq('addPartnerFromText', ...args),
  activeProviderName: 'groq-llama-3.3-70b'
};
