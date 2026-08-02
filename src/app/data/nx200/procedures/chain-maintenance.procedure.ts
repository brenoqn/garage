import { Procedure } from '../../../core/models/procedure.model';
import {
  finalCheck,
  resource,
  transcribedEditorialMetadata,
  warning,
} from './procedure-data.helpers';

export const CHAIN_MAINTENANCE_PROCEDURE: Procedure = {
  slug: 'ajuste-lubrificacao-corrente',
  title: 'Ajuste e lubrificação da corrente',
  category: 'Transmissão',
  description: 'Guia para observar, limpar e lubrificar a corrente sem ligar o motor.',
  difficulty: 'moderate',
  ...transcribedEditorialMetadata(
    'high',
    'Pare se houver elo preso, dente danificado, ajuste desigual ou dúvida sobre o alinhamento. Procure um profissional.',
  ),
  estimatedMinutes: 40,
  tools: [
    resource('chain-tool-brush', 'Escova própria para corrente'),
    resource('chain-tool-wrenches', 'Chaves compatíveis'),
    resource('chain-tool-ruler', 'Régua ou medidor'),
  ],
  materials: [
    resource('chain-material-cleaner', 'Querosene para limpeza, conforme o manual'),
    resource('chain-material-lubricant', 'Óleo para transmissão SAE 90, conforme o manual'),
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
      description:
        'Limpe somente com querosene e enxugue completamente; não use vapor, alta pressão ou solvente forte.',
      required: true,
    },
    {
      id: 'chain-step-measure',
      title: 'Meça a folga',
      description:
        'Meça no meio da parte inferior e repita em outros pontos. Consulte a referência técnica antes de usar qualquer valor.',
      required: true,
    },
    {
      id: 'chain-step-align',
      title: 'Ajuste e alinhe',
      description:
        'Se você souber fazer o ajuste com segurança, mova os dois lados por igual e confira novamente. Se não, pare após a inspeção.',
      required: true,
    },
    {
      id: 'chain-step-lubricate',
      title: 'Lubrifique',
      description: 'Aplique óleo para transmissão SAE 90 após a limpeza e secagem completas.',
      required: true,
    },
  ],
  technicalClaimIds: ['spec-chain-slack', 'spec-rear-axle-torque', 'spec-chain-wear-limit'],
  commonMistakes: [
    'Deixar a corrente excessivamente tensionada.',
    'Confiar apenas nas marcas sem conferir o alinhamento.',
    'Usar vapor, água quente sob alta pressão, solvente forte ou lubrificante em aerossol.',
  ],
  finalChecks: [
    finalCheck('chain-check-slack', 'Folga conferida conforme documentação aplicável'),
    finalCheck('chain-check-alignment', 'Roda alinhada'),
    finalCheck('chain-check-fasteners', 'Fixadores conferidos'),
    finalCheck('chain-check-excess', 'Sem excesso aparente de produto'),
  ],
  contentNote:
    'Transcrito da seção “Corrente de transmissão” (págs. 55–60). Ajuste e torque aguardam revisão técnica; substituição deve ser encaminhada à concessionária.',
};
