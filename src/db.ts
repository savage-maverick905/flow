export interface DocMeta {
  id: string;
  name: string;
  pages: number;
  words: number;
  position: number;
  wpm?: number;
  addedAt: number;
  openedAt: number;
}
export interface DocText {
  id: string;
  text: string; // all words joined by single spaces
  pageStarts: number[]; // index of the first word of each page
}

let dbp: Promise<IDBDatabase> | null = null;
const db = () =>
  (dbp ??= new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('flow', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('meta', { keyPath: 'id' });
      r.result.createObjectStore('text', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));

async function run<T>(stores: string[], mode: IDBTransactionMode, fn: (t: IDBTransaction) => IDBRequest | void): Promise<T> {
  const d = await db();
  return new Promise<T>((res, rej) => {
    const t = d.transaction(stores, mode);
    const r = fn(t);
    t.oncomplete = () => res((r ? r.result : undefined) as T);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}

export const listDocs = () => run<DocMeta[]>(['meta'], 'readonly', (t) => t.objectStore('meta').getAll());
export const getMeta = (id: string) => run<DocMeta | undefined>(['meta'], 'readonly', (t) => t.objectStore('meta').get(id));
export const getText = (id: string) => run<DocText | undefined>(['text'], 'readonly', (t) => t.objectStore('text').get(id));

export const saveDoc = (m: DocMeta, x: DocText) =>
  run<void>(['meta', 'text'], 'readwrite', (t) => {
    t.objectStore('meta').put(m);
    t.objectStore('text').put(x);
  });

export async function patchMeta(id: string, p: Partial<DocMeta>) {
  const m = await getMeta(id);
  if (m) await run<void>(['meta'], 'readwrite', (t) => { t.objectStore('meta').put({ ...m, ...p }); });
}

export const deleteDoc = (id: string) =>
  run<void>(['meta', 'text'], 'readwrite', (t) => {
    t.objectStore('meta').delete(id);
    t.objectStore('text').delete(id);
  });
