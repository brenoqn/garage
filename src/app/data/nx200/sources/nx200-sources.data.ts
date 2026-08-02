import { TechnicalDocumentSource } from '../../../core/models/technical-source.model';

/** Fontes incorporadas e documentos que ainda precisam ser obtidos. */
export const NX200_TECHNICAL_SOURCES: readonly TechnicalDocumentSource[] = [
  {
    id: 'nx200-owner-manual-1994',
    type: 'owner-manual',
    title: 'Manual do Proprietário Honda NX200',
    publisher: 'Moto Honda da Amazônia Ltda.',
    documentCode: 'D2203-MAN-0181',
    edition: 'Arquivo oficial identificado como “NX 200 1994.pdf”',
    language: 'Português (Brasil)',
    market: 'Brasil',
    fileName: 'NX 200 1994.pdf',
    url: 'https://www.honda.com.br/pos-venda/sites/customer_service_motos/files/manuais/NX%20200%201994.pdf',
    accessedAt: '2026-08-02',
    availability: 'available',
    applicabilityDecisions: [
      {
        id: 'applicability-owner-confirmation-2026-08-02',
        decidedAt: '2026-08-02',
        decidedBy: 'Proprietário do projeto Garage',
        deciderRole: 'Responsável pela motocicleta cadastrada',
        applicability: {
          manufacturer: 'Honda',
          model: 'NX200',
          confirmation: 'confirmed',
          yearFrom: 1997,
          yearTo: 1997,
          markets: ['Brasil'],
          notes: 'Aplicabilidade confirmada pelo proprietário para a NX200 brasileira de 1997.',
        },
        basis: 'Confirmação explícita do proprietário do projeto.',
        notes:
          'O ano presente no nome do arquivo não é tratado como divergência. A decisão de aplicabilidade não aprova automaticamente nenhuma transcrição.',
      },
    ],
    notes:
      'Fonte oficial consultada por URL. O Garage registra metadados e citações, sem redistribuir o PDF.',
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
