import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { GarageStore } from '../../core/services/garage-store.service';
import { LocalStorageAdapter } from '../../core/storage/local-storage.adapter';
import { INITIAL_GARAGE_STATE } from '../../data/nx200-demo.data';
import { SpecificationsPage } from './specifications-page';

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

describe('SpecificationsPage', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('filters by status and applicability while preserving the A confirmar state', async () => {
    await TestBed.configureTestingModule({
      imports: [SpecificationsPage],
      providers: [
        provideRouter([]),
        { provide: LocalStorageAdapter, useValue: new MemoryStorage() },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SpecificationsPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('A confirmar');
    expect(fixture.nativeElement.textContent).toContain('Página ou seção: não informada');
    expect(fixture.nativeElement.textContent).toContain('Manual de serviço');

    const component = fixture.componentInstance as unknown as {
      filterForm: {
        controls: {
          status: { setValue(value: string): void };
          onlyApplicable: { setValue(value: boolean): void };
        };
      };
    };
    component.filterForm.controls.status.setValue('confirmed');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma especificação corresponde');

    component.filterForm.controls.status.setValue('all');
    component.filterForm.controls.onlyApplicable.setValue(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'aplicabilidade do catálogo ainda é desconhecida',
    );
  });

  it('shows a conflict warning without relying only on color', async () => {
    const source = {
      id: 'source',
      type: 'service-manual' as const,
      title: 'Fonte de teste',
      publisher: 'Editor',
      availability: 'available' as const,
    };
    const claim = (id: string, value: string) => ({
      id,
      topicId: 'same-topic',
      label: 'Valor conflitante',
      value: { kind: 'text' as const, value },
      status: 'confirmed' as const,
      applicability: {
        manufacturer: 'Honda' as const,
        model: 'NX200' as const,
        confirmation: 'confirmed' as const,
      },
      citations: [{ sourceId: source.id, page: 1 }],
      reviews: [
        {
          id: `review-${id}`,
          reviewedAt: '2026-08-02T10:00:00.000Z',
          reviewerName: 'Revisor',
          decision: 'approved' as const,
        },
      ],
    });
    const claims = [claim('left', '10'), claim('right', '20')];
    const fakeStore = {
      motorcycle: () => INITIAL_GARAGE_STATE.motorcycle,
      specifications: () => [{ id: 'spec', system: 'motor' as const, claimId: 'left' }],
      technicalClaims: () => claims,
      technicalSources: () => [source],
    };
    await TestBed.configureTestingModule({
      imports: [SpecificationsPage],
      providers: [provideRouter([]), { provide: GarageStore, useValue: fakeStore }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SpecificationsPage);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.conflict-warning').textContent).toContain(
      'Fontes divergentes',
    );
  });
});
