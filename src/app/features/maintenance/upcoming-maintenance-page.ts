import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { calculateMaintenanceSchedule } from '../../core/domain/maintenance-calculator';
import { MaintenancePlanItem, MaintenanceSchedule } from '../../core/models/maintenance.model';
import { CurrentDateService } from '../../core/services/current-date.service';
import { GarageStore } from '../../core/services/garage-store.service';
import { StatusBadge } from '../../shared/components/status-badge/status-badge';

interface UpcomingRow {
  readonly item: MaintenancePlanItem;
  readonly schedule: MaintenanceSchedule;
}
const priority = { overdue: 5, due: 4, upcoming: 3, ok: 2, unknown: 1 } as const;

@Component({
  selector: 'app-upcoming-maintenance-page',
  imports: [RouterLink, StatusBadge],
  template: `
    <div class="page page-narrow">
      <header class="page-heading with-action">
        <div>
          <a class="back-link" routerLink="/maintenance">‹ Plano completo</a>
          <p class="eyebrow">O que vem agora</p>
          <h1>Próximas manutenções</h1>
          <p>
            Prioridades calculadas pela data e pela quilometragem, somente quando a fonte está
            revisada.
          </p>
        </div>
        <a class="button button-primary" routerLink="/maintenance/new">Registrar serviço</a>
      </header>
      @if (operationalRows().length) {
        <section class="record-list" aria-label="Cronograma operacional">
          @for (row of operationalRows(); track row.item.id) {
            <article class="card schedule-card">
              <div class="inline-between">
                <div>
                  <span class="card-label">{{ reason(row.schedule) }}</span>
                  <h2>{{ row.item.title }}</h2>
                </div>
                <app-status-badge [status]="row.schedule.status" />
              </div>
              <dl class="alert-forecast">
                @if (row.schedule.nextMileage !== undefined) {
                  <div>
                    <dt>Quilometragem prevista</dt>
                    <dd>{{ row.schedule.nextMileage.toLocaleString('pt-BR') }} km</dd>
                  </div>
                }
                @if (row.schedule.nextDate) {
                  <div>
                    <dt>Data prevista</dt>
                    <dd>{{ date(row.schedule.nextDate) }}</dd>
                  </div>
                }
              </dl>
              <div class="maintenance-actions">
                @if (row.item.procedureSlug) {
                  <a [routerLink]="['/procedures', row.item.procedureSlug]">Ver procedimento</a>
                }
                <a routerLink="/maintenance/new" [queryParams]="{ plan: row.item.id }">Registrar</a>
              </div>
            </article>
          }
        </section>
      } @else {
        <section class="empty-state card honest-empty">
          <span aria-hidden="true">◇</span><strong>Nenhum prazo operacional revisado</strong>
          <p>
            Os intervalos da NX200 foram localizados no manual aplicável, mas ainda estão marcados
            como transcrição pendente de revisão. Eles não geram contagem nem alerta até essa etapa
            editorial.
          </p>
          <a class="button button-secondary" routerLink="/technical-sources">Ver fontes técnicas</a>
        </section>
      }
      @if (pendingRows().length) {
        <section class="section-block">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Visível, sem alarme</p>
              <h2>Cronograma pendente de revisão</h2>
            </div>
          </div>
          <div class="record-list">
            @for (row of pendingRows(); track row.item.id) {
              <article class="card pending-schedule-row">
                <div>
                  <strong>{{ row.item.title }}</strong
                  ><small>{{ interval(row.item) }}</small>
                </div>
                <app-status-badge status="unknown" />
              </article>
            }
          </div>
        </section>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingMaintenancePage {
  protected readonly store = inject(GarageStore);
  private readonly currentDate = inject(CurrentDateService);
  protected readonly rows = computed<readonly UpcomingRow[]>(() =>
    this.store
      .maintenancePlan()
      .map((item): UpcomingRow => ({
        item,
        schedule: this.store.setup().completed
          ? calculateMaintenanceSchedule(
              item,
              this.store.motorcycle().currentMileage,
              this.currentDate.today(),
            )
          : { status: 'unknown' },
      }))
      .sort((a, b) => priority[b.schedule.status] - priority[a.schedule.status]),
  );
  protected readonly operationalRows = computed(() =>
    this.rows().filter((row) => row.schedule.status !== 'unknown'),
  );
  protected readonly pendingRows = computed(() =>
    this.rows().filter((row) => row.schedule.status === 'unknown'),
  );
  protected reason(schedule: MaintenanceSchedule): string {
    if (schedule.remainingKm !== undefined && schedule.remainingKm < 0)
      return `${Math.abs(schedule.remainingKm).toLocaleString('pt-BR')} km em atraso`;
    if (schedule.remainingDays !== undefined && schedule.remainingDays < 0)
      return `${Math.abs(schedule.remainingDays)} dia(s) em atraso`;
    if (schedule.remainingKm !== undefined)
      return `${schedule.remainingKm.toLocaleString('pt-BR')} km restantes`;
    if (schedule.remainingDays !== undefined) return `${schedule.remainingDays} dia(s) restantes`;
    return 'Sem previsão';
  }
  protected interval(item: MaintenancePlanItem): string {
    const parts = [
      item.intervalKm ? `${item.intervalKm.toLocaleString('pt-BR')} km` : '',
      item.intervalDays ? `${item.intervalDays} dias` : '',
    ].filter(Boolean);
    return parts.length ? `Intervalo transcrito: ${parts.join(' ou ')}` : 'Intervalo a confirmar';
  }
  protected date(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(`${value}T12:00:00Z`),
    );
  }
}
