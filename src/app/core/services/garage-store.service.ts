import { computed, inject, Injectable, signal } from '@angular/core';
import type { GarageSnapshot, ImportPreview } from '../../../../shared/garage';
import { ApiFailureKind, ApiResult, GarageApiClient } from '../api/garage-api.client';
import {
  INITIAL_GARAGE_STATE,
  NX200_PROCEDURES,
  NX200_SPECIFICATIONS,
  NX200_TECHNICAL_CLAIMS,
  NX200_TECHNICAL_SOURCES,
} from '../../data/nx200-demo.data';
import { NX200_PRE_RIDE_CHECKLIST } from '../../data/nx200/safety/nx200-pre-ride-checklist.data';
import { createGarageBackup } from '../domain/backup';
import { validateNewFuelRecord } from '../domain/fuel-consumption';
import { decodeStoredGarageState, validateGarageState } from '../domain/garage-state-migration';
import {
  applyUserSchedule,
  createUserMaintenanceItem,
  MaintenanceScheduleInput,
  NewUserMaintenanceItem,
  planItemRemovalError,
  PlanResult,
  updateUserMaintenanceItem,
  USER_PLAN_ITEM_ID_PREFIX,
} from '../domain/maintenance-plan';
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
import { buildSafetyCheckRecord, SafetyCheckResult } from '../domain/safety-check';
import { ExpenseRecord, NewExpenseRecord } from '../models/expense-record.model';
import { FuelRecord, NewFuelRecord } from '../models/fuel-record.model';
import { GarageState, GarageStateRecovery, GarageTheme } from '../models/garage-state.model';
import { MaintenancePlanItem } from '../models/maintenance.model';
import { Motorcycle } from '../models/motorcycle.model';
import {
  OdometerRecord,
  OdometerUpdateRequest,
  OdometerUpdateResult,
} from '../models/odometer-record.model';
import { NewOccurrenceRecord, OccurrenceRecord } from '../models/occurrence-record.model';
import { ProcedureExecution } from '../models/procedure-execution.model';
import { NewSafetyCheckRecord } from '../models/safety-check.model';
import { NewServiceRecord, ServiceRecord } from '../models/service-record.model';
import { LocalStorageAdapter } from '../storage/local-storage.adapter';
import { StoragePort } from '../storage/storage.port';

const STORAGE_KEY = 'state';
/** Preferência de destino dos dados, separada de `garage_state` (chave física `garage_mode`). */
const MODE_KEY = 'mode';

export type GarageMode = 'local' | 'server';

export type RemoteStatus =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly snapshot: GarageSnapshot['status'] }
  | {
      readonly status: 'error';
      readonly kind: ApiFailureKind | 'invalid';
      readonly message: string;
    };

export type StoreResult<T = undefined> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

type RemoteCommand =
  | { readonly ok: true; readonly ids: readonly string[] }
  | { readonly ok: false; readonly error: string };

interface InitialLoad {
  readonly state: GarageState;
  readonly recovery?: GarageStateRecovery;
}

