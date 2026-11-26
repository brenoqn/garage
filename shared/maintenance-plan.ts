/**
 * Regras puras do plano de manutenção definido pelo proprietário. Sem Angular nem Node.
 *
 * Um intervalo definido pelo usuário vale somente para a moto dele e é sempre exibido como
 * "definido por você". Ele não confirma, corrige nem substitui conteúdo técnico editorial.
 */
import type {
  MaintenanceCategory,
  MaintenancePlanItem,
  TechnicalSource,
  UserMaintenanceSchedule,
} from './garage';

export const USER_PLAN_ITEM_ID_PREFIX = 'user-';
export const MAINTENANCE_CATEGORIES: readonly MaintenanceCategory[] = [
  'engine',
  'transmission',
  'electrical',
  'controls',
  'brakes',
  'general',
];
export const MAX_USER_INTERVAL_KM = 200_000;
export const MAX_USER_INTERVAL_DAYS = 3_650;
export const MAX_PLAN_TITLE_LENGTH = 80;
export const MAX_SCHEDULE_NOTE_LENGTH = 240;

/** Fonte registrada nos itens criados pelo usuário: deixa explícito que não há fonte técnica. */
export const USER_PLAN_ITEM_SOURCE: TechnicalSource = {
  status: 'needs-confirmation',
  label: 'Item criado por você. Não há fonte técnica vinculada.',
};

export interface MaintenanceScheduleInput {
  readonly intervalKm?: number;
  readonly intervalDays?: number;
  readonly warningKm?: number;
  readonly warningDays?: number;
  readonly note?: string;
}

export interface NewUserMaintenanceItem extends MaintenanceScheduleInput {
  readonly title: string;
  readonly category: MaintenanceCategory;
}

export type PlanResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: string };

/** Intervalo que efetivamente gera lembretes, com a base usada. */
export interface EffectiveMaintenanceInterval {
  readonly basis: 'user' | 'confirmed-source';
  readonly intervalKm?: number;
  readonly intervalDays?: number;
  readonly warningKm?: number;
  readonly warningDays?: number;
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function checkPair(
  interval: number | undefined,
  warning: number | undefined,
  max: number,
  unit: 'km' | 'dias',
): string | null {
  if (interval !== undefined && (!isWholeNumber(interval) || interval <= 0 || interval > max)) {
    return `Informe um intervalo em ${unit} entre 1 e ${max.toLocaleString('pt-BR')}.`;
  }
  if (warning === undefined) return null;
  if (interval === undefined) {
    return `O aviso antecipado em ${unit} exige um intervalo em ${unit}.`;
  }
  if (!isWholeNumber(warning) || warning < 0 || warning >= interval) {
    return `O aviso antecipado em ${unit} deve ser menor que o intervalo.`;
  }
  return null;
}

/** Valida e normaliza o intervalo informado pelo usuário. */
export function buildUserSchedule(
  input: MaintenanceScheduleInput,
  updatedAt: string,
): PlanResult<UserMaintenanceSchedule> {
  if (input.intervalKm === undefined && input.intervalDays === undefined) {
    return { ok: false, error: 'Informe um intervalo em km, em dias ou nos dois.' };
  }
  const error =
    checkPair(input.intervalKm, input.warningKm, MAX_USER_INTERVAL_KM, 'km') ??
    checkPair(input.intervalDays, input.warningDays, MAX_USER_INTERVAL_DAYS, 'dias');
  if (error) return { ok: false, error };
  const note = input.note?.trim();
  if (note && note.length > MAX_SCHEDULE_NOTE_LENGTH) {
    return { ok: false, error: `A observação aceita até ${MAX_SCHEDULE_NOTE_LENGTH} caracteres.` };
  }
  if (typeof updatedAt !== 'string' || Number.isNaN(Date.parse(updatedAt))) {
    return { ok: false, error: 'Data de atualização inválida.' };
  }
  const schedule: {
    -readonly [K in keyof UserMaintenanceSchedule]: UserMaintenanceSchedule[K];
  } = { updatedAt };
  if (input.intervalKm !== undefined) schedule.intervalKm = input.intervalKm;
  if (input.intervalDays !== undefined) schedule.intervalDays = input.intervalDays;
  if (input.warningKm !== undefined) schedule.warningKm = input.warningKm;
  if (input.warningDays !== undefined) schedule.warningDays = input.warningDays;
  if (note) schedule.note = note;
  return { ok: true, value: schedule };
}

/** Validação de runtime de um intervalo já persistido. */
export function isValidUserSchedule(value: unknown): value is UserMaintenanceSchedule {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const allowed = ['intervalKm', 'intervalDays', 'warningKm', 'warningDays', 'note', 'updatedAt'];
  if (Object.keys(record).some((key) => !allowed.includes(key))) return false;
  if (record['note'] !== undefined && typeof record['note'] !== 'string') return false;
  if (typeof record['note'] === 'string' && !record['note'].trim()) return false;
  if (typeof record['updatedAt'] !== 'string' || !record['updatedAt'].includes('T')) return false;
  const result = buildUserSchedule(record as MaintenanceScheduleInput, record['updatedAt']);
  return result.ok && JSON.stringify(result.value) === JSON.stringify(normalize(record));
}

function normalize(record: Record<string, unknown>): Record<string, unknown> {
  const ordered: Record<string, unknown> = { updatedAt: record['updatedAt'] };
  for (const key of ['intervalKm', 'intervalDays', 'warningKm', 'warningDays', 'note']) {
    if (record[key] !== undefined) ordered[key] = record[key];
  }
  return ordered;
}

export function isUserPlanItemId(id: string): boolean {
  return id.startsWith(USER_PLAN_ITEM_ID_PREFIX);
}

/** Cria um item do plano a partir do formulário do usuário. */
export function createUserMaintenanceItem(
  input: NewUserMaintenanceItem,
  id: string,
  now: string,
): PlanResult<MaintenancePlanItem> {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length > MAX_PLAN_TITLE_LENGTH) {
    return { ok: false, error: `Informe um nome com até ${MAX_PLAN_TITLE_LENGTH} caracteres.` };
  }
  if (!MAINTENANCE_CATEGORIES.includes(input.category)) {
    return { ok: false, error: 'Escolha uma categoria válida.' };
  }
  if (!isUserPlanItemId(id) || id.length <= USER_PLAN_ITEM_ID_PREFIX.length) {
    return { ok: false, error: 'Identificador inválido para item do usuário.' };
  }
  const schedule = buildUserSchedule(input, now);
  if (!schedule.ok) return schedule;
  return {
    ok: true,
    value: {
      id,
      title,
      category: input.category,
      origin: 'user',
      userSchedule: schedule.value,
      technicalSource: USER_PLAN_ITEM_SOURCE,
    },
  };
}

