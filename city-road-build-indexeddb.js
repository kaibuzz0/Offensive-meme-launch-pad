// Solo-only durable store for the shared inventory + voxel journal record.
// One IndexedDB readwrite transaction atomically compares and replaces the record.
// Multiplayer must use a server-owned transactional database instead.
const DB_NAME = 'meme-city-canonical-build';
const STORE_NAME = 'build-records';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

export async function openSoloBuildStore(indexedDBFactory = globalThis.indexedDB) {
  if (!indexedDBFactory || typeof indexedDBFactory.open !== 'function')
    throw new Error('IndexedDB unavailable; do not fall back to non-atomic localStorage');
  const opening = indexedDBFactory.open(DB_NAME, 1);
  opening.onupgradeneeded = () => {
    const db = opening.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
  };
  const db = await requestResult(opening);
  let closed = false;
  function transaction(mode, operation) {
    if (closed) return Promise.reject(new Error('building store closed'));
    return new Promise((resolve, reject) => {
      let tx;
      try { tx = db.transaction(STORE_NAME, mode); }
      catch (error) { reject(error); return; }
      let result;
      let failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || new Error('building transaction aborted'));
      tx.onerror = () => { failure = tx.error || new Error('building transaction failed'); };
      try { operation(tx.objectStore(STORE_NAME), value => { result = value; }, error => {
        failure = error;
        try { tx.abort(); } catch {}
      }); }
      catch (error) { failure = error; try { tx.abort(); } catch {} }
    });
  }
  return Object.freeze({
    read(key) {
      return transaction('readonly', (store, done, fail) => {
        const req = store.get(key);
        req.onsuccess = () => done(req.result ?? null);
        req.onerror = () => fail(req.error);
      });
    },
    compareAndSwap(key, expectedRevision, next) {
      if (typeof key !== 'string' || !key || key.length > 256 ||
          !Number.isSafeInteger(expectedRevision) || expectedRevision < 0 ||
          !next || next.revision !== expectedRevision + 1)
        return Promise.reject(new TypeError('invalid atomic building write'));
      return transaction('readwrite', (store, done, fail) => {
        const req = store.get(key);
        req.onsuccess = () => {
          const previous = req.result;
          if (!previous || previous.revision !== expectedRevision) { done(false); return; }
          // Keep the world identity immutable across an edit.
          if (previous.seed !== next.seed || previous.version !== next.version) {
            fail(new Error('building world identity mismatch')); return;
          }
          const put = store.put(next, key);
          put.onsuccess = () => done(true);
          put.onerror = () => fail(put.error);
        };
        req.onerror = () => fail(req.error);
      });
    },
    // Initial record is created only when absent. No existing/future save overwritten.
    initialize(key, initial) {
      if (typeof key !== 'string' || !key || key.length > 256 ||
          !initial || initial.revision !== 0 || typeof initial.seed !== 'string' ||
          !initial.seed || !initial.journal || !initial.inventory)
        return Promise.reject(new TypeError('invalid initial building record'));
      return transaction('readwrite', (store, done, fail) => {
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result !== undefined) { done(false); return; }
          const add = store.add(initial, key);
          add.onsuccess = () => done(true);
          add.onerror = () => fail(add.error);
        };
        req.onerror = () => fail(req.error);
      });
    },
    close() { closed = true; db.close(); }
  });
}
