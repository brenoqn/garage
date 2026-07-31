export abstract class StoragePort {
  abstract get<T>(key: string): T | null;
  abstract getRaw(key: string): string | null;
  abstract set<T>(key: string, value: T): void;
  abstract setRaw(key: string, value: string): void;
  abstract remove(key: string): void;
}
