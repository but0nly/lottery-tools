import { WheelingMode, FilterConditions } from './combinations';

// Browser-based storage using IndexedDB
const DB_NAME = 'LotteryToolsDB';
const DB_VERSION = 4; // Increment version for Selection feature
const STORE_SAVED = 'saved_combinations';
const STORE_SELECTION = 'cart_combinations'; // Reusing cart store but renaming concept
const STORE_SETTINGS = 'algorithm_settings';

export interface LotteryRecord {
  id?: number;
  type: 'SSQ' | 'DLT';
  reds: string;
  blues: string;
  toolUsed: 'REDUCER' | 'REVERSE' | 'RANDOM';
  createdAt: number;
  multiplier?: number;
  isPinned?: boolean;
}

export interface ReducerSettings {
  type: 'SSQ' | 'DLT';
  wheelingMode: WheelingMode;
  reds: number[];
  blues: number[];
  conditions: FilterConditions;
}

export interface ReverseSettings {
  type: 'SSQ' | 'DLT';
  mode: 'FREQUENCY' | 'GAME_THEORY';
  historySize: number;
  gtConfig: {
    monthPenalty: number;
    birthdayPenalty: number;
    luckyPenalty: number;
    largeNumberBonus: number;
    blueMonthPenalty: number;
    blueLargeBonus: number;
  };
}

export interface RandomSettings {
  type: 'SSQ' | 'DLT';
  fixedReds: number[];
  fixedBlues: number[];
  excludedReds?: number[];
  excludedBlues?: number[];
  betCount: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains(STORE_SAVED)) {
        db.createObjectStore(STORE_SAVED, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_SELECTION)) {
        db.createObjectStore(STORE_SELECTION, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }

      // Migration from version 3 to 4: Move items from STORE_SAVED to STORE_SELECTION
      if (oldVersion < 4) {
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const savedStore = transaction.objectStore(STORE_SAVED);
        const selectionStore = transaction.objectStore(STORE_SELECTION);

        const getAllRequest = savedStore.getAll();
        getAllRequest.onsuccess = () => {
          const items = getAllRequest.result as LotteryRecord[];
          for (const item of items) {
            delete item.id; // Let new store auto-increment
            selectionStore.add({ 
              ...item, 
              isPinned: true, 
              multiplier: 1 
            });
          }
          // Optionally clear the old store
          savedStore.clear();
        };
      }
    };
  });
};

export const storage = {
  // Settings (Algorithm Parameters)
  async getSettings<T>(key: string): Promise<T | null> {
    const db = await openDB();
    const transaction = db.transaction(STORE_SETTINGS, 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  },

  async setSettings<T>(key: string, value: T) {
    const db = await openDB();
    const transaction = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    return new Promise<void>((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Saved Combinations (Permanent - LEGACY, will be merged into Selection with isPinned=true)
  async save(combination: Omit<LotteryRecord, 'id' | 'createdAt'>) {
    return this.addToSelection({ ...combination, isPinned: true });
  },

  async getAllSaved(): Promise<LotteryRecord[]> {
    const selection = await this.getSelection();
    return selection.filter(item => item.isPinned);
  },

  async deleteSaved(id: number) {
    return this.removeFromSelection(id);
  },

  async deleteSavedByContent(type: string, reds: string, blues: string) {
    const items = await this.getSelection();
    const item = items.find(i => i.isPinned && i.type === type && i.reds === reds && i.blues === blues);
    if (item && item.id !== undefined) {
      return this.removeFromSelection(item.id);
    }
  },

  // Selection Logic (Unified store)
  async addToSelection(combination: Omit<LotteryRecord, 'id' | 'createdAt'>) {
    await openDB();
    
    // Check for duplicates in Selection
    const existing = await this.getSelection();
    const duplicate = existing.find(item => 
      item.type === combination.type && 
      item.reds === combination.reds && 
      item.blues === combination.blues
    );

    if (duplicate) {
      // If adding a pinned item and existing is not pinned, update it to pinned
      if (combination.isPinned && !duplicate.isPinned) {
        await this.updateSelection(duplicate.id!, { isPinned: true });
        return duplicate.id;
      }
      return null;
    }

    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readwrite');
    const store = transaction.objectStore(STORE_SELECTION);
    return new Promise((resolve, reject) => {
      const record = { 
        ...combination, 
        createdAt: Date.now(),
        multiplier: combination.multiplier || 1,
        isPinned: combination.isPinned || false
      };
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getSelection(): Promise<LotteryRecord[]> {
    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readonly');
    const store = transaction.objectStore(STORE_SELECTION);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result as LotteryRecord[];
        resolve(results.sort((a, b) => b.createdAt - a.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  },

  async updateSelection(id: number, updates: Partial<Pick<LotteryRecord, 'multiplier' | 'isPinned'>>) {
    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readwrite');
    const store = transaction.objectStore(STORE_SELECTION);
    
    return new Promise<void>((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (!data) return reject(new Error('Record not found'));
        
        const updated = { ...data, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  },

  async removeFromSelection(id: number) {
    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readwrite');
    const store = transaction.objectStore(STORE_SELECTION);
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async removeFromSelectionByContent(type: string, reds: string, blues: string) {
    const items = await this.getSelection();
    const item = items.find(i => i.type === type && i.reds === reds && i.blues === blues);
    if (item && item.id !== undefined) {
      return this.removeFromSelection(item.id);
    }
  },

  async clearSelection() {
    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readwrite');
    const store = transaction.objectStore(STORE_SELECTION);
    return new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Backwards Compatibility / Legacy methods
  async addToCart(combination: Omit<LotteryRecord, 'id' | 'createdAt'>) {
    return this.addToSelection(combination);
  },
  async getCart() {
    return this.getSelection();
  },
  async removeFromCart(id: number) {
    return this.removeFromSelection(id);
  },
  async removeFromCartByContent(type: string, reds: string, blues: string) {
    return this.removeFromSelectionByContent(type, reds, blues);
  },
  async clearCart() {
    return this.clearSelection();
  }
};

export type { LotteryRecord as SavedCombination };
