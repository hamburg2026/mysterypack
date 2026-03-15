import { createContext, useContext, useState, useCallback } from 'react';

export const LIGEN = [
  { id: 'cl',  name: 'Champions League', land: 'Europa',       icon: '🏆', apiId: 2   },
  { id: 'bl',  name: 'Bundesliga',        land: 'Deutschland',  icon: '🇩🇪', apiId: 78  },
  { id: 'la',  name: 'La Liga',           land: 'Spanien',      icon: '🇪🇸', apiId: 140 },
  { id: 'pl',  name: 'Premier League',    land: 'England',      icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', apiId: 39  },
];

const STORAGE_KEY = 'mysterypack_liga_auswahl';

const LigaContext = createContext(null);

export function LigaProvider({ children }) {
  const [ligaId, setLigaIdState] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY))?.ligaId ?? 'cl'; } catch { return 'cl'; }
  });

  const liga = LIGEN.find((l) => l.id === ligaId) ?? LIGEN[0];

  const setLiga = useCallback((id) => {
    setLigaIdState(id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ligaId: id })); } catch {}
  }, []);

  return (
    <LigaContext.Provider value={{ liga, ligaId, setLiga }}>
      {children}
    </LigaContext.Provider>
  );
}

export function useLiga() {
  const ctx = useContext(LigaContext);
  if (!ctx) throw new Error('useLiga muss innerhalb von <LigaProvider> verwendet werden');
  return ctx;
}
