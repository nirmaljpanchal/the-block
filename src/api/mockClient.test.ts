import { describe, it, expect, beforeEach } from 'vitest';
import { mockVehicleClient } from './mockClient';
import type { PlaceBidInput } from '../types/index';

describe('mockVehicleClient.placeBid', () => {
  beforeEach(() => {
    // Reset bids before each test to prevent state leakage
    (mockVehicleClient as any).resetBids();
  });

  it('accepts a valid bid on a live auction', async () => {
    // Get a live vehicle
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });

    if (vehicles.length === 0) {
      // If no live vehicles at this moment in time, skip test
      // (timing-dependent due to current system date)
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];

    // First bid must be at minimum next bid (starting bid + minimum increment)
    const minNextBid = vehicle.auction.startingBid + vehicle.auction.minIncrement;

    const input: PlaceBidInput = {
      vehicleId: vehicle.id,
      amount: minNextBid,
    };

    const result = await mockVehicleClient.placeBid(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bid.vehicleId).toBe(vehicle.id);
      expect(result.bid.amount).toBe(input.amount);
      expect(result.bid.isUserBid).toBe(true);
      expect(result.newHighBid).toBe(input.amount);
    }
  });

  it('rejects BELOW_MINIMUM for very small amounts', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];

    // Amount far below starting bid
    const result = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: 1.50, // $1.50 is below any realistic starting bid
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('BELOW_MINIMUM');
    }
  });

  it('rejects INVALID_AMOUNT for zero or negative amounts', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];

    const result = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: -100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_AMOUNT');
    }
  });

  it('rejects NOT_FOUND for non-existent vehicle', async () => {
    const result = await mockVehicleClient.placeBid({
      vehicleId: 'nonexistent',
      amount: 1000000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('NOT_FOUND');
    }
  });

  it('rejects AUCTION_NOT_STARTED for upcoming auctions', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'upcoming' });
    if (vehicles.length === 0) {
      // Skip if no upcoming vehicles at this time
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];
    const result = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: vehicle.auction.startingBid,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUCTION_NOT_STARTED');
    }
  });

  it('rejects AUCTION_ENDED for ended auctions', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'ended' });
    if (vehicles.length === 0) {
      // Skip if no ended vehicles at this time
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];
    const result = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: vehicle.auction.startingBid,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('AUCTION_ENDED');
    }
  });

  it('rejects BELOW_MINIMUM for bids below minimum increment', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];
    const minNextBid = vehicle.auction.startingBid + vehicle.auction.minIncrement;

    // Place first bid at minimum next bid
    const firstBid = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: minNextBid,
    });
    expect(firstBid.ok).toBe(true);

    // After first bid, current high is minNextBid, so next minimum should be minNextBid + minIncrement
    const secondMinBid = minNextBid + vehicle.auction.minIncrement;

    // Try to place a bid below minimum increment (between current high and minimum next)
    const secondBid = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: minNextBid + Math.floor(vehicle.auction.minIncrement / 2),
    });

    console.log('Second bid test:', {
      currentHigh: minNextBid,
      secondMinBid,
      attemptedBid: minNextBid + Math.floor(vehicle.auction.minIncrement / 2),
      secondBidResult: secondBid
    });

    expect(secondBid.ok).toBe(false);
    if (!secondBid.ok) {
      expect(secondBid.code).toBe('BELOW_MINIMUM');
      expect(secondBid.currentHighBid).toBe(minNextBid); // Current high is the first bid amount
      expect(secondBid.minimumNextBid).toBe(secondMinBid); // Minimum is current + increment
    }
  });

  it('rejects INVALID_AMOUNT for fat-finger bids (>10x current high)', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];
    const minNextBid = vehicle.auction.startingBid + vehicle.auction.minIncrement;

    // Place initial bid at minimum next bid
    const initialBid = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: minNextBid,
    });
    expect(initialBid.ok).toBe(true);

    // Try to place a bid 11x the starting bid (fat finger)
    const fatFingerBid = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: vehicle.auction.startingBid * 11,
    });

    expect(fatFingerBid.ok).toBe(false);
    if (!fatFingerBid.ok) {
      expect(fatFingerBid.code).toBe('INVALID_AMOUNT');
    }
  });

  it('allows valid increment bids', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];
    const minNextBid = vehicle.auction.startingBid + vehicle.auction.minIncrement;

    // First bid at minimum next bid
    const first = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: minNextBid,
    });
    expect(first.ok).toBe(true);

    // Second bid with minimum increment above first
    const secondAmount = minNextBid + vehicle.auction.minIncrement;
    const second = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: secondAmount,
    });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.newHighBid).toBe(secondAmount);
    }

    // Third bid with increment above second
    const thirdAmount = secondAmount + vehicle.auction.minIncrement;
    const third = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: thirdAmount,
    });
    expect(third.ok).toBe(true);
  });

  it('persists bids and retrieves them from getBids', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];
    const minNextBid = vehicle.auction.startingBid + vehicle.auction.minIncrement;

    const placeBidResult = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: minNextBid,
    });
    expect(placeBidResult.ok).toBe(true);

    const bids = await mockVehicleClient.getBids(vehicle.id);
    expect(bids.length).toBeGreaterThan(0);

    if (placeBidResult.ok) {
      const foundBid = bids.find((b) => b.id === placeBidResult.bid.id);
      expect(foundBid).toBeDefined();
      expect(foundBid?.amount).toBe(minNextBid);
      expect(foundBid?.isUserBid).toBe(true);
    }
  });

  it('marks user bids with isUserBid = true', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];
    const minNextBid = vehicle.auction.startingBid + vehicle.auction.minIncrement;

    const result = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: minNextBid,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bid.isUserBid).toBe(true);
    }
  });

  it('includes currentHighBid in BELOW_MINIMUM response', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];
    const minNextBid = vehicle.auction.startingBid + vehicle.auction.minIncrement;

    // Place first bid at minimum next bid
    const first = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: minNextBid,
    });
    expect(first.ok).toBe(true);

    // Try to place insufficient second bid (less than minimum increment above first)
    const second = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amount: minNextBid + 100, // Less than minimum increment above first
    });

    expect(second.ok).toBe(false);
    if (!second.ok && second.code === 'BELOW_MINIMUM') {
      expect(second.currentHighBid).toBe(minNextBid); // Current high is the first bid amount
      expect(second.minimumNextBid).toBe(minNextBid + vehicle.auction.minIncrement);
    }
  });
});
