/**
 * Globaler Wallet-State – je Mitspieler getrennt.
 *
 * Verwendung in jedem Modul:
 *   import { useWallet } from '../context/WalletContext';
 *   const { guthaben, buchen } = useWallet();
 *   buchen(-200, 'mystery_pack', 'Mystery Pack gekauft');
 *
 * Transaktions-Typen (werden für Icon + Farbe genutzt):
 *   'startguthaben' | 'quiz_gewinn' | 'quiz_verlust'
 *   'mystery_pack'  | 'einzahlung'  | 'sonstiges'
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useSpieler } from './SpielerContext';

const STORAGE_KEY = 'mysterypack_wallets';
const DEFAULT_START = 1000;

function initialWallet(startguthaben = DEFAULT_START) {
  return {
    startguthaben,
    guthaben: startguthaben,
    transaktionen: [{
      id: 1,
      typ: 'startguthaben',
      betrag: startguthaben,
      beschreibung: 'Startguthaben',
      datum: new Date().toISOString(),
    }],
  };
}

function laden() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migration: altes Format war ein einzelnes Wallet-Objekt
      if (parsed.guthaben !== undefined) return { 0: parsed, 1: initialWallet() };
      return parsed;
    }
    // Migration aus altem Key
    const alt = localStorage.getItem('mysterypack_wallet');
    if (alt) {
      const parsed = JSON.parse(alt);
      if (parsed.guthaben !== undefined) return { 0: parsed, 1: initialWallet() };
    }
  } catch {}
  return { 0: initialWallet(), 1: initialWallet() };
}

function speichern(wallets) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets)); } catch {}
}

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { aktiverIndex } = useSpieler();
  const [wallets, setWallets] = useState(laden);

  useEffect(() => { speichern(wallets); }, [wallets]);

  const aktuellesWallet = wallets[aktiverIndex] ?? initialWallet();

  /** Transaktion für den aktiven Spieler buchen */
  const buchen = useCallback((betrag, typ = 'sonstiges', beschreibung = '') => {
    setWallets((prev) => {
      const w = prev[aktiverIndex] ?? initialWallet();
      const neueTransaktion = {
        id: Date.now() + Math.random(),
        typ, betrag, beschreibung,
        datum: new Date().toISOString(),
      };
      return {
        ...prev,
        [aktiverIndex]: {
          ...w,
          guthaben: Math.round((w.guthaben + betrag) * 100) / 100,
          transaktionen: [neueTransaktion, ...w.transaktionen],
        },
      };
    });
  }, [aktiverIndex]);

  /** Startguthaben des aktiven Spielers setzen + alles zurücksetzen */
  const setStartguthaben = useCallback((betrag) => {
    setWallets((prev) => ({ ...prev, [aktiverIndex]: initialWallet(betrag) }));
  }, [aktiverIndex]);

  const startguthabenAnpassen = useCallback((betrag) => {
    setWallets((prev) => {
      const w = prev[aktiverIndex] ?? initialWallet();
      return { ...prev, [aktiverIndex]: { ...w, startguthaben: betrag } };
    });
  }, [aktiverIndex]);

  const reset = useCallback(() => {
    setWallets((prev) => {
      const w = prev[aktiverIndex] ?? initialWallet();
      return { ...prev, [aktiverIndex]: initialWallet(w.startguthaben) };
    });
  }, [aktiverIndex]);

  const transaktionLoeschen = useCallback((id) => {
    setWallets((prev) => {
      const w = prev[aktiverIndex] ?? initialWallet();
      const gefiltert = w.transaktionen.filter((t) => t.id !== id);
      const neuesGuthaben = gefiltert.reduce((sum, t) => sum + t.betrag, 0);
      return {
        ...prev,
        [aktiverIndex]: {
          ...w,
          guthaben: Math.round(neuesGuthaben * 100) / 100,
          transaktionen: gefiltert,
        },
      };
    });
  }, [aktiverIndex]);

  /** Wallet eines bestimmten Spielers lesen (für Vergleichsansichten) */
  const walletVon = useCallback((index) => wallets[index] ?? initialWallet(), [wallets]);

  /** Beide Wallets auf Startguthaben zurücksetzen */
  const resetAlle = useCallback(() => {
    setWallets({ 0: initialWallet(), 1: initialWallet() });
  }, []);

  return (
    <WalletContext.Provider value={{
      guthaben:     aktuellesWallet.guthaben,
      startguthaben: aktuellesWallet.startguthaben,
      transaktionen: aktuellesWallet.transaktionen,
      wallets,
      walletVon,
      resetAlle,
      buchen,
      setStartguthaben,
      startguthabenAnpassen,
      reset,
      transaktionLoeschen,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet muss innerhalb von <WalletProvider> verwendet werden');
  return ctx;
}

// ── Hilfsfunktionen (exportiert für alle Module) ──────

export const TYP_META = {
  startguthaben:   { label: 'Startguthaben',   icon: '🏦' },
  quiz_gewinn:     { label: 'Quiz-Gewinn',      icon: '🏆' },
  quiz_verlust:    { label: 'Quiz-Verlust',     icon: '❌' },
  mystery_pack:    { label: 'Mystery Pack',     icon: '📦' },
  karten_verkauf:  { label: 'Karten-Verkauf',   icon: '💰' },
  einzahlung:      { label: 'Einzahlung',       icon: '💶' },
  sonstiges:       { label: 'Sonstiges',        icon: '💸' },
};

export function formatBetrag(betrag) {
  const abs = Math.abs(betrag).toFixed(2).replace('.', ',');
  return betrag >= 0 ? `+${abs} €` : `–${abs.replace('-', '')} €`;
}

export function formatDatum(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatUhrzeit(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
