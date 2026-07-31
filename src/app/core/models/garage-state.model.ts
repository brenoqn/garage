import { MaintenancePlanItem } from './maintenance.model';
import { Motorcycle } from './motorcycle.model';
import { OdometerRecord } from './odometer-record.model';
import { ServiceRecord } from './service-record.model';

export interface GarageSettings {
  readonly maintenanceAlertsEnabled: boolean;
}

export interface GarageSetup {
  readonly completed: boolean;
  readonly demoData: boolean;
}

export interface GarageState {
  readonly schemaVersion: 2;
  readonly motorcycle: Motorcycle;
  readonly maintenancePlan: readonly MaintenancePlanItem[];
  readonly serviceHistory: readonly ServiceRecord[];
  readonly odometerHistory: readonly OdometerRecord[];
  readonly settings: GarageSettings;
  readonly setup: GarageSetup;
}

export interface GarageStateRecovery {
  readonly kind: 'invalid-state' | 'future-version' | 'persistence-error';
  readonly message: string;
  readonly rawValue: string;
}
