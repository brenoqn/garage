import { GarageSettings, GarageSetup, GarageState } from '../models/garage-state.model';
import { ExpenseRecord } from '../models/expense-record.model';
import { FuelRecord } from '../models/fuel-record.model';
import { MaintenancePlanItem } from '../models/maintenance.model';
import { Motorcycle } from '../models/motorcycle.model';
import { OdometerRecord } from '../models/odometer-record.model';
import { OccurrenceRecord } from '../models/occurrence-record.model';
import { Procedure } from '../models/procedure.model';
import { ProcedureExecution } from '../models/procedure-execution.model';
import { ServiceRecord } from '../models/service-record.model';
import { SafetyCheckRecord } from '../models/safety-check.model';

interface GarageSettingsV3 {
  readonly maintenanceAlertsEnabled: boolean;
}

interface GarageStateV1 {
  readonly version: 1;
  readonly motorcycle: Motorcycle;
  readonly maintenancePlan: readonly MaintenancePlanItem[];
  readonly serviceHistory: readonly ServiceRecord[];
  readonly settings: GarageSettingsV3;
}

export interface GarageStateV2 {
  readonly schemaVersion: 2;
  readonly motorcycle: Motorcycle;
  readonly maintenancePlan: readonly MaintenancePlanItem[];
  readonly serviceHistory: readonly ServiceRecord[];
  readonly odometerHistory: readonly OdometerRecord[];
  readonly settings: GarageSettingsV3;
  readonly setup: GarageSetup;
}

export interface GarageStateV3 {
  readonly schemaVersion: 3;
  readonly motorcycle: Motorcycle;
  readonly maintenancePlan: readonly MaintenancePlanItem[];
  readonly serviceHistory: readonly ServiceRecord[];
  readonly odometerHistory: readonly OdometerRecord[];
  readonly procedureExecutions: readonly ProcedureExecution[];
  readonly settings: GarageSettingsV3;
  readonly setup: GarageSetup;
}

export type GarageStateValidation =
  | { readonly valid: true; readonly state: GarageState }
  | { readonly valid: false; readonly error: string };

export type GarageStateV2Validation =
  | { readonly valid: true; readonly state: GarageStateV2 }
  | { readonly valid: false; readonly error: string };

export type GarageStateV3Validation =
  | { readonly valid: true; readonly state: GarageStateV3 }
  | { readonly valid: false; readonly error: string };

export type StoredGarageStateResult =
  | { readonly kind: 'empty' | 'current' | 'migrated'; readonly state: GarageState }
  | {
      readonly kind: 'invalid-state' | 'future-version';
      readonly state: GarageState;
      readonly rawValue: string;
      readonly message: string;
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

function isOptionalNonNegativeNumber(value: unknown): value is number | undefined {
  return value === undefined || isNonNegativeNumber(value);
}

function isOptionalNonNegativeInteger(value: unknown): value is number | undefined {
  return value === undefined || isNonNegativeInteger(value);
}

function isOptionalPositiveInteger(value: unknown): value is number | undefined {
  return value === undefined || (isNonNegativeInteger(value) && value > 0);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value));
}

function isTechnicalSource(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value['status'] === 'confirmed' || value['status'] === 'needs-confirmation') &&
    isNonEmptyString(value['label']) &&
    isOptionalString(value['reference']) &&
    (value['claimIds'] === undefined || isStringArray(value['claimIds']))
  );
}

function isMotorcycle(value: unknown): value is Motorcycle {
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    value['manufacturer'] === 'Honda' &&
    value['model'] === 'NX200' &&
    typeof value['nickname'] === 'string' &&
    isNonNegativeInteger(value['year']) &&
    isNonNegativeInteger(value['currentMileage']) &&
    isIsoTimestamp(value['createdAt']) &&
    isIsoTimestamp(value['updatedAt'])
  );
}

function isMaintenanceExecution(value: unknown): boolean {
  return (
    isRecord(value) &&
    isIsoDate(value['date']) &&
    isNonNegativeInteger(value['mileage']) &&
    isOptionalString(value['serviceRecordId'])
  );
}

