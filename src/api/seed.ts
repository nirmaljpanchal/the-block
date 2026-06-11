import type { Vehicle } from '../types/index';
import rawVehicles from '../../data/vehicles.json';

function normalizeBodyStyle(style: string): 'sedan' | 'suv' | 'truck' | 'coupe' | 'van' {
  const normalized = style.toLowerCase();
  if (normalized === 'suv') return 'suv';
  if (normalized === 'truck') return 'truck';
  if (normalized === 'coupe') return 'coupe';
  if (normalized === 'van') return 'van';
  if (normalized === 'hatchback') return 'sedan'; // hatchbacks treated as sedan
  return 'sedan'; // default
}

function getProvinceState(province: string): string {
  const provinceMap: Record<string, string> = {
    'Ontario': 'ON',
    'British Columbia': 'BC',
    'Alberta': 'AB',
    'Manitoba': 'MB',
    'Quebec': 'QC',
    'Saskatchewan': 'SK',
    'Nova Scotia': 'NS',
    'New Brunswick': 'NB',
    'Prince Edward Island': 'PE',
    'Newfoundland and Labrador': 'NL',
  };
  return provinceMap[province] || province;
}

export const SEED_VEHICLES: Vehicle[] = rawVehicles.map((v: any) => {
  const startTime = new Date(v.auction_start).getTime();
  const endTime = new Date().getDate() + 2; // 48 hours after start

  return {
    id: v.id,
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    mileage: v.odometer_km,
    exteriorColor: v.exterior_color,
    bodyStyle: normalizeBodyStyle(v.body_style),
    transmission: v.transmission.charAt(0).toUpperCase() + v.transmission.slice(1),
    drivetrain: v.drivetrain.toUpperCase(),
    fuelType: v.fuel_type.charAt(0).toUpperCase() + v.fuel_type.slice(1),
    conditionGrade: Math.round(v.condition_grade),
    damageNotes: v.damage_notes || [],
    photos: v.images || [],
    dealership: {
      id: v.selling_dealership.toLowerCase().replace(/\s+/g, '-'),
      name: v.selling_dealership,
      city: v.city,
      state: getProvinceState(v.province),
    },
    auction: {
      startsAt: new Date(startTime).toISOString(),
      endsAt: new Date(endTime).toISOString(),
      startingBidCents: Math.round(v.starting_bid * 100),
      minIncrementCents: Math.round((v.starting_bid * 0.05) * 100),
      status: 'upcoming',
    },
  };
}) as Vehicle[];
