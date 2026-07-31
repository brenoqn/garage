import { TechnicalSource } from './technical-source.model';

export type ProcedureDifficulty = 'easy' | 'moderate' | 'advanced';

export interface ProcedureStep {
  readonly title: string;
  readonly description: string;
  readonly safetyNote?: string;
}

export interface ProcedureTechnicalValue {
  readonly label: string;
  readonly value: string;
  readonly source: TechnicalSource;
}

export interface Procedure {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  readonly difficulty: ProcedureDifficulty;
  readonly estimatedMinutes: number;
  readonly tools: readonly string[];
  readonly materials: readonly string[];
  readonly safetyWarnings: readonly string[];
  readonly steps: readonly ProcedureStep[];
  readonly images?: readonly string[];
  readonly technicalValues: readonly ProcedureTechnicalValue[];
  readonly commonMistakes: readonly string[];
  readonly finalChecks: readonly string[];
}
