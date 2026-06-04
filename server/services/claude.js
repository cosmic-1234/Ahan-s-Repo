const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPTS = {
  analyze: `You are an expert Partnership Fitment Analyst for a multinational IT services company. Your role is to analyze client problems and map them to the most suitable technology partners from our partner ecosystem.

When analyzing a client problem:
1. Break down the problem into key requirements, technical needs, and business objectives
2. Evaluate each partner against these requirements
3. Provide a fitment score (0-100) for each relevant partner
4. Explain WHY each partner is or isn't a good fit with specific evidence from their capabilities and use cases
5. Recommend the top partners in ranked order

You must respond in valid JSON format only. No markdown, no code fences.`,

  extractDocument: `You are a document analysis expert. Extract and summarize the key information from the following document content. Identify:
1. Client name and background (if mentioned)
2. Problem statement / business challenges
3. Technical requirements
4. Industry and domain
5. Budget and timeline constraints (if mentioned)
6. Specific technology preferences or constraints
7. Success criteria

Respond in valid JSON format only. No markdown, no code fences.`,

  compare: `You are an expert Partnership Fitment Analyst. Compare the given partners against a specific client problem. For each partner, provide:
1. Strengths relative to this specific problem
2. Weaknesses or gaps
3. Unique differentiators
4. Risk factors
5. Recommended engagement approach

Also provide an overall recommendation with clear rationale. Respond in valid JSON format only. No markdown, no code fences.`,

  profilePartner: `You are a corporate partner profiling assistant. Analyze the capability deck, brochure, or description of a technology company and extract structured profiling information. Respond in valid JSON format only. No markdown, no code fences.`
};

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
  "keyRequirements": ["requirement1", "requirement2", ...],
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

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 4096,
    system: SYSTEM_PROMPTS.analyze,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text;
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try to extract JSON from the response if it has extra text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

async function extractDocument(documentText) {
  const userMessage = `
DOCUMENT CONTENT:
${documentText.substring(0, 15000)}

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

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 2048,
    system: SYSTEM_PROMPTS.extractDocument,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text;
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse document extraction response');
  }
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
      "dimensionScores": {
        "dimension1": 90,
        "dimension2": 75
      }
    }
  ],
  "overallRecommendation": {
    "topChoice": "partnerId",
    "rationale": "Why this partner is the best choice",
    "alternativeScenarios": "When another partner might be preferred"
  }
}`;

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 4096,
    system: SYSTEM_PROMPTS.compare,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text;
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse comparison response');
  }
}

async function addPartnerFromText(documentText) {
  const userMessage = `
DOCUMENT CONTENT:
${documentText.substring(0, 15000)}

You are tasking with profiling a technology partner. Perform the following steps strictly:
1. Extract the partner's name from the document content.
2. For any fields not present in the text (like website, contact email, headquarters, employee count, certifications, and year founded), utilize your extensive pre-trained internet/web knowledge base to search, deduce, and populate real-world public details.
3. CRITICAL: Avoid returning empty arrays, empty strings, or 0 values. If any specific detail is not found in the text or web knowledge, deduce a realistic or average industry value based on the partner's size or profile (do NOT leave them as empty arrays, empty strings, or 0/null/undefined).

Return a JSON object with this exact structure:
{
  "name": "Full official name of the partner company",
  "description": "Professional 2-3 sentence executive description of their focus areas, value proposition, and solutions",
  "solutions": ["List of core business solutions, e.g., Supply Chain Optimization, MES, Predictive Maintenance, Digital Twin. Must NOT be empty."],
  "capabilities": ["List of core technical capabilities or tools, e.g., IoT, Siemens MindSphere, SAP, AWS IoT, Computer Vision. Must NOT be empty."],
  "industries": ["Manufacturing"],
  "useCases": ["Brief description of 1-3 successful projects or deployed use cases. Must NOT be empty."],
  "certifications": ["List of key partner tiers or certifications, e.g., AWS Advanced Partner, SAP Gold Partner. Must NOT be empty."],
  "tier": "Gold", // (Must be exactly one of: "Platinum", "Gold", or "Silver". Base this on their size, certifications, or status. Do NOT leave empty.)
  "website": "Official domain name or URL, e.g. www.company.com (Deduce from internet, do NOT leave empty)",
  "contactEmail": "Contact or partnership email, e.g. info@company.com (Deduce from internet, do NOT leave empty)",
  "headquarters": "City and Country of their main office, e.g. Detroit, USA (Deduce from internet, do NOT leave empty)",
  "employeeCount": 500, // (Estimated or exact global employee count, MUST be a positive integer greater than 0. Deduce from internet, do NOT use 0)
  "yearFounded": 2012 // (Year founded, MUST be a valid 4-digit year. Deduce from internet, do NOT use 0)
}

Focus strictly on manufacturing-related details, capabilities, and use cases, as this portal is strictly scoped for Manufacturing.`;

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-latest',
    max_tokens: 4096,
    system: SYSTEM_PROMPTS.profilePartner,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].text;
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Failed to parse partner profiling response');
  }
}

module.exports = { analyzeProblem, extractDocument, comparePartners, addPartnerFromText };
