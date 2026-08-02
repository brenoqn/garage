import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  detectTechnicalConflicts,
  formatTechnicalValue,
  technicalStatusLabel,
  technicalStatusMessage,
} from '../../core/domain/technical-content';
import { selectActiveProcedureExecution } from '../../core/domain/procedure-execution';
import { ProcedureDifficulty, ProcedureRiskLevel } from '../../core/models/procedure.model';
import { TechnicalClaim, TechnicalContentStatus } from '../../core/models/technical-source.model';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-procedure-detail-page',
  imports: [RouterLink],
  template: `
    <div class="page procedure-detail">
      @if (procedure(); as guide) {
        <header class="procedure-hero">
          <a class="back-link" routerLink="/procedures">‹ Todos os procedimentos</a>
          <div class="procedure-hero-content">
            <div>
              <p class="eyebrow">{{ guide.category }}</p>
              <h1>{{ guide.title }}</h1>
              <p>{{ guide.description }}</p>
            </div>
            <div class="guide-facts">
              <span
                ><small>Dificuldade</small
                ><strong>{{ difficultyLabel(guide.difficulty) }}</strong></span
              >
              <span
                ><small>Tempo estimado</small
                ><strong>{{ guide.estimatedMinutes }} min</strong></span
              >
              <span
                ><small>Etapas</small><strong>{{ guide.steps.length }}</strong></span
              >
            </div>
          </div>
        </header>

        <section class="card editorial-summary" aria-labelledby="editorial-title">
          <div>
            <p class="eyebrow">Transparência do conteúdo</p>
            <h2 id="editorial-title">Versão editorial {{ guide.editorialRevision.version }}</h2>
            <p>{{ guide.editorialRevision.summary }}</p>
          </div>
          <dl class="technical-metadata">
            <div>
              <dt>Estado</dt>
              <dd>{{ statusLabel(guide.editorialRevision.status) }}</dd>
            </div>
            <div>
              <dt>Última revisão</dt>
              <dd>{{ guide.editorialRevision.revisedAt }}</dd>
            </div>
            <div>
              <dt>Risco</dt>
              <dd>{{ riskLabel(guide.riskLevel) }}</dd>
            </div>
            <div>
              <dt>Aplicabilidade</dt>
              <dd>{{ applicabilityLabel() }}</dd>
            </div>
            <div>
              <dt>Valores confirmados</dt>
              <dd>{{ confirmedClaimCount() }}</dd>
            </div>
            <div>
              <dt>Valores pendentes</dt>
              <dd>{{ pendingClaimCount() }}</dd>
            </div>
          </dl>
          <p class="risk-note"><strong>Por que este risco:</strong> {{ guide.riskNote }}</p>
          <p><strong>Fontes principais:</strong> {{ primarySourceLabel() }}</p>
          <a class="text-button" routerLink="/technical-sources">Abrir transparência das fontes</a>
        </section>

        @if (activeExecution(); as active) {
          <section class="card active-execution-card">
            <div>
              <p class="eyebrow">Em andamento</p>
              <h2>Continue de onde parou</h2>
              <p>Seu progresso está salvo neste dispositivo.</p>
            </div>
            <a
              class="button button-primary"
              [routerLink]="['/procedures', guide.slug, 'run', active.id]"
              >Continuar execução</a
            >
          </section>
        }

        <div class="procedure-layout">
          <div class="procedure-main">
            <section class="safety-card" aria-labelledby="safety-title">
              <span class="safety-icon" aria-hidden="true">!</span>
              <div>
                <h2 id="safety-title">Antes de começar</h2>
                <ul>
                  @for (warning of guide.safetyWarnings; track warning.id) {
                    <li>{{ warning.text }}</li>
                  }
                </ul>
              </div>
            </section>

            <section class="guide-section" aria-labelledby="steps-title">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Mãos à obra</p>
                  <h2 id="steps-title">Passo a passo</h2>
                </div>
              </div>
              <ol class="step-list">
                @for (step of guide.steps; track step.id; let index = $index) {
                  <li>
                    <span class="step-number">{{ index + 1 }}</span>
                    <div>
                      <h3>{{ step.title }}</h3>
                      <p>{{ step.description }}</p>
                      @if (step.safetyNote) {
                        <small class="step-warning">! {{ step.safetyNote }}</small>
                      }
                    </div>
                  </li>
                }
              </ol>
            </section>

            <section class="guide-section" aria-labelledby="technical-values-title">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Referência</p>
                  <h2 id="technical-values-title">Valores técnicos</h2>
                </div>
              </div>
              <div class="technical-table">
                @for (item of technicalClaims(); track item.id) {
                  <article [class.conflict-card]="claimHasConflict(item.id)">
                    <span>{{ item.label }}</span>
                    <strong>{{ claimValue(item) }}</strong>
                    <small>{{ statusLabel(item.status) }} · {{ statusMessage(item.status) }}</small>
                    <a
                      class="text-button"
                      routerLink="/technical-sources"
                      [fragment]="'claim-' + item.id"
                    >
                      Ver fonte técnica
                    </a>
                  </article>
                }
              </div>
              <p class="source-warning compact">
                <span aria-hidden="true">i</span>Valores não confirmados nunca devem ser usados como
                instrução mecânica.
              </p>
              @if (guide.contentNote) {
                <p class="settings-footnote">{{ guide.contentNote }}</p>
              }
            </section>

            <div class="guide-two-column">
              <section class="card guide-section small">
                <h2>Erros comuns</h2>
                <ul class="check-list mistake-list">
                  @for (mistake of guide.commonMistakes; track mistake) {
                    <li><span aria-hidden="true">×</span>{{ mistake }}</li>
                  }
                </ul>
              </section>
              <section class="card guide-section small">
                <h2>Verificações finais</h2>
                <ul class="check-list">
                  @for (check of guide.finalChecks; track check.id) {
                    <li><span aria-hidden="true">✓</span>{{ check.label }}</li>
                  }
                </ul>
              </section>
            </div>
          </div>

          <aside class="procedure-sidebar">
            <section class="card">
              <h2>Ferramentas</h2>
              <ul class="plain-list">
                @for (tool of guide.tools; track tool.id) {
                  <li><span aria-hidden="true">◇</span>{{ tool.name }}</li>
                }
              </ul>
            </section>
            <section class="card">
              <h2>Materiais</h2>
              <ul class="plain-list">
                @for (material of guide.materials; track material.id) {
                  <li><span aria-hidden="true">□</span>{{ material.name }}</li>
                }
              </ul>
            </section>
            @if (activeExecution(); as active) {
              <a
                class="button button-primary button-full"
                [routerLink]="['/procedures', guide.slug, 'run', active.id]"
                >Continuar execução</a
              >
            } @else {
              <a
                class="button button-primary button-full"
                [routerLink]="['/procedures', guide.slug, 'prepare']"
                >Começar procedimento</a
              >
            }
            <a class="button button-secondary button-full" routerLink="/procedure-executions"
              >Ver atividades</a
            >
          </aside>
        </div>
      } @else {
        <div class="empty-state">
          <span aria-hidden="true">?</span><strong>Procedimento não encontrado</strong>
          <p>Este guia não existe ou ainda não está disponível.</p>
          <a class="button button-primary" routerLink="/procedures">Ver todos os guias</a>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcedureDetailPage {
  private readonly store = inject(GarageStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly procedure = computed(() =>
    this.store
      .procedures()
      .find((candidate) => candidate.slug === this.route.snapshot.paramMap.get('slug')),
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
  protected readonly technicalClaims = computed(() => {
    const procedure = this.procedure();
    if (!procedure) return [];
    const claimById = new Map(this.store.technicalClaims().map((claim) => [claim.id, claim]));
    return procedure.technicalClaimIds.flatMap((claimId) => {
      const claim = claimById.get(claimId);
      return claim ? [claim] : [];
    });
  });
  private readonly conflicts = computed(() =>
    detectTechnicalConflicts(this.store.technicalClaims()),
  );
  protected readonly confirmedClaimCount = computed(
    () => this.technicalClaims().filter((claim) => claim.status === 'confirmed').length,
  );
  protected readonly pendingClaimCount = computed(
    () => this.technicalClaims().filter((claim) => claim.status !== 'confirmed').length,
  );
  protected difficultyLabel(difficulty: ProcedureDifficulty): string {
    return { easy: 'Fácil', moderate: 'Moderada', advanced: 'Avançada' }[difficulty];
  }

  protected riskLabel(risk: ProcedureRiskLevel): string {
    return { low: 'Baixo', moderate: 'Moderado', high: 'Alto', critical: 'Crítico' }[risk];
  }

  protected statusLabel(status: TechnicalContentStatus): string {
    return technicalStatusLabel(status);
  }

  protected statusMessage(status: TechnicalContentStatus): string {
    return technicalStatusMessage(status);
  }

  protected claimValue(claim: TechnicalClaim): string {
    return formatTechnicalValue(claim.value);
  }

  protected claimHasConflict(claimId: string): boolean {
    return this.conflicts().some((conflict) => conflict.claimIds.includes(claimId));
  }

  protected applicabilityLabel(): string {
    const applicability = this.procedure()?.applicability;
    return applicability?.confirmation === 'confirmed'
      ? 'Definida editorialmente'
      : 'Ano, mercado e variante a confirmar';
  }

  protected primarySourceLabel(): string {
    const procedure = this.procedure();
    if (!procedure) return 'Nenhuma';
    const sourceById = new Map(this.store.technicalSources().map((source) => [source.id, source]));
    return procedure.primarySourceIds
      .map((sourceId) => sourceById.get(sourceId)?.title ?? sourceId)
      .join('; ');
  }
}
