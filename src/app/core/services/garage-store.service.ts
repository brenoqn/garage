import { computed, inject, Injectable, signal } from '@angular/core';
import {
  INITIAL_GARAGE_STATE,
  NX200_PROCEDURES,
  NX200_SPECIFICATIONS,
  NX200_TECHNICAL_CLAIMS,
  NX200_TECHNICAL_SOURCES,
} from '../../data/nx200-demo.data';
import { createGarageBackup } from '../domain/backup';
import { decodeStoredGarageState, validateGarageState } from '../domain/garage-state-migration';
import { evaluateOdometerUpdate } from '../domain/odometer-policy';
import {
  criticalProcedureCompletionBlocked,
  detectTechnicalConflicts,
} from '../domain/technical-content';
import {
  cancelProcedureExecution,
  completeProcedureStep,
  createProcedureExecution,
  finishProcedureExecution,
  linkProcedureExecutionToService,
  ProcedureExecutionResult,
  restartProcedureExecution,
  selectActiveProcedureExecution,
  setFinalCheckCompleted,
  skipOptionalProcedureStep,
  uncompleteProcedureStep,
} from '../domain/procedure-execution';
import { shouldReplaceMaintenanceExecution } from '../domain/service-chronology';
import { GarageState, GarageStateRecovery } from '../models/garage-state.model';
import { Motorcycle } from '../models/motorcycle.model';
import {
  OdometerRecord,
  OdometerUpdateRequest,
  OdometerUpdateResult,
} from '../models/odometer-record.model';
import { NewServiceRecord, ServiceRecord } from '../models/service-record.model';
import { ProcedureExecution } from '../models/procedure-execution.model';
import { LocalStorageAdapter } from '../storage/local-storage.adapter';
import { StoragePort } from '../storage/storage.port';

const STORAGE_KEY = 'state';

interface InitialLoad {
  readonly state: GarageState;
  readonly recovery?: GarageStateRecovery;
}

@Injectable({ providedIn: 'root' })
export class GarageStore {
  private readonly storage: StoragePort = inject(LocalStorageAdapter);
  private readonly initialLoad = this.loadInitialState();
  private readonly stateSignal = signal<GarageState>(this.initialLoad.state);
  private readonly recoverySignal = signal<GarageStateRecovery | undefined>(
    this.initialLoad.recovery,
  );

