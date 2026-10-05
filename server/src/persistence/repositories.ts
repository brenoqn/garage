import type { PoolClient, QueryResultRow } from 'pg';
import type {
  ExpenseRecord,
  FuelRecord,
  GarageSettings,
  MaintenancePlanItem,
  Motorcycle,
  OccurrenceRecord,
  OdometerRecord,
  ProcedureExecution,
  SafetyCheckRecord,
  ServiceRecord,
} from '../../../shared/garage';
import {
  bool,
  civilDate,
  decimal,
  ids,
  instant,
  optional,
  row,
  safeInteger,
  text,
} from './mappers';

type DbRow = QueryResultRow;
const get = (r: DbRow, name: string): unknown => r[name];
const str = (r: DbRow, name: string): string => text(get(r, name));
const num = (r: DbRow, name: string): number => safeInteger(get(r, name));
const when = (r: DbRow, name: string): string => instant(get(r, name));
const optText = (r: DbRow, name: string): string | undefined => optional(get(r, name), text);
const optNum = (r: DbRow, name: string): number | undefined => optional(get(r, name), safeInteger);

export interface GarageRow {
  readonly revision: number;
  readonly settings: GarageSettings;
}

export class GarageRepository {
  constructor(private readonly db: PoolClient) {}
  async lock(): Promise<void> {
    await this.db.query(
      'SELECT pg_advisory_xact_lock(hashtext(current_database()), $1)',
      [720250302],
    );
    // The advisory lock serializes the first setup, when the singleton row does not exist.
    // Once it exists, lock the actual revision row for every write transaction.
    await this.db.query('SELECT id FROM garage WHERE id = 1 FOR UPDATE');
  }
  async readiness(expectedUser: string, expectedDatabase: string): Promise<boolean> {
    const result = await this.db.query(
      "SELECT current_user = $1 AND current_database() = $2 AND to_regclass('public.garage') IS NOT NULL AS ready",
      [expectedUser, expectedDatabase],
    );
    return result.rows[0]?.['ready'] === true;
  }
  async get(): Promise<GarageRow | null> {
    const result = await this.db.query(
      'SELECT revision, maintenance_alerts_enabled, theme FROM garage WHERE id = 1',
    );
    const r = result.rows[0];
    return r
      ? {
          revision: num(r, 'revision'),
          settings: {
            maintenanceAlertsEnabled: bool(r['maintenance_alerts_enabled']),
            theme: str(r, 'theme') as GarageSettings['theme'],
          },
        }
      : null;
  }
  async create(settings: GarageSettings): Promise<void> {
    await this.db.query(
      'INSERT INTO garage (id, maintenance_alerts_enabled, theme, revision) VALUES (1, $1, $2, 0)',
      [settings.maintenanceAlertsEnabled, settings.theme],
    );
  }
  async updateSettings(settings: GarageSettings): Promise<void> {
    await this.db.query(
      'UPDATE garage SET maintenance_alerts_enabled = $1, theme = $2 WHERE id = 1',
      [settings.maintenanceAlertsEnabled, settings.theme],
    );
  }
  async incrementRevision(): Promise<number> {
    const result = await this.db.query(
      'UPDATE garage SET revision = revision + 1 WHERE id = 1 RETURNING revision',
    );
    return num(row(result.rows), 'revision');
  }
}

export class MotorcycleRepository {
  constructor(private readonly db: PoolClient) {}
  async get(): Promise<Motorcycle | null> {
    const result = await this.db.query('SELECT * FROM motorcycles WHERE garage_id = 1');
    const r = result.rows[0];
    return r
      ? {
          id: str(r, 'id'),
          manufacturer: 'Honda',
          model: 'NX200',
          nickname: str(r, 'nickname'),
          year: num(r, 'year'),
          currentMileage: num(r, 'current_mileage'),
          createdAt: when(r, 'created_at'),
          updatedAt: when(r, 'updated_at'),
        }
      : null;
  }
  async insert(value: Motorcycle): Promise<void> {
    await this.db.query(
      'INSERT INTO motorcycles (id, garage_id, manufacturer, model, nickname, year, current_mileage, created_at, updated_at) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)',
      [
        value.id,
        value.manufacturer,
        value.model,
        value.nickname,
        value.year,
        value.currentMileage,
        value.createdAt,
        value.updatedAt,
      ],
    );
  }
  async update(value: Motorcycle): Promise<void> {
    await this.db.query(
      'UPDATE motorcycles SET nickname = $2, year = $3, current_mileage = $4, updated_at = $5 WHERE id = $1',
      [value.id, value.nickname, value.year, value.currentMileage, value.updatedAt],
    );
  }
}

