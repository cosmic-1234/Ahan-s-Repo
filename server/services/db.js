const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const useMongo = !!MONGODB_URI;

let client = null;
let db = null;

const PARTNERS_PATH = path.join(__dirname, '..', 'data', 'partners.json');
const ANALYSES_PATH = path.join(__dirname, '..', 'data', 'analyses.json');

async function connectDB() {
  if (useMongo && !db) {
    try {
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(); // Uses database name from the connection URI, or default
      console.log('  MongoDB: Connected successfully 🗄️');
    } catch (error) {
      console.error('  MongoDB Connection Failed:', error.message);
      throw error;
    }
  }
}

async function getPartners() {
  if (useMongo) {
    await connectDB();
    const list = await db.collection('partners').find({}).toArray();
    // Map _id object to id string if needed, but we store id as string key anyway
    return list.map(({ _id, ...p }) => p);
  } else {
    if (!fs.existsSync(PARTNERS_PATH)) return [];
    try {
      return JSON.parse(fs.readFileSync(PARTNERS_PATH, 'utf-8'));
    } catch (e) {
      return [];
    }
  }
}

async function savePartners(partners) {
  if (useMongo) {
    await connectDB();
    await db.collection('partners').deleteMany({});
    if (partners.length > 0) {
      // Clean up properties like _id before inserting
      const toInsert = partners.map(({ _id, ...p }) => p);
      await db.collection('partners').insertMany(toInsert);
    }
  } else {
    fs.writeFileSync(PARTNERS_PATH, JSON.stringify(partners, null, 2));
  }
}

async function getAnalyses() {
  if (useMongo) {
    await connectDB();
    const list = await db.collection('analyses').find({}).toArray();
    return list.map(({ _id, ...a }) => a);
  } else {
    if (!fs.existsSync(ANALYSES_PATH)) return [];
    try {
      return JSON.parse(fs.readFileSync(ANALYSES_PATH, 'utf-8'));
    } catch (e) {
      return [];
    }
  }
}

async function saveAnalyses(analyses) {
  if (useMongo) {
    await connectDB();
    await db.collection('analyses').deleteMany({});
    if (analyses.length > 0) {
      const toInsert = analyses.map(({ _id, ...a }) => a);
      await db.collection('analyses').insertMany(toInsert);
    }
  } else {
    fs.writeFileSync(ANALYSES_PATH, JSON.stringify(analyses, null, 2));
  }
}

module.exports = {
  getPartners,
  savePartners,
  getAnalyses,
  saveAnalyses,
  useMongo
};
