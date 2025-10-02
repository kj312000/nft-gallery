import React from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useQuery } from '@tanstack/react-query'
import './Transactions.css'

async function fetchRecentSigs(connection: any, publicKey: any) {
  if (!publicKey) return []
  const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 12 })
  return Promise.all(
    sigs.map(async (s: any) => {
      const parsed = await connection.getParsedTransaction(s.signature, 'confirmed')
      return {
        signature: s.signature,
        slot: s.slot,
        err: s.err,
        blockTime: s.blockTime,
        fee: parsed?.meta?.fee ?? null,
      }
    })
  )
}

export default function Transactions() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()

  const { data: txs = [], isLoading } = useQuery(['txs', publicKey?.toBase58()], () => fetchRecentSigs(connection, publicKey), {
    enabled: !!publicKey,
    refetchInterval: 15_000,
  })

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Recent Transactions</h3>

      {!publicKey && <div className="tx-empty card" style={{ marginTop: 12 }}>Connect your wallet to view recent activity.</div>}

      {publicKey && (
        <>
          {isLoading && <div className="card placeholder" style={{ marginTop: 12 }}>Loading…</div>}
          <div className="grid" style={{ marginTop: 12 }}>
            {txs.length === 0 && !isLoading && <div className="tx-empty card">No recent transactions found.</div>}
            {txs.map((t: any) => (
              <div className="tx-card card" key={t.signature}>
                <div className="tx-row">
                  <div className="tx-id">{t.signature.slice(0, 8)}...{t.signature.slice(-6)}</div>
                  <div className="tx-meta">{t.slot}</div>
                </div>

                <div style={{ marginTop: 8, fontSize: 13 }}>
                  {t.blockTime ? new Date(t.blockTime * 1000).toLocaleString() : '—'}
                </div>

                <div style={{ marginTop: 8 }} className="tx-fee">Fee: {t.fee !== null ? `${(t.fee / 1e9).toFixed(6)} SOL` : '—'}</div>

                <div style={{ marginTop: 10 }}>
                  <a target="_blank" rel="noreferrer" href={`https://explorer.solana.com/tx/${t.signature}?cluster=${(import.meta.env.VITE_SOLANA_CLUSTER || 'devnet')}`}>
                    View on Explorer
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
