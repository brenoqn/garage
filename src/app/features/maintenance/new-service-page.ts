import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { todayIso } from '../../core/domain/maintenance-calculator';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-new-service-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page page-narrow">
      <header class="page-heading">
        <div>
          <a class="back-link" routerLink="/maintenance">‹ Cancelar</a>
          <p class="eyebrow">Caderno de oficina</p>
          <h1>Registrar manutenção</h1>
          <p>
            Vincule ao plano para recalcular a próxima ocorrência quando este for o serviço mais
            recente.
          </p>
        </div>
      </header>

      @if (!store.setup().completed) {
        <section class="setup-banner" role="alert">
          <div>
            <strong>Configure sua NX200 antes de registrar serviços</strong>
            <p>A configuração confirma a quilometragem inicial usada pelo histórico.</p>
          </div>
          <a class="button button-primary" routerLink="/motorcycle">Configurar agora</a>
        </section>
      } @else {
        <form class="card form-card" [formGroup]="form" (ngSubmit)="save()">
          <div class="form-field">
            <label for="service-title">Título do serviço</label>
            <input
              id="service-title"
              type="text"
              formControlName="title"
              placeholder="Ex.: Troca de óleo"
              autocomplete="off"
            />
            @if (form.controls.title.touched && form.controls.title.invalid) {
              <small class="field-error">Informe um título com até 80 caracteres.</small>
            }
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="service-date">Data</label>
              <input id="service-date" type="date" [max]="today" formControlName="date" />
            </div>
            <div class="form-field">
              <label for="service-mileage">Quilometragem</label>
              <div class="input-suffix">
                <input
                  id="service-mileage"
                  type="number"
                  min="0"
                  step="1"
                  inputmode="numeric"
                  formControlName="mileage"
                />
                <span>km</span>
              </div>
              @if (form.controls.mileage.touched && form.controls.mileage.invalid) {
                <small class="field-error">Informe uma quilometragem inteira e não negativa.</small>
              }
            </div>
          </div>

          <div class="form-field">
            <label for="plan">Item do plano preventivo</label>
            <select id="plan" formControlName="maintenancePlanId" (change)="applyPlanDefaults()">
              <option value="">Não vincular ao plano</option>
              @for (item of store.maintenancePlan(); track item.id) {
                <option [value]="item.id">{{ item.title }}</option>
              }
            </select>
            <small>
              O item só adota esta execução como referência quando ela é cronologicamente mais
              recente; em datas iguais, prevalece a maior quilometragem.
            </small>
          </div>

          <div class="form-field">
            <label for="procedure">Procedimento relacionado</label>
            <select id="procedure" formControlName="procedureSlug">
              <option value="">Nenhum procedimento</option>
              @for (procedure of store.procedures(); track procedure.slug) {
                <option [value]="procedure.slug">{{ procedure.title }}</option>
              }
            </select>
          </div>

          <div class="form-field">
            <label for="cost">Custo (opcional)</label>
            <div class="input-prefix">
              <span>R$</span>
              <input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                inputmode="decimal"
                formControlName="cost"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="parts">Peças e materiais</label>
            <input
              id="parts"
              type="text"
              formControlName="parts"
              placeholder="Separe os itens por vírgula"
              autocomplete="off"
            />
            <small>Ex.: óleo, arruela de vedação, filtro</small>
          </div>

          <div class="form-field">
            <label for="notes">Observações</label>
            <textarea
              id="notes"
              rows="4"
              formControlName="notes"
              placeholder="Condição das peças, detalhes do serviço..."
            ></textarea>
          </div>

          <p class="settings-footnote">
            A quilometragem deste serviço será adicionada ao histórico do odômetro. Serviços antigos
            não reduzem a leitura atual.
          </p>

          @if (saveError()) {
            <p class="field-error import-message" role="alert">{{ saveError() }}</p>
          }

          <div class="form-actions">
            <a class="button button-secondary" routerLink="/maintenance">Cancelar</a>
            <button
              class="button button-primary"
              type="submit"
              [disabled]="form.invalid || !!store.recovery()"
            >
              Salvar no histórico
            </button>
          </div>
        </form>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewServicePage {
  protected readonly store = inject(GarageStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly initialPlanId = this.route.snapshot.queryParamMap.get('plan') ?? '';
  private readonly initialProcedureSlug = this.route.snapshot.queryParamMap.get('procedure') ?? '';

  protected readonly today = todayIso();
  protected readonly saveError = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/.*\S.*/)]],
    date: [this.today, Validators.required],
    mileage: [
      this.store.motorcycle().currentMileage,
      [Validators.required, Validators.min(0), Validators.pattern(/^\d+$/)],
    ],
    maintenancePlanId: [this.initialPlanId],
    procedureSlug: [this.initialProcedureSlug],
    cost: [null as number | null, Validators.min(0)],
    parts: [''],
    notes: [''],
  });

  constructor() {
    this.applyPlanDefaults();
  }

  protected applyPlanDefaults(): void {
    const item = this.store
      .maintenancePlan()
      .find((candidate) => candidate.id === this.form.controls.maintenancePlanId.value);
    if (!item) {
      return;
    }
    this.form.patchValue({
      title: item.title,
      procedureSlug: item.procedureSlug ?? '',
    });
  }

  protected save(): void {
    if (this.form.invalid || !this.store.setup().completed) {
      this.form.markAllAsTouched();
      return;
    }

    this.saveError.set('');
    const value = this.form.getRawValue();
    const record = this.store.addService({
      title: value.title.trim(),
      date: value.date,
      mileage: value.mileage,
      maintenancePlanId: value.maintenancePlanId || undefined,
      procedureSlug: value.procedureSlug || undefined,
      cost: value.cost ?? undefined,
      parts: value.parts
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
      notes: value.notes.trim() || undefined,
    });

    if (!record) {
      this.saveError.set(
        'Não foi possível salvar o serviço. Verifique a recuperação dos dados em Ajustes.',
      );
      return;
    }
    void this.router.navigate(['/maintenance/history']);
  }
}
