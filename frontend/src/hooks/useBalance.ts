// src/hooks/useBalance.ts
import { useQuery } from '@tanstack/react-query';
import type { Connection, PublicKey } from '@solana/web3.js';

export function useBalance(connection: Connection, publicKey?: PublicKey | undefined) {
  return useQuery<number>(
    ['balance', publicKey?.toString()],
    async () => {
      if (!publicKey) return 0;
      const lamports = await connection.getBalance(publicKey);
      return lamports / 1e9;
    },
    {
      enabled: !!publicKey,
      staleTime: 15_000,
      refetchInterval: 15_000,
    }
  );
}
