import type { GarageBackupSummary } from '../../../../shared/garage';
import { GarageState } from './garage-state.model';

export interface GarageBackup {
  readonly product: 'garage';
  readonly schemaVersion: 5;
  readonly exportedAt: string;
  readonly state: GarageState;
}

export type { GarageBackupSummary };

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
