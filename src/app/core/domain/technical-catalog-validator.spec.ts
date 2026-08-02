import { describe, expect, it } from 'vitest';
import { NX200_TECHNICAL_CATALOG } from '../../data/nx200-demo.data';
import { TechnicalCatalog } from '../models/technical-catalog.model';
import { TechnicalClaim, TechnicalDocumentSource } from '../models/technical-source.model';
import { validateTechnicalCatalog } from './technical-catalog-validator';

const source: TechnicalDocumentSource = {
  id: 'source-1',
  type: 'service-manual',
  title: 'Manual de teste',
  publisher: 'Editor',
  publicationYear: 1997,
  availability: 'available',
};

const claim = (id: string, value = '10'): TechnicalClaim => ({
  id,
  topicId: 'topic',
  label: 'Claim de teste',
  value: { kind: 'text', value },
  status: 'confirmed',
  applicability: {
    manufacturer: 'Honda',
    model: 'NX200',
    confirmation: 'confirmed',
    yearFrom: 1997,
    yearTo: 1997,
    markets: ['Brasil'],
  },
  citations: [{ sourceId: source.id, page: 10, section: 'Tabela de teste' }],
  reviews: [
    {
      id: `review-${id}`,
      reviewedAt: '2026-08-02T10:00:00.000Z',
      reviewerName: 'Revisor',
      decision: 'approved',
    },
  ],
});

const catalog = (claims: readonly TechnicalClaim[]): TechnicalCatalog => ({
  sources: [source],
  claims,
  specifications: [],
  procedures: [],
  maintenancePlan: [],
});

describe('technical catalog validator', () => {
  it('accepts the bundled catalog without blocking violations', () => {
    expect(
      validateTechnicalCatalog(NX200_TECHNICAL_CATALOG).filter((item) => item.severity === 'error'),
    ).toEqual([]);
  });

  it('reports unavailable source metadata as transparent non-blocking warnings', () => {
    const warnings = validateTechnicalCatalog(NX200_TECHNICAL_CATALOG).filter(
      (item) => item.code === 'source-unavailable',
    );
    expect(warnings).toHaveLength(3);
  });

  it('rejects confirmation without citation, review or confirmed applicability', () => {
    const invalid: TechnicalClaim = {
      ...claim('invalid'),
      citations: [],
      reviews: [],
      applicability: { ...claim('invalid').applicability, confirmation: 'needs-confirmation' },
    };
    const codes = validateTechnicalCatalog(catalog([invalid])).map((item) => item.code);
    expect(codes).toContain('confirmed-without-citation');
    expect(codes).toContain('confirmed-without-review');
    expect(codes).toContain('confirmed-without-applicability');
  });

  it('rejects an unknown source, non-positive page and empty citation location', () => {
    const invalid = {
      ...claim('invalid-citation'),
      citations: [{ sourceId: 'missing', page: 0 }],
    };
    const codes = validateTechnicalCatalog(catalog([invalid])).map((item) => item.code);
    expect(codes).toContain('citation-missing-source');
    expect(codes).toContain('citation-invalid-page');
    expect(codes).toContain('citation-missing-location');
  });

  it('requires page and section for every source-derived claim', () => {
    const invalid: TechnicalClaim = {
      ...claim('missing-section'),
      status: 'transcribed',
      citations: [{ sourceId: source.id, page: 10 }],
      reviews: [],
    };
    expect(validateTechnicalCatalog(catalog([invalid])).map((item) => item.code)).toContain(
      'citation-missing-page-or-section',
    );
  });

  it('validates source applicability decisions independently from technical reviews', () => {
    const invalidSource: TechnicalDocumentSource = {
      ...source,
      applicabilityDecisions: [
        {
          id: 'decision',
          decidedAt: 'invalid-date',
          decidedBy: '',
          basis: '',
          applicability: {
            manufacturer: 'Honda',
            model: 'NX200',
            confirmation: 'confirmed',
            yearFrom: 1998,
            yearTo: 1997,
          },
        },
      ],
    };
    const codes = validateTechnicalCatalog({ ...catalog([]), sources: [invalidSource] }).map(
      (item) => item.code,
    );
    expect(codes).toContain('invalid-applicability-decision');
    expect(codes).toContain('applicability-year');
  });

  it('rejects change-requested or rejected reviews as current confirmation', () => {
    for (const decision of ['changes-requested', 'rejected'] as const) {
      const invalid = {
        ...claim(`review-${decision}`),
        reviews: [
          {
            ...claim(`review-${decision}`).reviews[0]!,
            decision,
          },
        ],
      };
      expect(validateTechnicalCatalog(catalog([invalid])).map((item) => item.code)).toContain(
        'confirmed-without-review',
      );
    }
  });

  it('reports overlapping confirmed values and allows a valid supersession', () => {
    const left = claim('left', '10');
    const right = claim('right', '20');
    expect(validateTechnicalCatalog(catalog([left, right])).map((item) => item.code)).toContain(
      'overlapping-confirmed-conflict',
    );
    expect(
      validateTechnicalCatalog(catalog([left, { ...right, supersedesClaimId: left.id }])).some(
        (item) => item.code === 'overlapping-confirmed-conflict',
      ),
    ).toBe(false);
  });

  it('rejects missing and circular supersession references', () => {
    const missing = { ...claim('missing'), supersedesClaimId: 'does-not-exist' };
    expect(validateTechnicalCatalog(catalog([missing])).map((item) => item.code)).toContain(
      'missing-superseded-claim',
    );
    const left = { ...claim('cycle-left'), supersedesClaimId: 'cycle-right' };
    const right = { ...claim('cycle-right'), supersedesClaimId: 'cycle-left' };
    expect(validateTechnicalCatalog(catalog([left, right])).map((item) => item.code)).toContain(
      'circular-supersession',
    );
  });

  it('rejects invalid source year and broken catalog references', () => {
    const invalidCatalog: TechnicalCatalog = {
      ...catalog([claim('valid')]),
      sources: [{ ...source, publicationYear: 0 }],
      specifications: [{ id: 'spec', system: 'motor', claimId: 'missing' }],
    };
    const codes = validateTechnicalCatalog(invalidCatalog).map((item) => item.code);
    expect(codes).toContain('source-publication-year');
    expect(codes).toContain('specification-missing-claim');
  });

  it('rejects invalid source type, availability and unidentified available edition', () => {
    const invalidSource = {
      ...source,
      id: 'invalid-source',
      type: 'website',
      availability: 'online',
      publicationYear: undefined,
    } as unknown as TechnicalDocumentSource;
    const unidentified = {
      ...source,
      id: 'unidentified-source',
      publicationYear: undefined,
    };
    const invalidCatalog: TechnicalCatalog = {
      sources: [invalidSource, unidentified],
      claims: [],
      specifications: [],
      procedures: [],
      maintenancePlan: [],
    };
    const codes = validateTechnicalCatalog(invalidCatalog).map((item) => item.code);
    expect(codes).toContain('source-invalid-type');
    expect(codes).toContain('source-invalid-availability');
    expect(codes).toContain('source-missing-edition');
  });
});
