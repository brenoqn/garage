import { describe, expect, it } from 'vitest';
import { MaintenancePlanItem } from '../models/maintenance.model';
import { calculateMaintenanceSchedule } from './maintenance-calculator';

const source = {
  status: 'confirmed' as const,
  label: 'Fonte de teste',
};

function planItem(changes: Partial<MaintenancePlanItem> = {}): MaintenancePlanItem {
  return {
    id: 'test',
    title: 'Item de teste',
    category: 'general',
    intervalKm: 1000,
    warningKm: 200,
    lastExecution: { date: '2026-01-01', mileage: 10000 },
    technicalSource: source,
    ...changes,
  };
}

describe('calculateMaintenanceSchedule', () => {
  it('keeps unconfirmed intervals out of operational calculations', () => {
    const schedule = calculateMaintenanceSchedule(
      planItem({
        technicalSource: {
          status: 'needs-confirmation',
          label: 'Intervalo ainda não validado',
        },
      }),
      99_999,
      '2026-12-31',
    );

    expect(schedule).toEqual({ status: 'unknown' });
  });

  it('returns unknown when no execution is available', () => {
    const schedule = calculateMaintenanceSchedule(
      planItem({ lastExecution: undefined }),
      10500,
      '2026-02-01',
    );

    expect(schedule.status).toBe('unknown');
    expect(schedule.nextMileage).toBeUndefined();
  });

  it('returns unknown for invalid mileage or dates instead of reporting an item as ok', () => {
    expect(calculateMaintenanceSchedule(planItem(), Number.NaN, '2026-02-01').status).toBe(
      'unknown',
    );
    expect(calculateMaintenanceSchedule(planItem(), 10_500, 'invalid').status).toBe('unknown');
  });

  it('calculates the next mileage and keeps an item ok outside its warning window', () => {
    const schedule = calculateMaintenanceSchedule(planItem(), 10500, '2026-02-01');

    expect(schedule.nextMileage).toBe(11000);
    expect(schedule.remainingKm).toBe(500);
    expect(schedule.status).toBe('ok');
  });

  it('marks an item as upcoming at the configured mileage warning threshold', () => {
    const schedule = calculateMaintenanceSchedule(planItem(), 10800, '2026-02-01');

    expect(schedule.remainingKm).toBe(200);
    expect(schedule.status).toBe('upcoming');
  });

  it('distinguishes due from overdue by mileage', () => {
    const due = calculateMaintenanceSchedule(planItem(), 11000, '2026-02-01');
    const overdue = calculateMaintenanceSchedule(planItem(), 11001, '2026-02-01');

    expect(due.status).toBe('due');
    expect(overdue.status).toBe('overdue');
  });

  it('uses the most urgent trigger when mileage and time are both configured', () => {
    const schedule = calculateMaintenanceSchedule(
      planItem({
        intervalKm: 5000,
        warningKm: 200,
        intervalDays: 30,
        warningDays: 5,
      }),
      10100,
      '2026-02-02',
    );

    expect(schedule.nextMileage).toBe(15000);
    expect(schedule.nextDate).toBe('2026-01-31');
    expect(schedule.remainingDays).toBe(-2);
    expect(schedule.status).toBe('overdue');
  });

  it('handles calendar-day calculations across a leap day', () => {
    const schedule = calculateMaintenanceSchedule(
      planItem({
        intervalKm: undefined,
        warningKm: undefined,
        intervalDays: 2,
        warningDays: 1,
        lastExecution: { date: '2024-02-28', mileage: 10000 },
      }),
      10000,
      '2024-02-29',
    );

    expect(schedule.nextDate).toBe('2024-03-01');
    expect(schedule.remainingDays).toBe(1);
    expect(schedule.status).toBe('upcoming');
  });
});
