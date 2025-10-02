// src/pages/Upload.tsx
import React, { useState } from 'react';
import './Upload.css';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function Upload() {
  const { connected, publicKey, signMessage, connect } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);

    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (!connected || !publicKey) {
      setError('Please connect your wallet first.');
      return;
    }

    setLoading(true);
    try {
      let signatureBase58: string | undefined;
      const message = `Upload to Solana Gallery ${new Date().toISOString()}`;

      if (signMessage) {
        const toSign = new TextEncoder().encode(message);
        const signed = await signMessage(toSign);
        signatureBase58 = bs58.encode(signed);
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name || file.name);
      fd.append('description', description || '');
      fd.append('tags', tags || '');
      fd.append('publicKey', publicKey.toString());
      if (signatureBase58) fd.append('signature', signatureBase58);
      fd.append('message', message);

      setStatus('Uploading...');
      const res = await fetch(`${API_BASE}/api/uploads/upload`, {
        method: 'POST',
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Upload failed');
      } else {
        setStatus(`Uploaded successfully. CID: ${json?.metadata?.metadataCid || ''}`);
        // reset
        setFile(null);
        setPreviewUrl(null);
        setName('');
        setDescription('');
        setTags('');
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="upload-card">
      <h2>Upload an Asset</h2>
      <p className="muted">
        Files are stored on IPFS via nft.storage and linked to your Solana wallet.
      </p>

      <form onSubmit={handleUpload} className="upload-form">
        <label className="file-field">
          <input type="file" accept="image/*,video/*,audio/*" onChange={onFileChange} />
          <div className="file-hint">{file ? file.name : 'Choose a file'}</div>
        </label>

        {previewUrl && (
          <div className="preview">
            <img src={previewUrl} alt="preview" />
          </div>
        )}

        <div className="row">
          <input placeholder="Title" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="actions">
          {connected ? (
            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Uploading…' : 'Upload'}
            </button>
          ) : (
            <button
              type="button"
              className="primary"
              onClick={() => connect?.()}
            >
              Connect Wallet
            </button>
          )}
        </div>

        {status && <div className="status">{status}</div>}
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
