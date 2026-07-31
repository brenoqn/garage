import { Injectable } from '@angular/core';
import { StoragePort } from './storage.port';

@Injectable({ providedIn: 'root' })
export class LocalStorageAdapter extends StoragePort {
  private readonly prefix = 'garage_';

  get<T>(key: string): T | null {
    const rawValue = this.getRaw(key);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  getRaw(key: string): string | null {
    return this.storage?.getItem(this.prefixed(key)) ?? null;
  }

  set<T>(key: string, value: T): void {
    this.setRaw(key, JSON.stringify(value));
  }

  setRaw(key: string, value: string): void {
    const storage = this.storage;
    if (!storage) {
      throw new Error('LocalStorage is unavailable.');
    }
    storage.setItem(this.prefixed(key), value);
  }

  remove(key: string): void {
    const storage = this.storage;
    if (!storage) {
      throw new Error('LocalStorage is unavailable.');
    }
    storage.removeItem(this.prefixed(key));
  }

  private get storage(): Storage | null {
    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private prefixed(key: string): string {
    return `${this.prefix}${key}`;
  }
}
