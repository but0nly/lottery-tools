import { WheelingMode, FilterConditions, GameTheoryConfig } from './combinations';

// Browser-based storage using IndexedDB
const DB_NAME = 'LotteryToolsDB';
const DB_VERSION = 5;
const STORE_SAVED = 'saved_combinations';
const STORE_SELECTION = 'cart_combinations';
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
  gtConfig: GameTheoryConfig;
}

export interface RandomSettings {
  type: 'SSQ' | 'DLT';
  fixedReds: number[];
  fixedBlues: number[];
  excludedReds?: number[];
  excludedBlues?: number[];
  betCount: number;
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onblocked = () => {
      dbPromise = null;
      reject(new Error('IndexedDB upgrade blocked by another connection'));
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbInstance = null;
        dbPromise = null;
      };
      db.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };
      dbInstance = db;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains(STORE_SAVED)) {
        db.createObjectStore(STORE_SAVED, { keyPath: 'id', autoIncrement: true });
      }

      let selectionStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_SELECTION)) {
        selectionStore = db.createObjectStore(STORE_SELECTION, { keyPath: 'id', autoIncrement: true });
      } else {
        selectionStore = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORE_SELECTION);
      }

      if (!selectionStore.indexNames.contains('idx_content')) {
        selectionStore.createIndex('idx_content', ['type', 'reds', 'blues'], { unique: false });
      }
      if (!selectionStore.indexNames.contains('idx_createdAt')) {
        selectionStore.createIndex('idx_createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }

      if (oldVersion < 4) {
        const transaction = (event.target as IDBOpenDBRequest).transaction!;
        const savedStore = transaction.objectStore(STORE_SAVED);
        const targetStore = transaction.objectStore(STORE_SELECTION);

        const getAllRequest = savedStore.getAll();
        getAllRequest.onsuccess = () => {
          const items = getAllRequest.result as LotteryRecord[];
          for (const item of items) {
            delete item.id;
            targetStore.add({
              ...item,
              isPinned: true,
              multiplier: 1
            });
          }
          savedStore.clear();
        };
      }
    };
  });

  return dbPromise;
};

export const storage = {
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

  async addToSelection(combination: Omit<LotteryRecord, 'id' | 'createdAt'>) {
    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readwrite');
    const store = transaction.objectStore(STORE_SELECTION);
    const index = store.index('idx_content');

    return new Promise((resolve, reject) => {
      const getRequest = index.get([combination.type, combination.reds, combination.blues]);

      getRequest.onsuccess = () => {
        const duplicate = getRequest.result as LotteryRecord;
        if (duplicate) {
          if (combination.isPinned && !duplicate.isPinned) {
            duplicate.isPinned = true;
            const putRequest = store.put(duplicate);
            putRequest.onsuccess = () => resolve(duplicate.id);
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            resolve(null);
          }
          return;
        }

        const record = {
          ...combination,
          createdAt: Date.now(),
          multiplier: combination.multiplier || 1,
          isPinned: combination.isPinned || false
        };
        const addRequest = store.add(record);
        addRequest.onsuccess = () => resolve(addRequest.result);
        addRequest.onerror = () => reject(addRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  },

  async addBatchToSelection(combinations: Omit<LotteryRecord, 'id' | 'createdAt'>[]) {
    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readwrite');
    const store = transaction.objectStore(STORE_SELECTION);
    const index = store.index('idx_content');

    let savedCount = 0;

    return new Promise<{ saved: number; skipped: number }>((resolve, reject) => {
      let processed = 0;
      let skipped = 0;

      if (combinations.length === 0) {
        resolve({ saved: 0, skipped: 0 });
        return;
      }

      const processNext = () => {
        if (processed === combinations.length) {
          resolve({ saved: savedCount, skipped });
          return;
        }

        const combination = combinations[processed];
        const getRequest = index.get([combination.type, combination.reds, combination.blues]);

        getRequest.onsuccess = () => {
          const duplicate = getRequest.result as LotteryRecord;
          if (duplicate) {
            if (combination.isPinned && !duplicate.isPinned) {
              duplicate.isPinned = true;
              const putRequest = store.put(duplicate);
              putRequest.onsuccess = () => {
                savedCount++;
                processed++;
                processNext();
              };
              putRequest.onerror = () => reject(putRequest.error);
            } else {
              skipped++;
              processed++;
              processNext();
            }
          } else {
            const record = {
              ...combination,
              createdAt: Date.now(),
              multiplier: combination.multiplier || 1,
              isPinned: combination.isPinned || false
            };
            const addRequest = store.add(record);
            addRequest.onsuccess = () => {
              savedCount++;
              processed++;
              processNext();
            };
            addRequest.onerror = () => reject(addRequest.error);
          }
        };
        getRequest.onerror = () => reject(getRequest.error);
      };

      processNext();
    });
  },

  async getSelection(): Promise<LotteryRecord[]> {
    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readonly');
    const store = transaction.objectStore(STORE_SELECTION);
    const index = store.index('idx_createdAt');

    return new Promise((resolve, reject) => {
      const sortedResults: LotteryRecord[] = [];
      const cursorRequest = index.openCursor(null, 'prev');
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          sortedResults.push(cursor.value);
          cursor.continue();
        } else {
          resolve(sortedResults);
        }
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
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
    const db = await openDB();
    const transaction = db.transaction(STORE_SELECTION, 'readwrite');
    const store = transaction.objectStore(STORE_SELECTION);
    const index = store.index('idx_content');

    return new Promise<void>((resolve, reject) => {
      const getRequest = index.get([type, reds, blues]);
      getRequest.onsuccess = () => {
        const item = getRequest.result as LotteryRecord;
        if (item && item.id !== undefined) {
          const deleteRequest = store.delete(item.id);
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
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
  }
};

export type { LotteryRecord as SavedCombination };
