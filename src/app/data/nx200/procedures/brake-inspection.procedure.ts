import { Procedure } from '../../../core/models/procedure.model';
import {
  finalCheck,
  resource,
  transcribedEditorialMetadata,
  warning,
} from './procedure-data.helpers';

export const BRAKE_INSPECTION_PROCEDURE: Procedure = {
  slug: 'inspecao-dos-freios',
  title: 'Inspeção dos freios',
  category: 'Freios',
  description:
    'Inspeção visual dos comandos, vazamentos e sinais de desgaste. Não inclui reparo ou sangria.',
  difficulty: 'advanced',
  ...transcribedEditorialMetadata(
    'critical',
    'Pare diante de vazamento, comando estranho, desgaste ou dúvida. Não rode até um profissional avaliar os freios.',
  ),
  estimatedMinutes: 35,
  tools: [
    resource('brake-tool-light', 'Lanterna'),
    resource(
      'brake-tool-caliper',
      'Paquímetro; não necessário para os indicadores visuais descritos no manual',
    ),
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
      description:
        'Acione os dois comandos e observe se o movimento parece normal. Consulte a referência técnica antes de ajustar.',
      required: true,
    },
    {
      id: 'brake-step-wear',
      title: 'Inspecione o desgaste',
      description:
        'Confira as ranhuras das pastilhas dianteiras e o alinhamento entre seta e marca do indicador traseiro.',
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
    'Inspeção visual transcrita das seções de freios (págs. 12–15 e 68–69). Reparos, sangria e limpeza interna do freio traseiro não são cobertos por este checklist.',
};
