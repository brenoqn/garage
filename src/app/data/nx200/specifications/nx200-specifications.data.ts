import { TechnicalSpecification } from '../../../core/models/specification.model';

export const NX200_SPECIFICATIONS: readonly TechnicalSpecification[] = [
  { id: 'engine-identification', system: 'motor', claimId: 'spec-engine-identification' },
  { id: 'engine-oil', system: 'lubrication', claimId: 'spec-engine-oil-grade' },
  { id: 'engine-oil-capacity', system: 'capacities', claimId: 'spec-engine-oil-capacity' },
  { id: 'fuel-system', system: 'fuel', claimId: 'spec-fuel-system' },
  { id: 'spark-plug', system: 'ignition', claimId: 'spec-spark-plug-model' },
  { id: 'spark-plug-gap', system: 'ignition', claimId: 'spec-spark-plug-gap' },
  { id: 'battery', system: 'electrical', claimId: 'spec-battery-type' },
  { id: 'chain-slack', system: 'transmission', claimId: 'spec-chain-slack' },
  { id: 'suspension', system: 'suspension', claimId: 'spec-suspension' },
  { id: 'front-tire', system: 'wheels-tires', claimId: 'spec-front-tire-size' },
  { id: 'rear-tire', system: 'wheels-tires', claimId: 'spec-rear-tire-size' },
  { id: 'tire-pressure', system: 'wheels-tires', claimId: 'spec-tire-pressure' },
  { id: 'brakes', system: 'brakes', claimId: 'spec-brake-wear-limit' },
  { id: 'dimensions', system: 'dimensions', claimId: 'spec-dimensions' },
  { id: 'valve-clearance', system: 'motor', claimId: 'spec-valve-clearance' },
  { id: 'maintenance-schedule', system: 'maintenance', claimId: 'maintenance-engine-oil-interval' },
];
