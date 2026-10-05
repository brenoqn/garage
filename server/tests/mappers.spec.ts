import { afterEach, expect, it } from 'vitest';
import { civilDate, decimal } from '../src/persistence/mappers';

const originalTimezone = process.env['TZ'];

afterEach(() => {
  if (originalTimezone === undefined) delete process.env['TZ'];
  else process.env['TZ'] = originalTimezone;
});

it('preserves PostgreSQL DATE in a positive-offset timezone', () => {
  process.env['TZ'] = 'Asia/Tokyo';
  expect(civilDate(new Date(2026, 9, 4))).toBe('2026-10-04');
});

it('rejects numeric values that cannot round-trip through the number contract', () => {
  expect(decimal('0.1')).toBe(0.1);
  expect(decimal('12.3400')).toBe(12.34);
  expect(() => decimal('0.10000000000000001')).toThrow('precision');
  expect(() => decimal('0.1234567890123456789')).toThrow('precision');
});
