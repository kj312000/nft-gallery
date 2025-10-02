import { NFTStorage, File } from 'nft.storage'


const NFT_STORAGE_KEY = import.meta.env.VITE_NFT_STORAGE_KEY as string
if (!NFT_STORAGE_KEY) throw new Error('VITE_NFT_STORAGE_KEY not set in .env')
const client = new NFTStorage({ token: NFT_STORAGE_KEY })


export async function uploadToNFTStorage(name: string, description: string, fileBlob: Blob) {
const ext = fileBlob.type.split('/')[1] || 'png'
const file = new File([fileBlob], `${name}.${ext}`, { type: fileBlob.type })
const metadata = await client.store({ name, description, image: file })
// metadata.ipnft is the CID where metadata JSON is stored
return metadata
}