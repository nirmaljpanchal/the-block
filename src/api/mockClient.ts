/**
 * This module simulates a server. All validation here represents what MUST run
 * server-side in production; client-side checks elsewhere are UX only.
 */

import type { Vehicle, Bid, VehicleFilters, PlaceBidInput, PlaceBidResult, VehicleService } from '../types/index';
import { normalizeVehicles, computeAuctionStatus } from './normalize';
import { SEED_VEHICLES } from './seed';

const BIDS_STORAGE_KEY = 'bids:v1';
const SIMULATED_LATENCY_MIN = 150;
const SIMULATED_LATENCY_MAX = 450;

class MockVehicleClient implements VehicleService {
  private vehicles: Vehicle[];
  private bids: Map<string, Bid[]>;
  private subscriberCallbacks: Map<string, Set<(bid: Bid) => void>>;
  private rivalTimers: Map<string, NodeJS.Timeout>;

  constructor() {
    this.vehicles = normalizeVehicles([...SEED_VEHICLES]);
    this.bids = new Map();
    this.subscriberCallbacks = new Map();
    this.rivalTimers = new Map();
    this.loadBidsFromStorage();
  }

  private loadBidsFromStorage(): void {
    try {
      const stored = localStorage.getItem(BIDS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, Bid[]>;
        // Validate shape: should be { [vehicleId]: Bid[] }
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          for (const [vehicleId, bids] of Object.entries(parsed)) {
            if (
              Array.isArray(bids) &&
              bids.every(
                (b) =>
                  typeof b === 'object' &&
                  b !== null &&
                  typeof b.id === 'string' &&
                  typeof b.vehicleId === 'string' &&
                  typeof b.amount === 'number' &&
                  typeof b.bidderName === 'string' &&
                  typeof b.placedAt === 'string' &&
                  typeof b.isUserBid === 'boolean'
              )
            ) {
              this.bids.set(vehicleId, bids);
            }
          }
        }
      }
    } catch {
      // Corrupted storage: discard and reseed
      console.warn('Corrupted bids storage; discarding');
      this.bids.clear();
    }
  }

  private saveBidsToStorage(): void {
    const data: Record<string, Bid[]> = {};
    for (const [vehicleId, bids] of this.bids) {
      data[vehicleId] = bids;
    }
    try {
      localStorage.setItem(BIDS_STORAGE_KEY, JSON.stringify(data));
    } catch {
      console.error('Failed to save bids to localStorage');
    }
  }

  private simulateLatency(): Promise<void> {
    const delay = Math.floor(Math.random() * (SIMULATED_LATENCY_MAX - SIMULATED_LATENCY_MIN + 1)) + SIMULATED_LATENCY_MIN;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private getHighestBid(vehicleId: string): number | null {
    const bids = this.bids.get(vehicleId) || [];
    if (bids.length === 0) return null;
    return Math.max(...bids.map((b) => b.amount));
  }

  private scheduleRivalBid(vehicleId: string): void {
    // Clear existing timer if any
    if (this.rivalTimers.has(vehicleId)) {
      clearTimeout(this.rivalTimers.get(vehicleId)!);
    }

    // Simulate rival bidder activity: 8-25 second interval with 60% probability
    const interval = Math.floor(Math.random() * (25000 - 8000 + 1)) + 8000;
    const shouldBid = Math.random() < 0.6;

    const timer = setTimeout(async () => {
      if (!shouldBid) {
        this.scheduleRivalBid(vehicleId);
        return;
      }

      const vehicle = this.vehicles.find((v) => v.id === vehicleId);
      if (!vehicle || vehicle.auction.status !== 'live') {
        return;
      }

      const bids = this.bids.get(vehicleId) || [];
      const hasUserBid = bids.some((b) => b.isUserBid);

      if (!hasUserBid) {
        this.scheduleRivalBid(vehicleId);
        return;
      }

      const highBid = this.getHighestBid(vehicleId) || vehicle.auction.startingBid;
      const minNextBid = highBid + vehicle.auction.minIncrement;
      const rivalAmount = minNextBid + (Math.random() * (vehicle.auction.minIncrement * 3));

      const rivalInput: PlaceBidInput = {
        vehicleId,
        amount: Math.round(rivalAmount * 100) / 100,
      };

      await this.placeBid(rivalInput, { isRivalBid: true });
      this.scheduleRivalBid(vehicleId);
    }, interval);

    this.rivalTimers.set(vehicleId, timer);
  }

  async getVehicles(filters: VehicleFilters): Promise<Vehicle[]> {
    await this.simulateLatency();

    // Simulate 3% error rate for getVehicles (disabled in test environments)
    if (typeof process === 'undefined' || !process.env.VITEST) {
      if (Math.random() < 0.03) {
        throw new Error('Simulated service error');
      }
    }

    let result = this.vehicles.map((v) => ({
      ...v,
      auction: {
        ...v.auction,
        status: computeAuctionStatus(
          new Date(v.auction.startsAt).getTime(),
          new Date(v.auction.endsAt).getTime(),
          Date.now()
        ),
      },
    }));

    // Apply filters
    if (filters.query) {
      const terms = filters.query.toLowerCase().split(/\s+/);
      result = result.filter((v) => {
        const vehicleText = `${v.year} ${v.make} ${v.model} ${v.trim} ${v.vin}`.toLowerCase();
        return terms.every((term) => vehicleText.includes(term));
      });
    }

    if (filters.make) {
      result = result.filter((v) => v.make === filters.make);
    }

    if (filters.bodyStyle) {
      result = result.filter((v) => v.bodyStyle === filters.bodyStyle);
    }

    if (filters.maxMileage !== undefined) {
      result = result.filter((v) => v.mileage <= filters.maxMileage!);
    }

    if (filters.auctionStatus) {
      result = result.filter((v) => v.auction.status === filters.auctionStatus);
    }

    // Apply sort
    if (filters.sort === 'endingSoon') {
      result.sort(
        (a, b) =>
          new Date(a.auction.endsAt).getTime() - new Date(b.auction.endsAt).getTime()
      );
    } else if (filters.sort === 'priceAsc') {
      result.sort((a, b) => {
        const aHigh = this.getHighestBid(a.id) || a.auction.startingBid;
        const bHigh = this.getHighestBid(b.id) || b.auction.startingBid;
        return aHigh - bHigh;
      });
    } else if (filters.sort === 'priceDesc') {
      result.sort((a, b) => {
        const aHigh = this.getHighestBid(a.id) || a.auction.startingBid;
        const bHigh = this.getHighestBid(b.id) || b.auction.startingBid;
        return bHigh - aHigh;
      });
    } else if (filters.sort === 'mileageAsc') {
      result.sort((a, b) => a.mileage - b.mileage);
    }

    return result;
  }

  async getVehicle(id: string): Promise<Vehicle | null> {
    await this.simulateLatency();

    const vehicle = this.vehicles.find((v) => v.id === id);
    if (!vehicle) return null;

    return {
      ...vehicle,
      auction: {
        ...vehicle.auction,
        status: computeAuctionStatus(
          new Date(vehicle.auction.startsAt).getTime(),
          new Date(vehicle.auction.endsAt).getTime(),
          Date.now()
        ),
      },
    };
  }

  async getBids(vehicleId: string): Promise<Bid[]> {
    await this.simulateLatency();
    return this.bids.get(vehicleId) || [];
  }

  async placeBid(input: PlaceBidInput, options?: { isRivalBid?: boolean }): Promise<PlaceBidResult> {
    await this.simulateLatency();

    // Validation: a. Positive and valid dollar amount
    if (input.amount <= 0) {
      return {
        ok: false,
        code: 'INVALID_AMOUNT',
        message: 'Bid amount must be a positive amount',
      };
    }

    // Validation: b. Vehicle exists
    const vehicle = this.vehicles.find((v) => v.id === input.vehicleId);
    if (!vehicle) {
      return {
        ok: false,
        code: 'NOT_FOUND',
        message: 'Vehicle not found',
      };
    }

    // Validation: c. Auction timing (using Date.now(), not client-supplied time)
    const now = Date.now();
    const startsAtMs = new Date(vehicle.auction.startsAt).getTime();
    let endsAtMs = new Date(vehicle.auction.endsAt).getTime();

    if (now < startsAtMs) {
      return {
        ok: false,
        code: 'AUCTION_NOT_STARTED',
        message: 'Auction has not started yet',
      };
    }

    if (now > endsAtMs) {
      return {
        ok: false,
        code: 'AUCTION_ENDED',
        message: 'Auction has ended',
      };
    }

    // Validation: d. Minimum increment
    const currentHigh = this.getHighestBid(input.vehicleId) || vehicle.auction.startingBid;
    const minNextBid = currentHigh + vehicle.auction.minIncrement;

    if (input.amount < minNextBid) {
      return {
        ok: false,
        code: 'BELOW_MINIMUM',
        message: `You've been outbid. Current high is ${currentHigh}. Minimum next bid is ${minNextBid}.`,
        currentHighBid: currentHigh,
        minimumNextBid: minNextBid,
      };
    }

    // Validation: e. Fat-finger guard (reject if 10x current high, only if bids exist)
    if (currentHigh > 0 && input.amount > currentHigh * 10) {
      return {
        ok: false,
        code: 'INVALID_AMOUNT',
        message: 'Bid is unusually high compared to current bid',
      };
    }

    // Anti-snipe: if bid lands within final 60s, extend auction by 60s
    const timeRemaining = endsAtMs - now;
    const SNIPE_THRESHOLD_MS = 60000; // 60 seconds
    if (timeRemaining > 0 && timeRemaining <= SNIPE_THRESHOLD_MS) {
      endsAtMs += SNIPE_THRESHOLD_MS;
      vehicle.auction.endsAt = new Date(endsAtMs).toISOString();
    }

    // Bid accepted
    const newBid: Bid = {
      id: Math.random().toString(36).slice(2),
      vehicleId: input.vehicleId,
      amount: input.amount,
      bidderName: options?.isRivalBid ? this.getRandomRivalName() : 'You',
      placedAt: new Date().toISOString(),
      isUserBid: !options?.isRivalBid,
    };

    if (!this.bids.has(input.vehicleId)) {
      this.bids.set(input.vehicleId, []);
    }
    this.bids.get(input.vehicleId)!.push(newBid);
    this.saveBidsToStorage();

    // Notify subscribers
    const callbacks = this.subscriberCallbacks.get(input.vehicleId) || new Set();
    for (const cb of callbacks) {
      cb(newBid);
    }

    return {
      ok: true,
      bid: newBid,
      newHighBid: input.amount,
    };
  }

  private getRandomRivalName(): string {
    const rivals = [
      'Dealer 4471',
      'Midwest Auto Group',
      'Atlantic Motors',
      'Prairie Auctions',
      'Coastal Trading Co',
      'Northern Fleet Buyers',
    ];
    return rivals[Math.floor(Math.random() * rivals.length)];
  }

  subscribeToBids(vehicleId: string, cb: (bid: Bid) => void): () => void {
    if (!this.subscriberCallbacks.has(vehicleId)) {
      this.subscriberCallbacks.set(vehicleId, new Set());
      // Start rival bidding when first subscriber joins
      this.scheduleRivalBid(vehicleId);
    }
    this.subscriberCallbacks.get(vehicleId)!.add(cb);

    // Return unsubscribe function
    return () => {
      this.subscriberCallbacks.get(vehicleId)?.delete(cb);
    };
  }

  // Reset bids for testing purposes
  resetBids(): void {
    this.bids.clear();
    this.saveBidsToStorage();
  }
}

export const mockVehicleClient = new MockVehicleClient();
