import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getMeta, getText, patchMeta } from './db';
import { clampWpm, type Settings } from './settings';
import { delayFor, splitWord } from './rsvp';

interface Loaded {
  name: string;
  words: string[];
  starts: number[];
}
interface Props {
  id: string;
  settings: Settings;
  blocked: boolean;
  onExit: () => void;
  onSettings: () => void;
}

const pageOf = (starts: number[], i: number) => {
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const m = (lo + hi + 1) >> 1;
    if (starts[m] <= i) lo = m;
    else hi = m - 1;
  }
  return lo;
};

export default function Reader({ id, settings, blocked, onExit, onSettings }: Props) {
  const [d, setD] = useState<Loaded | null>(null);
  const [idx, setIdx] = useState(0);
  const [wpm, setWpm] = useState(settings.wpm);
  const [playing, setPlaying] = useState(false);

  // Mutable mirror of state so timers and key handlers always see current values.
  const R = useRef({ idx: 0, wpm: settings.wpm, n: 0, starts: [] as number[], s: settings, blocked, playing, exit: onExit });
  R.current.s = settings;
  R.current.blocked = blocked;
  R.current.playing = playing;
  R.current.exit = onExit;

  const go = (i: number) => {
    const v = Math.max(0, Math.min(R.current.n - 1, i));
    R.current.idx = v;
    setIdx(v);
  };
  const speed = (delta: number) => {
    const v = clampWpm(R.current.wpm + delta);
    R.current.wpm = v;
    setWpm(v);
  };
  const toggle = () => {
    if (!R.current.n) return;
    if (!R.current.playing && R.current.idx >= R.current.n - 1) go(0);
    setPlaying((p) => !p);
  };
  const save = () => {
    if (R.current.n) patchMeta(id, { position: R.current.idx, wpm: R.current.wpm, openedAt: Date.now() });
  };

  // Load document
  useEffect(() => {
    let live = true;
    (async () => {
      const [m, t] = await Promise.all([getMeta(id), getText(id)]);
      if (!live) return;
      if (!m || !t) return R.current.exit();
      const words = t.text.split(' ');
      const start = Math.min(m.position, words.length - 1);
      R.current.n = words.length;
      R.current.starts = t.pageStarts;
      R.current.idx = start;
      R.current.wpm = m.wpm ?? settings.wpm;
      setWpm(R.current.wpm);
      setIdx(start);
      setD({ name: m.name, words, starts: t.pageStarts });
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-save progress
  useEffect(() => {
    if (!d) return;
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, wpm, d]);
  useEffect(() => {
    const f = () => save();
    window.addEventListener('pagehide', f);
    document.addEventListener('visibilitychange', f);
    return () => {
      window.removeEventListener('pagehide', f);
      document.removeEventListener('visibilitychange', f);
      save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Playback loop: drift-corrected, reads the live WPM before every word.
  useEffect(() => {
    if (!playing || !d) return;
    let timer = 0;
    let target = performance.now();
    const step = () => {
      const r = R.current;
      target += delayFor(d.words[r.idx], r.wpm, r.s.pauses);
      const now = performance.now();
      if (target < now - 150) target = now;
      timer = window.setTimeout(() => {
        go(r.idx + 1);
        if (r.idx >= r.n - 1) return setPlaying(false);
        step();
      }, Math.max(0, target - now));
    };
    step();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, d]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const r = R.current;
      const t = e.target as HTMLElement | null;
      if (r.blocked || e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      const s = r.starts;
      const cur = pageOf(s, r.idx);
      switch (e.key) {
        case 'ArrowUp': speed(r.s.step); break;
        case 'ArrowDown': speed(-r.s.step); break;
        case 'ArrowLeft': go(r.idx - 1); break;
        case 'ArrowRight': go(r.idx + 1); break;
        case ' ': toggle(); break;
        case 'Home': go(0); break;
        case 'End': go(r.n - 1); setPlaying(false); break;
        case 'PageUp': {
          const prev = s.filter((x) => x < s[cur]);
          go(prev.length ? prev[prev.length - 1] : 0);
          break;
        }
        case 'PageDown': {
          const next = s.find((x) => x > s[cur] && x < r.n);
          if (next !== undefined) go(next);
          break;
        }
        case 'Escape': r.exit(); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!d) return <div className="reader center">Loading…</div>;

  const n = d.words.length;
  const page = pageOf(d.starts, idx) + 1;
  const pct = n > 1 ? Math.round((idx / (n - 1)) * 100) : 100;
  const [a, p, b] = splitWord(d.words[idx]);
  const side = Math.max(1, Math.max(a.length, b.length + 1) * 0.62);
  const step = settings.step;

  return (
    <div className="reader" style={{ '--fs': `${settings.fontSize}px` } as CSSProperties}>
      <header className="bar">
        <button className="ghost" onClick={onExit} aria-label="Back to library">← Library</button>
        <div className="title">{d.name}</div>
        <button className="ghost" onClick={onSettings}>Settings</button>
      </header>

      <main className="stage" onClick={toggle}>
        <div className="ctx">{settings.preview ? d.words[idx - 1] ?? '\u00a0' : '\u00a0'}</div>
        <div className="word" style={{ fontSize: `min(var(--fs), calc(46vw / ${side.toFixed(2)}))` }}>
          <span className="l">{a}</span>
          <span className={settings.orp ? 'p orp' : 'p'}>{p}</span>
          <span className="r">{b}</span>
        </div>
        <div className="ctx">{settings.preview ? d.words[idx + 1] ?? '\u00a0' : '\u00a0'}</div>
      </main>

      <footer className="dock">
        <input
          className="seek"
          type="range"
          min={0}
          max={Math.max(0, n - 1)}
          value={idx}
          onChange={(e) => go(+e.target.value)}
          onPointerUp={(e) => e.currentTarget.blur()}
          aria-label="Reading position"
        />
        <div className="stats">
          <span>Page {page} of {d.starts.length}</span>
          <span>{pct}%</span>
          <span>{(idx + 1).toLocaleString()} / {n.toLocaleString()} words</span>
        </div>
        <div className="controls">
          <div className="wpm">
            <button onClick={() => speed(-step)} aria-label="Slower">−</button>
            <div><b>{wpm}</b><small>WPM</small></div>
            <button onClick={() => speed(step)} aria-label="Faster">+</button>
          </div>
          <div className="transport">
            <button onClick={() => go(idx - 1)} aria-label="Previous word">‹</button>
            <button className="primary play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
            <button onClick={() => go(idx + 1)} aria-label="Next word">›</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
