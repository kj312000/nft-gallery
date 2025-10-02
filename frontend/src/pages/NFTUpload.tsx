// src/pages/NFTUpload.tsx
import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@solana/wallet-adapter-react'
import { NFTStorage, File } from 'nft.storage'
import './SendSol.css' // reuse send-card form styles (nice)
import './Home.css' // for feature styles if needed

const NFT_STORAGE_KEY = import.meta.env.VITE_NFT_STORAGE_KEY as string

export default function NFTUpload() {
  const { publicKey } = useWallet()
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')

// inside NFTUpload.tsx — replace the uploadMut definition with this:

const uploadMut = useMutation(async () => {
  if (!file) throw new Error('Choose an image file')
  if (!NFT_STORAGE_KEY) throw new Error('Server: NFT storage key missing (set VITE_NFT_STORAGE_KEY)')

  const client = new NFTStorage({ token: NFT_STORAGE_KEY })

  // ensure file is a File object (browser File, not Node)
  const browserFile = file instanceof File ? file : new File([file as Blob], (file as any).name || `upload-${Date.now()}.png`, { type: (file as any).type || 'image/png' })

  // store on nft.storage — this returns a Token<T> typed object (TS types vary)
  const token = await client.store({
    name: name || 'Untitled',
    description: description || '',
    image: browserFile,
    properties: {
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      uploadedBy: publicKey?.toString() || 'anonymous',
      uploadedAt: new Date().toISOString(),
    },
  })

  // token.ipnft is the CID for the metadata JSON. Build a gateway URL and fetch it
  const cid = (token as any).ipnft
  if (!cid) throw new Error('nft.storage did not return an ipnft CID')

  const metadataUrl = `https://ipfs.io/ipfs/${cid}/metadata.json`

  // fetch the metadata JSON from the gateway so we have canonical fields (name, description, image)
  const res = await fetch(metadataUrl)
  if (!res.ok) throw new Error(`Failed to fetch metadata from gateway: ${res.status}`)
  const metadataJson = (await res.json()) as {
    name?: string
    description?: string
    image?: string
    [k: string]: any
  }

  // Derive a safe image URL: metadataJson.image may be "ipfs://..." or a gateway URL
  let imageUrl = ''
  if (metadataJson.image) {
    if (typeof metadataJson.image === 'string') {
      if (metadataJson.image.startsWith('ipfs://')) {
        const p = metadataJson.image.replace('ipfs://', '')
        imageUrl = `https://ipfs.io/ipfs/${p}`
      } else {
        imageUrl = metadataJson.image
      }
    }
  } else {
    // fallback: try to guess file name from token or use empty string
    imageUrl = '' 
  }

  const record = {
    name: metadataJson.name || (token as any).name || name || 'Untitled',
    description: metadataJson.description || (token as any).description || description || '',
    ipnft: cid,
    url: (token as any).url || `ipfs://${cid}`,
    metadataUrl,
    image: imageUrl,
    uploader: publicKey?.toString() || null,
    createdAt: new Date().toISOString(),
    tags: tags ? tags.split(',').map((t) => t.trim()) : [],
  }

  // register with serverless API
  const r = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  })
  if (!r.ok) {
    const txt = await r.text()
    throw new Error(`Failed to register upload: ${r.status} ${txt}`)
  }

  return record
}, {
  onSuccess: () => qc.invalidateQueries(['uploads']),
})

  return (
    <div className="send-card">
      <h3 style={{ marginTop: 0 }}>Upload NFT provenance</h3>

      <label className="form-label">Image</label>
      <input className="form-input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ? new File([e.target.files![0]], e.target.files![0].name, { type: e.target.files![0].type }) : null)} />

      <label className="form-label" style={{ marginTop: 10 }}>Title</label>
      <input className="form-input" placeholder="Artwork title" value={name} onChange={(e) => setName(e.target.value)} />

      <label className="form-label" style={{ marginTop: 10 }}>Description</label>
      <input className="form-input" placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} />

      <label className="form-label" style={{ marginTop: 10 }}>Tags (comma separated)</label>
      <input className="form-input" placeholder="portrait, generative, 1/1" value={tags} onChange={(e) => setTags(e.target.value)} />

      <div className="form-actions" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" disabled={!publicKey || !file || uploadMut.isLoading} onClick={() => uploadMut.mutate()}>
          {uploadMut.isLoading ? 'Uploading…' : (publicKey ? 'Upload to IPFS' : 'Connect wallet to upload')}
        </button>

        {uploadMut.isError && <div className="msg error" style={{ marginLeft: 10 }}>{(uploadMut.error as Error).message}</div>}
        {uploadMut.data && <div className="msg success" style={{ marginLeft: 10 }}>Uploaded — <a target="_blank" rel="noreferrer" href={uploadMut.data.metadataUrl}>View metadata</a></div>}
      </div>

      <div style={{ marginTop: 12, color: '#6b7280', fontSize: 13 }}>
        <strong>Note:</strong> This uploads your image + metadata to IPFS via nft.storage and registers it in the app gallery. Later you can mint on-chain using this metadata URL with your minting flow.
      </div>
    </div>
  )
}
