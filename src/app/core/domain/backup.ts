import { GarageBackup, GarageBackupParseResult, GarageBackupSummary } from '../models/backup.model';
import { GarageState } from '../models/garage-state.model';
import { Procedure } from '../models/procedure.model';
import {
  migrateGarageStateV2,
  migrateGarageStateV3,
  validateGarageState,
  validateGarageStateV2,
  validateGarageStateV3,
} from './garage-state-migration';

export function createGarageBackup(state: GarageState, exportedAt: string): string {
  const demoServiceIds = new Set(
    state.serviceHistory.filter((record) => record.isDemo).map((record) => record.id),
  );
  const backupState: GarageState = {
    ...state,
    serviceHistory: state.serviceHistory.filter((record) => !record.isDemo),
    odometerHistory: state.odometerHistory.filter(
      (record) => !record.serviceRecordId || !demoServiceIds.has(record.serviceRecordId),
    ),
    maintenancePlan: state.maintenancePlan.map((item) =>
      item.lastExecution?.serviceRecordId && demoServiceIds.has(item.lastExecution.serviceRecordId)
        ? withoutLastExecution(item)
        : item,
    ),
    procedureExecutions: state.procedureExecutions.map((execution) =>
      execution.resultingServiceRecordId && demoServiceIds.has(execution.resultingServiceRecordId)
        ? withoutResultingService(execution)
        : execution,
    ),
  };
  const backup: GarageBackup = {
    product: 'garage',
    schemaVersion: 4,
    exportedAt,
    state: backupState,
  };
  return JSON.stringify(backup, null, 2);
}

function withoutLastExecution(
  item: GarageState['maintenancePlan'][number],
): GarageState['maintenancePlan'][number] {
  const copy = { ...item };
  delete copy.lastExecution;
  return copy;
}

function withoutResultingService(
  execution: GarageState['procedureExecutions'][number],
): GarageState['procedureExecutions'][number] {
  const copy = { ...execution };
  delete copy.resultingServiceRecordId;
  return copy;
}

export function summarizeGarageBackup(state: GarageState): GarageBackupSummary {
  return {
    motorcycle: `${state.motorcycle.manufacturer} ${state.motorcycle.model}`,
    year: state.motorcycle.year,
    currentMileage: state.motorcycle.currentMileage,
    serviceRecords: state.serviceHistory.length,
    odometerRecords: state.odometerHistory.length,
    maintenanceItems: state.maintenancePlan.length,
    procedureExecutions: state.procedureExecutions.length,
    fuelRecords: state.fuelHistory.length,
    expenseRecords: state.expenseHistory.length,
    occurrenceRecords: state.occurrenceHistory.length,
    safetyChecks: state.safetyCheckHistory.length,
  };
}

export function parseGarageBackup(
  content: string,
  procedures: readonly Procedure[] = [],
): GarageBackupParseResult {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { ok: false, error: 'O arquivo não contém um JSON válido.' };
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'O arquivo não possui o envelope de backup do Garage.' };
  }

  const candidate = value as Record<string, unknown>;
  if (candidate['product'] !== 'garage') {
    return { ok: false, error: 'O arquivo não foi identificado como um backup do Garage.' };
  }
  if (
    candidate['schemaVersion'] !== 2 &&
    candidate['schemaVersion'] !== 3 &&
    candidate['schemaVersion'] !== 4
  ) {
    return {
      ok: false,
      error: 'A versão deste backup é incompatível com esta versão do Garage.',
    };
  }
  if (
    typeof candidate['exportedAt'] !== 'string' ||
    Number.isNaN(Date.parse(candidate['exportedAt']))
  ) {
    return { ok: false, error: 'A data de exportação do backup é inválida.' };
  }

  const state = parseBackupState(candidate['state'], candidate['schemaVersion'], procedures);
  if (typeof state === 'string') {
    return { ok: false, error: `Backup recusado: ${state}` };
  }

  const backup: GarageBackup = {
    product: 'garage',
    schemaVersion: 4,
    exportedAt: candidate['exportedAt'],
    state,
  };
  return { ok: true, backup, summary: summarizeGarageBackup(state) };
}

function parseBackupState(
  value: unknown,
  schemaVersion: 2 | 3 | 4,
  procedures: readonly Procedure[],
): GarageState | string {
  if (schemaVersion === 2) {
    const validation = validateGarageStateV2(value);
    return validation.valid
      ? migrateGarageStateV3(migrateGarageStateV2(validation.state))
      : validation.error;
  }
  if (schemaVersion === 3) {
    const validation = validateGarageStateV3(value, procedures);
    return validation.valid ? migrateGarageStateV3(validation.state) : validation.error;
  }
  const validation = validateGarageState(value, procedures);
  return validation.valid ? validation.state : validation.error;
}
