import { ProcedureRiskLevel } from '../models/procedure.model';
import {
  MotorcycleApplicability,
  TechnicalCitation,
  TechnicalClaim,
  TechnicalContentStatus,
  TechnicalDocumentSource,
  TechnicalReview,
  TechnicalValue,
} from '../models/technical-source.model';

export interface MotorcycleConfiguration {
  readonly manufacturer: string;
  readonly model: string;
  readonly year?: number;
  readonly market?: string;
  readonly variant?: string;
  readonly engineCode?: string;
}

export type ApplicabilityMatch = 'applicable' | 'not-applicable' | 'unknown';
export type ChecklistUse = 'operational' | 'reference-only' | 'educational-only' | 'blocked';

export interface TechnicalConflict {
  readonly topicId: string;
  readonly claimIds: readonly [string, string];
  readonly reason: string;
}

const statusLabels: Record<TechnicalContentStatus, string> = {
  demonstrative: 'Demonstrativo',
  transcribed: 'Transcrito',
  'under-review': 'Em revisão',
  confirmed: 'Confirmado',
  conflicting: 'Conflitante',
  deprecated: 'Obsoleto',
  'not-applicable': 'Não aplicável',
};

const statusMessages: Record<TechnicalContentStatus, string> = {
  demonstrative: 'Conteúdo demonstrativo — não utilizar como especificação mecânica.',
  transcribed: 'Transcrito de fonte identificada — revisão técnica pendente.',
  'under-review': 'Informação em revisão.',
  confirmed: 'Confirmado para a configuração selecionada, quando a aplicabilidade corresponder.',
  conflicting: 'Fontes divergentes — não use este valor até a resolução.',
  deprecated: 'Conteúdo substituído ou invalidado — não utilizar operacionalmente.',
  'not-applicable': 'Conteúdo não aplicável à configuração selecionada.',
};

export function technicalStatusLabel(status: TechnicalContentStatus): string {
  return statusLabels[status];
}

export function technicalStatusMessage(status: TechnicalContentStatus): string {
  return statusMessages[status];
}

export function formatTechnicalValue(value: TechnicalValue): string {
  if (value.kind === 'text') return value.value;
  if (value.kind === 'scalar') return `${value.value} ${value.unit}`;
  if (value.kind === 'range') return `${value.minimum}–${value.maximum} ${value.unit}`;
  return `${value.values.join(', ')}${value.unit ? ` ${value.unit}` : ''}`;
}

export function hasLocalizedCitation(citation: TechnicalCitation): boolean {
  return Boolean(
    (citation.page !== undefined && Number.isInteger(citation.page) && citation.page > 0) ||
    citation.pageLabel?.trim() ||
    citation.section?.trim() ||
    citation.table?.trim() ||
    citation.figure?.trim(),
  );
}

export function latestTechnicalReview(
  reviews: readonly TechnicalReview[],
): TechnicalReview | undefined {
  return [...reviews].sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))[0];
}

export function hasApprovedCurrentReview(reviews: readonly TechnicalReview[]): boolean {
  return latestTechnicalReview(reviews)?.decision === 'approved';
}

export function citationLocation(citation: TechnicalCitation): string {
  const parts = [
    citation.page !== undefined ? `página ${citation.page}` : citation.pageLabel,
    citation.section ? `seção ${citation.section}` : undefined,
    citation.table ? `tabela ${citation.table}` : undefined,
    citation.figure ? `figura ${citation.figure}` : undefined,
  ].filter((part): part is string => Boolean(part));
  return parts.join(' · ') || 'Localização não informada';
}

export function applicabilityMatch(
  applicability: MotorcycleApplicability,
  motorcycle: MotorcycleConfiguration,
): ApplicabilityMatch {
  if (
    motorcycle.manufacturer !== applicability.manufacturer ||
    motorcycle.model !== applicability.model
  ) {
    return 'not-applicable';
  }
  if (
    motorcycle.year !== undefined &&
    ((applicability.yearFrom !== undefined && motorcycle.year < applicability.yearFrom) ||
      (applicability.yearTo !== undefined && motorcycle.year > applicability.yearTo))
  ) {
    return 'not-applicable';
  }
  if (
    motorcycle.market &&
    applicability.markets &&
    !applicability.markets.includes(motorcycle.market)
  ) {
    return 'not-applicable';
  }
  if (
    motorcycle.variant &&
    applicability.variants &&
    !applicability.variants.includes(motorcycle.variant)
  ) {
    return 'not-applicable';
  }
  if (
    motorcycle.engineCode &&
    applicability.engineCodes &&
    !applicability.engineCodes.includes(motorcycle.engineCode)
  ) {
    return 'not-applicable';
  }
  if (applicability.confirmation !== 'confirmed') return 'unknown';
  if (
    (motorcycle.year === undefined &&
      (applicability.yearFrom !== undefined || applicability.yearTo !== undefined)) ||
    (!motorcycle.market && applicability.markets?.length) ||
    (!motorcycle.variant && applicability.variants?.length) ||
    (!motorcycle.engineCode && applicability.engineCodes?.length)
  ) {
    return 'unknown';
  }
  return 'applicable';
}

