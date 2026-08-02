import { Procedure } from '../../../core/models/procedure.model';
import {
  finalCheck,
  resource,
  transcribedEditorialMetadata,
  warning,
} from './procedure-data.helpers';

export const CLUTCH_CABLE_PROCEDURE: Procedure = {
  slug: 'regulagem-cabo-embreagem',
  title: 'Regulagem do cabo da embreagem',
  category: 'Comandos',
  description: 'Guia para observar o cabo, sentir o movimento do manete e conferir a folga.',
  difficulty: 'easy',
  ...transcribedEditorialMetadata(
    'moderate',
    'Pare se o cabo estiver desfiado, preso ou sem ajuste possível. Não rode antes de uma avaliação profissional.',
  ),
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
      description:
        'Meça na ponta do manete e consulte o valor na referência técnica, ainda pendente de revisão.',
      required: true,
    },
    {
      id: 'clutch-step-adjust',
      title: 'Faça o ajuste',
      description:
        'Use o ajustador junto ao manete para correções menores e o ajustador inferior para correções maiores.',
      required: true,
    },
    {
      id: 'clutch-step-lock',
      title: 'Trave o ajuste',
      description: 'Aperte as contraporcas e verifique novamente a folga e o acionamento.',
      required: true,
    },
  ],
  technicalClaimIds: ['spec-clutch-free-play', 'spec-clutch-cable-routing'],
  commonMistakes: [
    'Eliminar toda a folga.',
    'Prosseguir quando não for possível obter o ajuste descrito no manual.',
  ],
  finalChecks: [
    finalCheck('clutch-check-return', 'Manete retorna livremente'),
    finalCheck('clutch-check-freeplay', 'Folga conferida conforme documentação aplicável'),
    finalCheck('clutch-check-engagement', 'Acionamento progressivo observado'),
  ],
  contentNote:
    'Transcrito da seção “Embreagem” (págs. 16–17). A rota completa do cabo não é coberta e continua dependente do manual de serviço.',
};
