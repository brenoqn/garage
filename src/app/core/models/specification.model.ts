export type TechnicalSystem =
  | 'motor'
  | 'lubrication'
  | 'fuel'
  | 'ignition'
  | 'electrical'
  | 'transmission'
  | 'suspension'
  | 'wheels-tires'
  | 'brakes'
  | 'dimensions'
  | 'capacities'
  | 'maintenance';

export interface TechnicalSpecification {
  readonly id: string;
  readonly system: TechnicalSystem;
  readonly claimId: string;
}
