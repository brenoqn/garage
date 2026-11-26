import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import {
  MAX_PLAN_TITLE_LENGTH,
  MAX_SCHEDULE_NOTE_LENGTH,
  MAX_USER_INTERVAL_DAYS,
  MAX_USER_INTERVAL_KM,
  MaintenanceScheduleInput,
  planItemRemovalError,
} from '../../core/domain/maintenance-plan';
import { intervalText } from '../../core/domain/maintenance-interval-description';
import { MaintenanceCategory } from '../../core/models/maintenance.model';
import { GarageStore } from '../../core/services/garage-store.service';

type OptionalNumber = number | null;

@Component({
  selector: 'app-maintenance-item-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page page-narrow form-page">
      <header class="page-heading">
        <div>
          <a class="back-link" routerLink="/maintenance">‹ Plano de manutenção</a>
          <p class="eyebrow">{{ isNew() ? 'Novo lembrete' : 'Seu intervalo' }}</p>
          <h1>{{ heading() }}</h1>
          <p>
            Você escolhe de quanto em quanto tempo quer cuidar deste item. O valor vale só para a
            sua moto e aparece sempre como “definido por você”.
          </p>
        </div>
      </header>

      @if (blocked()) {
        <section class="setup-banner" role="status">
          <div>
            <strong>{{ blocked() }}</strong>
          </div>
          <a class="button button-secondary" routerLink="/motorcycle">Configurar agora</a>
        </section>
      } @else if (!isNew() && !item()) {
        <section class="empty-state card">
          <strong>Item não encontrado</strong>
          <a class="button button-secondary" routerLink="/maintenance">Voltar ao plano</a>
        </section>
      } @else {
        @if (catalogItem(); as catalog) {
          <section class="inline-alert warning" role="note">
            <span aria-hidden="true">!</span>
            <p>
              <strong>Item do catálogo da NX200.</strong>
              {{
                catalog.technicalSource.status === 'confirmed'
                  ? 'O intervalo revisado continua registrado; o seu passa a valer para os lembretes.'
                  : 'O intervalo do manual ainda não passou por revisão técnica e não gera lembretes. Use o seu intervalo enquanto isso.'
              }}
            </p>
          </section>
        }

        <form class="card form-card thumb-form" [formGroup]="form" (ngSubmit)="save()">
          @if (!catalogItem()) {
            <div class="form-field">
              <label for="plan-title">O que você quer acompanhar?</label>
              <input
                id="plan-title"
                type="text"
                [attr.maxlength]="maxTitle"
                formControlName="title"
                placeholder="Ex.: troca de óleo, calibragem, relação"
                autocomplete="off"
              />
            </div>
            <div class="form-field">
              <label for="plan-category">Categoria</label>
              <select id="plan-category" formControlName="category">
                @for (option of categories; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
          }

          <fieldset class="choice-field">
            <legend>Repetir a cada</legend>
            <div class="form-grid">
              <div class="form-field">
                <label for="plan-interval-km">Quilômetros</label>
                <div class="input-suffix">
                  <input
                    id="plan-interval-km"
                    type="number"
                    min="1"
                    [attr.max]="maxKm"
                    step="1"
                    inputmode="numeric"
                    formControlName="intervalKm"
                    aria-describedby="plan-interval-help"
                  /><span>km</span>
                </div>
              </div>
              <div class="form-field">
                <label for="plan-interval-days">Dias</label>
                <div class="input-suffix">
                  <input
                    id="plan-interval-days"
                    type="number"
                    min="1"
                    [attr.max]="maxDays"
                    step="1"
                    inputmode="numeric"
                    formControlName="intervalDays"
                    aria-describedby="plan-interval-help"
                  /><span>dias</span>
                </div>
              </div>
            </div>
            <small id="plan-interval-help" class="field-hint">
              Preencha um ou os dois. O que vencer primeiro gera o lembrete.
            </small>
          </fieldset>

          <fieldset class="choice-field">
            <legend>Avisar com antecedência (opcional)</legend>
            <div class="form-grid">
              <div class="form-field">
                <label for="plan-warning-km">Quilômetros antes</label>
                <div class="input-suffix">
                  <input
                    id="plan-warning-km"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    formControlName="warningKm"
                  /><span>km</span>
                </div>
              </div>
              <div class="form-field">
                <label for="plan-warning-days">Dias antes</label>
                <div class="input-suffix">
                  <input
                    id="plan-warning-days"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    formControlName="warningDays"
                  /><span>dias</span>
                </div>
              </div>
            </div>
          </fieldset>

          <div class="form-field">
            <label for="plan-note">Observação (opcional)</label>
            <textarea
              id="plan-note"
              rows="3"
              [attr.maxlength]="maxNote"
              formControlName="note"
              placeholder="Ex.: recomendação do meu mecânico"
            ></textarea>
          </div>

          @if (preview()) {
            <p class="field-hint" aria-live="polite">Resumo: {{ preview() }}</p>
          }
          @if (message()) {
            <p class="field-error" role="alert">{{ message() }}</p>
          }

          <div class="form-actions sticky-form-actions">
            <a class="button button-secondary" routerLink="/maintenance">Cancelar</a>
            <button
              class="button button-primary"
              type="submit"
              [disabled]="form.invalid || store.busy()"
            >
              {{ isNew() ? 'Criar item' : 'Salvar intervalo' }}
            </button>
          </div>
        </form>

        @if (!isNew() && item(); as current) {
          <section class="card settings-section">
            @if (current.origin === 'user') {
              <h2>Remover item</h2>
              @if (removalError(); as reason) {
                <p>{{ reason }}</p>
              } @else {
                <p>O item sai do plano. Nenhum outro registro é alterado.</p>
                <button class="text-button danger" type="button" (click)="remove()">
                  Remover este item
                </button>
              }
            } @else if (current.userSchedule) {
              <h2>Voltar ao intervalo do catálogo</h2>
              <p>O seu intervalo é apagado e o item volta a depender da revisão técnica.</p>
              <button class="text-button danger" type="button" (click)="clearSchedule()">
                Remover meu intervalo
              </button>
            }
          </section>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceItemPage {
  protected readonly store = inject(GarageStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly itemId = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('id'))),
    { initialValue: null },
  );
  protected readonly maxTitle = MAX_PLAN_TITLE_LENGTH;
  protected readonly maxNote = MAX_SCHEDULE_NOTE_LENGTH;
  protected readonly maxKm = MAX_USER_INTERVAL_KM;
  protected readonly maxDays = MAX_USER_INTERVAL_DAYS;
  protected readonly message = signal('');
  protected readonly categories: readonly { value: MaintenanceCategory; label: string }[] = [
    { value: 'general', label: 'Geral' },
    { value: 'engine', label: 'Motor' },
    { value: 'transmission', label: 'Transmissão' },
    { value: 'electrical', label: 'Elétrica' },
    { value: 'controls', label: 'Comandos' },
    { value: 'brakes', label: 'Freios' },
  ];

  protected readonly isNew = computed(() => this.itemId() === null);
  protected readonly item = computed(() =>
    this.store.maintenancePlan().find((candidate) => candidate.id === this.itemId()),
  );
  protected readonly catalogItem = computed(() => {
    const item = this.item();
    return item?.origin === 'catalog' ? item : undefined;
  });
  protected readonly heading = computed(() =>
    this.isNew() ? 'Criar item de manutenção' : (this.item()?.title ?? 'Item do plano'),
  );
  protected readonly blocked = computed(() => {
    if (!this.store.setup().completed) return 'Configure sua moto antes de editar o plano.';
    if (this.store.recovery()) return 'Resolva os dados locais em Ajustes antes de continuar.';
    return '';
  });
  protected readonly removalError = computed(() => {
    const item = this.item();
    return item ? planItemRemovalError(item, this.store.serviceHistory()) : null;
  });

  protected readonly form = this.formBuilder.group({
    title: this.formBuilder.nonNullable.control(this.item()?.title ?? '', [
      Validators.maxLength(MAX_PLAN_TITLE_LENGTH),
    ]),
    category: this.formBuilder.nonNullable.control<MaintenanceCategory>(
      this.item()?.category ?? 'general',
    ),
    intervalKm: this.formBuilder.control<OptionalNumber>(
      this.item()?.userSchedule?.intervalKm ?? null,
      [Validators.min(1), Validators.max(MAX_USER_INTERVAL_KM), Validators.pattern(/^\d+$/)],
    ),
    intervalDays: this.formBuilder.control<OptionalNumber>(
      this.item()?.userSchedule?.intervalDays ?? null,
      [Validators.min(1), Validators.max(MAX_USER_INTERVAL_DAYS), Validators.pattern(/^\d+$/)],
    ),
    warningKm: this.formBuilder.control<OptionalNumber>(
      this.item()?.userSchedule?.warningKm ?? null,
      [Validators.min(0), Validators.pattern(/^\d+$/)],
    ),
    warningDays: this.formBuilder.control<OptionalNumber>(
      this.item()?.userSchedule?.warningDays ?? null,
      [Validators.min(0), Validators.pattern(/^\d+$/)],
    ),
    note: this.formBuilder.nonNullable.control(this.item()?.userSchedule?.note ?? '', [
      Validators.maxLength(MAX_SCHEDULE_NOTE_LENGTH),
    ]),
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  protected readonly preview = computed(() => {
    const value = this.formValue();
    return intervalText(value.intervalKm ?? undefined, value.intervalDays ?? undefined);
  });

  protected async save(): Promise<void> {
    this.message.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const schedule: MaintenanceScheduleInput = {
      intervalKm: value.intervalKm ?? undefined,
      intervalDays: value.intervalDays ?? undefined,
      warningKm: value.warningKm ?? undefined,
      warningDays: value.warningDays ?? undefined,
      note: value.note,
    };
    const current = this.item();
    const result = this.isNew()
      ? await this.store.addMaintenanceItem({
          ...schedule,
          title: value.title,
          category: value.category,
        })
      : current?.origin === 'user'
        ? await this.store.updateMaintenanceItem(current.id, {
            ...schedule,
            title: value.title,
            category: value.category,
          })
        : await this.store.setMaintenanceSchedule(this.itemId() ?? '', schedule);
    if (!result.ok) {
      this.message.set(result.error);
      return;
    }
    void this.router.navigate(['/maintenance']);
  }

  protected async clearSchedule(): Promise<void> {
    const result = await this.store.setMaintenanceSchedule(this.itemId() ?? '', null);
    if (!result.ok) {
      this.message.set(result.error);
      return;
    }
    void this.router.navigate(['/maintenance']);
  }

  protected async remove(): Promise<void> {
    const result = await this.store.removeMaintenanceItem(this.itemId() ?? '');
    if (!result.ok) {
      this.message.set(result.error);
      return;
    }
    void this.router.navigate(['/maintenance']);
  }
}
