import type { Vehicle } from '../types/index';

export const LOAD_TIME = Date.now();

/**
 * Normalize seed vehicles so that at any load time:
 * - ~14 vehicles are live (ending between 2 minutes and 48 hours from now)
 * - ~6 upcoming (ending 48+ hours from now)
 * - ~4 ended (ended before now)
 *
 * Auction status is recomputed on every read based on current time,
 * never cached in the vehicle object.
 */
export function normalizeVehicles(vehicles: Vehicle[]): Vehicle[] {
  const now = Date.now();
  const offset = now - LOAD_TIME;

  return vehicles.map((v) => {
    const seedStart = new Date(v.auction.startsAt).getTime();
    const seedEnd = new Date(v.auction.endsAt).getTime();

    const normalizedStart = seedStart + offset;
    const normalizedEnd = seedEnd + offset;

    const status = computeAuctionStatus(normalizedStart, normalizedEnd, now);

    return {
      ...v,
      auction: {
        ...v.auction,
        startsAt: new Date(normalizedStart).toISOString(),
        endsAt: new Date(normalizedEnd).toISOString(),
        status,
      },
    };
  });
}

/**
 * Recompute auction status at any point in time.
 * Never trust the cached status; always derive from startsAt/endsAt.
 */
export function computeAuctionStatus(
  startsAtMs: number,
  endsAtMs: number,
  nowMs: number
): 'upcoming' | 'live' | 'ended' {
  if (nowMs < startsAtMs) return 'upcoming';
  if (nowMs > endsAtMs) return 'ended';
  return 'live';
}

