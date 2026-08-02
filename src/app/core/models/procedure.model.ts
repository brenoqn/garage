import { ContentRevision, MotorcycleApplicability } from './technical-source.model';

export type ProcedureDifficulty = 'easy' | 'moderate' | 'advanced';
export type ProcedureRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface ProcedureResource {
  readonly id: string;
  readonly name: string;
}

export interface ProcedureWarning {
  readonly id: string;
  readonly text: string;
}

export interface ProcedureFinalCheck {
  readonly id: string;
  readonly label: string;
  readonly required: boolean;
}

export interface ProcedureStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly required: boolean;
  readonly safetyNote?: string;
  readonly imageRefs?: readonly string[];
  readonly suggestedTimerSeconds?: number;
}

export interface Procedure {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly difficulty: ProcedureDifficulty;
  readonly riskLevel: ProcedureRiskLevel;
  readonly riskNote: string;
  readonly estimatedMinutes: number;
  readonly tools: readonly ProcedureResource[];
  readonly materials: readonly ProcedureResource[];
  readonly safetyWarnings: readonly ProcedureWarning[];
  readonly steps: readonly ProcedureStep[];
  readonly images?: readonly string[];
  readonly technicalClaimIds: readonly string[];
  readonly primarySourceIds: readonly string[];
  readonly applicability: MotorcycleApplicability;
  readonly editorialRevision: ContentRevision;
  readonly commonMistakes: readonly string[];
  readonly finalChecks: readonly ProcedureFinalCheck[];
  readonly contentNote?: string;
}
