import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { GarageStore } from '../../core/services/garage-store.service';
import { SCREEN_WAKE_LOCK } from '../../core/services/screen-wake-lock.service';
import { LocalStorageAdapter } from '../../core/storage/local-storage.adapter';
import { INITIAL_GARAGE_STATE, NX200_PROCEDURES } from '../../data/nx200-demo.data';
import { ProcedureRunPage } from './procedure-run-page';

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

describe('ProcedureRunPage', () => {
  it('advances the visible step, persists progress and pauses without cancelling', async () => {
    const procedure = NX200_PROCEDURES[0]!;
    const route = {
      snapshot: {
        paramMap: convertToParamMap({ slug: procedure.slug, executionId: '' }),
      },
    };
    await TestBed.configureTestingModule({
      imports: [ProcedureRunPage],
      providers: [
        provideRouter([]),
        { provide: LocalStorageAdapter, useValue: new MemoryStorage() },
        { provide: SCREEN_WAKE_LOCK, useValue: null },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();
    const store = TestBed.inject(GarageStore);
    const started = store.startProcedure(
      procedure.slug,
      procedure.safetyWarnings.map((warning) => warning.id),
    );
    if (!started.ok) throw new Error(started.error);
    route.snapshot.paramMap = convertToParamMap({
      slug: procedure.slug,
      executionId: started.execution.id,
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProcedureRunPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.current-step h2').textContent).toContain(
      procedure.steps[0]!.title,
    );

    const completeButton = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent.includes('Marcar como concluída'),
    ) as HTMLButtonElement;
    completeButton.click();
    fixture.detectChanges();
    expect(store.procedureExecutions()[0]?.completedStepIds).toContain(procedure.steps[0]!.id);
    expect(fixture.nativeElement.querySelector('.current-step h2').textContent).toContain(
      procedure.steps[1]!.title,
    );

    const pauseButton = [...fixture.nativeElement.querySelectorAll('button')].find(
      (button: HTMLButtonElement) => button.textContent.includes('Pausar e sair'),
    ) as HTMLButtonElement;
    pauseButton.click();
    expect(store.procedureExecutions()[0]?.status).toBe('in-progress');
    expect(router.navigate).toHaveBeenCalledWith(['/procedures', procedure.slug]);
  });
});
