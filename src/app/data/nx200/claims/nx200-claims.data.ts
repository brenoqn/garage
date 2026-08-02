import {
  MotorcycleApplicability,
  TechnicalClaim,
} from '../../../core/models/technical-source.model';

export const NX200_PENDING_APPLICABILITY: MotorcycleApplicability = {
  manufacturer: 'Honda',
  model: 'NX200',
  confirmation: 'needs-confirmation',
  notes: 'Ano-modelo, mercado, variante e código do motor ainda precisam ser verificados.',
};

interface PendingClaimDefinition {
  readonly id: string;
  readonly label: string;
  readonly expectedSourceIds: readonly string[];
}

const serviceManual = ['nx200-service-manual-pending'] as const;
const ownerAndServiceManuals = [
  'nx200-owner-manual-pending',
  'nx200-service-manual-pending',
] as const;
const componentAndServiceManuals = [
  'nx200-component-documentation-pending',
  'nx200-service-manual-pending',
] as const;

const definitions: readonly PendingClaimDefinition[] = [
  {
    id: 'spec-engine-identification',
    label: 'Identificação do motor',
    expectedSourceIds: serviceManual,
  },
  {
    id: 'spec-engine-oil-grade',
    label: 'Óleo recomendado',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'spec-engine-oil-capacity',
    label: 'Capacidade de óleo',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'spec-oil-drain-torque',
    label: 'Torque do bujão de drenagem',
    expectedSourceIds: serviceManual,
  },
  { id: 'spec-fuel-system', label: 'Sistema de alimentação', expectedSourceIds: serviceManual },
  {
    id: 'spec-spark-plug-model',
    label: 'Vela de ignição',
    expectedSourceIds: componentAndServiceManuals,
  },
  {
    id: 'spec-spark-plug-gap',
    label: 'Folga da vela',
    expectedSourceIds: componentAndServiceManuals,
  },
  {
    id: 'spec-spark-plug-torque',
    label: 'Torque de aperto da vela',
    expectedSourceIds: serviceManual,
  },
  {
    id: 'spec-battery-type',
    label: 'Tipo e capacidade da bateria',
    expectedSourceIds: componentAndServiceManuals,
  },
  {
    id: 'spec-battery-resting-voltage',
    label: 'Tensão de repouso da bateria',
    expectedSourceIds: componentAndServiceManuals,
  },
  {
    id: 'spec-battery-charging-range',
    label: 'Faixa de carga da bateria',
    expectedSourceIds: componentAndServiceManuals,
  },
  { id: 'spec-chain-slack', label: 'Folga da corrente', expectedSourceIds: ownerAndServiceManuals },
  {
    id: 'spec-rear-axle-torque',
    label: 'Torque do eixo traseiro',
    expectedSourceIds: serviceManual,
  },
  {
    id: 'spec-chain-wear-limit',
    label: 'Limite de desgaste da corrente',
    expectedSourceIds: serviceManual,
  },
  {
    id: 'spec-clutch-free-play',
    label: 'Folga livre do manete da embreagem',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'spec-clutch-cable-routing',
    label: 'Rota do cabo da embreagem',
    expectedSourceIds: serviceManual,
  },
  { id: 'spec-suspension', label: 'Especificações da suspensão', expectedSourceIds: serviceManual },
  {
    id: 'spec-front-tire-size',
    label: 'Medida do pneu dianteiro',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'spec-rear-tire-size',
    label: 'Medida do pneu traseiro',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'spec-tire-pressure',
    label: 'Pressão dos pneus',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'spec-brake-wear-limit',
    label: 'Limite de desgaste dos freios',
    expectedSourceIds: serviceManual,
  },
  {
    id: 'spec-brake-control-travel',
    label: 'Folga ou curso dos comandos de freio',
    expectedSourceIds: serviceManual,
  },
  {
    id: 'spec-brake-fluid',
    label: 'Especificação do fluido de freio, quando aplicável',
    expectedSourceIds: serviceManual,
  },
  {
    id: 'spec-dimensions',
    label: 'Dimensões da motocicleta',
    expectedSourceIds: ownerAndServiceManuals,
  },
  { id: 'spec-valve-clearance', label: 'Folga de válvulas', expectedSourceIds: serviceManual },
  {
    id: 'maintenance-engine-oil-interval',
    label: 'Intervalo de troca do óleo do motor',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'maintenance-drive-chain-interval',
    label: 'Intervalo de manutenção da corrente',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'maintenance-spark-plug-interval',
    label: 'Intervalo de inspeção da vela',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'maintenance-battery-interval',
    label: 'Intervalo de verificação da bateria',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'maintenance-clutch-cable-interval',
    label: 'Intervalo de inspeção do cabo da embreagem',
    expectedSourceIds: ownerAndServiceManuals,
  },
  {
    id: 'maintenance-brakes-interval',
    label: 'Intervalo de inspeção dos freios',
    expectedSourceIds: ownerAndServiceManuals,
  },
];

export const NX200_TECHNICAL_CLAIMS: readonly TechnicalClaim[] = definitions.map(
  ({ id, label, expectedSourceIds }) => ({
    id,
    topicId: id,
    label,
    value: { kind: 'text', value: 'A confirmar' },
    status: 'demonstrative',
    applicability: NX200_PENDING_APPLICABILITY,
    citations: [],
    reviews: [],
    expectedSourceIds,
    notes:
      'Placeholder editorial sem transcrição, citação localizada ou revisão. Não possui uso operacional.',
  }),
);
