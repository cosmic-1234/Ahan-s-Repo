const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { analyzeProblem, extractDocument } = require('../services/ai');
const { parseDocument } = require('../services/documentParser');

const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'partners.json');
const ANALYSES_PATH = path.join(__dirname, '..', 'data', 'analyses.json');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

function readPartners() {
  return JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf-8'));
}

function readAnalyses() {
  return JSON.parse(fs.readFileSync(ANALYSES_PATH, 'utf-8'));
}

function writeAnalyses(analyses) {
  fs.writeFileSync(ANALYSES_PATH, JSON.stringify(analyses, null, 2));
}

// POST /api/analyze/text - Analyze client problem from text
router.post('/text', async (req, res) => {
  try {
    const { problemText } = req.body;

    if (!problemText || problemText.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a detailed problem description (at least 10 characters)' });
    }

    const partners = readPartners();
    const result = await analyzeProblem(problemText, partners, { industry: 'Manufacturing' });

    // Save analysis
    const analysis = {
      id: uuidv4(),
      type: 'text',
      timestamp: new Date().toISOString(),
      input: { problemText, industry: 'Manufacturing' },
      result,
      partnerCount: result.rankedPartners?.length || 0
    };

    const analyses = readAnalyses();
    analyses.unshift(analysis);
    // Keep last 100 analyses
    if (analyses.length > 100) analyses.length = 100;
    writeAnalyses(analyses);

    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', details: error.message });
  }
});

// POST /api/analyze/document - Analyze from uploaded document
router.post('/document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    // Step 1: Extract text from document
    const documentText = await parseDocument(req.file.buffer, req.file.mimetype, req.file.originalname);

    if (!documentText || documentText.trim().length < 20) {
      return res.status(400).json({ error: 'Could not extract sufficient text from the document' });
    }

    // Step 2: Use Claude to extract structured information
    const extraction = await extractDocument(documentText);

    // Step 3: Build problem text from extraction
    const problemText = `
Client: ${extraction.clientName || 'Not specified'}
Problem: ${extraction.problemStatement || extraction.summary}
Business Challenges: ${(extraction.businessChallenges || []).join('; ')}
Technical Requirements: ${(extraction.technicalRequirements || []).join('; ')}
Industry: ${extraction.industry || 'Not specified'}
Domain: ${extraction.domain || 'Not specified'}
Budget: ${extraction.budgetInfo || 'Not specified'}
Timeline: ${extraction.timelineInfo || 'Not specified'}
Technology Preferences: ${(extraction.technologyPreferences || []).join('; ')}
Success Criteria: ${(extraction.successCriteria || []).join('; ')}
    `.trim();

    // Step 4: Analyze against partners
    const partners = readPartners();
    const result = await analyzeProblem(problemText, partners, {
      industry: 'Manufacturing'
    });

    // Save analysis
    const analysis = {
      id: uuidv4(),
      type: 'document',
      timestamp: new Date().toISOString(),
      input: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        extraction,
        problemText
      },
      result,
      partnerCount: result.rankedPartners?.length || 0
    };

    const analyses = readAnalyses();
    analyses.unshift(analysis);
    if (analyses.length > 100) analyses.length = 100;
    writeAnalyses(analyses);

    res.json(analysis);
  } catch (error) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: 'Document analysis failed', details: error.message });
  }
});

// GET /api/analyze/history - Get analysis history
router.get('/history', (req, res) => {
  try {
    const analyses = readAnalyses();
    const limit = parseInt(req.query.limit) || 20;
    res.json({
      analyses: analyses.slice(0, limit),
      total: analyses.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history', details: error.message });
  }
});

// GET /api/analyze/:id - Get single analysis
router.get('/:id', (req, res) => {
  try {
    const analyses = readAnalyses();
    const analysis = analyses.find(a => a.id === req.params.id);
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analysis', details: error.message });
  }
});

module.exports = router;
