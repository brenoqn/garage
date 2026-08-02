import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { LocalStorageAdapter } from '../../core/storage/local-storage.adapter';
import { INITIAL_GARAGE_STATE } from '../../data/nx200-demo.data';
import { SafetyCheckPage } from './safety-check-page';

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

describe('SafetyCheckPage', () => {
  it('requires every item, keeps visible source context and saves the checklist', async () => {
    await TestBed.configureTestingModule({
      imports: [SafetyCheckPage],
      providers: [
        provideRouter([]),
        { provide: LocalStorageAdapter, useValue: new MemoryStorage() },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(SafetyCheckPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('pág. 30');
    const submit = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    for (const button of fixture.nativeElement.querySelectorAll(
      '.safety-choice button:first-child',
    )) {
      (button as HTMLButtonElement).click();
    }
    fixture.detectChanges();
    expect(submit.disabled).toBe(false);
    submit.click();
    expect(router.navigate).toHaveBeenCalledWith(['/history']);
  });
});
