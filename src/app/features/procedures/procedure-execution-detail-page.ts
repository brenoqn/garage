import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { calculateProcedureProgress } from '../../core/domain/procedure-execution';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-procedure-execution-detail-page',
  imports: [RouterLink],
  template: `
    <div class="page page-narrow">
      @if (execution(); as run) {
        @if (procedure(); as guide) {
          <header class="page-heading">
            <div>
              <a class="back-link" routerLink="/procedure-executions">‹ Atividades</a>
              <p class="eyebrow">{{ statusLabel() }}</p>
              <h1>{{ guide.title }}</h1>
              <p>
                Iniciada em {{ formatDate(run.startedAt) }} · Atualizada em
                {{ formatDate(run.updatedAt) }}
              </p>
            </div>
          </header>
          <section class="card activity-detail-summary">
            <strong>{{ progress().percent }}% das etapas obrigatórias</strong>
            <div class="progress-track"><span [style.width.%]="progress().percent"></span></div>
            @if (run.completedAt) {
              <p>Concluída em {{ formatDate(run.completedAt) }}</p>
            }
            @if (run.cancelledAt) {
              <p>Cancelada em {{ formatDate(run.cancelledAt) }}</p>
            }
            @if (run.note) {
              <p><strong>Observação:</strong> {{ run.note }}</p>
            }
          </section>
          <section class="card activity-detail-list">
            <h2>Alertas reconhecidos</h2>
            <ul class="check-list">
              @for (warning of guide.safetyWarnings; track warning.id) {
                <li><span>✓</span>{{ warning.text }}</li>
              }
            </ul>
          </section>
          <section class="card activity-detail-list">
            <h2>Etapas</h2>
            <ol class="detail-step-list">
              @for (step of guide.steps; track step.id) {
                <li [class.completed]="run.completedStepIds.includes(step.id)">
                  <span>{{ run.completedStepIds.includes(step.id) ? '✓' : '—' }}</span>
                  <div>
                    <strong>{{ step.title }}</strong
                    ><small>{{ step.required ? 'Obrigatória' : 'Opcional' }}</small>
                  </div>
                </li>
              }
            </ol>
          </section>
          <section class="card activity-detail-list">
            <h2>Verificações finais</h2>
            <ul class="check-list">
              @for (check of guide.finalChecks; track check.id) {
                <li>
                  <span>{{ run.completedFinalCheckIds.includes(check.id) ? '✓' : '—' }}</span
                  >{{ check.label }}
                </li>
              }
            </ul>
          </section>
          <div class="form-actions">
            @if (run.status === 'in-progress') {
              <a
                class="button button-primary"
                [routerLink]="['/procedures', guide.slug, 'run', run.id]"
                >Continuar</a
              >
            }
            @if (run.resultingServiceRecordId) {
              <a class="button button-secondary" routerLink="/maintenance/history"
                >Ver manutenção vinculada</a
              >
            }
            <a class="button button-secondary" [routerLink]="['/procedures', guide.slug]"
              >Abrir guia</a
            >
          </div>
        }
      } @else {
        <div class="empty-state">
          <strong>Atividade não encontrada</strong
          ><a routerLink="/procedure-executions">Voltar ao histórico</a>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcedureExecutionDetailPage {
  private readonly store = inject(GarageStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly execution = computed(() =>
    this.store
      .procedureExecutions()
      .find((item) => item.id === this.route.snapshot.paramMap.get('executionId')),
  );
  protected readonly procedure = computed(() =>
    this.store.procedures().find((item) => item.slug === this.execution()?.procedureSlug),
  );
  protected readonly progress = computed(() =>
    this.execution() && this.procedure()
      ? calculateProcedureProgress(this.procedure()!, this.execution()!)
      : { percent: 0 },
  );
  protected statusLabel(): string {
    return { 'in-progress': 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado' }[
      this.execution()?.status ?? 'cancelled'
    ];
  }
  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(value),
    );
  }
}
