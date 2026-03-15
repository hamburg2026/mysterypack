/**
 * api-football.com (via RapidAPI) Wrapper
 *
 * Setup: Erstelle eine .env.local Datei im Projektroot mit:
 *   VITE_RAPIDAPI_KEY=dein_key_hier
 *
 * Kostenlos: 100 Anfragen/Tag
 *
 * Liga-IDs:
 *   Champions League : 2
 *   Bundesliga       : 78
 *   La Liga          : 140
 *   Premier League   : 39
 */

const BASE_URL = 'https://api-football-v1.p.rapidapi.com/v3';

const getHeaders = () => {
  const key = import.meta.env.VITE_RAPIDAPI_KEY;
  if (!key) return null;
  return {
    'X-RapidAPI-Key': key,
    'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
  };
};

async function apiFetch(path) {
  const headers = getHeaders();
  if (!headers) throw new Error('NO_API_KEY');

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new Error(`API Error ${res.status}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.response;
}

/**
 * Alle Teilnehmer einer Liga und Saison laden.
 * @param {number} apiLigaId  – API-ID der Liga (z. B. 2 für CL, 78 für BL)
 * @param {string} saison     – z. B. "2024/25"
 */
export async function ladeTeams(apiLigaId, saison) {
  const year = parseInt(saison); // "2024/25" → 2024
  const data = await apiFetch(`/teams?league=${apiLigaId}&season=${year}`);
  return data.map(({ team }) => ({
    id:   team.id,
    name: team.name,
    land: team.country,
    logo: team.logo,
  }));
}

/** Kader eines Vereins laden (mit Rückennummern) */
export async function ladeKader(teamId) {
  const data = await apiFetch(`/players/squads?team=${teamId}`);
  if (!data || data.length === 0) return [];
  return data[0].players.map((p) => ({
    id:       p.id,
    name:     p.name,
    nummer:   p.number ?? 0,
    position: mapPosition(p.position),
    marktwert: null, // nicht im kostenlosen Plan
  }));
}

function mapPosition(pos) {
  const map = { Goalkeeper: 'TW', Defender: 'IV', Midfielder: 'ZM', Attacker: 'ST' };
  return map[pos] ?? pos;
}

/** Prüft ob ein API-Key gesetzt ist */
export function hatApiKey() {
  return Boolean(import.meta.env.VITE_RAPIDAPI_KEY);
}
