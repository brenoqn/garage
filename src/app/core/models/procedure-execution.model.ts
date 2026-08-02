export type ProcedureExecutionStatus = 'in-progress' | 'completed' | 'cancelled';

export interface ProcedureExecution {
  readonly id: string;
  readonly motorcycleId: string;
  readonly procedureSlug: string;
  readonly status: ProcedureExecutionStatus;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
  readonly cancelledAt?: string;
  readonly completedStepIds: readonly string[];
  readonly completedFinalCheckIds: readonly string[];
  readonly acknowledgedWarningIds: readonly string[];
  readonly currentStepId?: string;
  readonly note?: string;
  readonly resultingServiceRecordId?: string;
}

export interface ProcedureProgress {
  readonly completedRequiredSteps: number;
  readonly totalRequiredSteps: number;
  readonly completedOptionalSteps: number;
  readonly totalOptionalSteps: number;
  readonly percent: number;
}
