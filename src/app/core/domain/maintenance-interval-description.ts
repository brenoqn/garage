import { MaintenancePlanItem, MaintenanceSchedule } from '../models/maintenance.model';
import { effectiveMaintenanceInterval } from './maintenance-plan';

/** "a cada 1.000 km ou 180 dias". Retorna string vazia sem intervalos. */
export function intervalText(intervalKm?: number, intervalDays?: number): string {
  const parts: string[] = [];
  if (intervalKm !== undefined) parts.push(`${intervalKm.toLocaleString('pt-BR')} km`);
  if (intervalDays !== undefined) parts.push(`${intervalDays} dias`);
  return parts.length ? `a cada ${parts.join(' ou ')}` : '';
}

/** Descreve o intervalo que conta para lembretes e de onde ele vem. */
export function describeEffectiveInterval(item: MaintenancePlanItem): string {
  const interval = effectiveMaintenanceInterval(item);
  if (interval?.basis === 'user') {
    return `Definido por você: ${intervalText(interval.intervalKm, interval.intervalDays)}`;
  }
  if (interval?.basis === 'confirmed-source') {
    return intervalText(interval.intervalKm, interval.intervalDays);
  }
  return 'Intervalo do manual pendente de revisão';
}

/** Explica por que um item ainda não tem previsão e qual é a próxima ação útil. */
export function pendingScheduleHint(
  item: MaintenancePlanItem,
  schedule: MaintenanceSchedule,
): string | null {
  if (schedule.status !== 'unknown') return null;
  if (!effectiveMaintenanceInterval(item)) return 'Defina seu intervalo para receber lembretes';
  if (!item.lastExecution) return 'Registre a última execução para começar a contar';
  return 'Sem previsão';
}
