import { GarageState } from '../core/models/garage-state.model';
import { MaintenancePlanItem } from '../core/models/maintenance.model';
import { Procedure } from '../core/models/procedure.model';
import { TechnicalSpecification } from '../core/models/specification.model';
import { TechnicalSource } from '../core/models/technical-source.model';

const needsConfirmation = (label: string): TechnicalSource => ({
  status: 'needs-confirmation',
  label,
});

const demoPlanSource = needsConfirmation(
  'Parâmetro demonstrativo — confirme o intervalo na documentação da sua motocicleta',
);

const procedureSource = needsConfirmation(
  'Manual do proprietário ou manual de serviço da Honda NX200, na edição correspondente ao ano',
);

const technicalValue = (label: string) => ({
  label,
  value: 'A confirmar',
  source: procedureSource,
});

export const NX200_MAINTENANCE_PLAN: readonly MaintenancePlanItem[] = [
  {
    id: 'engine-oil',
    title: 'Óleo do motor',
    category: 'engine',
    procedureSlug: 'troca-de-oleo',
    intervalKm: 3000,
    intervalDays: 180,
    warningKm: 500,
    warningDays: 20,
    lastExecution: { date: '2026-05-12', mileage: 26400, serviceRecordId: 'demo-oil' },
    technicalSource: demoPlanSource,
  },
  {
    id: 'drive-chain',
    title: 'Corrente de transmissão',
    category: 'transmission',
    procedureSlug: 'ajuste-lubrificacao-corrente',
    intervalKm: 1000,
    warningKm: 200,
    lastExecution: { date: '2026-07-08', mileage: 27800, serviceRecordId: 'demo-chain' },
    technicalSource: demoPlanSource,
  },
  {
    id: 'spark-plug',
    title: 'Vela de ignição',
    category: 'engine',
    procedureSlug: 'inspecao-da-vela',
    intervalKm: 6000,
    warningKm: 800,
    lastExecution: { date: '2026-01-18', mileage: 23000 },
    technicalSource: demoPlanSource,
  },
  {
    id: 'battery',
    title: 'Bateria',
    category: 'electrical',
    procedureSlug: 'verificacao-da-bateria',
    intervalDays: 120,
    warningDays: 15,
    lastExecution: { date: '2026-03-10', mileage: 24800 },
    technicalSource: demoPlanSource,
  },
  {
    id: 'clutch-cable',
    title: 'Cabo da embreagem',
    category: 'controls',
    procedureSlug: 'regulagem-cabo-embreagem',
    intervalKm: 4000,
    warningKm: 500,
    lastExecution: { date: '2026-04-20', mileage: 25200 },
    technicalSource: demoPlanSource,
  },
  {
    id: 'brakes',
    title: 'Sistema de freios',
    category: 'brakes',
    procedureSlug: 'inspecao-dos-freios',
    intervalKm: 3000,
    intervalDays: 180,
    warningKm: 500,
    warningDays: 20,
    lastExecution: { date: '2026-02-25', mileage: 24000 },
    technicalSource: demoPlanSource,
  },
];

export const INITIAL_GARAGE_STATE: GarageState = {
  version: 1,
  motorcycle: {
    id: 'nx200-primary',
    manufacturer: 'Honda',
    model: 'NX200',
    nickname: 'Minha NX',
    year: 1994,
    currentMileage: 28750,
    createdAt: '2026-01-10T10:00:00.000Z',
    updatedAt: '2026-07-28T10:00:00.000Z',
  },
  maintenancePlan: NX200_MAINTENANCE_PLAN,
  serviceHistory: [
    {
      id: 'demo-chain',
      title: 'Limpeza e lubrificação da corrente',
      date: '2026-07-08',
      mileage: 27800,
      procedureSlug: 'ajuste-lubrificacao-corrente',
      maintenancePlanId: 'drive-chain',
      parts: [{ name: 'Lubrificante para corrente', quantity: 1 }],
      notes: 'Tensão conferida visualmente; valor técnico ainda precisa ser validado.',
      createdAt: '2026-07-08T14:00:00.000Z',
    },
    {
      id: 'demo-oil',
      title: 'Troca do óleo do motor',
      date: '2026-05-12',
      mileage: 26400,
      procedureSlug: 'troca-de-oleo',
      maintenancePlanId: 'engine-oil',
      cost: 82.5,
      parts: [{ name: 'Óleo do motor', quantity: 1 }],
      createdAt: '2026-05-12T14:00:00.000Z',
    },
  ],
  settings: {
    maintenanceAlertsEnabled: true,
  },
};

