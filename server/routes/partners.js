const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { parseSpreadsheet } = require('../services/documentParser');

const DATA_PATH = path.join(__dirname, '..', 'data', 'partners.json');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function readPartners() {
  const data = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(data);
}

function writePartners(partners) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(partners, null, 2));
}

// GET /api/partners - List all partners with optional search/filter
router.get('/', (req, res) => {
  try {
    let partners = readPartners();
    const { search, industry, capability, tier, solution } = req.query;

    if (search) {
      const q = search.toLowerCase();
      partners = partners.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.solutions.some(s => s.toLowerCase().includes(q)) ||
        p.capabilities.some(c => c.toLowerCase().includes(q))
      );
    }
    if (industry) {
      partners = partners.filter(p =>
        p.industries.some(i => i.toLowerCase().includes(industry.toLowerCase()))
      );
    }
    if (capability) {
      partners = partners.filter(p =>
        p.capabilities.some(c => c.toLowerCase().includes(capability.toLowerCase()))
      );
    }
    if (tier) {
      partners = partners.filter(p => p.tier.toLowerCase() === tier.toLowerCase());
    }
    if (solution) {
      partners = partners.filter(p =>
        p.solutions.some(s => s.toLowerCase().includes(solution.toLowerCase()))
      );
    }

    res.json({ partners, total: partners.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partners', details: error.message });
  }
});

// GET /api/partners/filters - Get available filter options
router.get('/filters', (req, res) => {
  try {
    const partners = readPartners();
    const industries = [...new Set(partners.flatMap(p => p.industries))].sort();
    const capabilities = [...new Set(partners.flatMap(p => p.capabilities))].sort();
    const tiers = [...new Set(partners.map(p => p.tier))].sort();
    const solutions = [...new Set(partners.flatMap(p => p.solutions))].sort();

    res.json({ industries, capabilities, tiers, solutions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch filters', details: error.message });
  }
});

// GET /api/partners/:id - Get single partner
router.get('/:id', (req, res) => {
  try {
    const partners = readPartners();
    const partner = partners.find(p => p.id === req.params.id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }
    res.json(partner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partner', details: error.message });
  }
});

// POST /api/partners - Add new partner
router.post('/', (req, res) => {
  try {
    const partners = readPartners();
    const newPartner = {
      id: `p_${uuidv4().split('-')[0]}`,
      name: req.body.name,
      description: req.body.description || '',
      solutions: req.body.solutions || [],
      capabilities: req.body.capabilities || [],
      industries: ['Manufacturing'], // Locked strictly to Manufacturing
      useCases: req.body.useCases || [],
      certifications: req.body.certifications || [],
      tier: req.body.tier || 'Silver',
      website: req.body.website || '',
      contactEmail: req.body.contactEmail || '',
      headquarters: req.body.headquarters || '',
      employeeCount: req.body.employeeCount || 0,
      yearFounded: req.body.yearFounded || 0
    };

    if (!newPartner.name) {
      return res.status(400).json({ error: 'Partner name is required' });
    }

    partners.push(newPartner);
    writePartners(partners);
    res.status(201).json(newPartner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create partner', details: error.message });
  }
});

// PUT /api/partners/:id - Update partner
router.put('/:id', (req, res) => {
  try {
    const partners = readPartners();
    const index = partners.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    partners[index] = { ...partners[index], ...req.body, industries: ['Manufacturing'], id: req.params.id };
    writePartners(partners);
    res.json(partners[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update partner', details: error.message });
  }
});

// DELETE /api/partners/:id - Delete partner
router.delete('/:id', (req, res) => {
  try {
    let partners = readPartners();
    const index = partners.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    partners.splice(index, 1);
    writePartners(partners);
    res.json({ message: 'Partner deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete partner', details: error.message });
  }
});

// POST /api/partners/import - Bulk import from spreadsheet
router.post('/import', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const importedPartners = parseSpreadsheet(req.file.buffer, req.file.originalname);
    const existingPartners = readPartners();

    // Merge: update existing by name, add new ones
    let added = 0;
    let updated = 0;
    importedPartners.forEach(imported => {
      const existingIndex = existingPartners.findIndex(
        e => e.name.toLowerCase() === imported.name.toLowerCase()
      );
      if (existingIndex >= 0) {
        existingPartners[existingIndex] = { ...existingPartners[existingIndex], ...imported, id: existingPartners[existingIndex].id };
        updated++;
      } else {
        imported.id = `p_${uuidv4().split('-')[0]}`;
        existingPartners.push(imported);
        added++;
      }
    });

    writePartners(existingPartners);
    res.json({
      message: `Import complete: ${added} added, ${updated} updated`,
      added,
      updated,
      total: existingPartners.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import partners', details: error.message });
  }
});

// POST /api/partners/add-partner-document - Add a partner from a PDF/PPTX/DOCX document
router.post('/add-partner-document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }

    const { parseDocument } = require('../services/documentParser');
    const { addPartnerFromText } = require('../services/ai');

    // 1. Extract text from document (PDF/PPTX/DOCX/TXT)
    const documentText = await parseDocument(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!documentText || documentText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract sufficient text from the document.' });
    }

    // 2. Call AI service to add partner
    const partnerProfile = await addPartnerFromText(documentText);

    // Force "Manufacturing" industry to align with strictly manufacturing scope
    partnerProfile.industries = ['Manufacturing'];

    // 3. Save partner details
    const existingPartners = readPartners();
    partnerProfile.id = `p_${uuidv4().split('-')[0]}`;
    
    // Check if partner already exists by name (case-insensitive)
    const existingIndex = existingPartners.findIndex(
      e => e.name.toLowerCase() === partnerProfile.name.toLowerCase()
    );
    if (existingIndex >= 0) {
      partnerProfile.id = existingPartners[existingIndex].id;
      existingPartners[existingIndex] = partnerProfile;
    } else {
      existingPartners.push(partnerProfile);
    }

    writePartners(existingPartners);
    res.json({ message: 'Partner added successfully', partner: partnerProfile });
  } catch (error) {
    console.error('Partner addition error:', error);
    res.status(500).json({ error: 'Partner addition failed', details: error.message });
  }
});

module.exports = router;
