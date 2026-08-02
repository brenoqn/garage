export type OdometerRecordSource =
  | 'setup'
  | 'dashboard'
  | 'motorcycle'
  | 'service'
  | 'fuel'
  | 'correction'
  | 'panel-replacement'
  | 'migration';

export interface OdometerRecord {
  readonly id: string;
  readonly motorcycleId: string;
  readonly mileage: number;
  readonly recordedAt: string;
  readonly source: OdometerRecordSource;
  readonly note?: string;
  readonly serviceRecordId?: string;
  readonly fuelRecordId?: string;
}

export interface OdometerUpdateRequest {
  readonly mileage: number;
  readonly source: OdometerRecordSource;
  readonly note?: string;
  readonly confirmedRegression?: boolean;
  readonly recordedAt?: string;
}

export interface OdometerUpdateResult {
  readonly status: 'updated' | 'confirmation-required' | 'blocked';
  readonly previousMileage: number;
  readonly requestedMileage: number;
  readonly impact?: string;
}
