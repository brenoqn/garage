import { Procedure } from '../../../core/models/procedure.model';
import { finalCheck, pendingEditorialMetadata, resource, warning } from './procedure-data.helpers';

export const BATTERY_CHECK_PROCEDURE: Procedure = {
  slug: 'verificacao-da-bateria',
  title: 'Verificação da bateria',
  category: 'Elétrica',
  description: 'Checagem visual, limpeza dos terminais e medição orientada do estado da bateria.',
  difficulty: 'easy',
  ...pendingEditorialMetadata(
    'moderate',
    'Curto-circuito, polaridade incorreta ou contato com eletrólito podem causar ferimentos e danos.',
  ),
  estimatedMinutes: 20,
  tools: [
    resource('battery-tool-multimeter', 'Multímetro'),
    resource('battery-tool-brush', 'Escova pequena'),
    resource('battery-tool-wrench', 'Chave compatível'),
  ],
  materials: [
    resource('battery-material-protector', 'Protetor de terminais apropriado'),
    resource('battery-material-cloth', 'Pano limpo'),
  ],
  safetyWarnings: [
    warning(
      'battery-warning-short',
      'Evite curto-circuito entre os terminais e trabalhe longe de chamas ou faíscas.',
    ),
    warning(
      'battery-warning-disconnect',
      'Ao desconectar, siga a ordem indicada na documentação técnica.',
    ),
  ],
  steps: [
    {
      id: 'battery-step-inspect',
      title: 'Inspecione',
      description: 'Procure trincas, vazamentos, inchaço e oxidação.',
      required: true,
    },
    {
      id: 'battery-step-terminals',
      title: 'Confira os terminais',
      description: 'Verifique fixação e limpe sinais de corrosão.',
      required: true,
    },
    {
      id: 'battery-step-voltage',
      title: 'Meça a tensão',
      description: 'Faça a medição com o multímetro e compare com valores de fonte confirmada.',
      required: true,
    },
    {
      id: 'battery-step-finish',
      title: 'Finalize',
      description: 'Reinstale proteções e confirme que nada ficou solto.',
      required: true,
    },
  ],
  technicalClaimIds: [
    'spec-battery-type',
    'spec-battery-resting-voltage',
    'spec-battery-charging-range',
  ],
  commonMistakes: ['Inverter a polaridade.', 'Medir logo após carga sem respeitar o repouso.'],
  finalChecks: [
    finalCheck('battery-check-terminals', 'Terminais firmes'),
    finalCheck('battery-check-cables', 'Cabos protegidos'),
    finalCheck('battery-check-start', 'Partida observada sem anormalidade aparente'),
  ],
  contentNote: 'Checklist demonstrativo — valores elétricos permanecem pendentes de validação.',
};
