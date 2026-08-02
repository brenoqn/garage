import { Procedure } from '../../../core/models/procedure.model';
import { finalCheck, pendingEditorialMetadata, resource, warning } from './procedure-data.helpers';

export const SPARK_PLUG_INSPECTION_PROCEDURE: Procedure = {
  slug: 'inspecao-da-vela',
  title: 'Inspeção da vela',
  category: 'Motor',
  description:
    'Remoção, leitura visual e reinstalação segura da vela de ignição, sem assumir medidas não confirmadas.',
  difficulty: 'moderate',
  ...pendingEditorialMetadata(
    'moderate',
    'Rosca, aperto ou componente incorreto podem danificar o cabeçote ou afetar o funcionamento.',
  ),
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
  technicalClaimIds: ['spec-spark-plug-model', 'spec-spark-plug-gap', 'spec-spark-plug-torque'],
  commonMistakes: ['Iniciar a rosca com a chave.', 'Medir ou ajustar sem a ferramenta adequada.'],
  finalChecks: [
    finalCheck('spark-check-cap', 'Cachimbo assentado'),
    finalCheck('spark-check-engine', 'Motor funcionando regularmente'),
    finalCheck('spark-check-noise', 'Sem ruído ou folga aparente'),
  ],
  contentNote: 'Checklist demonstrativo — confirme modelo, folga e torque em fonte técnica.',
};
