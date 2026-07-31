import { TechnicalSource } from './technical-source.model';

export interface TechnicalSpecification {
  readonly id: string;
  readonly group: string;
  readonly label: string;
  readonly value: string;
  readonly source: TechnicalSource;
}
