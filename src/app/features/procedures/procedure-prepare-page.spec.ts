import { provideRouter, ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_GARAGE_STATE, NX200_PROCEDURES } from '../../data/nx200-demo.data';
import { LocalStorageAdapter } from '../../core/storage/local-storage.adapter';
import { ProcedurePreparePage } from './procedure-prepare-page';

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

describe('ProcedurePreparePage', () => {
  it('enables starting only after every safety warning is acknowledged', async () => {
    const procedure = NX200_PROCEDURES[0]!;
    await TestBed.configureTestingModule({
      imports: [ProcedurePreparePage],
      providers: [
        provideRouter([]),
        { provide: LocalStorageAdapter, useValue: new MemoryStorage() },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: procedure.slug }) } },
        },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProcedurePreparePage);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    for (const checkbox of fixture.nativeElement.querySelectorAll('input[type="checkbox"]')) {
      (checkbox as HTMLInputElement).click();
    }
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith([
      '/procedures',
      procedure.slug,
      'run',
      expect.any(String),
    ]);
  });

  it('shows editorial version and an explicit warning for critical pending content', async () => {
    const procedure = NX200_PROCEDURES.find((item) => item.slug === 'inspecao-dos-freios')!;
    await TestBed.configureTestingModule({
      imports: [ProcedurePreparePage],
      providers: [
        provideRouter([]),
        { provide: LocalStorageAdapter, useValue: new MemoryStorage() },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ slug: procedure.slug }) } },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProcedurePreparePage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Conteúdo versão 1');
    expect(fixture.nativeElement.textContent).toContain('Risco crítico com conteúdo pendente');
    expect(fixture.nativeElement.textContent).toContain('não certifica');
  });
});
