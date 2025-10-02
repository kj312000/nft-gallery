// src/services/umi.ts
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import type { WalletAdapter } from '@solana/wallet-adapter-base';
import type { Connection } from '@solana/web3.js';

/**
 * Create a UMI instance bound to an existing Connection (or RPC url).
 * If walletAdapter is provided, attach wallet adapter identity so UMI can sign.
 */
export function makeUmi(connectionOrRpc: Connection | string, walletAdapter?: WalletAdapter) {
  // createUmi accepts either a Connection or rpcUrl string in modern bundles
  const umi = createUmi(connectionOrRpc).use(mplTokenMetadata());

  if (walletAdapter) {
    umi.use(walletAdapterIdentity(walletAdapter as any));
  }

  return umi;
}
