import { Procedure } from '../../../core/models/procedure.model';
import { finalCheck, pendingEditorialMetadata, resource, warning } from './procedure-data.helpers';

export const CHAIN_MAINTENANCE_PROCEDURE: Procedure = {
  slug: 'ajuste-lubrificacao-corrente',
  title: 'Ajuste e lubrificação da corrente',
  category: 'Transmissão',
  description:
    'Inspeção da transmissão final, limpeza cuidadosa, lubrificação e conferência do alinhamento.',
  difficulty: 'moderate',
  ...pendingEditorialMetadata(
    'high',
    'Ajuste ou alinhamento incorreto pode afetar a transmissão e o controle da motocicleta.',
  ),
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
  technicalClaimIds: ['spec-chain-slack', 'spec-rear-axle-torque', 'spec-chain-wear-limit'],
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
};
