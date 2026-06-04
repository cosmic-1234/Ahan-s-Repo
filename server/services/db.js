const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const useMongo = !!MONGODB_URI;

let client = null;
let db = null;

const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'partners.json');
const ANALYSES_PATH = path.join(__dirname, '..', 'data', 'analyses.json');

// Ensure local backup directory exists
const dataDir = path.dirname(PARTNERS_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function connectDB() {
  if (useMongo && !db) {
    try {
      client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds to prevent hanging requests
        connectTimeoutMS: 5000
      });
      await client.connect();
      db = client.db();
      console.log('  MongoDB: Connected successfully 🗄️');
    } catch (error) {
      console.error('  MongoDB Connection Failed:', error.message);
      throw error;
    }
  }
}

async function getPartners() {
  if (useMongo) {
    try {
      await connectDB();
      const list = await db.collection('partners').find({}).toArray();
      // Map _id out
      return list.map(({ _id, ...p }) => p);
    } catch (error) {
      console.warn(`[Database Fallback] MongoDB getPartners failed: ${error.message}. Using local JSON fallback.`);
    }
  }

  // Fallback to local files
  if (!fs.existsSync(PARTNERS_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf-8'));
  } catch (e) {
    console.error('Failed to read local partners backup:', e.message);
    return [];
  }
}

async function savePartners(partners) {
  // Always write to local storage first so we have a hot copy locally
  try {
    fs.writeFileSync(PARTNERS_PATH, JSON.stringify(partners, null, 2));
  } catch (err) {
    console.error('Failed to write local backup for partners:', err.message);
  }

  if (useMongo) {
    try {
      await connectDB();
      await db.collection('partners').deleteMany({});
      if (partners.length > 0) {
        const toInsert = partners.map(({ _id, ...p }) => p);
        await db.collection('partners').insertMany(toInsert);
      }
      console.log(`[Database Sync] Successfully synchronized ${partners.length} partners to MongoDB.`);
    } catch (error) {
      console.error(`[Database Fallback] MongoDB savePartners failed: ${error.message}. Saved locally instead.`);
    }
  }
}

async function getAnalyses() {
  if (useMongo) {
    try {
      await connectDB();
      const list = await db.collection('analyses').find({}).toArray();
      return list.map(({ _id, ...a }) => a);
    } catch (error) {
      console.warn(`[Database Fallback] MongoDB getAnalyses failed: ${error.message}. Using local JSON fallback.`);
    }
  }

  if (!fs.existsSync(ANALYSES_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(ANALYSES_PATH, 'utf-8'));
  } catch (e) {
    console.error('Failed to read local analyses backup:', e.message);
    return [];
  }
}

async function saveAnalyses(analyses) {
  // Always write to local storage first
  try {
    fs.writeFileSync(ANALYSES_PATH, JSON.stringify(analyses, null, 2));
  } catch (err) {
    console.error('Failed to write local backup for analyses:', err.message);
  }

  if (useMongo) {
    try {
      await connectDB();
      await db.collection('analyses').deleteMany({});
      if (analyses.length > 0) {
        const toInsert = analyses.map(({ _id, ...a }) => a);
        await db.collection('analyses').insertMany(toInsert);
      }
      console.log(`[Database Sync] Successfully synchronized ${analyses.length} analyses to MongoDB.`);
    } catch (error) {
      console.error(`[Database Fallback] MongoDB saveAnalyses failed: ${error.message}. Saved locally instead.`);
    }
  }
}

module.exports = {
  getPartners,
  savePartners,
  getAnalyses,
  saveAnalyses,
  useMongo
};
