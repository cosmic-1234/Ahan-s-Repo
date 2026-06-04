/**
 * OpenRouter AI Service
 * ─────────────────────────────────────────────────────────────────────────────
 * OpenRouter routes to free open-source models with NO daily token limits.
 * Free tier: per-minute rate limits only (no daily cap that blocks 20+ analyses).
 *
 * Primary model : meta-llama/llama-3.3-70b-instruct:free
 *   → Same model as Groq but routed through OpenRouter's free tier
 * Fallback model: meta-llama/llama-3.1-8b-instruct:free (smaller, faster fallback)
 *
 * Get a FREE key at: https://openrouter.ai/ (no credit card required)
 * Set env var: OPENROUTER_API_KEY=sk-or-v1-...
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY_MODEL   = 'meta-llama/llama-3.3-70b-instruct:free';
const FALLBACK_MODEL  = 'meta-llama/llama-3.1-8b-instruct:free';

// ── Compact partner summary (reduces tokens by ~70% vs full JSON) ──────────
function compactPartner(p) {
  return {
    id:   p.id,
    name: p.name,
    tier: p.tier,
    hq:   p.headquarters || '',
    solutions:    (p.solutions    || []).slice(0, 5),
    capabilities: (p.capabilities || []).slice(0, 5),
    useCases:     (p.useCases     || []).slice(0, 2),
    certs:        (p.certifications || []).slice(0, 3),
  };
}

// ── Low-level chat wrapper ────────────────────────────────────────────────
async function chat(systemPrompt, userMessage, model = PRIMARY_MODEL) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const response = await fetch(OPENROUTER_BASE, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://ahan-s-repo.onrender.com',
      'X-Title':       'Partnership Fitment Agent',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens:  2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${errText}`);
  }

  const json = await response.json();

  // Handle OpenRouter free-model rate limit (429)
  if (json.error) {
    throw new Error(`OpenRouter error: ${JSON.stringify(json.error)}`);
  }

  const text = (json.choices?.[0]?.message?.content || '').trim();
  const clean = text.replace(/^```(?:json)?/m, '').replace(/```$/m, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    // Try fallback model if parse fails
    if (model === PRIMARY_MODEL) {
      console.warn('[OpenRouter] Parse failed on primary model, retrying with fallback...');
      return chat(systemPrompt, userMessage, FALLBACK_MODEL);
    }
    throw new Error('OpenRouter response was not valid JSON');
  }
}

// ── System prompts (concise to save tokens) ──────────────────────────────
const SYSTEM = {
  analyze: `You are a Partnership Fitment Analyst for a smart manufacturing IT company. Analyze client problems and match them to the best technology partners. Respond in valid JSON only — no markdown, no code fences.`,

  extract: `You are a document analysis expert. Extract structured information from documents. Respond in valid JSON only — no markdown, no code fences.`,

  compare: `You are a Partnership Fitment Analyst. Compare technology partners against a client problem. Respond in valid JSON only — no markdown, no code fences.`,

  profile: `You are a corporate partner profiling assistant for manufacturing technology. Extract partner information from documents. Respond in valid JSON only — no markdown, no code fences.`,
};

// ── analyzeProblem ───────────────────────────────────────────────────────
async function analyzeProblem(problemText, partners, options = {}) {
  const { industry, urgency, budgetRange } = options;
  const partnerList = partners.map(compactPartner);

  const userMessage = `CLIENT PROBLEM: ${problemText}
${industry ? `INDUSTRY: ${industry}` : ''}${urgency ? ` | URGENCY: ${urgency}` : ''}${budgetRange ? ` | BUDGET: ${budgetRange}` : ''}

PARTNERS:
${JSON.stringify(partnerList)}

Return JSON matching this schema exactly:
{
  "problemSummary": "string",
  "keyRequirements": ["string"],
  "industryContext": "string",
  "rankedPartners": [
    {
      "partnerId": "string",
      "partnerName": "string",
      "fitmentScore": 0-100,
      "overallAssessment": "string",
      "strengthsMatched": ["string"],
      "capabilitiesMatched": ["string"],
      "relevantUseCases": ["string"],
      "gaps": ["string"],
      "recommendedApproach": "string"
    }
  ],
  "analysisNotes": "string"
}
Only include partners with fitmentScore > 20. Sort by fitmentScore descending.`;

  return chat(SYSTEM.analyze, userMessage);
}

// ── extractDocument ──────────────────────────────────────────────────────
async function extractDocument(documentText) {
  const userMessage = `DOCUMENT (first 20000 chars):
${documentText.substring(0, 20000)}

Return JSON:
{
  "clientName": "string",
  "problemStatement": "string",
  "businessChallenges": ["string"],
  "technicalRequirements": ["string"],
  "industry": "string",
  "domain": "string",
  "budgetInfo": "string",
  "timelineInfo": "string",
  "technologyPreferences": ["string"],
  "successCriteria": ["string"],
  "summary": "string"
}`;

  return chat(SYSTEM.extract, userMessage);
}

// ── comparePartners ──────────────────────────────────────────────────────
async function comparePartners(problemText, selectedPartners) {
  const userMessage = `CLIENT PROBLEM: ${problemText}

PARTNERS TO COMPARE:
${JSON.stringify(selectedPartners.map(compactPartner))}

Return JSON:
{
  "problemContext": "string",
  "comparisonDimensions": ["string"],
  "partnerAnalyses": [
    {
      "partnerId": "string",
      "partnerName": "string",
      "fitmentScore": 0-100,
      "strengths": ["string"],
      "weaknesses": ["string"],
      "differentiators": ["string"],
      "riskFactors": ["string"],
      "engagementApproach": "string",
      "estimatedTimeline": "string",
      "dimensionScores": { "dimension": score }
    }
  ],
  "overallRecommendation": {
    "topChoice": "partnerId",
    "rationale": "string",
    "alternativeScenarios": "string"
  }
}`;

  return chat(SYSTEM.compare, userMessage);
}

// ── addPartnerFromText ───────────────────────────────────────────────────
async function addPartnerFromText(documentText) {
  const userMessage = `DOCUMENT:
${documentText.substring(0, 20000)}

Extract partner profile. Return JSON:
{
  "name": "string",
  "description": "string (2-3 sentences)",
  "solutions": ["string"],
  "capabilities": ["string"],
  "industries": ["Manufacturing"],
  "useCases": ["string"],
  "certifications": ["string"],
  "tier": "Platinum|Gold|Silver",
  "website": "string",
  "contactEmail": "string",
  "headquarters": "string",
  "employeeCount": number,
  "yearFounded": number
}
Use your knowledge to fill missing public fields. Never return empty arrays or 0 values.`;

  return chat(SYSTEM.profile, userMessage);
}

module.exports = { analyzeProblem, extractDocument, comparePartners, addPartnerFromText };
