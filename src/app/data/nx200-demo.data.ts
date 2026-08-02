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

const resource = (id: string, name: string) => ({ id, name });
const warning = (id: string, text: string) => ({ id, text });
const finalCheck = (id: string, label: string) => ({ id, label, required: true });

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
  schemaVersion: 3,
  motorcycle: {
    id: 'nx200-primary',
    manufacturer: 'Honda',
    model: 'NX200',
    nickname: 'Minha NX',
    year: 1997,
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
      isDemo: true,
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
      isDemo: true,
    },
  ],
  odometerHistory: [],
  procedureExecutions: [],
  settings: {
    maintenanceAlertsEnabled: true,
  },
  setup: {
    completed: false,
    demoData: true,
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
    tools: [
      resource('oil-tool-collector', 'Recipiente coletor'),
      resource('oil-tool-wrench', 'Chave compatível'),
      resource('oil-tool-funnel', 'Funil'),
      resource('oil-tool-torque', 'Torquímetro, se disponível'),
    ],
    materials: [
      resource('oil-material-oil', 'Óleo especificado para a motocicleta'),
      resource('oil-material-seal', 'Arruela de vedação, se necessário'),
    ],
    safetyWarnings: [
      warning(
        'oil-warning-stability',
        'Trabalhe com a motocicleta estável, em local ventilado e com o motor apenas morno.',
      ),
      warning(
        'oil-warning-disposal',
        'Óleo usado deve ser entregue a um ponto de coleta; nunca descarte no solo ou ralo.',
      ),
    ],
    steps: [
      {
        id: 'oil-step-prepare',
        title: 'Prepare a área',
        description: 'Estabilize a moto e posicione o recipiente coletor.',
        required: true,
      },
      {
        id: 'oil-step-drain',
        title: 'Drene o óleo',
        description: 'Abra o ponto de abastecimento e remova o bujão de drenagem com cuidado.',
        required: true,
        safetyNote: 'Use luvas e evite contato com óleo quente.',
      },
      {
        id: 'oil-step-seal',
        title: 'Inspecione a vedação',
        description: 'Limpe o bujão e verifique a arruela antes da reinstalação.',
        required: true,
      },
      {
        id: 'oil-step-refill',
        title: 'Reabasteça',
        description: 'Aplique o torque e o volume somente após confirmá-los em fonte técnica.',
        required: true,
      },
      {
        id: 'oil-step-level',
        title: 'Confira o nível',
        description: 'Siga o método de medição indicado na documentação e procure vazamentos.',
        required: true,
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
    finalChecks: [
      finalCheck('oil-check-level', 'Nível conferido conforme documentação aplicável'),
      finalCheck('oil-check-leaks', 'Ausência de vazamentos aparentes'),
      finalCheck('oil-check-fasteners', 'Bujão e tampa conferidos'),
    ],
    contentNote: 'Checklist demonstrativo — valores técnicos permanecem pendentes de validação.',
  },
  {
    slug: 'ajuste-lubrificacao-corrente',
    title: 'Ajuste e lubrificação da corrente',
    category: 'Transmissão',
    description:
      'Inspeção da transmissão final, limpeza cuidadosa, lubrificação e conferência do alinhamento.',
    difficulty: 'moderate',
    estimatedMinutes: 40,
    tools: [
      resource('chain-tool-brush', 'Escova própria para corrente'),
      resource('chain-tool-wrenches', 'Chaves compatíveis'),
      resource('chain-tool-ruler', 'Régua ou medidor'),
    ],
    materials: [
      resource('chain-material-cleaner', 'Limpador compatível'),
      resource('chain-material-lubricant', 'Lubrificante para corrente'),
    ],
    safetyWarnings: [
      warning(
        'chain-warning-engine-off',
        'Desligue o motor e nunca gire a roda com o motor em funcionamento durante o serviço.',
      ),
      warning(
        'chain-warning-pinch',
        'Mantenha dedos, roupas e ferramentas longe dos pontos de esmagamento.',
      ),
    ],
    steps: [
      {
        id: 'chain-step-inspect',
        title: 'Inspecione',
        description: 'Procure elos presos, danos e desgaste irregular.',
        required: true,
      },
      {
        id: 'chain-step-clean',
        title: 'Limpe',
        description: 'Remova a sujeira com produto e escova adequados.',
        required: true,
      },
      {
        id: 'chain-step-measure',
        title: 'Meça a folga',
        description: 'Meça no ponto indicado pelo manual e compare somente com o valor confirmado.',
        required: true,
      },
      {
        id: 'chain-step-align',
        title: 'Ajuste e alinhe',
        description: 'Faça ajustes iguais nos dois lados e confirme o alinhamento da roda.',
        required: true,
      },
      {
        id: 'chain-step-lubricate',
        title: 'Lubrifique',
        description: 'Aplique uma camada uniforme e retire o excesso.',
        required: true,
      },
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
      finalCheck('chain-check-slack', 'Folga conferida conforme documentação aplicável'),
      finalCheck('chain-check-alignment', 'Roda alinhada'),
      finalCheck('chain-check-fasteners', 'Fixadores conferidos'),
      finalCheck('chain-check-excess', 'Sem excesso aparente de produto'),
    ],
    contentNote: 'Checklist demonstrativo — valores técnicos permanecem pendentes de validação.',
  },
  {
    slug: 'inspecao-da-vela',
    title: 'Inspeção da vela',
    category: 'Motor',
    description:
      'Remoção, leitura visual e reinstalação segura da vela de ignição, sem assumir medidas não confirmadas.',
    difficulty: 'moderate',
    estimatedMinutes: 30,
    tools: [
      resource('spark-tool-wrench', 'Chave de vela compatível'),
      resource('spark-tool-gauge', 'Calibrador de lâminas'),
      resource('spark-tool-air', 'Ar comprimido, se disponível'),
    ],
    materials: [
      resource('spark-material-cloth', 'Pano limpo'),
      resource('spark-material-replacement', 'Vela de reposição correta, se necessária'),
    ],
    safetyWarnings: [
      warning('spark-warning-cool', 'Espere o motor esfriar antes de remover a vela.'),
    ],
    steps: [
      {
        id: 'spark-step-clean',
        title: 'Limpe a área',
        description: 'Remova a sujeira ao redor antes de soltar a vela.',
        required: true,
      },
      {
        id: 'spark-step-remove',
        title: 'Remova',
        description: 'Retire o cachimbo e desrosqueie sem aplicar força lateral.',
        required: true,
      },
      {
        id: 'spark-step-inspect',
        title: 'Inspecione',
        description: 'Observe eletrodos, isolador, depósitos e sinais de dano.',
        required: true,
      },
      {
        id: 'spark-step-gap',
        title: 'Confirme a folga',
        description: 'Meça a abertura e compare com a documentação técnica correta.',
        required: true,
      },
      {
        id: 'spark-step-reinstall',
        title: 'Reinstale',
        description: 'Inicie a rosca à mão e use somente o torque confirmado.',
        required: true,
      },
    ],
    technicalValues: [
      technicalValue('Modelo da vela'),
      technicalValue('Folga dos eletrodos'),
      technicalValue('Torque de aperto'),
    ],
    commonMistakes: ['Iniciar a rosca com a chave.', 'Medir ou ajustar sem a ferramenta adequada.'],
    finalChecks: [
      finalCheck('spark-check-cap', 'Cachimbo assentado'),
      finalCheck('spark-check-engine', 'Motor funcionando regularmente'),
      finalCheck('spark-check-noise', 'Sem ruído ou folga aparente'),
    ],
    contentNote: 'Checklist demonstrativo — confirme modelo, folga e torque em fonte técnica.',
  },
  {
    slug: 'verificacao-da-bateria',
    title: 'Verificação da bateria',
    category: 'Elétrica',
    description: 'Checagem visual, limpeza dos terminais e medição orientada do estado da bateria.',
    difficulty: 'easy',
    estimatedMinutes: 20,
    tools: [
      resource('battery-tool-multimeter', 'Multímetro'),
      resource('battery-tool-brush', 'Escova pequena'),
      resource('battery-tool-wrench', 'Chave compatível'),
    ],
    materials: [
      resource('battery-material-protector', 'Protetor de terminais apropriado'),
      resource('battery-material-cloth', 'Pano limpo'),
    ],
    safetyWarnings: [
      warning(
        'battery-warning-short',
        'Evite curto-circuito entre os terminais e trabalhe longe de chamas ou faíscas.',
      ),
      warning(
        'battery-warning-disconnect',
        'Ao desconectar, siga a ordem indicada na documentação técnica.',
      ),
    ],
    steps: [
      {
        id: 'battery-step-inspect',
        title: 'Inspecione',
        description: 'Procure trincas, vazamentos, inchaço e oxidação.',
        required: true,
      },
      {
        id: 'battery-step-terminals',
        title: 'Confira os terminais',
        description: 'Verifique fixação e limpe sinais de corrosão.',
        required: true,
      },
      {
        id: 'battery-step-voltage',
        title: 'Meça a tensão',
        description: 'Faça a medição com o multímetro e compare com valores de fonte confirmada.',
        required: true,
      },
      {
        id: 'battery-step-finish',
        title: 'Finalize',
        description: 'Reinstale proteções e confirme que nada ficou solto.',
        required: true,
      },
    ],
    technicalValues: [
      technicalValue('Tipo e capacidade da bateria'),
      technicalValue('Tensão de repouso'),
      technicalValue('Faixa de carga'),
    ],
    commonMistakes: ['Inverter a polaridade.', 'Medir logo após carga sem respeitar o repouso.'],
    finalChecks: [
      finalCheck('battery-check-terminals', 'Terminais firmes'),
      finalCheck('battery-check-cables', 'Cabos protegidos'),
      finalCheck('battery-check-start', 'Partida observada sem anormalidade aparente'),
    ],
    contentNote: 'Checklist demonstrativo — valores elétricos permanecem pendentes de validação.',
  },
  {
    slug: 'regulagem-cabo-embreagem',
    title: 'Regulagem do cabo da embreagem',
    category: 'Comandos',
    description:
      'Inspeção do cabo, medição da folga do manete e ajuste progressivo do acionamento.',
    difficulty: 'easy',
    estimatedMinutes: 25,
    tools: [
      resource('clutch-tool-ruler', 'Régua ou medidor'),
      resource('clutch-tool-wrenches', 'Chaves compatíveis'),
    ],
    materials: [
      resource('clutch-material-lubricant', 'Lubrificante de cabo compatível, se aplicável'),
    ],
    safetyWarnings: [
      warning(
        'clutch-warning-stable',
        'Teste o acionamento com a motocicleta estável antes de conduzir.',
      ),
    ],
    steps: [
      {
        id: 'clutch-step-inspect',
        title: 'Inspecione o cabo',
        description: 'Procure fios rompidos, dobras e pontos de atrito.',
        required: true,
      },
      {
        id: 'clutch-step-measure',
        title: 'Meça a folga',
        description: 'Meça no ponto indicado pela documentação técnica.',
        required: true,
      },
      {
        id: 'clutch-step-adjust',
        title: 'Faça o ajuste',
        description: 'Use primeiro o ajustador do manete, sem exceder seu curso.',
        required: true,
      },
      {
        id: 'clutch-step-lock',
        title: 'Trave o ajuste',
        description: 'Aperte as contraporcas e movimente o guidão.',
        required: true,
      },
    ],
    technicalValues: [technicalValue('Folga livre do manete'), technicalValue('Rota do cabo')],
    commonMistakes: ['Eliminar toda a folga.', 'Ignorar mudança de tensão ao virar o guidão.'],
    finalChecks: [
      finalCheck('clutch-check-return', 'Manete retorna livremente'),
      finalCheck('clutch-check-freeplay', 'Folga conferida conforme documentação aplicável'),
      finalCheck('clutch-check-engagement', 'Acionamento progressivo observado'),
    ],
    contentNote: 'Checklist demonstrativo — confirme a folga livre em documentação técnica.',
  },
  {
    slug: 'inspecao-dos-freios',
    title: 'Inspeção dos freios',
    category: 'Freios',
    description:
      'Verificação visual e funcional do sistema de freios, com critérios técnicos mantidos como pendentes.',
    difficulty: 'advanced',
    estimatedMinutes: 35,
    tools: [
      resource('brake-tool-light', 'Lanterna'),
      resource('brake-tool-caliper', 'Paquímetro, se disponível'),
      resource('brake-tool-ruler', 'Régua'),
    ],
    materials: [resource('brake-material-cloth', 'Pano sem fiapos')],
    safetyWarnings: [
      warning(
        'brake-warning-critical',
        'Freios são itens críticos de segurança. Interrompa o uso da moto em caso de dúvida.',
      ),
      warning(
        'brake-warning-contamination',
        'Não contamine superfícies de atrito com óleo, graxa ou produto de limpeza inadequado.',
      ),
    ],
    steps: [
      {
        id: 'brake-step-controls',
        title: 'Teste os comandos',
        description: 'Observe curso, firmeza e retorno dos acionamentos.',
        required: true,
      },
      {
        id: 'brake-step-wear',
        title: 'Inspecione o desgaste',
        description: 'Compare pastilhas ou lonas com o limite confirmado.',
        required: true,
      },
      {
        id: 'brake-step-leaks',
        title: 'Procure vazamentos',
        description: 'Examine conexões, mangueiras e áreas próximas.',
        required: true,
      },
      {
        id: 'brake-step-wheel',
        title: 'Confira a roda',
        description: 'Gire a roda e procure arrasto ou ruído anormal.',
        required: true,
      },
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
      finalCheck('brake-check-controls', 'Comandos inspecionados'),
      finalCheck('brake-check-leaks', 'Ausência de vazamento aparente'),
      finalCheck('brake-check-wheel', 'Rodas verificadas quanto a arrasto aparente'),
      finalCheck(
        'brake-check-professional',
        'Avaliação profissional procurada quando houver dúvida ou anormalidade',
      ),
    ],
    contentNote:
      'Checklist demonstrativo de inspeção visual; não certifica a segurança do sistema de freios.',
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
