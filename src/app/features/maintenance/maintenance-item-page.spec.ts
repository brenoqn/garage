import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { GarageState } from '../../core/models/garage-state.model';
import { GarageStore } from '../../core/services/garage-store.service';
import { LocalStorageAdapter } from '../../core/storage/local-storage.adapter';
import { INITIAL_GARAGE_STATE } from '../../data/nx200-demo.data';
import { MaintenanceItemPage } from './maintenance-item-page';

class MemoryStorage {
  constructor(
    private value = JSON.stringify({
      ...INITIAL_GARAGE_STATE,
      motorcycle: { ...INITIAL_GARAGE_STATE.motorcycle, currentMileage: 12_000 },
      setup: { completed: true, demoData: false },
    }),
  ) {}
  getRaw(): string {
    return this.value;
  }
  setRaw(_key: string, value: string): void {
    this.value = value;
  }
  set<T>(_key: string, value: T): void {
    this.value = JSON.stringify(value);
  }
  state(): GarageState {
    return JSON.parse(this.value) as GarageState;
  }
}

async function render(itemId: string | null, storage = new MemoryStorage()) {
  await TestBed.configureTestingModule({
    imports: [MaintenanceItemPage],
    providers: [
      provideRouter([]),
      { provide: LocalStorageAdapter, useValue: storage },
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap(itemId ? { id: itemId } : {})) },
      },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(MaintenanceItemPage);
  fixture.detectChanges();
  return { fixture, router, storage };
}

function type(fixture: { nativeElement: HTMLElement }, selector: string, value: string): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('MaintenanceItemPage', () => {
  it('creates an owner-defined item from the form', async () => {
    const { fixture, router, storage } = await render(null);
    const submit = fixture.nativeElement.querySelector('button[type="submit"]');
    type(fixture, '#plan-title', 'Calibragem dos pneus');
    type(fixture, '#plan-interval-days', '15');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('a cada 15 dias');
    submit.click();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/maintenance']);
    const created = storage.state().maintenancePlan.find((item) => item.origin === 'user');
    expect(created).toMatchObject({
      title: 'Calibragem dos pneus',
      userSchedule: { intervalDays: 15 },
    });
  });

  it('shows the domain error instead of saving an item without interval', async () => {
    const { fixture, router, storage } = await render(null);
    type(fixture, '#plan-title', 'Sem intervalo');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Informe um intervalo',
    );
    expect(storage.state().maintenancePlan.some((item) => item.origin === 'user')).toBe(false);
  });

  it('sets an owner interval on a catalog item without renaming it', async () => {
    const { fixture, storage } = await render('engine-oil');
    expect(fixture.nativeElement.querySelector('#plan-title')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('ainda não passou por revisão técnica');
    type(fixture, '#plan-interval-km', '1000');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[type="submit"]').click();
    await new Promise((resolve) => setTimeout(resolve));
    const oil = storage.state().maintenancePlan.find((item) => item.id === 'engine-oil');
    expect(oil?.userSchedule?.intervalKm).toBe(1000);
    expect(oil?.title).toBe('Óleo do motor');
    expect(TestBed.inject(GarageStore).maintenancePlan()).toContainEqual(oil);
  });
});
