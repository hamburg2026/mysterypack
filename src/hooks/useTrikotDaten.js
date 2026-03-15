import { useState, useEffect, useCallback } from 'react';
import { useLiga } from '../context/LigaContext';
import { ladeTeams, ladeKader, hatApiKey } from '../services/footballApi';
import { SEED_2024 }           from '../data/seed2024';
import { SEED_BUNDESLIGA }     from '../data/seedBundesliga';
import { SEED_LA_LIGA }        from '../data/seedLaLiga';
import { SEED_PREMIER_LEAGUE } from '../data/seedPremierLeague';

export const TRIKOT_KEY = (ligaId) => `mysterypack_trikot_${ligaId}`;

const SEEDS = {
  cl: SEED_2024,
  bl: SEED_BUNDESLIGA,
  la: SEED_LA_LIGA,
  pl: SEED_PREMIER_LEAGUE,
};

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

export function seltenheit(marktwert) {
  if (!marktwert) return { label: '–',            stufe: 0 };
  if (marktwert >= 100) return { label: 'Legendär',    stufe: 5 };
  if (marktwert >= 50)  return { label: 'Episch',      stufe: 4 };
  if (marktwert >= 20)  return { label: 'Selten',      stufe: 3 };
  if (marktwert >= 5)   return { label: 'Ungewöhnlich',stufe: 2 };
  return                       { label: 'Gewöhnlich',  stufe: 1 };
}

function laden(ligaId) {
  try {
    const raw = localStorage.getItem(TRIKOT_KEY(ligaId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function speichern(ligaId, vereine) {
  try { localStorage.setItem(TRIKOT_KEY(ligaId), JSON.stringify(vereine)); } catch {}
}

export function useTrikotDaten() {
  const { liga } = useLiga();

  const [vereine,     setVereine]     = useState([]);
  const [laedt,       setLaedt]       = useState(true);
  const [apiStatus,   setApiStatus]   = useState('idle');
  const [suchbegriff, setSuchbegriff] = useState('');
  const [refreshKey,  setRefreshKey]  = useState(0);

  useEffect(() => {
    let aborted = false;
    setLaedt(true);
    setApiStatus('idle');

    // 1. localStorage-Cache
    const gespeichert = laden(liga.id);
    if (gespeichert && gespeichert.length > 0) {
      setVereine(gespeichert);
      setLaedt(false);
      return;
    }

    // 2. Eingebettete Seed-Daten (kein API-Call nötig)
    const seed = SEEDS[liga.id];
    if (seed && seed.length > 0) {
      speichern(liga.id, seed);
      setVereine(seed);
      setLaedt(false);
      return;
    }

    // 3. API (nur wenn kein Seed und Key vorhanden)
    if (!hatApiKey()) {
      setVereine([]);
      setApiStatus('no_key');
      setLaedt(false);
      return;
    }

    setApiStatus('loading');
    ladeTeams(liga.apiId, '2024')
      .then((teams) => {
        if (aborted) return;
        const init = teams.map((t) => ({
          ...t,
          heimtrikot:      { farbe1: '#FFFFFF', farbe2: '#000000', muster: 'plain' },
          auswaertstrikot: { farbe1: '#000000', farbe2: '#FFFFFF', muster: 'plain' },
          spieler: [],
        }));
        speichern(liga.id, init);
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
  }, [liga.id, liga.apiId, refreshKey]);

  const ladeApiKader = useCallback(async (verein) => {
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
        speichern(liga.id, neu);
        return neu;
      });
      setApiStatus('ok');
    } catch (e) {
      setApiStatus(e.message === 'NO_API_KEY' ? 'no_key' : 'error');
    }
  }, [liga.id]);

  const refreshDaten = useCallback(() => {
    localStorage.removeItem(TRIKOT_KEY(liga.id));
    setVereine([]);
    setRefreshKey((n) => n + 1);
  }, [liga.id]);

  const vereinAktualisieren = useCallback((vereinId, felder) => {
    setVereine((prev) => {
      const neu = prev.map((v) => (v.id === vereinId ? { ...v, ...felder } : v));
      speichern(liga.id, neu);
      return neu;
    });
  }, [liga.id]);

  const spielerAktualisieren = useCallback((vereinId, spielerId, felder) => {
    setVereine((prev) => {
      const neu = prev.map((v) => {
        if (v.id !== vereinId) return v;
        return { ...v, spieler: v.spieler.map((s) => (s.id === spielerId ? { ...s, ...felder } : s)) };
      });
      speichern(liga.id, neu);
      return neu;
    });
  }, [liga.id]);

  const spielerHinzufuegen = useCallback((vereinId, spieler) => {
    setVereine((prev) => {
      const neu = prev.map((v) => {
        if (v.id !== vereinId) return v;
        return { ...v, spieler: [...v.spieler, { ...spieler, id: Date.now() }] };
      });
      speichern(liga.id, neu);
      return neu;
    });
  }, [liga.id]);

  const spielerLoeschen = useCallback((vereinId, spielerId) => {
    setVereine((prev) => {
      const neu = prev.map((v) => {
        if (v.id !== vereinId) return v;
        return { ...v, spieler: v.spieler.filter((s) => s.id !== spielerId) };
      });
      speichern(liga.id, neu);
      return neu;
    });
  }, [liga.id]);

  const wahrscheinlichkeiten = vereine.length > 0
    ? berechneWahrscheinlichkeiten(vereine)
    : {};

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
