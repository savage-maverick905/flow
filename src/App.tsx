import { useEffect, useState } from 'react';
import Home from './Home';
import Reader from './Reader';
import SettingsPanel from './SettingsPanel';
import { loadSettings, saveSettings, type Settings } from './settings';

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [view, setView] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const update = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    navigator.storage?.persist?.().catch(() => {});
    const back = () => setView(null);
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, []);

  const open = (id: string) => {
    history.pushState({ reader: 1 }, '');
    setView(id);
  };
  const exit = () => {
    if (history.state?.reader) history.back();
    else setView(null);
  };

  return (
    <>
      {view ? (
        <Reader key={view} id={view} settings={settings} blocked={showSettings} onExit={exit} onSettings={() => setShowSettings(true)} />
      ) : (
        <Home onOpen={open} onSettings={() => setShowSettings(true)} />
      )}
      {showSettings && <SettingsPanel settings={settings} onChange={update} onClose={() => setShowSettings(false)} />}
    </>
  );
}
