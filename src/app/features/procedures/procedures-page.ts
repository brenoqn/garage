import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProcedureDifficulty } from '../../core/models/procedure.model';
import { GarageStore } from '../../core/services/garage-store.service';

type DifficultyFilter = 'all' | ProcedureDifficulty;

@Component({
  selector: 'app-procedures-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Aprenda fazendo</p>
          <h1>Procedimentos</h1>
          <p>Guias claros para cuidar da sua Honda NX200, com progresso salvo localmente.</p>
        </div>
      </header>
      @if (store.activeProcedureExecutions().length) {
        <section class="card active-execution-card">
          <div>
            <p class="eyebrow">Em andamento</p>
            <h2>Continue na oficina</h2>
            <p>{{ store.activeProcedureExecutions().length }} atividade(s) com progresso salvo.</p>
          </div>
          <a class="button button-primary" routerLink="/procedure-executions">Continuar</a>
        </section>
      }
      <section class="search-panel" aria-label="Buscar procedimentos">
        <label class="search-field" for="procedure-search"
          ><span aria-hidden="true">⌕</span
          ><input
            id="procedure-search"
            type="search"
            placeholder="Buscar por título, categoria ou ferramenta"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
        /></label>
        <div class="filter-row">
          <label
            ><span>Categoria</span
            ><select [ngModel]="category()" (ngModelChange)="category.set($event)">
              <option value="all">Todas</option>
              @for (option of categories(); track option) {
                <option [value]="option">{{ option }}</option>
              }
            </select></label
          >
          <label
            ><span>Dificuldade</span
            ><select [ngModel]="difficulty()" (ngModelChange)="difficulty.set($event)">
              <option value="all">Todas</option>
              <option value="easy">Fácil</option>
              <option value="moderate">Moderada</option>
              <option value="advanced">Avançada</option>
            </select></label
          >
        </div>
      </section>
      <div class="results-heading">
        <span>{{ filteredProcedures().length }} procedimentos</span>
        @if (hasFilters()) {
          <button type="button" (click)="clearFilters()">Limpar filtros</button>
        }
      </div>
      <section class="procedure-grid" aria-label="Lista de procedimentos">
        @for (procedure of filteredProcedures(); track procedure.slug) {
          <a class="card procedure-card" [routerLink]="['/procedures', procedure.slug]">
            <div class="procedure-card-top">
              <span class="procedure-icon" aria-hidden="true">{{
                categoryIcon(procedure.category)
              }}</span
              ><span [class]="'difficulty difficulty-' + procedure.difficulty">{{
                difficultyLabel(procedure.difficulty)
              }}</span>
            </div>
            <span class="card-label">{{ procedure.category }}</span>
            <h2>{{ procedure.title }}</h2>
            <p>{{ procedure.description }}</p>
            <div class="procedure-meta">
              <span>◷ {{ procedure.estimatedMinutes }} min</span
              ><span>{{ procedure.steps.length }} etapas</span><strong aria-hidden="true">›</strong>
            </div>
          </a>
        } @empty {
          <div class="empty-state grid-full">
            <span aria-hidden="true">⌕</span><strong>Nenhum guia encontrado</strong>
            <p>Tente usar uma busca mais curta ou remover os filtros.</p>
            <button class="button button-secondary" type="button" (click)="clearFilters()">
              Limpar filtros
            </button>
          </div>
        }
      </section>
      <a class="history-banner" routerLink="/procedure-executions"
        ><span aria-hidden="true">☷</span
        ><span
          ><strong>Atividades de procedimentos</strong
          ><small>Em andamento, concluídas e canceladas</small></span
        ><span aria-hidden="true">›</span></a
      >
      <div class="safety-banner">
        <span aria-hidden="true">△</span>
        <div>
          <strong>Segurança vem antes do passo a passo</strong>
          <p>
            Pare se encontrar condições diferentes das descritas ou não tiver a ferramenta adequada.
          </p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProceduresPage {
  protected readonly store = inject(GarageStore);
  protected readonly query = signal('');
  protected readonly category = signal('all');
  protected readonly difficulty = signal<DifficultyFilter>('all');
  protected readonly categories = computed(() =>
    [...new Set(this.store.procedures().map((procedure) => procedure.category))].sort(),
  );
  protected readonly hasFilters = computed(
    () => this.query().trim() !== '' || this.category() !== 'all' || this.difficulty() !== 'all',
  );
  protected readonly filteredProcedures = computed(() => {
    const search = this.normalize(this.query());
    return this.store.procedures().filter((procedure) => {
      const haystack = this.normalize(
        [
          procedure.title,
          procedure.category,
          procedure.description,
          ...procedure.tools.map((item) => item.name),
          ...procedure.materials.map((item) => item.name),
        ].join(' '),
      );
      return (
        (!search || haystack.includes(search)) &&
        (this.category() === 'all' || procedure.category === this.category()) &&
        (this.difficulty() === 'all' || procedure.difficulty === this.difficulty())
      );
    });
  });
  protected clearFilters(): void {
    this.query.set('');
    this.category.set('all');
    this.difficulty.set('all');
  }
  protected difficultyLabel(difficulty: ProcedureDifficulty): string {
    return { easy: 'Fácil', moderate: 'Moderada', advanced: 'Avançada' }[difficulty];
  }
  protected categoryIcon(category: string): string {
    return (
      { Motor: '●', Transmissão: '⛓', Elétrica: 'ϟ', Comandos: '⌁', Freios: '◉' }[category] ?? '◇'
    );
  }
  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replaceAll(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR');
  }
}
