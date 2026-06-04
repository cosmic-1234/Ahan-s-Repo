const gemini = require('./gemini');

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Extract the retryDelay suggested by the API from error details (e.g. "56s" → 56000ms)
function extractRetryDelay(error) {
  try {
    if (error.errorDetails && Array.isArray(error.errorDetails)) {
      for (const detail of error.errorDetails) {
        if (detail['@type'] && detail['@type'].includes('RetryInfo') && detail.retryDelay) {
          const match = String(detail.retryDelay).match(/(\d+(?:\.\d+)?)/);
          if (match) {
            return Math.ceil(parseFloat(match[1]) * 1000); // convert seconds → ms
          }
        }
      }
    }
    // Fallback: parse from error message string "Please retry in Xs"
    const msgMatch = (error.message || '').match(/retry in ([\d.]+)s/i);
    if (msgMatch) {
      return Math.ceil(parseFloat(msgMatch[1]) * 1000);
    }
  } catch (_) {}
  return null;
}

async function retryWithBackoff(fn, serviceMethod, maxRetries = 5, initialDelay = 2000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const errorMessage = error.message || '';
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Quota exceeded') || errorMessage.includes('Rate limit');
      const isTransient = errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('timeout') || errorMessage.includes('fetch failed');

      if (attempt >= maxRetries) {
        console.error(`[AI Dispatcher] Method '${serviceMethod}' failed after ${attempt} attempts.`);
        throw error;
      }

      let delay;
      if (isRateLimit) {
        // Respect the API's own suggested retry delay to avoid burning quota
        const apiSuggestedDelay = extractRetryDelay(error);
        delay = apiSuggestedDelay ? apiSuggestedDelay + 1000 : initialDelay * Math.pow(2, attempt - 1);
        console.warn(`[AI Dispatcher] Method '${serviceMethod}' attempt ${attempt} rate-limited. Waiting ${Math.round(delay / 1000)}s before retry...`);
      } else {
        // Standard exponential backoff for transient errors
        delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`[AI Dispatcher] Method '${serviceMethod}' attempt ${attempt} failed: ${errorMessage}. Retrying in ${delay}ms...`);
      }
      await sleep(delay);
    }
  }
}

async function invokeGemini(serviceMethod, ...args) {
  console.log(`[AI Dispatcher] Invoking method '${serviceMethod}' via Google Gemini (with retries)...`);
  return await retryWithBackoff(() => gemini[serviceMethod](...args), serviceMethod);
}

module.exports = {
  analyzeProblem: async (...args) => invokeGemini('analyzeProblem', ...args),
  extractDocument: async (...args) => invokeGemini('extractDocument', ...args),
  comparePartners: async (...args) => invokeGemini('comparePartners', ...args),
  addPartnerFromText: async (...args) => invokeGemini('addPartnerFromText', ...args),
  activeProviderName: 'gemini'
};
