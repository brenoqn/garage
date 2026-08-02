import { Procedure } from '../../../core/models/procedure.model';
import { finalCheck, pendingEditorialMetadata, resource, warning } from './procedure-data.helpers';

export const CLUTCH_CABLE_PROCEDURE: Procedure = {
  slug: 'regulagem-cabo-embreagem',
  title: 'Regulagem do cabo da embreagem',
  category: 'Comandos',
  description: 'Inspeção do cabo, medição da folga do manete e ajuste progressivo do acionamento.',
  difficulty: 'easy',
  ...pendingEditorialMetadata(
    'moderate',
    'Folga ou roteamento incorreto pode afetar o acionamento e o controle da motocicleta.',
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
  technicalClaimIds: ['spec-clutch-free-play', 'spec-clutch-cable-routing'],
  commonMistakes: ['Eliminar toda a folga.', 'Ignorar mudança de tensão ao virar o guidão.'],
  finalChecks: [
    finalCheck('clutch-check-return', 'Manete retorna livremente'),
    finalCheck('clutch-check-freeplay', 'Folga conferida conforme documentação aplicável'),
    finalCheck('clutch-check-engagement', 'Acionamento progressivo observado'),
  ],
  contentNote: 'Checklist demonstrativo — confirme a folga livre em documentação técnica.',
};
