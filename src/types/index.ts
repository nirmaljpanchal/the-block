export interface Dealership {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface VehicleService {
  getVehicles(filters: VehicleFilters): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | null>;
  getBids(vehicleId: string): Promise<Bid[]>;
  placeBid(input: PlaceBidInput): Promise<PlaceBidResult>;
  subscribeToBids(vehicleId: string, cb: (bid: Bid) => void): () => void;
}

export interface AuctionDetails {
  startsAt: string; // ISO 8601 string
  endsAt: string; // ISO 8601 string
  startingBidCents: number;
  minIncrementCents: number;
  status: 'upcoming' | 'live' | 'ended';
}

export interface Vehicle {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number; // kilometers, integer
  exteriorColor: string;
  bodyStyle: 'sedan' | 'suv' | 'truck' | 'coupe' | 'van';
  transmission: string;
  drivetrain: string;
  fuelType: string;
  conditionGrade: number; // 1-5
  damageNotes: string[];
  photos: string[];
  dealership: Dealership;
  auction: AuctionDetails;
}

export interface Bid {
  id: string;
  vehicleId: string;
  amountCents: number;
  bidderName: string;
  placedAt: string; // ISO 8601 string
  isUserBid: boolean;
}

export interface VehicleFilters {
  query?: string;
  make?: string;
  bodyStyle?: string;
  maxMileage?: number;
  auctionStatus?: 'live' | 'upcoming' | 'ended';
  sort?: 'endingSoon' | 'priceAsc' | 'priceDesc' | 'mileageAsc';
}

export interface PlaceBidInput {
  vehicleId: string;
  amountCents: number;
}

export type PlaceBidResult =
  | {
      ok: true;
      bid: Bid;
      newHighBidCents: number;
    }
  | {
      ok: false;
      code: 'AUCTION_ENDED' | 'AUCTION_NOT_STARTED' | 'BELOW_MINIMUM' | 'INVALID_AMOUNT' | 'NOT_FOUND';
      message: string;
      currentHighBidCents?: number;
      minimumNextBidCents?: number;
    };
