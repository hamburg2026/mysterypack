import { useTrikotDaten } from '../hooks/useTrikotDaten';
import VereinSektion from '../components/trikot/VereinSektion';
import { SAISONS } from '../data/seed2024';
import '../trikot.css';

export default function TrikotDatenbank() {
  const {
    saison, setSaison,
    vereine, alleVereine,
    laedt, apiStatus,
    suchbegriff, setSuchbegriff,
    wahrscheinlichkeiten,
    ladeApiKader,
    vereinAktualisieren,
    spielerAktualisieren,
    spielerHinzufuegen,
    spielerLoeschen,
    resetSaison,
  } = useTrikotDaten();

  const gesamtSpieler = alleVereine.reduce((s, v) => s + v.spieler.length, 0);
  const gesamtMarktwert = alleVereine
    .flatMap((v) => v.spieler)
    .reduce((s, p) => s + (p.marktwert ?? 0), 0)
    .toFixed(0);

  return (
    <div className="trikot-db">
      {/* ── Seitenkopf ── */}
      <div className="tdb-header">
        <div className="tdb-title-row">
          <div>
            <h1 className="tdb-title">
              <span className="tdb-title-icon">👕</span>
              Trikot-Datenbank
            </h1>
            <p className="tdb-subtitle">Champions League · Alle Vereins- und Spielerdaten</p>
          </div>
          <div className="tdb-stats">
            <div className="tdb-stat">
              <span className="tdb-stat-val">{alleVereine.length}</span>
              <span className="tdb-stat-lbl">Vereine</span>
            </div>
            <div className="tdb-stat">
              <span className="tdb-stat-val">{gesamtSpieler}</span>
              <span className="tdb-stat-lbl">Spieler</span>
            </div>
            <div className="tdb-stat">
              <span className="tdb-stat-val">{gesamtMarktwert}</span>
              <span className="tdb-stat-lbl">Mio. € gesamt</span>
            </div>
          </div>
        </div>

        {/* ── Steuerleiste ── */}
        <div className="tdb-controls">
          {/* Saison-Dropdown */}
          <div className="tdb-control-group">
            <label htmlFor="saison-select">Saison</label>
            <select
              id="saison-select"
              value={saison}
              onChange={(e) => setSaison(e.target.value)}
              className="tdb-select"
            >
              {SAISONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Suche */}
          <div className="tdb-control-group tdb-search">
            <label htmlFor="tdb-suche">Suche</label>
            <div className="tdb-search-wrap">
              <span className="tdb-search-icon">🔍</span>
              <input
                id="tdb-suche"
                type="text"
                placeholder="Verein, Land oder Spieler…"
                value={suchbegriff}
                onChange={(e) => setSuchbegriff(e.target.value)}
                className="tdb-input"
              />
              {suchbegriff && (
                <button className="tdb-clear" onClick={() => setSuchbegriff('')}>✕</button>
              )}
            </div>
          </div>

          {/* Reset */}
          <button
            className="btn-ghost btn-sm"
            onClick={() => { if (confirm('Alle Änderungen zurücksetzen?')) resetSaison(); }}
            title="Alle Änderungen auf Seed-Daten zurücksetzen"
          >
            ↩ Zurücksetzen
          </button>
        </div>

        {/* API-Key Hinweis */}
        {apiStatus === 'no_key' && (
          <div className="tdb-api-hint">
            💡 Kein RapidAPI-Key gefunden. Erstelle <code>.env.local</code> mit{' '}
            <code>VITE_RAPIDAPI_KEY=dein_key</code> um Kader live zu laden.
            Bis dahin werden die eingebetteten Seed-Daten verwendet.
          </div>
        )}
        {apiStatus === 'error' && (
          <div className="tdb-api-hint tdb-api-error">
            ⚠️ API-Fehler beim Laden. Bitte Key und Kontingent prüfen.
          </div>
        )}
      </div>

      {/* ── Vereinsliste ── */}
      {laedt ? (
        <div className="tdb-loading">⏳ Daten werden geladen…</div>
      ) : vereine.length === 0 ? (
        <div className="tdb-leer">
          Keine Vereine gefunden{suchbegriff ? ` für „${suchbegriff}"` : ''}.
        </div>
      ) : (
        <div className="verein-liste">
          {vereine.map((v) => (
            <VereinSektion
              key={v.id}
              verein={v}
              wahrscheinlichkeiten={wahrscheinlichkeiten}
              onVereinUpdate={vereinAktualisieren}
              onSpielerUpdate={spielerAktualisieren}
              onSpielerHinzufuegen={spielerHinzufuegen}
              onSpielerLoeschen={spielerLoeschen}
              onApiLaden={ladeApiKader}
              apiStatus={apiStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
