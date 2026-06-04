const claude = require('./claude');
const gemini = require('./gemini');

const hasGemini = !!process.env.GEMINI_API_KEY;
const hasClaude = !!process.env.ANTHROPIC_API_KEY;

// Default to Gemini if GEMINI_API_KEY is set.
// Otherwise, fallback to Claude if ANTHROPIC_API_KEY is set.
// Otherwise, default to Gemini to nudge user towards the free tier.
const activeProviderName = hasGemini ? 'gemini' : (hasClaude ? 'claude' : 'gemini');

const provider = activeProviderName === 'gemini' ? gemini : claude;

module.exports = {
  analyzeProblem: async (...args) => provider.analyzeProblem(...args),
  extractDocument: async (...args) => provider.extractDocument(...args),
  comparePartners: async (...args) => provider.comparePartners(...args),
  profilePartnerFromText: async (...args) => provider.profilePartnerFromText(...args),
  activeProviderName
};
