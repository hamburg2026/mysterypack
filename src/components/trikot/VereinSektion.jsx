import { useState } from 'react';
import TrikotSVG from './TrikotSVG';
import SpielerKarte from './SpielerKarte';
import { SpielerEditModal, TrikotEditModal, SpielerHinzufuegenModal } from './EditModal';

export default function VereinSektion({
  verein,
  wahrscheinlichkeiten,
  onVereinUpdate,
  onSpielerUpdate,
  onSpielerHinzufuegen,
  onSpielerLoeschen,
  onApiLaden,
  apiStatus,
}) {
  const [offen, setOffen] = useState(false);
  const [editSpieler, setEditSpieler] = useState(null);
  const [editTrikot, setEditTrikot] = useState(null); // 'heim' | 'auswaerts' | null
  const [showHinzufuegen, setShowHinzufuegen] = useState(false);

  const gesamtMarktwert = verein.spieler
    .reduce((s, p) => s + (p.marktwert ?? 0), 0)
    .toFixed(1);

  return (
    <div className={`verein-sektion ${offen ? 'offen' : ''}`}>
      {/* ── Kopfzeile ── */}
      <div className="verein-header" onClick={() => setOffen((v) => !v)}>
        <div className="verein-header-left">
          <span className="verein-toggle">{offen ? '▼' : '▶'}</span>
          <div className="verein-trikot-mini">
            <TrikotSVG {...verein.heimtrikot} mini />
            <TrikotSVG {...verein.auswaertstrikot} mini />
          </div>
          <div className="verein-info">
            <span className="verein-name">{verein.name}</span>
            <span className="verein-land">{verein.land}</span>
          </div>
        </div>
        <div className="verein-header-right">
          <span className="verein-spielerzahl">{verein.spieler.length} Spieler</span>
          <span className="verein-marktwert">⚡ {gesamtMarktwert} Mio. €</span>
        </div>
      </div>

      {/* ── Inhaltsbereich ── */}
      {offen && (
        <div className="verein-inhalt">
          {/* Trikot-Edit-Buttons */}
          <div className="trikot-edit-row">
            <button className="trikot-edit-trigger" onClick={() => setEditTrikot('heim')}>
              <TrikotSVG {...verein.heimtrikot} mini />
              <span>Heimtrikot bearbeiten</span>
            </button>
            <button className="trikot-edit-trigger" onClick={() => setEditTrikot('auswaerts')}>
              <TrikotSVG {...verein.auswaertstrikot} mini />
              <span>Auswärtstrikot bearbeiten</span>
            </button>

            {/* API-Kader laden */}
            <button
              className="btn-ghost btn-sm"
              onClick={(e) => { e.stopPropagation(); onApiLaden(verein); }}
              disabled={apiStatus === 'loading'}
              title="Kader über API aktualisieren (benötigt RapidAPI-Key)"
            >
              {apiStatus === 'loading' ? '⏳ Lädt…' : '🔄 API-Kader laden'}
            </button>
          </div>

          {/* Spieler-Grid */}
          {verein.spieler.length === 0 ? (
            <div className="verein-leer">
              Noch keine Spieler. Lade den Kader per API oder füge Spieler manuell hinzu.
            </div>
          ) : (
            <div className="spieler-grid">
              {verein.spieler.map((s) => (
                <SpielerKarte
                  key={s.id}
                  spieler={s}
                  heimtrikot={verein.heimtrikot}
                  auswaertstrikot={verein.auswaertstrikot}
                  wahrscheinlichkeit={wahrscheinlichkeiten[`${verein.id}_${s.id}`]}
                  onEdit={(sp) => setEditSpieler(sp)}
                />
              ))}
            </div>
          )}

          {/* Spieler hinzufügen */}
          <button className="btn-add-spieler" onClick={() => setShowHinzufuegen(true)}>
            + Spieler hinzufügen
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {editSpieler && (
        <SpielerEditModal
          spieler={editSpieler}
          verein={verein}
          onSave={(felder) => onSpielerUpdate(verein.id, editSpieler.id, felder)}
          onDelete={(id) => onSpielerLoeschen(verein.id, id)}
          onClose={() => setEditSpieler(null)}
        />
      )}
      {editTrikot && (
        <TrikotEditModal
          verein={verein}
          typ={editTrikot}
          onSave={(trikot) =>
            onVereinUpdate(verein.id, {
              [editTrikot === 'heim' ? 'heimtrikot' : 'auswaertstrikot']: trikot,
            })
          }
          onClose={() => setEditTrikot(null)}
        />
      )}
      {showHinzufuegen && (
        <SpielerHinzufuegenModal
          verein={verein}
          onSave={(sp) => onSpielerHinzufuegen(verein.id, sp)}
          onClose={() => setShowHinzufuegen(false)}
        />
      )}
    </div>
  );
}
