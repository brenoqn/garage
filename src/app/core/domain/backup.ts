import { GarageBackup, GarageBackupParseResult, GarageBackupSummary } from '../models/backup.model';
import { GarageState } from '../models/garage-state.model';
import { validateGarageState } from './garage-state-migration';

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
  };
  const backup: GarageBackup = {
    product: 'garage',
    schemaVersion: 2,
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

export function summarizeGarageBackup(state: GarageState): GarageBackupSummary {
  return {
    motorcycle: `${state.motorcycle.manufacturer} ${state.motorcycle.model}`,
    year: state.motorcycle.year,
    currentMileage: state.motorcycle.currentMileage,
    serviceRecords: state.serviceHistory.length,
    odometerRecords: state.odometerHistory.length,
    maintenanceItems: state.maintenancePlan.length,
  };
}

export function parseGarageBackup(content: string): GarageBackupParseResult {
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
  if (candidate['schemaVersion'] !== 2) {
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

  const validation = validateGarageState(candidate['state']);
  if (!validation.valid) {
    return { ok: false, error: `Backup recusado: ${validation.error}` };
  }

  const backup: GarageBackup = {
    product: 'garage',
    schemaVersion: 2,
    exportedAt: candidate['exportedAt'],
    state: validation.state,
  };
  return { ok: true, backup, summary: summarizeGarageBackup(validation.state) };
}
