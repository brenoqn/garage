import { TechnicalSource } from './technical-source.model';

export type MaintenanceStatus = 'ok' | 'upcoming' | 'due' | 'overdue' | 'unknown';

export type MaintenanceCategory =
  'engine' | 'transmission' | 'electrical' | 'controls' | 'brakes' | 'general';

export interface MaintenanceExecution {
  readonly date: string;
  readonly mileage: number;
  readonly serviceRecordId?: string;
}

export interface MaintenancePlanItem {
  readonly id: string;
  readonly title: string;
  readonly category: MaintenanceCategory;
  readonly procedureSlug?: string;
  readonly intervalKm?: number;
  readonly intervalDays?: number;
  readonly warningKm?: number;
  readonly warningDays?: number;
  readonly lastExecution?: MaintenanceExecution;
  readonly technicalSource: TechnicalSource;
}

export interface MaintenanceSchedule {
  readonly status: MaintenanceStatus;
  readonly nextMileage?: number;
  readonly nextDate?: string;
  readonly remainingKm?: number;
  readonly remainingDays?: number;
}

export interface MaintenanceAlert {
  readonly itemId: string;
  readonly title: string;
  readonly status: Extract<MaintenanceStatus, 'upcoming' | 'due' | 'overdue'>;
  readonly message: string;
}
