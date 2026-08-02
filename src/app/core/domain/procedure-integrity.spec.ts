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

const protectedResourceIdentifiers = {
  'troca-de-oleo': {
    tools: ['oil-tool-collector', 'oil-tool-wrench', 'oil-tool-funnel', 'oil-tool-torque'],
    materials: ['oil-material-oil', 'oil-material-seal'],
  },
  'ajuste-lubrificacao-corrente': {
    tools: ['chain-tool-brush', 'chain-tool-wrenches', 'chain-tool-ruler'],
    materials: ['chain-material-cleaner', 'chain-material-lubricant'],
  },
  'inspecao-da-vela': {
    tools: ['spark-tool-wrench', 'spark-tool-gauge', 'spark-tool-air'],
    materials: ['spark-material-cloth', 'spark-material-replacement'],
  },
  'verificacao-da-bateria': {
    tools: ['battery-tool-multimeter', 'battery-tool-wrench', 'battery-tool-brush'],
    materials: ['battery-material-protector', 'battery-material-cloth'],
  },
  'regulagem-cabo-embreagem': {
    tools: ['clutch-tool-ruler', 'clutch-tool-wrenches'],
    materials: ['clutch-material-lubricant'],
  },
  'inspecao-dos-freios': {
    tools: ['brake-tool-light', 'brake-tool-caliper', 'brake-tool-ruler'],
    materials: ['brake-material-cloth'],
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

  it('protects tool and material IDs used by preparation records', () => {
    expect(
      Object.fromEntries(
        NX200_PROCEDURES.map((procedure) => [
          procedure.slug,
          {
            tools: procedure.tools.map((tool) => tool.id),
            materials: procedure.materials.map((material) => material.id),
          },
        ]),
      ),
    ).toEqual(protectedResourceIdentifiers);
  });

  it('rejects duplicated identifiers inside a procedure', () => {
    const procedure = NX200_PROCEDURES[0]!;
    const invalid = {
      ...procedure,
      finalChecks: [{ id: procedure.steps[0]!.id, label: 'Duplicado', required: true }],
    };
    expect(validateProcedureCatalog([invalid])).toHaveLength(1);
  });

  it('keeps applicability confirmation separate from transcription review', () => {
    const transcribed = NX200_TECHNICAL_CLAIMS.filter((claim) => claim.status === 'transcribed');
    const pending = NX200_TECHNICAL_CLAIMS.filter((claim) => claim.status === 'demonstrative');
    expect(transcribed).toHaveLength(27);
    expect(pending).toHaveLength(4);
    expect(
      transcribed.every(
        (claim) =>
          claim.applicability.confirmation === 'confirmed' &&
          claim.citations.length > 0 &&
          claim.citations.every(
            (citation) => citation.page !== undefined && Boolean(citation.section),
          ) &&
          claim.reviews.length === 0,
      ),
    ).toBe(true);
    expect(
      pending.every(
        (claim) =>
          claim.value.kind === 'text' &&
          claim.value.value === 'A confirmar' &&
          claim.citations.length === 0,
      ),
    ).toBe(true);
  });

  it('continues requiring a service manual for torque, internal tolerance and cable routing', () => {
    const serviceManualRequired = [
      'spec-oil-drain-torque',
      'spec-rear-axle-torque',
      'spec-valve-clearance',
      'spec-spark-plug-torque',
      'spec-clutch-cable-routing',
    ];
    for (const id of serviceManualRequired) {
      expect(NX200_TECHNICAL_CLAIMS.find((claim) => claim.id === id)?.expectedSourceIds).toContain(
        'nx200-service-manual-pending',
      );
    }
  });
});
