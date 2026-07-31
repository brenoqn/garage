import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-motorcycle-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page page-narrow">
      <header class="page-heading">
        <div>
          <a class="back-link" routerLink="/dashboard">‹ Voltar</a>
          <p class="eyebrow">Motocicleta ativa</p>
          <h1>Minha Honda NX200</h1>
          <p>Esses dados personalizam os lembretes e o histórico do Garage.</p>
        </div>
      </header>

      <section class="card form-card">
        <div class="model-lockup">
          <span class="model-code">NX</span>
          <div>
            <strong>Honda NX200</strong>
            <small>Primeira motocicleta suportada</small>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="form-field">
            <label for="nickname">Nome ou apelido</label>
            <input id="nickname" type="text" formControlName="nickname" autocomplete="off" />
            @if (form.controls.nickname.touched && form.controls.nickname.invalid) {
              <small class="field-error">Informe um apelido com até 40 caracteres.</small>
            }
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="year">Ano</label>
              <input id="year" type="number" inputmode="numeric" formControlName="year" />
            </div>
            <div class="form-field">
              <label for="mileage">Quilometragem atual</label>
              <div class="input-suffix">
                <input
                  id="mileage"
                  type="number"
                  min="0"
                  inputmode="numeric"
                  formControlName="currentMileage"
                />
                <span>km</span>
              </div>
            </div>
          </div>

          <div class="info-note">
            <span aria-hidden="true">i</span>
            <p>
              O Garage suporta somente a Honda NX200 nesta etapa. Novos modelos poderão ser
              incluídos sem alterar seus registros.
            </p>
          </div>

          @if (saved()) {
            <p class="success-message" role="status">Dados salvos neste dispositivo.</p>
          }

          <div class="form-actions">
            <a class="button button-secondary" routerLink="/dashboard">Cancelar</a>
            <button class="button button-primary" type="submit" [disabled]="form.invalid">
              Salvar alterações
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotorcyclePage {
  private readonly store = inject(GarageStore);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly saved = signal(false);
  protected readonly form = this.formBuilder.nonNullable.group({
    nickname: [this.store.motorcycle().nickname, [Validators.required, Validators.maxLength(40)]],
    year: [
      this.store.motorcycle().year,
      [Validators.required, Validators.min(1980), Validators.max(2100)],
    ],
    currentMileage: [
      this.store.motorcycle().currentMileage,
      [Validators.required, Validators.min(0)],
    ],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.store.updateMotorcycle(this.form.getRawValue());
    this.saved.set(true);
  }
}
