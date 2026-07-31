import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { calculateMaintenanceSchedule, todayIso } from '../../core/domain/maintenance-calculator';
import {
  MaintenancePlanItem,
  MaintenanceSchedule,
  MaintenanceStatus,
} from '../../core/models/maintenance.model';
import { GarageStore } from '../../core/services/garage-store.service';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';

type MaintenanceFilter = 'all' | 'attention' | 'ok' | 'unknown';

interface PlanRow {
  readonly item: MaintenancePlanItem;
  readonly schedule: MaintenanceSchedule;
}

@Component({
  selector: 'app-maintenance-page',
  imports: [RouterLink, StatusBadge],
  template: `
    <div class="page">
      <header class="page-heading with-action">
        <div>
          <p class="eyebrow">Cuidados preventivos</p>
          <h1>Plano de manutenção</h1>
          <p>Prioridades calculadas pela quilometragem e pelo tempo.</p>
        </div>
        <a class="button button-primary" routerLink="/maintenance/new">＋ Registrar serviço</a>
      </header>

      <div class="summary-strip" aria-label="Resumo do plano">
        <div>
          <strong>{{ count('overdue') + count('due') }}</strong
          ><span>vencidas</span>
        </div>
        <div>
          <strong>{{ count('upcoming') }}</strong
          ><span>próximas</span>
        </div>
        <div>
          <strong>{{ count('ok') }}</strong
          ><span>em dia</span>
        </div>
        <div>
          <strong>{{ count('unknown') }}</strong
          ><span>a confirmar</span>
        </div>
      </div>

      <nav class="filter-pills" aria-label="Filtrar plano">
        @for (option of filters; track option.value) {
          <button
            type="button"
            [class.active]="filter() === option.value"
            (click)="filter.set(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </nav>

      <div class="source-warning">
        <span aria-hidden="true">!</span>
        <p>
          Os intervalos exibidos são dados demonstrativos. Confirme cada valor no manual
          correspondente ao ano da sua NX200 antes de usá-lo como referência mecânica.
        </p>
      </div>

      <section class="maintenance-list" aria-label="Itens do plano de manutenção">
        @for (row of filteredRows(); track row.item.id) {
          <article class="card maintenance-card">
            <div class="maintenance-title">
              <span class="category-icon" aria-hidden="true">{{
                categoryIcon(row.item.category)
              }}</span>
              <div>
                <strong>{{ row.item.title }}</strong>
                <small>{{ intervalDescription(row.item) }}</small>
              </div>
              <app-status-badge [status]="row.schedule.status" />
            </div>

            <dl class="maintenance-details">
              <div>
                <dt>Última execução</dt>
                <dd>{{ executionDescription(row.item) }}</dd>
              </div>
              <div>
                <dt>Próxima estimada</dt>
                <dd>{{ scheduleDescription(row.schedule) }}</dd>
              </div>
            </dl>

            <div class="maintenance-actions">
              @if (row.item.procedureSlug) {
                <a [routerLink]="['/procedures', row.item.procedureSlug]">Ver procedimento</a>
              }
              <a [routerLink]="['/maintenance/new']" [queryParams]="{ plan: row.item.id }">
                Registrar
              </a>
            </div>
          </article>
        } @empty {
          <div class="empty-state">
            <span aria-hidden="true">✓</span>
            <strong>Nada por aqui</strong>
            <p>Nenhum item corresponde ao filtro escolhido.</p>
          </div>
        }
      </section>

      <a class="history-banner" routerLink="/maintenance/history">
        <span aria-hidden="true">↺</span>
        <span>
          <strong>Histórico de serviços</strong>
          <small>{{ store.serviceHistory().length }} registros neste dispositivo</small>
        </span>
        <span aria-hidden="true">›</span>
      </a>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePage {
  protected readonly store = inject(GarageStore);
  protected readonly filter = signal<MaintenanceFilter>('all');
  protected readonly filters: readonly { value: MaintenanceFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'attention', label: 'Exigem atenção' },
    { value: 'ok', label: 'Em dia' },
    { value: 'unknown', label: 'A confirmar' },
  ];
  protected readonly rows = computed<readonly PlanRow[]>(() =>
    this.store.maintenancePlan().map((item) => ({
      item,
      schedule: calculateMaintenanceSchedule(
        item,
        this.store.motorcycle().currentMileage,
        todayIso(),
      ),
    })),
  );
  protected readonly filteredRows = computed(() => {
    const selected = this.filter();
    if (selected === 'all') {
      return this.rows();
    }
    if (selected === 'attention') {
      return this.rows().filter(({ schedule }) =>
        ['upcoming', 'due', 'overdue'].includes(schedule.status),
      );
    }
    return this.rows().filter(({ schedule }) => schedule.status === selected);
  });

  protected count(status: MaintenanceStatus): number {
    return this.rows().filter((row) => row.schedule.status === status).length;
  }

  protected intervalDescription(item: MaintenancePlanItem): string {
    const parts: string[] = [];
    if (item.intervalKm) {
      parts.push(`a cada ${item.intervalKm.toLocaleString('pt-BR')} km`);
    }
    if (item.intervalDays) {
      parts.push(`a cada ${item.intervalDays} dias`);
    }
    return parts.join(' ou ') || 'Intervalo a confirmar';
  }

  protected executionDescription(item: MaintenancePlanItem): string {
    const execution = item.lastExecution;
    if (!execution) {
      return 'Sem registro';
    }
    return `${this.formatDate(execution.date)} · ${execution.mileage.toLocaleString('pt-BR')} km`;
  }

  protected scheduleDescription(schedule: MaintenanceSchedule): string {
    const parts: string[] = [];
    if (schedule.nextMileage !== undefined) {
      parts.push(`${schedule.nextMileage.toLocaleString('pt-BR')} km`);
    }
    if (schedule.nextDate) {
      parts.push(this.formatDate(schedule.nextDate));
    }
    return parts.join(' ou ') || 'A confirmar';
  }

  protected categoryIcon(category: MaintenancePlanItem['category']): string {
    const icons: Record<MaintenancePlanItem['category'], string> = {
      engine: '●',
      transmission: '⛓',
      electrical: 'ϟ',
      controls: '⌁',
      brakes: '◉',
      general: '◇',
    };
    return icons[category];
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
  }
}
