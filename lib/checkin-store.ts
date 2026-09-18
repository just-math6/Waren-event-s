import { emptyScanCache, type ScanCache } from './checkin';

// One record per admin/event. Read-modify-write transactions serialize across tabs.
export async function changeScanCache(key: string, change: (state: ScanCache) => ScanCache): Promise<ScanCache> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('waren-checkin', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('events');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<ScanCache>((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const request = store.get(key);
      let next: ScanCache;
      request.onsuccess = () => {
        try { next = change(request.result ?? emptyScanCache()); store.put(next, key); }
        catch { tx.abort(); }
      };
      tx.oncomplete = () => resolve(next);
      tx.onerror = () => reject(tx.error ?? new Error('Stockage indisponible'));
      tx.onabort = () => reject(tx.error ?? new Error('Stockage indisponible'));
    });
  } finally { db.close(); }
}
