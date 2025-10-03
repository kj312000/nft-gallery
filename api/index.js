// api/index.js
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const FormData = require('form-data');
const { fetch } = require('undici'); // modern fetch for Node.js
const bs58 = require('bs58');
const nacl = require('tweetnacl');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Config ---
const PORT = process.env.PORT || 4000;
const WEB3_STORAGE_TOKEN = process.env.WEB3_STORAGE_TOKEN; // <-- set this to your web3.storage token

if (!WEB3_STORAGE_TOKEN) {
  console.error('ERROR: WEB3_STORAGE_TOKEN is not set in .env');
  // don't exit so server can still run for dev, but uploads will fail until token provided
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

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

async function uploadBufferToWeb3Storage(buffer, filename, contentType) {
  if (!WEB3_STORAGE_TOKEN) throw new Error('WEB3_STORAGE_TOKEN not configured');

  const url = 'https://api.web3.storage/upload';
  const form = new FormData();
  // form-data expects Buffer as value
  form.append('file', buffer, { filename, contentType });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WEB3_STORAGE_TOKEN}`,
      // Note: form-data will provide its own headers via getHeaders()
      ...form.getHeaders(),
    },
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errBody = JSON.stringify(json);
    throw new Error(`web3.storage upload failed: ${res.status} ${res.statusText} - ${errBody}`);
  }

  const cid = json.cid || (json.value && json.value.cid) || (json.ok && json.value && json.value.cid);
  if (!cid) {
    throw new Error(`Could not parse CID from web3.storage response: ${JSON.stringify(json)}`);
  }
  return cid;
}

app.post('/api/uploads/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required in "file" field' });

    const { name = '', description = '', tags = '' } = req.body;
    const tagsArray = typeof tags === 'string'
      ? tags.split(',').map(t => t.trim()).filter(Boolean)
      : Array.isArray(tags) ? tags : [];

    // optional signature
    const { publicKey, message, signature } = req.body;
    let uploader = null;
    if (publicKey && message && signature) {
      const ok = verifySolSignature({ publicKey, message, signature });
      if (!ok) return res.status(401).json({ error: 'Invalid signature' });
      uploader = publicKey;
    }

    // 1) upload raw file and get CID
    const fileCid = await uploadBufferToWeb3Storage(
      req.file.buffer,
      req.file.originalname || 'upload',
      req.file.mimetype || 'application/octet-stream'
    );

    const fileIpfsUri = `ipfs://${fileCid}`;
    const fileGatewayUrl = `https://ipfs.io/ipfs/${fileCid}`;

    // 2) create metadata JSON (ERC-721 style)
    const metadataObj = {
      name: name || req.file.originalname || 'Untitled',
      description: description || '',
      image: fileIpfsUri,
      properties: {
        tags: tagsArray,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploader || null,
      },
    };

    const metadataBuffer = Buffer.from(JSON.stringify(metadataObj));
    const metadataCid = await uploadBufferToWeb3Storage(metadataBuffer, 'metadata.json', 'application/json');

    const metadataIpfsUri = `ipfs://${metadataCid}/metadata.json`;
    const metadataGatewayUrl = `https://ipfs.io/ipfs/${metadataCid}/metadata.json`;

    // 3) return the relevant info (we are not saving to DB)
    return res.json({
      ok: true,
      metadata: {
        metadataCid,
        metadataIpfsUri,
        metadataGatewayUrl,
        fileCid,
        fileIpfsUri,
        fileGatewayUrl,
      },
      record: {
        name: metadataObj.name,
        description: metadataObj.description,
        createdAt: new Date().toISOString(),
        tags: tagsArray,
        uploader,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
      },
    });
  } catch (err) {
    console.error('upload error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

app.get('/api/uploads', async (req, res) => {
  try {
    if (!WEB3_STORAGE_TOKEN) return res.status(500).json({ error: 'WEB3_STORAGE_TOKEN not configured' });

    const { limit = 50, before } = req.query;
    // Build URL with query params
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (before) params.set('before', String(before));
    const url = `https://api.web3.storage/user/uploads?${params.toString()}`;

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${WEB3_STORAGE_TOKEN}`,
        Accept: 'application/json',
      },
    });

    if (resp.status === 401) {
      return res.status(401).json({ error: 'Unauthorized - check WEB3_STORAGE_TOKEN' });
    }

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return res.status(500).json({ error: `web3.storage list failed: ${resp.status} ${resp.statusText} - ${JSON.stringify(json)}` });
    }

    // web3.storage returns an array of upload objects; pass them through
    return res.json({ ok: true, uploads: json });
  } catch (err) {
    console.error('list error', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });

  console.log('Serving frontend from', frontendDist);
} else {
  console.log('No frontend build found at', frontendDist, '- frontend routes disabled.');
}

app.listen(PORT, () => console.log(`API server listening at :${PORT}`));
