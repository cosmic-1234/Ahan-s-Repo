const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { parseSpreadsheet } = require('../services/documentParser');
const { getPartners, savePartners } = require('../services/db');

const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 250 * 1024 * 1024 } // Support up to 250MB uploads
});

// GET /api/partners - List all partners with optional search/filter
router.get('/', async (req, res) => {
  try {
    let partners = await getPartners();
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
router.get('/filters', async (req, res) => {
  try {
    const partners = await getPartners();
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
router.get('/:id', async (req, res) => {
  try {
    const partners = await getPartners();
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
router.post('/', async (req, res) => {
  try {
    const partners = await getPartners();
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
    await savePartners(partners);
    res.status(201).json(newPartner);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create partner', details: error.message });
  }
});

// PUT /api/partners/:id - Update partner
router.put('/:id', async (req, res) => {
  try {
    const partners = await getPartners();
    const index = partners.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    partners[index] = { ...partners[index], ...req.body, industries: ['Manufacturing'], id: req.params.id };
    await savePartners(partners);
    res.json(partners[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update partner', details: error.message });
  }
});

// DELETE /api/partners/:id - Delete partner
router.delete('/:id', async (req, res) => {
  try {
    let partners = await getPartners();
    const index = partners.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    partners.splice(index, 1);
    await savePartners(partners);
    res.json({ message: 'Partner deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete partner', details: error.message });
  }
});

// POST /api/partners/import - Bulk import from spreadsheet
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let importedPartners;
    try {
      importedPartners = parseSpreadsheet(req.file.path, req.file.originalname);
    } finally {
      // Ensure file is deleted from temp directory immediately
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    const existingPartners = await getPartners();

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

    await savePartners(existingPartners);
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
    let documentText;
    try {
      documentText = await parseDocument(req.file.path, req.file.mimetype, req.file.originalname);
    } finally {
      // Ensure file is deleted from temp directory immediately
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    }

    if (!documentText || documentText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract sufficient text from the document.' });
    }

    // 2. Call AI service to add partner
    const partnerProfile = await addPartnerFromText(documentText);

    // Force "Manufacturing" industry to align with strictly manufacturing scope
    partnerProfile.industries = ['Manufacturing'];

    // 3. Save partner details
    const existingPartners = await getPartners();
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

    await savePartners(existingPartners);
    res.json({ message: 'Partner added successfully', partner: partnerProfile });
  } catch (error) {
    console.error('Partner addition error:', error);
    res.status(500).json({ error: 'Partner addition failed', details: error.message });
  }
});

module.exports = router;
