import { describe, expect, it } from 'vitest';
import { NX200_PROCEDURES, NX200_TECHNICAL_CLAIMS } from '../../data/nx200-demo.data';
import { validateProcedureCatalog } from './procedure-integrity';

const protectedIdentifiers = {
  'troca-de-oleo': {
    steps: [
      'oil-step-prepare',
      'oil-step-drain',
      'oil-step-seal',
      'oil-step-refill',
      'oil-step-level',
    ],
    warnings: ['oil-warning-stability', 'oil-warning-disposal'],
    checks: ['oil-check-level', 'oil-check-leaks', 'oil-check-fasteners'],
  },
  'ajuste-lubrificacao-corrente': {
    steps: [
      'chain-step-inspect',
      'chain-step-clean',
      'chain-step-measure',
      'chain-step-align',
      'chain-step-lubricate',
    ],
    warnings: ['chain-warning-engine-off', 'chain-warning-pinch'],
    checks: [
      'chain-check-slack',
      'chain-check-alignment',
      'chain-check-fasteners',
      'chain-check-excess',
    ],
  },
  'inspecao-da-vela': {
    steps: [
      'spark-step-clean',
      'spark-step-remove',
      'spark-step-inspect',
      'spark-step-gap',
      'spark-step-reinstall',
    ],
    warnings: ['spark-warning-cool'],
    checks: ['spark-check-cap', 'spark-check-engine', 'spark-check-noise'],
  },
  'verificacao-da-bateria': {
    steps: [
      'battery-step-inspect',
      'battery-step-terminals',
      'battery-step-voltage',
      'battery-step-finish',
    ],
    warnings: ['battery-warning-short', 'battery-warning-disconnect'],
    checks: ['battery-check-terminals', 'battery-check-cables', 'battery-check-start'],
  },
  'regulagem-cabo-embreagem': {
    steps: ['clutch-step-inspect', 'clutch-step-measure', 'clutch-step-adjust', 'clutch-step-lock'],
    warnings: ['clutch-warning-stable'],
    checks: ['clutch-check-return', 'clutch-check-freeplay', 'clutch-check-engagement'],
  },
  'inspecao-dos-freios': {
    steps: ['brake-step-controls', 'brake-step-wear', 'brake-step-leaks', 'brake-step-wheel'],
    warnings: ['brake-warning-critical', 'brake-warning-contamination'],
    checks: [
      'brake-check-controls',
      'brake-check-leaks',
      'brake-check-wheel',
      'brake-check-professional',
    ],
  },
} as const;

describe('procedure catalog integrity', () => {
  it('keeps stable, globally unique identifiers in every bundled procedure', () => {
    expect(validateProcedureCatalog(NX200_PROCEDURES)).toEqual([]);
  });

  it('protects slugs, steps, warnings and final checks referenced by existing executions', () => {
    expect(
      Object.fromEntries(
        NX200_PROCEDURES.map((procedure) => [
          procedure.slug,
          {
            steps: procedure.steps.map((step) => step.id),
            warnings: procedure.safetyWarnings.map((warning) => warning.id),
            checks: procedure.finalChecks.map((check) => check.id),
          },
        ]),
      ),
    ).toEqual(protectedIdentifiers);
  });

  it('rejects duplicated identifiers inside a procedure', () => {
    const procedure = NX200_PROCEDURES[0]!;
    const invalid = {
      ...procedure,
      finalChecks: [{ id: procedure.steps[0]!.id, label: 'Duplicado', required: true }],
    };
    expect(validateProcedureCatalog([invalid])).toHaveLength(1);
  });

  it('keeps all technical claims demonstrative and explicitly pending', () => {
    expect(
      NX200_TECHNICAL_CLAIMS.every(
        (claim) =>
          claim.status === 'demonstrative' &&
          claim.value.kind === 'text' &&
          claim.value.value === 'A confirmar' &&
          claim.citations.length === 0 &&
          claim.reviews.length === 0,
      ),
    ).toBe(true);
  });
});
