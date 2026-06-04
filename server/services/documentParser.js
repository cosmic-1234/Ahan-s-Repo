const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function parsePPTX(buffer) {
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    
    // Sort slide files (ppt/slides/slide1.xml, ppt/slides/slide2.xml, etc.)
    const slideEntries = zipEntries
      .filter(entry => entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml'))
      .sort((a, b) => {
        const matchA = a.entryName.match(/slide(\d+)\.xml/);
        const matchB = b.entryName.match(/slide(\d+)\.xml/);
        const numA = matchA ? parseInt(matchA[1]) : 0;
        const numB = matchB ? parseInt(matchB[1]) : 0;
        return numA - numB;
      });

    let extractedText = '';
    
    for (const entry of slideEntries) {
      const content = entry.getData().toString('utf-8');
      
      // Extract text inside <a:t>...</a:t> elements which contain PowerPoint text
      const matches = content.match(/<a:t>([^<]*)<\/a:t>/g);
      if (matches) {
        const slideText = matches
          .map(match => match.replace(/<\/?a:t>/g, ''))
          .join(' ');
        extractedText += slideText + '\n';
      }
    }
    
    return extractedText;
  } catch (error) {
    console.error('Error parsing PPTX:', error);
    throw new Error('Failed to parse PowerPoint presentation: ' + error.message);
  }
}

async function parsePDF(buffer) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseDOCX(buffer) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function parseTXT(buffer) {
  return buffer.toString('utf-8');
}

async function parseDocument(buffer, mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase();

  if (mimetype === 'application/pdf' || ext === '.pdf') {
    return await parsePDF(buffer);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    return await parseDOCX(buffer);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    ext === '.pptx' ||
    ext === '.ppt'
  ) {
    return await parsePPTX(buffer);
  } else if (mimetype === 'text/plain' || ext === '.txt') {
    return parseTXT(buffer);
  } else {
    throw new Error(`Unsupported file type: ${mimetype || ext}`);
  }
}

function parseSpreadsheet(buffer, originalname) {
  const XLSX = require('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  // Map spreadsheet columns to partner schema
  return rows.map((row, index) => {
    const parseArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return String(val).split(/[,;|]/).map(s => s.trim()).filter(Boolean);
    };

    return {
      id: row.id || `imported_${Date.now()}_${index}`,
      name: row.name || row.Name || row['Partner Name'] || 'Unknown',
      description: row.description || row.Description || '',
      solutions: parseArray(row.solutions || row.Solutions),
      capabilities: parseArray(row.capabilities || row.Capabilities),
      industries: parseArray(row.industries || row.Industries),
      useCases: parseArray(row.useCases || row['Use Cases'] || row.use_cases),
      certifications: parseArray(row.certifications || row.Certifications),
      tier: row.tier || row.Tier || 'Silver',
      website: row.website || row.Website || '',
      contactEmail: row.contactEmail || row.email || row.Email || row['Contact Email'] || '',
      headquarters: row.headquarters || row.Headquarters || row.HQ || '',
      employeeCount: parseInt(row.employeeCount || row['Employee Count'] || row.employees || 0) || 0,
      yearFounded: parseInt(row.yearFounded || row['Year Founded'] || row.founded || 0) || 0
    };
  });
}

module.exports = { parseDocument, parseSpreadsheet };
