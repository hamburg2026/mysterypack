/**
 * Gewichtete Zufallsziehung aus der Trikot-Datenbank.
 * Liest gespeicherte Daten aus localStorage (inkl. manueller Edits).
 * Fallback: SEED_2024
 *
 * Formel: Gewicht = 1 / marktwert  →  teurere Spieler seltener
 */

import { SEED_2024 } from '../data/seed2024';
import { seltenheit } from '../hooks/useTrikotDaten';

const TRIKOT_KEY = (saison) => `mysterypack_trikot_${saison.replace('/', '_')}`;

export function ladeVereine(saison = '2024/25') {
  try {
    const raw = localStorage.getItem(TRIKOT_KEY(saison));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return SEED_2024;
}

export function zieheSpieler(saison = '2024/25') {
  const vereine = ladeVereine(saison);

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

  // Gewichte berechnen: 1 / marktwert (in Mio. €)
  const gewichte = pool.map((e) => 1 / e.spieler.marktwert);
  const summe    = gewichte.reduce((a, b) => a + b, 0);

  // Gewichtete Zufallsziehung
  let zufall = Math.random() * summe;
  let gezogen = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) {
    zufall -= gewichte[i];
    if (zufall <= 0) { gezogen = pool[i]; break; }
  }

  // Trikot-Typ zufällig: Heim oder Auswärts
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
    saison,
    wahrscheinlichkeit: (gewichte[pool.indexOf(gezogen)] / summe) * 100,
  };
}

// Raritäts-Farben für die Enthüllungs-Animation
export const RARITAET_FARBE = {
  1: '#6b7280',  // Gewöhnlich – grau
  2: '#22c55e',  // Ungewöhnlich – grün
  3: '#3b82f6',  // Selten – blau
  4: '#a855f7',  // Episch – lila
  5: '#f59e0b',  // Legendär – gold
};

export const RARITAET_GLOW = {
  1: 'rgba(107,114,128,0.4)',
  2: 'rgba(34,197,94,0.5)',
  3: 'rgba(59,130,246,0.55)',
  4: 'rgba(168,85,247,0.6)',
  5: 'rgba(245,158,11,0.65)',
};
