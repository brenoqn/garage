import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { LocalStorageAdapter } from '../../core/storage/local-storage.adapter';
import { INITIAL_GARAGE_STATE } from '../../data/nx200-demo.data';
import { NewFuelPage } from './new-fuel-page';

class MemoryStorage {
  private value = JSON.stringify({
    ...INITIAL_GARAGE_STATE,
    setup: { completed: true, demoData: false },
  });
  getRaw(): string {
    return this.value;
  }
  setRaw(_key: string, value: string): void {
    this.value = value;
  }
  set<T>(_key: string, value: T): void {
    this.value = JSON.stringify(value);
  }
}

describe('NewFuelPage', () => {
  it('shows the historical-mileage confirmation and saves a valid refill', async () => {
    await TestBed.configureTestingModule({
      imports: [NewFuelPage],
      providers: [
        provideRouter([]),
        { provide: LocalStorageAdapter, useValue: new MemoryStorage() },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(NewFuelPage);
    const component = fixture.componentInstance as unknown as {
      form: { patchValue(value: Record<string, unknown>): void };
    };
    component.form.patchValue({
      mileage: 20_000,
      liters: 9.5,
      totalCost: 58,
      confirmedHistoricalMileage: true,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Quilometragem inferior');
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
    submit.click();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/fuel']);
  });
});
