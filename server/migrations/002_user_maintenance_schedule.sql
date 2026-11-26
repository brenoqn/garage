-- Schema 5 do Garage: itens de manutenção criados pelo proprietário e intervalos definidos
-- por ele. Os valores do usuário ficam em colunas próprias e nunca alteram as colunas
-- editoriais (interval_*, warning_*, technical_*), que continuam vindas do catálogo.

ALTER TABLE maintenance_plan_items
  ADD COLUMN origin text NOT NULL DEFAULT 'catalog' CHECK (origin IN ('catalog', 'user')),
  ADD COLUMN user_interval_km bigint CHECK (user_interval_km BETWEEN 1 AND 200000),
  ADD COLUMN user_interval_days bigint CHECK (user_interval_days BETWEEN 1 AND 3650),
  ADD COLUMN user_warning_km bigint CHECK (user_warning_km >= 0),
  ADD COLUMN user_warning_days bigint CHECK (user_warning_days >= 0),
  ADD COLUMN user_note text CHECK (user_note IS NULL OR length(btrim(user_note)) BETWEEN 1 AND 240),
  ADD COLUMN user_schedule_updated_at timestamptz;

ALTER TABLE maintenance_plan_items
  ADD CONSTRAINT user_schedule_requires_interval CHECK (
    user_schedule_updated_at IS NULL
    OR user_interval_km IS NOT NULL
    OR user_interval_days IS NOT NULL
  ),
  ADD CONSTRAINT user_schedule_fields_require_timestamp CHECK (
    user_schedule_updated_at IS NOT NULL
    OR (
      user_interval_km IS NULL AND user_interval_days IS NULL
      AND user_warning_km IS NULL AND user_warning_days IS NULL AND user_note IS NULL
    )
  ),
  ADD CONSTRAINT user_warning_km_below_interval CHECK (
    user_warning_km IS NULL OR (user_interval_km IS NOT NULL AND user_warning_km < user_interval_km)
  ),
  ADD CONSTRAINT user_warning_days_below_interval CHECK (
    user_warning_days IS NULL
    OR (user_interval_days IS NOT NULL AND user_warning_days < user_interval_days)
  ),
  ADD CONSTRAINT user_item_shape CHECK (
    origin = 'catalog'
    OR (
      id LIKE 'user-%'
      AND user_schedule_updated_at IS NOT NULL
      AND procedure_slug IS NULL
      AND interval_km IS NULL AND interval_days IS NULL
      AND warning_km IS NULL AND warning_days IS NULL
      AND technical_status = 'needs-confirmation'
      AND cardinality(claim_ids) = 0
    )
  ),
  ADD CONSTRAINT catalog_item_id_not_reserved CHECK (origin = 'user' OR id NOT LIKE 'user-%');