function dimensionsOverlap(left?: readonly string[], right?: readonly string[]): boolean {
  if (!left?.length || !right?.length) return true;
  return left.some((value) => right.includes(value));
}

export function applicabilityOverlaps(
  left: MotorcycleApplicability,
  right: MotorcycleApplicability,
): boolean {
  if (left.manufacturer !== right.manufacturer || left.model !== right.model) return false;
  const leftStart = left.yearFrom ?? Number.NEGATIVE_INFINITY;
  const leftEnd = left.yearTo ?? Number.POSITIVE_INFINITY;
  const rightStart = right.yearFrom ?? Number.NEGATIVE_INFINITY;
  const rightEnd = right.yearTo ?? Number.POSITIVE_INFINITY;
  return (
    Math.max(leftStart, rightStart) <= Math.min(leftEnd, rightEnd) &&
    dimensionsOverlap(left.markets, right.markets) &&
    dimensionsOverlap(left.variants, right.variants) &&
    dimensionsOverlap(left.engineCodes, right.engineCodes)
  );
}

export function checklistUseForStatus(status: TechnicalContentStatus): ChecklistUse {
  if (status === 'confirmed') return 'operational';
  if (status === 'transcribed' || status === 'under-review') return 'reference-only';
  if (status === 'demonstrative') return 'educational-only';
  return 'blocked';
}

export function claimCanBeUsedOperationally(
  claim: TechnicalClaim,
  sources: readonly TechnicalDocumentSource[],
  conflicts: readonly TechnicalConflict[] = [],
): boolean {
  const sourceIds = new Set(sources.map((source) => source.id));
  return (
    claim.status === 'confirmed' &&
    claim.applicability.confirmation === 'confirmed' &&
    claim.citations.length > 0 &&
    claim.citations.every(
      (citation) => sourceIds.has(citation.sourceId) && hasLocalizedCitation(citation),
    ) &&
    hasApprovedCurrentReview(claim.reviews) &&
    !conflicts.some((conflict) => conflict.claimIds.includes(claim.id))
  );
}

export function procedureNeedsEnhancedWarning(
  riskLevel: ProcedureRiskLevel,
  claims: readonly TechnicalClaim[],
): boolean {
  return (
    (riskLevel === 'high' || riskLevel === 'critical') &&
    claims.some((claim) => claim.status !== 'confirmed')
  );
}

export function criticalProcedureCompletionBlocked(
  riskLevel: ProcedureRiskLevel,
  claims: readonly TechnicalClaim[],
): boolean {
  return (
    (riskLevel === 'high' || riskLevel === 'critical') &&
    claims.some((claim) => claim.status === 'conflicting')
  );
}

function valueSignature(value: TechnicalValue): string {
  if (value.kind === 'text') return `text:${value.value.trim().toLocaleLowerCase('pt-BR')}`;
  if (value.kind === 'scalar') return `scalar:${value.value}:${value.unit}`;
  if (value.kind === 'range') return `range:${value.minimum}:${value.maximum}:${value.unit}`;
  return `list:${value.values.join('|')}:${value.unit ?? ''}`;
}

export function detectTechnicalConflicts(
  claims: readonly TechnicalClaim[],
): readonly TechnicalConflict[] {
  const confirmed = claims.filter((claim) => claim.status === 'confirmed');
  const conflicts: TechnicalConflict[] = [];
  for (let leftIndex = 0; leftIndex < confirmed.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < confirmed.length; rightIndex += 1) {
      const left = confirmed[leftIndex]!;
      const right = confirmed[rightIndex]!;
      const superseded = left.supersedesClaimId === right.id || right.supersedesClaimId === left.id;
      if (
        !superseded &&
        left.topicId === right.topicId &&
        applicabilityOverlaps(left.applicability, right.applicability) &&
        valueSignature(left.value) !== valueSignature(right.value)
      ) {
        conflicts.push({
          topicId: left.topicId,
          claimIds: [left.id, right.id],
          reason: 'Claims confirmadas possuem valores diferentes e aplicabilidade sobreposta.',
        });
      }
    }
  }
  return conflicts;
}
