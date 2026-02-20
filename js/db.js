/* ═══════════════════════════════════════════════
   SafeHer — Shared IndexedDB Engine
   Database: SafeHerDB v2
   Stores: recordings (v1), history (v2)
   ═══════════════════════════════════════════════ */

const DB_NAME    = 'SafeHerDB';
const DB_VERSION = 2;
const HISTORY_STORE = 'history';

let db = null;

/* ══════════════════════════════════════════
   openDB()  — opens / upgrades SafeHerDB
   v1 → recordings store
   v2 → + history store with indexes
   ══════════════════════════════════════════ */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const database = e.target.result;

      /* v1 — recordings (keep existing data) */
      if (!database.objectStoreNames.contains('recordings')) {
        database.createObjectStore('recordings', { keyPath: 'id', autoIncrement: true });
      }

      /* v2 — history */
      if (!database.objectStoreNames.contains(HISTORY_STORE)) {
        const store = database.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
        store.createIndex('by_type',      'type',      { unique: false });
        store.createIndex('by_severity',  'severity',  { unique: false });
      }
    };

    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = ()  => reject(req.error);
  });
}

/* ══════════════════════════════════════════
   saveHistoryEvent(event)
   ══════════════════════════════════════════ */
export async function saveHistoryEvent(event) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(HISTORY_STORE, 'readwrite');
    tx.objectStore(HISTORY_STORE).put(event);
    tx.oncomplete = () => resolve(event);
    tx.onerror    = () => reject(tx.error);
  });
}

/* ══════════════════════════════════════════
   getAllHistory()  — newest first
   ══════════════════════════════════════════ */
export async function getAllHistory() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = database.transaction(HISTORY_STORE, 'readonly');
    const req = tx.objectStore(HISTORY_STORE).getAll();
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
    req.onerror   = () => reject(req.error);
  });
}

/* ══════════════════════════════════════════
   getHistoryByType(type)
   ══════════════════════════════════════════ */
export async function getHistoryByType(type) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = database.transaction(HISTORY_STORE, 'readonly');
    const index = tx.objectStore(HISTORY_STORE).index('by_type');
    const req   = index.getAll(type);
    req.onsuccess = () => resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
    req.onerror   = () => reject(req.error);
  });
}

/* ══════════════════════════════════════════
   getHistoryStats()
   Returns { total, critical, warning, info, safe, last24h, last7d }
   ══════════════════════════════════════════ */
export async function getHistoryStats() {
  const all = await getAllHistory();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return {
    total:    all.length,
    critical: all.filter(e => e.severity === 'critical').length,
    warning:  all.filter(e => e.severity === 'warning').length,
    info:     all.filter(e => e.severity === 'info').length,
    safe:     all.filter(e => e.severity === 'safe').length,
    last24h:  all.filter(e => now - e.timestamp < day).length,
    last7d:   all.filter(e => now - e.timestamp < 7 * day).length
  };
}

/* ══════════════════════════════════════════
   updateHistoryEvent(id, updates)
   ══════════════════════════════════════════ */
export async function updateHistoryEvent(id, updates) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = database.transaction(HISTORY_STORE, 'readwrite');
    const store = tx.objectStore(HISTORY_STORE);
    const req   = store.get(id);
    req.onsuccess = () => {
      const existing = req.result;
      if (!existing) { reject(new Error('Event not found')); return; }
      const updated = { ...existing, ...updates };
      store.put(updated);
      tx.oncomplete = () => resolve(updated);
    };
    tx.onerror = () => reject(tx.error);
  });
}

/* ══════════════════════════════════════════
   deleteHistoryEvent(id)
   ══════════════════════════════════════════ */
export async function deleteHistoryEvent(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(HISTORY_STORE, 'readwrite');
    tx.objectStore(HISTORY_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/* ══════════════════════════════════════════
   clearAllHistory()
   ══════════════════════════════════════════ */
export async function clearAllHistory() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(HISTORY_STORE, 'readwrite');
    tx.objectStore(HISTORY_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/* ══════════════════════════════════════════
   getHistoryCount()
   ══════════════════════════════════════════ */
export async function getHistoryCount() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = database.transaction(HISTORY_STORE, 'readonly');
    const req = tx.objectStore(HISTORY_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
