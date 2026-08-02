import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OccurrenceSeverity } from '../../core/models/occurrence-record.model';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-new-occurrence-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page page-narrow form-page">
      <header class="page-heading">
        <div>
          <a class="back-link" routerLink="/history">‹ Cancelar</a>
          <p class="eyebrow">Anote enquanto lembra</p>
          <h1>Registrar ocorrência</h1>
          <p>
            Guarde ruídos, falhas ou algo que merece acompanhamento. Isso não substitui diagnóstico.
          </p>
        </div>
      </header>
      <form class="card form-card thumb-form" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-field">
          <label for="occurrence-title">O que você percebeu?</label
          ><input
            id="occurrence-title"
            type="text"
            maxlength="80"
            formControlName="title"
            placeholder="Ex.: ruído ao frear"
          />
        </div>
        <div class="form-grid">
          <div class="form-field">
            <label for="occurrence-mileage">Quilometragem</label>
            <div class="input-suffix">
              <input
                id="occurrence-mileage"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                formControlName="mileage"
              /><span>km</span>
            </div>
          </div>
          <div class="form-field">
            <label for="occurrence-date">Data e hora</label
            ><input id="occurrence-date" type="datetime-local" formControlName="occurredAt" />
          </div>
        </div>
        <fieldset class="choice-field">
          <legend>Impacto percebido</legend>
          <div class="segmented-control">
            @for (option of severities; track option.value) {
              <label
                ><input type="radio" formControlName="severity" [value]="option.value" /><span>{{
                  option.label
                }}</span></label
              >
            }
          </div>
        </fieldset>
        @if (form.controls.severity.value === 'stop') {
          <p class="inline-alert danger" role="alert">
            <span aria-hidden="true">!</span
            ><span>Não rode até a causa ser avaliada por um profissional qualificado.</span>
          </p>
        }
        <div class="form-field">
          <label for="occurrence-notes">Detalhes (opcional)</label
          ><textarea
            id="occurrence-notes"
            rows="5"
            maxlength="500"
            formControlName="notes"
            placeholder="Quando acontece, de onde parece vir, o que mudou..."
          ></textarea>
        </div>
        @if (message()) {
          <p class="field-error" role="alert">{{ message() }}</p>
        }
        <div class="form-actions sticky-form-actions">
          <a class="button button-secondary" routerLink="/history">Cancelar</a
          ><button class="button button-primary" type="submit" [disabled]="form.invalid">
            Salvar ocorrência
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewOccurrencePage {
  protected readonly store = inject(GarageStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly message = signal('');
  protected readonly severities: readonly { value: OccurrenceSeverity; label: string }[] = [
    { value: 'note', label: 'Só anotar' },
    { value: 'attention', label: 'Observar' },
    { value: 'stop', label: 'Não rodar' },
  ];
  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/.*\S.*/)]],
    mileage: [
      this.store.motorcycle().currentMileage,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    occurredAt: [this.localDateTime(), Validators.required],
    severity: this.formBuilder.nonNullable.control<OccurrenceSeverity>('note'),
    notes: ['', Validators.maxLength(500)],
  });
  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const record = this.store.addOccurrence({
      ...value,
      occurredAt: new Date(value.occurredAt).toISOString(),
    });
    if (!record) {
      this.message.set('Não foi possível salvar. Seus dados anteriores foram preservados.');
      return;
    }
    void this.router.navigate(['/history']);
  }
  private localDateTime(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  }
}
