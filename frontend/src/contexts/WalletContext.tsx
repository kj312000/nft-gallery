// This file exports small helper hooks/wrappers around wallet-adapter react hooks
import React from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'

export function useWalletAdapter() {
  const { publicKey, signTransaction, signAllTransactions, signMessage, wallet } = useWallet()
  const { connection } = useConnection()
  return { publicKey, signTransaction, signAllTransactions, signMessage, wallet, connection }
}

export default function Dummy() { return null }
