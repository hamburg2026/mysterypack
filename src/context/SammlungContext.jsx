/**
 * Globaler State für "Meine Sammlung" – je Mitspieler getrennt.
 *
 * Verwendung:
 *   import { useSammlung } from '../context/SammlungContext';
 *   const { sammlung, hinzufuegen } = useSammlung();      // aktiver Spieler
 *   const { sammlungVon }           = useSammlung();      // beliebiger Spieler
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { useSpieler } from './SpielerContext';

const STORAGE_KEY = 'mysterypack_sammlungen';

function laden() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: altes Format war ein einzelnes Array → Spieler 0
      if (Array.isArray(parsed)) return { 0: parsed, 1: [] };
      return parsed;
    }
    // Migration aus altem Key
    const alt = localStorage.getItem('mysterypack_sammlung');
    if (alt) {
      const parsed = JSON.parse(alt);
      if (Array.isArray(parsed)) return { 0: parsed, 1: [] };
    }
  } catch {}
  return { 0: [], 1: [] };
}

function speichern(sammlungen) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sammlungen)); } catch {}
}

const SammlungContext = createContext(null);

export function SammlungProvider({ children }) {
  const { aktiverIndex } = useSpieler();
  const [sammlungen, setSammlungen] = useState(laden);

  const sammlung = sammlungen[aktiverIndex] ?? [];

  const hinzufuegen = useCallback((item) => {
    setSammlungen((prev) => {
      const current = prev[aktiverIndex] ?? [];
      const neu = {
        ...prev,
        [aktiverIndex]: [
          { ...item, id: Date.now() + Math.random(), gezogenAm: new Date().toISOString() },
          ...current,
        ],
      };
      speichern(neu);
      return neu;
    });
  }, [aktiverIndex]);

  const loeschen = useCallback((id) => {
    setSammlungen((prev) => {
      const current = prev[aktiverIndex] ?? [];
      const neu = { ...prev, [aktiverIndex]: current.filter((i) => i.id !== id) };
      speichern(neu);
      return neu;
    });
  }, [aktiverIndex]);

  const sammlungVon = useCallback((index) => sammlungen[index] ?? [], [sammlungen]);

  const resetAlle = useCallback(() => {
    const leer = { 0: [], 1: [] };
    speichern(leer);
    setSammlungen(leer);
  }, []);

  /** Sammlungen von außen überschreiben (Multiplayer-Sync) */
  const setSammlungenExtern = useCallback((updater) => {
    setSammlungen((prev) => {
      const neu = typeof updater === 'function' ? updater(prev) : updater;
      speichern(neu);
      return neu;
    });
  }, []);

  return (
    <SammlungContext.Provider value={{ sammlung, sammlungen, sammlungVon, hinzufuegen, loeschen, resetAlle, setSammlungenExtern }}>
      {children}
    </SammlungContext.Provider>
  );
}

export function useSammlung() {
  const ctx = useContext(SammlungContext);
  if (!ctx) throw new Error('useSammlung muss innerhalb von <SammlungProvider> verwendet werden');
  return ctx;
}
