/**
 * Haupt-Datenhook für die Trikot-Datenbank.
 *
 * Priorität: localStorage → API (automatisch beim ersten Aufruf)
 * Alle Änderungen werden sofort in localStorage gespeichert.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLiga } from '../context/LigaContext';
import { ladeTeams, ladeKader, hatApiKey } from '../services/footballApi';

// Gemeinsamer Storage-Key für Hook und Ziehungs-Service
export const TRIKOT_KEY = (ligaId, saison) =>
  `mysterypack_trikot_${ligaId}_${saison.replace('/', '_')}`;

// ── Wahrscheinlichkeit berechnen ──────────────────────────────────────────────
export function berechneWahrscheinlichkeiten(vereine) {
  const alleSpieler = vereine.flatMap((v) =>
    v.spieler.map((s) => ({ ...s, vereinId: v.id }))
  );
  const gewichte = alleSpieler.map((s) => 1 / Math.max(s.marktwert ?? 1, 0.1));
  const summe    = gewichte.reduce((a, b) => a + b, 0);
  const probMap  = {};
  alleSpieler.forEach((s, i) => {
    probMap[`${s.vereinId}_${s.id}`] = (gewichte[i] / summe) * 100;
  });
  return probMap;
}

// ── Seltenheits-Label ─────────────────────────────────────────────────────────
export function seltenheit(marktwert) {
  if (!marktwert) return { label: '–',           stufe: 0 };
  if (marktwert >= 100) return { label: 'Legendär',    stufe: 5 };
  if (marktwert >= 50)  return { label: 'Episch',      stufe: 4 };
  if (marktwert >= 20)  return { label: 'Selten',      stufe: 3 };
  if (marktwert >= 5)   return { label: 'Ungewöhnlich',stufe: 2 };
  return                       { label: 'Gewöhnlich',  stufe: 1 };
}

// ── Persistenz ────────────────────────────────────────────────────────────────
function laden(ligaId, saison) {
  try {
    const raw = localStorage.getItem(TRIKOT_KEY(ligaId, saison));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function speichern(ligaId, saison, vereine) {
  try {
    localStorage.setItem(TRIKOT_KEY(ligaId, saison), JSON.stringify(vereine));
  } catch {}
}

// Standard-Trikotfarben für neu geladene Teams
function defaultTrikot(primary = '#FFFFFF', secondary = '#000000', muster = 'plain') {
  return { farbe1: primary, farbe2: secondary, muster };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTrikotDaten() {
  const { liga, saison } = useLiga();

  const [vereine,      setVereine]      = useState([]);
  const [laedt,        setLaedt]        = useState(true);
  const [apiStatus,    setApiStatus]    = useState('idle');
  const [suchbegriff,  setSuchbegriff]  = useState('');
  const [refreshKey,   setRefreshKey]   = useState(0); // erzwingt Neu-Fetch bei Reset

  // Daten laden: localStorage → API
  useEffect(() => {
    let aborted = false;
    setLaedt(true);
    setApiStatus('idle');

    const gespeichert = laden(liga.id, saison);
    if (gespeichert && gespeichert.length > 0) {
      setVereine(gespeichert);
      setLaedt(false);
      return;
    }

    // Kein Cache → von API laden
    if (!hatApiKey()) {
      setVereine([]);
      setApiStatus('no_key');
      setLaedt(false);
      return;
    }

    setApiStatus('loading');
    ladeTeams(liga.apiId, saison)
      .then((teams) => {
        if (aborted) return;
        const init = teams.map((t) => ({
          ...t,
          heimtrikot:      defaultTrikot('#FFFFFF', '#000000'),
          auswaertstrikot: defaultTrikot('#000000', '#FFFFFF'),
          spieler: [],
        }));
        speichern(liga.id, saison, init);
        setVereine(init);
        setApiStatus('ok');
        setLaedt(false);
      })
      .catch((e) => {
        if (aborted) return;
        setApiStatus(e.message === 'NO_API_KEY' ? 'no_key' : 'error');
        setVereine([]);
        setLaedt(false);
      });

    return () => { aborted = true; };
  }, [liga.id, liga.apiId, saison, refreshKey]);

  // API-Kader für einen Verein laden
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
          speichern(liga.id, saison, neu);
          return neu;
        });
        setApiStatus('ok');
      } catch (e) {
        setApiStatus(e.message === 'NO_API_KEY' ? 'no_key' : 'error');
      }
    },
    [liga.id, saison]
  );

  // Cache löschen + neu von API laden
  const refreshDaten = useCallback(() => {
    localStorage.removeItem(TRIKOT_KEY(liga.id, saison));
    setVereine([]);
    setRefreshKey((n) => n + 1);
  }, [liga.id, saison]);

  // ── Editier-Funktionen ────────────────────────────────────────────────────

  const vereinAktualisieren = useCallback(
    (vereinId, felder) => {
      setVereine((prev) => {
        const neu = prev.map((v) => (v.id === vereinId ? { ...v, ...felder } : v));
        speichern(liga.id, saison, neu);
        return neu;
      });
    },
    [liga.id, saison]
  );

  const spielerAktualisieren = useCallback(
    (vereinId, spielerId, felder) => {
      setVereine((prev) => {
        const neu = prev.map((v) => {
          if (v.id !== vereinId) return v;
          return { ...v, spieler: v.spieler.map((s) => (s.id === spielerId ? { ...s, ...felder } : s)) };
        });
        speichern(liga.id, saison, neu);
        return neu;
      });
    },
    [liga.id, saison]
  );

  const spielerHinzufuegen = useCallback(
    (vereinId, spieler) => {
      setVereine((prev) => {
        const neu = prev.map((v) => {
          if (v.id !== vereinId) return v;
          return { ...v, spieler: [...v.spieler, { ...spieler, id: Date.now() }] };
        });
        speichern(liga.id, saison, neu);
        return neu;
      });
    },
    [liga.id, saison]
  );

  const spielerLoeschen = useCallback(
    (vereinId, spielerId) => {
      setVereine((prev) => {
        const neu = prev.map((v) => {
          if (v.id !== vereinId) return v;
          return { ...v, spieler: v.spieler.filter((s) => s.id !== spielerId) };
        });
        speichern(liga.id, saison, neu);
        return neu;
      });
    },
    [liga.id, saison]
  );

  // ── Wahrscheinlichkeiten ──────────────────────────────────────────────────
  const wahrscheinlichkeiten = vereine.length > 0
    ? berechneWahrscheinlichkeiten(vereine)
    : {};

  // ── Gefilterte Vereine ────────────────────────────────────────────────────
  const gefilterteVereine = suchbegriff.trim()
    ? vereine.filter(
        (v) =>
          v.name.toLowerCase().includes(suchbegriff.toLowerCase()) ||
          v.land?.toLowerCase().includes(suchbegriff.toLowerCase()) ||
          v.spieler.some((s) => s.name.toLowerCase().includes(suchbegriff.toLowerCase()))
      )
    : vereine;

  return {
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
    refreshDaten,
  };
}