export class MaintenanceRepository {
  constructor(private readonly db: PoolClient) {}
  async list(motorcycleId: string): Promise<MaintenancePlanItem[]> {
    const result = await this.db.query(
      'SELECT * FROM maintenance_plan_items WHERE motorcycle_id = $1 ORDER BY id',
      [motorcycleId],
    );
    return result.rows.map((r): MaintenancePlanItem => {
      const executionDate = optional(r['last_execution_date'], civilDate);
      return {
        id: str(r, 'id'),
        title: str(r, 'title'),
        category: str(r, 'category') as MaintenancePlanItem['category'],
        procedureSlug: optText(r, 'procedure_slug'),
        intervalKm: optNum(r, 'interval_km'),
        intervalDays: optNum(r, 'interval_days'),
        warningKm: optNum(r, 'warning_km'),
        warningDays: optNum(r, 'warning_days'),
        technicalSource: {
          status: str(r, 'technical_status') as MaintenancePlanItem['technicalSource']['status'],
          label: str(r, 'technical_label'),
          reference: optText(r, 'technical_reference'),
          claimIds: ids(r['claim_ids']),
        },
        lastExecution:
          executionDate === undefined
            ? undefined
            : {
                date: executionDate,
                mileage: num(r, 'last_execution_mileage'),
                serviceRecordId: optText(r, 'last_service_record_id'),
              },
      };
    });
  }
  async insert(motorcycleId: string, item: MaintenancePlanItem): Promise<void> {
    await this.db.query(
      'INSERT INTO maintenance_plan_items (motorcycle_id,id,title,category,procedure_slug,interval_km,interval_days,warning_km,warning_days,technical_status,technical_label,technical_reference,claim_ids,last_execution_date,last_execution_mileage,last_service_record_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)',
      [
        motorcycleId,
        item.id,
        item.title,
        item.category,
        item.procedureSlug ?? null,
        item.intervalKm ?? null,
        item.intervalDays ?? null,
        item.warningKm ?? null,
        item.warningDays ?? null,
        item.technicalSource.status,
        item.technicalSource.label,
        item.technicalSource.reference ?? null,
        item.technicalSource.claimIds ?? [],
        item.lastExecution?.date ?? null,
        item.lastExecution?.mileage ?? null,
        item.lastExecution?.serviceRecordId ?? null,
      ],
    );
  }
  async setLastExecution(
    motorcycleId: string,
    itemId: string,
    service: ServiceRecord,
  ): Promise<void> {
    await this.db.query(
      'UPDATE maintenance_plan_items SET last_execution_date = $3, last_execution_mileage = $4, last_service_record_id = $5 WHERE motorcycle_id = $1 AND id = $2',
      [motorcycleId, itemId, service.date, service.mileage, service.id],
    );
  }
}

