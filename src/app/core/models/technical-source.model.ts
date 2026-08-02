/**
 * Projeção mínima mantida no plano persistido por compatibilidade com os schemas 1–3.
 * O catálogo editorial canônico usa TechnicalDocumentSource e TechnicalClaim abaixo.
 */
export type TechnicalConfirmationStatus = 'confirmed' | 'needs-confirmation';

export interface TechnicalSource {
  readonly status: TechnicalConfirmationStatus;
  readonly label: string;
  readonly reference?: string;
  readonly claimIds?: readonly string[];
}

export type TechnicalSourceType =
  | 'owner-manual'
  | 'service-manual'
  | 'parts-catalog'
  | 'technical-bulletin'
  | 'component-manufacturer'
  | 'regulation'
  | 'professional-review'
  | 'other';

export type TechnicalSourceAvailability = 'available' | 'partial' | 'unavailable';

export interface TechnicalDocumentSource {
  readonly id: string;
  readonly type: TechnicalSourceType;
  readonly title: string;
  readonly publisher: string;
  readonly documentCode?: string;
  readonly edition?: string;
  readonly publicationYear?: number;
  readonly language?: string;
  readonly market?: string;
  readonly fileName?: string;
  readonly url?: string;
  readonly accessedAt?: string;
  readonly availability: TechnicalSourceAvailability;
  /** Decisões de aplicabilidade da fonte; não equivalem à revisão das transcrições. */
  readonly applicabilityDecisions?: readonly TechnicalSourceApplicabilityDecision[];
  readonly notes?: string;
}

export interface TechnicalCitation {
  readonly sourceId: string;
  readonly page?: number;
  readonly pageLabel?: string;
  readonly section?: string;
  readonly table?: string;
  readonly figure?: string;
  readonly excerptNote?: string;
}

export type ApplicabilityConfirmation = 'confirmed' | 'needs-confirmation';

export interface MotorcycleApplicability {
  readonly manufacturer: 'Honda';
  readonly model: 'NX200';
  readonly confirmation: ApplicabilityConfirmation;
  readonly yearFrom?: number;
  readonly yearTo?: number;
  readonly markets?: readonly string[];
  readonly variants?: readonly string[];
  readonly engineCodes?: readonly string[];
  readonly notes?: string;
}

export interface TechnicalSourceApplicabilityDecision {
  readonly id: string;
  readonly decidedAt: string;
  readonly decidedBy: string;
  readonly deciderRole?: string;
  readonly applicability: MotorcycleApplicability;
  readonly basis: string;
  readonly notes?: string;
}

export type TechnicalContentStatus =
  | 'demonstrative'
  | 'transcribed'
  | 'under-review'
  | 'confirmed'
  | 'conflicting'
  | 'deprecated'
  | 'not-applicable';

export type TechnicalReviewDecision = 'approved' | 'changes-requested' | 'rejected';

export interface TechnicalReview {
  readonly id: string;
  readonly reviewedAt: string;
  readonly reviewerName: string;
  readonly reviewerRole?: string;
  readonly decision: TechnicalReviewDecision;
  readonly notes?: string;
  readonly evidenceReference?: string;
}

export type TechnicalValue =
  | {
      readonly kind: 'scalar';
      readonly value: number;
      readonly unit: string;
    }
  | {
      readonly kind: 'range';
      readonly minimum: number;
      readonly maximum: number;
      readonly unit: string;
    }
  | {
      readonly kind: 'list';
      readonly values: readonly string[];
      readonly unit?: string;
    }
  | {
      readonly kind: 'text';
      readonly value: string;
    };

export interface TechnicalClaim {
  readonly id: string;
  /** Agrupa afirmações que representam o mesmo conceito para detecção de divergências. */
  readonly topicId: string;
  readonly label: string;
  readonly value: TechnicalValue;
  readonly status: TechnicalContentStatus;
  readonly applicability: MotorcycleApplicability;
  readonly citations: readonly TechnicalCitation[];
  readonly reviews: readonly TechnicalReview[];
  /** Fontes que ainda precisam ser obtidas; não equivale a uma citação. */
  readonly expectedSourceIds?: readonly string[];
  readonly notes?: string;
  readonly supersedesClaimId?: string;
}

export interface ContentRevision {
  readonly version: number;
  readonly revisedAt: string;
  readonly summary: string;
  readonly status: TechnicalContentStatus;
}
