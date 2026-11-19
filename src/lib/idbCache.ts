const DB_NAME = "wclviewer-cache-v1";
const STORE_NAME = "wclf-archives";
const MAX_CACHED_ENTRIES = 40;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "fightUid" });
        store.createIndex("cachedAt", "cachedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedWclf(fightUid: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(fightUid);
      req.onsuccess = () => resolve(req.result?.buffer ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function putCachedWclf(fightUid: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ fightUid, buffer, cachedAt: Date.now() });

      const countReq = store.count();
      countReq.onsuccess = () => {
        if (countReq.result > MAX_CACHED_ENTRIES) {
          const idx = store.index("cachedAt");
          const cursorReq = idx.openCursor();
          let toDelete = countReq.result - MAX_CACHED_ENTRIES;
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (cursor && toDelete > 0) {
              cursor.delete();
              toDelete -= 1;
              cursor.continue();
            }
          };
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore storage quota errors cleanly
  }
}