export class ServiceRepository {
  constructor(private readonly db: PoolClient) {}
  async list(motorcycleId: string): Promise<ServiceRecord[]> {
    const result = await this.db.query(
      'SELECT * FROM service_records WHERE motorcycle_id = $1 ORDER BY service_date DESC, mileage DESC, created_at DESC',
      [motorcycleId],
    );
    const parts = await this.db.query(
      'SELECT p.service_record_id, p.name, p.quantity FROM service_parts p JOIN service_records s ON s.id = p.service_record_id WHERE s.motorcycle_id = $1 ORDER BY p.service_record_id, p.position',
      [motorcycleId],
    );
    const partsByService = new Map<string, { name: string; quantity?: number }[]>();
    for (const p of parts.rows) {
      const id = str(p, 'service_record_id');
      const values = partsByService.get(id) ?? [];
      values.push({ name: str(p, 'name'), quantity: optNum(p, 'quantity') });
      partsByService.set(id, values);
    }
    return result.rows.map((r): ServiceRecord => ({
      id: str(r, 'id'),
      title: str(r, 'title'),
      date: civilDate(r['service_date']),
      mileage: num(r, 'mileage'),
      procedureSlug: optText(r, 'procedure_slug'),
      procedureExecutionId: optText(r, 'procedure_execution_id'),
      maintenancePlanId: optText(r, 'maintenance_plan_id'),
      cost: optional(r['cost'], decimal),
      parts: partsByService.get(str(r, 'id')) ?? [],
      notes: optText(r, 'notes'),
      createdAt: when(r, 'created_at'),
    }));
  }
  async insert(value: ServiceRecord, motorcycleId: string): Promise<void> {
    await this.db.query(
      'INSERT INTO service_records (id,motorcycle_id,title,service_date,mileage,procedure_slug,procedure_execution_id,maintenance_plan_id,cost,notes,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
      [
        value.id,
        motorcycleId,
        value.title,
        value.date,
        value.mileage,
        value.procedureSlug ?? null,
        value.procedureExecutionId ?? null,
        value.maintenancePlanId ?? null,
        value.cost ?? null,
        value.notes ?? null,
        value.createdAt,
      ],
    );
    for (const [position, part] of value.parts.entries()) {
      await this.db.query(
        'INSERT INTO service_parts (service_record_id,position,name,quantity) VALUES ($1,$2,$3,$4)',
        [value.id, position, part.name, part.quantity ?? null],
      );
    }
  }
}

export class OdometerRepository {
  constructor(private readonly db: PoolClient) {}
  async list(motorcycleId: string): Promise<OdometerRecord[]> {
    const result = await this.db.query(
      'SELECT * FROM odometer_records WHERE motorcycle_id = $1 ORDER BY recorded_at DESC, id DESC',
      [motorcycleId],
    );
    return result.rows.map((r): OdometerRecord => ({
      id: str(r, 'id'),
      motorcycleId: str(r, 'motorcycle_id'),
      mileage: num(r, 'mileage'),
      recordedAt: when(r, 'recorded_at'),
      source: str(r, 'source') as OdometerRecord['source'],
      note: optText(r, 'note'),
      serviceRecordId: optText(r, 'service_record_id'),
      fuelRecordId: optText(r, 'fuel_record_id'),
    }));
  }
  async insert(value: OdometerRecord): Promise<void> {
    await this.db.query(
      'INSERT INTO odometer_records (id,motorcycle_id,mileage,recorded_at,source,note,service_record_id,fuel_record_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        value.id,
        value.motorcycleId,
        value.mileage,
        value.recordedAt,
        value.source,
        value.note ?? null,
        value.serviceRecordId ?? null,
        value.fuelRecordId ?? null,
      ],
    );
  }
}

export class FuelRepository {
  constructor(private readonly db: PoolClient) {}
  async list(motorcycleId: string): Promise<FuelRecord[]> {
    const result = await this.db.query(
      'SELECT * FROM fuel_records WHERE motorcycle_id = $1 ORDER BY fueled_at DESC, created_at DESC',
      [motorcycleId],
    );
    return result.rows.map((r): FuelRecord => ({
      id: str(r, 'id'),
      motorcycleId: str(r, 'motorcycle_id'),
      fueledAt: when(r, 'fueled_at'),
      mileage: num(r, 'mileage'),
      liters: decimal(r['liters']),
      totalCost: decimal(r['total_cost']),
      fullTank: bool(r['full_tank']),
      station: optText(r, 'station'),
      notes: optText(r, 'notes'),
      createdAt: when(r, 'created_at'),
    }));
  }
  async insert(value: FuelRecord): Promise<void> {
    await this.db.query(
      'INSERT INTO fuel_records (id,motorcycle_id,fueled_at,mileage,liters,total_cost,full_tank,station,notes,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [
        value.id,
        value.motorcycleId,
        value.fueledAt,
        value.mileage,
        value.liters,
        value.totalCost,
        value.fullTank,
        value.station ?? null,
        value.notes ?? null,
        value.createdAt,
      ],
    );
  }
}

