const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ANALYSES_PATH = path.join(__dirname, '..', 'data', 'analyses.json');
const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'partners.json');

function readAnalyses() {
  return JSON.parse(fs.readFileSync(ANALYSES_PATH, 'utf-8'));
}

function readPartners() {
  return JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf-8'));
}

// POST /api/export/pdf - Generate PDF report data
router.post('/pdf', (req, res) => {
  try {
    const { analysisId } = req.body;
    const analyses = readAnalyses();
    const analysis = analyses.find(a => a.id === analysisId);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Return structured data for client-side PDF generation
    const partners = readPartners();
    const enrichedPartners = (analysis.result?.rankedPartners || []).map(rp => {
      const fullPartner = partners.find(p => p.id === rp.partnerId);
      return { ...rp, fullDetails: fullPartner || null };
    });

    res.json({
      report: {
        title: 'Partnership Fitment Analysis Report',
        generatedAt: new Date().toISOString(),
        analysisId: analysis.id,
        analysisDate: analysis.timestamp,
        analysisType: analysis.type,
        problemSummary: analysis.result?.problemSummary || '',
        keyRequirements: analysis.result?.keyRequirements || [],
        industryContext: analysis.result?.industryContext || '',
        rankedPartners: enrichedPartners,
        analysisNotes: analysis.result?.analysisNotes || '',
        input: {
          problemText: analysis.input?.problemText || '',
          industry: analysis.input?.industry || analysis.input?.extraction?.industry || '',
          urgency: analysis.input?.urgency || '',
          budgetRange: analysis.input?.budgetRange || '',
          fileName: analysis.input?.fileName || null
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report data', details: error.message });
  }
});

// POST /api/export/excel - Generate Excel report data
router.post('/excel', (req, res) => {
  try {
    const { analysisId } = req.body;
    const analyses = readAnalyses();
    const analysis = analyses.find(a => a.id === analysisId);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const partners = readPartners();
    const rows = (analysis.result?.rankedPartners || []).map((rp, index) => {
      const fullPartner = partners.find(p => p.id === rp.partnerId);
      return {
        Rank: index + 1,
        'Partner Name': rp.partnerName,
        'Fitment Score': rp.fitmentScore,
        'Overall Assessment': rp.overallAssessment,
        'Strengths Matched': (rp.strengthsMatched || []).join('; '),
        'Capabilities Matched': (rp.capabilitiesMatched || []).join('; '),
        'Relevant Use Cases': (rp.relevantUseCases || []).join('; '),
        'Gaps': (rp.gaps || []).join('; '),
        'Recommended Approach': rp.recommendedApproach || '',
        'Tier': fullPartner?.tier || '',
        'Contact': fullPartner?.contactEmail || ''
      };
    });

    res.json({
      report: {
        title: 'Partnership Fitment Analysis',
        analysisDate: analysis.timestamp,
        problemSummary: analysis.result?.problemSummary || '',
        rows
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate excel data', details: error.message });
  }
});

module.exports = router;
