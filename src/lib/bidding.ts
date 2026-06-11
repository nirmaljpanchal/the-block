export function getMinimumNextBid(currentHighBidCents: number, minIncrementCents: number): number {
  return currentHighBidCents + minIncrementCents;
}

export function formatBidAmount(centsOrDollars: number): string {
  const dollars = centsOrDollars >= 100 ? Math.floor(centsOrDollars / 100) : centsOrDollars;
  const cents = centsOrDollars >= 100 ? centsOrDollars % 100 : 0;

  const formatter = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: cents === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });

  return formatter.format(dollars + (cents > 0 ? cents / 100 : 0));
}
