import { Procedure } from '../../../core/models/procedure.model';
import {
  finalCheck,
  resource,
  transcribedEditorialMetadata,
  warning,
} from './procedure-data.helpers';

export const SPARK_PLUG_INSPECTION_PROCEDURE: Procedure = {
  slug: 'inspecao-da-vela',
  title: 'Inspeção da vela',
  category: 'Motor',
  description:
    'Guia para retirar a vela com o motor frio, observar seu estado e recolocá-la sem forçar a rosca.',
  difficulty: 'moderate',
  ...transcribedEditorialMetadata(
    'moderate',
    'Pare se a vela não sair ou entrar suavemente, se a rosca parecer danificada ou se o modelo for incerto.',
  ),
  estimatedMinutes: 30,
  tools: [
    resource('spark-tool-wrench', 'Chave de vela compatível'),
    resource('spark-tool-gauge', 'Calibrador de lâminas'),
    resource('spark-tool-air', 'Escova de aço ou arame; o manual não orienta ar comprimido'),
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
      description:
        'Meça com o calibrador e consulte o valor na referência técnica, ainda pendente de revisão.',
      required: true,
    },
    {
      id: 'spark-step-reinstall',
      title: 'Reinstale',
      description:
        'Inicie a rosca à mão. O manual orienta aperto por fração de volta; torque numérico continua dependente do manual de serviço.',
      required: true,
    },
  ],
  technicalClaimIds: ['spec-spark-plug-model', 'spec-spark-plug-gap', 'spec-spark-plug-torque'],
  commonMistakes: [
    'Iniciar a rosca com a chave.',
    'Apertar excessivamente.',
    'Usar vela com grau térmico diferente do especificado.',
  ],
  finalChecks: [
    finalCheck('spark-check-cap', 'Cachimbo assentado'),
    finalCheck('spark-check-engine', 'Motor funcionando regularmente'),
    finalCheck('spark-check-noise', 'Sem ruído ou folga aparente'),
  ],
  contentNote:
    'Transcrito da seção “Vela de ignição” (págs. 50–51). Modelo e folga possuem citação; torque numérico não consta no manual do proprietário.',
};
