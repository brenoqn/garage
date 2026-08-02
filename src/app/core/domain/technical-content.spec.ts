import { describe, expect, it } from 'vitest';
import {
  MotorcycleApplicability,
  TechnicalClaim,
  TechnicalDocumentSource,
} from '../models/technical-source.model';
import {
  applicabilityMatch,
  applicabilityOverlaps,
  checklistUseForStatus,
  claimCanBeUsedOperationally,
  criticalProcedureCompletionBlocked,
  detectTechnicalConflicts,
  hasApprovedCurrentReview,
  procedureNeedsEnhancedWarning,
} from './technical-content';

const source: TechnicalDocumentSource = {
  id: 'source-1',
  type: 'service-manual',
  title: 'Documento de teste',
  publisher: 'Editor de teste',
  availability: 'available',
};

const applicability: MotorcycleApplicability = {
  manufacturer: 'Honda',
  model: 'NX200',
  confirmation: 'confirmed',
  yearFrom: 1995,
  yearTo: 1998,
  markets: ['Brasil'],
  variants: ['standard'],
};

const confirmedClaim = (
  id: string,
  value = '10',
  overrides: Partial<TechnicalClaim> = {},
): TechnicalClaim => ({
  id,
  topicId: 'topic-1',
  label: 'Valor de teste',
  value: { kind: 'text', value },
  status: 'confirmed',
  applicability,
  citations: [{ sourceId: source.id, page: 12, section: 'Tabela' }],
  reviews: [
    {
      id: `review-${id}`,
      reviewedAt: '2026-08-02T10:00:00.000Z',
      reviewerName: 'Revisor de teste',
      decision: 'approved',
    },
  ],
  ...overrides,
});

describe('technical content policies', () => {
  it('evaluates a specific year, range, market and variant', () => {
    expect(
      applicabilityMatch(applicability, {
        manufacturer: 'Honda',
        model: 'NX200',
        year: 1997,
        market: 'Brasil',
        variant: 'standard',
      }),
    ).toBe('applicable');
    expect(
      applicabilityMatch(applicability, {
        manufacturer: 'Honda',
        model: 'NX200',
        year: 2000,
        market: 'Brasil',
        variant: 'standard',
      }),
    ).toBe('not-applicable');
    expect(
      applicabilityMatch(applicability, {
        manufacturer: 'Honda',
        model: 'NX200',
        year: 1997,
        market: 'Outro',
        variant: 'standard',
      }),
    ).toBe('not-applicable');
  });

  it('returns unknown for an incomplete motorcycle configuration or pending applicability', () => {
    expect(
      applicabilityMatch(applicability, {
        manufacturer: 'Honda',
        model: 'NX200',
        year: 1997,
      }),
    ).toBe('unknown');
    expect(
      applicabilityMatch(
        { ...applicability, confirmation: 'needs-confirmation' },
        {
          manufacturer: 'Honda',
          model: 'NX200',
          year: 1997,
          market: 'Brasil',
          variant: 'standard',
        },
      ),
    ).toBe('unknown');
  });

  it('detects overlapping and disjoint applicability', () => {
    expect(
      applicabilityOverlaps(applicability, { ...applicability, yearFrom: 1998, yearTo: 2001 }),
    ).toBe(true);
    expect(
      applicabilityOverlaps(applicability, { ...applicability, yearFrom: 2001, yearTo: 2002 }),
    ).toBe(false);
    expect(applicabilityOverlaps(applicability, { ...applicability, markets: ['Outro'] })).toBe(
      false,
    );
  });

  it('maps editorial states to safe checklist behavior', () => {
    expect(checklistUseForStatus('confirmed')).toBe('operational');
    expect(checklistUseForStatus('transcribed')).toBe('reference-only');
    expect(checklistUseForStatus('under-review')).toBe('reference-only');
    expect(checklistUseForStatus('demonstrative')).toBe('educational-only');
    expect(checklistUseForStatus('conflicting')).toBe('blocked');
    expect(checklistUseForStatus('deprecated')).toBe('blocked');
    expect(checklistUseForStatus('not-applicable')).toBe('blocked');
  });

  it('requires a localized citation, current approval and confirmed applicability for operational use', () => {
    const valid = confirmedClaim('claim-valid');
    expect(claimCanBeUsedOperationally(valid, [source])).toBe(true);
    expect(claimCanBeUsedOperationally({ ...valid, citations: [] }, [source])).toBe(false);
    expect(claimCanBeUsedOperationally({ ...valid, reviews: [] }, [source])).toBe(false);
    expect(
      claimCanBeUsedOperationally(
        {
          ...valid,
          applicability: { ...valid.applicability, confirmation: 'needs-confirmation' },
        },
        [source],
      ),
    ).toBe(false);
  });

  it('uses the most recent review decision', () => {
    const claim = confirmedClaim('claim-review', '10', {
      reviews: [
        ...confirmedClaim('claim-review-base').reviews,
        {
          id: 'changes-requested',
          reviewedAt: '2026-08-03T10:00:00.000Z',
          reviewerName: 'Segundo revisor',
          decision: 'changes-requested',
        },
      ],
    });
    expect(hasApprovedCurrentReview(claim.reviews)).toBe(false);
    expect(claimCanBeUsedOperationally(claim, [source])).toBe(false);
  });

  it('detects only different confirmed values with overlapping applicability', () => {
    const left = confirmedClaim('claim-left', '10');
    const same = confirmedClaim('claim-same', '10');
    const different = confirmedClaim('claim-different', '20');
    const disjoint = confirmedClaim('claim-disjoint', '30', {
      applicability: { ...applicability, yearFrom: 2000, yearTo: 2001 },
    });
    expect(detectTechnicalConflicts([left, same])).toEqual([]);
    expect(detectTechnicalConflicts([left, different])).toHaveLength(1);
    expect(detectTechnicalConflicts([left, disjoint])).toEqual([]);
    expect(detectTechnicalConflicts([left, { ...different, supersedesClaimId: left.id }])).toEqual(
      [],
    );
  });

  it('reinforces pending high-risk content and blocks explicit conflicts in critical content', () => {
    const pending = { ...confirmedClaim('pending'), status: 'demonstrative' as const };
    expect(procedureNeedsEnhancedWarning('high', [pending])).toBe(true);
    expect(procedureNeedsEnhancedWarning('moderate', [pending])).toBe(false);
    expect(
      criticalProcedureCompletionBlocked('critical', [{ ...pending, status: 'conflicting' }]),
    ).toBe(true);
  });
});
