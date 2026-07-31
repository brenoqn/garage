import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { calculateMaintenanceSchedule, todayIso } from '../../core/domain/maintenance-calculator';
import { MaintenancePlanItem, MaintenanceSchedule } from '../../core/models/maintenance.model';
import { GarageStore } from '../../core/services/garage-store.service';
import {
  NOTIFICATION_SERVICE,
  NotificationService,
} from '../../core/services/notification.service';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';

interface ScheduleRow {
  readonly item: MaintenancePlanItem;
  readonly schedule: MaintenanceSchedule;
}

const urgency = { overdue: 5, due: 4, upcoming: 3, ok: 2, unknown: 1 } as const;

@Component({
  selector: 'app-dashboard-page',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge],
  template: `
    <div class="page dashboard-page">
      <header class="page-heading dashboard-heading">
        <div>
          <p class="eyebrow">Sua oficina, no seu ritmo</p>
          <h1>Olá, {{ motorcycle().nickname }}</h1>
          <p>{{ motorcycle().manufacturer }} {{ motorcycle().model }} · {{ motorcycle().year }}</p>
        </div>
        <a class="icon-button desktop-only" routerLink="/motorcycle" aria-label="Editar motocicleta"
          >✎</a
        >
      </header>

      <section class="bike-hero" aria-labelledby="mileage-title">
        <div class="bike-hero-content">
          <span id="mileage-title">Quilometragem atual</span>
          <strong>{{ motorcycle().currentMileage.toLocaleString('pt-BR') }}</strong>
          <small>quilômetros</small>
        </div>
        <div class="bike-visual" aria-hidden="true">
          <span>NX</span>
          <b>200</b>
        </div>
        <form class="mileage-form" (ngSubmit)="updateMileage()">
          <label for="quick-mileage">Atualizar odômetro</label>
          <div class="input-action">
            <input
              id="quick-mileage"
              type="number"
              min="0"
              inputmode="numeric"
              [formControl]="mileageControl"
            />
            <button class="button button-light" type="submit" [disabled]="mileageControl.invalid">
              Salvar
            </button>
          </div>
        </form>
      </section>

      <section class="metric-grid" aria-label="Resumo de manutenção">
        <article class="metric-card upcoming">
          <span class="metric-icon" aria-hidden="true">◷</span>
          <div>
            <strong>{{ upcomingCount() }}</strong>
            <span>próximas</span>
          </div>
        </article>
        <article class="metric-card overdue">
          <span class="metric-icon" aria-hidden="true">!</span>
          <div>
            <strong>{{ overdueCount() }}</strong>
            <span>vencidas</span>
          </div>
        </article>
      </section>

      @if (alerts().length > 0) {
        <section class="section-block">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Atenção</p>
              <h2>Alertas de manutenção</h2>
            </div>
            <a routerLink="/maintenance">Ver plano</a>
          </div>
          <div class="alert-list">
            @for (alert of alerts().slice(0, 3); track alert.itemId) {
              <a class="alert-row" routerLink="/maintenance">
                <span [class]="'alert-symbol ' + alert.status" aria-hidden="true">!</span>
                <span>
                  <strong>{{ alert.title }}</strong>
                  <small>{{ alert.message }}</small>
                </span>
                <span aria-hidden="true">›</span>
              </a>
            }
          </div>
        </section>
      }

      <section class="section-block">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Linha do tempo</p>
            <h2>Manutenções</h2>
          </div>
          <a routerLink="/maintenance/history">Histórico</a>
        </div>

        <div class="timeline-grid">
          <article class="card timeline-card">
            <span class="card-label">Última realizada</span>
            @if (lastService(); as service) {
              <strong>{{ service.title }}</strong>
              <small
                >{{ formatDate(service.date) }} ·
                {{ service.mileage.toLocaleString('pt-BR') }} km</small
              >
            } @else {
              <strong>Nenhum registro</strong>
              <small>Registre seu primeiro serviço.</small>
            }
          </article>

          <article class="card timeline-card">
            <span class="card-label">Próxima prioridade</span>
            @if (nextMaintenance(); as row) {
              <div class="inline-between">
                <strong>{{ row.item.title }}</strong>
                <app-status-badge [status]="row.schedule.status" />
              </div>
              <small>{{ scheduleDescription(row.schedule) }}</small>
            } @else {
              <strong>Plano em dia</strong>
              <small>Nenhuma prioridade encontrada.</small>
            }
          </article>
        </div>
      </section>

      <section class="section-block">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Atalhos</p>
            <h2>O que você quer fazer?</h2>
          </div>
        </div>
        <div class="quick-grid">
          <a class="quick-card primary" routerLink="/maintenance/new">
            <span aria-hidden="true">＋</span>
            <strong>Registrar manutenção</strong>
            <small>Atualize o plano automaticamente</small>
          </a>
          <a class="quick-card" routerLink="/procedures">
            <span aria-hidden="true">☷</span>
            <strong>Abrir procedimentos</strong>
            <small>Guias seguros, passo a passo</small>
          </a>
          <a class="quick-card" routerLink="/motorcycle">
            <span aria-hidden="true">⌁</span>
            <strong>Dados da motocicleta</strong>
            <small>Apelido, ano e odômetro</small>
          </a>
        </div>
      </section>

      <p class="demo-disclaimer">
        Intervalos do plano são demonstrativos e não representam especificações oficiais da Honda.
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly store = inject(GarageStore);
  private readonly notificationService = inject<NotificationService>(NOTIFICATION_SERVICE);

  protected readonly motorcycle = this.store.motorcycle;
  protected readonly mileageControl = new FormControl(this.motorcycle().currentMileage, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0)],
  });
  protected readonly lastService = computed(() => this.store.serviceHistory()[0]);
  protected readonly schedules = computed<readonly ScheduleRow[]>(() =>
    this.store.maintenancePlan().map((item) => ({
      item,
      schedule: calculateMaintenanceSchedule(item, this.motorcycle().currentMileage, todayIso()),
    })),
  );
  protected readonly upcomingCount = computed(
    () =>
      this.schedules().filter(
        ({ schedule }) => schedule.status === 'upcoming' || schedule.status === 'due',
      ).length,
  );
  protected readonly overdueCount = computed(
    () => this.schedules().filter(({ schedule }) => schedule.status === 'overdue').length,
  );
  protected readonly nextMaintenance = computed(
    () =>
      [...this.schedules()].sort(
        (a, b) => urgency[b.schedule.status] - urgency[a.schedule.status],
      )[0],
  );
  protected readonly alerts = computed(() =>
    this.store.settings().maintenanceAlertsEnabled
      ? this.notificationService.buildAlerts(
          this.store.maintenancePlan(),
          this.motorcycle().currentMileage,
          todayIso(),
        )
      : [],
  );

  protected updateMileage(): void {
    if (this.mileageControl.invalid) {
      return;
    }
    this.store.updateMileage(this.mileageControl.getRawValue());
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T12:00:00Z`));
  }

  protected scheduleDescription(schedule: MaintenanceSchedule): string {
    const parts: string[] = [];
    if (schedule.nextMileage !== undefined) {
      parts.push(`${schedule.nextMileage.toLocaleString('pt-BR')} km`);
    }
    if (schedule.nextDate) {
      parts.push(this.formatDate(schedule.nextDate));
    }
    return parts.length > 0 ? parts.join(' ou ') : 'Defina um intervalo confirmado';
  }
}