function isMaintenancePlanItem(value: unknown): value is MaintenancePlanItem {
  const categories = ['engine', 'transmission', 'electrical', 'controls', 'brakes', 'general'];
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['title']) &&
    typeof value['category'] === 'string' &&
    categories.includes(value['category']) &&
    isOptionalString(value['procedureSlug']) &&
    isOptionalPositiveInteger(value['intervalKm']) &&
    isOptionalPositiveInteger(value['intervalDays']) &&
    isOptionalNonNegativeInteger(value['warningKm']) &&
    isOptionalNonNegativeInteger(value['warningDays']) &&
    (value['lastExecution'] === undefined || isMaintenanceExecution(value['lastExecution'])) &&
    isTechnicalSource(value['technicalSource'])
  );
}

function isServicePart(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value['name']) &&
    isOptionalNonNegativeInteger(value['quantity'])
  );
}

function isServiceRecord(value: unknown): value is ServiceRecord {
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['title']) &&
    isIsoDate(value['date']) &&
    isNonNegativeInteger(value['mileage']) &&
    isOptionalString(value['procedureSlug']) &&
    isOptionalString(value['procedureExecutionId']) &&
    isOptionalString(value['maintenancePlanId']) &&
    isOptionalNonNegativeNumber(value['cost']) &&
    Array.isArray(value['parts']) &&
    value['parts'].every(isServicePart) &&
    isOptionalString(value['notes']) &&
    isIsoTimestamp(value['createdAt']) &&
    (value['isDemo'] === undefined || typeof value['isDemo'] === 'boolean')
  );
}

function isOdometerRecord(value: unknown): value is OdometerRecord {
  const sources = [
    'setup',
    'dashboard',
    'motorcycle',
    'service',
    'fuel',
    'correction',
    'panel-replacement',
    'migration',
  ];
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['motorcycleId']) &&
    isNonNegativeInteger(value['mileage']) &&
    isIsoTimestamp(value['recordedAt']) &&
    typeof value['source'] === 'string' &&
    sources.includes(value['source']) &&
    isOptionalString(value['note']) &&
    isOptionalString(value['serviceRecordId']) &&
    isOptionalString(value['fuelRecordId'])
  );
}

function isFuelRecord(value: unknown): value is FuelRecord {
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['motorcycleId']) &&
    isIsoTimestamp(value['fueledAt']) &&
    isNonNegativeInteger(value['mileage']) &&
    typeof value['liters'] === 'number' &&
    Number.isFinite(value['liters']) &&
    value['liters'] > 0 &&
    isNonNegativeNumber(value['totalCost']) &&
    typeof value['fullTank'] === 'boolean' &&
    isOptionalString(value['station']) &&
    isOptionalString(value['notes']) &&
    isIsoTimestamp(value['createdAt'])
  );
}

function isExpenseRecord(value: unknown): value is ExpenseRecord {
  const categories = ['parts', 'document', 'parking', 'accessory', 'other'];
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['motorcycleId']) &&
    isIsoDate(value['date']) &&
    isNonEmptyString(value['title']) &&
    typeof value['category'] === 'string' &&
    categories.includes(value['category']) &&
    isNonNegativeNumber(value['amount']) &&
    isOptionalNonNegativeInteger(value['mileage']) &&
    isOptionalString(value['notes']) &&
    isIsoTimestamp(value['createdAt'])
  );
}

function isOccurrenceRecord(value: unknown): value is OccurrenceRecord {
  const severities = ['note', 'attention', 'stop'];
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['motorcycleId']) &&
    isIsoTimestamp(value['occurredAt']) &&
    isNonNegativeInteger(value['mileage']) &&
    isNonEmptyString(value['title']) &&
    typeof value['severity'] === 'string' &&
    severities.includes(value['severity']) &&
    isOptionalString(value['notes']) &&
    isIsoTimestamp(value['createdAt'])
  );
}

