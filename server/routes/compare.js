const express = require('express');
const router = express.Router();
const { comparePartners } = require('../services/ai');
const { getPartners } = require('../services/db');

// POST /api/compare - Compare selected partners against a problem
router.post('/', async (req, res) => {
  try {
    const { partnerIds, problemText } = req.body;

    if (!partnerIds || partnerIds.length < 2) {
      return res.status(400).json({ error: 'Please select at least 2 partners to compare' });
    }
    if (partnerIds.length > 4) {
      return res.status(400).json({ error: 'Maximum 4 partners can be compared at once' });
    }
    if (!problemText || problemText.trim().length < 10) {
      return res.status(400).json({ error: 'Please provide a problem description for context' });
    }

    const allPartners = await getPartners();
    const selectedPartners = partnerIds
      .map(id => allPartners.find(p => p.id === id))
      .filter(Boolean);

    if (selectedPartners.length < 2) {
      return res.status(404).json({ error: 'Could not find selected partners' });
    }

    const result = await comparePartners(problemText, selectedPartners);
    res.json(result);
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: 'Comparison failed', details: error.message });
  }
});

module.exports = router;
