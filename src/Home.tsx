import { useEffect, useRef, useState, type DragEvent } from 'react';
import { deleteDoc, listDocs, saveDoc, type DocMeta } from './db';
import { extractPdf } from './pdf';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pct = (d: DocMeta) => (d.words > 1 ? Math.round((d.position / (d.words - 1)) * 100) : 0);

export default function Home({ onOpen, onSettings }: { onOpen: (id: string) => void; onSettings: () => void }) {
  const [docs, setDocs] = useState<DocMeta[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const refresh = () => listDocs().then((d) => setDocs(d.sort((a, b) => b.openedAt - a.openedAt)));
  useEffect(() => {
    refresh();
  }, []);

  async function importFile(f: File | undefined) {
    if (!f || busy) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
      setErr('That file is not a PDF. Choose a file ending in .pdf.');
      return;
    }
    setErr('');
    setProg(0);
    setBusy(f.name);
    try {
      const r = await extractPdf(f, setProg);
      if (r.count < 10) throw new Error('NO_TEXT');
      const id = uid();
      const now = Date.now();
      await saveDoc(
        { id, name: f.name.replace(/\.pdf$/i, ''), pages: r.pages, words: r.count, position: 0, addedAt: now, openedAt: now },
        { id, text: r.text, pageStarts: r.pageStarts }
      );
      setBusy(null);
      onOpen(id);
      return;
    } catch (e) {
      const x = e as Error;
      setErr(
        x.message === 'NO_TEXT'
          ? 'This PDF has no selectable text. It is probably a scan or images. Flow cannot read it without OCR; export a text-based PDF instead.'
          : x.name === 'PasswordException'
          ? 'This PDF is password-protected. Remove the password and import it again.'
          : 'Could not read this PDF. The file may be damaged.'
      );
    }
    setBusy(null);
    refresh();
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    importFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="home">
      <header className="top">
        <h1>Flow<i /></h1>
        <button className="ghost" onClick={onSettings}>Settings</button>
      </header>

      <div
        className={'drop' + (drag ? ' on' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {busy ? (
          <div className="extract">
            <p>Extracting text from {busy}</p>
            <div className="bar-track"><div style={{ width: `${Math.round(prog * 100)}%` }} /></div>
            <small>{Math.round(prog * 100)}%</small>
          </div>
        ) : (
          <>
            <p>Drop a PDF here to read it one word at a time</p>
            <button className="primary" onClick={() => input.current?.click()}>Import PDF</button>
          </>
        )}
        <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      {err && <p className="err" role="alert">{err}</p>}

      <h2 className="sub">Recent documents</h2>
      {docs && docs.length === 0 && <p className="empty">Nothing here yet. Imported PDFs stay on this device.</p>}
      <ul className="docs">
        {docs?.map((d) => (
          <li key={d.id} onClick={() => onOpen(d.id)}>
            <div className="info">
              <b>{d.name}</b>
              <small>{d.pages} pages, {d.words.toLocaleString()} words</small>
              <div className="bar-track"><div style={{ width: `${pct(d)}%` }} /></div>
            </div>
            <span className="pc">{pct(d)}%</span>
            <button className="primary" onClick={(e) => { e.stopPropagation(); onOpen(d.id); }}>{d.position > 0 ? 'Resume' : 'Read'}</button>
            <button
              className="ghost"
              aria-label={`Delete ${d.name}`}
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm(`Delete “${d.name}”?`)) {
                  await deleteDoc(d.id);
                  refresh();
                }
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