/**
 * Regras de integridade entre origem, identificador, fonte e intervalo. Retorna a mensagem do
 * primeiro problema ou `null`.
 */
export function planItemIntegrityError(item: MaintenancePlanItem): string | null {
  if (item.origin === 'user') {
    if (!isUserPlanItemId(item.id)) return 'Um item do usuário não usa o prefixo reservado.';
    if (!item.userSchedule) return 'Um item do usuário não possui intervalo definido.';
    if (
      item.intervalKm !== undefined ||
      item.intervalDays !== undefined ||
      item.warningKm !== undefined ||
      item.warningDays !== undefined
    ) {
      return 'Um item do usuário não pode carregar intervalos do catálogo.';
    }
    if (item.procedureSlug !== undefined) {
      return 'Um item do usuário não pode apontar para um procedimento editorial.';
    }
    if (
      item.technicalSource.status === 'confirmed' ||
      (item.technicalSource.claimIds ?? []).length
    ) {
      return 'Um item do usuário não pode declarar fonte técnica confirmada.';
    }
    return null;
  }
  if (isUserPlanItemId(item.id)) return 'Um item do catálogo usa o prefixo reservado ao usuário.';
  return null;
}

/**
 * O intervalo do usuário prevalece quando existe. Sem ele, só o intervalo do catálogo com fonte
 * confirmada é operacional. Transcrições pendentes não geram lembretes.
 */
export function effectiveMaintenanceInterval(
  item: MaintenancePlanItem,
): EffectiveMaintenanceInterval | undefined {
  if (item.userSchedule) {
    return {
      basis: 'user',
      intervalKm: item.userSchedule.intervalKm,
      intervalDays: item.userSchedule.intervalDays,
      warningKm: item.userSchedule.warningKm,
      warningDays: item.userSchedule.warningDays,
    };
  }
  if (item.origin === 'catalog' && item.technicalSource.status === 'confirmed') {
    if (item.intervalKm === undefined && item.intervalDays === undefined) return undefined;
    return {
      basis: 'confirmed-source',
      intervalKm: item.intervalKm,
      intervalDays: item.intervalDays,
      warningKm: item.warningKm,
      warningDays: item.warningDays,
    };
  }
  return undefined;
}

/**
 * Define ou remove o intervalo do usuário em um item existente. Para itens do catálogo, `null`
 * volta a depender somente da fonte técnica. Itens do usuário sempre exigem intervalo.
 */
export function applyUserSchedule(
  item: MaintenancePlanItem,
  input: MaintenanceScheduleInput | null,
  now: string,
): PlanResult<MaintenancePlanItem> {
  if (input === null) {
    if (item.origin === 'user') {
      return { ok: false, error: 'Um item criado por você precisa de um intervalo.' };
    }
    const copy = { ...item };
    delete copy.userSchedule;
    return { ok: true, value: copy };
  }
  const schedule = buildUserSchedule(input, now);
  if (!schedule.ok) return schedule;
  return { ok: true, value: { ...item, userSchedule: schedule.value } };
}

/** Atualiza nome, categoria e intervalo de um item criado pelo usuário. */
export function updateUserMaintenanceItem(
  item: MaintenancePlanItem,
  input: NewUserMaintenanceItem,
  now: string,
): PlanResult<MaintenancePlanItem> {
  if (item.origin !== 'user') {
    return { ok: false, error: 'Itens do catálogo não podem ser renomeados.' };
  }
  const rebuilt = createUserMaintenanceItem(input, item.id, now);
  if (!rebuilt.ok) return rebuilt;
  return {
    ok: true,
    value: {
      ...rebuilt.value,
      ...(item.lastExecution ? { lastExecution: item.lastExecution } : {}),
    },
  };
}

/** Um item só pode ser removido quando foi criado pelo usuário e nenhum serviço aponta para ele. */
export function planItemRemovalError(
  item: MaintenancePlanItem,
  services: readonly { readonly maintenancePlanId?: string }[],
): string | null {
  if (item.origin !== 'user') return 'Itens do catálogo não podem ser removidos.';
  if (services.some((service) => service.maintenancePlanId === item.id)) {
    return 'Existem serviços registrados para este item. Ele não pode ser removido.';
  }
  return null;
}
