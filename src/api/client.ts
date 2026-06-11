import type { Vehicle, Bid, VehicleFilters, PlaceBidInput, PlaceBidResult } from '../types/index';
import { mockVehicleClient } from './mockClient';

/**
 * VehicleService defines the single data access interface.
 * All UI components access data only through this service.
 */
export interface VehicleService {
  getVehicles(filters: VehicleFilters): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | null>;
  getBids(vehicleId: string): Promise<Bid[]>;
  placeBid(input: PlaceBidInput): Promise<PlaceBidResult>;
  subscribeToBids(vehicleId: string, cb: (bid: Bid) => void): () => void;
}

export const vehicleService: VehicleService = mockVehicleClient;
