import { SafetyCheckItem } from '../../../core/models/safety-check.model';

const SOURCE_ID = 'nx200-owner-manual-1994';
const PAGE = 30;
const SECTION = 'Funcionamento — Inspeção antes do uso';

export const NX200_PRE_RIDE_CHECKLIST: readonly SafetyCheckItem[] = [
  {
    id: 'pre-ride-engine-oil',
    title: 'Óleo do motor',
    description: 'Confira o nível e observe se há vazamentos.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-fuel',
    title: 'Combustível',
    description: 'Confira se há combustível suficiente e sinais de vazamento.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-brakes',
    title: 'Freios',
    description: 'Teste os comandos e procure vazamento ou desgaste aparente.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-tires',
    title: 'Pneus',
    description: 'Observe pressão aparente, danos e desgaste da banda de rodagem.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-chain',
    title: 'Corrente de transmissão',
    description: 'Observe a condição, a folga aparente e a necessidade de lubrificação.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-throttle',
    title: 'Acelerador',
    description: 'Confira o retorno e o movimento em todas as posições do guidão.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-battery',
    title: 'Bateria',
    description: 'Observe o nível do eletrólito e sinais externos de problema.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-electrical',
    title: 'Luzes e buzina',
    description: 'Teste farol, lanternas, luz de freio, setas, painel e buzina.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-kill-switch',
    title: 'Interruptor de emergência',
    description: 'Confira o funcionamento do interruptor.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
  {
    id: 'pre-ride-side-stand',
    title: 'Cavalete lateral',
    description: 'Confira o movimento e o estado do apoio de borracha.',
    sourceId: SOURCE_ID,
    page: PAGE,
    section: SECTION,
  },
] as const;
