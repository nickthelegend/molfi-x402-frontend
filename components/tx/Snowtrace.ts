export function getSnowtraceTxUrl(hash: string): string {
  const base = process.env.NEXT_PUBLIC_FUJI_EXPLORER_BASE || 'https://testnet.snowtrace.io';
  return `${base}/tx/${hash}`;
}