export const NX200_PROCEDURES: readonly Procedure[] = [
  {
    slug: 'troca-de-oleo',
    title: 'Troca de óleo',
    category: 'Motor',
    description:
      'Roteiro guiado para drenar o óleo usado, revisar a vedação e completar o motor com o produto correto.',
    difficulty: 'moderate',
    estimatedMinutes: 45,
    tools: ['Recipiente coletor', 'Chave compatível', 'Funil', 'Torquímetro, se disponível'],
    materials: ['Óleo especificado para a motocicleta', 'Arruela de vedação, se necessário'],
    safetyWarnings: [
      'Trabalhe com a motocicleta estável, em local ventilado e com o motor apenas morno.',
      'Óleo usado deve ser entregue a um ponto de coleta; nunca descarte no solo ou ralo.',
    ],
    steps: [
      {
        title: 'Prepare a área',
        description: 'Estabilize a moto e posicione o recipiente coletor.',
      },
      {
        title: 'Drene o óleo',
        description: 'Abra o ponto de abastecimento e remova o bujão de drenagem com cuidado.',
        safetyNote: 'Use luvas e evite contato com óleo quente.',
      },
      {
        title: 'Inspecione a vedação',
        description: 'Limpe o bujão e verifique a arruela antes da reinstalação.',
      },
      {
        title: 'Reabasteça',
        description: 'Aplique o torque e o volume somente após confirmá-los em fonte técnica.',
      },
      {
        title: 'Confira o nível',
        description: 'Siga o método de medição indicado na documentação e procure vazamentos.',
      },
    ],
    technicalValues: [
      technicalValue('Tipo e viscosidade do óleo'),
      technicalValue('Capacidade de abastecimento'),
      technicalValue('Torque do bujão de drenagem'),
    ],
    commonMistakes: [
      'Completar além do nível máximo.',
      'Reutilizar uma vedação danificada.',
      'Aplicar torque sem confirmar o valor.',
    ],
    finalChecks: ['Nível correto', 'Ausência de vazamentos', 'Bujão e tampa firmes'],
  },
  {
    slug: 'ajuste-lubrificacao-corrente',
    title: 'Ajuste e lubrificação da corrente',
    category: 'Transmissão',
    description:
      'Inspeção da transmissão final, limpeza cuidadosa, lubrificação e conferência do alinhamento.',
    difficulty: 'moderate',
    estimatedMinutes: 40,
    tools: ['Escova própria para corrente', 'Chaves compatíveis', 'Régua ou medidor'],
    materials: ['Limpador compatível', 'Lubrificante para corrente'],
    safetyWarnings: [
      'Desligue o motor e nunca gire a roda com o motor em funcionamento durante o serviço.',
      'Mantenha dedos, roupas e ferramentas longe dos pontos de esmagamento.',
    ],
    steps: [
      { title: 'Inspecione', description: 'Procure elos presos, danos e desgaste irregular.' },
      { title: 'Limpe', description: 'Remova a sujeira com produto e escova adequados.' },
      {
        title: 'Meça a folga',
        description: 'Meça no ponto indicado pelo manual e compare somente com o valor confirmado.',
      },
      {
        title: 'Ajuste e alinhe',
        description: 'Faça ajustes iguais nos dois lados e confirme o alinhamento da roda.',
      },
      { title: 'Lubrifique', description: 'Aplique uma camada uniforme e retire o excesso.' },
    ],
    technicalValues: [
      technicalValue('Folga da corrente'),
      technicalValue('Torque do eixo traseiro'),
      technicalValue('Limite de desgaste'),
    ],
    commonMistakes: [
      'Deixar a corrente excessivamente tensionada.',
      'Confiar apenas nas marcas sem conferir o alinhamento.',
      'Lubrificar sobre sujeira acumulada.',
    ],
    finalChecks: [
      'Folga uniforme',
      'Roda alinhada',
      'Fixadores conferidos',
      'Sem excesso de produto',
    ],
  },
  {
    slug: 'inspecao-da-vela',
    title: 'Inspeção da vela',
    category: 'Motor',
    description:
      'Remoção, leitura visual e reinstalação segura da vela de ignição, sem assumir medidas não confirmadas.',
    difficulty: 'moderate',
    estimatedMinutes: 30,
    tools: ['Chave de vela compatível', 'Calibrador de lâminas', 'Ar comprimido, se disponível'],
    materials: ['Pano limpo', 'Vela de reposição correta, se necessária'],
    safetyWarnings: ['Espere o motor esfriar antes de remover a vela.'],
    steps: [
      { title: 'Limpe a área', description: 'Remova a sujeira ao redor antes de soltar a vela.' },
      {
        title: 'Remova',
        description: 'Retire o cachimbo e desrosqueie sem aplicar força lateral.',
      },
      {
        title: 'Inspecione',
        description: 'Observe eletrodos, isolador, depósitos e sinais de dano.',
      },
      {
        title: 'Confirme a folga',
        description: 'Meça a abertura e compare com a documentação técnica correta.',
      },
      {
        title: 'Reinstale',
        description: 'Inicie a rosca à mão e use somente o torque confirmado.',
      },
    ],
    technicalValues: [
      technicalValue('Modelo da vela'),
      technicalValue('Folga dos eletrodos'),
      technicalValue('Torque de aperto'),
    ],
    commonMistakes: ['Iniciar a rosca com a chave.', 'Medir ou ajustar sem a ferramenta adequada.'],
    finalChecks: ['Cachimbo assentado', 'Motor funcionando regularmente', 'Sem ruído ou folga'],
  },
  {
    slug: 'verificacao-da-bateria',
    title: 'Verificação da bateria',
    category: 'Elétrica',
    description: 'Checagem visual, limpeza dos terminais e medição orientada do estado da bateria.',
    difficulty: 'easy',
    estimatedMinutes: 20,
    tools: ['Multímetro', 'Escova pequena', 'Chave compatível'],
    materials: ['Protetor de terminais apropriado', 'Pano limpo'],
    safetyWarnings: [
      'Evite curto-circuito entre os terminais e trabalhe longe de chamas ou faíscas.',
      'Ao desconectar, siga a ordem indicada na documentação técnica.',
    ],
    steps: [
      { title: 'Inspecione', description: 'Procure trincas, vazamentos, inchaço e oxidação.' },
      {
        title: 'Confira os terminais',
        description: 'Verifique fixação e limpe sinais de corrosão.',
      },
      {
        title: 'Meça a tensão',
        description: 'Faça a medição com o multímetro e compare com valores de fonte confirmada.',
      },
      { title: 'Finalize', description: 'Reinstale proteções e confirme que nada ficou solto.' },
    ],
    technicalValues: [
      technicalValue('Tipo e capacidade da bateria'),
      technicalValue('Tensão de repouso'),
      technicalValue('Faixa de carga'),
    ],
    commonMistakes: ['Inverter a polaridade.', 'Medir logo após carga sem respeitar o repouso.'],
    finalChecks: ['Terminais firmes', 'Cabos protegidos', 'Partida normal'],
  },
  {
    slug: 'regulagem-cabo-embreagem',
    title: 'Regulagem do cabo da embreagem',
    category: 'Comandos',
    description:
      'Inspeção do cabo, medição da folga do manete e ajuste progressivo do acionamento.',
    difficulty: 'easy',
    estimatedMinutes: 25,
    tools: ['Régua ou medidor', 'Chaves compatíveis'],
    materials: ['Lubrificante de cabo compatível, se aplicável'],
    safetyWarnings: ['Teste o acionamento com a motocicleta estável antes de conduzir.'],
    steps: [
      {
        title: 'Inspecione o cabo',
        description: 'Procure fios rompidos, dobras e pontos de atrito.',
      },
      { title: 'Meça a folga', description: 'Meça no ponto indicado pela documentação técnica.' },
      {
        title: 'Faça o ajuste',
        description: 'Use primeiro o ajustador do manete, sem exceder seu curso.',
      },
      { title: 'Trave o ajuste', description: 'Aperte as contraporcas e movimente o guidão.' },
    ],
    technicalValues: [technicalValue('Folga livre do manete'), technicalValue('Rota do cabo')],
    commonMistakes: ['Eliminar toda a folga.', 'Ignorar mudança de tensão ao virar o guidão.'],
    finalChecks: ['Manete retorna livremente', 'Folga constante', 'Engates progressivos'],
  },
  {
    slug: 'inspecao-dos-freios',
    title: 'Inspeção dos freios',
    category: 'Freios',
    description:
      'Verificação visual e funcional do sistema de freios, com critérios técnicos mantidos como pendentes.',
    difficulty: 'advanced',
    estimatedMinutes: 35,
    tools: ['Lanterna', 'Paquímetro, se disponível', 'Régua'],
    materials: ['Pano sem fiapos'],
    safetyWarnings: [
      'Freios são itens críticos de segurança. Interrompa o uso da moto em caso de dúvida.',
      'Não contamine superfícies de atrito com óleo, graxa ou produto de limpeza inadequado.',
    ],
    steps: [
      {
        title: 'Teste os comandos',
        description: 'Observe curso, firmeza e retorno dos acionamentos.',
      },
      {
        title: 'Inspecione o desgaste',
        description: 'Compare pastilhas ou lonas com o limite confirmado.',
      },
      {
        title: 'Procure vazamentos',
        description: 'Examine conexões, mangueiras e áreas próximas.',
      },
      { title: 'Confira a roda', description: 'Gire a roda e procure arrasto ou ruído anormal.' },
    ],
    technicalValues: [
      technicalValue('Limite de desgaste'),
      technicalValue('Folga ou curso dos comandos'),
      technicalValue('Especificação do fluido, quando aplicável'),
    ],
    commonMistakes: [
      'Tocar a superfície de atrito com as mãos sujas.',
      'Prosseguir diante de vazamento.',
    ],
    finalChecks: [
      'Comandos firmes',
      'Sem vazamentos',
      'Rodas giram sem travamento',
      'Teste seguro concluído',
    ],
  },
];

const specificationRows: readonly (readonly [string, string, string])[] = [
  ['engine-oil', 'Motor', 'Óleo recomendado'],
  ['engine-oil-capacity', 'Motor', 'Capacidade de óleo'],
  ['spark-plug', 'Motor', 'Vela de ignição'],
  ['spark-plug-gap', 'Motor', 'Folga da vela'],
  ['chain-slack', 'Transmissão', 'Folga da corrente'],
  ['front-tire', 'Rodas e pneus', 'Medida do pneu dianteiro'],
  ['rear-tire', 'Rodas e pneus', 'Medida do pneu traseiro'],
  ['tire-pressure', 'Rodas e pneus', 'Pressão dos pneus'],
  ['battery', 'Elétrica', 'Bateria'],
  ['valve-clearance', 'Motor', 'Folga de válvulas'],
];

export const NX200_SPECIFICATIONS: readonly TechnicalSpecification[] = specificationRows.map(
  ([id, group, label]) => ({
    id,
    group,
    label,
    value: 'A confirmar',
    source: procedureSource,
  }),
);
