import { useEffect } from 'react';
import type { Settings } from './settings';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings: s, onChange, onClose }: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...s, [k]: v });

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <label className="row">
          <span>Theme</span>
          <select value={s.theme} onChange={(e) => set('theme', e.target.value as Settings['theme'])}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
        <label className="row">
          <span>Font size <em>{s.fontSize}px</em></span>
          <input type="range" min={32} max={140} step={2} value={s.fontSize} onChange={(e) => set('fontSize', +e.target.value)} />
        </label>
        <label className="row">
          <span>Default speed <em>{s.wpm} WPM</em></span>
          <input type="range" min={50} max={1500} step={10} value={s.wpm} onChange={(e) => set('wpm', +e.target.value)} />
        </label>
        <label className="row">
          <span>Speed step (arrow keys)</span>
          <select value={s.step} onChange={(e) => set('step', +e.target.value)}>
            {[5, 10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} WPM</option>
            ))}
          </select>
        </label>
        <label className="row check"><span>Highlight recognition point</span><input type="checkbox" checked={s.orp} onChange={(e) => set('orp', e.target.checked)} /></label>
        <label className="row check"><span>Pause on punctuation and long words</span><input type="checkbox" checked={s.pauses} onChange={(e) => set('pauses', e.target.checked)} /></label>
        <label className="row check"><span>Show previous and next word</span><input type="checkbox" checked={s.preview} onChange={(e) => set('preview', e.target.checked)} /></label>
        <details className="keys">
          <summary>Keyboard shortcuts</summary>
          <p>Space play/pause · ↑ ↓ speed · ← → word · Home restart · End last word · Page Up/Down page · Esc exit</p>
        </details>
        <button className="primary" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
