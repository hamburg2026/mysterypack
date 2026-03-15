/**
 * Haupt-Datenhook für die Trikot-Datenbank.
 *
 * Priorität: localStorage → Seed-Daten → API-Nachladen
 * Alle Änderungen werden sofort in localStorage gespeichert.
 */

import { useState, useEffect, useCallback } from 'react';
import { SEED_2024, SAISONS } from '../data/seed2024';
import { ladeKader, hatApiKey } from '../services/footballApi';

const STORAGE_KEY = (saison) => `mysterypack_trikot_${saison.replace('/', '_')}`;

// ── Wahrscheinlichkeit berechnen ──────────────────────────────────────────────
// Teuerere Spieler → kleinere Wahrscheinlichkeit
// Formel: w_i = 1 / marktwert  →  p_i = w_i / Σw
export function berechneWahrscheinlichkeiten(vereine) {
  const alleSpieler = vereine.flatMap((v) =>
    v.spieler.map((s) => ({ ...s, vereinId: v.id }))
  );

  const gewichte = alleSpieler.map((s) => 1 / Math.max(s.marktwert ?? 1, 0.1));
  const summe = gewichte.reduce((a, b) => a + b, 0);

  // Rückgabe: Map { spielerId → probability (%) }
  const probMap = {};
  alleSpieler.forEach((s, i) => {
    probMap[`${s.vereinId}_${s.id}`] = (gewichte[i] / summe) * 100;
  });
  return probMap;
}

// ── Seltenheits-Label ─────────────────────────────────────────────────────────
export function seltenheit(marktwert) {
  if (!marktwert) return { label: '–', stufe: 0 };
  if (marktwert >= 100) return { label: 'Legendär',    stufe: 5 };
  if (marktwert >= 50)  return { label: 'Episch',      stufe: 4 };
  if (marktwert >= 20)  return { label: 'Selten',      stufe: 3 };
  if (marktwert >= 5)   return { label: 'Ungewöhnlich',stufe: 2 };
  return                       { label: 'Gewöhnlich',  stufe: 1 };
}

// ── Persistenz ────────────────────────────────────────────────────────────────
function laden(saison) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(saison));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function speichern(saison, vereine) {
  try {
    localStorage.setItem(STORAGE_KEY(saison), JSON.stringify(vereine));
  } catch {}
}

// ── Seed für eine Saison zurückgeben ──────────────────────────────────────────
function seedFuerSaison(saison) {
  if (saison === '2024/25') return SEED_2024;
  return [];
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTrikotDaten() {
  const [saison, setSaison] = useState(SAISONS[0]);
  const [vereine, setVereine] = useState([]);
  const [laedt, setLaedt] = useState(true);
  const [apiStatus, setApiStatus] = useState('idle'); // idle | loading | ok | error | no_key
  const [suchbegriff, setSuchbegriff] = useState('');

  // Daten initialisieren / Saison wechseln
  useEffect(() => {
    setLaedt(true);
    const gespeichert = laden(saison);
    if (gespeichert && gespeichert.length > 0) {
      setVereine(gespeichert);
      setLaedt(false);
    } else {
      const seed = seedFuerSaison(saison);
      setVereine(seed);
      if (seed.length > 0) speichern(saison, seed);
      setLaedt(false);
    }
  }, [saison]);

  // API-Kader nachladen (nur wenn kein Spieler im Verein)
  const ladeApiKader = useCallback(
    async (verein) => {
      if (!hatApiKey()) { setApiStatus('no_key'); return; }
      setApiStatus('loading');
      try {
        const spieler = await ladeKader(verein.id);
        if (spieler.length === 0) { setApiStatus('error'); return; }

        setVereine((prev) => {
          const neu = prev.map((v) =>
            v.id === verein.id
              ? { ...v, spieler: spieler.map((s) => ({ ...s, marktwert: s.marktwert ?? 1 })) }
              : v
          );
          speichern(saison, neu);
          return neu;
        });
        setApiStatus('ok');
      } catch (e) {
        setApiStatus(e.message === 'NO_API_KEY' ? 'no_key' : 'error');
      }
    },
    [saison]
  );

  // ── Editier-Funktionen ─────────────────────────────────────────────────────

  const vereinAktualisieren = useCallback(
    (vereinId, felder) => {
      setVereine((prev) => {
        const neu = prev.map((v) => (v.id === vereinId ? { ...v, ...felder } : v));
        speichern(saison, neu);
        return neu;
      });
    },
    [saison]
  );

  const spielerAktualisieren = useCallback(
    (vereinId, spielerId, felder) => {
      setVereine((prev) => {
        const neu = prev.map((v) => {
          if (v.id !== vereinId) return v;
          return {
            ...v,
            spieler: v.spieler.map((s) =>
              s.id === spielerId ? { ...s, ...felder } : s
            ),
          };
        });
        speichern(saison, neu);
        return neu;
      });
    },
    [saison]
  );

  const spielerHinzufuegen = useCallback(
    (vereinId, spieler) => {
      setVereine((prev) => {
        const neu = prev.map((v) => {
          if (v.id !== vereinId) return v;
          const neueId = Date.now();
          return { ...v, spieler: [...v.spieler, { ...spieler, id: neueId }] };
        });
        speichern(saison, neu);
        return neu;
      });
    },
    [saison]
  );

  const spielerLoeschen = useCallback(
    (vereinId, spielerId) => {
      setVereine((prev) => {
        const neu = prev.map((v) => {
          if (v.id !== vereinId) return v;
          return { ...v, spieler: v.spieler.filter((s) => s.id !== spielerId) };
        });
        speichern(saison, neu);
        return neu;
      });
    },
    [saison]
  );

  const resetSaison = useCallback(() => {
    const seed = seedFuerSaison(saison);
    setVereine(seed);
    speichern(saison, seed);
  }, [saison]);

  // ── Wahrscheinlichkeiten (memo-artig) ─────────────────────────────────────
  const wahrscheinlichkeiten = vereine.length > 0
    ? berechneWahrscheinlichkeiten(vereine)
    : {};

  // ── Gefilterte Vereine ────────────────────────────────────────────────────
  const gefilterteVereine = suchbegriff.trim()
    ? vereine.filter(
        (v) =>
          v.name.toLowerCase().includes(suchbegriff.toLowerCase()) ||
          v.land.toLowerCase().includes(suchbegriff.toLowerCase()) ||
          v.spieler.some((s) =>
            s.name.toLowerCase().includes(suchbegriff.toLowerCase())
          )
      )
    : vereine;

  return {
    saison, setSaison,
    vereine: gefilterteVereine,
    alleVereine: vereine,
    laedt, apiStatus,
    suchbegriff, setSuchbegriff,
    wahrscheinlichkeiten,
    ladeApiKader,
    vereinAktualisieren,
    spielerAktualisieren,
    spielerHinzufuegen,
    spielerLoeschen,
    resetSaison,
  };
}
