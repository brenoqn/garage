import { GarageState } from './garage-state.model';

export interface GarageBackup {
  readonly product: 'garage';
  readonly schemaVersion: 3;
  readonly exportedAt: string;
  readonly state: GarageState;
}

export interface GarageBackupSummary {
  readonly motorcycle: string;
  readonly year: number;
  readonly currentMileage: number;
  readonly serviceRecords: number;
  readonly odometerRecords: number;
  readonly maintenanceItems: number;
  readonly procedureExecutions: number;
}

export type GarageBackupParseResult =
  | {
      readonly ok: true;
      readonly backup: GarageBackup;
      readonly summary: GarageBackupSummary;
    }
  | {
      readonly ok: false;
      readonly error: string;
    };
