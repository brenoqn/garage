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
        <a class="button button-primary" routerLink="/maintenance/new">＋ Novo registro</a>
      </header>

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
  private readonly store = inject(GarageStore);
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
