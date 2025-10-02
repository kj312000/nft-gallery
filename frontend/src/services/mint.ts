// src/services/mint.ts
import type { WalletAdapter } from '@solana/wallet-adapter-base';
import type { Connection } from '@solana/web3.js';
import { makeUmi } from './umi';
import { createNft } from '@metaplex-foundation/mpl-token-metadata';

/**
 * Mint an NFT using UMI + mpl-token-metadata (v1.2.5 compatible).
 *
 * - connection: web3.js Connection instance
 * - walletAdapter: wallet adapter object (wallet from useWallet().wallet)
 * - metadataUrl: full URL to metadata JSON (e.g. https://ipfs.io/ipfs/<CID>/metadata.json)
 */
export async function mintNftOnSolana(
  connection: Connection,
  walletAdapter: WalletAdapter | undefined,
  metadataUrl: string,
  name = 'Untitled'
) {
  if (!walletAdapter) throw new Error('Wallet not connected');

  // create umi with plugin and attach wallet identity
  const umi = makeUmi(connection, walletAdapter);

  // The createNft action is available once mplTokenMetadata plugin is used.
  // Pattern: createNft(umi, { uri, name, sellerFeeBasisPoints, ... }).sendAndConfirm(umi)
  const action = createNft(umi, {
    uri: metadataUrl,
    name,
    sellerFeeBasisPoints: 500,
    // optionally specify symbol, creators, collection, etc.
    updateAuthority: umi.identity.publicKey,
    mintAuthority: umi.identity.publicKey,
  });

  const result = await action.sendAndConfirm(umi);

  // result contains transaction and newly-created NFT info per mpl-token-metadata action
  return result;
}
