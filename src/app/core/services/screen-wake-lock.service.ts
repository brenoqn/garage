import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken, OnDestroy, signal } from '@angular/core';

export interface WakeLockSentinelPort {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

export interface WakeLockPort {
  request(type: 'screen'): Promise<WakeLockSentinelPort>;
}

export const SCREEN_WAKE_LOCK = new InjectionToken<WakeLockPort | null>('SCREEN_WAKE_LOCK');

export function browserWakeLockFactory(): WakeLockPort | null {
  const navigatorWithWakeLock = globalThis.navigator as Navigator & {
    readonly wakeLock?: WakeLockPort;
  };
  return navigatorWithWakeLock.wakeLock ?? null;
}

@Injectable({ providedIn: 'root' })
export class ScreenWakeLockService implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly wakeLock = inject(SCREEN_WAKE_LOCK);
  private sentinel: WakeLockSentinelPort | null = null;
  private requested = false;
  private readonly visibilityListener = () => {
    if (this.requested && this.document.visibilityState === 'visible' && !this.sentinel) {
      void this.acquire();
    }
  };

  private readonly activeSignal = signal(false);
  private readonly supportedSignal = signal(this.wakeLock !== null);
  readonly active = this.activeSignal.asReadonly();
  readonly supported = this.supportedSignal.asReadonly();

  constructor() {
    this.document.addEventListener('visibilitychange', this.visibilityListener);
  }

  async request(): Promise<boolean> {
    this.requested = true;
    return this.acquire();
  }

  async release(): Promise<void> {
    this.requested = false;
    const sentinel = this.sentinel;
    this.sentinel = null;
    this.activeSignal.set(false);
    if (sentinel && !sentinel.released) {
      await sentinel.release();
    }
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('visibilitychange', this.visibilityListener);
    void this.release();
  }

  private async acquire(): Promise<boolean> {
    if (!this.wakeLock || this.document.visibilityState !== 'visible') {
      this.activeSignal.set(false);
      return false;
    }
    if (this.sentinel && !this.sentinel.released) return true;
    try {
      const sentinel = await this.wakeLock.request('screen');
      this.sentinel = sentinel;
      this.activeSignal.set(true);
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) {
          this.sentinel = null;
          this.activeSignal.set(false);
        }
      });
      return true;
    } catch {
      this.sentinel = null;
      this.activeSignal.set(false);
      return false;
    }
  }
}
