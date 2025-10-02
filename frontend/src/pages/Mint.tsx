// src/pages/Mint.tsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { uploadToNFTStorage } from '../services/nftstorage';
import { mintNftViaInstructions } from '../services/mint-via-instructions';

export function MintPage() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const qc = useQueryClient();

  const mintMutation = useMutation(
    async () => {
      if (!file) throw new Error('Select an image file');
      if (!publicKey) throw new Error('Connect wallet first');

      // 1) upload to nft.storage
      const metadata = await uploadToNFTStorage(name || 'Untitled', description || '', file);
      // metadata.ipnft is CID for metadata JSON; metadata.url may be "ipfs://..."
      // Use https gateway to build a full URL for the token metadata
      const ipfsCid = metadata.ipnft;
      const metadataUrl = `https://ipfs.io/ipfs/${ipfsCid}/metadata.json`;

      // 2) mint on Solana using instructions
      const res = await mintNftViaInstructions({
        connection,
        walletPubkey: publicKey,
        sendTransaction,
        metadataUrl,
        name: name || 'Untitled',
      });

      return res;
    },
    {
      onSuccess: () => qc.invalidateQueries(['walletNFTs']),
    }
  );

  return (
    <div style={{ marginTop: 16 }}>
      <h2>Mint NFT (devnet)</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button disabled={!publicKey || !file || mintMutation.isLoading} onClick={() => mintMutation.mutate()}>
          {mintMutation.isLoading ? 'Minting...' : 'Mint'}
        </button>
      </div>
      {mintMutation.error && <div style={{ color: 'red' }}>{(mintMutation.error as Error).message}</div>}
      {mintMutation.data && (
        <div style={{ marginTop: 12 }}>
          <div>Minted: {mintMutation.data.mint}</div>
          <div>Tx: {mintMutation.data.txid}</div>
        </div>
      )}
    </div>
  );
}
