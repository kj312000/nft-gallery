// src/App.tsx
import React, { useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Upload from './pages/Upload';
import './App.css';
import {useBalance} from './hooks/useBalance';

export default function App() {
  const [tab, setTab] = useState<'home' | 'gallery' | 'upload'>('home');
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const balanceQuery = useBalance(connection, publicKey ?? undefined);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>Solana Gallery</h1>
          <div className="tag">NFT upload + gallery</div>
        </div>

        <nav className="top-nav">
          <button className={`nav-btn ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>Home</button>
          <button className={`nav-btn ${tab === 'gallery' ? 'active' : ''}`} onClick={() => setTab('gallery')}>Gallery</button>
          <button className={`nav-btn ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>Upload</button>
        </nav>

        <div className="wallet-area">
          <div className="balance">
            {balanceQuery.data !== undefined ? `${balanceQuery.data.toFixed(4)} SOL` : '—'}
          </div>
          <WalletMultiButton />
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
