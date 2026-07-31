import { MaintenancePlanItem } from './maintenance.model';
import { Motorcycle } from './motorcycle.model';
import { ServiceRecord } from './service-record.model';

export interface GarageSettings {
  readonly maintenanceAlertsEnabled: boolean;
}

export interface GarageState {
  readonly version: 1;
  readonly motorcycle: Motorcycle;
  readonly maintenancePlan: readonly MaintenancePlanItem[];
  readonly serviceHistory: readonly ServiceRecord[];
  readonly settings: GarageSettings;
}
