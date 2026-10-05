import { NewSafetyCheckRecord, SafetyCheckItem, SafetyCheckRecord } from './garage';

export type SafetyCheckResult =
  | { readonly ok: true; readonly record: SafetyCheckRecord }
  | { readonly ok: false; readonly error: string };

export function buildSafetyCheckRecord(
  input: NewSafetyCheckRecord,
  items: readonly SafetyCheckItem[],
  motorcycleId: string,
  id: string,
  createdAt: string,
): SafetyCheckResult {
  if (Number.isNaN(Date.parse(input.checkedAt))) {
    return { ok: false, error: 'A data da inspeção é inválida.' };
  }
  const expectedIds = new Set(items.map((item) => item.id));
  const receivedIds = input.responses.map((response) => response.itemId);
  if (
    receivedIds.length !== expectedIds.size ||
    new Set(receivedIds).size !== receivedIds.length ||
    receivedIds.some((idValue) => !expectedIds.has(idValue))
  ) {
    return { ok: false, error: 'Revise todos os itens antes de concluir a inspeção.' };
  }
  if (input.responses.some((response) => !['ok', 'issue'].includes(response.status))) {
    return { ok: false, error: 'Uma resposta do checklist é inválida.' };
  }
  return {
    ok: true,
    record: {
      ...input,
      id,
      motorcycleId,
      createdAt,
      notes: input.notes?.trim() || undefined,
    },
  };
}

export function safetyCheckHasIssues(record: SafetyCheckRecord): boolean {
  return record.responses.some((response) => response.status === 'issue');
}
