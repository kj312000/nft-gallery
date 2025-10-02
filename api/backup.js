// api/index.js
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const FormData = require('form-data');
const { fetch } = require('undici'); // modern fetch for Node
const bs58 = require('bs58');
const nacl = require('tweetnacl');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Config ---
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;
const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY;

if (!NFT_STORAGE_KEY) {
  console.error('NFT_STORAGE_KEY is not set in .env');
}

// --- Mongo model ---
const uploadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  ipnft: String,           // metadata CID
  metadataUrl: String,     // gateway URL to metadata.json
  fileCid: String,         // CID of raw file
  fileName: String,
  fileType: String,
  uploader: { type: String, default: null },
  createdAt: { type: Date, required: true },
  tags: { type: [String], default: [] },
});
const Upload = mongoose.model('Upload', uploadSchema);

// --- Connect to Mongo ---
if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI, {})
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connect error:', err));
}

// --- multer memory storage ---
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// --- helper: verify solana signature (optional) ---
function verifySolSignature({ publicKey, message, signature }) {
  if (!publicKey || !message || !signature) return false;
  try {
    const sig = bs58.decode(signature);
    const pub = bs58.decode(publicKey);
    const msg = Buffer.from(message, 'utf8');
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch (e) {
    console.warn('signature verify error', e);
    return false;
  }
}

// --- helper: upload buffer to nft.storage (raw HTTP API) ---
async function uploadBufferToNFTStorage(buffer, filename, contentType) {
  const url = 'https://api.web3.storage/upload';
  const form = new FormData();
  form.append('file', buffer, { filename, contentType });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NFT_STORAGE_KEY}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(`NFT.Storage upload failed: ${res.status} ${res.statusText} - ${JSON.stringify(json)}`);
  }
  return json.value.cid;
}

// --- upload endpoint ---
app.post('/api/uploads/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const { name = '', description = '', tags = '' } = req.body;
    const tagsArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    // optional signature
    const { publicKey, message, signature } = req.body;
    let uploader = null;
    if (publicKey && message && signature) {
      const ok = verifySolSignature({ publicKey, message, signature });
      if (!ok) return res.status(401).json({ error: 'Invalid signature' });
      uploader = publicKey;
    }

    // 1. Upload the raw file to nft.storage
    const fileCid = await uploadBufferToNFTStorage(
      req.file.buffer,
      req.file.originalname || 'upload',
      req.file.mimetype || 'application/octet-stream'
    );

    const fileIpfsUri = `ipfs://${fileCid}`;
    const fileGatewayUrl = `https://ipfs.io/ipfs/${fileCid}`;

    // 2. Create metadata JSON and upload it too
    const metadataObj = {
      name: name || req.file.originalname || 'Untitled',
      description,
      image: fileIpfsUri,
      properties: {
        tags: tagsArray,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploader,
      },
    };

    const metadataBuffer = Buffer.from(JSON.stringify(metadataObj));
    const metadataCid = await uploadBufferToNFTStorage(metadataBuffer, 'metadata.json', 'application/json');
    const metadataIpfsUri = `ipfs://${metadataCid}/metadata.json`;
    const metadataGatewayUrl = `https://ipfs.io/ipfs/${metadataCid}/metadata.json`;

    // 3. Save to Mongo
    const record = await Upload.create({
      name: metadataObj.name,
      description,
      ipnft: metadataCid,
      metadataUrl: metadataGatewayUrl,
      fileCid,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      uploader,
      createdAt: new Date(),
      tags: tagsArray,
    });

    return res.json({
      ok: true,
      record,
      metadata: {
        metadataCid,
        metadataIpfsUri,
        metadataGatewayUrl,
        fileCid,
        fileIpfsUri,
        fileGatewayUrl,
      },
    });
  } catch (err) {
    console.error('upload error', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// --- list endpoint ---
app.get('/api/uploads', async (req, res) => {
  try {
    const items = await Upload.find().sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ ok: true, items });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// --- health ---
app.get('/health', (req, res) => res.json({ ok: true }));

// --- start server ---
app.listen(PORT, () => console.log(`API server listening at http://localhost:${PORT}`));
