import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { vehicleService } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { ErrorState } from '../../components/ErrorState';
import { Badge } from '../../components/Badge';
import { sanitizeImageUrl } from '../../lib/urls';
import { formatOdometer } from '../../lib/formatters';
import { useLiveBids } from '../../hooks/useLiveBids';
import { BiddingPanel } from './BiddingPanel';
import styles from './VehicleDetailPage.module.css';

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: vehicle, isLoading, error, refetch } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehicleService.getVehicle(id || ''),
    enabled: !!id
  });

  const { bids } = useLiveBids(id || '');

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [now, setNow] = useState(0);
  const mainImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!vehicle || vehicle.photos.length === 0) return;
      if (e.key === 'ArrowLeft') {
        setCurrentPhotoIndex((prev) => (prev - 1 + vehicle.photos.length) % vehicle.photos.length);
      } else if (e.key === 'ArrowRight') {
        setCurrentPhotoIndex((prev) => (prev + 1) % vehicle.photos.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vehicle]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!vehicle || vehicle.photos.length === 0) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setCurrentPhotoIndex((prev) => (prev + 1) % vehicle.photos.length);
      } else {
        setCurrentPhotoIndex((prev) => (prev - 1 + vehicle.photos.length) % vehicle.photos.length);
      }
    }
  };


  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message="Failed to load vehicle details" onRetry={() => refetch()} />;
  }

  if (!vehicle) {
    return (
      <div className={styles.notFoundContainer}>
        <div className={styles.notFoundContent}>
          <h2>Vehicle not found</h2>
          <p>The vehicle you're looking for doesn't exist.</p>
          <Link to="/" className={styles.backLink}>
            Back to inventory
          </Link>
        </div>
      </div>
    );
  }

  const endsAtMs = new Date(vehicle.auction.endsAt).getTime();
  const auctionEnded = now >= endsAtMs;
  const timeRemaining = auctionEnded ? 0 : Math.max(0, endsAtMs - now);
  const timeRemainingSeconds = Math.floor(timeRemaining / 1000);
  const timeRemainingMinutes = Math.floor(timeRemainingSeconds / 60);
  const timeRemainingHours = Math.floor(timeRemainingMinutes / 60);
  const timeRemainingDays = Math.floor(timeRemainingHours / 24);
  let countdownText = 'Auction ended';
  if (!auctionEnded) {
    if (timeRemainingDays > 0) {
      countdownText = `${timeRemainingDays}d ${timeRemainingHours % 24}h remaining`;
    } else if (timeRemainingHours > 0) {
      countdownText = `${timeRemainingHours}h ${timeRemainingMinutes % 60}m remaining`;
    } else if (timeRemainingMinutes > 0) {
      countdownText = `${timeRemainingMinutes}m remaining`;
    } else {
      countdownText = `${timeRemainingSeconds}s remaining`;
    }
  }

  const currentPhoto = vehicle.photos[currentPhotoIndex];
  const sanitizedPhotoUrl = sanitizeImageUrl(currentPhoto);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.mainSection}>
          <div className={styles.gallery}>
            <div className={styles.mainImageContainer} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <img
                ref={mainImageRef}
                src={sanitizedPhotoUrl}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} — photo ${currentPhotoIndex + 1} of ${vehicle.photos.length}`}
                className={styles.mainImage}
              />
              <div className={styles.photoCounter}>
                {currentPhotoIndex + 1} / {vehicle.photos.length}
              </div>
            </div>

            {vehicle.photos.length > 1 && (
              <div className={styles.thumbnailStrip}>
                {vehicle.photos.map((photo, index) => (
                  <button
                    key={index}
                    className={`${styles.thumbnail} ${index === currentPhotoIndex ? styles.activeThumbnail : ''}`}
                    onClick={() => setCurrentPhotoIndex(index)}
                    aria-label={`View photo ${index + 1}`}
                  >
                    <img src={sanitizeImageUrl(photo)} alt={`Thumbnail ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.titleSection}>
            <h1>
              {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
            </h1>
            <Badge variant="default">{vehicle.conditionGrade}/5</Badge>
          </div>

          <div className={styles.specsSection}>
            <h2>Specifications</h2>
            <dl className={styles.specsList}>
              <div className={styles.specItem}>
                <dt>VIN</dt>
                <dd>{vehicle.vin}</dd>
              </div>
              <div className={styles.specItem}>
                <dt>Mileage</dt>
                <dd>{formatOdometer(vehicle.mileage)}</dd>
              </div>
              <div className={styles.specItem}>
                <dt>Transmission</dt>
                <dd>{vehicle.transmission}</dd>
              </div>
              <div className={styles.specItem}>
                <dt>Drivetrain</dt>
                <dd>{vehicle.drivetrain}</dd>
              </div>
              <div className={styles.specItem}>
                <dt>Fuel Type</dt>
                <dd>{vehicle.fuelType}</dd>
              </div>
              <div className={styles.specItem}>
                <dt>Body Style</dt>
                <dd>{vehicle.bodyStyle}</dd>
              </div>
              <div className={styles.specItem}>
                <dt>Color</dt>
                <dd>{vehicle.exteriorColor}</dd>
              </div>
              <div className={styles.specItem}>
                <dt>Condition</dt>
                <dd>Grade {vehicle.conditionGrade}/5</dd>
              </div>
            </dl>
          </div>

          <div className={styles.damageSection}>
            <h2>Damage Notes</h2>
            {vehicle.damageNotes.length === 0 ? (
              <p className={styles.noDamage}>No damage reported</p>
            ) : (
              <ul className={styles.damageList}>
                {vehicle.damageNotes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.dealershipSection}>
            <h2>Selling Dealership</h2>
            <div className={styles.dealershipInfo}>
              <p className={styles.dealerName}>{vehicle.dealership.name}</p>
              <p className={styles.dealerLocation}>
                {vehicle.dealership.city}, {vehicle.dealership.state}
              </p>
            </div>
          </div>
        </div>

        <aside className={styles.auctionPanel}>
          <div className={styles.countdownSection}>
            <div className={styles.countdown}>{countdownText}</div>
          </div>

          <BiddingPanel
            vehicle={vehicle}
            bids={bids}
            now={now}
            onBidPlaced={() => {
              // Refetch bids when a new bid is placed (react-query handles this via subscribeToBids)
            }}
          />
        </aside>
      </div>
    </div>
  );
}
