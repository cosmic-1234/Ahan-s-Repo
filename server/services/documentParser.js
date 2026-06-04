const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function extractStringsFallback(filePath) {
  return new Promise((resolve) => {
    try {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        return resolve('');
      }

      const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
      let text = '';
      let currentString = '';
      let totalLength = 0;
      const MAX_EXTRACT_LENGTH = 150000; // Cap at 150KB to keep within context limits and save memory
      let resolved = false;

      const finish = (resultText) => {
        if (!resolved) {
          resolved = true;
          resolve(resultText.replace(/\s+/g, ' ').trim());
        }
      };

      stream.on('data', (chunk) => {
        if (totalLength >= MAX_EXTRACT_LENGTH) {
          stream.destroy();
          finish(text);
          return;
        }
        for (let i = 0; i < chunk.length; i++) {
          const char = chunk[i];
          // Extract printable characters from space (32) to tilde (126) plus common whitespace
          if ((char >= 32 && char <= 126) || char === 9 || char === 10 || char === 13) {
            currentString += String.fromCharCode(char);
            
            // Prevent currentString from growing infinitely when there are no non-printable characters
            if (currentString.length >= 2000) {
              text += currentString + ' ';
              totalLength += currentString.length + 1;
              currentString = '';
              if (totalLength >= MAX_EXTRACT_LENGTH) {
                stream.destroy();
                finish(text);
                break;
              }
            }
          } else {
            if (currentString.length >= 4) {
              text += currentString + ' ';
              totalLength += currentString.length + 1;
              if (totalLength >= MAX_EXTRACT_LENGTH) {
                stream.destroy();
                finish(text);
                break;
              }
            }
            currentString = '';
          }
        }
      });

      stream.on('end', () => {
        if (currentString.length >= 4 && totalLength < MAX_EXTRACT_LENGTH) {
          text += currentString;
        }
        finish(text);
      });

      stream.on('error', (err) => {
        console.error('Error in streaming fallback extractor:', err);
        finish(text);
      });
    } catch (e) {
      console.error('Failed to initialize streaming fallback extractor:', e);
      resolve('');
    }
  });
}

async function parsePPTX(filePath) {
  try {
    const zip = new AdmZip(filePath);
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
    
    if (extractedText.trim().length > 0) {
      return extractedText;
    }
    return await extractStringsFallback(filePath);
  } catch (error) {
    console.warn('PPTX zip extraction failed, attempting binary strings fallback...', error.message);
    return await extractStringsFallback(filePath);
  }
}

async function parsePDF(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    if (fileSizeInMB > 15) {
      console.log(`[Parser] PDF file size is large (${fileSizeInMB.toFixed(2)}MB). Direct to streaming strings fallback to prevent OOM on Render.`);
      return await extractStringsFallback(filePath);
    }

    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    // Limit to first 50 pages of the capability deck to prevent OOM errors on Render Free Tier
    const data = await pdfParse(buffer, { max: 50 });
    if (data && data.text && data.text.trim().length > 10) {
      return data.text;
    }
    return await extractStringsFallback(filePath);
  } catch (error) {
    console.warn('PDF parsing failed, attempting binary strings fallback...', error.message);
    return await extractStringsFallback(filePath);
  }
}

async function parseDOCX(filePath) {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    if (result && result.value && result.value.trim().length > 10) {
      return result.value;
    }
    return await extractStringsFallback(filePath);
  } catch (error) {
    console.warn('DOCX parsing failed, attempting binary strings fallback...', error.message);
    return await extractStringsFallback(filePath);
  }
}

function parseTXT(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

async function parseDocument(filePath, mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase();

  if (mimetype === 'application/pdf' || ext === '.pdf') {
    return await parsePDF(filePath);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    return await parseDOCX(filePath);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    ext === '.pptx' ||
    ext === '.ppt'
  ) {
    return await parsePPTX(filePath);
  } else if (mimetype === 'text/plain' || ext === '.txt') {
    return parseTXT(filePath);
  } else {
    throw new Error(`Unsupported file type: ${mimetype || ext}`);
  }
}

function parseSpreadsheet(filePath, originalname) {
  const XLSX = require('xlsx');
  const workbook = XLSX.readFile(filePath);
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
