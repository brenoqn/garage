import { Procedure } from '../../../core/models/procedure.model';
import { finalCheck, pendingEditorialMetadata, resource, warning } from './procedure-data.helpers';

export const BRAKE_INSPECTION_PROCEDURE: Procedure = {
  slug: 'inspecao-dos-freios',
  title: 'Inspeção dos freios',
  category: 'Freios',
  description:
    'Verificação visual e funcional do sistema de freios, com critérios técnicos mantidos como pendentes.',
  difficulty: 'advanced',
  ...pendingEditorialMetadata(
    'critical',
    'Falhas ou interpretação incorreta podem comprometer diretamente a frenagem. O checklist não certifica segurança.',
  ),
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
  technicalClaimIds: ['spec-brake-wear-limit', 'spec-brake-control-travel', 'spec-brake-fluid'],
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
};
