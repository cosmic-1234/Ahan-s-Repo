const gemini = require('./gemini');

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff(fn, serviceMethod, maxRetries = 4, initialDelay = 1500) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const errorMessage = error.message || '';
      // Check if it is a rate limit or transient error
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('Quota exceeded') || errorMessage.includes('Rate limit');
      const isTransient = errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('timeout') || errorMessage.includes('fetch failed');
      
      if (attempt >= maxRetries) {
        console.error(`[AI Dispatcher] Method '${serviceMethod}' failed after ${attempt} attempts.`);
        throw error;
      }
      
      // Calculate delay with exponential backoff (e.g. 1.5s, 3s, 6s, 12s)
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.warn(`[AI Dispatcher] Method '${serviceMethod}' attempt ${attempt} failed: ${errorMessage}. Retrying in ${delay}ms...`);
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
