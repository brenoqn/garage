import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { summarizeFuelHistory } from '../../core/domain/fuel-consumption';
import { ExpenseCategory } from '../../core/models/expense-record.model';
import { GarageStore } from '../../core/services/garage-store.service';

@Component({
  selector: 'app-expenses-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page page-narrow">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Sem planilha</p>
          <h1>Gastos da moto</h1>
          <p>Uma visão simples de combustível, serviços e outros custos informados.</p>
        </div>
      </header>

      <section class="daily-metric-grid" aria-label="Resumo de gastos">
        <article class="card daily-metric featured">
          <span>Total registrado</span><strong>{{ currency(total()) }}</strong
          ><small>todos os tipos</small>
        </article>
        <article class="card daily-metric">
          <span>Combustível</span><strong>{{ currency(fuelTotal()) }}</strong
          ><small>{{ store.fuelHistory().length }} abastecimento(s)</small>
        </article>
        <article class="card daily-metric">
          <span>Manutenção</span><strong>{{ currency(serviceTotal()) }}</strong
          ><small>somente custos preenchidos</small>
        </article>
      </section>

      @if (store.setup().completed) {
        <form
          class="card form-card compact-entry-form"
          [formGroup]="form"
          (ngSubmit)="save()"
          aria-labelledby="expense-form-title"
        >
          <div class="inline-between">
            <div>
              <p class="eyebrow">Registro rápido</p>
              <h2 id="expense-form-title">Adicionar outro gasto</h2>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label for="expense-title">Descrição</label
              ><input
                id="expense-title"
                type="text"
                maxlength="80"
                formControlName="title"
                placeholder="Ex.: estacionamento"
              />
            </div>
            <div class="form-field">
              <label for="expense-amount">Valor</label>
              <div class="input-prefix">
                <span>R$</span
                ><input
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputmode="decimal"
                  formControlName="amount"
                />
              </div>
            </div>
            <div class="form-field">
              <label for="expense-category">Categoria</label
              ><select id="expense-category" formControlName="category">
                @for (option of categories; track option.value) {
                  <option [value]="option.value">{{ option.label }}</option>
                }
              </select>
            </div>
            <div class="form-field">
              <label for="expense-date">Data</label
              ><input id="expense-date" type="date" formControlName="date" />
            </div>
          </div>
          <div class="form-field">
            <label for="expense-notes">Observação (opcional)</label
            ><textarea
              id="expense-notes"
              rows="2"
              maxlength="240"
              formControlName="notes"
            ></textarea>
          </div>
          @if (message()) {
            <p
              [class]="messageKind() === 'success' ? 'success-message' : 'field-error'"
              [attr.role]="messageKind() === 'success' ? 'status' : 'alert'"
            >
              {{ message() }}
            </p>
          }
          <div class="form-actions">
            <button class="button button-primary" type="submit" [disabled]="form.invalid">
              Salvar gasto
            </button>
          </div>
        </form>
      } @else {
        <section class="setup-banner" role="status">
          <div>
            <strong>Configure sua NX200</strong>
            <p>Depois disso, seus gastos ficarão associados à motocicleta correta.</p>
          </div>
          <a class="button button-primary" routerLink="/motorcycle">Configurar</a>
        </section>
      }

      <section class="section-block">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Avulsos</p>
            <h2>Outros gastos</h2>
          </div>
        </div>
        <div class="record-list">
          @for (record of store.expenseHistory(); track record.id) {
            <article class="card record-card">
              <div class="inline-between">
                <div>
                  <span class="card-label"
                    >{{ date(record.date) }} · {{ categoryLabel(record.category) }}</span
                  >
                  <h3>{{ record.title }}</h3>
                </div>
                <strong>{{ currency(record.amount) }}</strong>
              </div>
              @if (record.notes) {
                <p>{{ record.notes }}</p>
              }
            </article>
          } @empty {
            <div class="empty-state compact">
              <strong>Nenhum gasto avulso</strong>
              <p>
                Combustível e serviços já entram automaticamente no resumo quando possuem valor.
              </p>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExpensesPage {
  protected readonly store = inject(GarageStore);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly message = signal('');
  protected readonly messageKind = signal<'success' | 'error'>('success');
  protected readonly categories: readonly { value: ExpenseCategory; label: string }[] = [
    { value: 'parts', label: 'Peças e materiais' },
    { value: 'document', label: 'Documento e taxa' },
    { value: 'parking', label: 'Estacionamento' },
    { value: 'accessory', label: 'Acessório' },
    { value: 'other', label: 'Outro' },
  ];
  protected readonly fuelTotal = computed(
    () => summarizeFuelHistory(this.store.fuelHistory()).totalCost,
  );
  protected readonly serviceTotal = computed(() =>
    this.store
      .serviceHistory()
      .reduce((sum, record) => sum + (record.isDemo ? 0 : (record.cost ?? 0)), 0),
  );
  protected readonly extraTotal = computed(() =>
    this.store.expenseHistory().reduce((sum, record) => sum + record.amount, 0),
  );
  protected readonly total = computed(
    () => this.fuelTotal() + this.serviceTotal() + this.extraTotal(),
  );
  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/.*\S.*/)]],
    amount: [null as number | null, [Validators.required, Validators.min(0)]],
    category: this.formBuilder.nonNullable.control<ExpenseCategory>('other'),
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    notes: ['', Validators.maxLength(240)],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const record = this.store.addExpense({
      title: value.title,
      amount: value.amount!,
      category: value.category,
      date: value.date,
      notes: value.notes,
    });
    if (!record) {
      this.messageKind.set('error');
      this.message.set('Não foi possível salvar. Os dados anteriores foram preservados.');
      return;
    }
    this.messageKind.set('success');
    this.message.set('Gasto salvo. Você pode registrar outro.');
    this.form.reset({
      title: '',
      amount: null,
      category: 'other',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
  }
  protected currency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  protected date(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(
      new Date(`${value}T12:00:00Z`),
    );
  }
  protected categoryLabel(value: ExpenseCategory): string {
    return this.categories.find((item) => item.value === value)?.label ?? value;
  }
}
