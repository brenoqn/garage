import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  procedureNeedsEnhancedWarning,
  technicalStatusLabel,
} from '../../core/domain/technical-content';
import { selectActiveProcedureExecution } from '../../core/domain/procedure-execution';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-procedure-prepare-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page page-narrow">
      @if (procedure(); as guide) {
        <header class="page-heading">
          <div>
            <a class="back-link" [routerLink]="['/procedures', guide.slug]">‹ Voltar ao guia</a>
            <p class="eyebrow">Preparação</p>
            <h1>{{ guide.title }}</h1>
            <p>Confira o ambiente, reúna os itens e reconheça cada alerta antes de começar.</p>
          </div>
        </header>

        <section
          class="card editorial-summary compact"
          aria-label="Estado editorial do procedimento"
        >
          <div class="technical-claim-heading">
            <div>
              <p class="eyebrow">Conteúdo versão {{ guide.editorialRevision.version }}</p>
              <h2>{{ statusLabel() }}</h2>
            </div>
            <span class="editorial-badge" [attr.data-status]="guide.editorialRevision.status">
              {{ statusLabel() }}
            </span>
          </div>
          <p>{{ guide.editorialRevision.summary }}</p>
          <p>
            <strong>Aplicabilidade:</strong> ano, mercado e variante ainda precisam ser confirmados.
          </p>
          <p>
            <strong>Valores:</strong> {{ confirmedClaimCount() }} confirmados ·
            {{ pendingClaimCount() }} pendentes.
          </p>
          <a class="text-button" routerLink="/technical-sources">Ver fontes técnicas</a>
        </section>

        @if (!store.setup().completed || store.recovery()) {
          <section class="recovery-banner" role="alert">
            <div>
              <strong>O procedimento ainda não pode ser iniciado</strong>
              <p>
                {{
                  store.recovery()
                    ? 'Resolva a recuperação dos dados locais para preservar o histórico.'
                    : 'Conclua a configuração da sua Honda NX200 primeiro.'
                }}
              </p>
            </div>
            <a
              class="button button-primary"
              [routerLink]="store.recovery() ? '/settings' : '/motorcycle'"
            >
              Resolver agora
            </a>
          </section>
        }

        @if (activeExecution(); as active) {
          <section class="card active-execution-card" aria-labelledby="resume-title">
            <div>
              <p class="eyebrow">Em andamento</p>
              <h2 id="resume-title">Você já começou este procedimento</h2>
              <p>O progresso salvo será preservado.</p>
            </div>
            <a
              class="button button-primary"
              [routerLink]="['/procedures', guide.slug, 'run', active.id]"
            >
              Continuar execução
            </a>
          </section>
        } @else {
          <section class="card preparation-card" aria-labelledby="resources-title">
            <h2 id="resources-title">Separe antes de começar</h2>
            <div class="preparation-columns">
              <div>
                <h3>Ferramentas</h3>
                <ul class="plain-list">
                  @for (tool of guide.tools; track tool.id) {
                    <li>□ {{ tool.name }}</li>
                  }
                </ul>
              </div>
              <div>
                <h3>Materiais</h3>
                <ul class="plain-list">
                  @for (material of guide.materials; track material.id) {
                    <li>□ {{ material.name }}</li>
                  }
                </ul>
              </div>
            </div>
          </section>

          @if (guide.difficulty === 'advanced') {
            <section class="safety-card" role="note">
              <span class="safety-icon" aria-hidden="true">!</span>
              <div>
                <h2>Procedimento avançado</h2>
                <p>
                  Este guia orienta uma inspeção demonstrativa e não certifica a segurança do
                  sistema. Procure avaliação profissional se houver dúvida.
                </p>
              </div>
            </section>
          }

          @if (needsEnhancedWarning()) {
            <section class="safety-card critical-content-warning" role="alert">
              <span class="safety-icon" aria-hidden="true">!</span>
              <div>
                <h2>
                  Risco {{ guide.riskLevel === 'critical' ? 'crítico' : 'alto' }} com conteúdo
                  pendente
                </h2>
                <p>{{ guide.riskNote }}</p>
                <p>
                  O checklist serve somente como apoio educacional. A conclusão não certifica a
                  segurança ou a correção mecânica da motocicleta.
                </p>
              </div>
            </section>
          }

          @if (hasPendingTechnicalValues()) {
            <p class="source-warning compact" role="note">
              <span aria-hidden="true">i</span>
              Há valores técnicos marcados como “A confirmar”. Eles não devem ser usados como
              instrução mecânica.
            </p>
          }

          <form class="card preparation-card" [formGroup]="warningControls" (ngSubmit)="start()">
            <fieldset>
              <legend>Confirme os alertas de segurança</legend>
              @for (warning of guide.safetyWarnings; track warning.id) {
                <label class="confirmation-check">
                  <input type="checkbox" [formControlName]="warning.id" />
                  <span>{{ warning.text }}</span>
                </label>
              }
            </fieldset>
            @if (message()) {
              <p class="field-error" role="alert">{{ message() }}</p>
            }
            <div class="form-actions">
              <a class="button button-secondary" [routerLink]="['/procedures', guide.slug]"
                >Cancelar</a
              >
              <button class="button button-primary" type="submit" [disabled]="!canStart()">
                Iniciar procedimento
              </button>
            </div>
          </form>
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
export class ProcedurePreparePage {
  protected readonly store = inject(GarageStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly message = signal('');
  protected readonly procedure = computed(() =>
    this.store.procedures().find((item) => item.slug === this.route.snapshot.paramMap.get('slug')),
  );
  protected readonly activeExecution = computed(() => {
    const procedure = this.procedure();
    return procedure
      ? selectActiveProcedureExecution(
          this.store.procedureExecutions(),
          this.store.motorcycle().id,
          procedure.slug,
        )
      : undefined;
  });
  protected readonly warningControls = new FormRecord<FormControl<boolean>>({});
  protected readonly technicalClaims = computed(() => {
    const procedure = this.procedure();
    if (!procedure) return [];
    const byId = new Map(this.store.technicalClaims().map((claim) => [claim.id, claim]));
    return procedure.technicalClaimIds.flatMap((claimId) => {
      const claim = byId.get(claimId);
      return claim ? [claim] : [];
    });
  });
  protected readonly hasPendingTechnicalValues = computed(() =>
    this.technicalClaims().some((claim) => claim.status !== 'confirmed'),
  );
  protected readonly confirmedClaimCount = computed(
    () => this.technicalClaims().filter((claim) => claim.status === 'confirmed').length,
  );
  protected readonly pendingClaimCount = computed(
    () => this.technicalClaims().filter((claim) => claim.status !== 'confirmed').length,
  );
  protected readonly needsEnhancedWarning = computed(() =>
    this.procedure()
      ? procedureNeedsEnhancedWarning(this.procedure()!.riskLevel, this.technicalClaims())
      : false,
  );

  constructor() {
    for (const warning of this.procedure()?.safetyWarnings ?? []) {
      this.warningControls.addControl(warning.id, new FormControl(false, { nonNullable: true }));
    }
  }

  protected start(): void {
    const procedure = this.procedure();
    if (!procedure || !this.canStart()) return;
    const values = this.warningControls.getRawValue();
    const result = this.store.startProcedure(
      procedure.slug,
      procedure.safetyWarnings.filter((warning) => values[warning.id]).map((warning) => warning.id),
    );
    if (!result.ok) {
      this.message.set(result.error);
      return;
    }
    void this.router.navigate(['/procedures', procedure.slug, 'run', result.execution.id]);
  }

  protected canStart(): boolean {
    return (
      this.store.setup().completed &&
      !this.store.recovery() &&
      !this.activeExecution() &&
      Object.values(this.warningControls.getRawValue()).every(Boolean)
    );
  }

  protected statusLabel(): string {
    return technicalStatusLabel(this.procedure()?.editorialRevision.status ?? 'demonstrative');
  }
}
