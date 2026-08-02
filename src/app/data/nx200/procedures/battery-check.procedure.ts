import { Procedure } from '../../../core/models/procedure.model';
import {
  finalCheck,
  resource,
  transcribedEditorialMetadata,
  warning,
} from './procedure-data.helpers';

export const BATTERY_CHECK_PROCEDURE: Procedure = {
  slug: 'verificacao-da-bateria',
  title: 'Verificação da bateria',
  category: 'Elétrica',
  description: 'Guia visual para observar a bateria, os terminais e o tubo de respiro.',
  difficulty: 'easy',
  ...transcribedEditorialMetadata(
    'moderate',
    'Pare diante de vazamento, carcaça deformada, cabo danificado ou dúvida sobre os terminais. Evite faíscas e procure ajuda.',
  ),
  estimatedMinutes: 20,
  tools: [
    resource('battery-tool-multimeter', 'Multímetro; valores de diagnóstico não constam no manual'),
    resource('battery-tool-wrench', 'Chave compatível'),
    resource('battery-tool-brush', 'Funil plástico ou seringa pequena, se necessário'),
  ],
  materials: [
    resource('battery-material-protector', 'Água destilada, somente se necessário'),
    resource('battery-material-cloth', 'Água limpa para resposta a contato acidental'),
  ],
  safetyWarnings: [
    warning(
      'battery-warning-short',
      'Evite curto-circuito entre os terminais e trabalhe longe de chamas ou faíscas.',
    ),
    warning(
      'battery-warning-disconnect',
      'Com a ignição desligada, desconecte primeiro o terminal negativo e depois o positivo.',
    ),
  ],
  steps: [
    {
      id: 'battery-step-inspect',
      title: 'Inspecione',
      description:
        'Procure danos e vazamentos; confira se o eletrólito está entre as marcas da carcaça.',
      required: true,
    },
    {
      id: 'battery-step-terminals',
      title: 'Confira os terminais',
      description:
        'Se a remoção for necessária, desligue a ignição e desconecte primeiro o terminal negativo e depois o positivo.',
      required: true,
    },
    {
      id: 'battery-step-voltage',
      title: 'Respeite o limite da fonte',
      description:
        'A tensão de repouso e a faixa de carga não constam no manual do proprietário; não interprete a medição sem fonte adicional.',
      required: true,
    },
    {
      id: 'battery-step-finish',
      title: 'Finalize',
      description: 'Confira o tubo de respiro sem dobras ou torções e reinstale as proteções.',
      required: true,
    },
  ],
  technicalClaimIds: [
    'spec-battery-type',
    'spec-battery-resting-voltage',
    'spec-battery-charging-range',
  ],
  commonMistakes: [
    'Inverter a ordem de desconexão dos terminais.',
    'Completar com água corrente ou ultrapassar a marca superior.',
    'Dobrar ou torcer o tubo de respiro.',
  ],
  finalChecks: [
    finalCheck('battery-check-terminals', 'Terminais firmes'),
    finalCheck('battery-check-cables', 'Cabos protegidos'),
    finalCheck('battery-check-start', 'Partida observada sem anormalidade aparente'),
  ],
  contentNote:
    'Inspeção básica transcrita da seção “Bateria” (págs. 70–71). Tensão de repouso e faixa de carga continuam pendentes de documentação técnica adicional.',
};
