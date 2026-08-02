import {
  MotorcycleApplicability,
  TechnicalCitation,
  TechnicalClaim,
  TechnicalValue,
} from '../../../core/models/technical-source.model';

export const NX200_OWNER_MANUAL_SOURCE_ID = 'nx200-owner-manual-1994';

export const NX200_1997_APPLICABILITY: MotorcycleApplicability = {
  manufacturer: 'Honda',
  model: 'NX200',
  confirmation: 'confirmed',
  yearFrom: 1997,
  yearTo: 1997,
  notes:
    'Aplicabilidade do manual do proprietário confirmada pelo proprietário do projeto para a NX200 brasileira de 1997.',
};

export const NX200_PENDING_APPLICABILITY: MotorcycleApplicability = {
  manufacturer: 'Honda',
  model: 'NX200',
  confirmation: 'needs-confirmation',
  yearFrom: 1997,
  yearTo: 1997,
  notes: 'O valor ainda depende de uma fonte adicional aplicável à NX200 brasileira de 1997.',
};

interface ClaimDefinition {
  readonly id: string;
  readonly label: string;
  readonly value?: TechnicalValue;
  readonly citations?: readonly TechnicalCitation[];
  readonly expectedSourceIds?: readonly string[];
  readonly notes?: string;
}

const serviceManual = ['nx200-service-manual-pending'] as const;
const componentAndServiceManuals = [
  'nx200-component-documentation-pending',
  'nx200-service-manual-pending',
] as const;

const manualCitation = (
  page: number,
  section: string,
  excerptNote?: string,
): TechnicalCitation => ({
  sourceId: NX200_OWNER_MANUAL_SOURCE_ID,
  page,
  section,
  excerptNote,
});

