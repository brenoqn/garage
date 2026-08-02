import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  calculateProcedureProgress,
  canFinishProcedure,
} from '../../core/domain/procedure-execution';
import { technicalStatusLabel } from '../../core/domain/technical-content';
import { ProcedureStep } from '../../core/models/procedure.model';
import { GarageStore } from '../../core/services/garage-store.service';
import { ScreenWakeLockService } from '../../core/services/screen-wake-lock.service';

@Component({
  selector: 'app-procedure-run-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div [class]="workshopMode() ? 'procedure-run workshop-mode' : 'page procedure-run'">
      @if (procedure(); as guide) {
        @if (execution(); as run) {
          @if (routeIsValid()) {
            <header class="run-header">
              <div>
                <p class="eyebrow">
                  {{ run.status === 'in-progress' ? 'Modo execução' : 'Atividade' }}
                </p>
                <h1>{{ guide.title }}</h1>
              </div>
              @if (run.status === 'in-progress') {
                <button
                  class="button button-secondary"
                  type="button"
                  (click)="toggleWorkshopMode()"
                >
                  {{ workshopMode() ? 'Sair do modo oficina' : 'Modo oficina' }}
                </button>
              }
            </header>

            <div class="run-technical-reference">
              <span>
                Conteúdo {{ editorialStatusLabel(guide.editorialRevision.status) }} · versão
                {{ guide.editorialRevision.version }}
              </span>
              <a class="text-button" routerLink="/technical-sources">Ver fonte técnica</a>
            </div>

            <section
              class="run-progress"
              aria-labelledby="progress-title"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-valuenow]="progress().percent"
            >
              <div class="inline-between">
                <strong id="progress-title">Progresso obrigatório</strong>
                <span>{{ progress().percent }}%</span>
              </div>
              <div class="progress-track" aria-hidden="true">
                <span [style.width.%]="progress().percent"></span>
              </div>
              <p aria-live="polite">
                {{ progress().completedRequiredSteps }} de
                {{ progress().totalRequiredSteps }} etapas obrigatórias
                @if (progress().totalOptionalSteps) {
                  · {{ progress().completedOptionalSteps }} opcionais concluídas
                }
              </p>
            </section>

            @if (run.status === 'completed') {
              <section class="card completion-card" role="status">
                <span class="completion-symbol" aria-hidden="true">✓</span>
                <div>
                  <p class="eyebrow">Concluído</p>
                  <h2>Procedimento finalizado</h2>
                  <p>
                    A atividade foi salva. Registrar uma manutenção é opcional e requer sua
                    confirmação.
                  </p>
                </div>
                @if (run.resultingServiceRecordId) {
                  <a class="button button-secondary" routerLink="/maintenance/history"
                    >Ver serviço registrado</a
                  >
                } @else {
                  <a
                    class="button button-primary"
                    routerLink="/maintenance/new"
                    [queryParams]="{ procedure: guide.slug, execution: run.id }"
                    >Registrar manutenção</a
                  >
                }
                <a class="text-button" [routerLink]="['/procedure-executions', run.id]"
                  >Ver detalhes da atividade</a
                >
              </section>
            } @else if (run.status === 'cancelled') {
              <section class="card completion-card">
                <h2>Execução cancelada</h2>
                <p>O progresso foi mantido no histórico como atividade cancelada.</p>
                <a
                  class="button button-primary"
                  [routerLink]="['/procedures', guide.slug, 'prepare']"
                >
                  Iniciar uma nova execução
                </a>
              </section>
            } @else {
              <div class="run-layout">
                <main>
                  @if (currentStep(); as step) {
                    <article class="card current-step">
                      <div class="step-kicker">
                        <span>Etapa {{ stepNumber(step) }} de {{ guide.steps.length }}</span>
                        <span>{{ step.required ? 'Obrigatória' : 'Opcional' }}</span>
                      </div>
                      <h2 tabindex="-1">{{ step.title }}</h2>
                      <p>{{ step.description }}</p>
                      @if (step.safetyNote) {
                        <p class="step-warning">! {{ step.safetyNote }}</p>
                      }

                      <div class="manual-timer" aria-live="polite">
                        <div>
                          <small>Temporizador manual</small><strong>{{ timerLabel() }}</strong>
                        </div>
                        @if (!timerEndsAt() && timerPausedRemainingMs() === null) {
                          <label>
                            <span class="visually-hidden">Minutos do temporizador</span>
                            <input
                              type="number"
                              min="1"
                              max="240"
                              step="1"
                              inputmode="numeric"
                              [formControl]="timerMinutesControl"
                            />
                          </label>
                          <button
                            class="button button-secondary"
                            type="button"
                            [disabled]="timerMinutesControl.invalid"
                            (click)="startTimer()"
                          >
                            Iniciar
                          </button>
                        } @else {
                          <button
                            class="button button-secondary"
                            type="button"
                            (click)="toggleTimerPause()"
                          >
                            {{ timerEndsAt() ? 'Pausar' : 'Continuar' }}
                          </button>
                          <button class="text-button" type="button" (click)="cancelTimer()">
                            Cancelar
                          </button>
                        }
                      </div>

                      <div class="step-actions">
                        <button
                          class="button button-secondary"
                          type="button"
                          [disabled]="!lastCompletedStepId()"
                          (click)="backStep()"
                        >
                          Voltar etapa
                        </button>
                        @if (!step.required) {
                          <button
                            class="button button-secondary"
                            type="button"
                            (click)="skip(step.id)"
                          >
                            Pular opcional
                          </button>
                        }
                        <button
                          class="button button-primary"
                          type="button"
                          (click)="complete(step.id)"
                        >
                          Marcar como concluída
                        </button>
                      </div>
                    </article>
                  } @else {
                    <section class="card final-checks" aria-labelledby="final-checks-title">
                      <p class="eyebrow">Antes de finalizar</p>
                      <h2 id="final-checks-title">Verificações finais</h2>
                      <p class="settings-footnote">
                        Duração aproximada desde o início: {{ durationLabel(run.startedAt) }}.
                      </p>
                      @for (check of guide.finalChecks; track check.id) {
                        <label class="confirmation-check">
                          <input
                            type="checkbox"
                            [checked]="run.completedFinalCheckIds.includes(check.id)"
                            (change)="toggleFinalCheck(check.id, $event)"
                          />
                          <span
                            >{{ check.label }}
                            @if (!check.required) {
                              (opcional)
                            }
                          </span>
                        </label>
                      }
                      @if (guide.riskLevel === 'high' || guide.riskLevel === 'critical') {
                        <p class="source-warning compact">
                          Checklist concluído não significa validação técnica nem certifica a
                          segurança mecânica do sistema.
                        </p>
                      }
                      <details class="relevant-warnings">
                        <summary>Rever alertas de segurança</summary>
                        <ul>
                          @for (warning of guide.safetyWarnings; track warning.id) {
                            <li>{{ warning.text }}</li>
                          }
                        </ul>
                      </details>
                      <label class="form-field" for="execution-note">
                        <span>Observação da execução (opcional)</span>
                        <textarea
                          id="execution-note"
                          rows="3"
                          [formControl]="noteControl"
                        ></textarea>
                      </label>
                      <button
                        class="button button-primary button-full"
                        type="button"
                        [disabled]="!canFinish()"
                        (click)="finish()"
                      >
                        Concluir procedimento
                      </button>
                    </section>
                  }

                  @if (message()) {
                    <p class="field-error import-message" role="alert">{{ message() }}</p>
                  }
                </main>

                <aside class="card run-sidebar">
                  <h2>Etapas</h2>
                  <ol class="run-step-list">
                    @for (step of guide.steps; track step.id; let index = $index) {
                      <li
                        [class.completed]="run.completedStepIds.includes(step.id)"
                        [class.current]="step.id === currentStep()?.id"
                        [attr.aria-current]="step.id === currentStep()?.id ? 'step' : null"
                      >
                        <span>{{ run.completedStepIds.includes(step.id) ? '✓' : index + 1 }}</span>
                        <div>
                          <strong>{{ step.title }}</strong
                          ><small>{{ step.required ? 'Obrigatória' : 'Opcional' }}</small>
                        </div>
                        @if (run.completedStepIds.includes(step.id)) {
                          <button
                            type="button"
                            (click)="uncomplete(step.id)"
                            [attr.aria-label]="'Desmarcar ' + step.title"
                          >
                            Desmarcar
                          </button>
                        }
                      </li>
                    }
                  </ol>
                  <details class="run-resources">
                    <summary>Ferramentas e materiais</summary>
                    <h3>Ferramentas</h3>
                    <ul>
                      @for (tool of guide.tools; track tool.id) {
                        <li>{{ tool.name }}</li>
                      }
                    </ul>
                    <h3>Materiais</h3>
                    <ul>
                      @for (material of guide.materials; track material.id) {
                        <li>{{ material.name }}</li>
                      }
                    </ul>
                  </details>
                  <div class="run-secondary-actions">
                    <button class="text-button" type="button" (click)="pause()">
                      Pausar e sair
                    </button>
                    <button
                      class="text-button danger-text"
                      type="button"
                      (click)="confirmCancel.set(true)"
                    >
                      Cancelar execução
                    </button>
                    <button class="text-button" type="button" (click)="confirmRestart.set(true)">
                      Reiniciar do zero
                    </button>
                  </div>
                </aside>
              </div>
            }

            @if (confirmCancel()) {
              <div class="dialog-backdrop" role="presentation">
                <section
                  class="confirm-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="cancel-title"
                >
                  <h2 id="cancel-title">Cancelar esta execução?</h2>
                  <p>Ela sairá da lista de atividades em andamento, mas continuará no histórico.</p>
                  <div>
                    <button
                      class="button button-secondary"
                      type="button"
                      (click)="confirmCancel.set(false)"
                    >
                      Voltar</button
                    ><button class="button button-danger" type="button" (click)="cancel()">
                      Cancelar execução
                    </button>
                  </div>
                </section>
              </div>
            }
            @if (confirmRestart()) {
              <div class="dialog-backdrop" role="presentation">
                <section
                  class="confirm-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="restart-title"
                >
                  <h2 id="restart-title">Reiniciar do zero?</h2>
                  <p>
                    Esta execução será marcada como cancelada e uma nova será criada sem progresso.
                  </p>
                  <div>
                    <button
                      class="button button-secondary"
                      type="button"
                      (click)="confirmRestart.set(false)"
                    >
                      Voltar</button
                    ><button class="button button-danger" type="button" (click)="restart()">
                      Reiniciar
                    </button>
                  </div>
                </section>
              </div>
            }
          } @else {
            <div class="empty-state">
              <strong>Esta execução não pertence ao procedimento informado.</strong
              ><a routerLink="/procedure-executions">Ver atividades</a>
            </div>
          }
        } @else {
          <div class="empty-state">
            <strong>Execução não encontrada</strong
            ><a routerLink="/procedure-executions">Ver atividades</a>
          </div>
        }
      } @else {
        <div class="empty-state">
          <strong>Procedimento não encontrado</strong><a routerLink="/procedures">Ver guias</a>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcedureRunPage implements OnDestroy {
  protected readonly editorialStatusLabel = technicalStatusLabel;
  protected readonly store = inject(GarageStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly wakeLock = inject(ScreenWakeLockService);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private timerHandle: ReturnType<typeof setInterval> | undefined;
  protected readonly workshopMode = signal(false);
  protected readonly confirmCancel = signal(false);
  protected readonly confirmRestart = signal(false);
  protected readonly message = signal('');
  protected readonly timerEndsAt = signal<number | null>(null);
  protected readonly timerPausedRemainingMs = signal<number | null>(null);
  private readonly timerNow = signal(Date.now());
  protected readonly noteControl = new FormControl('', { nonNullable: true });
  protected readonly timerMinutesControl = new FormControl(5, {
    nonNullable: true,
    validators: [
      Validators.required,
      Validators.min(1),
      Validators.max(240),
      Validators.pattern(/^\d+$/),
    ],
  });
  protected readonly procedure = computed(() =>
    this.store.procedures().find((item) => item.slug === this.route.snapshot.paramMap.get('slug')),
  );
  protected readonly execution = computed(() =>
    this.store
      .procedureExecutions()
      .find((item) => item.id === this.route.snapshot.paramMap.get('executionId')),
  );
  protected readonly routeIsValid = computed(
    () => this.execution()?.procedureSlug === this.procedure()?.slug,
  );
  protected readonly progress = computed(() => {
    const procedure = this.procedure();
    const execution = this.execution();
    return procedure && execution
      ? calculateProcedureProgress(procedure, execution)
      : {
          completedRequiredSteps: 0,
          totalRequiredSteps: 0,
          completedOptionalSteps: 0,
          totalOptionalSteps: 0,
          percent: 0,
        };
  });
  protected readonly currentStep = computed(() => {
    const procedure = this.procedure();
    const execution = this.execution();
    if (!procedure || !execution || execution.status !== 'in-progress') return undefined;
    const completed = new Set(execution.completedStepIds);
    return (
      procedure.steps.find(
        (step) => step.id === execution.currentStepId && !completed.has(step.id),
      ) ?? procedure.steps.find((step) => !completed.has(step.id))
    );
  });
  protected readonly canFinish = computed(() => {
    const procedure = this.procedure();
    const execution = this.execution();
    return !!procedure && !!execution && canFinishProcedure(procedure, execution);
  });
  protected readonly lastCompletedStepId = computed(() => {
    const procedure = this.procedure();
    const execution = this.execution();
    return procedure && execution
      ? [...procedure.steps].reverse().find((step) => execution.completedStepIds.includes(step.id))
          ?.id
      : undefined;
  });
  protected readonly timerLabel = computed(() => {
    const remaining =
      this.timerPausedRemainingMs() ??
      (this.timerEndsAt() ? Math.max(0, this.timerEndsAt()! - this.timerNow()) : 0);
    const seconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  });

  protected stepNumber(step: ProcedureStep): number {
    return (this.procedure()?.steps.indexOf(step) ?? 0) + 1;
  }

  protected complete(stepId: string): void {
    const result = this.store.completeProcedureStep(this.execution()?.id ?? '', stepId);
    this.apply(result);
    if (result.ok) {
      this.cancelTimer();
      this.focusCurrentStep();
    }
  }
  protected uncomplete(stepId: string): void {
    this.apply(this.store.uncompleteProcedureStep(this.execution()?.id ?? '', stepId));
  }
  protected skip(stepId: string): void {
    const result = this.store.skipOptionalProcedureStep(this.execution()?.id ?? '', stepId);
    this.apply(result);
    if (result.ok) {
      this.cancelTimer();
      this.focusCurrentStep();
    }
  }
  protected backStep(): void {
    const stepId = this.lastCompletedStepId();
    if (stepId) {
      this.uncomplete(stepId);
      this.focusCurrentStep();
    }
  }
  protected toggleFinalCheck(checkId: string, event: Event): void {
    this.apply(
      this.store.setProcedureFinalCheck(
        this.execution()?.id ?? '',
        checkId,
        (event.target as HTMLInputElement).checked,
      ),
    );
  }
  protected finish(): void {
    const result = this.store.finishProcedure(this.execution()?.id ?? '', this.noteControl.value);
    this.apply(result);
    if (result.ok) {
      void this.wakeLock.release();
      this.workshopMode.set(false);
    }
  }
  protected cancel(): void {
    const result = this.store.cancelProcedure(this.execution()?.id ?? '');
    this.apply(result);
    if (result.ok) {
      this.confirmCancel.set(false);
      void this.wakeLock.release();
      this.workshopMode.set(false);
    }
  }
  protected restart(): void {
    const result = this.store.restartProcedure(this.execution()?.id ?? '');
    this.confirmRestart.set(false);
    if (!result.ok) {
      this.message.set(result.error);
      return;
    }
    void this.router.navigate([
      '/procedures',
      result.execution.procedureSlug,
      'run',
      result.execution.id,
    ]);
  }
  protected pause(): void {
    void this.wakeLock.release();
    void this.router.navigate(['/procedures', this.procedure()?.slug]);
  }
  protected async toggleWorkshopMode(): Promise<void> {
    if (this.workshopMode()) {
      await this.wakeLock.release();
      this.workshopMode.set(false);
      return;
    }
    this.workshopMode.set(true);
    await this.wakeLock.request();
  }
  protected startTimer(): void {
    if (this.timerMinutesControl.invalid) return;
    this.timerPausedRemainingMs.set(null);
    this.timerEndsAt.set(Date.now() + this.timerMinutesControl.getRawValue() * 60_000);
    this.timerNow.set(Date.now());
    this.startTimerTicks();
  }
  protected toggleTimerPause(): void {
    const endsAt = this.timerEndsAt();
    if (endsAt) {
      this.timerPausedRemainingMs.set(Math.max(0, endsAt - Date.now()));
      this.timerEndsAt.set(null);
      this.clearTimerTicks();
      return;
    }
    const remaining = this.timerPausedRemainingMs();
    if (remaining !== null) {
      this.timerPausedRemainingMs.set(null);
      this.timerEndsAt.set(Date.now() + remaining);
      this.startTimerTicks();
    }
  }
  protected cancelTimer(): void {
    this.clearTimerTicks();
    this.timerEndsAt.set(null);
    this.timerPausedRemainingMs.set(null);
    this.timerNow.set(Date.now());
  }

  ngOnDestroy(): void {
    this.cancelTimer();
    void this.wakeLock.release();
  }

  private apply(result: ReturnType<GarageStore['completeProcedureStep']>): void {
    this.message.set(result.ok ? '' : result.error);
  }
  protected durationLabel(startedAt: string): string {
    const minutes = Math.max(1, Math.round((Date.now() - Date.parse(startedAt)) / 60_000));
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  }
  private startTimerTicks(): void {
    this.clearTimerTicks();
    this.timerHandle = setInterval(() => {
      this.timerNow.set(Date.now());
      if (this.timerEndsAt() && this.timerEndsAt()! <= Date.now()) {
        this.clearTimerTicks();
        this.timerEndsAt.set(null);
      }
    }, 1000);
  }
  private clearTimerTicks(): void {
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.timerHandle = undefined;
  }
  private focusCurrentStep(): void {
    queueMicrotask(() =>
      this.element.nativeElement.querySelector<HTMLElement>('.current-step h2')?.focus(),
    );
  }
}
