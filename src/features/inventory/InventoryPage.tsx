import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '../../api/client';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { Badge } from '../../components/Badge';
import { formatCurrency, formatOdometer, getTimeRemaining } from '../../lib/formatters';
import { sanitizeImageUrl } from '../../lib/urls';
import type { Vehicle, VehicleFilters } from '../../types/index';
import styles from './InventoryPage.module.css';

interface VehicleCardProps {
  vehicle: Vehicle;
  countdownUpdateKey: number;
}

function VehicleCard({ vehicle, countdownUpdateKey }: VehicleCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (vehicle.auction.status === 'live') {
      const endsAtMs = new Date(vehicle.auction.endsAt).getTime();
      setTimeRemaining(getTimeRemaining(endsAtMs));
    } else if (vehicle.auction.status === 'upcoming') {
      const startsAtMs = new Date(vehicle.auction.startsAt).getTime();
      const now = Date.now();
      const diffMs = startsAtMs - now;

      if (diffMs <= 0) {
        setTimeRemaining('Starting now');
      } else {
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) setTimeRemaining(`Starts in ${diffDays}d ${diffHours % 24}h`);
        else if (diffHours > 0) setTimeRemaining(`Starts in ${diffHours}h ${diffMinutes % 60}m`);
        else if (diffMinutes > 0) setTimeRemaining(`Starts in ${diffMinutes}m`);
        else setTimeRemaining(`Starts in ${diffSeconds}s`);
      }
    } else {
      setTimeRemaining('Auction ended');
    }
  }, [vehicle.auction.status, vehicle.auction.startsAt, vehicle.auction.endsAt, countdownUpdateKey]);

  const getConditionGradeColor = (grade: number): 'default' | 'success' | 'warning' | 'error' => {
    if (grade === 5) return 'success';
    if (grade === 4) return 'success';
    if (grade === 3) return 'warning';
    return 'error';
  };

  const currentHighBidCents = 0;
  const displayBidDollars = currentHighBidCents > 0
    ? currentHighBidCents / 100
    : vehicle.auction.startingBidCents / 100;

  return (
    <a href={`/vehicles/${vehicle.id}`} className={styles.vehicleCard}>
      <div className={styles.imageWrapper}>
        <img
          src={sanitizeImageUrl(vehicle.photos[0])}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          className={styles.image}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            img.src = sanitizeImageUrl(null);
          }}
        />
      </div>

      <div className={styles.cardContent}>
        <h3 className={styles.title}>
          {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
        </h3>

        <div className={styles.details}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Mileage:</span>
            <span>{formatOdometer(vehicle.mileage)}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Condition:</span>
            <Badge variant={getConditionGradeColor(vehicle.conditionGrade)}>
              Grade {vehicle.conditionGrade}
            </Badge>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Location:</span>
            <span>{vehicle.dealership.city}, {vehicle.dealership.state}</span>
          </div>
        </div>

        <div className={styles.bidSection}>
          <div className={styles.bidAmount}>{formatCurrency(displayBidDollars)}</div>
          <span className={styles.bidLabel}>
            {currentHighBidCents > 0 ? 'Current bid' : 'Starting bid'}
          </span>
        </div>

        <div className={`${styles.auctionStatus} ${styles[`status-${vehicle.auction.status}`]}`}>
          {vehicle.auction.status === 'live' && (
            <>
              <span className={styles.statusBadge}>LIVE</span>
              <span className={styles.countdown}>{timeRemaining}</span>
            </>
          )}
          {vehicle.auction.status === 'upcoming' && (
            <span>{timeRemaining}</span>
          )}
          {vehicle.auction.status === 'ended' && (
            <span>Auction ended</span>
          )}
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonLine} style={{ width: '80%' }} />
        <div className={styles.skeletonLine} style={{ width: '60%' }} />
        <div className={styles.skeletonLine} style={{ width: '70%' }} />
      </div>
    </div>
  );
}

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedMake, setSelectedMake] = useState(searchParams.get('make') || '');
  const [selectedBodyStyle, setSelectedBodyStyle] = useState(searchParams.get('bodyStyle') || '');
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState<'endingSoon' | 'priceAsc' | 'priceDesc' | 'mileageAsc'>(
    (searchParams.get('sort') as any) || 'endingSoon'
  );
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [countdownUpdate, setCountdownUpdate] = useState(0);
  const queryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ITEMS_PER_PAGE = 12;

  const filters: VehicleFilters = {
    query: query.trim() || undefined,
    make: selectedMake || undefined,
    bodyStyle: (selectedBodyStyle as any) || undefined,
    auctionStatus: (selectedStatus as any) || undefined,
    sort: sortBy,
  };

  const { data: vehicles, isLoading, error, refetch } = useQuery({
    queryKey: ['vehicles', filters],
    queryFn: () => vehicleService.getVehicles(filters),
  });

  const allVehicles = useQuery({
    queryKey: ['allVehicles'],
    queryFn: () => vehicleService.getVehicles({}),
  });

  const makes = Array.from(new Set(allVehicles.data?.map((v) => v.make) || [])).sort();
  const bodyStyles = Array.from(new Set(allVehicles.data?.map((v) => v.bodyStyle) || [])).sort();

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedMake) params.set('make', selectedMake);
    if (selectedBodyStyle) params.set('bodyStyle', selectedBodyStyle);
    if (selectedStatus) params.set('status', selectedStatus);
    if (sortBy !== 'endingSoon') params.set('sort', sortBy);
    if (currentPage > 1) params.set('page', currentPage.toString());

    setSearchParams(params);
  }, [query, selectedMake, selectedBodyStyle, selectedStatus, sortBy, currentPage, setSearchParams]);

  useEffect(() => {
    if (queryTimeoutRef.current) clearTimeout(queryTimeoutRef.current);
    queryTimeoutRef.current = setTimeout(() => {
      // Reset to page 1 when filters change
      setCurrentPage(1);
    }, 250);

    return () => {
      if (queryTimeoutRef.current) clearTimeout(queryTimeoutRef.current);
    };
  }, [query]);

  useEffect(() => {
    // Reset to page 1 when other filters change
    setCurrentPage(1);
  }, [selectedMake, selectedBodyStyle, selectedStatus, sortBy]);

  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      setCountdownUpdate((prev) => prev + 1);
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleClearFilters = (): void => {
    setQuery('');
    setSelectedMake('');
    setSelectedBodyStyle('');
    setSelectedStatus('');
    setSortBy('endingSoon');
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    let value = e.target.value;

    if (value.length > 100) {
      value = value.slice(0, 100);
    }

    value = value.replace(/[\x00-\x1F\x7F]/g, '');

    setQuery(value);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search vehicles..."
            disabled
            className={styles.searchInput}
          />
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.grid}>
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search vehicles..."
            value={query}
            onChange={handleSearchChange}
            className={styles.searchInput}
            aria-label="Search vehicles"
          />
        </div>
        <ErrorState message="Failed to load vehicles" onRetry={() => refetch()} />
      </div>
    );
  }

  const hasActiveFilters = query || selectedMake || selectedBodyStyle || selectedStatus;

  const totalPages = vehicles ? Math.ceil(vehicles.length / ITEMS_PER_PAGE) : 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedVehicles = vehicles ? vehicles.slice(startIndex, endIndex) : [];

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search vehicles..."
            value={query}
            onChange={handleSearchChange}
            className={styles.searchInput}
            aria-label="Search vehicles"
          />
          <div className={styles.filters}>
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              className={styles.filterSelect}
              aria-label="Filter by make"
            >
              <option value="">All Makes</option>
              {makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>

            <select
              value={selectedBodyStyle}
              onChange={(e) => setSelectedBodyStyle(e.target.value)}
              className={styles.filterSelect}
              aria-label="Filter by body style"
            >
              <option value="">All Body Styles</option>
              {bodyStyles.map((style) => (
                <option key={style} value={style}>
                  {style.charAt(0).toUpperCase() + style.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={styles.filterSelect}
              aria-label="Filter by auction status"
            >
              <option value="">All Statuses</option>
              <option value="live">Live</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={styles.filterSelect}
              aria-label="Sort by"
            >
              <option value="endingSoon">Ending Soon</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="mileageAsc">Mileage: Low to High</option>
            </select>
          </div>
        </div>

        {hasActiveFilters ? (
          <EmptyState
            title="No vehicles found"
            message="Try adjusting your filters"
            icon="🔍"
          />
        ) : (
          <EmptyState
            title="No vehicles available"
            message="Check back soon for new inventory"
            icon="📭"
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search vehicles by year, make, model, trim, or VIN..."
          value={query}
          onChange={handleSearchChange}
          className={styles.searchInput}
          aria-label="Search vehicles"
          maxLength={100}
        />
        <div className={styles.filters}>
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter by make"
          >
            <option value="">All Makes</option>
            {makes.map((make) => (
              <option key={make} value={make}>
                {make}
              </option>
            ))}
          </select>

          <select
            value={selectedBodyStyle}
            onChange={(e) => setSelectedBodyStyle(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter by body style"
          >
            <option value="">All Body Styles</option>
            {bodyStyles.map((style) => (
              <option key={style} value={style}>
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={styles.filterSelect}
            aria-label="Filter by auction status"
          >
            <option value="">All Statuses</option>
            <option value="live">Live</option>
            <option value="upcoming">Upcoming</option>
            <option value="ended">Ended</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={styles.filterSelect}
            aria-label="Sort by"
          >
            <option value="endingSoon">Ending Soon</option>
            <option value="priceAsc">Price: Low to High</option>
            <option value="priceDesc">Price: High to Low</option>
            <option value="mileageAsc">Mileage: Low to High</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <button onClick={handleClearFilters} className={styles.clearButton}>
          Clear filters
        </button>
      )}

      <div className={styles.grid}>
        {paginatedVehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} countdownUpdateKey={countdownUpdate} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={styles.paginationButton}
            aria-label="Previous page"
          >
            ← Previous
          </button>

          <div className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={styles.paginationButton}
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
