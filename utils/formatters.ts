/**
 * Format cryptocurrency amounts with appropriate decimal places
 * Shows more decimals for smaller amounts, fewer for larger amounts
 */
export function formatCryptoAmount(amount: number, currency?: string): string {
  if (amount === 0) return '0';
  if (amount < 0.000001) return amount.toFixed(8);
  if (amount < 0.01) return amount.toFixed(6);
  if (amount < 1) return amount.toFixed(4);
  return amount.toFixed(2);
}

/**
 * Format USD values with appropriate decimal places and thousands separators
 * Shows more decimals for very small amounts, rounds for larger amounts
 */
export function formatUSD(amount: number): string {
  if (amount === 0) return '$0';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(2)}`;
  if (amount < 1000) return `$${amount.toFixed(2)}`;
  return `$${Math.round(amount).toLocaleString()}`;
}

/**
 * Format cryptocurrency prices (typically larger numbers like BTC price)
 * Always shows 2 decimal places with thousands separators
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
