export interface FuelRecord {
  readonly id: string;
  readonly motorcycleId: string;
  readonly fueledAt: string;
  readonly mileage: number;
  readonly liters: number;
  readonly totalCost: number;
  readonly fullTank: boolean;
  readonly station?: string;
  readonly notes?: string;
  readonly createdAt: string;
}

export interface NewFuelRecord extends Omit<FuelRecord, 'id' | 'motorcycleId' | 'createdAt'> {
  readonly confirmedHistoricalMileage?: boolean;
}

export interface FuelConsumptionEntry {
  readonly fuelRecordId: string;
  readonly previousFuelRecordId?: string;
  readonly distanceKm?: number;
  readonly intervalLiters?: number;
  readonly kmPerLiter?: number;
  readonly reason?: 'first-full-tank' | 'partial-tank' | 'invalid-odometer-sequence';
}

export interface FuelSummary {
  readonly totalLiters: number;
  readonly totalCost: number;
  readonly validIntervals: number;
  readonly averageKmPerLiter?: number;
  readonly latestKmPerLiter?: number;
}
