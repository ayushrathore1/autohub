import Dexie, { Table } from 'dexie';

// Define the schema for our local IndexedDB
export interface PendingWrite {
  id?: number;
  uuid: string; // Unique ID for the write
  data: any; // The payload to send to the server
  attempts: number;
  lastError?: string;
  timestamp: number;
}

export interface LocalBackup {
  id: string; // 'current_backup'
  data: any; 
  timestamp: number;
}

export class AutoHubStorage extends Dexie {
  pendingWrites!: Table<PendingWrite, number>;
  backups!: Table<LocalBackup, string>;

  constructor() {
    super('AutoHubOfflineDB');
    this.version(1).stores({
      pendingWrites: '++id, uuid, timestamp, attempts',
      backups: 'id'
    });
  }
}

export const offlineDb = new AutoHubStorage();

// background sync mechanism for handling API failures
export class OfflineSyncEngine {
  private syncInProgress = false;

  async saveBackup(data: any): Promise<void> {
    try {
      await offlineDb.backups.put({
        id: 'current_backup',
        data,
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Failed to save large backup to IndexedDB', err);
    }
  }

  async loadBackup(): Promise<any | null> {
    try {
      const backup = await offlineDb.backups.get('current_backup');
      return backup?.data || null;
    } catch (err) {
      console.error('Failed to load backup from IndexedDB', err);
      return null;
    }
  }

  async queueWrite(payload: any): Promise<void> {
    const uuid = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await offlineDb.pendingWrites.add({
      uuid,
      data: payload,
      attempts: 0,
      timestamp: Date.now()
    });
  }

  async processPendingTransfers(transferFn: (payload: any) => Promise<void>): Promise<void> {
    if (this.syncInProgress) return;
    if (!navigator.onLine) return; // Don't try if overtly offline

    // Allow multiple sync processes to back off slightly if called simultaneously
    this.syncInProgress = true;

    try {
      const token = localStorage.getItem('autohub_token');
      if (!token) return; // No user logged in

      const tasks = await offlineDb.pendingWrites.orderBy('timestamp').toArray();

      for (const task of tasks) {
        try {
          await transferFn(task.data);

          // Success, remove from queue
          if (task.id) await offlineDb.pendingWrites.delete(task.id);
        } catch (err: any) {
          console.warn(`Sync failed for pending write ${task.uuid}:`, err.message);

          if (task.attempts >= 5) {
             console.warn('Dropping write after max attempts:', task.uuid);
             if (task.id) await offlineDb.pendingWrites.delete(task.id);
             continue;
          }

          // Update attempt count
          if (task.id) {
            await offlineDb.pendingWrites.update(task.id, {
              attempts: task.attempts + 1,
              lastError: err.message
            });
          }
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }
}

export const syncEngine = new OfflineSyncEngine();