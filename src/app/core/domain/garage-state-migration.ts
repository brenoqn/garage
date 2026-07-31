import { GarageSettings, GarageSetup, GarageState } from '../models/garage-state.model';
import { MaintenancePlanItem } from '../models/maintenance.model';
import { Motorcycle } from '../models/motorcycle.model';
import { OdometerRecord } from '../models/odometer-record.model';
import { ServiceRecord } from '../models/service-record.model';

interface GarageStateV1 {
  readonly version: 1;
  readonly motorcycle: Motorcycle;
  readonly maintenancePlan: readonly MaintenancePlanItem[];
  readonly serviceHistory: readonly ServiceRecord[];
  readonly settings: GarageSettings;
}

export type GarageStateValidation =
  | { readonly valid: true; readonly state: GarageState }
  | { readonly valid: false; readonly error: string };

export type StoredGarageStateResult =
  | {
      readonly kind: 'empty' | 'current' | 'migrated';
      readonly state: GarageState;
    }
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
    isOptionalString(value['reference'])
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

function isExecution(value: unknown): boolean {
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
    (value['lastExecution'] === undefined || isExecution(value['lastExecution'])) &&
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
    isOptionalString(value['serviceRecordId'])
  );
}

function isSettings(value: unknown): value is GarageSettings {
  return isRecord(value) && typeof value['maintenanceAlertsEnabled'] === 'boolean';
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

function validateStateFields(value: UnknownRecord, includeV2Fields: boolean): string | null {
  if (!isMotorcycle(value['motorcycle'])) {
    return 'Os dados da motocicleta são inválidos.';
  }
  if (
    !Array.isArray(value['maintenancePlan']) ||
    !value['maintenancePlan'].every(isMaintenancePlanItem)
  ) {
    return 'O plano de manutenção é inválido.';
  }
  if (!Array.isArray(value['serviceHistory']) || !value['serviceHistory'].every(isServiceRecord)) {
    return 'O histórico de serviços é inválido.';
  }
  if (!isSettings(value['settings'])) {
    return 'As configurações são inválidas.';
  }

  const maintenancePlan = value['maintenancePlan'] as readonly MaintenancePlanItem[];
  const serviceHistory = value['serviceHistory'] as readonly ServiceRecord[];
  if (!hasUniqueIds(maintenancePlan)) {
    return 'O plano contém identificadores duplicados.';
  }
  if (!hasUniqueIds(serviceHistory)) {
    return 'O histórico de serviços contém identificadores duplicados.';
  }
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
    if (!isSetup(value['setup'])) {
      return 'A configuração inicial é inválida.';
    }
    const motorcycle = value['motorcycle'] as Motorcycle;
    const odometerHistory = value['odometerHistory'] as readonly OdometerRecord[];
    if (!hasUniqueIds(odometerHistory)) {
      return 'O histórico do odômetro contém identificadores duplicados.';
    }
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

export function validateGarageState(value: unknown): GarageStateValidation {
  if (!isRecord(value) || value['schemaVersion'] !== 2) {
    return { valid: false, error: 'O estado não usa o schema 2 do Garage.' };
  }
  const error = validateStateFields(value, true);
  return error ? { valid: false, error } : { valid: true, state: value as unknown as GarageState };
}

function isGarageStateV1(value: unknown): value is GarageStateV1 {
  return isRecord(value) && value['version'] === 1 && validateStateFields(value, false) === null;
}

export function migrateGarageStateV1(value: GarageStateV1): GarageState {
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
    setup: {
      completed: false,
      demoData: true,
    },
  };
}

export function decodeStoredGarageState(
  rawValue: string | null,
  safeState: GarageState,
): StoredGarageStateResult {
  if (rawValue === null) {
    return { kind: 'empty', state: safeState };
  }

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
    if (parsed['schemaVersion'] > 2) {
      return {
        kind: 'future-version',
        state: safeState,
        rawValue,
        message:
          'Os dados foram criados por uma versão mais recente do Garage e não foram substituídos.',
      };
    }
    const validation = validateGarageState(parsed);
    return validation.valid
      ? { kind: 'current', state: validation.state }
      : {
          kind: 'invalid-state',
          state: safeState,
          rawValue,
          message: `${validation.error} O conteúdo original foi preservado.`,
        };
  }

  if (isGarageStateV1(parsed)) {
    return { kind: 'migrated', state: migrateGarageStateV1(parsed) };
  }

  return {
    kind: 'invalid-state',
    state: safeState,
    rawValue,
    message: 'O formato dos dados locais não é reconhecido. O conteúdo original foi preservado.',
  };
}
