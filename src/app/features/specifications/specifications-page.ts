import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  applicabilityMatch,
  ApplicabilityMatch,
  citationLocation,
  detectTechnicalConflicts,
  formatTechnicalValue,
  latestTechnicalReview,
  technicalStatusLabel,
  technicalStatusMessage,
} from '../../core/domain/technical-content';
import { TechnicalSpecification, TechnicalSystem } from '../../core/models/specification.model';
import {
  TechnicalClaim,
  TechnicalContentStatus,
  TechnicalDocumentSource,
} from '../../core/models/technical-source.model';
import { GarageStore } from '../../core/services/garage-store.service';

interface SpecificationView {
  readonly specification: TechnicalSpecification;
  readonly claim: TechnicalClaim;
  readonly applicability: ApplicabilityMatch;
  readonly citations: readonly {
    readonly source: TechnicalDocumentSource;
    readonly location: string;
  }[];
  readonly expectedSources: readonly TechnicalDocumentSource[];
  readonly conflict: boolean;
  readonly lastReview?: string;
}

interface SpecificationGroup {
  readonly system: TechnicalSystem;
  readonly label: string;
  readonly items: readonly SpecificationView[];
}

const systems: readonly { readonly value: TechnicalSystem; readonly label: string }[] = [
  { value: 'motor', label: 'Motor' },
  { value: 'lubrication', label: 'Lubrificação' },
  { value: 'fuel', label: 'Alimentação' },
  { value: 'ignition', label: 'Ignição' },
  { value: 'electrical', label: 'Sistema elétrico' },
  { value: 'transmission', label: 'Transmissão' },
  { value: 'suspension', label: 'Suspensão' },
  { value: 'wheels-tires', label: 'Rodas e pneus' },
  { value: 'brakes', label: 'Freios' },
  { value: 'dimensions', label: 'Dimensões' },
  { value: 'capacities', label: 'Capacidades' },
  { value: 'maintenance', label: 'Manutenção' },
];

const statuses: readonly { readonly value: TechnicalContentStatus; readonly label: string }[] = [
  { value: 'demonstrative', label: 'Demonstrativo' },
  { value: 'transcribed', label: 'Transcrito' },
  { value: 'under-review', label: 'Em revisão' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'conflicting', label: 'Conflitante' },
  { value: 'deprecated', label: 'Obsoleto' },
  { value: 'not-applicable', label: 'Não aplicável' },
];

