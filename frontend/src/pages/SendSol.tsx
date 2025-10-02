import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js'
import './SendSol.css'

export default function SendSol() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('0.01')
  const [note, setNote] = useState('')

  const sendMut = useMutation(async () => {
    if (!publicKey) throw new Error('Connect wallet first')
    if (!to) throw new Error('Enter recipient address')
    const toPub = new PublicKey(to)
    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL)
    if (Number.isNaN(lamports) || lamports <= 0) throw new Error('Invalid amount')

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: toPub,
        lamports,
      })
    )

    if (note.trim()) {
      // Memo program (optional) — small note for tx
      const memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')
      tx.add({
        keys: [],
        programId: memoProgramId,
        data: Buffer.from(note, 'utf8'),
      } as any)
    }

    const signature = await sendTransaction(tx, connection)
    await connection.confirmTransaction(signature, 'confirmed')
    return { signature }
  })

  const airdropMut = useMutation(async () => {
    if (!publicKey) throw new Error('Connect wallet first')
    const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(sig, 'confirmed')
    return sig
  })

  return (
    <div className="send-card">
      <h3 style={{ marginTop: 0 }}>Send SOL</h3>

      <label className="form-label">Recipient</label>
      <input className="form-input" placeholder="Paste Solana address" value={to} onChange={(e) => setTo(e.target.value)} />

      <div className="form-row">
        <div style={{ flex: 1 }}>
          <label className="form-label">Amount (SOL)</label>
          <input className="form-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div style={{ width: 160 }}>
          <label className="form-label">Quick</label>
          <div className="chips" style={{ marginTop: 4 }}>
            {[0.01, 0.05, 0.1].map((a) => (
              <button key={a} type="button" className="chip" onClick={() => setAmount(String(a))}>
                {a} SOL
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="form-label" style={{ marginTop: 10 }}>
        Note (optional)
      </label>
      <input className="form-input" placeholder="Optional memo" value={note} onChange={(e) => setNote(e.target.value)} />

      <div className="form-actions">
        <button className="btn btn-primary" onClick={() => sendMut.mutate()} disabled={!publicKey || sendMut.isLoading}>
          {sendMut.isLoading ? 'Sending...' : 'Send SOL'}
        </button>

        <button className="btn btn-ghost" onClick={() => airdropMut.mutate()} disabled={!publicKey || airdropMut.isLoading} title="Devnet only">
          {airdropMut.isLoading ? 'Airdropping...' : 'Airdrop 1 SOL (Devnet)'}
        </button>

        {sendMut.isError && <div className="msg error" style={{ marginLeft: 10 }}>{(sendMut.error as Error).message}</div>}
        {sendMut.data && (
          <div className="msg success" style={{ marginLeft: 10 }}>
            Sent — <a target="_blank" rel="noreferrer" href={`https://explorer.solana.com/tx/${(sendMut.data as any).signature}?cluster=${(import.meta.env.VITE_SOLANA_CLUSTER || 'devnet')}`}>View on explorer</a>
          </div>
        )}

        {airdropMut.isError && <div className="msg error" style={{ marginLeft: 10 }}>{(airdropMut.error as Error).message}</div>}
        {airdropMut.data && (
          <div className="msg success" style={{ marginLeft: 10 }}>
            Airdrop done — <a target="_blank" rel="noreferrer" href={`https://explorer.solana.com/tx/${airdropMut.data}?cluster=${(import.meta.env.VITE_SOLANA_CLUSTER || 'devnet')}`}>View</a>
          </div>
        )}
      </div>
    </div>
  )
}
