const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'partners.json');
const ANALYSES_PATH = path.join(__dirname, '..', 'data', 'analyses.json');

function readPartners() {
  return JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf-8'));
}

function readAnalyses() {
  return JSON.parse(fs.readFileSync(ANALYSES_PATH, 'utf-8'));
}

// GET /api/analytics/dashboard
router.get('/dashboard', (req, res) => {
  try {
    const partners = readPartners();
    const analyses = readAnalyses();

    // Total stats
    const totalPartners = partners.length;
    const totalAnalyses = analyses.length;

    // Average fitment score across all analyses
    let allScores = [];
    analyses.forEach(a => {
      if (a.result && a.result.rankedPartners) {
        a.result.rankedPartners.forEach(rp => {
          allScores.push(rp.fitmentScore);
        });
      }
    });
    const avgFitmentScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;

    // Top partners by appearance in results
    const partnerFrequency = {};
    const partnerScores = {};
    analyses.forEach(a => {
      if (a.result && a.result.rankedPartners) {
        a.result.rankedPartners.forEach(rp => {
          const name = rp.partnerName;
          partnerFrequency[name] = (partnerFrequency[name] || 0) + 1;
          if (!partnerScores[name]) partnerScores[name] = [];
          partnerScores[name].push(rp.fitmentScore);
        });
      }
    });

    const topPartners = Object.entries(partnerFrequency)
      .map(([name, count]) => ({
        name,
        count,
        avgScore: Math.round(
          partnerScores[name].reduce((a, b) => a + b, 0) / partnerScores[name].length
        )
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Capability matched distribution from analyses
    const capabilityMatchCount = {};
    analyses.forEach(a => {
      if (a.result && a.result.rankedPartners) {
        a.result.rankedPartners.forEach(rp => {
          if (rp.capabilitiesMatched) {
            rp.capabilitiesMatched.forEach(cap => {
              capabilityMatchCount[cap] = (capabilityMatchCount[cap] || 0) + 1;
            });
          }
        });
      }
    });

    const capabilityDistribution = Object.entries(capabilityMatchCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Analysis type distribution
    const textAnalyses = analyses.filter(a => a.type === 'text').length;
    const documentAnalyses = analyses.filter(a => a.type === 'document').length;

    // Tier distribution
    const tierCount = {};
    partners.forEach(p => {
      tierCount[p.tier] = (tierCount[p.tier] || 0) + 1;
    });

    // Analyses over time (last 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const analysesOverTime = {};
    analyses
      .filter(a => new Date(a.timestamp) >= thirtyDaysAgo)
      .forEach(a => {
        const day = a.timestamp.split('T')[0];
        analysesOverTime[day] = (analysesOverTime[day] || 0) + 1;
      });

    // Recent analyses (last 10)
    const recentAnalyses = analyses.slice(0, 10).map(a => ({
      id: a.id,
      type: a.type,
      timestamp: a.timestamp,
      summary: a.result?.problemSummary || a.input?.problemText?.substring(0, 100) || 'Document analysis',
      topPartner: a.result?.rankedPartners?.[0]?.partnerName || 'N/A',
      topScore: a.result?.rankedPartners?.[0]?.fitmentScore || 0,
      partnerCount: a.partnerCount || 0
    }));

    res.json({
      totalPartners,
      totalAnalyses,
      avgFitmentScore,
      topPartners,
      capabilityDistribution,
      analysisTypes: { text: textAnalyses, document: documentAnalyses },
      tierDistribution: tierCount,
      analysesOverTime,
      recentAnalyses
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate analytics', details: error.message });
  }
});

module.exports = router;
