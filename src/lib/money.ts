/**
 * Strict money parsing: accept only digits with optional one "." and ≤2 decimals.
 * Returns dollars (rounded to 2 decimal places), or null if invalid.
 */
export function parseMoneyInput(input: string): number | null {
  // Reject empty
  if (!input || input.trim() === '') return null;

  // Regex: optional digits, optional dot, up to 2 decimal digits
  const moneyRegex = /^\d+(\.\d{1,2})?$/;
  if (!moneyRegex.test(input)) return null;

  const dollars = parseFloat(input);

  // Reject non-finite, negative, or zero
  if (!Number.isFinite(dollars) || dollars <= 0) return null;

  // Reject > $10,000,000
  if (dollars > 10000000) return null;

  // Round to 2 decimal places (cents)
  const rounded = Math.round(dollars * 100) / 100;

  // Final safety check: must be positive
  if (rounded <= 0) return null;

  return rounded;
}