  readonly state = this.stateSignal.asReadonly();
  readonly motorcycle = computed(() => this.stateSignal().motorcycle);
  readonly maintenancePlan = computed(() => this.stateSignal().maintenancePlan);
  readonly serviceHistory = computed(() =>
    [...this.stateSignal().serviceHistory].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.mileage - a.mileage ||
        b.createdAt.localeCompare(a.createdAt),
    ),
  );
  readonly odometerHistory = computed(() =>
    [...this.stateSignal().odometerHistory].sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt),
    ),
  );
  readonly procedureExecutions = computed(() =>
    [...this.stateSignal().procedureExecutions].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
  );
  readonly activeProcedureExecutions = computed(() =>
    this.procedureExecutions().filter((execution) => execution.status === 'in-progress'),
  );
  readonly settings = computed(() => this.stateSignal().settings);
  readonly setup = computed(() => this.stateSignal().setup);
  readonly recovery = this.recoverySignal.asReadonly();
  readonly procedures = signal(NX200_PROCEDURES).asReadonly();
  readonly specifications = signal(NX200_SPECIFICATIONS).asReadonly();
  readonly technicalClaims = signal(NX200_TECHNICAL_CLAIMS).asReadonly();
  readonly technicalSources = signal(NX200_TECHNICAL_SOURCES).asReadonly();

  startProcedure(
    procedureSlug: string,
    acknowledgedWarningIds: readonly string[],
  ): ProcedureExecutionResult {
    const blocked = this.procedureMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const procedure = NX200_PROCEDURES.find((candidate) => candidate.slug === procedureSlug);
    if (!procedure) return { ok: false, error: 'Procedimento não encontrado.' };
    const active = selectActiveProcedureExecution(
      this.stateSignal().procedureExecutions,
      this.motorcycle().id,
      procedureSlug,
    );
    if (active) {
      return { ok: false, error: 'Este procedimento já possui uma execução em andamento.' };
    }
    const result = createProcedureExecution(
      procedure,
      this.motorcycle().id,
      acknowledgedWarningIds,
      new Date().toISOString(),
      this.createId('procedure'),
    );
    if (!result.ok) return result;
    return this.persist({
      ...this.stateSignal(),
      procedureExecutions: [result.execution, ...this.stateSignal().procedureExecutions],
    })
      ? result
      : { ok: false, error: 'Não foi possível salvar o início do procedimento.' };
  }

  completeProcedureStep(executionId: string, stepId: string): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      completeProcedureStep(procedure, execution, stepId, now),
    );
  }

  uncompleteProcedureStep(executionId: string, stepId: string): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      uncompleteProcedureStep(procedure, execution, stepId, now),
    );
  }

  skipOptionalProcedureStep(executionId: string, stepId: string): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      skipOptionalProcedureStep(procedure, execution, stepId, now),
    );
  }

  setProcedureFinalCheck(
    executionId: string,
    checkId: string,
    completed: boolean,
  ): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      setFinalCheckCompleted(procedure, execution, checkId, completed, now),
    );
  }

  finishProcedure(executionId: string, note?: string): ProcedureExecutionResult {
    const execution = this.stateSignal().procedureExecutions.find(
      (candidate) => candidate.id === executionId,
    );
    const procedure = execution
      ? NX200_PROCEDURES.find((candidate) => candidate.slug === execution.procedureSlug)
      : undefined;
    if (procedure) {
      const claimIds = new Set(procedure.technicalClaimIds);
      const claims = NX200_TECHNICAL_CLAIMS.filter((claim) => claimIds.has(claim.id));
      if (criticalProcedureCompletionBlocked(procedure.riskLevel, claims)) {
        return {
          ok: false,
          error:
            'Este procedimento possui informações técnicas conflitantes e não pode ser concluído até a resolução editorial.',
        };
      }
      const conflicts = detectTechnicalConflicts(claims);
      if (conflicts.length > 0) {
        return { ok: false, error: 'Existem fontes técnicas divergentes neste procedimento.' };
      }
    }
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      finishProcedureExecution(procedure, execution, now, note),
    );
  }

  cancelProcedure(executionId: string): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (_procedure, execution, now) =>
      cancelProcedureExecution(execution, now),
    );
  }

  restartProcedure(executionId: string): ProcedureExecutionResult {
    const blocked = this.procedureMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const execution = this.stateSignal().procedureExecutions.find(
      (candidate) => candidate.id === executionId,
    );
    if (!execution) return { ok: false, error: 'Execução não encontrada.' };
    const procedure = NX200_PROCEDURES.find(
      (candidate) => candidate.slug === execution.procedureSlug,
    );
    if (!procedure) return { ok: false, error: 'Procedimento não encontrado.' };
    const result = restartProcedureExecution(
      procedure,
      execution,
      new Date().toISOString(),
      this.createId('procedure'),
    );
    if (!result.ok) return result;
    const nextExecutions = this.stateSignal().procedureExecutions.map((candidate) =>
      candidate.id === executionId ? result.cancelled : candidate,
    );
    const persisted = this.persist({
      ...this.stateSignal(),
      procedureExecutions: [result.restarted, ...nextExecutions],
    });
    return persisted
      ? { ok: true, execution: result.restarted }
      : { ok: false, error: 'Não foi possível reiniciar o procedimento.' };
  }

  updateMileage(request: OdometerUpdateRequest): OdometerUpdateResult {
    const currentMileage = this.motorcycle().currentMileage;
    if (!this.setup().completed) {
      return {
        status: 'blocked',
        previousMileage: currentMileage,
        requestedMileage: request.mileage,
        impact: 'Conclua a configuração da sua NX200 antes de atualizar o odômetro.',
      };
    }
    const result = evaluateOdometerUpdate(currentMileage, request);
    if (result.status !== 'updated') {
      return result;
    }
    if (this.recoverySignal()) {
      return {
        ...result,
        status: 'blocked',
        impact: 'Resolva a recuperação dos dados locais em Ajustes antes de salvar alterações.',
      };
    }

    const recordedAt = request.recordedAt ?? new Date().toISOString();
    const mileageChanged = request.mileage !== this.motorcycle().currentMileage;
    const odometerHistory = mileageChanged
      ? [this.createOdometerRecord(request, recordedAt), ...this.stateSignal().odometerHistory]
      : this.stateSignal().odometerHistory;
    const persisted = this.persist({
      ...this.stateSignal(),
      motorcycle: {
        ...this.motorcycle(),
        currentMileage: request.mileage,
        updatedAt: recordedAt,
      },
      odometerHistory,
    });

    return persisted
      ? result
      : {
          ...result,
          status: 'blocked',
          impact: 'Não foi possível gravar a atualização neste dispositivo.',
        };
  }

  saveMotorcycle(
    changes: Pick<Motorcycle, 'nickname' | 'year'>,
    request: OdometerUpdateRequest,
  ): OdometerUpdateResult {
    if (!this.setup().completed) {
      return {
        status: 'blocked',
        previousMileage: this.motorcycle().currentMileage,
        requestedMileage: request.mileage,
        impact: 'Use a configuração inicial para confirmar os primeiros dados da sua NX200.',
      };
    }
    const result = evaluateOdometerUpdate(this.motorcycle().currentMileage, request);
    if (result.status !== 'updated' || this.recoverySignal()) {
      return this.recoverySignal()
        ? {
            ...result,
            status: 'blocked',
            impact: 'Resolva a recuperação dos dados locais em Ajustes antes de salvar alterações.',
          }
        : result;
    }

    const recordedAt = request.recordedAt ?? new Date().toISOString();
    const mileageChanged = request.mileage !== this.motorcycle().currentMileage;
    const odometerHistory = mileageChanged
      ? [this.createOdometerRecord(request, recordedAt), ...this.stateSignal().odometerHistory]
      : this.stateSignal().odometerHistory;
    const persisted = this.persist({
      ...this.stateSignal(),
      motorcycle: {
        ...this.motorcycle(),
        ...changes,
        currentMileage: request.mileage,
        updatedAt: recordedAt,
      },
      odometerHistory,
    });

    return persisted
      ? result
      : {
          ...result,
          status: 'blocked',
          impact: 'Não foi possível gravar as alterações neste dispositivo.',
        };
  }

  completeSetup(
    changes: Pick<Motorcycle, 'nickname' | 'year' | 'currentMileage'>,
    note?: string,
  ): boolean {
    if (this.recoverySignal()) {
      return false;
    }
    const setupValidation = evaluateOdometerUpdate(0, {
      mileage: changes.currentMileage,
      source: 'setup',
    });
    if (setupValidation.status !== 'updated') {
      return false;
    }
    const recordedAt = new Date().toISOString();
    const request: OdometerUpdateRequest = {
      mileage: changes.currentMileage,
      source: 'setup',
      note: note?.trim() || 'Quilometragem confirmada na configuração inicial.',
      confirmedRegression: true,
    };
    const record = this.createOdometerRecord(request, recordedAt);
    return this.persist({
      ...this.stateSignal(),
      motorcycle: {
        ...this.motorcycle(),
        ...changes,
        updatedAt: recordedAt,
      },
      odometerHistory: [record, ...this.stateSignal().odometerHistory],
      setup: { completed: true, demoData: false },
    });
  }

  addService(input: NewServiceRecord): ServiceRecord | null {
    if (this.recoverySignal() || !this.setup().completed) {
      return null;
    }
    const createdAt = new Date().toISOString();
    const record: ServiceRecord = {
      ...input,
      id: this.createId('service'),
      createdAt,
    };
    let procedureExecutions = this.stateSignal().procedureExecutions;
    if (record.procedureExecutionId) {
      const execution = procedureExecutions.find(
        (candidate) => candidate.id === record.procedureExecutionId,
      );
      if (!execution || execution.procedureSlug !== record.procedureSlug) return null;
      const linked = linkProcedureExecutionToService(execution, record.id, createdAt);
      if (!linked.ok) return null;
      procedureExecutions = procedureExecutions.map((candidate) =>
        candidate.id === execution.id ? linked.execution : candidate,
      );
    }
    const odometerRecord: OdometerRecord = {
      id: this.createId('odometer'),
      motorcycleId: this.motorcycle().id,
      mileage: record.mileage,
      recordedAt: createdAt,
      source: 'service',
      note: `Leitura registrada com o serviço “${record.title}”.`,
      serviceRecordId: record.id,
    };

    const nextState: GarageState = {
      ...this.stateSignal(),
      motorcycle:
        record.mileage > this.motorcycle().currentMileage
          ? {
              ...this.motorcycle(),
              currentMileage: record.mileage,
              updatedAt: createdAt,
            }
          : this.motorcycle(),
      serviceHistory: [record, ...this.stateSignal().serviceHistory],
      odometerHistory: [odometerRecord, ...this.stateSignal().odometerHistory],
      maintenancePlan: this.stateSignal().maintenancePlan.map((item) =>
        item.id === record.maintenancePlanId &&
        shouldReplaceMaintenanceExecution(item.lastExecution, record)
          ? {
              ...item,
              lastExecution: {
                date: record.date,
                mileage: record.mileage,
                serviceRecordId: record.id,
              },
            }
          : item,
      ),
      procedureExecutions,
    };

    return this.persist(nextState) ? record : null;
  }

  updateSettings(maintenanceAlertsEnabled: boolean): boolean {
    return this.persist({
      ...this.stateSignal(),
      settings: { ...this.settings(), maintenanceAlertsEnabled },
    });
  }

  resetDemoData(): boolean {
    return this.replaceState(INITIAL_GARAGE_STATE);
  }

  exportData(exportedAt = new Date().toISOString()): string {
    return createGarageBackup(this.stateSignal(), exportedAt);
  }

  exportRecoveryData(): string | null {
    return this.recoverySignal()?.rawValue ?? null;
  }

  importState(state: GarageState): boolean {
    return this.replaceState(state);
  }

  private loadInitialState(): InitialLoad {
    let rawValue: string | null;
    try {
      rawValue = this.storage.getRaw(STORAGE_KEY);
    } catch {
      return {
        state: INITIAL_GARAGE_STATE,
        recovery: {
          kind: 'persistence-error',
          message:
            'O navegador bloqueou o acesso aos dados locais. Nenhum conteúdo foi substituído.',
          rawValue: '',
        },
      };
    }
    const result = decodeStoredGarageState(rawValue, INITIAL_GARAGE_STATE, NX200_PROCEDURES);
    if (result.kind === 'migrated') {
      try {
        this.storage.setRaw(STORAGE_KEY, JSON.stringify(result.state));
      } catch {
        return {
          state: result.state,
          recovery: {
            kind: 'persistence-error',
            message:
              'Os dados foram migrados em memória, mas não puderam ser gravados neste dispositivo.',
            rawValue: rawValue ?? '',
          },
        };
      }
    }
    if (result.kind === 'invalid-state' || result.kind === 'future-version') {
      return {
        state: result.state,
        recovery: {
          kind: result.kind,
          message: result.message,
          rawValue: result.rawValue,
        },
      };
    }
    return { state: result.state };
  }

  private replaceState(state: GarageState): boolean {
    if (!validateGarageState(state, NX200_PROCEDURES).valid) {
      return false;
    }
    try {
      this.storage.set(STORAGE_KEY, state);
      this.stateSignal.set(state);
      this.recoverySignal.set(undefined);
      return true;
    } catch {
      return false;
    }
  }

  private persist(nextState: GarageState): boolean {
    if (this.recoverySignal()) {
      return false;
    }
    if (!validateGarageState(nextState, NX200_PROCEDURES).valid) {
      return false;
    }
    try {
      this.storage.set(STORAGE_KEY, nextState);
      this.stateSignal.set(nextState);
      return true;
    } catch {
      let rawValue = '';
      try {
        rawValue = this.storage.getRaw(STORAGE_KEY) ?? '';
      } catch {
        // The previous state is still kept by the storage implementation.
      }
      this.recoverySignal.set({
        kind: 'persistence-error',
        message:
          'O navegador recusou a gravação. Os dados anteriores foram mantidos e novas alterações estão bloqueadas.',
        rawValue,
      });
      return false;
    }
  }

  private createOdometerRecord(request: OdometerUpdateRequest, recordedAt: string): OdometerRecord {
    return {
      id: this.createId('odometer'),
      motorcycleId: this.motorcycle().id,
      mileage: request.mileage,
      recordedAt,
      source: request.source,
      note: request.note?.trim() || undefined,
    };
  }

  private changeProcedureExecution(
    executionId: string,
    mutation: (
      procedure: (typeof NX200_PROCEDURES)[number],
      execution: ProcedureExecution,
      now: string,
    ) => ProcedureExecutionResult,
  ): ProcedureExecutionResult {
    const blocked = this.procedureMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const execution = this.stateSignal().procedureExecutions.find(
      (candidate) => candidate.id === executionId,
    );
    if (!execution) return { ok: false, error: 'Execução não encontrada.' };
    const procedure = NX200_PROCEDURES.find(
      (candidate) => candidate.slug === execution.procedureSlug,
    );
    if (!procedure) return { ok: false, error: 'Procedimento não encontrado.' };
    const result = mutation(procedure, execution, new Date().toISOString());
    if (!result.ok) return result;
    const persisted = this.persist({
      ...this.stateSignal(),
      procedureExecutions: this.stateSignal().procedureExecutions.map((candidate) =>
        candidate.id === execution.id ? result.execution : candidate,
      ),
    });
    return persisted
      ? result
      : { ok: false, error: 'Não foi possível salvar a execução do procedimento.' };
  }

  private procedureMutationBlock(): string | null {
    if (!this.setup().completed) return 'Conclua a configuração inicial antes de começar.';
    if (this.recoverySignal()) return 'Resolva a recuperação dos dados locais antes de continuar.';
    return null;
  }

  private createId(prefix: string): string {
    return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}`;
  }
}
