/**
 * Gewichtete Zufallsziehung aus der Trikot-Datenbank.
 * Liest gecachte API-Daten aus localStorage.
 *
 * Formel: Gewicht = 1 / marktwert  →  teurere Spieler seltener
 */

import { TRIKOT_KEY, seltenheit } from '../hooks/useTrikotDaten';

export function ladeVereine(ligaId) {
  try {
    const raw = localStorage.getItem(TRIKOT_KEY(ligaId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export function zieheSpieler(ligaId) {
  const vereine = ladeVereine(ligaId);

  // Alle Spieler mit Vereinsinfo flach zusammenführen
  const pool = vereine.flatMap((v) =>
    v.spieler
      .filter((s) => s.marktwert != null && s.marktwert > 0)
      .map((s) => ({
        spieler: s,
        verein: {
          id:              v.id,
          name:            v.name,
          land:            v.land,
          heimtrikot:      v.heimtrikot,
          auswaertstrikot: v.auswaertstrikot,
        },
      }))
  );

  if (pool.length === 0) return null;

  // Exponent 0.4 statt 1.0 → flachere Kurve, häufiger gute Karten
  const gewichte = pool.map((e) => 1 / Math.pow(e.spieler.marktwert, 0.4));
  const summe    = gewichte.reduce((a, b) => a + b, 0);

  let zufall = Math.random() * summe;
  let gezogen = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) {
    zufall -= gewichte[i];
    if (zufall <= 0) { gezogen = pool[i]; break; }
  }

  const trikotTyp = Math.random() < 0.5 ? 'heim' : 'auswaerts';
  const trikot    = trikotTyp === 'heim'
    ? gezogen.verein.heimtrikot
    : gezogen.verein.auswaertstrikot;

  const { label: raritaetLabel, stufe: raritaetStufe } = seltenheit(gezogen.spieler.marktwert);

  return {
    spieler:       gezogen.spieler,
    verein:        gezogen.verein,
    trikotTyp,
    trikot,
    raritaetLabel,
    raritaetStufe,
    ligaId,
    wahrscheinlichkeit: (gewichte[pool.indexOf(gezogen)] / summe) * 100,
  };
}

export const RARITAET_FARBE = {
  1: '#6b7280',
  2: '#22c55e',
  3: '#3b82f6',
  4: '#a855f7',
  5: '#f59e0b',
};

export const RARITAET_GLOW = {
  1: 'rgba(107,114,128,0.4)',
  2: 'rgba(34,197,94,0.5)',
  3: 'rgba(59,130,246,0.55)',
  4: 'rgba(168,85,247,0.6)',
  5: 'rgba(245,158,11,0.65)',
};
