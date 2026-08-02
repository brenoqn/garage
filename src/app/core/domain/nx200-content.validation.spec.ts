import { describe, expect, it } from 'vitest';
import { NX200_TECHNICAL_CATALOG } from '../../data/nx200-demo.data';
import {
  formatContentValidationIssues,
  validateTechnicalCatalog,
} from './technical-catalog-validator';

describe('NX200 publishable technical catalog', () => {
  it('contains no blocking editorial violation', () => {
    const blocking = validateTechnicalCatalog(NX200_TECHNICAL_CATALOG).filter(
      (item) => item.severity === 'error',
    );
    expect(blocking, formatContentValidationIssues(blocking)).toEqual([]);
  });

  it('records the official owner manual and its independent applicability decision', () => {
    const source = NX200_TECHNICAL_CATALOG.sources.find(
      (item) => item.id === 'nx200-owner-manual-1994',
    );
    expect(source?.availability).toBe('available');
    expect(source?.documentCode).toBe('D2203-MAN-0181');
    expect(source?.applicabilityDecisions?.[0]?.applicability).toMatchObject({
      confirmation: 'confirmed',
      yearFrom: 1997,
      yearTo: 1997,
      markets: ['Brasil'],
    });
  });

  it('uses the transcribed maintenance intervals without marking them confirmed', () => {
    expect(
      Object.fromEntries(
        NX200_TECHNICAL_CATALOG.maintenancePlan.map((item) => [item.id, item.intervalKm]),
      ),
    ).toMatchObject({
      'engine-oil': 1500,
      'drive-chain': 1000,
      'spark-plug': 3000,
      battery: 1000,
      'clutch-cable': 3000,
      brakes: 3000,
    });
    expect(
      NX200_TECHNICAL_CATALOG.maintenancePlan.every(
        (item) => item.technicalSource.status === 'needs-confirmation',
      ),
    ).toBe(true);
  });
});
