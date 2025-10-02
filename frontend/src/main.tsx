import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Solana wallet adapter providers
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@solana/wallet-adapter-react-ui/styles.css'

const queryClient = new QueryClient()
const CLUSTER = (import.meta.env.VITE_SOLANA_CLUSTER as any) || 'devnet'
const endpoint = CLUSTER === 'devnet' ? clusterApiUrl('devnet') : clusterApiUrl('mainnet-beta')
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()]

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
