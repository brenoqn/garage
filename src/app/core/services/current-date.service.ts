import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { todayIso } from '../domain/maintenance-calculator';

@Injectable({ providedIn: 'root' })
export class CurrentDateService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly todaySignal = signal(todayIso());
  private timer: ReturnType<typeof globalThis.setTimeout> | undefined;

  readonly today = this.todaySignal.asReadonly();

  constructor() {
    this.scheduleNextRefresh();
    this.destroyRef.onDestroy(() => {
      if (this.timer !== undefined) {
        globalThis.clearTimeout(this.timer);
      }
    });
  }

  private scheduleNextRefresh(): void {
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const delay = Math.max(1_000, nextDay.getTime() - now.getTime() + 1_000);
    this.timer = globalThis.setTimeout(() => {
      this.todaySignal.set(todayIso());
      this.scheduleNextRefresh();
    }, delay);
  }
}
