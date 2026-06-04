const Groq = require('groq-sdk');

const client = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : null;

// Llama 3.3 70B — best free model on Groq: fast, highly capable, 14400 req/day free
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPTS = {
  analyze: `You are an expert Partnership Fitment Analyst for a multinational IT services company. Your role is to analyze client problems and map them to the most suitable technology partners from our partner ecosystem.

When analyzing a client problem:
1. Break down the problem into key requirements, technical needs, and business objectives
2. Evaluate each partner against these requirements
3. Provide a fitment score (0-100) for each relevant partner
4. Explain WHY each partner is or isn't a good fit with specific evidence from their capabilities and use cases
5. Recommend the top partners in ranked order

You must respond in valid JSON format only. No markdown, no code fences, no explanation outside the JSON.`,

  extractDocument: `You are a document analysis expert. Extract and summarize the key information from the following document content. Identify:
1. Client name and background (if mentioned)
2. Problem statement / business challenges
3. Technical requirements
4. Industry and domain
5. Budget and timeline constraints (if mentioned)
6. Specific technology preferences or constraints
7. Success criteria

Respond in valid JSON format only. No markdown, no code fences, no explanation outside the JSON.`,

  compare: `You are an expert Partnership Fitment Analyst. Compare the given partners against a specific client problem. For each partner, provide:
1. Strengths relative to this specific problem
2. Weaknesses or gaps
3. Unique differentiators
4. Risk factors
5. Recommended engagement approach

Also provide an overall recommendation with clear rationale. Respond in valid JSON format only. No markdown, no code fences.`,

  profilePartner: `You are a corporate partner profiling assistant. Analyze the capability deck, brochure, or description of a technology company and extract structured profiling information. Respond in valid JSON format only. No markdown, no code fences, no explanation outside the JSON.`
};

async function chat(systemPrompt, userMessage) {
  if (!client) {
    throw new Error('GROQ_API_KEY is not set in server/.env');
  }
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ]
  });
  const text = response.choices[0]?.message?.content || '';
  // Parse JSON — strip any accidental markdown fences
  const clean = text.replace(/^```(?:json)?/m, '').replace(/```$/m, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Groq response was not valid JSON: ' + e.message);
  }
}

async function analyzeProblem(problemText, partners, options = {}) {
  const { industry, urgency, budgetRange } = options;
  const partnerSummaries = partners.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    solutions: p.solutions,
    capabilities: p.capabilities,
    industries: p.industries,
    useCases: p.useCases,
    certifications: p.certifications,
    tier: p.tier
  }));

  const userMessage = `
CLIENT PROBLEM:
${problemText}

${industry ? `INDUSTRY: ${industry}` : ''}
${urgency ? `URGENCY: ${urgency}` : ''}
${budgetRange ? `BUDGET RANGE: ${budgetRange}` : ''}

AVAILABLE PARTNERS:
${JSON.stringify(partnerSummaries, null, 2)}

Analyze this client problem and evaluate each partner's fitment. Return a JSON object with this exact structure:
{
  "problemSummary": "Brief summary of the client's core problem",
  "keyRequirements": ["requirement1", "requirement2"],
  "industryContext": "Analysis of industry-specific considerations",
  "rankedPartners": [
    {
      "partnerId": "p001",
      "partnerName": "Partner Name",
      "fitmentScore": 85,
      "overallAssessment": "Why this partner is recommended",
      "strengthsMatched": ["strength1", "strength2"],
      "capabilitiesMatched": ["cap1", "cap2"],
      "relevantUseCases": ["Relevant use case from their portfolio"],
      "gaps": ["Any gaps or concerns"],
      "recommendedApproach": "How to engage this partner for this problem"
    }
  ],
  "analysisNotes": "Any additional strategic observations"
}

Only include partners with fitment score > 20. Rank by fitment score descending.`;

  return await chat(SYSTEM_PROMPTS.analyze, userMessage);
}

