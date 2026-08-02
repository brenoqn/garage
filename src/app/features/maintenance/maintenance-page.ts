import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { calculateMaintenanceSchedule } from '../../core/domain/maintenance-calculator';
import {
  MaintenancePlanItem,
  MaintenanceSchedule,
  MaintenanceStatus,
} from '../../core/models/maintenance.model';
import { CurrentDateService } from '../../core/services/current-date.service';
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
        <div class="header-actions">
          <a class="button button-secondary" routerLink="/maintenance/upcoming">Ver próximas</a>
          <a
            class="button button-primary"
            [routerLink]="store.setup().completed ? '/maintenance/new' : '/motorcycle'"
          >
            {{ store.setup().completed ? '＋ Registrar serviço' : 'Configurar minha NX200' }}
          </a>
        </div>
      </header>

      @if (!store.setup().completed) {
        <section class="setup-banner" role="status">
          <div>
            <strong>Plano em modo demonstrativo</strong>
            <p>
              Conclua a configuração inicial para confirmar a quilometragem. Alertas e contagens
              operacionais estão pausados.
            </p>
          </div>
          <a class="button button-secondary" routerLink="/motorcycle">Configurar agora</a>
        </section>
      }

      <div class="summary-strip" aria-label="Resumo do plano">
        <div>
          <strong>{{ count('overdue') }}</strong>
          <span>vencidas</span>
        </div>
        <div>
          <strong>{{ count('upcoming') + count('due') }}</strong>
          <span>próximas</span>
        </div>
        <div>
          <strong>{{ count('ok') }}</strong>
          <span>em dia</span>
        </div>
        <div>
          <strong>{{ count('unknown') }}</strong>
          <span>pendentes</span>
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
          Itens sem fonte técnica confirmada permanecem visíveis como “Dados pendentes de
          validação”, mas não são classificados como próximos, devidos ou vencidos.
        </p>
      </div>

      <section class="maintenance-list" aria-label="Itens do plano de manutenção">
        @for (row of filteredRows(); track row.item.id) {
          <article class="card maintenance-card">
            <div class="maintenance-title">
              <span class="category-icon" aria-hidden="true">
                {{ categoryIcon(row.item.category) }}
              </span>
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
              <a
                [routerLink]="store.setup().completed ? '/maintenance/new' : '/motorcycle'"
                [queryParams]="store.setup().completed ? { plan: row.item.id } : {}"
              >
                {{ store.setup().completed ? 'Registrar' : 'Configurar primeiro' }}
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
  private readonly currentDate = inject(CurrentDateService);
  protected readonly filter = signal<MaintenanceFilter>('all');
  protected readonly filters: readonly { value: MaintenanceFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'attention', label: 'Exigem atenção' },
    { value: 'ok', label: 'Em dia' },
    { value: 'unknown', label: 'Pendentes' },
  ];
  protected readonly rows = computed<readonly PlanRow[]>(() =>
    this.store.maintenancePlan().map((item) => ({
      item,
      schedule: this.store.setup().completed
        ? calculateMaintenanceSchedule(
            item,
            this.store.motorcycle().currentMileage,
            this.currentDate.today(),
          )
        : { status: 'unknown' },
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
    if (item.technicalSource.status !== 'confirmed') {
      return 'Dados pendentes de validação';
    }
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
    if (schedule.status === 'unknown') {
      return 'Dados pendentes de validação';
    }
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
