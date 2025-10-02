import React, { useState } from 'react';
import './Home.css';
import { useWallet } from '@solana/wallet-adapter-react';

function shortAddress(addr?: string | null) {
  if (!addr) return '';
  const s = addr.toString();
  return s.slice(0, 4) + '…' + s.slice(-4);
}

export default function Home(props: any) {
  const { connected, publicKey } = useWallet();
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  // lightweight placeholder thumbnails — in real app replace with real images from API
  const previewItems = [
    { id: 1, title: '', src: '/img1.jpeg' },
    { id: 2, title: '', src: '/img2.png' },
    { id: 3, title: '', src: '/img3.jpeg' },
    { id: 4, title: '', src: '/img4.jpeg' },
    { id: 5, title: '', src: '/img5.jpeg' },
    { id: 6, title: '', src: '/img6.jpeg' },
  ];

  return (
    <div className="home-wrapper">
      <main className="home-hero">
        <div className="hero-left">
          <div className="eyebrow">Solana Gallery</div>
          <h1 className="hero-title">Upload • Verify • Showcase</h1>
          <p className="hero-sub">
            A minimalist NFT gallery for creators — upload assets to IPFS, publish metadata,
            and prove ownership with a wallet signature. Built for speed and simplicity.
          </p>

          <div className="hero-ctas">
            <a className="btn btn-primary" onClick={() => props.setTab('upload')}>Upload an asset</a>
            <a className="btn btn-ghost" onClick={() => props.setTab('gallery')}>Browse gallery</a>
          </div>

          {!connected ? (
            <div className="onboard">
              <h4>Get started</h4>
              <ol>
                <li>Install Phantom or another Solana wallet.</li>
                <li>Connect using the wallet button at the top-right.</li>
                <li>Sign a short message to verify ownership, then upload.</li>
              </ol>
            </div>
          ) : (
            <div className="account">
              <div className="account-left">
                <div className="address-pill">
                  <svg className="dot" viewBox="0 0 8 8" width="8" height="8" aria-hidden>
                    <circle cx="4" cy="4" r="3" />
                  </svg>
                  <strong>{shortAddress(publicKey?.toString())}</strong>
                  <span className="muted"> — connected</span>
                </div>

                <div className="address-actions">
                  <button className="link-btn" onClick={copyAddress}>
                    {copied ? 'Copied!' : 'Copy address'}
                  </button>
                  <a className="link-btn" href={`https://explorer.solana.com/address/${publicKey?.toString()}?cluster=devnet`} target="_blank" rel="noreferrer">
                    Explorer
                  </a>
                </div>
              </div>

              <div className="account-right">
                <p className="muted">You can now sign uploads and publish them to the Gallery.</p>
              </div>
            </div>
          )}
        </div>

        <aside className="hero-right">
          <div className="card-stats">
            <div>
              <div className="stat">1.2k</div>
              <div className="label">Total items</div>
            </div>
            <div>
              <div className="stat">430</div>
              <div className="label">Creators</div>
            </div>
            <div>
              <div className="stat">98%</div>
              <div className="label">On-chain verified</div>
            </div>
          </div>

          <div id="gallery" className="preview-grid">
            {previewItems.map((p) => (
              <div className="thumb" key={p.id}>
                <img src={p.src} alt={p.title} className="thumb-img" />
                <div className="thumb-overlay">
                  <div className="thumb-title">{p.title}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card-note">
            <strong>Tip:</strong> Use high-quality PNG/JPEG images. Files are stored on IPFS via nft.storage.
          </div>
        </aside>
      </main>
    </div>
  );
}
