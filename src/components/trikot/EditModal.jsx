import { useState, useEffect } from 'react';
import TrikotSVG from './TrikotSVG';

const MUSTER_OPTIONEN = ['plain', 'stripes', 'hoops', 'split', 'sash'];
const MUSTER_LABEL = { plain: 'Uni', stripes: 'Vertikal', hoops: 'Horizontal', split: 'Geteilt', sash: 'Schärpe' };

// ── Spieler bearbeiten ────────────────────────────────────────────────────────
export function SpielerEditModal({ spieler, verein, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({ ...spieler });

  useEffect(() => setForm({ ...spieler }), [spieler]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Spieler bearbeiten</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Vorschau */}
          <div className="modal-preview">
            <div className="modal-preview-pair">
              <TrikotSVG {...verein.heimtrikot} nummer={form.nummer} name={form.name} />
              <span>Heim</span>
            </div>
            <div className="modal-preview-pair">
              <TrikotSVG {...verein.auswaertstrikot} nummer={form.nummer} name={form.name} />
              <span>Auswärts</span>
            </div>
          </div>

          <div className="modal-fields">
            <label>Name
              <input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
            </label>
            <div className="modal-row">
              <label>Rückennr.
                <input type="number" min="1" max="99" value={form.nummer ?? ''}
                  onChange={(e) => set('nummer', parseInt(e.target.value) || 0)} />
              </label>
              <label>Position
                <select value={form.position ?? ''} onChange={(e) => set('position', e.target.value)}>
                  {['TW','RV','IV','LV','DM','ZM','OM','RA','LA','ST'].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>Marktwert (Mio. €)
              <input type="number" min="0" step="0.5" value={form.marktwert ?? ''}
                onChange={(e) => set('marktwert', parseFloat(e.target.value) || 0)} />
              <small>Beeinflusst die Ziehwahrscheinlichkeit – höherer Wert = seltener</small>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-danger" onClick={() => { onDelete(spieler.id); onClose(); }}>
            Löschen
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
            <button className="btn-primary" onClick={() => { onSave(form); onClose(); }}>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Trikot bearbeiten ─────────────────────────────────────────────────────────
export function TrikotEditModal({ verein, typ, onSave, onClose }) {
  const trikot = typ === 'heim' ? verein.heimtrikot : verein.auswaertstrikot;
  const [form, setForm] = useState({ ...trikot });

  useEffect(() => setForm({ ...trikot }), [trikot]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{typ === 'heim' ? 'Heimtrikot' : 'Auswärtstrikot'} – {verein.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-preview">
            <TrikotSVG {...form} nummer="9" name="VORSCHAU" />
          </div>

          <div className="modal-fields">
            <div className="modal-row">
              <label>Hauptfarbe
                <div className="color-input-wrap">
                  <input type="color" value={form.farbe1} onChange={(e) => set('farbe1', e.target.value)} />
                  <input value={form.farbe1} onChange={(e) => set('farbe1', e.target.value)} placeholder="#FFFFFF" />
                </div>
              </label>
              <label>Akzentfarbe
                <div className="color-input-wrap">
                  <input type="color" value={form.farbe2} onChange={(e) => set('farbe2', e.target.value)} />
                  <input value={form.farbe2} onChange={(e) => set('farbe2', e.target.value)} placeholder="#000000" />
                </div>
              </label>
            </div>
            <label>Muster
              <div className="muster-grid">
                {MUSTER_OPTIONEN.map((m) => (
                  <button
                    key={m}
                    className={`muster-btn ${form.muster === m ? 'active' : ''}`}
                    onClick={() => set('muster', m)}
                    type="button"
                  >
                    <TrikotSVG farbe1={form.farbe1} farbe2={form.farbe2} muster={m} mini />
                    <span>{MUSTER_LABEL[m]}</span>
                  </button>
                ))}
              </div>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" onClick={() => { onSave(form); onClose(); }}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Neuen Spieler hinzufügen ──────────────────────────────────────────────────
export function SpielerHinzufuegenModal({ verein, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', nummer: '', position: 'ST', marktwert: '' });
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const valid = form.name.trim() && form.nummer;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Spieler hinzufügen – {verein.name}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-preview">
            <TrikotSVG {...verein.heimtrikot} nummer={form.nummer} name={form.name} />
          </div>
          <div className="modal-fields">
            <label>Name
              <input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </label>
            <div className="modal-row">
              <label>Rückennr.
                <input type="number" min="1" max="99" value={form.nummer}
                  onChange={(e) => set('nummer', parseInt(e.target.value) || '')} />
              </label>
              <label>Position
                <select value={form.position} onChange={(e) => set('position', e.target.value)}>
                  {['TW','RV','IV','LV','DM','ZM','OM','RA','LA','ST'].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>Marktwert (Mio. €)
              <input type="number" min="0" step="0.5" value={form.marktwert}
                onChange={(e) => set('marktwert', parseFloat(e.target.value) || '')} />
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Abbrechen</button>
          <button className="btn-primary" disabled={!valid}
            onClick={() => { onSave({ ...form, nummer: +form.nummer, marktwert: +form.marktwert || 1 }); onClose(); }}>
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}
