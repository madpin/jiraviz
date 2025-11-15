/**
 * IndexedDB Storage Service
 * 
 * Provides persistent storage for:
 * - SQL.js database (binary blob)
 * - Application configuration
 * - User preferences
 * 
 * Storage capacity: 50-500MB (vs localStorage's 5-10MB)
 */

const DB_NAME = 'jiraviz';
const DB_VERSION = 1;

// Object store names
const STORES = {
  DATABASE: 'database',
  CONFIG: 'config',
  PREFERENCES: 'preferences',
} as const;

// Keys for singleton records
const KEYS = {
  DATABASE: 'main',
  CONFIG: 'main',
  PREFERENCES: 'main',
} as const;

class IndexedDBService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private available: boolean = true;

  /**
   * Check if IndexedDB is available in this browser/context
   */
  isAvailable(): boolean {
    if (typeof indexedDB === 'undefined') {
      this.available = false;
      return false;
    }

    // Check if we're in a context where IndexedDB might be disabled
    // (e.g., private browsing in some browsers)
    try {
      // Try to open a test database
      const testRequest = indexedDB.open('__test__');
      testRequest.onerror = () => {
        this.available = false;
      };
      testRequest.onsuccess = () => {
        const db = testRequest.result;
        db.close();
        indexedDB.deleteDatabase('__test__');
      };
    } catch (e) {
      this.available = false;
      return false;
    }

    return this.available;
  }

  /**
   * Open or create the IndexedDB database
   */
  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error('IndexedDB is not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        this.available = false;
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;
        
        // Handle unexpected close
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };

        resolve(db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORES.DATABASE)) {
          db.createObjectStore(STORES.DATABASE);
          console.log('✅ Created database object store');
        }

        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          db.createObjectStore(STORES.CONFIG);
          console.log('✅ Created config object store');
        }

        if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
          db.createObjectStore(STORES.PREFERENCES);
          console.log('✅ Created preferences object store');
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Save SQL.js database as binary blob
   */
  async saveDatabase(data: Uint8Array): Promise<void> {
    if (!this.available) {
      throw new Error('IndexedDB not available');
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORES.DATABASE], 'readwrite');
      const store = transaction.objectStore(STORES.DATABASE);

      return new Promise((resolve, reject) => {
        const request = store.put(data, KEYS.DATABASE);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to save database to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Load SQL.js database from IndexedDB
   */
  async loadDatabase(): Promise<Uint8Array | null> {
    if (!this.available) {
      return null;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORES.DATABASE], 'readonly');
      const store = transaction.objectStore(STORES.DATABASE);

      return new Promise((resolve, reject) => {
        const request = store.get(KEYS.DATABASE);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result instanceof Uint8Array ? result : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load database from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Save application configuration
   */
  async saveConfig(config: any): Promise<void> {
    if (!this.available) {
      throw new Error('IndexedDB not available');
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORES.CONFIG], 'readwrite');
      const store = transaction.objectStore(STORES.CONFIG);

      return new Promise((resolve, reject) => {
        const request = store.put(config, KEYS.CONFIG);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to save config to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Load application configuration
   */
  async loadConfig(): Promise<any> {
    if (!this.available) {
      return null;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORES.CONFIG], 'readonly');
      const store = transaction.objectStore(STORES.CONFIG);

      return new Promise((resolve, reject) => {
        const request = store.get(KEYS.CONFIG);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load config from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Delete application configuration
   */
  async deleteConfig(): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORES.CONFIG], 'readwrite');
      const store = transaction.objectStore(STORES.CONFIG);

      return new Promise((resolve, reject) => {
        const request = store.delete(KEYS.CONFIG);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to delete config from IndexedDB:', error);
    }
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: any): Promise<void> {
    if (!this.available) {
      throw new Error('IndexedDB not available');
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORES.PREFERENCES], 'readwrite');
      const store = transaction.objectStore(STORES.PREFERENCES);

      return new Promise((resolve, reject) => {
        const request = store.put(preferences, KEYS.PREFERENCES);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to save preferences to IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Load user preferences
   */
  async loadPreferences(): Promise<any> {
    if (!this.available) {
      return null;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORES.PREFERENCES], 'readonly');
      const store = transaction.objectStore(STORES.PREFERENCES);

      return new Promise((resolve, reject) => {
        const request = store.get(KEYS.PREFERENCES);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to load preferences from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Get storage quota information using Storage API
   */
  async getStorageInfo(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const total = estimate.quota || 0;
        const percentage = total > 0 ? (used / total) * 100 : 0;

        return { used, total, percentage };
      }
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }

    // Fallback values
    return { used: 0, total: 50 * 1024 * 1024, percentage: 0 }; // Assume 50MB
  }

  /**
   * Clear only the database store (tickets), preserving config and preferences
   */
  async clearDatabaseOnly(): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction([STORES.DATABASE], 'readwrite');
      const databaseStore = transaction.objectStore(STORES.DATABASE);

      return new Promise((resolve, reject) => {
        databaseStore.clear();

        transaction.oncomplete = () => {
          console.log('✅ Cleared ticket database (config and preferences preserved)');
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to clear database store from IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Clear all data from IndexedDB
   */
  async clearAll(): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      const db = await this.openDB();
      const transaction = db.transaction(
        [STORES.DATABASE, STORES.CONFIG, STORES.PREFERENCES],
        'readwrite'
      );

      const databaseStore = transaction.objectStore(STORES.DATABASE);
      const configStore = transaction.objectStore(STORES.CONFIG);
      const preferencesStore = transaction.objectStore(STORES.PREFERENCES);

      return new Promise((resolve, reject) => {
        databaseStore.clear();
        configStore.clear();
        preferencesStore.clear();

        transaction.oncomplete = () => {
          console.log('✅ Cleared all IndexedDB data');
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
      throw error;
    }
  }
}

// Singleton instance
export const indexedDBService = new IndexedDBService();

