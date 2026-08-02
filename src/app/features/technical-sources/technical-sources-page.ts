import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  citationLocation,
  formatTechnicalValue,
  technicalStatusLabel,
  technicalStatusMessage,
} from '../../core/domain/technical-content';
import {
  TechnicalClaim,
  TechnicalContentStatus,
  TechnicalDocumentSource,
} from '../../core/models/technical-source.model';
import { GarageStore } from '../../core/services/garage-store.service';

interface SourceView {
  readonly source: TechnicalDocumentSource;
  readonly citationCount: number;
  readonly claims: readonly TechnicalClaim[];
  readonly expectedClaims: readonly TechnicalClaim[];
}

@Component({
  selector: 'app-technical-sources-page',
  template: `
    <div class="page">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Transparência editorial</p>
          <h1>Fontes técnicas</h1>
          <p>Metadados, disponibilidade e conteúdos relacionados à Honda NX200.</p>
        </div>
      </header>

      <section class="source-warning" role="note">
        <span aria-hidden="true">i</span>
        <p>
          O manual do proprietário foi localizado no site oficial da Honda e sua aplicabilidade à
          NX200 brasileira de 1997 foi confirmada pelo proprietário do projeto. As transcrições
          continuam aguardando revisão técnica independente.
        </p>
      </section>

      <div class="technical-source-grid">
        @for (item of sourceViews(); track item.source.id) {
          <article class="card technical-source-card" [id]="item.source.id" tabindex="-1">
            <div class="technical-claim-heading">
              <div>
                <p class="eyebrow">{{ sourceTypeLabel(item.source.type) }}</p>
                <h2>{{ item.source.title }}</h2>
              </div>
              <span class="editorial-badge" [attr.data-status]="item.source.availability">
                {{ availabilityLabel(item.source.availability) }}
              </span>
            </div>
            <dl class="technical-metadata">
              <div>
                <dt>Editor ou fabricante</dt>
                <dd>{{ item.source.publisher }}</dd>
              </div>
              <div>
                <dt>Edição</dt>
                <dd>{{ item.source.edition ?? 'A confirmar' }}</dd>
              </div>
              <div>
                <dt>Código do documento</dt>
                <dd>{{ item.source.documentCode ?? 'A confirmar' }}</dd>
              </div>
              <div>
                <dt>Ano</dt>
                <dd>{{ item.source.publicationYear ?? 'A confirmar' }}</dd>
              </div>
              <div>
                <dt>Mercado</dt>
                <dd>{{ item.source.market ?? 'A confirmar' }}</dd>
              </div>
              <div>
                <dt>Citações localizadas</dt>
                <dd>{{ item.citationCount }}</dd>
              </div>
              <div>
                <dt>Pendências relacionadas</dt>
                <dd>{{ item.expectedClaims.length }}</dd>
              </div>
            </dl>
            @if (item.source.url) {
              <p>
                <a
                  class="text-button"
                  [href]="item.source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir fonte oficial
                </a>
                @if (item.source.accessedAt) {
                  <small>Consultada em {{ item.source.accessedAt }}.</small>
                }
              </p>
            }
            @for (decision of item.source.applicabilityDecisions ?? []; track decision.id) {
              <div class="source-applicability" role="note">
                <strong>Aplicabilidade documental confirmada</strong>
                <p>{{ decision.applicability.notes }}</p>
                <small>
                  {{ decision.decidedBy }} · {{ decision.decidedAt }} · {{ decision.basis }}
                </small>
                <p>
                  Esta decisão não equivale à revisão técnica das transcrições e não confirma
                  automaticamente valores.
                </p>
              </div>
            }
            @if (item.source.notes) {
              <p>{{ item.source.notes }}</p>
            }
            @if (item.claims.length) {
              <p><strong>Conteúdos que citam esta fonte:</strong> {{ claimLabels(item.claims) }}</p>
            } @else {
              <p>Nenhum conteúdo possui citação localizada nesta fonte.</p>
            }
          </article>
        }
      </div>

      <section class="technical-claims-section" aria-labelledby="claims-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Catálogo editorial</p>
            <h2 id="claims-title">Afirmações técnicas</h2>
          </div>
          <span>{{ store.technicalClaims().length }} registros</span>
        </div>
        <div class="technical-claim-list">
          @for (claim of store.technicalClaims(); track claim.id) {
            <details class="card source-details claim-details" [id]="'claim-' + claim.id">
              <summary>
                <span>{{ claim.label }}</span>
                <span class="editorial-badge" [attr.data-status]="claim.status">
                  {{ statusLabel(claim.status) }}
                </span>
              </summary>
              <strong class="technical-value">{{ formatValue(claim) }}</strong>
              <p>{{ statusMessage(claim.status) }}</p>
              <p><strong>Aplicabilidade:</strong> {{ claim.applicability.notes }}</p>
              @if (claim.citations.length) {
                <ul>
                  @for (
                    citation of claim.citations;
                    track citation.sourceId + citationLocationLabel(citation)
                  ) {
                    <li>
                      {{ sourceTitle(citation.sourceId) }} · {{ citationLocationLabel(citation) }}
                    </li>
                  }
                </ul>
              } @else {
                <p><strong>Citação e página:</strong> não registradas.</p>
              }
              <p>
                <strong>Revisão aprovada:</strong>
                {{ claim.reviews.length ? 'Verificar decisão registrada' : 'não registrada' }}.
              </p>
            </details>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechnicalSourcesPage {
  protected readonly store = inject(GarageStore);
  private readonly sourceById = computed(
    () => new Map(this.store.technicalSources().map((source) => [source.id, source])),
  );
  protected readonly sourceViews = computed<readonly SourceView[]>(() =>
    this.store.technicalSources().map((source) => {
      const claims = this.store
        .technicalClaims()
        .filter((claim) => claim.citations.some((citation) => citation.sourceId === source.id));
      return {
        source,
        claims,
        citationCount: claims.reduce(
          (count, claim) =>
            count + claim.citations.filter((citation) => citation.sourceId === source.id).length,
          0,
        ),
        expectedClaims: this.store
          .technicalClaims()
          .filter((claim) => claim.expectedSourceIds?.includes(source.id)),
      };
    }),
  );

  protected sourceTypeLabel(type: TechnicalDocumentSource['type']): string {
    return {
      'owner-manual': 'Manual do proprietário',
      'service-manual': 'Manual de serviço',
      'parts-catalog': 'Catálogo de peças',
      'technical-bulletin': 'Boletim técnico',
      'component-manufacturer': 'Fabricante do componente',
      regulation: 'Regulamentação',
      'professional-review': 'Revisão profissional',
      other: 'Outra fonte',
    }[type];
  }

  protected availabilityLabel(availability: TechnicalDocumentSource['availability']): string {
    return { available: 'Disponível', partial: 'Parcial', unavailable: 'Não disponível' }[
      availability
    ];
  }

  protected claimLabels(claims: readonly TechnicalClaim[]): string {
    return claims.map((claim) => claim.label).join(', ');
  }

  protected formatValue(claim: TechnicalClaim): string {
    return formatTechnicalValue(claim.value);
  }

  protected statusLabel(status: TechnicalContentStatus): string {
    return technicalStatusLabel(status);
  }

  protected statusMessage(status: TechnicalContentStatus): string {
    return technicalStatusMessage(status);
  }

  protected citationLocationLabel(citation: TechnicalClaim['citations'][number]): string {
    return citationLocation(citation);
  }

  protected sourceTitle(sourceId: string): string {
    return this.sourceById().get(sourceId)?.title ?? 'Fonte não encontrada';
  }
}
