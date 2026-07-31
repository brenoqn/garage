import {
  MaintenancePlanItem,
  MaintenanceSchedule,
  MaintenanceStatus,
} from '../models/maintenance.model';

const DAY_IN_MS = 86_400_000;

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function differenceInCalendarDays(later: string, earlier: string): number {
  const laterDate = parseLocalDate(later);
  const earlierDate = parseLocalDate(earlier);
  return Math.round(
    (Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate()) -
      Date.UTC(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate())) /
      DAY_IN_MS,
  );
}

function statusFromRemaining(
  remaining: number | undefined,
  warning: number | undefined,
): MaintenanceStatus {
  if (remaining === undefined) {
    return 'unknown';
  }
  if (remaining < 0) {
    return 'overdue';
  }
  if (remaining === 0) {
    return 'due';
  }
  if (warning !== undefined && remaining <= warning) {
    return 'upcoming';
  }
  return 'ok';
}

const STATUS_PRIORITY: Readonly<Record<MaintenanceStatus, number>> = {
  overdue: 5,
  due: 4,
  upcoming: 3,
  ok: 2,
  unknown: 1,
};

export function calculateMaintenanceSchedule(
  item: MaintenancePlanItem,
  currentMileage: number,
  today: string,
): MaintenanceSchedule {
  if (item.technicalSource.status !== 'confirmed') {
    return { status: 'unknown' };
  }

  const execution = item.lastExecution;
  if (
    !execution ||
    !Number.isFinite(currentMileage) ||
    currentMileage < 0 ||
    !isValidIsoDate(today) ||
    !isValidIsoDate(execution.date)
  ) {
    return { status: 'unknown' };
  }

  const nextMileage =
    item.intervalKm === undefined ? undefined : execution.mileage + item.intervalKm;
  const nextDate =
    item.intervalDays === undefined ? undefined : addDays(execution.date, item.intervalDays);
  const remainingKm =
    nextMileage === undefined ? undefined : nextMileage - Math.max(0, currentMileage);
  const remainingDays =
    nextDate === undefined ? undefined : differenceInCalendarDays(nextDate, today);

  const mileageStatus = statusFromRemaining(remainingKm, item.warningKm);
  const dateStatus = statusFromRemaining(remainingDays, item.warningDays);
  const candidates = [mileageStatus, dateStatus].filter((status) => status !== 'unknown');
  const status =
    candidates.length === 0
      ? 'unknown'
      : candidates.reduce((mostUrgent, candidate) =>
          STATUS_PRIORITY[candidate] > STATUS_PRIORITY[mostUrgent] ? candidate : mostUrgent,
        );

  return {
    status,
    nextMileage,
    nextDate,
    remainingKm,
    remainingDays,
  };
}

export function maintenanceStatusLabel(status: MaintenanceStatus): string {
  const labels: Readonly<Record<MaintenanceStatus, string>> = {
    ok: 'Em dia',
    upcoming: 'Próxima',
    due: 'No prazo',
    overdue: 'Vencida',
    unknown: 'A confirmar',
  };
  return labels[status];
}

export function todayIso(): string {
  return toIsoDate(new Date());
}
