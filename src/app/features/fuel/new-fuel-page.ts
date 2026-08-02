import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { validateNewFuelRecord } from '../../core/domain/fuel-consumption';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-new-fuel-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page page-narrow form-page">
      <header class="page-heading">
        <div>
          <a class="back-link" routerLink="/fuel">‹ Cancelar</a>
          <p class="eyebrow">Registro rápido</p>
          <h1>Abastecer</h1>
          <p>Tenha o cupom e a leitura do painel em mãos.</p>
        </div>
      </header>

      <form class="card form-card thumb-form" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid">
          <div class="form-field">
            <label for="fuel-mileage">Quilometragem</label>
            <div class="input-suffix">
              <input
                id="fuel-mileage"
                type="number"
                min="0"
                step="1"
                inputmode="numeric"
                formControlName="mileage"
              />
              <span>km</span>
            </div>
          </div>
          <div class="form-field">
            <label for="fuel-date">Data e hora</label>
            <input id="fuel-date" type="datetime-local" formControlName="fueledAt" />
          </div>
          <div class="form-field">
            <label for="fuel-liters">Litros</label>
            <div class="input-suffix">
              <input
                id="fuel-liters"
                type="number"
                min="0.01"
                step="0.01"
                inputmode="decimal"
                formControlName="liters"
              />
              <span>L</span>
            </div>
          </div>
          <div class="form-field">
            <label for="fuel-cost">Valor total</label>
            <div class="input-prefix">
              <span>R$</span>
              <input
                id="fuel-cost"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                formControlName="totalCost"
              />
            </div>
            @if (pricePerLiter(); as price) {
              <small>Preço calculado: {{ price }}</small>
            }
          </div>
        </div>

        <label class="confirmation-check emphasized-check">
          <input type="checkbox" formControlName="fullTank" />
          <span
            ><strong>Completei o tanque</strong
            ><small>Necessário para fechar o próximo cálculo de km/L.</small></span
          >
        </label>

        @if (isHistoricalMileage()) {
          <section class="inline-alert warning" role="alert">
            <span aria-hidden="true">!</span>
            <div>
              <strong>Quilometragem inferior à leitura atual</strong>
              <p>
                O registro será histórico. O odômetro atual não será reduzido e a sequência inválida
                não entrará no cálculo de consumo.
              </p>
              <label class="confirmation-check">
                <input type="checkbox" formControlName="confirmedHistoricalMileage" />
                <span>Confirmo que este é um abastecimento antigo.</span>
              </label>
            </div>
          </section>
        }

        <div class="form-field">
          <label for="fuel-station">Posto (opcional)</label>
          <input
            id="fuel-station"
            type="text"
            maxlength="80"
            autocomplete="organization"
            formControlName="station"
          />
        </div>
        <div class="form-field">
          <label for="fuel-notes">Observação (opcional)</label>
          <textarea id="fuel-notes" rows="3" maxlength="240" formControlName="notes"></textarea>
        </div>

        @if (message()) {
          <p class="field-error" role="alert">{{ message() }}</p>
        }
        <div class="form-actions sticky-form-actions">
          <a class="button button-secondary" routerLink="/fuel">Cancelar</a>
          <button class="button button-primary" type="submit" [disabled]="form.invalid">
            Salvar abastecimento
          </button>
        </div>
      </form>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewFuelPage {
  protected readonly store = inject(GarageStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly message = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({
    mileage: [
      this.store.motorcycle().currentMileage,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    fueledAt: [this.localDateTime(), Validators.required],
    liters: [null as number | null, [Validators.required, Validators.min(0.01)]],
    totalCost: [null as number | null, [Validators.required, Validators.min(0)]],
    fullTank: [true],
    confirmedHistoricalMileage: [false],
    station: ['', Validators.maxLength(80)],
    notes: ['', Validators.maxLength(240)],
  });

  protected isHistoricalMileage(): boolean {
    return this.form.controls.mileage.value < this.store.motorcycle().currentMileage;
  }

  protected pricePerLiter(): string | null {
    const liters = this.form.controls.liters.value;
    const cost = this.form.controls.totalCost.value;
    if (!liters || cost === null || liters <= 0 || cost < 0) return null;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
      cost / liters,
    );
  }

  protected save(): void {
    if (this.form.invalid || !this.store.setup().completed) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input = {
      fueledAt: new Date(value.fueledAt).toISOString(),
      mileage: value.mileage,
      liters: value.liters!,
      totalCost: value.totalCost!,
      fullTank: value.fullTank,
      confirmedHistoricalMileage: value.confirmedHistoricalMileage,
      station: value.station,
      notes: value.notes,
    };
    const validation = validateNewFuelRecord(input, this.store.motorcycle().currentMileage);
    if (!validation.valid) {
      this.message.set(validation.error);
      return;
    }
    if (!this.store.addFuel(input)) {
      this.message.set('Não foi possível salvar. Seus dados anteriores foram preservados.');
      return;
    }
    void this.router.navigate(['/fuel']);
  }

  private localDateTime(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }
}
