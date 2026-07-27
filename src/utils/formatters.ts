export function formatSol(lamports: number | bigint, decimals = 9): string {
  const sol = Number(lamports) / Math.pow(10, decimals);
  return sol.toFixed(4);
}

export function formatUSD(solAmount: number, solPrice: number): string {
  return `$${(solAmount * solPrice).toFixed(2)}`;
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

export function percentage(part: number, total: number): string {
  if (total === 0) return '0%';
  return ((part / total) * 100).toFixed(1) + '%';
}