export class ExpenseRepository {
  constructor(private readonly db: PoolClient) {}
  async list(motorcycleId: string): Promise<ExpenseRecord[]> {
    const result = await this.db.query(
      'SELECT * FROM expense_records WHERE motorcycle_id = $1 ORDER BY expense_date DESC, created_at DESC',
      [motorcycleId],
    );
    return result.rows.map((r): ExpenseRecord => ({
      id: str(r, 'id'),
      motorcycleId: str(r, 'motorcycle_id'),
      date: civilDate(r['expense_date']),
      title: str(r, 'title'),
      category: str(r, 'category') as ExpenseRecord['category'],
      amount: decimal(r['amount']),
      mileage: optNum(r, 'mileage'),
      notes: optText(r, 'notes'),
      createdAt: when(r, 'created_at'),
    }));
  }
  async insert(value: ExpenseRecord): Promise<void> {
    await this.db.query(
      'INSERT INTO expense_records (id,motorcycle_id,expense_date,title,category,amount,mileage,notes,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        value.id,
        value.motorcycleId,
        value.date,
        value.title,
        value.category,
        value.amount,
        value.mileage ?? null,
        value.notes ?? null,
        value.createdAt,
      ],
    );
  }
}

export class OccurrenceRepository {
  constructor(private readonly db: PoolClient) {}
  async list(motorcycleId: string): Promise<OccurrenceRecord[]> {
    const result = await this.db.query(
      'SELECT * FROM occurrence_records WHERE motorcycle_id = $1 ORDER BY occurred_at DESC, created_at DESC',
      [motorcycleId],
    );
    return result.rows.map((r): OccurrenceRecord => ({
      id: str(r, 'id'),
      motorcycleId: str(r, 'motorcycle_id'),
      occurredAt: when(r, 'occurred_at'),
      mileage: num(r, 'mileage'),
      title: str(r, 'title'),
      severity: str(r, 'severity') as OccurrenceRecord['severity'],
      notes: optText(r, 'notes'),
      createdAt: when(r, 'created_at'),
    }));
  }
  async insert(value: OccurrenceRecord): Promise<void> {
    await this.db.query(
      'INSERT INTO occurrence_records (id,motorcycle_id,occurred_at,mileage,title,severity,notes,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [
        value.id,
        value.motorcycleId,
        value.occurredAt,
        value.mileage,
        value.title,
        value.severity,
        value.notes ?? null,
        value.createdAt,
      ],
    );
  }
}

export class ProcedureExecutionRepository {
  constructor(private readonly db: PoolClient) {}
  async list(motorcycleId: string): Promise<ProcedureExecution[]> {
    const result = await this.db.query(
      'SELECT e.*, s.id AS resulting_service_record_id FROM procedure_executions e LEFT JOIN service_records s ON s.procedure_execution_id = e.id WHERE e.motorcycle_id = $1 ORDER BY e.updated_at DESC',
      [motorcycleId],
    );
    return result.rows.map((r): ProcedureExecution => ({
      id: str(r, 'id'),
      motorcycleId: str(r, 'motorcycle_id'),
      procedureSlug: str(r, 'procedure_slug'),
      status: str(r, 'status') as ProcedureExecution['status'],
      startedAt: when(r, 'started_at'),
      updatedAt: when(r, 'updated_at'),
      completedAt: optional(r['completed_at'], instant),
      cancelledAt: optional(r['cancelled_at'], instant),
      completedStepIds: ids(r['completed_step_ids']),
      completedFinalCheckIds: ids(r['completed_final_check_ids']),
      acknowledgedWarningIds: ids(r['acknowledged_warning_ids']),
      currentStepId: optText(r, 'current_step_id'),
      note: optText(r, 'note'),
      resultingServiceRecordId: optText(r, 'resulting_service_record_id'),
    }));
  }
  async insert(value: ProcedureExecution): Promise<void> {
    await this.db.query(
      'INSERT INTO procedure_executions (id,motorcycle_id,procedure_slug,status,started_at,updated_at,completed_at,cancelled_at,completed_step_ids,completed_final_check_ids,acknowledged_warning_ids,current_step_id,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      [
        value.id,
        value.motorcycleId,
        value.procedureSlug,
        value.status,
        value.startedAt,
        value.updatedAt,
        value.completedAt ?? null,
        value.cancelledAt ?? null,
        value.completedStepIds,
        value.completedFinalCheckIds,
        value.acknowledgedWarningIds,
        value.currentStepId ?? null,
        value.note ?? null,
      ],
    );
  }
  async update(value: ProcedureExecution): Promise<void> {
    await this.db.query(
      'UPDATE procedure_executions SET status=$2,updated_at=$3,completed_at=$4,cancelled_at=$5,completed_step_ids=$6,completed_final_check_ids=$7,acknowledged_warning_ids=$8,current_step_id=$9,note=$10 WHERE id=$1',
      [
        value.id,
        value.status,
        value.updatedAt,
        value.completedAt ?? null,
        value.cancelledAt ?? null,
        value.completedStepIds,
        value.completedFinalCheckIds,
        value.acknowledgedWarningIds,
        value.currentStepId ?? null,
        value.note ?? null,
      ],
    );
  }
}

