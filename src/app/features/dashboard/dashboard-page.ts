import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { calculateMaintenanceSchedule } from '../../core/domain/maintenance-calculator';
import { MaintenancePlanItem, MaintenanceSchedule } from '../../core/models/maintenance.model';
import { OdometerRecordSource } from '../../core/models/odometer-record.model';
import { CurrentDateService } from '../../core/services/current-date.service';
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

      @if (store.recovery(); as recovery) {
        <section class="recovery-banner" role="alert">
          <div>
            <strong>Seus dados locais precisam de atenção</strong>
            <p>{{ recovery.message }}</p>
          </div>
          <a class="button button-secondary" routerLink="/settings">Abrir ajustes</a>
        </section>
      } @else if (!store.setup().completed) {
        <section class="setup-banner" role="status">
          <div>
            <strong>Você está vendo dados demonstrativos</strong>
            <p>
              A quilometragem e os serviços abaixo não foram confirmados como dados da sua
              motocicleta. Alertas operacionais estão pausados.
            </p>
          </div>
          <a class="button button-primary" routerLink="/motorcycle">Configurar minha NX200</a>
        </section>
      }

      <section class="bike-hero" aria-labelledby="mileage-title">
        <div class="bike-hero-content">
          <span id="mileage-title">
            {{ store.setup().completed ? 'Quilometragem atual' : 'Quilometragem demonstrativa' }}
          </span>
          <strong>{{ motorcycle().currentMileage.toLocaleString('pt-BR') }}</strong>
          <small>quilômetros</small>
        </div>
        <div class="bike-visual" aria-hidden="true">
          <span>NX</span>
          <b>200</b>
        </div>
        @if (store.setup().completed && !store.recovery()) {
          <form class="mileage-form" (ngSubmit)="updateMileage()">
            <label for="quick-mileage">Atualizar odômetro</label>
            <div class="input-action">
              <input
                id="quick-mileage"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                [formControl]="mileageControl"
              />
              <button class="button button-light" type="submit" [disabled]="mileageControl.invalid">
                Salvar
              </button>
            </div>
          </form>
        } @else {
          <a class="button button-light" routerLink="/motorcycle">Confirmar meus dados</a>
        }
      </section>

      @if (mileageMessage()) {
        <p
          [class]="
            mileageMessageKind() === 'error' ? 'field-error import-message' : 'success-message'
          "
          [attr.role]="mileageMessageKind() === 'error' ? 'alert' : 'status'"
        >
          {{ mileageMessage() }}
        </p>
      }

      @if (regressionPending()) {
        <form
          class="confirm-box regression-confirm dashboard-regression"
          [formGroup]="regressionForm"
          (ngSubmit)="confirmRegression()"
        >
          <strong>Essa leitura é inferior à atual</strong>
          <p>{{ regressionMessage() }}</p>
          <div class="form-field">
            <label for="quick-regression-source">Motivo da redução</label>
            <select id="quick-regression-source" formControlName="source">
              <option value="correction">Correção de leitura digitada</option>
              <option value="panel-replacement">Troca ou reinicialização do painel</option>
            </select>
          </div>
          <div class="form-field">
            <label for="quick-regression-note">Observação</label>
            <textarea
              id="quick-regression-note"
              rows="2"
              formControlName="note"
              placeholder="Explique o que aconteceu"
            ></textarea>
          </div>
          <label class="confirmation-check">
            <input type="checkbox" formControlName="confirmed" />
            <span>Confirmo a redução sem alterar históricos antigos.</span>
          </label>
          <div>
            <button class="button button-secondary" type="button" (click)="cancelRegression()">
              Cancelar
            </button>
            <button class="button button-danger" type="submit" [disabled]="regressionForm.invalid">
              Confirmar correção
            </button>
          </div>
        </form>
      }

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
              <article class="alert-row detailed-alert">
                <span [class]="'alert-symbol ' + alert.status" aria-hidden="true">!</span>
                <div>
                  <strong>{{ alert.title }}</strong>
                  <small>{{ alert.reason }}</small>
                  <small>{{ alert.message }}</small>
                  <dl class="alert-forecast">
                    @if (alert.nextDate) {
                      <div>
                        <dt>Data prevista</dt>
                        <dd>{{ formatDate(alert.nextDate) }}</dd>
                      </div>
                    }
                    @if (alert.nextMileage !== undefined) {
                      <div>
                        <dt>Km prevista</dt>
                        <dd>{{ alert.nextMileage.toLocaleString('pt-BR') }} km</dd>
                      </div>
                    }
                  </dl>
                  <a
                    class="text-button"
                    routerLink="/maintenance/new"
                    [queryParams]="{ plan: alert.itemId }"
                  >
                    {{ alert.actionLabel }}
                  </a>
                </div>
                <app-status-badge [status]="alert.status" />
              </article>
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
              <small>
                {{ formatDate(service.date) }} · {{ service.mileage.toLocaleString('pt-BR') }} km
              </small>
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
              <strong>Dados pendentes de validação</strong>
              <small>Nenhum intervalo confirmado para cálculo operacional.</small>
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
          <a
            class="quick-card primary"
            [routerLink]="store.setup().completed ? '/maintenance/new' : '/motorcycle'"
          >
            <span aria-hidden="true">＋</span>
            <strong>Registrar manutenção</strong>
            <small>
              {{
                store.setup().completed
                  ? 'Atualize o plano automaticamente'
                  : 'Configure a moto primeiro'
              }}
            </small>
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
        Itens com fonte pendente de validação permanecem visíveis, mas não geram alertas nem
        contagens operacionais.
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  protected readonly store = inject(GarageStore);
  private readonly notificationService = inject<NotificationService>(NOTIFICATION_SERVICE);
  private readonly currentDate = inject(CurrentDateService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly motorcycle = this.store.motorcycle;
  protected readonly mileageControl = new FormControl(this.motorcycle().currentMileage, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
  });
  protected readonly regressionPending = signal(false);
  protected readonly regressionMessage = signal('');
  protected readonly mileageMessage = signal('');
  protected readonly mileageMessageKind = signal<'success' | 'error'>('success');
  protected readonly regressionForm = this.formBuilder.nonNullable.group({
    source: this.formBuilder.nonNullable.control<OdometerRecordSource>('correction'),
    note: ['', Validators.maxLength(240)],
    confirmed: [false, Validators.requiredTrue],
  });
  protected readonly lastService = computed(() =>
    this.store.serviceHistory().find((service) => !service.isDemo),
  );
  protected readonly schedules = computed<readonly ScheduleRow[]>(() =>
    this.store.maintenancePlan().map((item) => ({
      item,
      schedule: this.store.setup().completed
        ? calculateMaintenanceSchedule(
            item,
            this.motorcycle().currentMileage,
            this.currentDate.today(),
          )
        : { status: 'unknown' },
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
  protected readonly nextMaintenance = computed(() => {
    const operational = this.schedules().filter(({ schedule }) => schedule.status !== 'unknown');
    return operational.sort((a, b) => urgency[b.schedule.status] - urgency[a.schedule.status])[0];
  });
  protected readonly alerts = computed(() =>
    this.store.setup().completed && this.store.settings().maintenanceAlertsEnabled
      ? this.notificationService.buildAlerts(
          this.store.maintenancePlan(),
          this.motorcycle().currentMileage,
          this.currentDate.today(),
        )
      : [],
  );

  protected updateMileage(): void {
    if (this.mileageControl.invalid) {
      return;
    }
    this.mileageMessage.set('');
    const result = this.store.updateMileage({
      mileage: this.mileageControl.getRawValue(),
      source: 'dashboard',
    });
    if (result.status === 'confirmation-required') {
      this.regressionMessage.set(result.impact ?? '');
      this.regressionPending.set(true);
      return;
    }
    if (result.status === 'blocked') {
      this.mileageMessageKind.set('error');
      this.mileageMessage.set(result.impact ?? 'Não foi possível atualizar o odômetro.');
      return;
    }
    this.mileageMessageKind.set('success');
    this.mileageMessage.set('Odômetro atualizado e registrado no histórico.');
  }

  protected confirmRegression(): void {
    if (this.regressionForm.invalid) {
      this.regressionForm.markAllAsTouched();
      return;
    }
    const regression = this.regressionForm.getRawValue();
    const result = this.store.updateMileage({
      mileage: this.mileageControl.getRawValue(),
      source: regression.source,
      note: regression.note,
      confirmedRegression: true,
    });
    if (result.status !== 'updated') {
      this.mileageMessageKind.set('error');
      this.mileageMessage.set(result.impact ?? 'Não foi possível confirmar a correção.');
      return;
    }
    this.cancelRegression();
    this.mileageMessageKind.set('success');
    this.mileageMessage.set('Correção registrada sem alterar os históricos antigos.');
  }

  protected cancelRegression(): void {
    this.regressionPending.set(false);
    this.regressionMessage.set('');
    this.regressionForm.reset({ source: 'correction', note: '', confirmed: false });
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
    return parts.length > 0 ? parts.join(' ou ') : 'Dados pendentes de validação';
  }
}
