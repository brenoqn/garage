import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { calculateProcedureProgress } from '../../core/domain/procedure-execution';
import { ProcedureExecution } from '../../core/models/procedure-execution.model';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-procedure-executions-page',
  imports: [NgTemplateOutlet, RouterLink],
  template: `
    <div class="page">
      <header class="page-heading with-action">
        <div>
          <p class="eyebrow">Oficina</p>
          <h1>Atividades de procedimentos</h1>
          <p>Continue o que está em andamento e consulte execuções anteriores.</p>
        </div>
        <a class="button button-primary" routerLink="/procedures">Abrir biblioteca</a>
      </header>

      @if (active().length) {
        <section class="section-block" aria-labelledby="active-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Retomar</p>
              <h2 id="active-title">Em andamento</h2>
            </div>
          </div>
          <div class="activity-grid">
            @for (execution of active(); track execution.id) {
              <ng-container
                [ngTemplateOutlet]="activity"
                [ngTemplateOutletContext]="{ $implicit: execution }"
              />
            }
          </div>
        </section>
      }

      <section class="section-block" aria-labelledby="history-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Histórico</p>
            <h2 id="history-title">Concluídas e canceladas</h2>
          </div>
        </div>
        <div class="activity-grid">
          @for (execution of previous(); track execution.id) {
            <ng-container
              [ngTemplateOutlet]="activity"
              [ngTemplateOutletContext]="{ $implicit: execution }"
            />
          } @empty {
            <div class="empty-state compact">
              <strong>Nenhuma atividade anterior</strong>
              <p>As execuções concluídas e canceladas aparecerão aqui.</p>
            </div>
          }
        </div>
      </section>

      <ng-template #activity let-execution>
        <article class="card activity-card">
          <div class="inline-between">
            <span [class]="'execution-status ' + execution.status">{{
              statusLabel(execution.status)
            }}</span
            ><small>{{ formatDate(execution.updatedAt) }}</small>
          </div>
          <h3>{{ procedureTitle(execution.procedureSlug) }}</h3>
          <p>{{ progressLabel(execution) }}</p>
          <div class="activity-actions">
            @if (execution.status === 'in-progress') {
              <a
                class="button button-primary"
                [routerLink]="['/procedures', execution.procedureSlug, 'run', execution.id]"
                >Continuar</a
              >
            }
            <a
              class="button button-secondary"
              [routerLink]="['/procedure-executions', execution.id]"
              >Detalhes</a
            >
          </div>
        </article>
      </ng-template>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcedureExecutionsPage {
  protected readonly store = inject(GarageStore);
  protected readonly active = computed(() =>
    this.store.procedureExecutions().filter((item) => item.status === 'in-progress'),
  );
  protected readonly previous = computed(() =>
    this.store.procedureExecutions().filter((item) => item.status !== 'in-progress'),
  );

  protected procedureTitle(slug: string): string {
    return this.store.procedures().find((item) => item.slug === slug)?.title ?? slug;
  }
  protected statusLabel(status: ProcedureExecution['status']): string {
    return { 'in-progress': 'Em andamento', completed: 'Concluído', cancelled: 'Cancelado' }[
      status
    ];
  }
  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(value),
    );
  }
  protected progressLabel(execution: ProcedureExecution): string {
    const procedure = this.store.procedures().find((item) => item.slug === execution.procedureSlug);
    if (!procedure) return 'Procedimento indisponível';
    const progress = calculateProcedureProgress(procedure, execution);
    return `${progress.completedRequiredSteps} de ${progress.totalRequiredSteps} etapas obrigatórias · ${progress.percent}%`;
  }
}
