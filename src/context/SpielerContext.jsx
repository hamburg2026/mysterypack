/**
 * Verwaltet die zwei Mitspieler und wer gerade dran ist.
 */
import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'mysterypack_spieler';

export const SPIELER_FARBEN = ['#22c55e', '#3b82f6'];

const STANDARD = {
  spieler: [
    { name: 'Spieler 1', farbe: '#22c55e' },
    { name: 'Spieler 2', farbe: '#3b82f6' },
  ],
  aktiverIndex: 0,
};

function laden() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function speichern(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

const SpielerContext = createContext(null);

export function SpielerProvider({ children }) {
  const [state, setState] = useState(() => laden() ?? STANDARD);

  const wechseln = useCallback(() => {
    setState((prev) => {
      const neu = { ...prev, aktiverIndex: prev.aktiverIndex === 0 ? 1 : 0 };
      speichern(neu);
      return neu;
    });
  }, []);

  const umbenennen = useCallback((index, name) => {
    setState((prev) => {
      const spieler = prev.spieler.map((s, i) => i === index ? { ...s, name: name.trim() || s.name } : s);
      const neu = { ...prev, spieler };
      speichern(neu);
      return neu;
    });
  }, []);

  const setAktiverIndex = useCallback((index) => {
    setState((prev) => {
      if (prev.aktiverIndex === index) return prev;
      const neu = { ...prev, aktiverIndex: index };
      speichern(neu);
      return neu;
    });
  }, []);

  return (
    <SpielerContext.Provider value={{
      spieler:       state.spieler,
      aktiverIndex:  state.aktiverIndex,
      aktiverSpieler: state.spieler[state.aktiverIndex],
      wechseln,
      umbenennen,
      setAktiverIndex,
    }}>
      {children}
    </SpielerContext.Provider>
  );
}

export function useSpieler() {
  const ctx = useContext(SpielerContext);
  if (!ctx) throw new Error('useSpieler muss innerhalb von <SpielerProvider> verwendet werden');
  return ctx;
}
