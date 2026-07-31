import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-history-page',
  imports: [RouterLink],
  template: `
    <div class="page page-narrow">
      <header class="page-heading with-action">
        <div>
          <a class="back-link" routerLink="/maintenance">‹ Plano de manutenção</a>
          <p class="eyebrow">Tudo registrado</p>
          <h1>Histórico de serviços</h1>
          <p>{{ history().length }} serviços · {{ totalCostLabel() }} em custos informados</p>
        </div>
        <a
          class="button button-primary"
          [routerLink]="store.setup().completed ? '/maintenance/new' : '/motorcycle'"
        >
          {{ store.setup().completed ? '＋ Novo registro' : 'Configurar minha NX200' }}
        </a>
      </header>

      @if (!store.setup().completed) {
        <section class="setup-banner" role="status">
          <div>
            <strong>Histórico demonstrativo</strong>
            <p>
              Os registros abaixo são exemplos e não foram confirmados como serviços da sua moto.
            </p>
          </div>
          <a class="button button-secondary" routerLink="/motorcycle">Configurar agora</a>
        </section>
      }

      <p class="settings-footnote history-order-note">
        Serviços são ordenados pela data; quando a data é igual, a maior quilometragem aparece
        primeiro. Um registro antigo nunca substitui a execução mais recente do plano.
      </p>

      <section class="history-list" aria-label="Serviços realizados">
        @for (service of history(); track service.id; let index = $index) {
          <article class="history-item">
            <div class="history-marker">
              <span aria-hidden="true">{{ index === 0 ? '✓' : '·' }}</span>
            </div>
            <div class="card history-card">
              <div class="inline-between">
                <div>
                  <span class="card-label">{{ formatDate(service.date) }}</span>
                  <h2>{{ service.title }}</h2>
                  @if (service.isDemo) {
                    <span class="demo-tag">Demonstração</span>
                  }
                </div>
                <strong>{{ service.mileage.toLocaleString('pt-BR') }} km</strong>
              </div>
              @if (service.parts.length > 0) {
                <div class="tag-list">
                  @for (part of service.parts; track part.name) {
                    <span>{{ part.quantity ? part.quantity + '× ' : '' }}{{ part.name }}</span>
                  }
                </div>
              }
              @if (service.notes) {
                <p>{{ service.notes }}</p>
              }
              <div class="history-footer">
                @if (service.cost !== undefined) {
                  <span>{{ formatCurrency(service.cost) }}</span>
                }
                @if (service.procedureSlug) {
                  <a [routerLink]="['/procedures', service.procedureSlug]">Abrir guia</a>
                }
              </div>
            </div>
          </article>
        } @empty {
          <div class="empty-state">
            <span aria-hidden="true">↺</span>
            <strong>Nenhum serviço registrado</strong>
            <p>Seu histórico ficará disponível neste dispositivo.</p>
            <a class="button button-primary" routerLink="/maintenance/new">Registrar agora</a>
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {
  protected readonly store = inject(GarageStore);
  protected readonly history = this.store.serviceHistory;
  protected readonly totalCostLabel = computed(() =>
    this.formatCurrency(this.history().reduce((total, service) => total + (service.cost ?? 0), 0)),
  );

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}
