import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { calculateFuelConsumption, summarizeFuelHistory } from '../../core/domain/fuel-consumption';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-fuel-page',
  imports: [RouterLink],
  template: `
    <div class="page page-narrow">
      <header class="page-heading with-action">
        <div>
          <p class="eyebrow">Uso cotidiano</p>
          <h1>Abastecimentos</h1>
          <p>Acompanhe consumo e custo sem depender de conexão.</p>
        </div>
        <a
          class="button button-primary"
          [routerLink]="store.setup().completed ? '/fuel/new' : '/motorcycle'"
        >
          {{ store.setup().completed ? '＋ Abastecer' : 'Configurar minha NX200' }}
        </a>
      </header>

      @if (!store.setup().completed) {
        <section class="setup-banner" role="status">
          <div>
            <strong>Confirme a quilometragem primeiro</strong>
            <p>O consumo usa as leituras reais do odômetro entre tanques completos.</p>
          </div>
          <a class="button button-secondary" routerLink="/motorcycle">Configurar</a>
        </section>
      }

      <section class="daily-metric-grid" aria-label="Resumo de abastecimentos">
        <article class="card daily-metric featured">
          <span>Último consumo</span>
          <strong>{{ consumptionLabel(summary().latestKmPerLiter) }}</strong>
          <small>{{
            summary().latestKmPerLiter
              ? 'calculado entre tanques completos'
              : 'aguardando duas marcações completas'
          }}</small>
        </article>
        <article class="card daily-metric">
          <span>Média válida</span>
          <strong>{{ consumptionLabel(summary().averageKmPerLiter) }}</strong>
          <small>{{ summary().validIntervals }} intervalo(s)</small>
        </article>
        <article class="card daily-metric">
          <span>Gasto com combustível</span>
          <strong>{{ currency(summary().totalCost) }}</strong>
          <small>{{ summary().totalLiters.toFixed(1).replace('.', ',') }} litros registrados</small>
        </article>
      </section>

      <section class="card inline-alert info" aria-labelledby="consumption-help-title">
        <span aria-hidden="true">i</span>
        <div>
          <strong id="consumption-help-title">Como o Garage calcula</strong>
          <p>
            Marque “tanque completo” ao encher. A partir do segundo tanque completo, o app divide a
            distância percorrida por todos os litros abastecidos desde a marcação completa anterior.
            Abastecimentos parciais entram nessa soma, mas não fecham um intervalo sozinhos.
          </p>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Registros</p>
            <h2>Histórico de abastecimentos</h2>
          </div>
        </div>
        <div class="record-list">
          @for (record of store.fuelHistory(); track record.id) {
            <article class="card record-card">
              <div class="inline-between">
                <div>
                  <span class="card-label">{{ dateTime(record.fueledAt) }}</span>
                  <h3>{{ record.mileage.toLocaleString('pt-BR') }} km</h3>
                </div>
                <strong>{{ currency(record.totalCost) }}</strong>
              </div>
              <div class="record-facts">
                <span>{{ record.liters.toFixed(2).replace('.', ',') }} L</span>
                <span>{{ record.fullTank ? 'Tanque completo' : 'Parcial' }}</span>
                <span>{{ entryLabel(record.id) }}</span>
              </div>
              @if (record.station || record.notes) {
                <p>
                  {{ record.station }}{{ record.station && record.notes ? ' · ' : ''
                  }}{{ record.notes }}
                </p>
              }
            </article>
          } @empty {
            <div class="empty-state">
              <span aria-hidden="true">⛽</span>
              <strong>Nenhum abastecimento registrado</strong>
              <p>O primeiro registro cria a base para acompanhar custos e consumo.</p>
              <a class="button button-primary" routerLink="/fuel/new">Registrar agora</a>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FuelPage {
  protected readonly store = inject(GarageStore);
  protected readonly summary = computed(() => summarizeFuelHistory(this.store.fuelHistory()));
  private readonly entries = computed(
    () =>
      new Map(
        calculateFuelConsumption(this.store.fuelHistory()).map((entry) => [
          entry.fuelRecordId,
          entry,
        ]),
      ),
  );

  protected consumptionLabel(value: number | undefined): string {
    return value === undefined ? '—' : `${value.toFixed(1).replace('.', ',')} km/L`;
  }

  protected entryLabel(id: string): string {
    const entry = this.entries().get(id);
    if (entry?.kmPerLiter !== undefined) return this.consumptionLabel(entry.kmPerLiter);
    if (entry?.reason === 'partial-tank') return 'Sem cálculo';
    if (entry?.reason === 'invalid-odometer-sequence') return 'Sequência de km inválida';
    return 'Primeiro tanque completo';
  }

  protected currency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  protected dateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(value),
    );
  }
}
