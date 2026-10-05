/** Contratos de dados do Garage. Este módulo não depende de Angular nem de Node. */
export type GarageTheme = 'dark' | 'light' | 'system';
export interface GarageSettings {
  readonly maintenanceAlertsEnabled: boolean;
  readonly theme: GarageTheme;
}
export interface GarageSetup {
  readonly completed: boolean;
  readonly demoData: boolean;
}
export interface Motorcycle {
  readonly id: string;
  readonly manufacturer: 'Honda';
  readonly model: 'NX200';
  readonly nickname: string;
  readonly year: number;
  readonly currentMileage: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface TechnicalSource {
  readonly status: 'confirmed' | 'needs-confirmation';
  readonly label: string;
  readonly reference?: string;
  readonly claimIds?: readonly string[];
}
export type MaintenanceCategory =
  'engine' | 'transmission' | 'electrical' | 'controls' | 'brakes' | 'general';
export type MaintenanceStatus = 'ok' | 'upcoming' | 'due' | 'overdue' | 'unknown';
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
  readonly reason: string;
  readonly message: string;
  readonly nextDate?: string;
  readonly nextMileage?: number;
  readonly remainingDays?: number;
  readonly remainingKm?: number;
  readonly actionLabel: string;
}
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
export interface ServicePart {
  readonly name: string;
  readonly quantity?: number;
}
export interface ServiceRecord {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly mileage: number;
  readonly procedureSlug?: string;
  readonly procedureExecutionId?: string;
  readonly maintenancePlanId?: string;
  readonly cost?: number;
  readonly parts: readonly ServicePart[];
  readonly notes?: string;
  readonly createdAt: string;
  readonly isDemo?: boolean;
}
export type NewServiceRecord = Omit<ServiceRecord, 'id' | 'createdAt'>;
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
export interface NewFuelRecord extends Omit<FuelRecord, 'id' | 'motorcycleId' | 'createdAt'> {
  readonly confirmedHistoricalMileage?: boolean;
}
export type ExpenseCategory = 'parts' | 'document' | 'parking' | 'accessory' | 'other';
export interface ExpenseRecord {
  readonly id: string;
  readonly motorcycleId: string;
  readonly date: string;
  readonly title: string;
  readonly category: ExpenseCategory;
  readonly amount: number;
  readonly mileage?: number;
  readonly notes?: string;
  readonly createdAt: string;
}
export type NewExpenseRecord = Omit<ExpenseRecord, 'id' | 'motorcycleId' | 'createdAt'>;
export type OccurrenceSeverity = 'note' | 'attention' | 'stop';
export interface OccurrenceRecord {
  readonly id: string;
  readonly motorcycleId: string;
  readonly occurredAt: string;
  readonly mileage: number;
  readonly title: string;
  readonly severity: OccurrenceSeverity;
  readonly notes?: string;
  readonly createdAt: string;
}
export type NewOccurrenceRecord = Omit<OccurrenceRecord, 'id' | 'motorcycleId' | 'createdAt'>;
export type ProcedureExecutionStatus = 'in-progress' | 'completed' | 'cancelled';
export interface ProcedureExecution {
  readonly id: string;
  readonly motorcycleId: string;
  readonly procedureSlug: string;
  readonly status: ProcedureExecutionStatus;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
  readonly completedStepIds: readonly string[];
  readonly completedFinalCheckIds: readonly string[];
  readonly acknowledgedWarningIds: readonly string[];
  readonly currentStepId?: string;
  readonly note?: string;
  readonly resultingServiceRecordId?: string;
}
export interface ProcedureProgress {
  readonly completedRequiredSteps: number;
  readonly totalRequiredSteps: number;
  readonly completedOptionalSteps: number;
  readonly totalOptionalSteps: number;
  readonly percent: number;
}
export type SafetyCheckItemStatus = 'ok' | 'issue';
export interface SafetyCheckItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly sourceId: string;
  readonly page: number;
  readonly section: string;
}
export interface SafetyCheckResponse {
  readonly itemId: string;
  readonly status: SafetyCheckItemStatus;
}
export interface SafetyCheckRecord {
  readonly id: string;
  readonly motorcycleId: string;
  readonly checkedAt: string;
  readonly responses: readonly SafetyCheckResponse[];
  readonly notes?: string;
  readonly createdAt: string;
}
export type NewSafetyCheckRecord = Omit<SafetyCheckRecord, 'id' | 'motorcycleId' | 'createdAt'>;
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
export type GarageErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'NOT_CONFIGURED'
  | 'REVISION_CONFLICT'
  | 'IDEMPOTENCY_CONFLICT'
  | 'CATALOG_CONFLICT'
  | 'PERSISTENCE_UNAVAILABLE';
export interface GarageSnapshot {
  readonly revision: string;
  readonly catalogVersion: string;
  readonly status: 'not-configured' | 'configured-empty' | 'configured-with-history';
  readonly settings?: GarageSettings;
  readonly state?: GarageState;
}
export interface WriteCommand<T> {
  readonly expectedRevision: string;
  readonly payload: T;
}
export interface WriteResult<T> {
  readonly revision: string;
  readonly result: T;
}
