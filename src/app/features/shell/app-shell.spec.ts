import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../../core/storage/local-storage.adapter';
import { INITIAL_GARAGE_STATE } from '../../data/nx200-demo.data';
import { AppShell } from './app-shell';

class MemoryStorage {
  private value = JSON.stringify(INITIAL_GARAGE_STATE);
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

describe('AppShell', () => {
  afterEach(() => delete document.documentElement.dataset['theme']);

  it('applies the saved theme and exposes the accessible quick-action sheet', async () => {
    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([]),
        { provide: LocalStorageAdapter, useValue: new MemoryStorage() },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    const trigger = fixture.nativeElement.querySelector('.bottom-nav button') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.bottom-sheet')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ocorrência');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});
