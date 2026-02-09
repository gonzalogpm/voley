
import { User, Player, Team, Tournament, Match, WhiteboardState } from '../types';

const DB_NAME = 'VolleyCoachDB';
const DB_VERSION = 2;

export class LocalDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('players')) {
          const s = db.createObjectStore('players', { keyPath: 'id' });
          s.createIndex('userId', 'userId', { unique: false });
        }
        if (!db.objectStoreNames.contains('teams')) {
          const s = db.createObjectStore('teams', { keyPath: 'id' });
          s.createIndex('userId', 'userId', { unique: false });
        }
        if (!db.objectStoreNames.contains('tournaments')) {
          const s = db.createObjectStore('tournaments', { keyPath: 'id' });
          s.createIndex('userId', 'userId', { unique: false });
        }
        if (!db.objectStoreNames.contains('matches')) {
          const s = db.createObjectStore('matches', { keyPath: 'id' });
          s.createIndex('userId', 'userId', { unique: false });
        }
        if (!db.objectStoreNames.contains('whiteboard')) {
          db.createObjectStore('whiteboard', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        
        // Seed initial admin if missing
        const tx = this.db.transaction('users', 'readwrite');
        const store = tx.objectStore('users');
        const checkRequest = store.get('admin-1');
        
        checkRequest.onsuccess = () => {
          if (!checkRequest.result) {
            store.add({
              id: 'admin-1',
              email: 'admin',
              password: 'admin',
              role: 'admin',
              createdAt: Date.now()
            });
          }
        };
        
        resolve(this.db);
      };

      request.onerror = (e) => reject(e);
    });
  }

  async perform<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest | void): Promise<T> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = action(store);

      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        tx.oncomplete = () => resolve(true as any);
        tx.onerror = () => reject(tx.error);
      }
    });
  }

  async getAllByUserId<T>(storeName: string, userId: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index('userId');
      const request = index.getAll(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new LocalDB();
