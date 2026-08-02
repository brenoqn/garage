import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SafetyCheckItemStatus } from '../../core/models/safety-check.model';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-safety-check-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page page-narrow safety-page">
      <header class="page-heading">
        <div>
          <a class="back-link" routerLink="/dashboard">‹ Início</a>
          <p class="eyebrow">Antes de rodar</p>
          <h1>Checklist de segurança</h1>
          <p>
            Leva poucos minutos. Marque o que você observou, sem interpretar além do que consegue
            verificar.
          </p>
        </div>
      </header>

      <section class="inline-alert warning" role="note">
        <span aria-hidden="true">!</span>
        <div>
          <strong>Encontrou algo anormal?</strong>
          <p>
            Não rode até corrigir o problema. Se não souber resolver com segurança, procure um
            profissional. Concluir este checklist não certifica a moto.
          </p>
        </div>
      </section>

      <div class="check-progress" aria-live="polite">
        <div class="inline-between">
          <strong>{{ completedCount() }} de {{ store.safetyChecklist().length }}</strong
          ><span>itens observados</span>
        </div>
        <div class="progress-track"><span [style.width.%]="progressPercent()"></span></div>
      </div>

      <form (ngSubmit)="save()">
        <ol class="safety-check-list">
          @for (item of store.safetyChecklist(); track item.id; let index = $index) {
            <li class="card safety-check-item" [class.has-issue]="responseFor(item.id) === 'issue'">
              <div class="safety-item-copy">
                <span>{{ index + 1 }}</span>
                <div>
                  <h2>{{ item.title }}</h2>
                  <p>{{ item.description }}</p>
                  <small
                    >Manual do Proprietário Honda NX200 · pág. {{ item.page }} ·
                    {{ item.section }}</small
                  >
                </div>
              </div>
              <div class="safety-choice" role="group" [attr.aria-label]="item.title">
                <button
                  type="button"
                  [attr.aria-pressed]="responseFor(item.id) === 'ok'"
                  (click)="setResponse(item.id, 'ok')"
                >
                  <span aria-hidden="true">✓</span> Sem anormalidade
                </button>
                <button
                  type="button"
                  [attr.aria-pressed]="responseFor(item.id) === 'issue'"
                  (click)="setResponse(item.id, 'issue')"
                >
                  <span aria-hidden="true">!</span> Encontrei algo
                </button>
              </div>
            </li>
          }
        </ol>
        @if (hasIssues()) {
          <section class="inline-alert danger" role="alert">
            <span aria-hidden="true">!</span>
            <div>
              <strong>Não rode ainda</strong>
              <p>
                Há {{ issueCount() }} item(ns) marcado(s) com problema. Registre o que encontrou e
                procure ajuda se necessário.
              </p>
              <a routerLink="/occurrences/new">Registrar ocorrência</a>
            </div>
          </section>
        }
        <div class="form-field">
          <label for="safety-notes">Observação (opcional)</label
          ><textarea
            id="safety-notes"
            rows="3"
            maxlength="500"
            [(ngModel)]="notes"
            name="notes"
          ></textarea>
        </div>
        @if (message()) {
          <p class="field-error" role="alert">{{ message() }}</p>
        }
        <div class="sticky-form-actions safety-submit">
          <a class="button button-secondary" routerLink="/dashboard">Sair</a
          ><button
            class="button button-primary"
            type="submit"
            [disabled]="completedCount() !== store.safetyChecklist().length"
          >
            Salvar inspeção
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SafetyCheckPage {
  protected readonly store = inject(GarageStore);
  private readonly router = inject(Router);
  private readonly responses = signal<Readonly<Record<string, SafetyCheckItemStatus>>>({});
  protected readonly message = signal('');
  protected notes = '';
  protected readonly completedCount = computed(() => Object.keys(this.responses()).length);
  protected readonly issueCount = computed(
    () => Object.values(this.responses()).filter((value) => value === 'issue').length,
  );
  protected readonly hasIssues = computed(() => this.issueCount() > 0);
  protected readonly progressPercent = computed(() =>
    this.store.safetyChecklist().length
      ? (this.completedCount() / this.store.safetyChecklist().length) * 100
      : 0,
  );

  protected responseFor(itemId: string): SafetyCheckItemStatus | undefined {
    return this.responses()[itemId];
  }
  protected setResponse(itemId: string, status: SafetyCheckItemStatus): void {
    this.responses.update((current) => ({ ...current, [itemId]: status }));
  }
  protected save(): void {
    const result = this.store.addSafetyCheck({
      checkedAt: new Date().toISOString(),
      responses: this.store.safetyChecklist().flatMap((item) => {
        const status = this.responseFor(item.id);
        return status ? [{ itemId: item.id, status }] : [];
      }),
      notes: this.notes,
    });
    if (!result.ok) {
      this.message.set(result.error);
      return;
    }
    void this.router.navigate(['/history']);
  }
}
