// src/services/mint-via-instructions.ts
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';

import {
  createInitializeMintInstruction,
  MINT_SIZE,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import {
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';

/**
 * Mint an NFT using low-level instructions (spl-token + mpl-token-metadata).
 *
 * - connection: web3 connection from useConnection()
 * - walletPubkey: PublicKey of connected wallet (useWallet().publicKey)
 * - sendTransaction: useWallet().sendTransaction
 * - metadataUrl: full URL to metadata JSON (https://ipfs.io/ipfs/<CID>/metadata.json)
 */
export async function mintNftViaInstructions(options: {
  connection: Connection;
  walletPubkey: PublicKey;
  sendTransaction: (tx: Transaction, connection: Connection, opts?: any) => Promise<string>;
  metadataUrl: string;
  name?: string;
  symbol?: string;
  sellerFeeBasisPoints?: number;
}) {
  const {
    connection,
    walletPubkey,
    sendTransaction,
    metadataUrl,
    name = 'Untitled',
    symbol = '',
    sellerFeeBasisPoints = 500,
  } = options;

  if (!walletPubkey) throw new Error('Wallet not connected');

  // new mint keypair
  const mintKeypair = Keypair.generate();

  // lamports to make mint account rent-exempt
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx = new Transaction();

  // 1) create account for mint (owned by TOKEN_PROGRAM_ID)
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  // 2) initialize mint (decimals = 0)
  tx.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      0, // decimals
      walletPubkey, // mint authority
      walletPubkey // freeze authority
      // TOKEN_PROGRAM_ID is used by default in this helper
    )
  );

  // 3) create associated token account for user
  const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, walletPubkey);
  tx.add(createAssociatedTokenAccountInstruction(walletPubkey, ata, walletPubkey, mintKeypair.publicKey));

  // 4) mint 1 token to ATA
  tx.add(createMintToInstruction(mintKeypair.publicKey, ata, walletPubkey, 1));

  // 5) create metadata account (PDA)
  const [metadataPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );

  const metadataArgs = {
    data: {
      name,
      symbol,
      uri: metadataUrl,
      sellerFeeBasisPoints,
      creators: null,
      collection: null,
      uses: null,
    },
    isMutable: true,
  };

  tx.add(
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPDA,
        mint: mintKeypair.publicKey,
        mintAuthority: walletPubkey,
        payer: walletPubkey,
        updateAuthority: walletPubkey,
      },
      { createMetadataAccountArgsV3: metadataArgs }
    )
  );

  // 6) create master edition (edition PDA)
  const [editionPDA] = await PublicKey.findProgramAddress(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer(), Buffer.from('edition')],
    TOKEN_METADATA_PROGRAM_ID
  );

  tx.add(
    createCreateMasterEditionV3Instruction(
      {
        edition: editionPDA,
        mint: mintKeypair.publicKey,
        updateAuthority: walletPubkey,
        mintAuthority: walletPubkey,
        payer: walletPubkey,
      },
      // maxSupply: null => unlimited; use a number to set supply limit
      { createMasterEditionArgs: { maxSupply: 0 as any } }
    )
  );

  // Prepare transaction
  // partial sign with mint keypair (since we created that account)
  tx.feePayer = walletPubkey;
  const { blockhash } = await connection.getLatestBlockhash('finalized');
  tx.recentBlockhash = blockhash;
  tx.partialSign(mintKeypair);

  // Let the wallet sign and send
  const txid = await sendTransaction(tx, connection);
  // Wait for confirmation
  await connection.confirmTransaction(txid, 'confirmed');

  return {
    txid,
    mint: mintKeypair.publicKey.toBase58(),
    metadataAccount: metadataPDA.toBase58(),
    editionAccount: editionPDA.toBase58(),
  };
}
