// src/pages/Gallery.tsx
import React, { useEffect, useState } from 'react';
import './Gallery.css';

const API_BASE = import.meta.env.VITE_API_BASE || '';

type UploadItem = {
  _id: string;
  name: string;
  description?: string;
  metadataUrl?: string;
  ipnft?: string;
  fileName?: string;
  fileType?: string;
  uploader?: string;
  createdAt?: string;
  tags?: string[];
};

export default function Gallery() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/uploads`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setItems(j.items || []);
        else setError(j.error || 'Failed to load');
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="gallery-card">
      <h2>Gallery</h2>
      <p className="muted">Community uploads (most recent first)</p>

      {loading && <div>Loading…</div>}
      {error && <div className="error">{error}</div>}

      <div className="grid">
        {items.map((it) => {
          // try to build preview from ipnft metadata or fallback
          const imageUrl = it.metadataUrl ? it.metadataUrl.replace(/\/metadata\.json$/, '/preview') : null;
          // more robust: fetch metadata.json on click — but we'll show ipfs gateway derived url
          const ipfsImage = it.metadataUrl ? it.metadataUrl.replace('/metadata.json', '') : null; // base CID
          const cover = ipfsImage ? `https://ipfs.io/ipfs/${ipfsImage?.replace('https://ipfs.io/ipfs/', '')}` : undefined;

          // often metadata contains image field; however we didn't store it in index — show metadata link
          return (
            <article className="card" key={it._id}>
              <div className="thumb">
                {it.ipnft ? (
                  <img src={`https://ipfs.io/ipfs/${it.ipnft}/preview`} alt={it.name} onError={(e)=>{ (e.target as HTMLImageElement).src= cover || '/placeholder.png' }} />
                ) : (
                  <div className="placeholder">{it.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}</div>
                )}
              </div>

              <div className="meta">
                <h4>{it.name}</h4>
                <div className="small muted">{it.uploader ? `${it.uploader}` : 'anonymous'}</div>
                <p className="desc">{it.description}</p>
                <div className="row">
                  {it.tags?.slice(0,3).map(t => <span className="tag" key={t}>{t}</span>)}
                  {it.metadataUrl && (
                    <a className="link" href={it.metadataUrl} target="_blank" rel="noreferrer">metadata</a>
                  )}
                </div>
                <div className="time muted">{new Date(it.createdAt || '').toLocaleString()}</div>
              </div>
            </article>
          );
        })}
      </div>

      {!loading && items.length === 0 && <div className="muted">No uploads yet — be the first!</div>}
    </div>
  );
}
