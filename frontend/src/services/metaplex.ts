import { Metaplex, bundlrStorage, walletAdapterIdentity } from '@metaplex-foundation/js'
import type { Connection } from '@solana/web3.js'
import type { Wallet } from '@solana/wallet-adapter-base'

// Make a Metaplex instance and attach a wallet-adapter compatible identity
export function makeMetaplex(connection: Connection, walletAdapter?: Wallet) {
  const metaplex = Metaplex.make(connection).use(
    bundlrStorage({
      address: 'https://devnet.bundlr.network',
      providerUrl: (connection as any).rpcEndpoint || ''
    })
  )

  if (walletAdapter) {
    metaplex.use(walletAdapterIdentity(walletAdapter))
  }

  return metaplex
}

export async function mintNFT(metaplex: any, metadataUri: string, name = 'Unnamed', sellerFeeBasisPoints = 500) {
  const { nft } = await metaplex.nfts().create({ uri: metadataUri, name, sellerFeeBasisPoints })
  return nft
}
