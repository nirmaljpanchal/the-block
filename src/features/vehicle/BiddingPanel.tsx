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

  const highestBid = bids.length > 0 ? Math.max(...bids.map((b) => b.amount)) : vehicle.auction.startingBid;
  const minNextBid = getMinimumNextBid(highestBid, vehicle.auction.minIncrement);

  // Determine user's bid status
  useEffect(() => {
    const userBids = bids.filter((b) => b.isUserBid);
    if (userBids.length === 0) {
      setUserBidStatus(null);
      return;
    }

    const userHighestBid = Math.max(...userBids.map((b) => b.amount));
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

    const amount = parseMoneyInput(value);
    if (amount === null) {
      setValidationError('Invalid amount (digits and up to 2 decimals)');
      return;
    }

    if (auctionEnded) {
      setValidationError('Auction has ended');
      return;
    }

    if (amount < minNextBid) {
      setValidationError(`Minimum next bid is ${formatCurrency(minNextBid)}`);
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
    const amount = parseMoneyInput(bidInput);

    if (amount === null) {
      setValidationError('Invalid bid amount');
      return;
    }

    if (amount < minNextBid) {
      setValidationError(`Minimum next bid is ${formatCurrency(minNextBid)}`);
      return;
    }

    setBidLoading(true);

    const result = await vehicleService.placeBid({
      vehicleId: vehicle.id,
      amount: amount
    });

    setBidLoading(false);

    // Client validation is UX only; the service is authoritative
    if (!result.ok) {
      if (result.code === 'BELOW_MINIMUM') {
        // Race condition: outbid between render and submit — smooth recovery
        const currentHigh = result.currentHighBid || highestBid;
        const newMinNextBid = result.minimumNextBid || (currentHigh + vehicle.auction.minIncrement);
        setBidError(`You've been outbid — current high is ${formatCurrency(currentHigh)}. Minimum next bid is ${formatCurrency(newMinNextBid)}.`);
        // Prefill with new minimum
        setBidInput(newMinNextBid.toFixed(2));
        setValidationError('');
        // Announce to screen readers
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = `You've been outbid. Current high is ${formatCurrency(currentHigh)}. Minimum next bid is ${formatCurrency(newMinNextBid)}.`;
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
    const newAmount = minNextBid + (delta * vehicle.auction.minIncrement);
    setBidInput(newAmount.toFixed(2));
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
          <p className={styles.value}>{formatCurrency(highestBid)}</p>
        </div>
        <div className={styles.infoItem}>
          <p className={styles.label}>Total Bids</p>
          <p className={styles.value}>{bids.length}</p>
        </div>
        <div className={styles.infoItem}>
          <p className={styles.label}>Minimum Next Bid</p>
          <p className={styles.value}>{formatCurrency(minNextBid)}</p>
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
              +1 ({formatCurrency(vehicle.auction.minIncrement)})
            </Button>
            <Button
              type="button"
              onClick={() => handleQuickBid(2)}
              disabled={bidLoading || auctionEnded}
              className={styles.quickBidButton}
              variant="secondary"
            >
              +2 ({formatCurrency(vehicle.auction.minIncrement * 2)})
            </Button>
            <Button
              type="button"
              onClick={() => handleQuickBid(5)}
              disabled={bidLoading || auctionEnded}
              className={styles.quickBidButton}
              variant="secondary"
            >
              +5 ({formatCurrency(vehicle.auction.minIncrement * 5)})
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
                    <p className={styles.bidAmount}>{formatCurrency(bid.amount)}</p>
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
