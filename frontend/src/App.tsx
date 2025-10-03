import React, { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Upload from './pages/Upload';
import './App.css';
import { useBalance } from './hooks/useBalance';

export default function App() {
  const [tab, setTab] = useState<'home' | 'gallery' | 'upload'>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const balanceQuery = useBalance(connection, publicKey ?? undefined);

  const handleNav = (t: 'home' | 'gallery' | 'upload') => {
    setTab(t);
    setMenuOpen(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="left-block">
          <div className="brand" role="banner">
            <h1>Solana Gallery</h1>
            <div className="tag">NFT upload + gallery</div>
          </div>

          {/* mobile hamburger */}
          <button
            className="hamburger"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((s) => !s)}
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>

        {/* desktop nav + mobile nav (mobile shows when .open) */}
        <nav className={`top-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          <div className="nav-list">
            <button
              className={`nav-btn ${tab === 'home' ? 'active' : ''}`}
              onClick={() => handleNav('home')}
            >
              Home
            </button>
            <button
              className={`nav-btn ${tab === 'gallery' ? 'active' : ''}`}
              onClick={() => handleNav('gallery')}
            >
              Gallery
            </button>
            <button
              className={`nav-btn ${tab === 'upload' ? 'active' : ''}`}
              onClick={() => handleNav('upload')}
            >
              Upload
            </button>
          </div>

          {/* mobile wallet area shown inside collapsed menu (bottom of menu) */}
          <div className="mobile-wallet" role="region" aria-label="Wallet (mobile)">
            <div className="mobile-wallet-info">
              <div className="mobile-label">Select wallet</div>
              <div className="mobile-balance" title="On-chain balance">
                {balanceQuery.data !== undefined ? `${balanceQuery.data.toFixed(4)} SOL` : '—'}
              </div>
            </div>
            <div className="mobile-wallet-btn">
              <WalletMultiButton />
            </div>
          </div>
        </nav>

        {/* desktop header wallet area (hidden on small screens) */}
        <div className="wallet-area">
          <div className="balance" title="On-chain balance">
            {balanceQuery.data !== undefined ? `${balanceQuery.data.toFixed(4)} SOL` : '—'}
          </div>
          <div className="wallet-btn">
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <main className="main">
        {tab === 'home' && <Home setTab={setTab} />}
        {tab === 'gallery' && <Gallery />}
        {tab === 'upload' && <Upload />}
      </main>
    </div>
  );
}
