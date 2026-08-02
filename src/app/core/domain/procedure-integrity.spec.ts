import { describe, expect, it } from 'vitest';
import { NX200_PROCEDURES } from '../../data/nx200-demo.data';
import { validateProcedureCatalog } from './procedure-integrity';

describe('procedure catalog integrity', () => {
  it('keeps stable, globally unique identifiers in every bundled procedure', () => {
    expect(validateProcedureCatalog(NX200_PROCEDURES)).toEqual([]);
  });

  it('rejects duplicated identifiers inside a procedure', () => {
    const procedure = NX200_PROCEDURES[0];
    const invalid = {
      ...procedure,
      finalChecks: [{ id: procedure.steps[0]!.id, label: 'Duplicado', required: true }],
    };
    expect(validateProcedureCatalog([invalid])).toHaveLength(1);
  });

  it('keeps every unverified technical value explicitly pending', () => {
    expect(
      NX200_PROCEDURES.flatMap((procedure) => procedure.technicalValues).every(
        (item) => item.value === 'A confirmar' && item.source.status === 'needs-confirmation',
      ),
    ).toBe(true);
  });
});
