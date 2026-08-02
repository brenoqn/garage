import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SCREEN_WAKE_LOCK,
  ScreenWakeLockService,
  WakeLockPort,
  WakeLockSentinelPort,
} from './screen-wake-lock.service';

class FakeDocument {
  visibilityState: DocumentVisibilityState = 'visible';
  private readonly listeners = new Map<string, () => void>();
  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }
  removeEventListener(type: string): void {
    this.listeners.delete(type);
  }
  dispatch(type: string): void {
    this.listeners.get(type)?.();
  }
}

function sentinel(): WakeLockSentinelPort & { releaseEvent(): void } {
  let listener: () => void = () => undefined;
  const value = {
    released: false,
    release: vi.fn(async () => {
      value.released = true;
      listener();
    }),
    addEventListener: vi.fn((_type: 'release', callback: () => void) => {
      listener = callback;
    }),
    releaseEvent: () => {
      value.released = true;
      listener();
    },
  };
  return value;
}

describe('ScreenWakeLockService', () => {
  let fakeDocument: FakeDocument;

  beforeEach(() => {
    fakeDocument = new FakeDocument();
    TestBed.configureTestingModule({
      providers: [ScreenWakeLockService, { provide: DOCUMENT, useValue: fakeDocument }],
    });
  });

  it('works without Wake Lock support', async () => {
    TestBed.overrideProvider(SCREEN_WAKE_LOCK, { useValue: null });
    const service = TestBed.inject(ScreenWakeLockService);
    expect(service.supported()).toBe(false);
    await expect(service.request()).resolves.toBe(false);
  });

  it('requests and explicitly releases the screen lock', async () => {
    const lock = sentinel();
    const port: WakeLockPort = { request: vi.fn(async () => lock) };
    TestBed.overrideProvider(SCREEN_WAKE_LOCK, { useValue: port });
    const service = TestBed.inject(ScreenWakeLockService);
    await expect(service.request()).resolves.toBe(true);
    expect(service.active()).toBe(true);
    await service.release();
    expect(lock.release).toHaveBeenCalledOnce();
    expect(service.active()).toBe(false);
  });

  it('treats a permission failure as an unavailable optional enhancement', async () => {
    TestBed.overrideProvider(SCREEN_WAKE_LOCK, {
      useValue: { request: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const service = TestBed.inject(ScreenWakeLockService);
    await expect(service.request()).resolves.toBe(false);
    expect(service.active()).toBe(false);
  });

  it('reacquires after the browser releases a requested lock and the page becomes visible', async () => {
    const first = sentinel();
    const second = sentinel();
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    TestBed.overrideProvider(SCREEN_WAKE_LOCK, { useValue: { request } });
    const service = TestBed.inject(ScreenWakeLockService);
    await service.request();
    first.releaseEvent();
    fakeDocument.dispatch('visibilitychange');
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);
    expect(service.active()).toBe(true);
  });
});
