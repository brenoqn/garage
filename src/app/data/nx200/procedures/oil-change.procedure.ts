import { Procedure } from '../../../core/models/procedure.model';
import { finalCheck, pendingEditorialMetadata, resource, warning } from './procedure-data.helpers';

export const OIL_CHANGE_PROCEDURE: Procedure = {
  slug: 'troca-de-oleo',
  title: 'Troca de óleo',
  category: 'Motor',
  description:
    'Roteiro guiado para drenar o óleo usado, revisar a vedação e completar o motor com o produto correto.',
  difficulty: 'moderate',
  ...pendingEditorialMetadata(
    'moderate',
    'Erros podem causar vazamentos, lubrificação inadequada ou dano ao motor.',
  ),
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
  technicalClaimIds: ['spec-engine-oil-grade', 'spec-engine-oil-capacity', 'spec-oil-drain-torque'],
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
};
