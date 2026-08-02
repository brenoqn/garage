import { Procedure, ProcedureStep } from '../models/procedure.model';
import { ProcedureExecution, ProcedureProgress } from '../models/procedure-execution.model';

export type ProcedureExecutionResult =
  | { readonly ok: true; readonly execution: ProcedureExecution }
  | { readonly ok: false; readonly error: string };

function failure(error: string): ProcedureExecutionResult {
  return { ok: false, error };
}

function success(execution: ProcedureExecution): ProcedureExecutionResult {
  return { ok: true, execution };
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function nextIncompleteStep(
  procedure: Procedure,
  completedStepIds: readonly string[],
  afterStepId?: string,
): ProcedureStep | undefined {
  const completed = new Set(completedStepIds);
  const startIndex = afterStepId
    ? Math.max(0, procedure.steps.findIndex((step) => step.id === afterStepId) + 1)
    : 0;
  return (
    procedure.steps.slice(startIndex).find((step) => !completed.has(step.id)) ??
    procedure.steps.find((step) => !completed.has(step.id))
  );
}

export function createProcedureExecution(
  procedure: Procedure,
  motorcycleId: string,
  acknowledgedWarningIds: readonly string[],
  now: string,
  id: string,
): ProcedureExecutionResult {
  const validWarnings = new Set(procedure.safetyWarnings.map((warning) => warning.id));
  const acknowledged = unique(acknowledgedWarningIds);
  if (procedure.safetyWarnings.some((warning) => !acknowledged.includes(warning.id))) {
    return failure('Confirme todos os alertas de segurança antes de iniciar.');
  }
  if (acknowledged.some((warningId) => !validWarnings.has(warningId))) {
    return failure('A confirmação contém um alerta de segurança desconhecido.');
  }

  return success({
    id,
    motorcycleId,
    procedureSlug: procedure.slug,
    status: 'in-progress',
    startedAt: now,
    updatedAt: now,
    completedStepIds: [],
    completedFinalCheckIds: [],
    acknowledgedWarningIds: acknowledged,
    currentStepId: procedure.steps[0]?.id,
  });
}

export function calculateProcedureProgress(
  procedure: Procedure,
  execution: ProcedureExecution,
): ProcedureProgress {
  const completed = new Set(execution.completedStepIds);
  const required = procedure.steps.filter((step) => step.required);
  const optional = procedure.steps.filter((step) => !step.required);
  const completedRequiredSteps = required.filter((step) => completed.has(step.id)).length;
  const completedOptionalSteps = optional.filter((step) => completed.has(step.id)).length;
  return {
    completedRequiredSteps,
    totalRequiredSteps: required.length,
    completedOptionalSteps,
    totalOptionalSteps: optional.length,
    percent:
      required.length === 0 ? 100 : Math.round((completedRequiredSteps / required.length) * 100),
  };
}

export function completeProcedureStep(
  procedure: Procedure,
  execution: ProcedureExecution,
  stepId: string,
  now: string,
): ProcedureExecutionResult {
  if (execution.status !== 'in-progress') {
    return failure('Somente uma execução em andamento pode ser alterada.');
  }
  if (!procedure.steps.some((step) => step.id === stepId)) {
    return failure('A etapa não pertence a este procedimento.');
  }
  const completedStepIds = unique([...execution.completedStepIds, stepId]);
  return success({
    ...execution,
    completedStepIds,
    currentStepId: nextIncompleteStep(procedure, completedStepIds, stepId)?.id,
    updatedAt: now,
  });
}

export function uncompleteProcedureStep(
  procedure: Procedure,
  execution: ProcedureExecution,
  stepId: string,
  now: string,
): ProcedureExecutionResult {
  if (execution.status !== 'in-progress') {
    return failure('Somente uma execução em andamento pode ser alterada.');
  }
  if (!procedure.steps.some((step) => step.id === stepId)) {
    return failure('A etapa não pertence a este procedimento.');
  }
  return success({
    ...execution,
    completedStepIds: execution.completedStepIds.filter((id) => id !== stepId),
    currentStepId: stepId,
    updatedAt: now,
  });
}

export function skipOptionalProcedureStep(
  procedure: Procedure,
  execution: ProcedureExecution,
  stepId: string,
  now: string,
): ProcedureExecutionResult {
  if (execution.status !== 'in-progress') {
    return failure('Somente uma execução em andamento pode ser alterada.');
  }
  const step = procedure.steps.find((candidate) => candidate.id === stepId);
  if (!step || step.required) {
    return failure('Somente etapas opcionais podem ser puladas.');
  }
  return success({
    ...execution,
    currentStepId: nextIncompleteStep(procedure, execution.completedStepIds, stepId)?.id,
    updatedAt: now,
  });
}

export function setFinalCheckCompleted(
  procedure: Procedure,
  execution: ProcedureExecution,
  checkId: string,
  completed: boolean,
  now: string,
): ProcedureExecutionResult {
  if (execution.status !== 'in-progress') {
    return failure('Somente uma execução em andamento pode ser alterada.');
  }
  if (!procedure.finalChecks.some((check) => check.id === checkId)) {
    return failure('A verificação não pertence a este procedimento.');
  }
  const completedFinalCheckIds = completed
    ? unique([...execution.completedFinalCheckIds, checkId])
    : execution.completedFinalCheckIds.filter((id) => id !== checkId);
  return success({ ...execution, completedFinalCheckIds, updatedAt: now });
}

export function canFinishProcedure(procedure: Procedure, execution: ProcedureExecution): boolean {
  const completedSteps = new Set(execution.completedStepIds);
  const completedChecks = new Set(execution.completedFinalCheckIds);
  return (
    execution.status === 'in-progress' &&
    procedure.steps.filter((step) => step.required).every((step) => completedSteps.has(step.id)) &&
    procedure.finalChecks
      .filter((check) => check.required)
      .every((check) => completedChecks.has(check.id))
  );
}

export function finishProcedureExecution(
  procedure: Procedure,
  execution: ProcedureExecution,
  now: string,
  note?: string,
): ProcedureExecutionResult {
  if (!canFinishProcedure(procedure, execution)) {
    return failure('Conclua as etapas e verificações obrigatórias antes de finalizar.');
  }
  return success({
    ...execution,
    status: 'completed',
    completedAt: now,
    updatedAt: now,
    currentStepId: undefined,
    note: note?.trim() || undefined,
  });
}

export function cancelProcedureExecution(
  execution: ProcedureExecution,
  now: string,
): ProcedureExecutionResult {
  if (execution.status !== 'in-progress') {
    return failure('Esta execução não está em andamento.');
  }
  return success({
    ...execution,
    status: 'cancelled',
    cancelledAt: now,
    updatedAt: now,
    currentStepId: undefined,
  });
}

export function restartProcedureExecution(
  procedure: Procedure,
  execution: ProcedureExecution,
  now: string,
  newId: string,
):
  | {
      readonly ok: true;
      readonly cancelled: ProcedureExecution;
      readonly restarted: ProcedureExecution;
    }
  | { readonly ok: false; readonly error: string } {
  const cancelled = cancelProcedureExecution(execution, now);
  if (!cancelled.ok) {
    return cancelled;
  }
  const restarted = createProcedureExecution(
    procedure,
    execution.motorcycleId,
    execution.acknowledgedWarningIds,
    now,
    newId,
  );
  return restarted.ok
    ? { ok: true, cancelled: cancelled.execution, restarted: restarted.execution }
    : restarted;
}

export function selectActiveProcedureExecution(
  executions: readonly ProcedureExecution[],
  motorcycleId: string,
  procedureSlug?: string,
): ProcedureExecution | undefined {
  return [...executions]
    .filter(
      (execution) =>
        execution.status === 'in-progress' &&
        execution.motorcycleId === motorcycleId &&
        (!procedureSlug || execution.procedureSlug === procedureSlug),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function linkProcedureExecutionToService(
  execution: ProcedureExecution,
  serviceRecordId: string,
  now: string,
): ProcedureExecutionResult {
  if (execution.status !== 'completed') {
    return failure('Somente uma execução concluída pode ser vinculada a um serviço.');
  }
  if (execution.resultingServiceRecordId) {
    return failure('Esta execução já está vinculada a um serviço.');
  }
  return success({ ...execution, resultingServiceRecordId: serviceRecordId, updatedAt: now });
}