function isSafetyCheckRecord(value: unknown): value is SafetyCheckRecord {
  return (
    isRecord(value) &&
    isNonEmptyString(value['id']) &&
    isNonEmptyString(value['motorcycleId']) &&
    isIsoTimestamp(value['checkedAt']) &&
    Array.isArray(value['responses']) &&
    value['responses'].every(
      (response) =>
        isRecord(response) &&
        isNonEmptyString(response['itemId']) &&
        (response['status'] === 'ok' || response['status'] === 'issue'),
    ) &&
    isOptionalString(value['notes']) &&
    isIsoTimestamp(value['createdAt'])
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isProcedureExecution(value: unknown): value is ProcedureExecution {
  if (!isRecord(value)) {
    return false;
  }
  const status = value['status'];
  const validStatus = status === 'in-progress' || status === 'completed' || status === 'cancelled';
  if (
    !isNonEmptyString(value['id']) ||
    !isNonEmptyString(value['motorcycleId']) ||
    !isNonEmptyString(value['procedureSlug']) ||
    !validStatus ||
    !isIsoTimestamp(value['startedAt']) ||
    !isIsoTimestamp(value['updatedAt']) ||
    !isStringArray(value['completedStepIds']) ||
    !isStringArray(value['completedFinalCheckIds']) ||
    !isStringArray(value['acknowledgedWarningIds']) ||
    !isOptionalString(value['currentStepId']) ||
    !isOptionalString(value['note']) ||
    !isOptionalString(value['resultingServiceRecordId'])
  ) {
    return false;
  }
  if (status === 'completed') {
    return (
      isIsoTimestamp(value['completedAt']) &&
      value['cancelledAt'] === undefined &&
      value['currentStepId'] === undefined
    );
  }
  if (status === 'cancelled') {
    return (
      isIsoTimestamp(value['cancelledAt']) &&
      value['completedAt'] === undefined &&
      value['currentStepId'] === undefined
    );
  }
  return value['completedAt'] === undefined && value['cancelledAt'] === undefined;
}

function isSettingsV3(value: unknown): value is GarageSettingsV3 {
  return isRecord(value) && typeof value['maintenanceAlertsEnabled'] === 'boolean';
}

function isSettings(value: unknown): value is GarageSettings {
  const candidate = value as UnknownRecord;
  return (
    isSettingsV3(value) &&
    (candidate['theme'] === 'dark' ||
      candidate['theme'] === 'light' ||
      candidate['theme'] === 'system')
  );
}

function isSetup(value: unknown): value is GarageSetup {
  return (
    isRecord(value) &&
    typeof value['completed'] === 'boolean' &&
    typeof value['demoData'] === 'boolean'
  );
}

function hasUniqueIds(values: readonly { readonly id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size === values.length;
}

function hasUniqueStrings(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function validateBaseFields(
  value: UnknownRecord,
  includeV2Fields: boolean,
  includeTheme: boolean,
): string | null {
  if (!isMotorcycle(value['motorcycle'])) return 'Os dados da motocicleta são inválidos.';
  if (
    !Array.isArray(value['maintenancePlan']) ||
    !value['maintenancePlan'].every(isMaintenancePlanItem)
  ) {
    return 'O plano de manutenção é inválido.';
  }
  if (!Array.isArray(value['serviceHistory']) || !value['serviceHistory'].every(isServiceRecord)) {
    return 'O histórico de serviços é inválido.';
  }
  if (!(includeTheme ? isSettings(value['settings']) : isSettingsV3(value['settings']))) {
    return 'As configurações são inválidas.';
  }

  const maintenancePlan = value['maintenancePlan'] as readonly MaintenancePlanItem[];
  const serviceHistory = value['serviceHistory'] as readonly ServiceRecord[];
  if (!hasUniqueIds(maintenancePlan)) return 'O plano contém identificadores duplicados.';
  if (!hasUniqueIds(serviceHistory))
    return 'O histórico de serviços contém identificadores duplicados.';
  const planIds = new Set(maintenancePlan.map((item) => item.id));
  const serviceIds = new Set(serviceHistory.map((record) => record.id));
  if (
    serviceHistory.some(
      (record) => record.maintenancePlanId && !planIds.has(record.maintenancePlanId),
    )
  ) {
    return 'Um serviço aponta para um item de manutenção inexistente.';
  }
  if (
    maintenancePlan.some(
      (item) =>
        item.lastExecution?.serviceRecordId && !serviceIds.has(item.lastExecution.serviceRecordId),
    )
  ) {
    return 'Uma execução do plano aponta para um serviço inexistente.';
  }

  if (includeV2Fields) {
    if (
      !Array.isArray(value['odometerHistory']) ||
      !value['odometerHistory'].every(isOdometerRecord)
    ) {
      return 'O histórico do odômetro é inválido.';
    }
    if (!isSetup(value['setup'])) return 'A configuração inicial é inválida.';
    const motorcycle = value['motorcycle'] as Motorcycle;
    const odometerHistory = value['odometerHistory'] as readonly OdometerRecord[];
    if (!hasUniqueIds(odometerHistory))
      return 'O histórico do odômetro contém identificadores duplicados.';
    if (odometerHistory.some((record) => record.motorcycleId !== motorcycle.id)) {
      return 'O histórico do odômetro aponta para outra motocicleta.';
    }
    if (
      odometerHistory.some(
        (record) => record.serviceRecordId && !serviceIds.has(record.serviceRecordId),
      )
    ) {
      return 'Uma leitura do odômetro aponta para um serviço inexistente.';
    }
  }
  return null;
}

function validateExecutionReferences(
  value: UnknownRecord,
  procedures: readonly Procedure[],
): string | null {
  if (
    !Array.isArray(value['procedureExecutions']) ||
    !value['procedureExecutions'].every(isProcedureExecution)
  ) {
    return 'O histórico de procedimentos é inválido.';
  }
  const executions = value['procedureExecutions'] as readonly ProcedureExecution[];
  const services = value['serviceHistory'] as readonly ServiceRecord[];
  const motorcycle = value['motorcycle'] as Motorcycle;
  if (!hasUniqueIds(executions))
    return 'O histórico de procedimentos contém identificadores duplicados.';
  if (executions.some((execution) => execution.motorcycleId !== motorcycle.id)) {
    return 'Uma execução de procedimento aponta para outra motocicleta.';
  }
  if (
    executions.some(
      (execution) =>
        !hasUniqueStrings(execution.completedStepIds) ||
        !hasUniqueStrings(execution.completedFinalCheckIds) ||
        !hasUniqueStrings(execution.acknowledgedWarningIds),
    )
  ) {
    return 'Uma execução de procedimento contém identificadores repetidos.';
  }
  const activeKeys = executions
    .filter((execution) => execution.status === 'in-progress')
    .map((execution) => `${execution.motorcycleId}:${execution.procedureSlug}`);
  if (!hasUniqueStrings(activeKeys))
    return 'Existe mais de uma execução ativa para o mesmo procedimento.';

  const serviceById = new Map(services.map((service) => [service.id, service]));
  const executionById = new Map(executions.map((execution) => [execution.id, execution]));
  const linkedExecutionIds = services.flatMap((service) =>
    service.procedureExecutionId ? [service.procedureExecutionId] : [],
  );
  if (!hasUniqueStrings(linkedExecutionIds))
    return 'Uma execução de procedimento está vinculada a mais de um serviço.';
  for (const execution of executions) {
    if (execution.resultingServiceRecordId) {
      const service = serviceById.get(execution.resultingServiceRecordId);
      if (
        !service ||
        service.procedureExecutionId !== execution.id ||
        execution.status !== 'completed'
      ) {
        return 'Uma execução de procedimento possui um vínculo de serviço inconsistente.';
      }
    }
  }
  for (const service of services) {
    if (service.procedureExecutionId) {
      const execution = executionById.get(service.procedureExecutionId);
      if (
        !execution ||
        execution.resultingServiceRecordId !== service.id ||
        execution.status !== 'completed' ||
        service.procedureSlug !== execution.procedureSlug
      ) {
        return 'Um serviço possui um vínculo de procedimento inconsistente.';
      }
    }
  }

  if (procedures.length > 0) {
    const procedureBySlug = new Map(procedures.map((procedure) => [procedure.slug, procedure]));
    for (const execution of executions) {
      const procedure = procedureBySlug.get(execution.procedureSlug);
      if (!procedure) return 'Uma execução aponta para um procedimento inexistente.';
      const stepIds = new Set(procedure.steps.map((step) => step.id));
      const warningIds = new Set(procedure.safetyWarnings.map((warning) => warning.id));
      const checkIds = new Set(procedure.finalChecks.map((check) => check.id));
      if (
        execution.completedStepIds.some((id) => !stepIds.has(id)) ||
        (execution.currentStepId && !stepIds.has(execution.currentStepId))
      ) {
        return 'Uma execução aponta para uma etapa inexistente.';
      }
      if (execution.acknowledgedWarningIds.some((id) => !warningIds.has(id))) {
        return 'Uma execução aponta para um alerta de segurança inexistente.';
      }
      if (
        procedure.safetyWarnings.some(
          (warning) => !execution.acknowledgedWarningIds.includes(warning.id),
        )
      ) {
        return 'Uma execução não registra todos os alertas de segurança reconhecidos.';
      }
      if (execution.completedFinalCheckIds.some((id) => !checkIds.has(id))) {
        return 'Uma execução aponta para uma verificação final inexistente.';
      }
      if (
        execution.status === 'completed' &&
        (procedure.steps
          .filter((step) => step.required)
          .some((step) => !execution.completedStepIds.includes(step.id)) ||
          procedure.finalChecks
            .filter((check) => check.required)
            .some((check) => !execution.completedFinalCheckIds.includes(check.id)))
      ) {
        return 'Uma execução concluída não possui todos os itens obrigatórios.';
      }
    }
  }
  return null;
}

function validateDailyUseCollections(value: UnknownRecord): string | null {
  if (!Array.isArray(value['fuelHistory']) || !value['fuelHistory'].every(isFuelRecord)) {
    return 'O histórico de abastecimentos é inválido.';
  }
  if (!Array.isArray(value['expenseHistory']) || !value['expenseHistory'].every(isExpenseRecord)) {
    return 'O histórico de gastos é inválido.';
  }
  if (
    !Array.isArray(value['occurrenceHistory']) ||
    !value['occurrenceHistory'].every(isOccurrenceRecord)
  ) {
    return 'O histórico de ocorrências é inválido.';
  }
  if (
    !Array.isArray(value['safetyCheckHistory']) ||
    !value['safetyCheckHistory'].every(isSafetyCheckRecord)
  ) {
    return 'O histórico de inspeções pré-rodagem é inválido.';
  }

  const motorcycle = value['motorcycle'] as Motorcycle;
  const fuelHistory = value['fuelHistory'] as readonly FuelRecord[];
  const expenseHistory = value['expenseHistory'] as readonly ExpenseRecord[];
  const occurrenceHistory = value['occurrenceHistory'] as readonly OccurrenceRecord[];
  const safetyCheckHistory = value['safetyCheckHistory'] as readonly SafetyCheckRecord[];
  const collections = [fuelHistory, expenseHistory, occurrenceHistory, safetyCheckHistory];
  if (collections.some((records) => !hasUniqueIds(records))) {
    return 'Um histórico de uso cotidiano contém identificadores duplicados.';
  }
  if (
    [...fuelHistory, ...expenseHistory, ...occurrenceHistory, ...safetyCheckHistory].some(
      (record) => record.motorcycleId !== motorcycle.id,
    )
  ) {
    return 'Um registro de uso cotidiano aponta para outra motocicleta.';
  }
  if (
    safetyCheckHistory.some(
      (record) =>
        !hasUniqueStrings(record.responses.map((response) => response.itemId)) ||
        record.responses.length === 0,
    )
  ) {
    return 'Uma inspeção pré-rodagem contém respostas inválidas.';
  }

  const fuelIds = new Set(fuelHistory.map((record) => record.id));
  const odometerHistory = value['odometerHistory'] as readonly OdometerRecord[];
  if (odometerHistory.some((record) => record.fuelRecordId && !fuelIds.has(record.fuelRecordId))) {
    return 'Uma leitura do odômetro aponta para um abastecimento inexistente.';
  }
  return null;
}

export function validateGarageStateV2(value: unknown): GarageStateV2Validation {
  if (!isRecord(value) || value['schemaVersion'] !== 2) {
    return { valid: false, error: 'O estado não usa o schema 2 do Garage.' };
  }
  const error =
    validateBaseFields(value, true, false) ??
    ((value['serviceHistory'] as readonly ServiceRecord[]).some(
      (record) => record.procedureExecutionId !== undefined,
    )
      ? 'O schema 2 não suporta vínculos com execuções de procedimentos.'
      : null);
  return error
    ? { valid: false, error }
    : { valid: true, state: value as unknown as GarageStateV2 };
}

export function validateGarageState(
  value: unknown,
  procedures: readonly Procedure[] = [],
): GarageStateValidation {
  if (!isRecord(value) || value['schemaVersion'] !== 4) {
    return { valid: false, error: 'O estado não usa o schema 4 do Garage.' };
  }
  const error =
    validateBaseFields(value, true, true) ??
    validateExecutionReferences(value, procedures) ??
    validateDailyUseCollections(value);
  return error ? { valid: false, error } : { valid: true, state: value as unknown as GarageState };
}

export function validateGarageStateV3(
  value: unknown,
  procedures: readonly Procedure[] = [],
): GarageStateV3Validation {
  if (!isRecord(value) || value['schemaVersion'] !== 3) {
    return { valid: false, error: 'O estado não usa o schema 3 do Garage.' };
  }
  const error =
    validateBaseFields(value, true, false) ?? validateExecutionReferences(value, procedures);
  return error
    ? { valid: false, error }
    : { valid: true, state: value as unknown as GarageStateV3 };
}

function isGarageStateV1(value: unknown): value is GarageStateV1 {
  return (
    isRecord(value) && value['version'] === 1 && validateBaseFields(value, false, false) === null
  );
}

function migrateGarageStateV1ToV2(value: GarageStateV1): GarageStateV2 {
  const migrationRecord: OdometerRecord = {
    id: `odometer-migration-${value.motorcycle.id}`,
    motorcycleId: value.motorcycle.id,
    mileage: value.motorcycle.currentMileage,
    recordedAt: value.motorcycle.updatedAt,
    source: 'migration',
    note: 'Leitura preservada durante a migração do schema 1. Confirme na configuração inicial.',
  };
  return {
    schemaVersion: 2,
    motorcycle: value.motorcycle,
    maintenancePlan: value.maintenancePlan,
    serviceHistory: value.serviceHistory.map((record) =>
      record.id.startsWith('demo-') ? { ...record, isDemo: true } : record,
    ),
    odometerHistory: [migrationRecord],
    settings: value.settings,
    setup: { completed: false, demoData: true },
  };
}

export function migrateGarageStateV2(value: GarageStateV2): GarageStateV3 {
  return { ...value, schemaVersion: 3, procedureExecutions: [] };
}

export function migrateGarageStateV3(value: GarageStateV3): GarageState {
  return {
    ...value,
    schemaVersion: 4,
    fuelHistory: [],
    expenseHistory: [],
    occurrenceHistory: [],
    safetyCheckHistory: [],
    settings: { ...value.settings, theme: 'dark' },
  };
}

export function migrateGarageStateV1(value: GarageStateV1): GarageState {
  return migrateGarageStateV3(migrateGarageStateV2(migrateGarageStateV1ToV2(value)));
}

export function decodeStoredGarageState(
  rawValue: string | null,
  safeState: GarageState,
  procedures: readonly Procedure[] = [],
): StoredGarageStateResult {
  if (rawValue === null) return { kind: 'empty', state: safeState };
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return {
      kind: 'invalid-state',
      state: safeState,
      rawValue,
      message: 'Os dados locais não são um JSON válido. O conteúdo original foi preservado.',
    };
  }

  if (isRecord(parsed) && typeof parsed['schemaVersion'] === 'number') {
    if (parsed['schemaVersion'] > 4) {
      return {
        kind: 'future-version',
        state: safeState,
        rawValue,
        message:
          'Os dados foram criados por uma versão mais recente do Garage e não foram substituídos.',
      };
    }
    if (parsed['schemaVersion'] === 2) {
      const validation = validateGarageStateV2(parsed);
      return validation.valid
        ? {
            kind: 'migrated',
            state: migrateGarageStateV3(migrateGarageStateV2(validation.state)),
          }
        : {
            kind: 'invalid-state',
            state: safeState,
            rawValue,
            message: `${validation.error} O conteúdo original foi preservado.`,
          };
    }
    if (parsed['schemaVersion'] === 3) {
      const validation = validateGarageStateV3(parsed, procedures);
      return validation.valid
        ? { kind: 'migrated', state: migrateGarageStateV3(validation.state) }
        : {
            kind: 'invalid-state',
            state: safeState,
            rawValue,
            message: `${validation.error} O conteúdo original foi preservado.`,
          };
    }
    const validation = validateGarageState(parsed, procedures);
    return validation.valid
      ? { kind: 'current', state: validation.state }
      : {
          kind: 'invalid-state',
          state: safeState,
          rawValue,
          message: `${validation.error} O conteúdo original foi preservado.`,
        };
  }

  if (isGarageStateV1(parsed)) return { kind: 'migrated', state: migrateGarageStateV1(parsed) };
  return {
    kind: 'invalid-state',
    state: safeState,
    rawValue,
    message: 'O formato dos dados locais não é reconhecido. O conteúdo original foi preservado.',
  };
}
