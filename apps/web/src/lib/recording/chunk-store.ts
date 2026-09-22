// Buffers MediaRecorder chunks in IndexedDB instead of a plain JS array,
// so a long recording doesn't hold its entire video in tab memory (and
// risk crashing the tab) while it's being captured. The video is only
// ever reassembled into one Blob at the very end, in readAllInOrder.
//
// Every write is chained through a single queue — first the leftover
// contents of a previous, interrupted session get cleared, then each
// chunk is added in the order MediaRecorder produced it. Reads wait for
// that queue to drain so nothing in flight is missed.

const DB_NAME = "screen-recorder-chunks";
const STORE_NAME = "chunks";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runInTransaction(db: IDBDatabase, mode: IDBTransactionMode, run: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    run(tx.objectStore(STORE_NAME));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface ChunkStore {
  add: (chunk: Blob) => void;
  /** Waits for every queued write, then returns the chunks in write order. */
  readAllInOrder: () => Promise<Blob[]>;
  /** Waits for every queued write, then empties the store. */
  clear: () => Promise<void>;
}

export function createChunkStore(): ChunkStore {
  const dbPromise = openDb();
  let queue: Promise<void> = dbPromise.then((db) => runInTransaction(db, "readwrite", (store) => store.clear()));

  function add(chunk: Blob) {
    queue = queue.then(() => dbPromise.then((db) => runInTransaction(db, "readwrite", (store) => store.add(chunk))));
  }

  async function readAllInOrder(): Promise<Blob[]> {
    await queue;
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const results: Blob[] = [];
      const tx = db.transaction(STORE_NAME, "readonly");
      const cursorRequest = tx.objectStore(STORE_NAME).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          resolve(results);
          return;
        }
        results.push(cursor.value as Blob);
        cursor.continue();
      };
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  }

  async function clear(): Promise<void> {
    await queue;
    const db = await dbPromise;
    await runInTransaction(db, "readwrite", (store) => store.clear());
  }

  return { add, readAllInOrder, clear };
}
