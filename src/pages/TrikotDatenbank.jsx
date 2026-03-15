import { useTrikotDaten } from '../hooks/useTrikotDaten';
import { useLiga, LIGEN } from '../context/LigaContext';
import VereinSektion from '../components/trikot/VereinSektion';
import '../trikot.css';

export default function TrikotDatenbank() {
  const { liga, ligaId, setLiga } = useLiga();

  const {
    vereine, alleVereine,
    laedt, apiStatus,
    suchbegriff, setSuchbegriff,
    wahrscheinlichkeiten,
    ladeApiKader,
    vereinAktualisieren,
    spielerAktualisieren,
    spielerHinzufuegen,
    spielerLoeschen,
    refreshDaten,
  } = useTrikotDaten();

  const gesamtSpieler  = alleVereine.reduce((s, v) => s + v.spieler.length, 0);
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
            <p className="tdb-subtitle">{liga.icon} {liga.name}</p>
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

        {/* ── Liga-Auswahl ── */}
        <div className="tdb-liga-auswahl">
          {LIGEN.map((l) => (
            <button
              key={l.id}
              className={`tdb-liga-btn ${ligaId === l.id ? 'tdb-liga-btn--aktiv' : ''}`}
              onClick={() => setLiga(l.id)}
            >
              <span className="tdb-liga-icon">{l.icon}</span>
              <span className="tdb-liga-name">{l.name}</span>
              <span className="tdb-liga-land">{l.land}</span>
            </button>
          ))}
        </div>

        {/* ── Steuerleiste ── */}
        <div className="tdb-controls">
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

          {/* Cache leeren & neu laden */}
          <button
            className="btn-ghost btn-sm"
            onClick={() => { if (confirm('Cache löschen und Daten neu von der API laden?')) refreshDaten(); }}
            title="Lokalen Cache löschen und Daten neu von der API laden"
          >
            ↩ Neu laden
          </button>
        </div>

        {/* Status-Hinweise */}
        {apiStatus === 'no_key' && (
          <div className="tdb-api-hint">
            💡 Kein RapidAPI-Key gefunden. Erstelle <code>.env.local</code> mit{' '}
            <code>VITE_RAPIDAPI_KEY=dein_key</code> um Teams und Kader zu laden.
          </div>
        )}
        {apiStatus === 'loading' && (
          <div className="tdb-api-hint">
            ⏳ Lade Teams von der API…
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
          {apiStatus === 'no_key'
            ? 'API-Key fehlt – bitte VITE_RAPIDAPI_KEY in .env.local setzen.'
            : `Keine Vereine für ${liga.name} gefunden.`}
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
