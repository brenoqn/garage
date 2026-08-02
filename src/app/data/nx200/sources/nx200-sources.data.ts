import { TechnicalDocumentSource } from '../../../core/models/technical-source.model';

/**
 * Registros de documentos necessários, não documentos efetivamente obtidos.
 * `unavailable` impede que sejam confundidos com evidência já incorporada.
 */
export const NX200_TECHNICAL_SOURCES: readonly TechnicalDocumentSource[] = [
  {
    id: 'nx200-owner-manual-pending',
    type: 'owner-manual',
    title: 'Manual do proprietário Honda NX200 — edição aplicável pendente',
    publisher: 'Honda — edição a confirmar',
    language: 'Português a confirmar',
    market: 'Brasil a confirmar',
    availability: 'unavailable',
    notes: 'O repositório não contém o documento, código, edição, ano ou páginas verificáveis.',
  },
  {
    id: 'nx200-service-manual-pending',
    type: 'service-manual',
    title: 'Manual de serviço Honda NX200 — edição aplicável pendente',
    publisher: 'Honda — edição a confirmar',
    language: 'A confirmar',
    market: 'Brasil a confirmar',
    availability: 'unavailable',
    notes: 'Necessário para valores, procedimentos e aplicabilidade; nenhuma cópia foi fornecida.',
  },
  {
    id: 'nx200-parts-catalog-pending',
    type: 'parts-catalog',
    title: 'Catálogo de peças Honda NX200 — variante aplicável pendente',
    publisher: 'Honda — edição a confirmar',
    language: 'A confirmar',
    market: 'Brasil a confirmar',
    availability: 'unavailable',
    notes:
      'Necessário para identificar variante, códigos e compatibilidade; não está no repositório.',
  },
  {
    id: 'nx200-component-documentation-pending',
    type: 'component-manufacturer',
    title: 'Documentação dos componentes originais — identificação pendente',
    publisher: 'Fabricante do componente a confirmar',
    availability: 'unavailable',
    notes: 'Somente poderá ser usada depois de identificar o componente e sua aplicação na NX200.',
  },
];
