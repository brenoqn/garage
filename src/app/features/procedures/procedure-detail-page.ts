import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProcedureDifficulty } from '../../core/models/procedure.model';
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

        <div class="procedure-layout">
          <div class="procedure-main">
            <section class="safety-card" aria-labelledby="safety-title">
              <span class="safety-icon" aria-hidden="true">!</span>
              <div>
                <h2 id="safety-title">Antes de começar</h2>
                <ul>
                  @for (warning of guide.safetyWarnings; track warning) {
                    <li>{{ warning }}</li>
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
                @for (step of guide.steps; track step.title; let index = $index) {
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
                @for (item of guide.technicalValues; track item.label) {
                  <div>
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <small>Fonte: {{ item.source.label }}</small>
                  </div>
                }
              </div>
              <p class="source-warning compact">
                <span aria-hidden="true">i</span>
                Valores não confirmados nunca devem ser usados como instrução mecânica.
              </p>
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
                  @for (check of guide.finalChecks; track check) {
                    <li><span aria-hidden="true">✓</span>{{ check }}</li>
                  }
                </ul>
              </section>
            </div>
          </div>

          <aside class="procedure-sidebar">
            <section class="card">
              <h2>Ferramentas</h2>
              <ul class="plain-list">
                @for (tool of guide.tools; track tool) {
                  <li><span aria-hidden="true">◇</span>{{ tool }}</li>
                }
              </ul>
            </section>
            <section class="card">
              <h2>Materiais</h2>
              <ul class="plain-list">
                @for (material of guide.materials; track material) {
                  <li><span aria-hidden="true">□</span>{{ material }}</li>
                }
              </ul>
            </section>
            <a
              class="button button-primary button-full"
              routerLink="/maintenance/new"
              [queryParams]="{ procedure: guide.slug }"
            >
              Registrar este serviço
            </a>
          </aside>
        </div>
      } @else {
        <div class="empty-state">
          <span aria-hidden="true">?</span>
          <strong>Procedimento não encontrado</strong>
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

  protected difficultyLabel(difficulty: ProcedureDifficulty): string {
    return { easy: 'Fácil', moderate: 'Moderada', advanced: 'Avançada' }[difficulty];
  }
}
