import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GarageStore } from '../../core/services/garage-store.service';

interface ActivityEvent {
  readonly id: string;
  readonly occurredAt: string;
  readonly kind: 'service' | 'fuel' | 'expense' | 'occurrence' | 'safety';
  readonly eyebrow: string;
  readonly title: string;
  readonly detail: string;
  readonly amount?: number;
  readonly route?: readonly string[];
  readonly attention?: boolean;
}

@Component({
  selector: 'app-activity-history-page',
  imports: [RouterLink],
  template: `
    <div class="page page-narrow">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Tudo em ordem cronológica</p>
          <h1>Histórico</h1>
          <p>Serviços, abastecimentos, gastos, ocorrências e inspeções salvos neste dispositivo.</p>
        </div>
      </header>
      <nav class="history-shortcuts" aria-label="Atalhos do histórico">
        <a routerLink="/maintenance/history">Serviços</a><a routerLink="/fuel">Abastecimentos</a
        ><a routerLink="/expenses">Gastos</a><a routerLink="/procedure-executions">Procedimentos</a>
      </nav>
      <section class="history-list unified-history" aria-label="Atividade recente">
        @for (event of events(); track event.id; let index = $index) {
          <article class="history-item">
            <div class="history-marker">
              <span aria-hidden="true">{{ event.attention ? '!' : index === 0 ? '●' : '·' }}</span>
            </div>
            <div class="card history-card" [class.attention-card]="event.attention">
              <div class="inline-between">
                <div>
                  <span class="card-label"
                    >{{ event.eyebrow }} · {{ dateTime(event.occurredAt) }}</span
                  >
                  <h2>{{ event.title }}</h2>
                </div>
                @if (event.amount !== undefined) {
                  <strong>{{ currency(event.amount) }}</strong>
                }
              </div>
              <p>{{ event.detail }}</p>
              @if (event.route) {
                <a [routerLink]="event.route">Abrir detalhes</a>
              }
            </div>
          </article>
        } @empty {
          <div class="empty-state">
            <span aria-hidden="true">↺</span><strong>Seu histórico começa aqui</strong>
            <p>Use a ação Fazer para registrar o primeiro item.</p>
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityHistoryPage {
  protected readonly store = inject(GarageStore);
  protected readonly events = computed<readonly ActivityEvent[]>(() => {
    const serviceEvents: ActivityEvent[] = this.store
      .serviceHistory()
      .filter((record) => !record.isDemo)
      .map((record) => ({
        id: `service-${record.id}`,
        occurredAt: `${record.date}T12:00:00`,
        kind: 'service',
        eyebrow: 'Manutenção',
        title: record.title,
        detail: `${record.mileage.toLocaleString('pt-BR')} km`,
        amount: record.cost,
        route: ['/maintenance/history'],
      }));
    const fuelEvents: ActivityEvent[] = this.store.fuelHistory().map((record) => ({
      id: `fuel-${record.id}`,
      occurredAt: record.fueledAt,
      kind: 'fuel',
      eyebrow: 'Abastecimento',
      title: `${record.liters.toFixed(2).replace('.', ',')} litros`,
      detail: `${record.mileage.toLocaleString('pt-BR')} km · ${record.fullTank ? 'tanque completo' : 'parcial'}`,
      amount: record.totalCost,
      route: ['/fuel'],
    }));
    const expenseEvents: ActivityEvent[] = this.store.expenseHistory().map((record) => ({
      id: `expense-${record.id}`,
      occurredAt: `${record.date}T12:00:00`,
      kind: 'expense',
      eyebrow: 'Gasto',
      title: record.title,
      detail: record.notes || 'Sem observação',
      amount: record.amount,
      route: ['/expenses'],
    }));
    const occurrenceEvents: ActivityEvent[] = this.store.occurrenceHistory().map((record) => ({
      id: `occurrence-${record.id}`,
      occurredAt: record.occurredAt,
      kind: 'occurrence',
      eyebrow: 'Ocorrência',
      title: record.title,
      detail: `${record.mileage.toLocaleString('pt-BR')} km${record.notes ? ` · ${record.notes}` : ''}`,
      attention: record.severity !== 'note',
    }));
    const safetyEvents: ActivityEvent[] = this.store.safetyCheckHistory().map((record) => {
      const issues = record.responses.filter((response) => response.status === 'issue').length;
      return {
        id: `safety-${record.id}`,
        occurredAt: record.checkedAt,
        kind: 'safety',
        eyebrow: 'Pré-rodagem',
        title: issues ? `${issues} item(ns) com atenção` : 'Inspeção sem anormalidade marcada',
        detail: record.notes || `${record.responses.length} itens observados`,
        attention: issues > 0,
        route: ['/safety-check'],
      };
    });
    return [
      ...serviceEvents,
      ...fuelEvents,
      ...expenseEvents,
      ...occurrenceEvents,
      ...safetyEvents,
    ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  });
  protected dateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(value),
    );
  }
  protected currency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
}
