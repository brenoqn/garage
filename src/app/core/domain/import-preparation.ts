import { GarageBackupSummary } from '../models/backup.model';
import { GarageState } from '../models/garage-state.model';
import { MaintenancePlanItem } from '../models/maintenance.model';
import { Procedure } from '../models/procedure.model';
import { createGarageBackup, parseGarageBackup, summarizeGarageBackup } from './backup';

/** Versão da normalização usada no hash da importação. Mude ao alterar `canonicalJson`. */
export const IMPORT_NORMALIZATION_VERSION = 1;

export type ImportPreparation =
  | {
      readonly ok: true;
      readonly state: GarageState;
      readonly summary: GarageBackupSummary;
      readonly excludedDemoServices: number;
    }
  | { readonly ok: false; readonly error: string };

/** JSON com chaves ordenadas e sem campos `undefined`; base do hash e da conferência. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const fields = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
    return `{${fields.join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Valida um backup para importação no servidor: migra para o schema atual, exige configuração
 * concluída, remove serviços demonstrativos (informando quantos) e recusa itens do plano que não
 * existam no catálogo ou que declarem fonte confirmada que o catálogo não confirma.
 */
export function prepareImport(
  content: string,
  procedures: readonly Procedure[],
  catalogPlan: readonly MaintenancePlanItem[],
): ImportPreparation {
  const parsed = parseGarageBackup(content, procedures);
  if (!parsed.ok) return parsed;
  const original = parsed.backup.state;
  if (!original.setup.completed) {
    return {
      ok: false,
      error: 'Conclua a configuração inicial no aplicativo antes de importar estes dados.',
    };
  }
  const cleaned = parseGarageBackup(
    createGarageBackup(original, parsed.backup.exportedAt),
    procedures,
  );
  if (!cleaned.ok) return cleaned;
  const state = cleaned.backup.state;

  const catalog = new Map(catalogPlan.map((item) => [item.id, item]));
  for (const item of state.maintenancePlan) {
    if (item.origin !== 'catalog') continue;
    const reference = catalog.get(item.id);
    if (!reference) {
      return {
        ok: false,
        error: `O item “${item.title}” não existe no catálogo atual. A importação foi recusada.`,
      };
    }
    if (
      item.technicalSource.status === 'confirmed' &&
      reference.technicalSource.status !== 'confirmed'
    ) {
      return {
        ok: false,
        error: `O item “${item.title}” declara uma fonte confirmada que o catálogo não confirma.`,
      };
    }
  }
  return {
    ok: true,
    state,
    summary: summarizeGarageBackup(state),
    excludedDemoServices: original.serviceHistory.length - state.serviceHistory.length,
  };
}

/** Forma comparável de um estado: listas ordenadas por id, sem preferências nem setup. */
export function comparableImportState(state: GarageState): string {
  const byId = <T extends { readonly id: string }>(values: readonly T[]): T[] =>
    [...values].sort((a, b) => a.id.localeCompare(b.id));
  return canonicalJson({
    motorcycle: state.motorcycle,
    maintenancePlan: byId(state.maintenancePlan),
    serviceHistory: byId(state.serviceHistory),
    odometerHistory: byId(state.odometerHistory),
    procedureExecutions: byId(state.procedureExecutions),
    fuelHistory: byId(state.fuelHistory),
    expenseHistory: byId(state.expenseHistory),
    occurrenceHistory: byId(state.occurrenceHistory),
    safetyCheckHistory: byId(state.safetyCheckHistory),
  });
}
