import { describe, expect, it } from 'vitest';
import { Procedure } from '../models/procedure.model';
import {
  calculateProcedureProgress,
  cancelProcedureExecution,
  completeProcedureStep,
  createProcedureExecution,
  finishProcedureExecution,
  linkProcedureExecutionToService,
  restartProcedureExecution,
  selectActiveProcedureExecution,
  setFinalCheckCompleted,
  skipOptionalProcedureStep,
  uncompleteProcedureStep,
} from './procedure-execution';

const procedure: Procedure = {
  slug: 'test-procedure',
  title: 'Procedimento de teste',
  category: 'Teste',
  description: 'Somente para testes.',
  difficulty: 'easy',
  riskLevel: 'low',
  riskNote: 'Fixture controlada.',
  estimatedMinutes: 10,
  tools: [{ id: 'tool-1', name: 'Ferramenta' }],
  materials: [],
  safetyWarnings: [{ id: 'warning-1', text: 'Alerta' }],
  steps: [
    { id: 'required-1', title: 'Obrigatória 1', description: 'Faça.', required: true },
    { id: 'optional-1', title: 'Opcional', description: 'Opcional.', required: false },
    { id: 'required-2', title: 'Obrigatória 2', description: 'Faça.', required: true },
  ],
  technicalClaimIds: [],
  primarySourceIds: [],
  applicability: {
    manufacturer: 'Honda',
    model: 'NX200',
    confirmation: 'confirmed',
  },
  editorialRevision: {
    version: 1,
    revisedAt: '2026-08-02',
    summary: 'Fixture de teste.',
    status: 'confirmed',
  },
  commonMistakes: [],
  finalChecks: [{ id: 'check-1', label: 'Conferir', required: true }],
};

function start() {
  const result = createProcedureExecution(
    procedure,
    'motorcycle-1',
    ['warning-1'],
    '2026-08-01T10:00:00.000Z',
    'execution-1',
  );
  if (!result.ok) throw new Error(result.error);
  return result.execution;
}

describe('procedure execution rules', () => {
  it('requires every warning acknowledgement before starting', () => {
    expect(
      createProcedureExecution(
        procedure,
        'motorcycle-1',
        [],
        '2026-08-01T10:00:00.000Z',
        'execution-1',
      ).ok,
    ).toBe(false);
  });

  it('counts only required steps in the main percentage', () => {
    const optional = completeProcedureStep(
      procedure,
      start(),
      'optional-1',
      '2026-08-01T10:01:00.000Z',
    );
    if (!optional.ok) throw new Error(optional.error);

    expect(calculateProcedureProgress(procedure, optional.execution)).toEqual({
      completedRequiredSteps: 0,
      totalRequiredSteps: 2,
      completedOptionalSteps: 1,
      totalOptionalSteps: 1,
      percent: 0,
    });
  });

  it('allows skipping only optional steps without marking them complete', () => {
    const skipped = skipOptionalProcedureStep(
      procedure,
      start(),
      'optional-1',
      '2026-08-01T10:01:00.000Z',
    );
    expect(skipped.ok).toBe(true);
    if (skipped.ok) expect(skipped.execution.completedStepIds).not.toContain('optional-1');
    expect(
      skipOptionalProcedureStep(procedure, start(), 'required-1', '2026-08-01T10:01:00.000Z').ok,
    ).toBe(false);
  });

  it('preserves later progress when an earlier step is unchecked', () => {
    let execution = start();
    for (const id of ['required-1', 'required-2']) {
      const result = completeProcedureStep(procedure, execution, id, '2026-08-01T10:02:00.000Z');
      if (!result.ok) throw new Error(result.error);
      execution = result.execution;
    }
    const unchecked = uncompleteProcedureStep(
      procedure,
      execution,
      'required-1',
      '2026-08-01T10:03:00.000Z',
    );
    if (!unchecked.ok) throw new Error(unchecked.error);
    expect(unchecked.execution.completedStepIds).toEqual(['required-2']);
    expect(unchecked.execution.currentStepId).toBe('required-1');
  });

  it('blocks completion until required steps and final checks are complete', () => {
    let execution = start();
    expect(finishProcedureExecution(procedure, execution, '2026-08-01T10:10:00.000Z').ok).toBe(
      false,
    );
    for (const id of ['required-1', 'required-2']) {
      const result = completeProcedureStep(procedure, execution, id, '2026-08-01T10:02:00.000Z');
      if (!result.ok) throw new Error(result.error);
      execution = result.execution;
    }
    const checked = setFinalCheckCompleted(
      procedure,
      execution,
      'check-1',
      true,
      '2026-08-01T10:03:00.000Z',
    );
    if (!checked.ok) throw new Error(checked.error);
    const finished = finishProcedureExecution(
      procedure,
      checked.execution,
      '2026-08-01T10:10:00.000Z',
      'Tudo conferido',
    );
    expect(finished.ok).toBe(true);
    if (finished.ok)
      expect(finished.execution).toMatchObject({ status: 'completed', note: 'Tudo conferido' });
  });

  it('restarts by cancelling the old execution and creating a clean one', () => {
    const restarted = restartProcedureExecution(
      procedure,
      start(),
      '2026-08-01T10:05:00.000Z',
      'execution-2',
    );
    expect(restarted.ok).toBe(true);
    if (restarted.ok) {
      expect(restarted.cancelled.status).toBe('cancelled');
      expect(restarted.restarted).toMatchObject({
        id: 'execution-2',
        status: 'in-progress',
        completedStepIds: [],
      });
    }
  });

  it('cancels while preserving progress and selects the most recently updated active run', () => {
    const older = start();
    const newer = { ...older, id: 'execution-2', updatedAt: '2026-08-01T11:00:00.000Z' };
    expect(selectActiveProcedureExecution([older, newer], 'motorcycle-1', procedure.slug)?.id).toBe(
      'execution-2',
    );
    const cancelled = cancelProcedureExecution(older, '2026-08-01T12:00:00.000Z');
    expect(cancelled.ok).toBe(true);
    if (cancelled.ok) {
      expect(cancelled.execution).toMatchObject({
        status: 'cancelled',
        cancelledAt: '2026-08-01T12:00:00.000Z',
        completedStepIds: [],
      });
    }
  });

  it('links a completed execution to one service and rejects a duplicate link', () => {
    let execution = start();
    for (const id of ['required-1', 'required-2']) {
      const result = completeProcedureStep(procedure, execution, id, '2026-08-01T10:02:00.000Z');
      if (!result.ok) throw new Error(result.error);
      execution = result.execution;
    }
    const checked = setFinalCheckCompleted(
      procedure,
      execution,
      'check-1',
      true,
      '2026-08-01T10:03:00.000Z',
    );
    if (!checked.ok) throw new Error(checked.error);
    const finished = finishProcedureExecution(
      procedure,
      checked.execution,
      '2026-08-01T10:10:00.000Z',
    );
    if (!finished.ok) throw new Error(finished.error);
    const linked = linkProcedureExecutionToService(
      finished.execution,
      'service-1',
      '2026-08-01T10:11:00.000Z',
    );
    expect(linked.ok).toBe(true);
    if (linked.ok) {
      expect(linked.execution.resultingServiceRecordId).toBe('service-1');
      expect(
        linkProcedureExecutionToService(linked.execution, 'service-2', '2026-08-01T10:12:00.000Z')
          .ok,
      ).toBe(false);
    }
  });
});
