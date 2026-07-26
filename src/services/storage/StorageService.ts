// ============================================================
// Storage Abstraction — Interface
// Future: swap LocalStorageProvider → CloudStorageProvider
// ============================================================

import type { StorageSchema } from '@/types';

export interface StorageService {
  get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K] | undefined>;
  set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void>;
  update<K extends keyof StorageSchema>(
    key: K,
    updater: (current: StorageSchema[K]) => StorageSchema[K]
  ): Promise<void>;
  clear(): Promise<void>;
  exportAll(): Promise<Partial<StorageSchema>>;
  importAll(data: Partial<StorageSchema>): Promise<void>;
}
