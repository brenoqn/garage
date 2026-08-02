import { Procedure } from '../../../core/models/procedure.model';
import {
  finalCheck,
  resource,
  transcribedEditorialMetadata,
  warning,
} from './procedure-data.helpers';

export const OIL_CHANGE_PROCEDURE: Procedure = {
  slug: 'troca-de-oleo',
  title: 'Troca de óleo',
  category: 'Motor',
  description:
    'Roteiro guiado para drenar o óleo usado, revisar a vedação e completar o motor com o produto correto.',
  difficulty: 'moderate',
  ...transcribedEditorialMetadata(
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
    resource('oil-material-seal', 'Anel de vedação do bujão, se necessário'),
  ],
  safetyWarnings: [
    warning(
      'oil-warning-stability',
      'Faça o serviço com o motor em temperatura normal de funcionamento e a motocicleta apoiada com estabilidade.',
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
      description: 'Apóie a motocicleta no cavalete lateral e posicione o recipiente coletor.',
      required: true,
    },
    {
      id: 'oil-step-drain',
      title: 'Drene o óleo',
      description:
        'Remova o medidor de nível; retire o bujão, a mola e o filtro de tela e deixe o óleo drenar.',
      required: true,
      safetyNote: 'Use luvas e evite contato com óleo quente.',
    },
    {
      id: 'oil-step-seal',
      title: 'Inspecione o conjunto',
      description:
        'Limpe o filtro de tela e verifique filtro, mola e anel de vedação antes da reinstalação.',
      required: true,
    },
    {
      id: 'oil-step-refill',
      title: 'Reabasteça',
      description:
        'O manual transcreve aproximadamente 1,1 L para a troca e 15 N·m no bujão; não use o torque antes do confronto com o manual de serviço.',
      required: true,
    },
    {
      id: 'oil-step-level',
      title: 'Confira o nível',
      description:
        'Deixe o motor em marcha lenta por 2 a 3 minutos, desligue, confira o nível com a moto vertical e procure vazamentos.',
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
  contentNote:
    'Transcrito das seções “Troca do óleo do motor” (págs. 48–49) e “Óleo do motor” (págs. 22–23). Revisão técnica pendente.',
};
