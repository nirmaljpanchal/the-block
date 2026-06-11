const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

/**
 * Format dollars to CAD currency string.
 */
export function formatCurrency(dollars: number): string {
  return currencyFormatter.format(dollars);
}

/**
 * Format milliseconds since epoch to date string.
 */
export function formatDate(ms: number): string {
  return dateFormatter.format(new Date(ms));
}

/**
 * Format kilometers to display string.
 */
export function formatOdometer(km: number): string {
  return new Intl.NumberFormat('en-CA').format(km) + ' km';
}

/**
 * Get time remaining string for auction end time.
 */
export function getTimeRemaining(endTimeMs: number): string {
  const now = Date.now();
  const diffMs = endTimeMs - now;

  if (diffMs <= 0) return 'Auction ended';

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h remaining`;
  if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m remaining`;
  if (diffMinutes > 0) return `${diffMinutes}m remaining`;
  return `${diffSeconds}s remaining`;
}
