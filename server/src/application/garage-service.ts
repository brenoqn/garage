import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type {
  ExpenseRecord,
  FuelRecord,
  GarageSettings,
  GarageSnapshot,
  GarageState,
  ImportPreview,
  MaintenancePlanItem,
  Motorcycle,
  OccurrenceRecord,
  OdometerRecord,
  ProcedureExecution,
  SafetyCheckRecord,
  ServiceRecord,
  WriteResult,
} from '../../../shared/garage';
import {
  amount,
  boolean,
  choice,
  date,
  fail,
  integer,
  object,
  optionalString,
  revision,
  string,
  strings,
  timestamp,
} from '../../../shared/validation';
import { evaluateOdometerUpdate } from '../../../shared/odometer-policy';
import {
  applyUserSchedule,
  createUserMaintenanceItem,
  MAINTENANCE_CATEGORIES,
  MaintenanceScheduleInput,
  planItemRemovalError,
  PlanResult,
  updateUserMaintenanceItem,
  USER_PLAN_ITEM_ID_PREFIX,
} from '../../../shared/maintenance-plan';
import { shouldReplaceMaintenanceExecution } from '../../../shared/service-chronology';
import { validateNewFuelRecord } from '../../../shared/fuel-consumption';
import { buildSafetyCheckRecord } from '../../../shared/safety-check';
import {
  cancelProcedureExecution,
  completeProcedureStep,
  createProcedureExecution,
  finishProcedureExecution,
  restartProcedureExecution,
  setFinalCheckCompleted,
  skipOptionalProcedureStep,
  uncompleteProcedureStep,
} from '../../../src/app/core/domain/procedure-execution';
import { validateGarageState } from '../../../src/app/core/domain/garage-state-migration';
import {
  canonicalJson,
  comparableImportState,
  IMPORT_NORMALIZATION_VERSION,
  prepareImport,
} from '../../../src/app/core/domain/import-preparation';
import type { GarageBackupSummary } from '../../../src/app/core/models/backup.model';
import {
  criticalProcedureCompletionBlocked,
  detectTechnicalConflicts,
} from '../../../src/app/core/domain/technical-content';
import { NX200_TECHNICAL_CLAIMS } from '../../../src/app/data/nx200/claims/nx200-claims.data';
import { NX200_MAINTENANCE_PLAN } from '../../../src/app/data/nx200/maintenance-plan/nx200-maintenance-plan.data';
import { NX200_PROCEDURES } from '../../../src/app/data/nx200/procedures/nx200-procedures.data';
import { NX200_PRE_RIDE_CHECKLIST } from '../../../src/app/data/nx200/safety/nx200-pre-ride-checklist.data';
import { NX200_TECHNICAL_SOURCES } from '../../../src/app/data/nx200/sources/nx200-sources.data';
import { inTransaction } from '../persistence/pool';
import {
  ExpenseRepository,
  FuelRepository,
  GarageRepository,
  MaintenanceRepository,
  MotorcycleRepository,
  OccurrenceRepository,
  OdometerRepository,
  ProcedureExecutionRepository,
  SafetyCheckRepository,
  ServiceRepository,
  WriteOperationRepository,
} from '../persistence/repositories';

