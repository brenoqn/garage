import { describe, expect, it } from 'vitest';
import { evaluateOdometerUpdate } from './odometer-policy';

describe('evaluateOdometerUpdate', () => {
  it('allows an increasing reading', () => {
    expect(evaluateOdometerUpdate(20_000, { mileage: 20_500, source: 'dashboard' }).status).toBe(
      'updated',
    );
  });

  it('requires explicit confirmation before a regression', () => {
    const result = evaluateOdometerUpdate(20_000, {
      mileage: 19_500,
      source: 'correction',
    });

    expect(result.status).toBe('confirmation-required');
    expect(result.impact).toContain('histórico');
  });

  it('allows a confirmed regression', () => {
    expect(
      evaluateOdometerUpdate(20_000, {
        mileage: 19_500,
        source: 'panel-replacement',
        confirmedRegression: true,
      }).status,
    ).toBe('updated');
  });

  it('requires a correction source for a confirmed regression', () => {
    expect(
      evaluateOdometerUpdate(20_000, {
        mileage: 19_500,
        source: 'dashboard',
        confirmedRegression: true,
      }).status,
    ).toBe('blocked');
  });

  it('blocks invalid readings', () => {
    expect(evaluateOdometerUpdate(20_000, { mileage: -1, source: 'dashboard' }).status).toBe(
      'blocked',
    );
  });
});
