const claude = require('./claude');
const gemini = require('./gemini');

const hasGemini = !!process.env.GEMINI_API_KEY;
const hasClaude = !!process.env.ANTHROPIC_API_KEY;

console.log(`AI Dispatcher Initialized: Gemini: ${hasGemini ? 'Configured ✓' : 'NOT SET ✗'}, Claude: ${hasClaude ? 'Configured ✓' : 'NOT SET ✗'}`);

async function callWithFallback(serviceMethod, ...args) {
  const providers = [];
  
  // Try Gemini first if configured (to utilize free tier)
  if (hasGemini) {
    providers.push({ name: 'gemini', impl: gemini });
  }
  // Try Claude second if configured (or first if Gemini is not set)
  if (hasClaude) {
    providers.push({ name: 'claude', impl: claude });
  }
  
  // Default fallback: if no key is configured, put gemini in so it fails with a clear setup error
  if (providers.length === 0) {
    providers.push({ name: 'gemini', impl: gemini });
  }

  let lastError = null;
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    try {
      console.log(`[AI Dispatcher] Invoking method '${serviceMethod}' via '${provider.name}'...`);
      const result = await provider.impl[serviceMethod](...args);
      console.log(`[AI Dispatcher] Method '${serviceMethod}' succeeded via '${provider.name}'`);
      return result;
    } catch (err) {
      console.error(`[AI Dispatcher] Method '${serviceMethod}' failed via '${provider.name}'. Error: ${err.message}`);
      lastError = err;
      if (i < providers.length - 1) {
        console.warn(`[AI Dispatcher] Attempting failover to secondary provider '${providers[i + 1].name}'...`);
      }
    }
  }
  
  throw lastError || new Error(`No AI provider was able to handle method '${serviceMethod}'`);
}

module.exports = {
  analyzeProblem: async (...args) => callWithFallback('analyzeProblem', ...args),
  extractDocument: async (...args) => callWithFallback('extractDocument', ...args),
  comparePartners: async (...args) => callWithFallback('comparePartners', ...args),
  addPartnerFromText: async (...args) => callWithFallback('addPartnerFromText', ...args),
  activeProviderName: hasGemini ? 'gemini' : (hasClaude ? 'claude' : 'gemini')
};
