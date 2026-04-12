// Browser-based storage using IndexedDB
const DB_NAME = 'LotteryToolsDB';
const DB_VERSION = 2; // Increment version for new store
const STORE_SAVED = 'saved_combinations';
const STORE_CART = 'cart_combinations';

export interface LotteryRecord {
  id?: number;
  type: 'SSQ' | 'DLT';
  reds: string;
  blues: string;
  toolUsed: 'REDUCER' | 'REVERSE' | 'RANDOM';
  createdAt: number;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SAVED)) {
        db.createObjectStore(STORE_SAVED, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_CART)) {
        db.createObjectStore(STORE_CART, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

export const storage = {
  // Saved Combinations (Permanent)
  async save(combination: Omit<LotteryRecord, 'id' | 'createdAt'>) {
    const db = await openDB();
    const transaction = db.transaction(STORE_SAVED, 'readwrite');
    const store = transaction.objectStore(STORE_SAVED);
    return new Promise((resolve, reject) => {
      const request = store.add({ ...combination, createdAt: Date.now() });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getAllSaved(): Promise<LotteryRecord[]> {
    const db = await openDB();
    const transaction = db.transaction(STORE_SAVED, 'readonly');
    const store = transaction.objectStore(STORE_SAVED);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    });
  },

  async deleteSaved(id: number) {
    const db = await openDB();
    const transaction = db.transaction(STORE_SAVED, 'readwrite');
    const store = transaction.objectStore(STORE_SAVED);
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteSavedByContent(type: string, reds: string, blues: string) {
    const db = await openDB();
    const items = await this.getAllSaved();
    const item = items.find(i => i.type === type && i.reds === reds && i.blues === blues);
    if (item && item.id !== undefined) {
      return this.deleteSaved(item.id);
    }
  },

  // Cart Logic (Temporary Selection)
  async addToCart(combination: Omit<LotteryRecord, 'id' | 'createdAt'>) {
    const db = await openDB();
    
    // Check for duplicates first
    const existing = await this.getCart();
    const isDuplicate = existing.some(item => 
      item.type === combination.type && 
      item.reds === combination.reds && 
      item.blues === combination.blues
    );

    if (isDuplicate) {
      return null; // Or throw error, but null is safer for batch ops
    }

    const transaction = db.transaction(STORE_CART, 'readwrite');
    const store = transaction.objectStore(STORE_CART);
    return new Promise((resolve, reject) => {
      const request = store.add({ ...combination, createdAt: Date.now() });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async getCart(): Promise<LotteryRecord[]> {
    const db = await openDB();
    const transaction = db.transaction(STORE_CART, 'readonly');
    const store = transaction.objectStore(STORE_CART);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async removeFromCart(id: number) {
    const db = await openDB();
    const transaction = db.transaction(STORE_CART, 'readwrite');
    const store = transaction.objectStore(STORE_CART);
    return new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async removeFromCartByContent(type: string, reds: string, blues: string) {
    const db = await openDB();
    const items = await this.getCart();
    const item = items.find(i => i.type === type && i.reds === reds && i.blues === blues);
    if (item && item.id !== undefined) {
      return this.removeFromCart(item.id);
    }
  },

  async clearCart() {
    const db = await openDB();
    const transaction = db.transaction(STORE_CART, 'readwrite');
    const store = transaction.objectStore(STORE_CART);
    return new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};

export type { LotteryRecord as SavedCombination };
