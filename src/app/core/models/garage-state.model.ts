import { ExpenseRecord } from './expense-record.model';
import { FuelRecord } from './fuel-record.model';
import { MaintenancePlanItem } from './maintenance.model';
import { Motorcycle } from './motorcycle.model';
import { OdometerRecord } from './odometer-record.model';
import { OccurrenceRecord } from './occurrence-record.model';
import { ProcedureExecution } from './procedure-execution.model';
import { ServiceRecord } from './service-record.model';
import { SafetyCheckRecord } from './safety-check.model';

export type GarageTheme = 'dark' | 'light' | 'system';

export interface GarageSettings {
  readonly maintenanceAlertsEnabled: boolean;
  readonly theme: GarageTheme;
}

export interface GarageSetup {
  readonly completed: boolean;
  readonly demoData: boolean;
}

export interface GarageState {
  readonly schemaVersion: 4;
  readonly motorcycle: Motorcycle;
  readonly maintenancePlan: readonly MaintenancePlanItem[];
  readonly serviceHistory: readonly ServiceRecord[];
  readonly odometerHistory: readonly OdometerRecord[];
  readonly procedureExecutions: readonly ProcedureExecution[];
  readonly fuelHistory: readonly FuelRecord[];
  readonly expenseHistory: readonly ExpenseRecord[];
  readonly occurrenceHistory: readonly OccurrenceRecord[];
  readonly safetyCheckHistory: readonly SafetyCheckRecord[];
  readonly settings: GarageSettings;
  readonly setup: GarageSetup;
}

export interface GarageStateRecovery {
  readonly kind: 'invalid-state' | 'future-version' | 'persistence-error';
  readonly message: string;
  readonly rawValue: string;
}