export class SafetyCheckRepository {
  constructor(private readonly db: PoolClient) {}
  async list(motorcycleId: string): Promise<SafetyCheckRecord[]> {
    const result = await this.db.query(
      'SELECT * FROM safety_check_records WHERE motorcycle_id=$1 ORDER BY checked_at DESC, created_at DESC',
      [motorcycleId],
    );
    const responses = await this.db.query(
      'SELECT r.safety_check_id,r.item_id,r.status FROM safety_check_responses r JOIN safety_check_records c ON c.id=r.safety_check_id WHERE c.motorcycle_id=$1 ORDER BY r.item_id',
      [motorcycleId],
    );
    const byCheck = new Map<string, { itemId: string; status: 'ok' | 'issue' }[]>();
    for (const r of responses.rows) {
      const key = str(r, 'safety_check_id');
      const items = byCheck.get(key) ?? [];
      items.push({ itemId: str(r, 'item_id'), status: str(r, 'status') as 'ok' | 'issue' });
      byCheck.set(key, items);
    }
    return result.rows.map((r): SafetyCheckRecord => ({
      id: str(r, 'id'),
      motorcycleId: str(r, 'motorcycle_id'),
      checkedAt: when(r, 'checked_at'),
      notes: optText(r, 'notes'),
      createdAt: when(r, 'created_at'),
      responses: byCheck.get(str(r, 'id')) ?? [],
    }));
  }
  async insert(value: SafetyCheckRecord): Promise<void> {
    await this.db.query(
      'INSERT INTO safety_check_records (id,motorcycle_id,checked_at,notes,created_at) VALUES ($1,$2,$3,$4,$5)',
      [value.id, value.motorcycleId, value.checkedAt, value.notes ?? null, value.createdAt],
    );
    for (const response of value.responses) {
      await this.db.query(
        'INSERT INTO safety_check_responses (safety_check_id,item_id,status) VALUES ($1,$2,$3)',
        [value.id, response.itemId, response.status],
      );
    }
  }
}

export interface WriteOperation {
  readonly key: string;
  readonly type: string;
  readonly hash: string;
  readonly revision: number;
  readonly resultIds: readonly string[];
}
export class WriteOperationRepository {
  constructor(private readonly db: PoolClient) {}
  async find(key: string): Promise<WriteOperation | null> {
    const result = await this.db.query(
      'SELECT * FROM write_operations WHERE garage_id=1 AND idempotency_key=$1',
      [key],
    );
    const r = result.rows[0];
    return r
      ? {
          key: str(r, 'idempotency_key'),
          type: str(r, 'operation_type'),
          hash: str(r, 'request_hash'),
          revision: num(r, 'committed_revision'),
          resultIds: ids(r['result_ids']),
        }
      : null;
  }
  async findImport(hash: string): Promise<WriteOperation | null> {
    const result = await this.db.query(
      "SELECT * FROM write_operations WHERE garage_id=1 AND operation_type='import' AND request_hash=$1",
      [hash],
    );
    const r = result.rows[0];
    return r
      ? {
          key: str(r, 'idempotency_key'),
          type: str(r, 'operation_type'),
          hash: str(r, 'request_hash'),
          revision: num(r, 'committed_revision'),
          resultIds: ids(r['result_ids']),
        }
      : null;
  }
  async insert(operation: WriteOperation): Promise<void> {
    await this.db.query(
      'INSERT INTO write_operations (garage_id,idempotency_key,operation_type,request_hash,committed_revision,result_ids,committed_at) VALUES (1,$1,$2,$3,$4,$5,now())',
      [operation.key, operation.type, operation.hash, operation.revision, operation.resultIds],
    );
  }
}
