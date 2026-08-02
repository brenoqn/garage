import { describe, expect, it } from 'vitest';
import { NX200_PRE_RIDE_CHECKLIST } from '../../data/nx200/safety/nx200-pre-ride-checklist.data';
import { buildSafetyCheckRecord, safetyCheckHasIssues } from './safety-check';

describe('pre-ride safety check', () => {
  const responses = NX200_PRE_RIDE_CHECKLIST.map((item) => ({
    itemId: item.id,
    status: 'ok' as const,
  }));

  it('requires one response for every stable checklist item', () => {
    const result = buildSafetyCheckRecord(
      { checkedAt: '2026-08-02T10:00:00.000Z', responses: responses.slice(1) },
      NX200_PRE_RIDE_CHECKLIST,
      'nx200-primary',
      'check-1',
      '2026-08-02T10:01:00.000Z',
    );
    expect(result.ok).toBe(false);
  });

  it('rejects duplicate and unknown item identifiers', () => {
    const duplicate = [...responses.slice(1), responses[1]!];
    expect(
      buildSafetyCheckRecord(
        { checkedAt: '2026-08-02T10:00:00.000Z', responses: duplicate },
        NX200_PRE_RIDE_CHECKLIST,
        'nx200-primary',
        'check-1',
        '2026-08-02T10:01:00.000Z',
      ).ok,
    ).toBe(false);
  });

  it('persists issues without claiming the motorcycle is safe', () => {
    const result = buildSafetyCheckRecord(
      {
        checkedAt: '2026-08-02T10:00:00.000Z',
        responses: responses.map((response, index) =>
          index === 2 ? { ...response, status: 'issue' as const } : response,
        ),
        notes: '  Freio com sensação diferente.  ',
      },
      NX200_PRE_RIDE_CHECKLIST,
      'nx200-primary',
      'check-1',
      '2026-08-02T10:01:00.000Z',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.notes).toBe('Freio com sensação diferente.');
      expect(safetyCheckHasIssues(result.record)).toBe(true);
    }
  });
});
