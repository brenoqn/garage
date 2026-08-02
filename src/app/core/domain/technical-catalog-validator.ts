import { TechnicalCatalog } from '../models/technical-catalog.model';
import {
  MotorcycleApplicability,
  TechnicalClaim,
  TechnicalValue,
} from '../models/technical-source.model';
import {
  claimCanBeUsedOperationally,
  detectTechnicalConflicts,
  hasLocalizedCitation,
  latestTechnicalReview,
} from './technical-content';
import { validateProcedureCatalog } from './procedure-integrity';

export type ContentValidationSeverity = 'error' | 'warning';

export interface ContentValidationIssue {
  readonly severity: ContentValidationSeverity;
  readonly code: string;
  readonly scope: string;
  readonly entityId: string;
  readonly message: string;
}

const issue = (
  severity: ContentValidationSeverity,
  code: string,
  scope: string,
  entityId: string,
  message: string,
): ContentValidationIssue => ({ severity, code, scope, entityId, message });

function isNonEmpty(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function duplicated(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function validateApplicability(
  applicability: MotorcycleApplicability,
  claimId: string,
): readonly ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  if (applicability.manufacturer !== 'Honda' || applicability.model !== 'NX200') {
    issues.push(
      issue(
        'error',
        'applicability-model',
        'claims',
        claimId,
        'Aplicabilidade fora da Honda NX200.',
      ),
    );
  }
  if (
    (applicability.yearFrom !== undefined &&
      (!Number.isInteger(applicability.yearFrom) || applicability.yearFrom <= 0)) ||
    (applicability.yearTo !== undefined &&
      (!Number.isInteger(applicability.yearTo) || applicability.yearTo <= 0)) ||
    (applicability.yearFrom !== undefined &&
      applicability.yearTo !== undefined &&
      applicability.yearFrom > applicability.yearTo)
  ) {
    issues.push(
      issue('error', 'applicability-year', 'claims', claimId, 'Intervalo de anos inválido.'),
    );
  }
  for (const [name, values] of [
    ['markets', applicability.markets],
    ['variants', applicability.variants],
    ['engineCodes', applicability.engineCodes],
  ] as const) {
    if (values?.some((value) => !isNonEmpty(value))) {
      issues.push(
        issue(
          'error',
          'applicability-empty-value',
          'claims',
          claimId,
          `${name} contém valor vazio.`,
        ),
      );
    }
  }
  return issues;
}

function validateValue(value: TechnicalValue, claimId: string): readonly ContentValidationIssue[] {
  if (value.kind === 'text' && !isNonEmpty(value.value)) {
    return [issue('error', 'claim-empty-value', 'claims', claimId, 'Valor textual vazio.')];
  }
  if (value.kind === 'scalar' && (!Number.isFinite(value.value) || !isNonEmpty(value.unit))) {
    return [
      issue('error', 'claim-scalar-value', 'claims', claimId, 'Valor escalar ou unidade inválida.'),
    ];
  }
  if (
    value.kind === 'range' &&
    (!Number.isFinite(value.minimum) ||
      !Number.isFinite(value.maximum) ||
      value.minimum > value.maximum ||
      !isNonEmpty(value.unit))
  ) {
    return [issue('error', 'claim-range-value', 'claims', claimId, 'Faixa ou unidade inválida.')];
  }
  if (
    value.kind === 'list' &&
    (value.values.length === 0 || value.values.some((item) => !isNonEmpty(item)))
  ) {
    return [
      issue('error', 'claim-list-value', 'claims', claimId, 'Lista técnica vazia ou inválida.'),
    ];
  }
  return [];
}

function findSupersessionCycles(claims: readonly TechnicalClaim[]): readonly string[] {
  const byId = new Map(claims.map((claim) => [claim.id, claim]));
  const cycles = new Set<string>();
  for (const claim of claims) {
    const seen = new Set<string>();
    let current: TechnicalClaim | undefined = claim;
    while (current?.supersedesClaimId) {
      if (seen.has(current.id)) {
        seen.forEach((id) => cycles.add(id));
        cycles.add(current.id);
        break;
      }
      seen.add(current.id);
      current = byId.get(current.supersedesClaimId);
    }
  }
  return [...cycles];
}

export function validateTechnicalCatalog(
  catalog: TechnicalCatalog,
): readonly ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = [];
  const sourceTypes = [
    'owner-manual',
    'service-manual',
    'parts-catalog',
    'technical-bulletin',
    'component-manufacturer',
    'regulation',
    'professional-review',
    'other',
  ];
  const sourceAvailabilities = ['available', 'partial', 'unavailable'];
  const sourceIds = catalog.sources.map((source) => source.id);
  const claimIds = catalog.claims.map((claim) => claim.id);
  const sourceIdSet = new Set(sourceIds);
  const claimIdSet = new Set(claimIds);

  duplicated(sourceIds).forEach((id) =>
    issues.push(issue('error', 'duplicate-source-id', 'sources', id, 'ID de fonte duplicado.')),
  );
  duplicated(claimIds).forEach((id) =>
    issues.push(issue('error', 'duplicate-claim-id', 'claims', id, 'ID de claim duplicado.')),
  );

  for (const source of catalog.sources) {
    if (!isNonEmpty(source.id) || !isNonEmpty(source.title) || !isNonEmpty(source.publisher)) {
      issues.push(
        issue(
          'error',
          'source-required-metadata',
          'sources',
          source.id || '(vazio)',
          'Fonte sem ID, título ou editor.',
        ),
      );
    }
    if (!sourceTypes.includes(source.type)) {
      issues.push(
        issue('error', 'source-invalid-type', 'sources', source.id, 'Tipo de fonte inválido.'),
      );
    }
    if (!sourceAvailabilities.includes(source.availability)) {
      issues.push(
        issue(
          'error',
          'source-invalid-availability',
          'sources',
          source.id,
          'Disponibilidade da fonte inválida.',
        ),
      );
    }
    if (
      source.publicationYear !== undefined &&
      (!Number.isInteger(source.publicationYear) ||
        source.publicationYear < 1800 ||
        source.publicationYear > 2100)
    ) {
      issues.push(
        issue(
          'error',
          'source-publication-year',
          'sources',
          source.id,
          'Ano de publicação incoerente.',
        ),
      );
    }
    if (source.availability === 'unavailable') {
      issues.push(
        issue(
          'warning',
          'source-unavailable',
          'sources',
          source.id,
          'Documento ainda não está disponível no repositório.',
        ),
      );
    }
    if (
      source.availability === 'available' &&
      !isNonEmpty(source.documentCode) &&
      !isNonEmpty(source.edition) &&
      source.publicationYear === undefined
    ) {
      issues.push(
        issue(
          'error',
          'source-missing-edition',
          'sources',
          source.id,
          'Fonte disponível exige código, edição ou ano que identifique a versão.',
        ),
      );
    }
  }

  for (const claim of catalog.claims) {
    if (!isNonEmpty(claim.id) || !isNonEmpty(claim.topicId) || !isNonEmpty(claim.label)) {
      issues.push(
        issue(
          'error',
          'claim-required-metadata',
          'claims',
          claim.id || '(vazio)',
          'Claim sem ID, tópico ou rótulo.',
        ),
      );
    }
    issues.push(...validateValue(claim.value, claim.id));
    issues.push(...validateApplicability(claim.applicability, claim.id));
    for (const citation of claim.citations) {
      if (!sourceIdSet.has(citation.sourceId)) {
        issues.push(
          issue(
            'error',
            'citation-missing-source',
            'claims',
            claim.id,
            `Fonte inexistente: ${citation.sourceId}.`,
          ),
        );
      }
      if (citation.page !== undefined && (!Number.isInteger(citation.page) || citation.page <= 0)) {
        issues.push(
          issue(
            'error',
            'citation-invalid-page',
            'claims',
            claim.id,
            'Página deve ser um inteiro positivo.',
          ),
        );
      }
      if (!hasLocalizedCitation(citation)) {
        issues.push(
          issue(
            'error',
            'citation-missing-location',
            'claims',
            claim.id,
            'Citação sem página, seção, tabela ou figura.',
          ),
        );
      }
      if (citation.excerptNote && citation.excerptNote.length > 280) {
        issues.push(
          issue(
            'error',
            'citation-long-note',
            'claims',
            claim.id,
            'Nota da citação excede o limite editorial.',
          ),
        );
      }
    }
    for (const expectedSourceId of claim.expectedSourceIds ?? []) {
      if (!sourceIdSet.has(expectedSourceId)) {
        issues.push(
          issue(
            'error',
            'claim-missing-expected-source',
            'claims',
            claim.id,
            `Fonte esperada inexistente: ${expectedSourceId}.`,
          ),
        );
      }
    }
    const reviewIds = claim.reviews.map((review) => review.id);
    duplicated(reviewIds).forEach((id) =>
      issues.push(
        issue('error', 'duplicate-review-id', 'claims', claim.id, `Revisão duplicada: ${id}.`),
      ),
    );
    for (const review of claim.reviews) {
      if (
        !isNonEmpty(review.id) ||
        !isNonEmpty(review.reviewerName) ||
        Number.isNaN(Date.parse(review.reviewedAt))
      ) {
        issues.push(
          issue(
            'error',
            'invalid-review',
            'claims',
            claim.id,
            'Revisão sem ID, revisor ou data válida.',
          ),
        );
      }
    }
    if (claim.status === 'confirmed') {
      if (
        claim.citations.length === 0 ||
        claim.citations.some((citation) => !hasLocalizedCitation(citation))
      ) {
        issues.push(
          issue(
            'error',
            'confirmed-without-citation',
            'claims',
            claim.id,
            'Claim confirmada exige citação localizada.',
          ),
        );
      }
      if (claim.applicability.confirmation !== 'confirmed') {
        issues.push(
          issue(
            'error',
            'confirmed-without-applicability',
            'claims',
            claim.id,
            'Claim confirmada exige aplicabilidade confirmada.',
          ),
        );
      }
      if (latestTechnicalReview(claim.reviews)?.decision !== 'approved') {
        issues.push(
          issue(
            'error',
            'confirmed-without-review',
            'claims',
            claim.id,
            'Claim confirmada exige revisão aprovada vigente.',
          ),
        );
      }
    }
    if (claim.supersedesClaimId && !claimIdSet.has(claim.supersedesClaimId)) {
      issues.push(
        issue(
          'error',
          'missing-superseded-claim',
          'claims',
          claim.id,
          `Claim substituída inexistente: ${claim.supersedesClaimId}.`,
        ),
      );
    }
  }

  findSupersessionCycles(catalog.claims).forEach((id) =>
    issues.push(
      issue('error', 'circular-supersession', 'claims', id, 'Referência circular de supersessão.'),
    ),
  );

  const conflicts = detectTechnicalConflicts(catalog.claims);
  for (const conflict of conflicts) {
    conflict.claimIds.forEach((id) =>
      issues.push(
        issue(
          'error',
          'overlapping-confirmed-conflict',
          'claims',
          id,
          `${conflict.reason} Envolvidas: ${conflict.claimIds.join(', ')}.`,
        ),
      ),
    );
  }

  for (const specification of catalog.specifications) {
    if (!claimIdSet.has(specification.claimId)) {
      issues.push(
        issue(
          'error',
          'specification-missing-claim',
          'specifications',
          specification.id,
          `Claim inexistente: ${specification.claimId}.`,
        ),
      );
    }
  }

  for (const procedure of catalog.procedures) {
    for (const claimId of procedure.technicalClaimIds) {
      if (!claimIdSet.has(claimId)) {
        issues.push(
          issue(
            'error',
            'procedure-missing-claim',
            'procedures',
            procedure.slug,
            `Claim inexistente: ${claimId}.`,
          ),
        );
      }
    }
    for (const sourceId of procedure.primarySourceIds) {
      if (!sourceIdSet.has(sourceId)) {
        issues.push(
          issue(
            'error',
            'procedure-missing-source',
            'procedures',
            procedure.slug,
            `Fonte inexistente: ${sourceId}.`,
          ),
        );
      }
    }
    if (
      !Number.isInteger(procedure.editorialRevision.version) ||
      procedure.editorialRevision.version <= 0
    ) {
      issues.push(
        issue(
          'error',
          'procedure-invalid-revision',
          'procedures',
          procedure.slug,
          'Versão editorial inválida.',
        ),
      );
    }
  }
  validateProcedureCatalog(catalog.procedures).forEach((procedureIssue) =>
    issues.push(
      issue(
        'error',
        'procedure-integrity',
        'procedures',
        procedureIssue.procedureSlug ?? 'catalog',
        procedureIssue.message,
      ),
    ),
  );

  for (const item of catalog.maintenancePlan) {
    for (const claimId of item.technicalSource.claimIds ?? []) {
      const claim = catalog.claims.find((candidate) => candidate.id === claimId);
      if (!claim) {
        issues.push(
          issue(
            'error',
            'maintenance-missing-claim',
            'maintenance-plan',
            item.id,
            `Claim inexistente: ${claimId}.`,
          ),
        );
      } else if (
        item.technicalSource.status === 'confirmed' &&
        !claimCanBeUsedOperationally(claim, catalog.sources, conflicts)
      ) {
        issues.push(
          issue(
            'error',
            'maintenance-non-operational-claim',
            'maintenance-plan',
            item.id,
            `Claim ${claimId} não pode habilitar alertas.`,
          ),
        );
      }
    }
  }
  return issues;
}

export function formatContentValidationIssues(issues: readonly ContentValidationIssue[]): string {
  return issues
    .map(
      (entry) =>
        `[${entry.severity.toUpperCase()}] ${entry.scope}/${entry.entityId} ${entry.code}: ${entry.message}`,
    )
    .join('\n');
}
