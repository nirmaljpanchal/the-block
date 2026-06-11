import { useState, useRef, useEffect } from 'react';
import { vehicleService } from '../../api/client';
import { Button } from '../../components/Button';
import { formatCurrency } from '../../lib/formatters';
import { parseMoneyInput } from '../../lib/money';
import { getMinimumNextBid } from '../../lib/bidding';
import type { Vehicle, Bid } from '../../types/index';
import styles from './BiddingPanel.module.css';

interface BiddingPanelProps {
  vehicle: Vehicle;
  bids: Bid[];
  now: number;
  onBidPlaced: () => void;
}

export function BiddingPanel({ vehicle, bids, now, onBidPlaced }: BiddingPanelProps) {
  const [bidInput, setBidInput] = useState('');
  const [validationError, setValidationError] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState('');
  const [showAllBids, setShowAllBids] = useState(false);
  const [userBidStatus, setUserBidStatus] = useState<'high-bidder' | 'outbid' | null>(null);
  const enterKeyDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const endsAtMs = new Date(vehicle.auction.endsAt).getTime();
  const auctionEnded = now >= endsAtMs;

  const highestBid = bids.length > 0 ? Math.max(...bids.map((b) => b.amountCents)) : vehicle.auction.startingBidCents;
  const minNextBid = getMinimumNextBid(highestBid, vehicle.auction.minIncrementCents);

  // Determine user's bid status
  useEffect(() => {
    const userBids = bids.filter((b) => b.isUserBid);
    if (userBids.length === 0) {
      setUserBidStatus(null);
      return;
    }

    const userHighestBid = Math.max(...userBids.map((b) => b.amountCents));
    if (userHighestBid === highestBid) {
      setUserBidStatus('high-bidder');
    } else {
      setUserBidStatus('outbid');
    }
  }, [bids, highestBid]);

  // Validate input on change (UX only, not authoritative)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBidInput(value);

    if (value === '') {
      setValidationError('');
      return;
    }

    const cents = parseMoneyInput(value);
    if (cents === null) {
      setValidationError('Invalid amount (digits and up to 2 decimals)');
      return;
    }

    if (auctionEnded) {
      setValidationError('Auction has ended');
      return;
    }

    if (cents < minNextBid) {
      setValidationError(`Minimum next bid is ${formatCurrency(minNextBid / 100)}`);
      return;
    }

    setValidationError('');
  };

  // Debounce rapid Enter presses
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (enterKeyDebounceRef.current) {
        clearTimeout(enterKeyDebounceRef.current);
      }
      enterKeyDebounceRef.current = setTimeout(() => {
        handlePlaceBid();
      }, 50);
    }
  };

  const handlePlaceBid = async () => {
    if (auctionEnded) return;

    setBidError('');
    const cents = parseMoneyInput(bidInput);

    if (cents === null) {
      setValidationError('Invalid bid amount');
      return;
    }

    if (cents < minNextBid) {
      setValidationError(`Minimum next bid is ${formatCurrency(minNextBid / 100)}`);
      return;
    }

    setBidLoading(true);

    const result = await vehicleService.placeBid({
      vehicleId: vehicle.id,
      amountCents: cents
    });

    setBidLoading(false);

    // Client validation is UX only; the service is authoritative
    if (!result.ok) {
      if (result.code === 'BELOW_MINIMUM') {
        // Race condition: outbid between render and submit — smooth recovery
        const currentHigh = result.currentHighBidCents || highestBid;
        const newMinNextBid = result.minimumNextBidCents || (currentHigh + vehicle.auction.minIncrementCents);
        setBidError(`You've been outbid — current high is ${formatCurrency(currentHigh / 100)}. Minimum next bid is ${formatCurrency(newMinNextBid / 100)}.`);
        // Prefill with new minimum
        setBidInput((newMinNextBid / 100).toFixed(2));
        setValidationError('');
        // Announce to screen readers
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = `You've been outbid. Current high is ${formatCurrency(currentHigh / 100)}. Minimum next bid is ${formatCurrency(newMinNextBid / 100)}.`;
        }
      } else if (result.code === 'AUCTION_ENDED') {
        setBidError('Auction has ended. No more bids accepted.');
        setValidationError('Auction ended');
      } else {
        setBidError(result.message);
      }
      return;
    }

    // Success: clear form
    setBidInput('');
    setValidationError('');
    setBidError('');
    onBidPlaced();
  };

  const handleQuickBid = (delta: number) => {
    const newAmount = minNextBid + (delta * vehicle.auction.minIncrementCents);
    setBidInput((newAmount / 100).toFixed(2));
    setValidationError('');
  };

  // Relative time formatting for bid history
  const formatRelativeTime = (placedAtIso: string): string => {
    const placedAtMs = new Date(placedAtIso).getTime();
    const diffMs = now - placedAtMs;

    if (diffMs < 1000) return 'just now';
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const visibleBids = showAllBids ? [...bids].reverse() : [...bids].reverse().slice(0, 10);
  const hasMoreBids = bids.length > 10 && !showAllBids;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>Auction Details</h2>
        <div className={`${styles.status} ${auctionEnded ? styles.statusEnded : styles.statusLive}`}>
          {auctionEnded ? 'Ended' : 'Live'}
        </div>
      </div>


      <div className={styles.bidInfo}>
        <div className={styles.infoItem}>
          <p className={styles.label}>Current High Bid</p>
          <p className={styles.value}>{formatCurrency(highestBid / 100)}</p>
        </div>
        <div className={styles.infoItem}>
          <p className={styles.label}>Total Bids</p>
          <p className={styles.value}>{bids.length}</p>
        </div>
        <div className={styles.infoItem}>
          <p className={styles.label}>Minimum Next Bid</p>
          <p className={styles.value}>{formatCurrency(minNextBid / 100)}</p>
        </div>
      </div>

      {userBidStatus && (
        <div className={`${styles.userStatus} ${userBidStatus === 'high-bidder' ? styles.highBidder : styles.outbid}`}>
          {userBidStatus === 'high-bidder' ? "✓ You're the high bidder" : "⬇ You've been outbid"}
        </div>
      )}

      <div
        ref={liveRegionRef}
        className={styles.liveRegion}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      />

      {!auctionEnded && vehicle.auction.status === 'live' && (
        <form className={styles.bidForm} onSubmit={(e) => { e.preventDefault(); handlePlaceBid(); }}>
          <input
            type="text"
            placeholder="Enter bid amount (e.g. 15000.50)"
            value={bidInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={bidLoading}
            className={styles.input}
            aria-describedby={validationError ? 'bid-error' : undefined}
          />

          {validationError && (
            <p id="bid-error" className={styles.validationError}>
              {validationError}
            </p>
          )}

          <div className={styles.quickBidButtons}>
            <Button
              type="button"
              onClick={() => handleQuickBid(1)}
              disabled={bidLoading || auctionEnded}
              className={styles.quickBidButton}
              variant="secondary"
            >
              +1 ({formatCurrency((vehicle.auction.minIncrementCents / 100))})
            </Button>
            <Button
              type="button"
              onClick={() => handleQuickBid(2)}
              disabled={bidLoading || auctionEnded}
              className={styles.quickBidButton}
              variant="secondary"
            >
              +2 ({formatCurrency((vehicle.auction.minIncrementCents * 2 / 100))})
            </Button>
            <Button
              type="button"
              onClick={() => handleQuickBid(5)}
              disabled={bidLoading || auctionEnded}
              className={styles.quickBidButton}
              variant="secondary"
            >
              +5 ({formatCurrency((vehicle.auction.minIncrementCents * 5 / 100))})
            </Button>
          </div>

          <Button
            type="submit"
            disabled={bidLoading || auctionEnded || validationError !== ''}
            className={styles.submitButton}
          >
            {bidLoading ? 'Placing bid...' : 'Place Bid'}
          </Button>

          {bidError && (
            <p className={styles.bidError} role="alert">
              {bidError}
            </p>
          )}
        </form>
      )}

      {auctionEnded && (
        <div className={styles.auctionEnded}>
          This auction has ended. No more bids accepted.
        </div>
      )}

      <div className={styles.bidHistory}>
        <h3>Bid History</h3>
        {bids.length === 0 ? (
          <p className={styles.noBids}>No bids yet</p>
        ) : (
          <>
            <div className={styles.bidsList}>
              {visibleBids.map((bid) => (
                <div key={bid.id} className={styles.bidItem}>
                  <div className={styles.bidContent}>
                    <p className={styles.bidderName}>
                      {bid.bidderName}
                      {bid.isUserBid && ' (You)'}
                    </p>
                    <p className={styles.bidAmount}>{formatCurrency(bid.amountCents / 100)}</p>
                  </div>
                  <p className={styles.bidTime}>{formatRelativeTime(bid.placedAt)}</p>
                </div>
              ))}
            </div>

            {hasMoreBids && (
              <Button
                type="button"
                onClick={() => setShowAllBids(true)}
                variant="secondary"
                className={styles.showAllButton}
              >
                Show all {bids.length} bids
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
