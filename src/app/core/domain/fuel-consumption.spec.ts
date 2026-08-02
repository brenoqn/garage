import { describe, expect, it } from 'vitest';
import { FuelRecord } from '../models/fuel-record.model';
import {
  calculateFuelConsumption,
  summarizeFuelHistory,
  validateNewFuelRecord,
} from './fuel-consumption';

const record = (
  id: string,
  mileage: number,
  liters: number,
  fueledAt: string,
  fullTank = true,
): FuelRecord => ({
  id,
  motorcycleId: 'nx200-primary',
  mileage,
  liters,
  fueledAt,
  fullTank,
  totalCost: liters * 6,
  createdAt: fueledAt,
});

describe('fuel consumption', () => {
  it('calculates km/L only after two full tanks', () => {
    const entries = calculateFuelConsumption([
      record('second', 10_300, 10, '2026-08-02T10:00:00.000Z'),
      record('first', 10_000, 8, '2026-07-25T10:00:00.000Z'),
    ]);
    expect(entries[0]).toMatchObject({ fuelRecordId: 'first', reason: 'first-full-tank' });
    expect(entries[1]).toMatchObject({ fuelRecordId: 'second', distanceKm: 300, kmPerLiter: 30 });
  });

  it('keeps partial tanks open and includes their liters in the next full interval', () => {
    const records = [
      record('first', 10_000, 8, '2026-07-20T10:00:00.000Z'),
      record('partial', 10_100, 3, '2026-07-25T10:00:00.000Z', false),
      record('last', 10_400, 10, '2026-08-02T10:00:00.000Z'),
    ];
    const entries = calculateFuelConsumption(records);
    expect(entries[1]).toMatchObject({ reason: 'partial-tank' });
    expect(entries[2]).toMatchObject({ distanceKm: 400, intervalLiters: 13 });
    expect(entries[2].kmPerLiter).toBeCloseTo(400 / 13);
    expect(summarizeFuelHistory(records).averageKmPerLiter).toBeCloseTo(400 / 13);
  });

  it('excludes non-increasing odometer sequences and uses a weighted average', () => {
    const records = [
      record('first', 1_000, 5, '2026-07-01T10:00:00.000Z'),
      record('second', 1_200, 10, '2026-07-10T10:00:00.000Z'),
      record('invalid', 1_100, 10, '2026-07-20T10:00:00.000Z'),
      record('last', 1_400, 10, '2026-08-01T10:00:00.000Z'),
    ];
    const summary = summarizeFuelHistory(records);
    expect(summary.validIntervals).toBe(2);
    expect(summary.averageKmPerLiter).toBe(25);
    expect(summary.latestKmPerLiter).toBe(30);
  });

  it('requires explicit confirmation for a historical mileage', () => {
    const input = {
      fueledAt: '2026-08-02T10:00:00.000Z',
      mileage: 9_000,
      liters: 10,
      totalCost: 60,
      fullTank: true,
    };
    expect(validateNewFuelRecord(input, 10_000).valid).toBe(false);
    expect(validateNewFuelRecord({ ...input, confirmedHistoricalMileage: true }, 10_000)).toEqual({
      valid: true,
    });
  });
});
