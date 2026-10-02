/** Format Indian Rupee amounts with the ₹ symbol and Indian grouping */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** Format large amounts in lakhs (e.g., ₹26.1L) */
export function formatLakhs(amount: number): string {
  const lakhs = amount / 100000;
  return `₹${lakhs.toFixed(1)}L`;
}

/** Format a percentage with specified decimal places */
export function formatPct(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}

/** Truncate text to a max length with ellipsis */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

/** Pluralize a word based on count */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
