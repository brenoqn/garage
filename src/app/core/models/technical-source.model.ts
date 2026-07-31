export type TechnicalConfirmationStatus = 'confirmed' | 'needs-confirmation';

export interface TechnicalSource {
  readonly status: TechnicalConfirmationStatus;
  readonly label: string;
  readonly reference?: string;
}