@Injectable({ providedIn: 'root' })
export class GarageStore {
  private readonly storage: StoragePort = inject(LocalStorageAdapter);
  private readonly api = inject(GarageApiClient);
  private readonly modeSignal = signal<GarageMode>(this.readMode());
  private readonly initialLoad: InitialLoad =
    this.modeSignal() === 'server' ? { state: INITIAL_GARAGE_STATE } : this.loadInitialState();
  private readonly remoteSignal = signal<RemoteStatus>(
    this.modeSignal() === 'server' ? { status: 'loading' } : { status: 'idle' },
  );
  private readonly pendingSignal = signal(0);
  private readonly remoteLoadedSignal = signal(false);
  private revision = '0';
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
  readonly fuelHistory = computed(() =>
    [...this.stateSignal().fuelHistory].sort((a, b) => b.fueledAt.localeCompare(a.fueledAt)),
  );
  readonly expenseHistory = computed(() =>
    [...this.stateSignal().expenseHistory].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    ),
  );
  readonly occurrenceHistory = computed(() =>
    [...this.stateSignal().occurrenceHistory].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    ),
  );
  readonly safetyCheckHistory = computed(() =>
    [...this.stateSignal().safetyCheckHistory].sort((a, b) =>
      b.checkedAt.localeCompare(a.checkedAt),
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
  readonly safetyChecklist = signal(NX200_PRE_RIDE_CHECKLIST).asReadonly();
  /** `local`: dados só neste navegador. `server`: Garage API, com o navegador como leitor. */
  readonly mode = this.modeSignal.asReadonly();
  readonly remote = this.remoteSignal.asReadonly();
  /** Há uma escrita aguardando o servidor. */
  readonly busy = computed(() => this.pendingSignal() > 0);
  /** No modo servidor, só existe estado para exibir depois do primeiro snapshot válido. */
  readonly remoteLoaded = this.remoteLoadedSignal.asReadonly();

  constructor() {
    if (this.modeSignal() === 'server') void this.refreshRemote();
  }

  // ---------------------------------------------------------------------------------------
  // Escritas públicas. No modo local resolvem na hora com as regras e a gravação existentes;
  // no modo servidor enviam o comando e só publicam o estado confirmado pelo servidor.
  // ---------------------------------------------------------------------------------------

  async startProcedure(
    procedureSlug: string,
    acknowledgedWarningIds: readonly string[],
  ): Promise<ProcedureExecutionResult> {
    if (!this.isServer()) return this.localStartProcedure(procedureSlug, acknowledgedWarningIds);
    const blocked = this.procedureMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const result = await this.runRemote('/api/garage/procedures/start', {
      procedureSlug,
      acknowledgedWarningIds,
    });
    return this.executionResult(result, result.ok ? result.ids[0] : undefined);
  }

  completeProcedureStep(executionId: string, stepId: string): Promise<ProcedureExecutionResult> {
    if (!this.isServer())
      return Promise.resolve(this.localCompleteProcedureStep(executionId, stepId));
    return this.remoteProcedureUpdate(executionId, 'complete-step', stepId);
  }

  uncompleteProcedureStep(executionId: string, stepId: string): Promise<ProcedureExecutionResult> {
    if (!this.isServer()) {
      return Promise.resolve(this.localUncompleteProcedureStep(executionId, stepId));
    }
    return this.remoteProcedureUpdate(executionId, 'uncomplete-step', stepId);
  }

  skipOptionalProcedureStep(
    executionId: string,
    stepId: string,
  ): Promise<ProcedureExecutionResult> {
    if (!this.isServer()) {
      return Promise.resolve(this.localSkipOptionalProcedureStep(executionId, stepId));
    }
    return this.remoteProcedureUpdate(executionId, 'skip-optional-step', stepId);
  }

  setProcedureFinalCheck(
    executionId: string,
    checkId: string,
    completed: boolean,
  ): Promise<ProcedureExecutionResult> {
    if (!this.isServer()) {
      return Promise.resolve(this.localSetProcedureFinalCheck(executionId, checkId, completed));
    }
    return this.remoteProcedureUpdate(executionId, 'set-final-check', checkId, completed);
  }

  async finishProcedure(executionId: string, note?: string): Promise<ProcedureExecutionResult> {
    if (!this.isServer()) return this.localFinishProcedure(executionId, note);
    const result = await this.runRemote('/api/garage/procedures/finish', { executionId, note });
    return this.executionResult(result, executionId);
  }

  async cancelProcedure(executionId: string): Promise<ProcedureExecutionResult> {
    if (!this.isServer()) return this.localCancelProcedure(executionId);
    const result = await this.runRemote('/api/garage/procedures/cancel', { executionId });
    return this.executionResult(result, executionId);
  }

  async restartProcedure(executionId: string): Promise<ProcedureExecutionResult> {
    if (!this.isServer()) return this.localRestartProcedure(executionId);
    const result = await this.runRemote('/api/garage/procedures/restart', { executionId });
    return this.executionResult(result, result.ok ? result.ids[0] : undefined);
  }

  async updateMileage(request: OdometerUpdateRequest): Promise<OdometerUpdateResult> {
    if (!this.isServer()) return this.localUpdateMileage(request);
    const precheck = this.remoteOdometerPrecheck(request);
    if (precheck.status !== 'updated') return precheck;
    const result = await this.runRemote('/api/garage/odometer', {
      mileage: request.mileage,
      source: request.source,
      note: request.note,
      confirmedRegression: request.confirmedRegression,
    });
    return result.ok ? precheck : { ...precheck, status: 'blocked', impact: result.error };
  }

  async saveMotorcycle(
    changes: Pick<Motorcycle, 'nickname' | 'year'>,
    request: OdometerUpdateRequest,
  ): Promise<OdometerUpdateResult> {
    if (!this.isServer()) return this.localSaveMotorcycle(changes, request);
    const precheck = this.remoteOdometerPrecheck(request);
    if (precheck.status !== 'updated') return precheck;
    const result = await this.runRemote('/api/garage/motorcycle', {
      nickname: changes.nickname,
      year: changes.year,
      mileage: request.mileage,
      source: request.source,
      note: request.note,
      confirmedRegression: request.confirmedRegression,
    });
    return result.ok ? precheck : { ...precheck, status: 'blocked', impact: result.error };
  }

  async completeSetup(
    changes: Pick<Motorcycle, 'nickname' | 'year' | 'currentMileage'>,
    note?: string,
  ): Promise<boolean> {
    if (!this.isServer()) return this.localCompleteSetup(changes, note);
    const result = await this.runRemote('/api/garage/setup', { ...changes, note: note?.trim() });
    return result.ok;
  }

  async addService(input: NewServiceRecord): Promise<ServiceRecord | null> {
    if (!this.isServer()) return this.localAddService(input);
    if (!this.setup().completed) return null;
    const result = await this.runRemote('/api/garage/services', {
      title: input.title,
      date: input.date,
      mileage: input.mileage,
      procedureSlug: input.procedureSlug,
      procedureExecutionId: input.procedureExecutionId,
      maintenancePlanId: input.maintenancePlanId,
      cost: input.cost,
      parts: input.parts.map((part) => ({ name: part.name, quantity: part.quantity })),
      notes: input.notes,
    });
    return this.created(result, this.stateSignal().serviceHistory);
  }

  async addFuel(input: NewFuelRecord): Promise<FuelRecord | null> {
    if (!this.isServer()) return this.localAddFuel(input);
    if (!this.setup().completed) return null;
    if (!validateNewFuelRecord(input, this.motorcycle().currentMileage).valid) return null;
    const result = await this.runRemote('/api/garage/fuel', {
      fueledAt: input.fueledAt,
      mileage: input.mileage,
      liters: input.liters,
      totalCost: input.totalCost,
      fullTank: input.fullTank,
      station: input.station,
      notes: input.notes,
      confirmedHistoricalMileage: input.confirmedHistoricalMileage,
    });
    return this.created(result, this.stateSignal().fuelHistory);
  }

  async addExpense(input: NewExpenseRecord): Promise<ExpenseRecord | null> {
    if (!this.isServer()) return this.localAddExpense(input);
    if (!this.setup().completed) return null;
    const result = await this.runRemote('/api/garage/expenses', {
      date: input.date,
      title: input.title,
      category: input.category,
      amount: input.amount,
      mileage: input.mileage,
      notes: input.notes,
    });
    return this.created(result, this.stateSignal().expenseHistory);
  }

  async addOccurrence(input: NewOccurrenceRecord): Promise<OccurrenceRecord | null> {
    if (!this.isServer()) return this.localAddOccurrence(input);
    if (!this.setup().completed) return null;
    const result = await this.runRemote('/api/garage/occurrences', {
      occurredAt: input.occurredAt,
      mileage: input.mileage,
      title: input.title,
      severity: input.severity,
      notes: input.notes,
    });
    return this.created(result, this.stateSignal().occurrenceHistory);
  }

  async addSafetyCheck(input: NewSafetyCheckRecord): Promise<SafetyCheckResult> {
    if (!this.isServer()) return this.localAddSafetyCheck(input);
    if (!this.setup().completed) {
      return { ok: false, error: 'Configure sua NX200 antes de salvar.' };
    }
    const result = await this.runRemote('/api/garage/safety-checks', {
      checkedAt: input.checkedAt,
      responses: input.responses.map((response) => ({
        itemId: response.itemId,
        status: response.status,
      })),
      notes: input.notes,
    });
    if (!result.ok) return result;
    const record = this.created(result, this.stateSignal().safetyCheckHistory);
    return record
      ? { ok: true, record }
      : { ok: false, error: 'A inspeção foi salva, mas não apareceu nos dados recarregados.' };
  }

  async addMaintenanceItem(
    input: NewUserMaintenanceItem,
  ): Promise<PlanResult<MaintenancePlanItem>> {
    if (!this.isServer()) return this.localAddMaintenanceItem(input);
    const blocked = this.planMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const result = await this.runRemote('/api/garage/maintenance/items', {
      title: input.title,
      category: input.category,
      ...this.scheduleFields(input),
    });
    return this.planItemResult(result, result.ok ? result.ids[0] : undefined);
  }

  async updateMaintenanceItem(
    itemId: string,
    input: NewUserMaintenanceItem,
  ): Promise<PlanResult<MaintenancePlanItem>> {
    if (!this.isServer()) return this.localUpdateMaintenanceItem(itemId, input);
    const blocked = this.planMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const result = await this.runRemote('/api/garage/maintenance/items/update', {
      itemId,
      title: input.title,
      category: input.category,
      ...this.scheduleFields(input),
    });
    return this.planItemResult(result, itemId);
  }

  async setMaintenanceSchedule(
    itemId: string,
    input: MaintenanceScheduleInput | null,
  ): Promise<PlanResult<MaintenancePlanItem>> {
    if (!this.isServer()) return this.localSetMaintenanceSchedule(itemId, input);
    const blocked = this.planMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const result = await this.runRemote('/api/garage/maintenance/schedule', {
      itemId,
      schedule: input === null ? null : this.scheduleFields(input),
    });
    return this.planItemResult(result, itemId);
  }

  async removeMaintenanceItem(itemId: string): Promise<PlanResult<string>> {
    if (!this.isServer()) return this.localRemoveMaintenanceItem(itemId);
    const blocked = this.planMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const result = await this.runRemote('/api/garage/maintenance/items/remove', { itemId });
    return result.ok ? { ok: true, value: itemId } : result;
  }

  async updateSettings(maintenanceAlertsEnabled: boolean): Promise<boolean> {
    if (!this.isServer()) return this.localUpdateSettings(maintenanceAlertsEnabled);
    const result = await this.runRemote('/api/garage/settings', {
      maintenanceAlertsEnabled,
      theme: this.settings().theme,
    });
    return result.ok;
  }

  async updateTheme(theme: GarageTheme): Promise<boolean> {
    if (!this.isServer()) return this.localUpdateTheme(theme);
    const result = await this.runRemote('/api/garage/settings', {
      maintenanceAlertsEnabled: this.settings().maintenanceAlertsEnabled,
      theme,
    });
    return result.ok;
  }

  /** Só no modo local: apaga os dados deste navegador. No servidor não existe apagamento. */
  async resetToInitialState(): Promise<boolean> {
    return this.isServer() ? false : this.localResetToInitialState();
  }

  /** Só no modo local: restaura um backup neste navegador. No servidor use `importToServer`. */
  async importState(state: GarageState): Promise<boolean> {
    return this.isServer() ? false : this.localImportState(state);
  }

  // ---------------------------------------------------------------------------------------
  // Modo servidor: conexão, leitura e importação.
  // ---------------------------------------------------------------------------------------

  /** Liga o modo servidor somente depois de ler um snapshot válido e autenticado. */
  async connectServer(): Promise<StoreResult> {
    const result = await this.api.snapshot();
    if (!result.ok) return { ok: false, error: result.failure.message };
    try {
      this.storage.setRaw(MODE_KEY, 'server');
    } catch {
      return { ok: false, error: 'Não foi possível guardar a preferência neste navegador.' };
    }
    this.modeSignal.set('server');
    this.recoverySignal.set(undefined);
    if (!this.applySnapshot(result.value)) {
      return { ok: false, error: 'O servidor respondeu com dados que este aplicativo não aceita.' };
    }
    return { ok: true, value: undefined };
  }

  /** Volta a usar somente os dados deste navegador, que nunca foram apagados. */
  useLocalMode(): boolean {
    try {
      this.storage.remove(MODE_KEY);
    } catch {
      return false;
    }
    const load = this.loadInitialState();
    this.modeSignal.set('local');
    this.remoteSignal.set({ status: 'idle' });
    this.remoteLoadedSignal.set(false);
    this.stateSignal.set(load.state);
    this.recoverySignal.set(load.recovery);
    return true;
  }

  /** Relê o snapshot do servidor e publica somente se for válido. */
  async refreshRemote(): Promise<ApiResult<GarageSnapshot>> {
    const result = await this.api.snapshot();
    if (!result.ok) {
      this.remoteSignal.set({
        status: 'error',
        kind: result.failure.kind,
        message: result.failure.message,
      });
      return result;
    }
    if (!this.applySnapshot(result.value)) {
      const message = 'O servidor respondeu com dados que este aplicativo não aceita.';
      this.remoteSignal.set({ status: 'error', kind: 'invalid', message });
      return { ok: false, failure: { kind: 'unavailable', message } };
    }
    return result;
  }

  /**
   * Backup dos dados guardados neste navegador, lido como cópia em memória: o valor original
   * não é migrado nem regravado.
   */
  localDataBackup(exportedAt = new Date().toISOString()): StoreResult<string> {
    let raw: string | null;
    try {
      raw = this.storage.getRaw(STORAGE_KEY);
    } catch {
      return { ok: false, error: 'O navegador bloqueou o acesso aos dados locais.' };
    }
    const decoded = decodeStoredGarageState(raw, INITIAL_GARAGE_STATE, NX200_PROCEDURES);
    if (decoded.kind === 'empty') {
      return { ok: false, error: 'Não há dados do Garage guardados neste navegador.' };
    }
    if (decoded.kind === 'invalid-state' || decoded.kind === 'future-version') {
      return { ok: false, error: decoded.message };
    }
    return { ok: true, value: createGarageBackup(decoded.state, exportedAt) };
  }

  async previewServerImport(content: string): Promise<StoreResult<ImportPreview>> {
    if (!this.isServer()) return { ok: false, error: 'Conecte ao servidor antes de importar.' };
    const backup = this.parseJson(content);
    if (backup === undefined) return { ok: false, error: 'O arquivo não contém um JSON válido.' };
    const result = await this.api.previewImport(backup);
    return result.ok
      ? { ok: true, value: result.value }
      : { ok: false, error: result.failure.message };
  }

  async importToServer(content: string, digest: string): Promise<StoreResult> {
    if (!this.isServer()) return { ok: false, error: 'Conecte ao servidor antes de importar.' };
    const backup = this.parseJson(content);
    if (backup === undefined) return { ok: false, error: 'O arquivo não contém um JSON válido.' };
    this.pendingSignal.update((value) => value + 1);
    try {
      const result = await this.api.importBackup(backup, digest, this.revision);
      if (!result.ok) {
        await this.refreshRemote();
        return { ok: false, error: result.failure.message };
      }
      const refreshed = await this.refreshRemote();
      return refreshed.ok
        ? { ok: true, value: undefined }
        : {
            ok: false,
            error: 'Importado no servidor, mas a releitura falhou. Recarregue a página.',
          };
    } finally {
      this.pendingSignal.update((value) => value - 1);
    }
  }

  private localStartProcedure(
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

  private localCompleteProcedureStep(
    executionId: string,
    stepId: string,
  ): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      completeProcedureStep(procedure, execution, stepId, now),
    );
  }

  private localUncompleteProcedureStep(
    executionId: string,
    stepId: string,
  ): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      uncompleteProcedureStep(procedure, execution, stepId, now),
    );
  }

  private localSkipOptionalProcedureStep(
    executionId: string,
    stepId: string,
  ): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      skipOptionalProcedureStep(procedure, execution, stepId, now),
    );
  }

  private localSetProcedureFinalCheck(
    executionId: string,
    checkId: string,
    completed: boolean,
  ): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (procedure, execution, now) =>
      setFinalCheckCompleted(procedure, execution, checkId, completed, now),
    );
  }

  private localFinishProcedure(executionId: string, note?: string): ProcedureExecutionResult {
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

  private localCancelProcedure(executionId: string): ProcedureExecutionResult {
    return this.changeProcedureExecution(executionId, (_procedure, execution, now) =>
      cancelProcedureExecution(execution, now),
    );
  }

  private localRestartProcedure(executionId: string): ProcedureExecutionResult {
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

  private localUpdateMileage(request: OdometerUpdateRequest): OdometerUpdateResult {
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

  private localSaveMotorcycle(
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

  private localCompleteSetup(
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
    const demoServiceIds = new Set(
      this.stateSignal()
        .serviceHistory.filter((service) => service.isDemo)
        .map((service) => service.id),
    );
    const clearDemonstrationExecutions = this.setup().demoData && demoServiceIds.size > 0;
    return this.persist({
      ...this.stateSignal(),
      motorcycle: {
        ...this.motorcycle(),
        ...changes,
        createdAt: this.setup().completed ? this.motorcycle().createdAt : recordedAt,
        updatedAt: recordedAt,
      },
      maintenancePlan: this.stateSignal().maintenancePlan.map((item) =>
        item.lastExecution &&
        (demoServiceIds.has(item.lastExecution.serviceRecordId ?? '') ||
          (clearDemonstrationExecutions && !item.lastExecution.serviceRecordId))
          ? this.withoutMaintenanceExecution(item)
          : item,
      ),
      serviceHistory: this.stateSignal().serviceHistory.filter((service) => !service.isDemo),
      odometerHistory: [
        record,
        ...this.stateSignal().odometerHistory.filter(
          (item) => !item.serviceRecordId || !demoServiceIds.has(item.serviceRecordId),
        ),
      ],
      setup: { completed: true, demoData: false },
    });
  }

  private localAddService(input: NewServiceRecord): ServiceRecord | null {
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

  private localAddFuel(input: NewFuelRecord): FuelRecord | null {
    if (this.recoverySignal() || !this.setup().completed) return null;
    const validation = validateNewFuelRecord(input, this.motorcycle().currentMileage);
    if (!validation.valid) return null;

    const createdAt = new Date().toISOString();
    const record: FuelRecord = {
      id: this.createId('fuel'),
      motorcycleId: this.motorcycle().id,
      fueledAt: input.fueledAt,
      mileage: input.mileage,
      liters: input.liters,
      totalCost: input.totalCost,
      fullTank: input.fullTank,
      station: input.station?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt,
    };
    const odometerRecord: OdometerRecord = {
      id: this.createId('odometer'),
      motorcycleId: this.motorcycle().id,
      mileage: record.mileage,
      recordedAt: record.fueledAt,
      source: 'fuel',
      note:
        record.mileage < this.motorcycle().currentMileage
          ? 'Leitura histórica registrada com abastecimento; odômetro atual preservado.'
          : 'Leitura registrada com abastecimento.',
      fuelRecordId: record.id,
    };
    const nextState: GarageState = {
      ...this.stateSignal(),
      motorcycle:
        record.mileage > this.motorcycle().currentMileage
          ? { ...this.motorcycle(), currentMileage: record.mileage, updatedAt: createdAt }
          : this.motorcycle(),
      fuelHistory: [record, ...this.stateSignal().fuelHistory],
      odometerHistory: [odometerRecord, ...this.stateSignal().odometerHistory],
    };
    return this.persist(nextState) ? record : null;
  }

  private localAddExpense(input: NewExpenseRecord): ExpenseRecord | null {
    if (
      this.recoverySignal() ||
      !this.setup().completed ||
      !input.title.trim() ||
      !Number.isFinite(input.amount) ||
      input.amount < 0
    ) {
      return null;
    }
    const record: ExpenseRecord = {
      ...input,
      id: this.createId('expense'),
      motorcycleId: this.motorcycle().id,
      title: input.title.trim(),
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    return this.persist({
      ...this.stateSignal(),
      expenseHistory: [record, ...this.stateSignal().expenseHistory],
    })
      ? record
      : null;
  }

  private localAddOccurrence(input: NewOccurrenceRecord): OccurrenceRecord | null {
    if (
      this.recoverySignal() ||
      !this.setup().completed ||
      !input.title.trim() ||
      !Number.isInteger(input.mileage) ||
      input.mileage < 0 ||
      Number.isNaN(Date.parse(input.occurredAt))
    ) {
      return null;
    }
    const record: OccurrenceRecord = {
      ...input,
      id: this.createId('occurrence'),
      motorcycleId: this.motorcycle().id,
      title: input.title.trim(),
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    return this.persist({
      ...this.stateSignal(),
      occurrenceHistory: [record, ...this.stateSignal().occurrenceHistory],
    })
      ? record
      : null;
  }

  private localAddSafetyCheck(input: NewSafetyCheckRecord): SafetyCheckResult {
    if (this.recoverySignal() || !this.setup().completed) {
      return { ok: false, error: 'Configure sua NX200 e resolva os dados locais antes de salvar.' };
    }
    const result = buildSafetyCheckRecord(
      input,
      NX200_PRE_RIDE_CHECKLIST,
      this.motorcycle().id,
      this.createId('safety-check'),
      new Date().toISOString(),
    );
    if (!result.ok) return result;
    return this.persist({
      ...this.stateSignal(),
      safetyCheckHistory: [result.record, ...this.stateSignal().safetyCheckHistory],
    })
      ? result
      : { ok: false, error: 'Não foi possível salvar a inspeção neste dispositivo.' };
  }

  /** Cria um item de manutenção definido pelo usuário, sem fonte técnica. */
  private localAddMaintenanceItem(input: NewUserMaintenanceItem): PlanResult<MaintenancePlanItem> {
    const blocked = this.planMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const result = createUserMaintenanceItem(
      input,
      `${USER_PLAN_ITEM_ID_PREFIX}${this.createId('plan')}`,
      new Date().toISOString(),
    );
    if (!result.ok) return result;
    return this.persist({
      ...this.stateSignal(),
      maintenancePlan: [...this.stateSignal().maintenancePlan, result.value],
    })
      ? result
      : { ok: false, error: 'Não foi possível salvar o item neste dispositivo.' };
  }

  /** Edita nome, categoria e intervalo de um item criado pelo usuário. */
  private localUpdateMaintenanceItem(
    itemId: string,
    input: NewUserMaintenanceItem,
  ): PlanResult<MaintenancePlanItem> {
    return this.changeMaintenanceItem(itemId, (item, now) =>
      updateUserMaintenanceItem(item, input, now),
    );
  }

  /** Define (ou remove, com `null`) o intervalo próprio de qualquer item do plano. */
  private localSetMaintenanceSchedule(
    itemId: string,
    input: MaintenanceScheduleInput | null,
  ): PlanResult<MaintenancePlanItem> {
    return this.changeMaintenanceItem(itemId, (item, now) => applyUserSchedule(item, input, now));
  }

  private localRemoveMaintenanceItem(itemId: string): PlanResult<string> {
    const blocked = this.planMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const item = this.stateSignal().maintenancePlan.find((candidate) => candidate.id === itemId);
    if (!item) return { ok: false, error: 'Item do plano não encontrado.' };
    const error = planItemRemovalError(item, this.stateSignal().serviceHistory);
    if (error) return { ok: false, error };
    return this.persist({
      ...this.stateSignal(),
      maintenancePlan: this.stateSignal().maintenancePlan.filter(
        (candidate) => candidate.id !== itemId,
      ),
    })
      ? { ok: true, value: itemId }
      : { ok: false, error: 'Não foi possível remover o item neste dispositivo.' };
  }

  private localUpdateSettings(maintenanceAlertsEnabled: boolean): boolean {
    return this.persist({
      ...this.stateSignal(),
      settings: { ...this.settings(), maintenanceAlertsEnabled },
    });
  }

  private localUpdateTheme(theme: GarageTheme): boolean {
    return this.persist({
      ...this.stateSignal(),
      settings: { ...this.settings(), theme },
    });
  }

  /** Apaga os dados locais e volta ao primeiro uso, preservando apenas as preferências. */
  private localResetToInitialState(): boolean {
    return this.replaceState({ ...INITIAL_GARAGE_STATE, settings: this.settings() });
  }

  exportData(exportedAt = new Date().toISOString()): string {
    return createGarageBackup(this.stateSignal(), exportedAt);
  }

  exportRecoveryData(): string | null {
    return this.recoverySignal()?.rawValue ?? null;
  }

  private localImportState(state: GarageState): boolean {
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

  private withoutMaintenanceExecution(
    item: GarageState['maintenancePlan'][number],
  ): GarageState['maintenancePlan'][number] {
    const copy = { ...item };
    delete copy.lastExecution;
    return copy;
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

  private readMode(): GarageMode {
    try {
      return this.storage.getRaw(MODE_KEY) === 'server' ? 'server' : 'local';
    } catch {
      return 'local';
    }
  }

  private isServer(): boolean {
    return this.modeSignal() === 'server';
  }

  private applySnapshot(snapshot: GarageSnapshot): boolean {
    let state: GarageState;
    if (snapshot.status === 'not-configured') {
      state = {
        ...INITIAL_GARAGE_STATE,
        settings: snapshot.settings ?? INITIAL_GARAGE_STATE.settings,
      };
    } else {
      if (!snapshot.state || !validateGarageState(snapshot.state, NX200_PROCEDURES).valid) {
        return false;
      }
      state = snapshot.state;
    }
    this.revision = snapshot.revision;
    this.stateSignal.set(state);
    this.remoteSignal.set({ status: 'ready', snapshot: snapshot.status });
    this.remoteLoadedSignal.set(true);
    return true;
  }

  /** Envia um comando com a revisão conhecida e publica o snapshot confirmado depois. */
  private async runRemote(path: string, payload: unknown): Promise<RemoteCommand> {
    if (this.remoteSignal().status !== 'ready') {
      return { ok: false, error: 'O servidor não está disponível. Recarregue e tente de novo.' };
    }
    this.pendingSignal.update((value) => value + 1);
    try {
      const result = await this.api.command(path, payload, this.revision);
      if (!result.ok) {
        if (result.failure.kind === 'conflict') await this.refreshRemote();
        if (result.failure.kind === 'unauthenticated' || result.failure.kind === 'network') {
          this.remoteSignal.set({
            status: 'error',
            kind: result.failure.kind,
            message: result.failure.message,
          });
        }
        return { ok: false, error: result.failure.message };
      }
      // A escrita foi confirmada. Se a releitura falhar, o banner de erro remoto avisa.
      await this.refreshRemote();
      return { ok: true, ids: result.value.result.ids };
    } finally {
      this.pendingSignal.update((value) => value - 1);
    }
  }

  private remoteProcedureUpdate(
    executionId: string,
    action: 'complete-step' | 'uncomplete-step' | 'skip-optional-step' | 'set-final-check',
    targetId: string,
    completed?: boolean,
  ): Promise<ProcedureExecutionResult> {
    const blocked = this.procedureMutationBlock();
    if (blocked) return Promise.resolve({ ok: false, error: blocked });
    return this.runRemote('/api/garage/procedures/update', {
      executionId,
      action,
      targetId,
      completed,
    }).then((result) => this.executionResult(result, executionId));
  }

  private executionResult(result: RemoteCommand, executionId?: string): ProcedureExecutionResult {
    if (!result.ok) return result;
    const execution = this.stateSignal().procedureExecutions.find(
      (candidate) => candidate.id === executionId,
    );
    return execution
      ? { ok: true, execution }
      : { ok: false, error: 'A execução foi salva, mas não apareceu nos dados recarregados.' };
  }

  private planItemResult(result: RemoteCommand, itemId?: string): PlanResult<MaintenancePlanItem> {
    if (!result.ok) return result;
    const item = this.stateSignal().maintenancePlan.find((candidate) => candidate.id === itemId);
    return item
      ? { ok: true, value: item }
      : { ok: false, error: 'O item foi salvo, mas não apareceu nos dados recarregados.' };
  }

  private created<T extends { readonly id: string }>(
    result: RemoteCommand,
    collection: readonly T[],
  ): T | null {
    if (!result.ok) return null;
    return collection.find((candidate) => candidate.id === result.ids[0]) ?? null;
  }

  private remoteOdometerPrecheck(request: OdometerUpdateRequest): OdometerUpdateResult {
    const currentMileage = this.motorcycle().currentMileage;
    if (!this.setup().completed) {
      return {
        status: 'blocked',
        previousMileage: currentMileage,
        requestedMileage: request.mileage,
        impact: 'Conclua a configuração da sua NX200 antes de atualizar o odômetro.',
      };
    }
    return evaluateOdometerUpdate(currentMileage, request);
  }

  private scheduleFields(input: MaintenanceScheduleInput): MaintenanceScheduleInput {
    return {
      intervalKm: input.intervalKm,
      intervalDays: input.intervalDays,
      warningKm: input.warningKm,
      warningDays: input.warningDays,
      note: input.note,
    };
  }

  private parseJson(content: string): unknown {
    try {
      return JSON.parse(content) as unknown;
    } catch {
      return undefined;
    }
  }

  private changeMaintenanceItem(
    itemId: string,
    mutation: (item: MaintenancePlanItem, now: string) => PlanResult<MaintenancePlanItem>,
  ): PlanResult<MaintenancePlanItem> {
    const blocked = this.planMutationBlock();
    if (blocked) return { ok: false, error: blocked };
    const item = this.stateSignal().maintenancePlan.find((candidate) => candidate.id === itemId);
    if (!item) return { ok: false, error: 'Item do plano não encontrado.' };
    const result = mutation(item, new Date().toISOString());
    if (!result.ok) return result;
    return this.persist({
      ...this.stateSignal(),
      maintenancePlan: this.stateSignal().maintenancePlan.map((candidate) =>
        candidate.id === itemId ? result.value : candidate,
      ),
    })
      ? result
      : { ok: false, error: 'Não foi possível salvar o plano neste dispositivo.' };
  }

  private planMutationBlock(): string | null {
    if (!this.setup().completed) return 'Conclua a configuração inicial antes de editar o plano.';
    if (this.recoverySignal()) return 'Resolva a recuperação dos dados locais antes de continuar.';
    return null;
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
