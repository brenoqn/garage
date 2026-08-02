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
});