const definitions: readonly ClaimDefinition[] = [
  {
    id: 'spec-engine-identification',
    label: 'Identificação do motor',
    value: {
      kind: 'text',
      value: 'Número do motor gravado na parte inferior esquerda da carcaça do motor.',
    },
    citations: [manualCitation(45, 'Identificação da motocicleta')],
  },
  {
    id: 'spec-engine-oil-grade',
    label: 'Óleo recomendado',
    value: {
      kind: 'list',
      values: ['Motor 4 tempos', 'Multiviscoso SAE 20W-50', 'API-SF'],
    },
    citations: [manualCitation(22, 'Óleo do motor — Especificações')],
  },
  {
    id: 'spec-engine-oil-capacity',
    label: 'Capacidade de óleo',
    value: { kind: 'list', values: ['1,1 L para troca', '1,4 L após desmontagem do motor'] },
    citations: [manualCitation(80, 'Especificações — Capacidades')],
  },
  {
    id: 'spec-oil-drain-torque',
    label: 'Torque do bujão de drenagem',
    value: { kind: 'scalar', value: 15, unit: 'N·m' },
    citations: [manualCitation(49, 'Troca do óleo do motor')],
    expectedSourceIds: serviceManual,
    notes: 'Valor transcrito do manual do proprietário; exige confronto com manual de serviço.',
  },
  {
    id: 'spec-fuel-system',
    label: 'Sistema de alimentação',
    value: {
      kind: 'text',
      value: 'Carburador; gasolina aditivada; tanque de 8,5 L, incluindo reserva de 1,8 L.',
    },
    citations: [manualCitation(19, 'Combustível — Tanque de combustível')],
  },
  {
    id: 'spec-spark-plug-model',
    label: 'Vela de ignição',
    value: { kind: 'text', value: 'DP8EA-9 (NGK)' },
    citations: [manualCitation(50, 'Vela de ignição')],
  },
  {
    id: 'spec-spark-plug-gap',
    label: 'Folga da vela',
    value: { kind: 'range', minimum: 0.8, maximum: 0.9, unit: 'mm' },
    citations: [manualCitation(50, 'Vela de ignição')],
  },
  {
    id: 'spec-spark-plug-torque',
    label: 'Torque de aperto da vela',
    expectedSourceIds: serviceManual,
    notes:
      'O manual do proprietário informa aperto por fração de volta, mas não fornece torque numérico.',
  },
  {
    id: 'spec-battery-type',
    label: 'Tipo e capacidade da bateria',
    value: { kind: 'list', values: ['12 V', '7 Ah'] },
    citations: [manualCitation(82, 'Especificações — Sistema elétrico')],
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
  {
    id: 'spec-chain-slack',
    label: 'Folga da corrente',
    value: { kind: 'range', minimum: 35, maximum: 45, unit: 'mm' },
    citations: [manualCitation(55, 'Corrente de transmissão — Inspeção')],
  },
  {
    id: 'spec-rear-axle-torque',
    label: 'Torque do eixo traseiro',
    value: { kind: 'scalar', value: 90, unit: 'N·m' },
    citations: [manualCitation(58, 'Corrente de transmissão — Ajuste')],
    expectedSourceIds: serviceManual,
    notes: 'Valor transcrito do manual do proprietário; exige confronto com manual de serviço.',
  },
  {
    id: 'spec-chain-wear-limit',
    label: 'Limite de desgaste da corrente',
    value: {
      kind: 'text',
      value:
        'Substituir corrente, coroa e pinhão quando a faixa vermelha do indicador alinhar ou ultrapassar a seta do ajustador.',
    },
    citations: [manualCitation(58, 'Corrente de transmissão — Verificação do desgaste')],
  },
  {
    id: 'spec-clutch-free-play',
    label: 'Folga livre do manete da embreagem',
    value: { kind: 'range', minimum: 10, maximum: 20, unit: 'mm' },
    citations: [manualCitation(16, 'Embreagem')],
  },
  {
    id: 'spec-clutch-cable-routing',
    label: 'Rota do cabo da embreagem',
    expectedSourceIds: serviceManual,
    notes: 'O manual do proprietário descreve os ajustadores, mas não documenta a rota completa.',
  },
  {
    id: 'spec-suspension',
    label: 'Especificações da suspensão',
    value: {
      kind: 'list',
      values: ['Dianteira: garfo telescópico hidráulico', 'Traseira: PRO-LINK'],
    },
    citations: [manualCitation(82, 'Especificações — Chassi e suspensão')],
  },
  {
    id: 'spec-front-tire-size',
    label: 'Medida do pneu dianteiro',
    value: { kind: 'text', value: '2.75-21 45R' },
    citations: [manualCitation(20, 'Recomendações sobre os pneus')],
  },
  {
    id: 'spec-rear-tire-size',
    label: 'Medida do pneu traseiro',
    value: { kind: 'text', value: '4.10-18 60R' },
    citations: [manualCitation(20, 'Recomendações sobre os pneus')],
  },
  {
    id: 'spec-tire-pressure',
    label: 'Pressão dos pneus',
    value: {
      kind: 'list',
      values: ['Dianteiro: 150 kPa (1,5 kg/cm²; 22 psi)', 'Traseiro: 150 kPa (1,5 kg/cm²; 22 psi)'],
    },
    citations: [manualCitation(20, 'Recomendações sobre os pneus')],
    notes: 'O manual apresenta a mesma pressão a frio para piloto sozinho ou com passageiro.',
  },
  {
    id: 'spec-brake-wear-limit',
    label: 'Limite de desgaste dos freios',
    value: {
      kind: 'text',
      value:
        'Dianteiro: trocar quando as ranhuras atingirem as faces do disco. Traseiro: trocar quando a seta alinhar com a marca de referência totalmente acionado.',
    },
    citations: [
      manualCitation(68, 'Pastilhas do freio dianteiro'),
      manualCitation(69, 'Indicador de desgaste do freio traseiro'),
    ],
  },
  {
    id: 'spec-brake-control-travel',
    label: 'Folga ou curso dos comandos de freio',
    value: {
      kind: 'text',
      value:
        'Pedal traseiro: 20–30 mm. Freio dianteiro hidráulico: sem ajuste; folga excessiva requer inspeção do sistema.',
    },
    citations: [
      manualCitation(12, 'Freios — Freio dianteiro'),
      manualCitation(14, 'Freios — Freio traseiro — Ajuste'),
    ],
  },
  {
    id: 'spec-brake-fluid',
    label: 'Especificação do fluido de freio, quando aplicável',
    value: { kind: 'text', value: 'DOT 4' },
    citations: [manualCitation(12, 'Freios — Nível do fluido do freio')],
  },
  {
    id: 'spec-dimensions',
    label: 'Dimensões da motocicleta',
    value: {
      kind: 'list',
      values: [
        'Comprimento: 2.055 mm',
        'Largura: 810 mm',
        'Altura: 1.130 mm',
        'Entre-eixos: 1.330 mm',
      ],
    },
    citations: [manualCitation(80, 'Especificações — Dimensões')],
  },
  {
    id: 'spec-valve-clearance',
    label: 'Folga de válvulas',
    value: { kind: 'scalar', value: 0.1, unit: 'mm (admissão/escape)' },
    citations: [manualCitation(81, 'Especificações — Motor')],
    expectedSourceIds: serviceManual,
    notes:
      'Tolerância transcrita do manual do proprietário; exige confronto com manual de serviço.',
  },
  {
    id: 'maintenance-engine-oil-interval',
    label: 'Intervalo de troca do óleo do motor',
    value: { kind: 'scalar', value: 1500, unit: 'km' },
    citations: [manualCitation(40, 'Tabela de manutenção')],
  },
  {
    id: 'maintenance-drive-chain-interval',
    label: 'Intervalo de manutenção da corrente',
    value: { kind: 'scalar', value: 1000, unit: 'km' },
    citations: [manualCitation(40, 'Tabela de manutenção')],
    notes: 'Inspeção diária e manutenção mais frequente em condições severas também são indicadas.',
  },
  {
    id: 'maintenance-spark-plug-interval',
    label: 'Intervalo de inspeção da vela',
    value: {
      kind: 'list',
      values: ['Limpar e ajustar a cada 3.000 km', 'Trocar a cada 8.000 km'],
    },
    citations: [manualCitation(40, 'Tabela de manutenção')],
  },
  {
    id: 'maintenance-battery-interval',
    label: 'Intervalo de verificação da bateria',
    value: { kind: 'scalar', value: 1000, unit: 'km' },
    citations: [manualCitation(41, 'Tabela de manutenção')],
  },
  {
    id: 'maintenance-clutch-cable-interval',
    label: 'Intervalo de inspeção do cabo da embreagem',
    value: { kind: 'scalar', value: 3000, unit: 'km' },
    citations: [manualCitation(41, 'Tabela de manutenção')],
  },
  {
    id: 'maintenance-brakes-interval',
    label: 'Intervalo de inspeção dos freios',
    value: { kind: 'scalar', value: 3000, unit: 'km' },
    citations: [manualCitation(41, 'Tabela de manutenção')],
    notes: 'A tabela também determina troca do fluido dianteiro a cada dois anos.',
  },
];

export const NX200_TECHNICAL_CLAIMS: readonly TechnicalClaim[] = definitions.map(
  ({ id, label, value, citations = [], expectedSourceIds, notes }) => ({
    id,
    topicId: id,
    label,
    value: value ?? { kind: 'text', value: 'A confirmar' },
    status: citations.length ? 'transcribed' : 'demonstrative',
    applicability: citations.length ? NX200_1997_APPLICABILITY : NX200_PENDING_APPLICABILITY,
    citations,
    reviews: [],
    expectedSourceIds,
    notes:
      notes ??
      (citations.length
        ? 'Transcrição localizada no manual do proprietário; revisão técnica ainda não realizada.'
        : 'Informação ausente no manual do proprietário e ainda sem fonte suficiente.'),
  }),
);