const catalogVersion = createHash('sha256')
  .update(
    JSON.stringify([
      NX200_TECHNICAL_SOURCES,
      NX200_TECHNICAL_CLAIMS,
      NX200_PROCEDURES,
      NX200_MAINTENANCE_PLAN.map((item) => ({ ...item, lastExecution: undefined })),
      NX200_PRE_RIDE_CHECKLIST,
    ]),
  )
  .digest('hex');

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const fields = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`);
    return `{${fields.join(',')}}`;
  }
  return JSON.stringify(value);
}

interface Repositories {
  readonly garage: GarageRepository;
  readonly motorcycle: MotorcycleRepository;
  readonly maintenance: MaintenanceRepository;
  readonly service: ServiceRepository;
  readonly odometer: OdometerRepository;
  readonly fuel: FuelRepository;
  readonly expense: ExpenseRepository;
  readonly occurrence: OccurrenceRepository;
  readonly procedure: ProcedureExecutionRepository;
  readonly safety: SafetyCheckRepository;
  readonly write: WriteOperationRepository;
}

function repositories(client: PoolClient): Repositories {
  return {
    garage: new GarageRepository(client),
    motorcycle: new MotorcycleRepository(client),
    maintenance: new MaintenanceRepository(client),
    service: new ServiceRepository(client),
    odometer: new OdometerRepository(client),
    fuel: new FuelRepository(client),
    expense: new ExpenseRepository(client),
    occurrence: new OccurrenceRepository(client),
    procedure: new ProcedureExecutionRepository(client),
    safety: new SafetyCheckRepository(client),
    write: new WriteOperationRepository(client),
  };
}

interface WriteContext {
  readonly repo: Repositories;
  readonly motorcycle: Motorcycle | null;
  readonly settings: GarageSettings | null;
  readonly now: string;
}

const SCHEDULE_FIELDS = ['intervalKm', 'intervalDays', 'warningKm', 'warningDays', 'note'] as const;

function optionalInteger(value: unknown, name: string): number | undefined {
  return value === undefined ? undefined : integer(value, name);
}

function scheduleInput(input: Record<string, unknown>): MaintenanceScheduleInput {
  return {
    intervalKm: optionalInteger(input['intervalKm'], 'intervalKm'),
    intervalDays: optionalInteger(input['intervalDays'], 'intervalDays'),
    warningKm: optionalInteger(input['warningKm'], 'warningKm'),
    warningDays: optionalInteger(input['warningDays'], 'warningDays'),
    note: optionalString(input['note'], 'note', 240),
  };
}

function unwrap<T>(result: PlanResult<T>): T {
  if (!result.ok) return fail(result.error);
  return result.value;
}

async function findPlanItem(
  repo: Repositories,
  motorcycleId: string,
  itemId: unknown,
): Promise<MaintenancePlanItem> {
  const id = string(itemId, 'itemId', 200);
  const item = (await repo.maintenance.list(motorcycleId)).find((candidate) => candidate.id === id);
  if (!item) return fail('Unknown maintenance plan item', 'NOT_FOUND', 404);
  return item;
}

function configured(motorcycle: Motorcycle | null): Motorcycle {
  if (!motorcycle) return fail('Garage has not been configured', 'NOT_CONFIGURED', 409);
  return motorcycle;
}

function snapshotState(
  motorcycle: Motorcycle,
  settings: GarageSettings,
  data: {
    maintenancePlan: MaintenancePlanItem[];
    serviceHistory: ServiceRecord[];
    odometerHistory: OdometerRecord[];
    procedureExecutions: ProcedureExecution[];
    fuelHistory: FuelRecord[];
    expenseHistory: ExpenseRecord[];
    occurrenceHistory: OccurrenceRecord[];
    safetyCheckHistory: SafetyCheckRecord[];
  },
): GarageState {
  return {
    schemaVersion: 5,
    motorcycle,
    ...data,
    settings,
    setup: { completed: true, demoData: false },
  };
}

async function loadState(
  repo: Repositories,
  motorcycle: Motorcycle,
  settings: GarageSettings,
): Promise<GarageState> {
  return snapshotState(motorcycle, settings, {
    maintenancePlan: await repo.maintenance.list(motorcycle.id),
    serviceHistory: await repo.service.list(motorcycle.id),
    odometerHistory: await repo.odometer.list(motorcycle.id),
    procedureExecutions: await repo.procedure.list(motorcycle.id),
    fuelHistory: await repo.fuel.list(motorcycle.id),
    expenseHistory: await repo.expense.list(motorcycle.id),
    occurrenceHistory: await repo.occurrence.list(motorcycle.id),
    safetyCheckHistory: await repo.safety.list(motorcycle.id),
  });
}

/** Valida o backup e calcula o hash do conteúdo normalizado. Lança 400 se recusado. */
function prepareImportPayload(backup: unknown): {
  readonly state: GarageState;
  readonly digest: string;
  readonly summary: GarageBackupSummary;
  readonly excludedDemoServices: number;
} {
  if (typeof backup !== 'object' || backup === null || Array.isArray(backup)) {
    return fail('Invalid backup');
  }
  const prepared = prepareImport(JSON.stringify(backup), NX200_PROCEDURES, NX200_MAINTENANCE_PLAN);
  if (!prepared.ok) return fail(prepared.error);
  const digest = createHash('sha256')
    .update(`garage-import:v${IMPORT_NORMALIZATION_VERSION}:${canonicalJson(prepared.state)}`)
    .digest('hex');
  return { ...prepared, digest };
}

export class GarageService {
  constructor(private readonly pool: Pool) {}

  async getGarage(): Promise<GarageSnapshot> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await client.query('SET LOCAL search_path TO public, pg_catalog');
      const repo = repositories(client);
      const garage = await repo.garage.get();
      const motorcycle = await repo.motorcycle.get();
      if (!motorcycle) {
        await client.query('COMMIT');
        return {
          revision: String(garage?.revision ?? 0),
          catalogVersion,
          status: 'not-configured',
          settings: garage?.settings ?? { maintenanceAlertsEnabled: true, theme: 'dark' },
        };
      }
      if (!garage) throw new Error('Motorcycle has no garage row');
      const state = await loadState(repo, motorcycle, garage.settings);
      const valid = validateGarageState(state, NX200_PROCEDURES);
      if (!valid.valid) throw new Error('Stored Garage state is invalid');
      const hasHistory =
        state.serviceHistory.length > 0 ||
        state.fuelHistory.length > 0 ||
        state.expenseHistory.length > 0 ||
        state.occurrenceHistory.length > 0 ||
        state.safetyCheckHistory.length > 0 ||
        state.procedureExecutions.length > 0 ||
        state.odometerHistory.some((entry) => entry.source !== 'setup');
      await client.query('COMMIT');
      return {
        revision: String(garage.revision),
        catalogVersion,
        status: hasHistory ? 'configured-with-history' : 'configured-empty',
        state,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async write(
    type: string,
    key: string,
    body: unknown,
    mutation: (context: WriteContext, payload: unknown) => Promise<readonly string[]>,
    requestHash?: (payload: unknown) => string,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    const envelope = object(body, ['expectedRevision', 'payload']);
    if (envelope['expectedRevision'] === undefined) {
      fail('expectedRevision is required', 'VALIDATION', 428);
    }
    const expected = revision(envelope['expectedRevision']);
    const payload = envelope['payload'];
    if (payload === undefined) fail('Missing payload');
    const hash =
      requestHash?.(payload) ??
      createHash('sha256')
        .update(canonical({ type, expectedRevision: String(expected), payload }))
        .digest('hex');
    return inTransaction(this.pool, async (client) => {
      const repo = repositories(client);
      await repo.garage.lock();
      const prior = await repo.write.find(key);
      if (prior) {
        if (prior.hash !== hash || prior.type !== type) {
          fail('Idempotency-Key was used with another request', 'IDEMPOTENCY_CONFLICT', 409);
        }
        return { revision: String(prior.revision), result: { ids: prior.resultIds } };
      }
      const garage = await repo.garage.get();
      if ((garage?.revision ?? 0) !== expected) {
        fail('Garage revision changed; reload before writing', 'REVISION_CONFLICT', 409);
      }
      const motorcycle = await repo.motorcycle.get();
      const ids = await mutation(
        { repo, motorcycle, settings: garage?.settings ?? null, now: new Date().toISOString() },
        payload,
      );
      const committedRevision = await repo.garage.incrementRevision();
      await repo.write.insert({ key, type, hash, revision: committedRevision, resultIds: ids });
      return { revision: String(committedRevision), result: { ids } };
    });
  }

  setupGarage(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write(
      'setupGarage',
      key,
      body,
      async ({ repo, motorcycle, settings, now }, payload) => {
        if (motorcycle) fail('Garage is already configured', 'REVISION_CONFLICT', 409);
        const input = object(payload, ['nickname', 'year', 'currentMileage', 'note']);
        const nickname = string(input['nickname'], 'nickname', 40);
        const year = integer(input['year'], 'year');
        const currentMileage = integer(input['currentMileage'], 'currentMileage');
        if (year < 1980 || year > 2100) fail('Invalid year');
        const note = optionalString(input['note'], 'note', 240);
        if (!settings) await repo.garage.create({ maintenanceAlertsEnabled: true, theme: 'dark' });
        const created: Motorcycle = {
          id: randomUUID(),
          manufacturer: 'Honda',
          model: 'NX200',
          nickname,
          year,
          currentMileage,
          createdAt: now,
          updatedAt: now,
        };
        await repo.motorcycle.insert(created);
        for (const item of NX200_MAINTENANCE_PLAN) {
          const clean: MaintenancePlanItem = { ...item, lastExecution: undefined };
          await repo.maintenance.insert(created.id, clean);
        }
        await repo.odometer.insert({
          id: randomUUID(),
          motorcycleId: created.id,
          mileage: currentMileage,
          recordedAt: now,
          source: 'setup',
          note: note ?? 'Quilometragem confirmada na configuração inicial.',
        });
        return [created.id];
      },
    );
  }

  updateMotorcycle(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write('updateMotorcycle', key, body, async ({ repo, motorcycle, now }, payload) => {
      const current = configured(motorcycle);
      const input = object(payload, [
        'nickname',
        'year',
        'mileage',
        'source',
        'note',
        'confirmedRegression',
      ]);
      const nickname = string(input['nickname'], 'nickname', 40);
      const year = integer(input['year'], 'year');
      const mileage = integer(input['mileage'], 'mileage');
      const source = choice(input['source'], 'source', [
        'motorcycle',
        'correction',
        'panel-replacement',
      ] as const);
      const note = optionalString(input['note'], 'note', 240);
      const confirmedRegression =
        input['confirmedRegression'] === undefined
          ? false
          : boolean(input['confirmedRegression'], 'confirmedRegression');
      if (year < 1980 || year > 2100) fail('Invalid year');
      this.assertMileage(current.currentMileage, mileage, source, confirmedRegression, note);
      await repo.motorcycle.update({
        ...current,
        nickname,
        year,
        currentMileage: mileage,
        updatedAt: now,
      });
      if (mileage !== current.currentMileage)
        await repo.odometer.insert({
          id: randomUUID(),
          motorcycleId: current.id,
          mileage,
          recordedAt: now,
          source,
          note,
        });
      return [current.id];
    });
  }

  recordOdometer(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write('recordOdometer', key, body, async ({ repo, motorcycle, now }, payload) => {
      const current = configured(motorcycle);
      const input = object(payload, ['mileage', 'source', 'note', 'confirmedRegression']);
      const mileage = integer(input['mileage'], 'mileage');
      const source = choice(input['source'], 'source', [
        'dashboard',
        'motorcycle',
        'correction',
        'panel-replacement',
      ] as const);
      const note = optionalString(input['note'], 'note', 240);
      const confirmedRegression =
        input['confirmedRegression'] === undefined
          ? false
          : boolean(input['confirmedRegression'], 'confirmedRegression');
      this.assertMileage(current.currentMileage, mileage, source, confirmedRegression, note);
      if (mileage === current.currentMileage) return [];
      const id = randomUUID();
      await repo.odometer.insert({
        id,
        motorcycleId: current.id,
        mileage,
        recordedAt: now,
        source,
        note,
      });
      await repo.motorcycle.update({ ...current, currentMileage: mileage, updatedAt: now });
      return [id];
    });
  }

  private assertMileage(
    previous: number,
    mileage: number,
    source: 'dashboard' | 'motorcycle' | 'correction' | 'panel-replacement',
    confirmedRegression: boolean,
    note?: string,
  ): void {
    const result = evaluateOdometerUpdate(previous, { mileage, source, note, confirmedRegression });
    if (result.status !== 'updated') fail(result.impact ?? 'Mileage update rejected');
    if (mileage < previous && !note) fail('Mileage reduction requires a reason');
  }

  createService(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write('createService', key, body, async ({ repo, motorcycle, now }, payload) => {
      const current = configured(motorcycle);
      const input = object(payload, [
        'title',
        'date',
        'mileage',
        'procedureSlug',
        'procedureExecutionId',
        'maintenancePlanId',
        'cost',
        'parts',
        'notes',
      ]);
      const title = string(input['title'], 'title', 80);
      const serviceDate = date(input['date'], 'date');
      const mileage = integer(input['mileage'], 'mileage');
      const procedureSlug = optionalString(input['procedureSlug'], 'procedureSlug', 200);
      const procedureExecutionId = optionalString(
        input['procedureExecutionId'],
        'procedureExecutionId',
        200,
      );
      const maintenancePlanId = optionalString(
        input['maintenancePlanId'],
        'maintenancePlanId',
        200,
      );
      const notes = optionalString(input['notes'], 'notes');
      const cost = input['cost'] === undefined ? undefined : amount(input['cost'], 'cost');
      if (!Array.isArray(input['parts']) || input['parts'].length > 100) fail('Invalid parts');
      const parts = input['parts'].map((value: unknown) => {
        const part = object(value, ['name', 'quantity']);
        return {
          name: string(part['name'], 'part name', 200),
          quantity:
            part['quantity'] === undefined ? undefined : integer(part['quantity'], 'part quantity'),
        };
      });
      if (procedureSlug && !NX200_PROCEDURES.some((p) => p.slug === procedureSlug))
        fail('Unknown procedure');
      const plan = await repo.maintenance.list(current.id);
      if (maintenancePlanId && !plan.some((item) => item.id === maintenancePlanId))
        fail('Unknown maintenance plan item');
      let linked: ProcedureExecution | undefined;
      if (procedureExecutionId) {
        linked = (await repo.procedure.list(current.id)).find(
          (item) => item.id === procedureExecutionId,
        );
        if (
          !linked ||
          linked.status !== 'completed' ||
          linked.resultingServiceRecordId ||
          linked.procedureSlug !== procedureSlug
        ) {
          fail('Procedure execution cannot be linked');
        }
      }
      const id = randomUUID();
      const service: ServiceRecord = {
        id,
        title,
        date: serviceDate,
        mileage,
        procedureSlug,
        procedureExecutionId,
        maintenancePlanId,
        cost,
        parts,
        notes,
        createdAt: now,
      };
      await repo.service.insert(service, current.id);
      if (linked) {
        await repo.procedure.update({ ...linked, updatedAt: now });
      }
      await repo.odometer.insert({
        id: randomUUID(),
        motorcycleId: current.id,
        mileage,
        recordedAt: now,
        source: 'service',
        note: `Leitura registrada com o serviço “${title}”.`,
        serviceRecordId: id,
      });
      if (mileage > current.currentMileage) {
        await repo.motorcycle.update({ ...current, currentMileage: mileage, updatedAt: now });
      }
      const item = plan.find((candidate) => candidate.id === maintenancePlanId);
      if (item && shouldReplaceMaintenanceExecution(item.lastExecution, service)) {
        await repo.maintenance.setLastExecution(current.id, item.id, service);
      }
      return [id];
    });
  }

  createFuelRecord(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write('createFuelRecord', key, body, async ({ repo, motorcycle, now }, payload) => {
      const current = configured(motorcycle);
      const input = object(payload, [
        'fueledAt',
        'mileage',
        'liters',
        'totalCost',
        'fullTank',
        'station',
        'notes',
        'confirmedHistoricalMileage',
      ]);
      const fueledAt = timestamp(input['fueledAt'], 'fueledAt');
      const mileage = integer(input['mileage'], 'mileage');
      const liters = amount(input['liters'], 'liters', true);
      const totalCost = amount(input['totalCost'], 'totalCost');
      const fullTank = boolean(input['fullTank'], 'fullTank');
      const station = optionalString(input['station'], 'station', 80);
      const notes = optionalString(input['notes'], 'notes', 240);
      const confirmedHistoricalMileage =
        input['confirmedHistoricalMileage'] === undefined
          ? false
          : boolean(input['confirmedHistoricalMileage'], 'confirmedHistoricalMileage');
      const valid = validateNewFuelRecord(
        {
          fueledAt,
          mileage,
          liters,
          totalCost,
          fullTank,
          station,
          notes,
          confirmedHistoricalMileage,
        },
        current.currentMileage,
      );
      if (!valid.valid) fail(valid.error);
      const id = randomUUID();
      await repo.fuel.insert({
        id,
        motorcycleId: current.id,
        fueledAt,
        mileage,
        liters,
        totalCost,
        fullTank,
        station,
        notes,
        createdAt: now,
      });
      await repo.odometer.insert({
        id: randomUUID(),
        motorcycleId: current.id,
        mileage,
        recordedAt: fueledAt,
        source: 'fuel',
        fuelRecordId: id,
        note:
          mileage < current.currentMileage
            ? 'Leitura histórica registrada com abastecimento; odômetro atual preservado.'
            : 'Leitura registrada com abastecimento.',
      });
      if (mileage > current.currentMileage) {
        await repo.motorcycle.update({ ...current, currentMileage: mileage, updatedAt: now });
      }
      return [id];
    });
  }

  createExpense(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write('createExpense', key, body, async ({ repo, motorcycle, now }, payload) => {
      const current = configured(motorcycle);
      const input = object(payload, ['date', 'title', 'category', 'amount', 'mileage', 'notes']);
      const expense: ExpenseRecord = {
        id: randomUUID(),
        motorcycleId: current.id,
        date: date(input['date'], 'date'),
        title: string(input['title'], 'title', 80),
        category: choice(input['category'], 'category', [
          'parts',
          'document',
          'parking',
          'accessory',
          'other',
        ] as const),
        amount: amount(input['amount'], 'amount'),
        mileage: input['mileage'] === undefined ? undefined : integer(input['mileage'], 'mileage'),
        notes: optionalString(input['notes'], 'notes', 240),
        createdAt: now,
      };
      await repo.expense.insert(expense);
      return [expense.id];
    });
  }

  createOccurrence(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write('createOccurrence', key, body, async ({ repo, motorcycle, now }, payload) => {
      const current = configured(motorcycle);
      const input = object(payload, ['occurredAt', 'mileage', 'title', 'severity', 'notes']);
      const occurrence: OccurrenceRecord = {
        id: randomUUID(),
        motorcycleId: current.id,
        occurredAt: timestamp(input['occurredAt'], 'occurredAt'),
        mileage: integer(input['mileage'], 'mileage'),
        title: string(input['title'], 'title', 80),
        severity: choice(input['severity'], 'severity', ['note', 'attention', 'stop'] as const),
        notes: optionalString(input['notes'], 'notes', 500),
        createdAt: now,
      };
      await repo.occurrence.insert(occurrence);
      return [occurrence.id];
    });
  }

  createSafetyCheck(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write(
      'createSafetyCheck',
      key,
      body,
      async ({ repo, motorcycle, now }, payload) => {
        const current = configured(motorcycle);
        const input = object(payload, ['checkedAt', 'responses', 'notes']);
        if (!Array.isArray(input['responses'])) fail('Invalid responses');
        const responses = input['responses'].map((value: unknown) => {
          const response = object(value, ['itemId', 'status']);
          return {
            itemId: string(response['itemId'], 'itemId', 200),
            status: choice(response['status'], 'status', ['ok', 'issue'] as const),
          };
        });
        const result = buildSafetyCheckRecord(
          {
            checkedAt: timestamp(input['checkedAt'], 'checkedAt'),
            responses,
            notes: optionalString(input['notes'], 'notes'),
          },
          NX200_PRE_RIDE_CHECKLIST,
          current.id,
          randomUUID(),
          now,
        );
        if (!result.ok) fail(result.error);
        await repo.safety.insert(result.record);
        return [result.record.id];
      },
    );
  }

  startProcedureExecution(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write(
      'startProcedureExecution',
      key,
      body,
      async ({ repo, motorcycle, now }, payload) => {
        const current = configured(motorcycle);
        const input = object(payload, ['procedureSlug', 'acknowledgedWarningIds']);
        const slug = string(input['procedureSlug'], 'procedureSlug', 200);
        const procedure = NX200_PROCEDURES.find((item) => item.slug === slug);
        if (!procedure) fail('Unknown procedure');
        if (
          (await repo.procedure.list(current.id)).some(
            (item) => item.status === 'in-progress' && item.procedureSlug === slug,
          )
        ) {
          fail('Procedure already active', 'REVISION_CONFLICT', 409);
        }
        const created = createProcedureExecution(
          procedure,
          current.id,
          strings(input['acknowledgedWarningIds'], 'acknowledgedWarningIds'),
          now,
          randomUUID(),
        );
        if (!created.ok) fail(created.error);
        await repo.procedure.insert(created.execution);
        return [created.execution.id];
      },
    );
  }

  updateProcedureExecution(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.procedureMutation(
      'updateProcedureExecution',
      key,
      body,
      (procedure, execution, input, now) => {
        const action = choice(input['action'], 'action', [
          'complete-step',
          'uncomplete-step',
          'skip-optional-step',
          'set-final-check',
        ] as const);
        const targetId = string(input['targetId'], 'targetId', 200);
        if (action === 'complete-step')
          return completeProcedureStep(procedure, execution, targetId, now);
        if (action === 'uncomplete-step')
          return uncompleteProcedureStep(procedure, execution, targetId, now);
        if (action === 'skip-optional-step')
          return skipOptionalProcedureStep(procedure, execution, targetId, now);
        return setFinalCheckCompleted(
          procedure,
          execution,
          targetId,
          boolean(input['completed'], 'completed'),
          now,
        );
      },
      ['executionId', 'action', 'targetId', 'completed'],
    );
  }

  finishProcedureExecution(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.procedureMutation(
      'finishProcedureExecution',
      key,
      body,
      (procedure, execution, input, now) => {
        const claimIds = new Set(procedure.technicalClaimIds);
        const claims = NX200_TECHNICAL_CLAIMS.filter((claim) => claimIds.has(claim.id));
        if (
          criticalProcedureCompletionBlocked(procedure.riskLevel, claims) ||
          detectTechnicalConflicts(claims).length > 0
        ) {
          fail('Technical content conflict blocks completion', 'CATALOG_CONFLICT', 409);
        }
        return finishProcedureExecution(
          procedure,
          execution,
          now,
          optionalString(input['note'], 'note'),
        );
      },
      ['executionId', 'note'],
    );
  }

  cancelProcedureExecution(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.procedureMutation(
      'cancelProcedureExecution',
      key,
      body,
      (_procedure, execution, _input, now) => cancelProcedureExecution(execution, now),
      ['executionId'],
    );
  }

  restartProcedureExecution(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write(
      'restartProcedureExecution',
      key,
      body,
      async ({ repo, motorcycle, now }, payload) => {
        const current = configured(motorcycle);
        const input = object(payload, ['executionId']);
        const executionId = string(input['executionId'], 'executionId', 200);
        const execution = (await repo.procedure.list(current.id)).find(
          (item) => item.id === executionId,
        );
        if (!execution) fail('Execution not found', 'NOT_FOUND', 404);
        const procedure = NX200_PROCEDURES.find((item) => item.slug === execution.procedureSlug);
        if (!procedure) fail('Unknown procedure', 'CATALOG_CONFLICT', 409);
        const result = restartProcedureExecution(procedure, execution, now, randomUUID());
        if (!result.ok) fail(result.error);
        await repo.procedure.update(result.cancelled);
        await repo.procedure.insert(result.restarted);
        return [result.restarted.id];
      },
    );
  }

  private procedureMutation(
    type: string,
    key: string,
    body: unknown,
    change: (
      procedure: (typeof NX200_PROCEDURES)[number],
      execution: ProcedureExecution,
      input: Record<string, unknown>,
      now: string,
    ) =>
      | { readonly ok: true; readonly execution: ProcedureExecution }
      | { readonly ok: false; readonly error: string },
    allowed: readonly string[],
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write(type, key, body, async ({ repo, motorcycle, now }, payload) => {
      const current = configured(motorcycle);
      const input = object(payload, allowed);
      const executionId = string(input['executionId'], 'executionId', 200);
      const execution = (await repo.procedure.list(current.id)).find(
        (item) => item.id === executionId,
      );
      if (!execution) fail('Execution not found', 'NOT_FOUND', 404);
      const procedure = NX200_PROCEDURES.find((item) => item.slug === execution.procedureSlug);
      if (!procedure) fail('Unknown procedure', 'CATALOG_CONFLICT', 409);
      const result = change(procedure, execution, input, now);
      if (!result.ok) fail(result.error);
      await repo.procedure.update(result.execution);
      return [executionId];
    });
  }

  createMaintenanceItem(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write(
      'createMaintenanceItem',
      key,
      body,
      async ({ repo, motorcycle, now }, payload) => {
        const current = configured(motorcycle);
        const input = object(payload, ['title', 'category', ...SCHEDULE_FIELDS]);
        const item = unwrap(
          createUserMaintenanceItem(
            {
              ...scheduleInput(input),
              title: string(input['title'], 'title', 80),
              category: choice(input['category'], 'category', MAINTENANCE_CATEGORIES),
            },
            `${USER_PLAN_ITEM_ID_PREFIX}${randomUUID()}`,
            now,
          ),
        );
        await repo.maintenance.insert(current.id, item);
        return [item.id];
      },
    );
  }

  updateMaintenanceItem(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write(
      'updateMaintenanceItem',
      key,
      body,
      async ({ repo, motorcycle, now }, payload) => {
        const current = configured(motorcycle);
        const input = object(payload, ['itemId', 'title', 'category', ...SCHEDULE_FIELDS]);
        const item = await findPlanItem(repo, current.id, input['itemId']);
        const updated = unwrap(
          updateUserMaintenanceItem(
            item,
            {
              ...scheduleInput(input),
              title: string(input['title'], 'title', 80),
              category: choice(input['category'], 'category', MAINTENANCE_CATEGORIES),
            },
            now,
          ),
        );
        await repo.maintenance.updateUserFields(current.id, updated);
        return [updated.id];
      },
    );
  }

  setMaintenanceSchedule(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write(
      'setMaintenanceSchedule',
      key,
      body,
      async ({ repo, motorcycle, now }, payload) => {
        const current = configured(motorcycle);
        const input = object(payload, ['itemId', 'schedule']);
        const item = await findPlanItem(repo, current.id, input['itemId']);
        const schedule =
          input['schedule'] === null
            ? null
            : scheduleInput(object(input['schedule'], [...SCHEDULE_FIELDS]));
        const updated = unwrap(applyUserSchedule(item, schedule, now));
        await repo.maintenance.updateUserFields(current.id, updated);
        return [updated.id];
      },
    );
  }

  removeMaintenanceItem(
    key: string,
    body: unknown,
  ): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write('removeMaintenanceItem', key, body, async ({ repo, motorcycle }, payload) => {
      const current = configured(motorcycle);
      const input = object(payload, ['itemId']);
      const item = await findPlanItem(repo, current.id, input['itemId']);
      const error = planItemRemovalError(item, await repo.service.list(current.id));
      if (error) fail(error, 'VALIDATION', 409);
      await repo.maintenance.delete(current.id, item.id);
      return [item.id];
    });
  }

  /** Prévia somente leitura da importação: não grava nada. */
  async previewImport(body: unknown): Promise<ImportPreview> {
    const input = object(body, ['backup']);
    const prepared = prepareImportPayload(input['backup']);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      await client.query('SET LOCAL search_path TO public, pg_catalog');
      const repo = repositories(client);
      const garage = await repo.garage.get();
      const motorcycle = await repo.motorcycle.get();
      await client.query('COMMIT');
      return {
        digest: prepared.digest,
        summary: prepared.summary,
        excludedDemoServices: prepared.excludedDemoServices,
        target: motorcycle ? 'occupied' : 'empty',
        settings: garage ? 'keep-remote' : 'use-imported',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Importa um backup em garagem vazia, preservando IDs e instantes, numa única transação. O
   * resultado é relido e comparado com o conteúdo importado; qualquer diferença desfaz tudo.
   */
  importBackup(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    const digestOf = (payload: unknown): string =>
      prepareImportPayload(object(payload, ['backup', 'digest'])['backup']).digest;
    return this.write(
      'import',
      key,
      body,
      async ({ repo, motorcycle, settings }, payload) => {
        const input = object(payload, ['backup', 'digest']);
        const prepared = prepareImportPayload(input['backup']);
        if (input['digest'] !== prepared.digest) {
          fail('The backup changed after the preview; run the preview again', 'VALIDATION', 409);
        }
        if (await repo.write.findImport(prepared.digest)) {
          fail('This backup was already imported', 'IDEMPOTENCY_CONFLICT', 409);
        }
        if (motorcycle) fail('Import requires an empty garage', 'REVISION_CONFLICT', 409);
        const { state } = prepared;
        const finalSettings = settings ?? state.settings;
        if (!settings) await repo.garage.create(finalSettings);
        const moto = state.motorcycle;
        await repo.motorcycle.insert(moto);
        for (const execution of state.procedureExecutions) {
          await repo.procedure.insert({ ...execution, resultingServiceRecordId: undefined });
        }
        for (const item of state.maintenancePlan) await repo.maintenance.insert(moto.id, item);
        for (const service of state.serviceHistory) await repo.service.insert(service, moto.id);
        for (const fuel of state.fuelHistory) await repo.fuel.insert(fuel);
        for (const odometer of state.odometerHistory) await repo.odometer.insert(odometer);
        for (const expense of state.expenseHistory) await repo.expense.insert(expense);
        for (const occurrence of state.occurrenceHistory) await repo.occurrence.insert(occurrence);
        for (const check of state.safetyCheckHistory) await repo.safety.insert(check);

        const stored = await loadState(repo, moto, finalSettings);
        if (!validateGarageState(stored, NX200_PROCEDURES).valid) {
          throw new Error('Imported Garage state is invalid');
        }
        if (comparableImportState(stored) !== comparableImportState(state)) {
          fail(
            'The import would not preserve the data exactly; nothing was saved',
            'VALIDATION',
            422,
          );
        }
        return [moto.id];
      },
      digestOf,
    );
  }

  updateSettings(key: string, body: unknown): Promise<WriteResult<{ ids: readonly string[] }>> {
    return this.write('updateSettings', key, body, async ({ repo, settings }, payload) => {
      const input = object(payload, ['maintenanceAlertsEnabled', 'theme']);
      const next: GarageSettings = {
        maintenanceAlertsEnabled: boolean(
          input['maintenanceAlertsEnabled'],
          'maintenanceAlertsEnabled',
        ),
        theme: choice(input['theme'], 'theme', ['dark', 'light', 'system'] as const),
      };
      if (settings) await repo.garage.updateSettings(next);
      else await repo.garage.create(next);
      return [];
    });
  }
}
