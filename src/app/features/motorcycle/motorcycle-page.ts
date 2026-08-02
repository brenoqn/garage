import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OdometerRecordSource } from '../../core/models/odometer-record.model';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-motorcycle-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page page-narrow">
      <header class="page-heading">
        <div>
          <a class="back-link" routerLink="/dashboard">‹ Voltar</a>
          <p class="eyebrow">
            {{ store.setup().completed ? 'Motocicleta ativa' : 'Configuração inicial' }}
          </p>
          <h1>
            {{ store.setup().completed ? 'Minha Honda NX200' : 'Configurar minha NX200' }}
          </h1>
          <p>Esses dados personalizam os lembretes e o histórico do Garage.</p>
        </div>
      </header>

      @if (!store.setup().completed) {
        <section class="setup-banner" role="status">
          <strong>Os dados atuais são demonstrativos</strong>
          <p>
            Confirme o apelido, o ano e a quilometragem real da sua motocicleta. Até concluir esta
            etapa, o Garage não emite alertas operacionais. Os exemplos permanecem identificados
            como demonstração e não substituem seus registros.
          </p>
        </section>
      }

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
              @if (form.controls.year.touched && form.controls.year.invalid) {
                <small class="field-error">Informe um ano válido.</small>
              }
            </div>
            <div class="form-field">
              <label for="mileage">Quilometragem atual</label>
              <div class="input-suffix">
                <input
                  id="mileage"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  formControlName="currentMileage"
                />
                <span>km</span>
              </div>
              @if (form.controls.currentMileage.touched && form.controls.currentMileage.invalid) {
                <small class="field-error">Informe uma quilometragem inteira e não negativa.</small>
              }
            </div>
          </div>

          <div class="info-note">
            <span aria-hidden="true">i</span>
            <p>
              O Garage suporta somente a Honda NX200 nesta etapa. Cada alteração do odômetro fica
              registrada neste dispositivo.
            </p>
          </div>

          @if (saveError()) {
            <p class="field-error import-message" role="alert">{{ saveError() }}</p>
          }
          @if (saved()) {
            <p class="success-message" role="status">Dados salvos neste dispositivo.</p>
          }

          <div class="form-actions">
            <a class="button button-secondary" routerLink="/dashboard">Cancelar</a>
            <button
              class="button button-primary"
              type="submit"
              [disabled]="form.invalid || !!store.recovery()"
            >
              {{ store.setup().completed ? 'Salvar alterações' : 'Concluir configuração' }}
            </button>
          </div>
        </form>

        @if (regressionPending()) {
          <form
            class="confirm-box regression-confirm"
            [formGroup]="regressionForm"
            (ngSubmit)="confirmRegression()"
          >
            <strong>Confirmar redução do odômetro</strong>
            <p>{{ regressionMessage() }}</p>
            <div class="form-field">
              <label for="regression-source">Motivo da redução</label>
              <select id="regression-source" formControlName="source">
                <option value="correction">Correção de leitura digitada</option>
                <option value="panel-replacement">Troca ou reinicialização do painel</option>
              </select>
            </div>
            <div class="form-field">
              <label for="regression-note">Observação</label>
              <textarea
                id="regression-note"
                rows="3"
                formControlName="note"
                placeholder="Explique o que aconteceu"
              ></textarea>
            </div>
            <label class="confirmation-check">
              <input type="checkbox" formControlName="confirmed" />
              <span>
                Confirmo que desejo reduzir a leitura atual sem alterar os históricos antigos.
              </span>
            </label>
            <div>
              <button class="button button-secondary" type="button" (click)="cancelRegression()">
                Cancelar
              </button>
              <button
                class="button button-danger"
                type="submit"
                [disabled]="regressionForm.invalid"
              >
                Confirmar correção
              </button>
            </div>
          </form>
        }
      </section>

      <section class="section-block odometer-section" aria-labelledby="odometer-history-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Rastreabilidade</p>
            <h2 id="odometer-history-title">Histórico do odômetro</h2>
          </div>
          <span>{{ store.odometerHistory().length }} registros</span>
        </div>
        <div class="card odometer-list">
          @for (record of store.odometerHistory(); track record.id) {
            <article class="odometer-row">
              <div>
                <strong>{{ record.mileage.toLocaleString('pt-BR') }} km</strong>
                <small>{{ sourceLabel(record.source) }}</small>
              </div>
              <div>
                <time [attr.datetime]="record.recordedAt">{{
                  formatDateTime(record.recordedAt)
                }}</time>
                @if (record.note) {
                  <small>{{ record.note }}</small>
                }
              </div>
            </article>
          } @empty {
            <div class="empty-state compact">
              <strong>Nenhuma leitura confirmada</strong>
              <p>O primeiro registro será criado ao concluir a configuração.</p>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotorcyclePage {
  protected readonly store = inject(GarageStore);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly saved = signal(false);
  protected readonly saveError = signal('');
  protected readonly regressionPending = signal(false);
  protected readonly regressionMessage = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({
    nickname: [this.store.motorcycle().nickname, [Validators.required, Validators.maxLength(40)]],
    year: [
      this.store.motorcycle().year,
      [Validators.required, Validators.min(1980), Validators.max(2100)],
    ],
    currentMileage: [
      this.store.setup().completed ? this.store.motorcycle().currentMileage : 0,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
  });
  protected readonly regressionForm = this.formBuilder.nonNullable.group({
    source: this.formBuilder.nonNullable.control<OdometerRecordSource>('correction'),
    note: ['', Validators.maxLength(240)],
    confirmed: [false, Validators.requiredTrue],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.set(false);
    this.saveError.set('');
    const value = this.form.getRawValue();
    if (!this.store.setup().completed) {
      if (
        this.store.completeSetup({
          nickname: value.nickname.trim(),
          year: value.year,
          currentMileage: value.currentMileage,
        })
      ) {
        this.saved.set(true);
      } else {
        this.saveError.set('Não foi possível concluir a configuração neste dispositivo.');
      }
      return;
    }

    const result = this.store.saveMotorcycle(
      { nickname: value.nickname.trim(), year: value.year },
      { mileage: value.currentMileage, source: 'motorcycle' },
    );
    if (result.status === 'confirmation-required') {
      this.regressionMessage.set(result.impact ?? '');
      this.regressionPending.set(true);
      return;
    }
    if (result.status === 'blocked') {
      this.saveError.set(result.impact ?? 'Não foi possível salvar os dados.');
      return;
    }
    this.saved.set(true);
  }

  protected confirmRegression(): void {
    if (this.regressionForm.invalid || this.form.invalid) {
      this.regressionForm.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const regression = this.regressionForm.getRawValue();
    const result = this.store.saveMotorcycle(
      { nickname: value.nickname.trim(), year: value.year },
      {
        mileage: value.currentMileage,
        source: regression.source,
        note: regression.note,
        confirmedRegression: true,
      },
    );
    if (result.status !== 'updated') {
      this.saveError.set(result.impact ?? 'Não foi possível confirmar a correção.');
      return;
    }
    this.cancelRegression();
    this.saved.set(true);
  }

  protected cancelRegression(): void {
    this.regressionPending.set(false);
    this.regressionMessage.set('');
    this.regressionForm.reset({ source: 'correction', note: '', confirmed: false });
  }

  protected sourceLabel(source: OdometerRecordSource): string {
    const labels: Readonly<Record<OdometerRecordSource, string>> = {
      setup: 'Configuração inicial',
      dashboard: 'Atualização rápida',
      motorcycle: 'Dados da motocicleta',
      service: 'Registro de manutenção',
      fuel: 'Abastecimento',
      correction: 'Correção confirmada',
      'panel-replacement': 'Troca do painel',
      migration: 'Migração do estado anterior',
    };
    return labels[source];
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
