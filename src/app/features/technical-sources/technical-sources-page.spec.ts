import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../../core/storage/local-storage.adapter';
import { INITIAL_GARAGE_STATE } from '../../data/nx200-demo.data';
import { TechnicalSourcesPage } from './technical-sources-page';

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

describe('TechnicalSourcesPage', () => {
  it('separates source applicability from pending technical review', async () => {
    await TestBed.configureTestingModule({
      imports: [TechnicalSourcesPage],
      providers: [{ provide: LocalStorageAdapter, useValue: new MemoryStorage() }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TechnicalSourcesPage);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Manual do proprietário');
    expect(text).toContain('Disponível');
    expect(text).toContain('Citações localizadas');
    expect(text).toContain('A confirmar');
    expect(text).toContain('Aplicabilidade documental confirmada');
    expect(text).toContain('não equivale à revisão técnica das transcrições');
    expect(text).toContain('D2203-MAN-0181');
    expect(fixture.nativeElement.querySelector('a[href*="honda.com.br"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[download]')).toBeNull();
  });
});
