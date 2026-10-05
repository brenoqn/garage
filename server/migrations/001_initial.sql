CREATE TABLE garage (
  id smallint PRIMARY KEY CHECK (id = 1),
  maintenance_alerts_enabled boolean NOT NULL,
  theme text NOT NULL CHECK (theme IN ('dark', 'light', 'system')),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0)
);

CREATE TABLE motorcycles (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  garage_id smallint NOT NULL UNIQUE REFERENCES garage(id) ON DELETE RESTRICT,
  manufacturer text NOT NULL CHECK (manufacturer = 'Honda'),
  model text NOT NULL CHECK (model = 'NX200'),
  nickname text NOT NULL CHECK (length(btrim(nickname)) > 0),
  year integer NOT NULL CHECK (year >= 0),
  current_mileage bigint NOT NULL CHECK (current_mileage BETWEEN 0 AND 9007199254740991),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE maintenance_plan_items (
  motorcycle_id text NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  id text NOT NULL CHECK (length(btrim(id)) > 0),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  category text NOT NULL CHECK (category IN ('engine','transmission','electrical','controls','brakes','general')),
  procedure_slug text,
  interval_km bigint CHECK (interval_km > 0),
  interval_days bigint CHECK (interval_days > 0),
  warning_km bigint CHECK (warning_km >= 0),
  warning_days bigint CHECK (warning_days >= 0),
  technical_status text NOT NULL CHECK (technical_status IN ('confirmed','needs-confirmation')),
  technical_label text NOT NULL CHECK (length(btrim(technical_label)) > 0),
  technical_reference text,
  claim_ids text[] NOT NULL DEFAULT '{}',
  last_execution_date date,
  last_execution_mileage bigint CHECK (last_execution_mileage BETWEEN 0 AND 9007199254740991),
  last_service_record_id text,
  PRIMARY KEY (motorcycle_id, id),
  CHECK ((last_execution_date IS NULL) = (last_execution_mileage IS NULL)),
  CHECK (last_service_record_id IS NULL OR last_execution_date IS NOT NULL)
);

CREATE TABLE procedure_executions (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  motorcycle_id text NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  procedure_slug text NOT NULL CHECK (length(btrim(procedure_slug)) > 0),
  status text NOT NULL CHECK (status IN ('in-progress','completed','cancelled')),
  started_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  completed_at timestamptz,
  cancelled_at timestamptz,
  completed_step_ids text[] NOT NULL DEFAULT '{}',
  completed_final_check_ids text[] NOT NULL DEFAULT '{}',
  acknowledged_warning_ids text[] NOT NULL DEFAULT '{}',
  current_step_id text,
  note text,
  UNIQUE (id, motorcycle_id, procedure_slug),
  CHECK (
    (status = 'in-progress' AND completed_at IS NULL AND cancelled_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND cancelled_at IS NULL AND current_step_id IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL AND completed_at IS NULL AND current_step_id IS NULL)
  )
);
CREATE UNIQUE INDEX procedure_one_active
  ON procedure_executions (motorcycle_id, procedure_slug) WHERE status = 'in-progress';
CREATE INDEX procedure_history ON procedure_executions (motorcycle_id, updated_at DESC);

CREATE TABLE service_records (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  motorcycle_id text NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  service_date date NOT NULL,
  mileage bigint NOT NULL CHECK (mileage BETWEEN 0 AND 9007199254740991),
  procedure_slug text,
  procedure_execution_id text UNIQUE,
  maintenance_plan_id text,
  cost numeric CHECK (cost >= 0 AND cost::text NOT IN ('NaN','Infinity','-Infinity')),
  notes text,
  created_at timestamptz NOT NULL,
  UNIQUE (id, motorcycle_id),
  UNIQUE (id, motorcycle_id, maintenance_plan_id),
  CHECK (procedure_execution_id IS NULL OR procedure_slug IS NOT NULL),
  FOREIGN KEY (motorcycle_id, maintenance_plan_id)
    REFERENCES maintenance_plan_items(motorcycle_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (procedure_execution_id, motorcycle_id, procedure_slug)
    REFERENCES procedure_executions(id, motorcycle_id, procedure_slug) ON DELETE RESTRICT
);
CREATE INDEX service_history ON service_records (motorcycle_id, service_date DESC, mileage DESC, created_at DESC);
CREATE INDEX service_plan ON service_records (motorcycle_id, maintenance_plan_id);
ALTER TABLE maintenance_plan_items ADD CONSTRAINT last_service_same_plan
  FOREIGN KEY (last_service_record_id, motorcycle_id, id)
  REFERENCES service_records(id, motorcycle_id, maintenance_plan_id)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE service_parts (
  service_record_id text NOT NULL REFERENCES service_records(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position >= 0),
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  quantity bigint CHECK (quantity >= 0),
  PRIMARY KEY (service_record_id, position)
);

CREATE TABLE fuel_records (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  motorcycle_id text NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  fueled_at timestamptz NOT NULL,
  mileage bigint NOT NULL CHECK (mileage BETWEEN 0 AND 9007199254740991),
  liters numeric NOT NULL CHECK (liters > 0 AND liters::text NOT IN ('NaN','Infinity','-Infinity')),
  total_cost numeric NOT NULL CHECK (total_cost >= 0 AND total_cost::text NOT IN ('NaN','Infinity','-Infinity')),
  full_tank boolean NOT NULL,
  station text,
  notes text,
  created_at timestamptz NOT NULL,
  UNIQUE (id, motorcycle_id)
);
CREATE INDEX fuel_history ON fuel_records (motorcycle_id, fueled_at, created_at);

CREATE TABLE odometer_records (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  motorcycle_id text NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  mileage bigint NOT NULL CHECK (mileage BETWEEN 0 AND 9007199254740991),
  recorded_at timestamptz NOT NULL,
  source text NOT NULL CHECK (source IN ('setup','dashboard','motorcycle','service','fuel','correction','panel-replacement','migration')),
  note text,
  service_record_id text,
  fuel_record_id text,
  CHECK (service_record_id IS NULL OR fuel_record_id IS NULL),
  CHECK (service_record_id IS NULL OR source = 'service'),
  CHECK (fuel_record_id IS NULL OR source = 'fuel'),
  FOREIGN KEY (service_record_id, motorcycle_id) REFERENCES service_records(id, motorcycle_id) ON DELETE RESTRICT,
  FOREIGN KEY (fuel_record_id, motorcycle_id) REFERENCES fuel_records(id, motorcycle_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX odometer_one_service ON odometer_records (service_record_id) WHERE service_record_id IS NOT NULL;
CREATE UNIQUE INDEX odometer_one_fuel ON odometer_records (fuel_record_id) WHERE fuel_record_id IS NOT NULL;
CREATE INDEX odometer_history ON odometer_records (motorcycle_id, recorded_at DESC);

CREATE TABLE expense_records (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  motorcycle_id text NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  expense_date date NOT NULL,
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  category text NOT NULL CHECK (category IN ('parts','document','parking','accessory','other')),
  amount numeric NOT NULL CHECK (amount >= 0 AND amount::text NOT IN ('NaN','Infinity','-Infinity')),
  mileage bigint CHECK (mileage BETWEEN 0 AND 9007199254740991),
  notes text,
  created_at timestamptz NOT NULL
);
CREATE INDEX expense_history ON expense_records (motorcycle_id, expense_date DESC, created_at DESC);

CREATE TABLE occurrence_records (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  motorcycle_id text NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL,
  mileage bigint NOT NULL CHECK (mileage BETWEEN 0 AND 9007199254740991),
  title text NOT NULL CHECK (length(btrim(title)) > 0),
  severity text NOT NULL CHECK (severity IN ('note','attention','stop')),
  notes text,
  created_at timestamptz NOT NULL
);
CREATE INDEX occurrence_history ON occurrence_records (motorcycle_id, occurred_at DESC);

CREATE TABLE safety_check_records (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  motorcycle_id text NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  checked_at timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL
);
CREATE INDEX safety_history ON safety_check_records (motorcycle_id, checked_at DESC);

CREATE TABLE safety_check_responses (
  safety_check_id text NOT NULL REFERENCES safety_check_records(id) ON DELETE RESTRICT,
  item_id text NOT NULL CHECK (length(btrim(item_id)) > 0),
  status text NOT NULL CHECK (status IN ('ok','issue')),
  PRIMARY KEY (safety_check_id, item_id)
);

CREATE TABLE write_operations (
  garage_id smallint NOT NULL REFERENCES garage(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 1 AND 200),
  operation_type text NOT NULL CHECK (length(btrim(operation_type)) > 0),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  committed_revision bigint NOT NULL CHECK (committed_revision > 0),
  result_ids text[] NOT NULL DEFAULT '{}',
  committed_at timestamptz NOT NULL,
  PRIMARY KEY (garage_id, idempotency_key),
  UNIQUE (garage_id, committed_revision)
);
CREATE UNIQUE INDEX write_one_import_digest
  ON write_operations (garage_id, request_hash) WHERE operation_type = 'import';
