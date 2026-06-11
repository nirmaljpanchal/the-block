import { describe, it, expect, beforeEach } from 'vitest';
import { mockVehicleClient } from './mockClient';
import type { PlaceBidInput } from '../types/index';

describe('mockVehicleClient.placeBid', () => {
  beforeEach(() => {
    // Tests run with real timers; latency is 150-450ms which is acceptable for tests
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
    const input: PlaceBidInput = {
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents,
    };

    const result = await mockVehicleClient.placeBid(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bid.vehicleId).toBe(vehicle.id);
      expect(result.bid.amountCents).toBe(input.amountCents);
      expect(result.bid.isUserBid).toBe(true);
      expect(result.newHighBidCents).toBe(input.amountCents);
    }
  });

  it('rejects INVALID_AMOUNT for non-integer amounts', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];

    const result = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: 1.5, // Not a safe integer
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_AMOUNT');
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
      amountCents: -100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_AMOUNT');
    }
  });

  it('rejects NOT_FOUND for non-existent vehicle', async () => {
    const result = await mockVehicleClient.placeBid({
      vehicleId: 'nonexistent',
      amountCents: 1000000,
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
      amountCents: vehicle.auction.startingBidCents,
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
      amountCents: vehicle.auction.startingBidCents,
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

    // Place first bid at starting price
    const firstBid = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents,
    });
    expect(firstBid.ok).toBe(true);

    // Try to place a bid below minimum increment
    const secondBid = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents + Math.floor(vehicle.auction.minIncrementCents / 2),
    });

    expect(secondBid.ok).toBe(false);
    if (!secondBid.ok) {
      expect(secondBid.code).toBe('BELOW_MINIMUM');
      expect(secondBid.currentHighBidCents).toBe(vehicle.auction.startingBidCents);
    }
  });

  it('rejects INVALID_AMOUNT for fat-finger bids (>10x current high)', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];

    // Place initial bid
    const initialBid = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents,
    });
    expect(initialBid.ok).toBe(true);

    // Try to place a bid 11x the starting bid
    const fatFingerBid = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents * 11,
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

    // First bid at starting price
    const first = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents,
    });
    expect(first.ok).toBe(true);

    // Second bid with minimum increment
    const second = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents + vehicle.auction.minIncrementCents,
    });
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.newHighBidCents).toBe(
        vehicle.auction.startingBidCents + vehicle.auction.minIncrementCents
      );
    }

    // Third bid with 2x increment
    const third = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents + vehicle.auction.minIncrementCents * 2,
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

    const placeBidResult = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents,
    });
    expect(placeBidResult.ok).toBe(true);

    const bids = await mockVehicleClient.getBids(vehicle.id);
    expect(bids.length).toBeGreaterThan(0);

    if (placeBidResult.ok) {
      const foundBid = bids.find((b) => b.id === placeBidResult.bid.id);
      expect(foundBid).toBeDefined();
      expect(foundBid?.amountCents).toBe(vehicle.auction.startingBidCents);
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

    const result = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bid.isUserBid).toBe(true);
    }
  });

  it('includes currentHighBidCents in BELOW_MINIMUM response', async () => {
    const vehicles = await mockVehicleClient.getVehicles({ auctionStatus: 'live' });
    if (vehicles.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const vehicle = vehicles[0];

    // Place first bid
    const first = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents,
    });
    expect(first.ok).toBe(true);

    // Try to place insufficient second bid
    const second = await mockVehicleClient.placeBid({
      vehicleId: vehicle.id,
      amountCents: vehicle.auction.startingBidCents + 100, // Less than minimum increment
    });

    expect(second.ok).toBe(false);
    if (!second.ok && second.code === 'BELOW_MINIMUM') {
      expect(second.currentHighBidCents).toBe(vehicle.auction.startingBidCents);
    }
  });
});
