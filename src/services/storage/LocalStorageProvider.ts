// ============================================================
// Local Storage Provider — chrome.storage.local implementation
// ============================================================

import type { StorageSchema } from '@/types';
import type { StorageService } from './StorageService';

class LocalStorageProvider implements StorageService {
  async get<K extends keyof StorageSchema>(key: K): Promise<StorageSchema[K] | undefined> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key as string, (result) => {
        resolve(result[key as string] as StorageSchema[K] | undefined);
      });
    });
  }

  async set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key as string]: value }, resolve);
    });
  }

  async update<K extends keyof StorageSchema>(
    key: K,
    updater: (current: StorageSchema[K]) => StorageSchema[K]
  ): Promise<void> {
    const current = await this.get(key);
    const updated = updater(current as StorageSchema[K]);
    await this.set(key, updated);
  }

  async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }

  async exportAll(): Promise<Partial<StorageSchema>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => {
        resolve(result as Partial<StorageSchema>);
      });
    });
  }

  async importAll(data: Partial<StorageSchema>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(data as Record<string, unknown>, resolve);
    });
  }
}

export const localStorageProvider = new LocalStorageProvider();
