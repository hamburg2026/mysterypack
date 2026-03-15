/**
 * Gemeinsame Liga- und Saison-Auswahl für die gesamte App.
 * TrikotDatenbank und Shop lesen beide aus diesem Context.
 */
import { createContext, useContext, useState, useCallback } from 'react';

export const LIGEN = [
  { id: 'cl',  name: 'Champions League', land: 'Europa',       icon: '🏆', apiId: 2   },
  { id: 'bl',  name: 'Bundesliga',        land: 'Deutschland',  icon: '🇩🇪', apiId: 78  },
  { id: 'la',  name: 'La Liga',           land: 'Spanien',      icon: '🇪🇸', apiId: 140 },
  { id: 'pl',  name: 'Premier League',    land: 'England',      icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', apiId: 39  },
];

export const SAISONS = Array.from({ length: 15 }, (_, i) => {
  const start = 2024 - i;
  return `${start}/${String(start + 1).slice(-2)}`;
});

const STORAGE_KEY = 'mysterypack_liga_auswahl';

function laden() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

const LigaContext = createContext(null);

export function LigaProvider({ children }) {
  const saved = laden();
  const [ligaId, setLigaIdState] = useState(saved?.ligaId ?? 'cl');
  const [saison, setSaisonState] = useState(saved?.saison  ?? '2024/25');

  const liga = LIGEN.find((l) => l.id === ligaId) ?? LIGEN[0];

  const setLiga = useCallback((id) => {
    setLigaIdState(id);
    setSaisonState((prev) => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ligaId: id, saison: prev })); } catch {}
      return prev;
    });
  }, []);

  const setSaison = useCallback((s) => {
    setSaisonState(s);
    setLigaIdState((prev) => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ligaId: prev, saison: s })); } catch {}
      return prev;
    });
  }, []);

  return (
    <LigaContext.Provider value={{ liga, ligaId, setLiga, saison, setSaison, saisons: SAISONS }}>
      {children}
    </LigaContext.Provider>
  );
}

export function useLiga() {
  const ctx = useContext(LigaContext);
  if (!ctx) throw new Error('useLiga muss innerhalb von <LigaProvider> verwendet werden');
  return ctx;
}