async function extractDocument(documentText) {
  const userMessage = `
DOCUMENT CONTENT:
${documentText.substring(0, 30000)}

Extract the key information and return a JSON object with this structure:
{
  "clientName": "Name if identified",
  "problemStatement": "Core problem or challenge described",
  "businessChallenges": ["challenge1", "challenge2"],
  "technicalRequirements": ["req1", "req2"],
  "industry": "Primary industry",
  "domain": "Specific domain area",
  "budgetInfo": "Budget details if mentioned",
  "timelineInfo": "Timeline details if mentioned",
  "technologyPreferences": ["tech1", "tech2"],
  "successCriteria": ["criteria1", "criteria2"],
  "summary": "Executive summary of the document in 2-3 sentences"
}`;

  return await chat(SYSTEM_PROMPTS.extractDocument, userMessage);
}

async function comparePartners(problemText, selectedPartners, options = {}) {
  const userMessage = `
CLIENT PROBLEM:
${problemText}

PARTNERS TO COMPARE:
${JSON.stringify(selectedPartners.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    solutions: p.solutions,
    capabilities: p.capabilities,
    industries: p.industries,
    useCases: p.useCases,
    certifications: p.certifications,
    tier: p.tier
  })), null, 2)}

Compare these partners specifically against this client problem. Return a JSON object with this structure:
{
  "problemContext": "Brief restatement of the problem",
  "comparisonDimensions": ["dimension1", "dimension2"],
  "partnerAnalyses": [
    {
      "partnerId": "p001",
      "partnerName": "Partner Name",
      "fitmentScore": 85,
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1"],
      "differentiators": ["What makes them unique for this problem"],
      "riskFactors": ["risk1"],
      "engagementApproach": "Recommended approach",
      "estimatedTimeline": "Rough timeline estimate",
      "dimensionScores": { "dimension1": 90, "dimension2": 75 }
    }
  ],
  "overallRecommendation": {
    "topChoice": "partnerId",
    "rationale": "Why this partner is the best choice",
    "alternativeScenarios": "When another partner might be preferred"
  }
}`;

  return await chat(SYSTEM_PROMPTS.compare, userMessage);
}

async function addPartnerFromText(documentText) {
  const userMessage = `
DOCUMENT CONTENT:
${documentText.substring(0, 30000)}

You are tasked with profiling a technology partner. Follow these steps strictly:
1. Extract the partner's name from the document content.
2. For any fields not in the text (website, email, HQ, employee count, certifications, year founded), use your knowledge to fill in real-world public details.
3. CRITICAL: Never return empty arrays, empty strings, or 0 values. Deduce realistic values from context if specific data is unavailable.

Return a JSON object with this EXACT structure:
{
  "name": "Full official name of the partner company",
  "description": "Professional 2-3 sentence executive description of their focus areas, value proposition, and solutions",
  "solutions": ["Supply Chain Optimization", "MES", "Predictive Maintenance"],
  "capabilities": ["IoT", "SAP", "AWS IoT", "Computer Vision"],
  "industries": ["Manufacturing"],
  "useCases": ["Brief description of 1-3 successful deployed use cases"],
  "certifications": ["AWS Advanced Partner", "SAP Gold Partner"],
  "tier": "Gold",
  "website": "www.company.com",
  "contactEmail": "info@company.com",
  "headquarters": "City, Country",
  "employeeCount": 500,
  "yearFounded": 2012
}

Rules:
- "tier" must be exactly one of: "Platinum", "Gold", or "Silver"
- "employeeCount" must be a positive integer > 0
- "yearFounded" must be a valid 4-digit year
- Focus strictly on manufacturing-related capabilities and use cases`;

  return await chat(SYSTEM_PROMPTS.profilePartner, userMessage);
}

module.exports = { analyzeProblem, extractDocument, comparePartners, addPartnerFromText };
