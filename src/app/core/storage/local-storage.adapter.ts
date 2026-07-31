import { Injectable } from '@angular/core';
import { StoragePort } from './storage.port';

@Injectable({ providedIn: 'root' })
export class LocalStorageAdapter extends StoragePort {
  private readonly prefix = 'garage_';

  get<T>(key: string): T | null {
    const storage = this.storage;
    if (!storage) {
      return null;
    }

    const rawValue = storage.getItem(this.prefixed(key));
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    this.storage?.setItem(this.prefixed(key), JSON.stringify(value));
  }

  remove(key: string): void {
    this.storage?.removeItem(this.prefixed(key));
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