@Component({
  selector: 'app-specifications-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-heading technical-page-heading">
        <div>
          <p class="eyebrow">Base técnica verificável</p>
          <h1>Especificações técnicas</h1>
          <p>Honda NX200 · cada item informa evidência, aplicabilidade e revisão editorial.</p>
        </div>
        <a class="button button-secondary" routerLink="/technical-sources">Ver fontes técnicas</a>
      </header>

      <div class="source-warning" role="note">
        <span aria-hidden="true">!</span>
        <p>
          Nenhum documento técnico real foi fornecido ao repositório. Todos os valores continuam
          <strong>A confirmar</strong> e não podem gerar orientação operacional.
        </p>
      </div>

      <form
        class="card technical-filters"
        [formGroup]="filterForm"
        aria-label="Filtros das especificações"
      >
        <label>
          <span>Sistema</span>
          <select formControlName="system">
            <option value="all">Todos os sistemas</option>
            @for (system of systemOptions; track system.value) {
              <option [value]="system.value">{{ system.label }}</option>
            }
          </select>
        </label>
        <label>
          <span>Estado editorial</span>
          <select formControlName="status">
            <option value="all">Todos os estados</option>
            @for (status of statusOptions; track status.value) {
              <option [value]="status.value">{{ status.label }}</option>
            }
          </select>
        </label>
        <label>
          <span>Ano para comparação</span>
          <input formControlName="year" type="number" min="1900" max="2100" inputmode="numeric" />
        </label>
        <label class="confirmation-check filter-check">
          <input type="checkbox" formControlName="onlyApplicable" />
          <span>Somente confirmadas para a moto cadastrada</span>
        </label>
      </form>

      <p class="filter-summary" aria-live="polite">
        {{ itemCount() }} {{ itemCount() === 1 ? 'item encontrado' : 'itens encontrados' }}.
      </p>

      @if (groups().length) {
        <div class="specification-groups">
          @for (group of groups(); track group.system) {
            <section
              class="card specification-group"
              [attr.aria-labelledby]="'system-' + group.system"
            >
              <h2 [id]="'system-' + group.system">{{ group.label }}</h2>
              <div class="technical-claim-list">
                @for (item of group.items; track item.specification.id) {
                  <article class="technical-claim" [class.conflict-card]="item.conflict">
                    <div class="technical-claim-heading">
                      <div>
                        <h3>{{ item.claim.label }}</h3>
                        <strong class="technical-value">{{ formatValue(item.claim) }}</strong>
                      </div>
                      <span class="editorial-badge" [attr.data-status]="item.claim.status">
                        {{ statusLabel(item.claim.status) }}
                      </span>
                    </div>
                    <p>{{ statusMessage(item.claim.status) }}</p>
                    <dl class="technical-metadata">
                      <div>
                        <dt>Aplicabilidade</dt>
                        <dd>{{ applicabilityLabel(item.applicability) }}</dd>
                      </div>
                      <div>
                        <dt>Última revisão</dt>
                        <dd>{{ item.lastReview ?? 'Nenhuma revisão registrada' }}</dd>
                      </div>
                    </dl>

                    @if (item.conflict) {
                      <p class="conflict-warning" role="alert">
                        Fontes divergentes — este valor está bloqueado para uso operacional.
                      </p>
                    }

                    <details class="source-details">
                      <summary>Ver fonte e localização</summary>
                      @if (item.citations.length) {
                        <ul>
                          @for (
                            citation of item.citations;
                            track citation.source.id + citation.location
                          ) {
                            <li>
                              <a routerLink="/technical-sources" [fragment]="citation.source.id">
                                {{ citation.source.title }}
                              </a>
                              <span>{{ citation.location }}</span>
                            </li>
                          }
                        </ul>
                      } @else {
                        <p><strong>Citação localizada:</strong> não registrada.</p>
                        <p><strong>Página ou seção:</strong> não informada.</p>
                        @if (item.expectedSources.length) {
                          <p>Documentos necessários:</p>
                          <ul>
                            @for (source of item.expectedSources; track source.id) {
                              <li>
                                <a routerLink="/technical-sources" [fragment]="source.id">{{
                                  source.title
                                }}</a>
                              </li>
                            }
                          </ul>
                        }
                      }
                    </details>
                  </article>
                }
              </div>
            </section>
          }
        </div>
      } @else {
        <div class="empty-state" role="status">
          <strong>Nenhuma especificação corresponde aos filtros</strong>
          <p>
            A aplicabilidade do catálogo ainda é desconhecida. Desative o filtro de aplicabilidade
            para revisar os itens pendentes.
          </p>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecificationsPage {
  private readonly store = inject(GarageStore);
  protected readonly systemOptions = systems;
  protected readonly statusOptions = statuses;
  protected readonly filterForm = new FormGroup({
    system: new FormControl<'all' | TechnicalSystem>('all', { nonNullable: true }),
    status: new FormControl<'all' | TechnicalContentStatus>('all', { nonNullable: true }),
    year: new FormControl<number | null>(this.store.motorcycle().year),
    onlyApplicable: new FormControl(false, { nonNullable: true }),
  });
  private readonly filters = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.getRawValue(),
  });
  private readonly sourceById = computed(
    () => new Map(this.store.technicalSources().map((source) => [source.id, source])),
  );
  private readonly claimById = computed(
    () => new Map(this.store.technicalClaims().map((claim) => [claim.id, claim])),
  );
  private readonly conflicts = computed(() =>
    detectTechnicalConflicts(this.store.technicalClaims()),
  );
  private readonly views = computed<readonly SpecificationView[]>(() => {
    const filters = this.filters();
    const motorcycle = this.store.motorcycle();
    const comparisonYear = filters.year ?? undefined;
    return this.store
      .specifications()
      .flatMap((specification) => {
        const claim = this.claimById().get(specification.claimId);
        if (!claim) return [];
        const match = applicabilityMatch(claim.applicability, {
          manufacturer: motorcycle.manufacturer,
          model: motorcycle.model,
          year: comparisonYear,
        });
        const citations = claim.citations.flatMap((citation) => {
          const source = this.sourceById().get(citation.sourceId);
          return source ? [{ source, location: citationLocation(citation) }] : [];
        });
        const expectedSources = (claim.expectedSourceIds ?? []).flatMap((sourceId) => {
          const source = this.sourceById().get(sourceId);
          return source ? [source] : [];
        });
        const lastReview = latestTechnicalReview(claim.reviews)?.reviewedAt;
        return [
          {
            specification,
            claim,
            applicability: match,
            citations,
            expectedSources,
            conflict: this.conflicts().some((conflict) => conflict.claimIds.includes(claim.id)),
            lastReview,
          },
        ];
      })
      .filter(
        (item) =>
          (filters.system === 'all' || item.specification.system === filters.system) &&
          (filters.status === 'all' || item.claim.status === filters.status) &&
          (item.applicability !== 'not-applicable' || filters.year === null) &&
          (!filters.onlyApplicable || item.applicability === 'applicable'),
      );
  });
  protected readonly groups = computed<readonly SpecificationGroup[]>(() =>
    systems.flatMap((system) => {
      const items = this.views().filter((item) => item.specification.system === system.value);
      return items.length ? [{ system: system.value, label: system.label, items }] : [];
    }),
  );
  protected readonly itemCount = computed(() => this.views().length);

  protected formatValue(claim: TechnicalClaim): string {
    return formatTechnicalValue(claim.value);
  }

  protected statusLabel(status: TechnicalContentStatus): string {
    return technicalStatusLabel(status);
  }

  protected statusMessage(status: TechnicalContentStatus): string {
    return technicalStatusMessage(status);
  }

  protected applicabilityLabel(match: ApplicabilityMatch): string {
    return {
      applicable: 'Confirmada para a configuração selecionada',
      'not-applicable': 'Não aplicável à configuração selecionada',
      unknown: 'Ano, mercado ou variante ainda precisam ser confirmados',
    }[match];
  }
}
