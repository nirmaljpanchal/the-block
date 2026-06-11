import { useEffect, useState } from 'react';
import type { Bid } from '../types/index';
import { vehicleService } from '../api/client';

export function useLiveBids(vehicleId: string) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [newBidIds, setNewBidIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeBids = async () => {
      try {
        const initialBids = await vehicleService.getBids(vehicleId);
        setBids(initialBids);

        unsubscribe = vehicleService.subscribeToBids(vehicleId, (newBid: Bid) => {
          setBids((prev) => {
            const bidIds = new Set(prev.map((b) => b.id));
            if (bidIds.has(newBid.id)) {
              return prev;
            }
            return [...prev, newBid];
          });
          setNewBidIds((prev) => new Set([...prev, newBid.id]));

          const timer = setTimeout(() => {
            setNewBidIds((prev) => {
              const next = new Set(prev);
              next.delete(newBid.id);
              return next;
            });
          }, 1000);

          return () => clearTimeout(timer);
        });
      } catch (error) {
        console.error('Failed to initialize bids:', error);
      }
    };

    initializeBids();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [vehicleId]);

  return { bids, newBidIds };
}
