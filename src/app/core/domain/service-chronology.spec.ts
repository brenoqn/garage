import { describe, expect, it } from 'vitest';
import { shouldReplaceMaintenanceExecution } from './service-chronology';

const current = {
  date: '2026-07-20',
  mileage: 20_000,
  serviceRecordId: 'current',
};

describe('shouldReplaceMaintenanceExecution', () => {
  it('accepts a service with a later date', () => {
    expect(
      shouldReplaceMaintenanceExecution(current, { date: '2026-07-21', mileage: 19_000 }),
    ).toBe(true);
  });

  it('rejects a service with an older date even when its mileage is higher', () => {
    expect(
      shouldReplaceMaintenanceExecution(current, { date: '2026-07-19', mileage: 21_000 }),
    ).toBe(false);
  });

  it('uses the greater mileage when dates are equal', () => {
    expect(
      shouldReplaceMaintenanceExecution(current, { date: '2026-07-20', mileage: 20_001 }),
    ).toBe(true);
  });

  it('preserves the existing execution when date and mileage are equal', () => {
    expect(
      shouldReplaceMaintenanceExecution(current, { date: '2026-07-20', mileage: 20_000 }),
    ).toBe(false);
  });
});
