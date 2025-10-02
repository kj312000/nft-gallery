// src/pages/NFTGallery.tsx
import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import { useWallet } from '@solana/wallet-adapter-react'
import './Gallery.css'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function NFTGallery() {
  const { data, error } = useSWR('/api/uploads', fetcher, { refreshInterval: 10_000 })
  const uploads: any[] = data || []
  const { publicKey } = useWallet()
  const [q, setQ] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const owners = useMemo(() => {
    const s = new Set(uploads.map((u) => u.uploader).filter(Boolean))
    return Array.from(s)
  }, [uploads])

  const items = useMemo(() => {
    return uploads
      .filter((u) => {
        if (q && !(u.name?.toLowerCase()?.includes(q.toLowerCase()) || u.description?.toLowerCase()?.includes(q.toLowerCase()))) return false
        if (tagFilter && !(u.tags || []).map((t: string) => t.toLowerCase()).includes(tagFilter.toLowerCase())) return false
        return true
      })
      .slice()
      .reverse() // newest first
  }, [uploads, q, tagFilter])

  if (error) return <div className="card placeholder">Failed to load gallery</div>

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <input className="form-input" placeholder="Search title or description" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <select className="form-input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">Filter by tag</option>
          {Array.from(new Set(uploads.flatMap((u: any) => u.tags || []))).map((t: any) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="gallery-grid">
        {items.length === 0 && <div className="gallery-empty">No items — upload one with the Upload tab.</div>}
        {items.map((it) => (
          <div className="nft-card" key={it.ipnft}>
            <img className="nft-image" src={`https://ipfs.io/ipfs/${it.ipnft}/metadata.json`.replace('/metadata.json', '') + '/' + (it.image ? it.image.split('/').pop() : '')} alt={it.name} onError={(e) => (e.currentTarget.src = '')} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div className="nft-title">{it.name}</div>
                <div className="nft-desc">{it.description}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>By: {it.uploader || 'anonymous'}</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 90 }}>
                <a className="btn btn-ghost" href={it.metadataUrl} target="_blank" rel="noreferrer">Metadata</a>
                <div style={{ height: 6 }} />
                <a className="btn" style={{ background: 'transparent' }} href={`https://ipfs.io/ipfs/${it.ipnft}/`} target="_blank" rel="noreferrer">IPFS</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
