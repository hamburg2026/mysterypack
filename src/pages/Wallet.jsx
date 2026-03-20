import { useState, useMemo } from 'react';
import {
  useWallet,
  TYP_META,
  formatBetrag,
  formatDatum,
  formatUhrzeit,
} from '../context/WalletContext';
import '../wallet.css';

const TYP_FILTER = ['alle', ...Object.keys(TYP_META)];
const TYP_FILTER_LABEL = { alle: 'Alle', ...Object.fromEntries(
  Object.entries(TYP_META).map(([k, v]) => [k, v.label])
)};

export default function Wallet() {
  const {
    guthaben,
    startguthaben,
    transaktionen,
    buchen,
    setStartguthaben,
    reset,
    transaktionLoeschen,
  } = useWallet();

  // ── lokaler UI-State ──────────────────────────────────
  const [filterTyp, setFilterTyp]         = useState('alle');
  const [filterRichtung, setFilterRichtung] = useState('alle'); // alle | positiv | negativ
  const [einstellungenOffen, setEinstellungenOffen] = useState(false);
  const [neuerStart, setNeuerStart]       = useState(String(startguthaben));
  const [einzahlungOffen, setEinzahlungOffen] = useState(false);
  const [einzahlBetrag, setEinzahlBetrag] = useState('');
  const [einzahlBeschreibung, setEinzahlBeschreibung] = useState('');
  const [loescheId, setLoescheId]         = useState(null);
  const [codeAbfrageOffen, setCodeAbfrageOffen] = useState(false);
  const [eingegebenerCode, setEingegebenerCode] = useState('');
  const [codeFehler, setCodeFehler]       = useState(false);
  const EINZAHL_CODE = '4711'; // geheim – wird dem User nicht angezeigt

  // ── gefilterte Transaktionen ──────────────────────────
  const gefiltert = useMemo(() => {
    return transaktionen.filter((t) => {
      if (filterTyp !== 'alle' && t.typ !== filterTyp) return false;
      if (filterRichtung === 'positiv' && t.betrag < 0) return false;
      if (filterRichtung === 'negativ' && t.betrag >= 0) return false;
      return true;
    });
  }, [transaktionen, filterTyp, filterRichtung]);

  // ── Statistiken ───────────────────────────────────────
  const stats = useMemo(() => {
    const einnahmen = transaktionen.filter(t => t.betrag > 0).reduce((s, t) => s + t.betrag, 0);
    const ausgaben  = transaktionen.filter(t => t.betrag < 0).reduce((s, t) => s + t.betrag, 0);
    return { einnahmen, ausgaben: Math.abs(ausgaben), anzahl: transaktionen.length };
  }, [transaktionen]);

  // ── Kontostand-Farbe ──────────────────────────────────
  const guthabenKlasse = guthaben > startguthaben * 0.5
    ? 'positiv'
    : guthaben > 0 ? 'warnung' : 'negativ';

  // ── Handler ───────────────────────────────────────────
  function handleStartguthabenSpeichern() {
    const betrag = parseFloat(neuerStart.replace(',', '.'));
    if (isNaN(betrag) || betrag < 0) return;
    if (confirm(`Wallet auf ${betrag.toFixed(2)} € zurücksetzen? Alle Transaktionen werden gelöscht.`)) {
      setStartguthaben(betrag);
      setEinstellungenOffen(false);
    }
  }

  function handleEinzahlungBuchen() {
    const betrag = parseFloat(einzahlBetrag.replace(',', '.'));
    if (isNaN(betrag) || betrag === 0) return;
    buchen(betrag, betrag > 0 ? 'einzahlung' : 'sonstiges', einzahlBeschreibung || (betrag > 0 ? 'Manuelle Einzahlung' : 'Manuelle Abbuchung'));
    setEinzahlBetrag('');
    setEinzahlBeschreibung('');
    setEinzahlungOffen(false);
    setCodeAbfrageOffen(false);
    setEingegebenerCode('');
    setCodeFehler(false);
  }

  function handleEinzahlung() {
    const betrag = parseFloat(einzahlBetrag.replace(',', '.'));
    if (isNaN(betrag) || betrag === 0) return;
    if (betrag > 0) {
      // Bei Einzahlungen: Code-Abfrage öffnen
      setEinzahlungOffen(false);
      setCodeAbfrageOffen(true);
    } else {
      // Abbuchungen brauchen keinen Code
      handleEinzahlungBuchen();
    }
  }

  function handleCodeBestaetigen() {
    if (eingegebenerCode === EINZAHL_CODE) {
      handleEinzahlungBuchen();
    } else {
      setCodeFehler(true);
    }
  }

  function handleAdminZahlung() {
    // Spieler zahlt 5 € Gebühr an den Admin und Einzahlung wird freigeschaltet
    buchen(-5, 'sonstiges', 'Admin-Gebühr für Einzahlung');
    handleEinzahlungBuchen();
  }

  return (
    <div className="wallet-page">

      {/* ── Hero: Kontostand ─────────────────────────── */}
      <div className={`wallet-hero wallet-hero--${guthabenKlasse}`}>
        <div className="wallet-hero-inner">
          <div className="wallet-hero-label">Aktueller Kontostand</div>
          <div className={`wallet-hero-betrag wallet-betrag--${guthabenKlasse}`}>
            {guthaben.toFixed(2).replace('.', ',')} €
          </div>
          <div className="wallet-hero-start">
            Startguthaben: {startguthaben.toFixed(2).replace('.', ',')} €
          </div>

          {/* Schnellaktionen */}
          <div className="wallet-hero-actions">
            <button className="btn-wallet-action" onClick={() => setEinzahlungOffen(true)}>
              + Einzahlung
            </button>
            <button className="btn-wallet-action btn-wallet-action--ghost"
              onClick={() => setEinstellungenOffen((v) => !v)}>
              ⚙ Einstellungen
            </button>
          </div>
        </div>

        {/* ── Statistik-Chips ── */}
        <div className="wallet-stats">
          <div className="wallet-stat-chip wallet-stat-chip--gruen">
            <span className="chip-icon">📈</span>
            <div>
              <div className="chip-val">+{stats.einnahmen.toFixed(2).replace('.', ',')} €</div>
              <div className="chip-lbl">Einnahmen</div>
            </div>
          </div>
          <div className="wallet-stat-chip wallet-stat-chip--rot">
            <span className="chip-icon">📉</span>
            <div>
              <div className="chip-val">–{stats.ausgaben.toFixed(2).replace('.', ',')} €</div>
              <div className="chip-lbl">Ausgaben</div>
            </div>
          </div>
          <div className="wallet-stat-chip">
            <span className="chip-icon">🔄</span>
            <div>
              <div className="chip-val">{stats.anzahl}</div>
              <div className="chip-lbl">Transaktionen</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Einstellungen ────────────────────────────── */}
      {einstellungenOffen && (
        <div className="wallet-einstellungen">
          <h3>⚙ Wallet-Einstellungen</h3>
          <div className="einst-row">
            <label>
              Startguthaben (€)
              <small>Setzt das Wallet vollständig zurück</small>
              <div className="einst-input-row">
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={neuerStart}
                  onChange={(e) => setNeuerStart(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartguthabenSpeichern()}
                />
                <button className="btn-primary" onClick={handleStartguthabenSpeichern}>
                  Speichern & Reset
                </button>
              </div>
            </label>
          </div>
          <div className="einst-row einst-danger">
            <span>Nur Transaktionen löschen, Startguthaben behalten:</span>
            <button className="btn-danger" onClick={() => {
              if (confirm('Alle Transaktionen löschen und Wallet zurücksetzen?')) reset();
            }}>
              Wallet zurücksetzen
            </button>
          </div>
        </div>
      )}

      {/* ── Einzahlung / Abbuchung ───────────────────── */}
      {einzahlungOffen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEinzahlungOffen(false)}>
          <div className="modal wallet-modal">
            <div className="modal-header">
              <h2>Manuelle Buchung</h2>
              <button className="modal-close" onClick={() => setEinzahlungOffen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-fields">
                <label>
                  Betrag (€)
                  <small>Positiv = Einzahlung · Negativ = Abbuchung</small>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="z. B. 10.00 oder -5.00"
                    value={einzahlBetrag}
                    onChange={(e) => setEinzahlBetrag(e.target.value)}
                    autoFocus
                  />
                </label>
                <label>
                  Beschreibung (optional)
                  <input
                    type="text"
                    placeholder="z. B. Bonus, Korrektur…"
                    value={einzahlBeschreibung}
                    onChange={(e) => setEinzahlBeschreibung(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEinzahlung()}
                  />
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setEinzahlungOffen(false)}>Abbrechen</button>
              <button
                className="btn-primary"
                disabled={!einzahlBetrag || isNaN(parseFloat(einzahlBetrag))}
                onClick={handleEinzahlung}
              >
                Buchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Code-Abfrage für Einzahlungen ────────────── */}
      {codeAbfrageOffen && (
        <div className="modal-overlay">
          <div className="modal wallet-modal">
            <div className="modal-header">
              <h2>Einzahlung freischalten</h2>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text)', marginBottom: '1rem' }}>
                Um eine Einzahlung durchzuführen, bitte eine der folgenden Optionen wählen:
              </p>
              <div className="modal-fields">
                <label>
                  Code eingeben
                  <input
                    type="password"
                    placeholder="Code eingeben…"
                    value={eingegebenerCode}
                    onChange={(e) => { setEingegebenerCode(e.target.value); setCodeFehler(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCodeBestaetigen()}
                    autoFocus
                  />
                  {codeFehler && (
                    <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>Falscher Code. Bitte erneut versuchen.</span>
                  )}
                </label>
              </div>
            </div>
            <div className="modal-footer" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn-primary" onClick={handleCodeBestaetigen}>
                Code bestätigen
              </button>
              <button className="btn-danger" onClick={handleAdminZahlung}>
                5 € an Admin zahlen
              </button>
              <button className="btn-ghost" onClick={() => {
                setCodeAbfrageOffen(false);
                setEingegebenerCode('');
                setCodeFehler(false);
                setEinzahlungOffen(true);
              }}>
                Zurück
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaktions-Historie ────────────────────── */}
      <div className="wallet-historie">
        <div className="historie-header">
          <h2 className="historie-titel">Transaktions-Historie</h2>
          <div className="historie-filter">
            {/* Typ-Filter */}
            <select
              value={filterTyp}
              onChange={(e) => setFilterTyp(e.target.value)}
              className="tdb-select"
            >
              {TYP_FILTER.map((t) => (
                <option key={t} value={t}>{TYP_FILTER_LABEL[t]}</option>
              ))}
            </select>
            {/* Richtungs-Filter */}
            <select
              value={filterRichtung}
              onChange={(e) => setFilterRichtung(e.target.value)}
              className="tdb-select"
            >
              <option value="alle">± Alle</option>
              <option value="positiv">+ Einnahmen</option>
              <option value="negativ">– Ausgaben</option>
            </select>
          </div>
        </div>

        {gefiltert.length === 0 ? (
          <div className="historie-leer">Keine Transaktionen gefunden.</div>
        ) : (
          <div className="historie-liste">
            {gefiltert.map((t) => {
              const meta = TYP_META[t.typ] ?? TYP_META.sonstiges;
              const positiv = t.betrag >= 0;
              return (
                <div
                  key={t.id}
                  className={`transaktion ${positiv ? 'transaktion--positiv' : 'transaktion--negativ'}`}
                >
                  <div className="transaktion-icon">{meta.icon}</div>
                  <div className="transaktion-info">
                    <div className="transaktion-beschreibung">{t.beschreibung || meta.label}</div>
                    <div className="transaktion-meta">
                      <span className="transaktion-typ-badge">{meta.label}</span>
                      <span className="transaktion-datum">{formatDatum(t.datum)}</span>
                      <span className="transaktion-uhrzeit">{formatUhrzeit(t.datum)}</span>
                    </div>
                  </div>
                  <div className={`transaktion-betrag ${positiv ? 'betrag--positiv' : 'betrag--negativ'}`}>
                    {formatBetrag(t.betrag)}
                  </div>
                  <button
                    className="transaktion-loeschen"
                    title="Transaktion löschen"
                    onClick={() => setLoescheId(t.id)}
                  >
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {gefiltert.length > 0 && (
          <div className="historie-summe">
            <span>Summe ({gefiltert.length} Einträge)</span>
            <span className={gefiltert.reduce((s, t) => s + t.betrag, 0) >= 0 ? 'betrag--positiv' : 'betrag--negativ'}>
              {formatBetrag(gefiltert.reduce((s, t) => s + t.betrag, 0))}
            </span>
          </div>
        )}
      </div>

      {/* ── Lösch-Bestätigung ────────────────────────── */}
      {loescheId && (
        <div className="modal-overlay" onClick={() => setLoescheId(null)}>
          <div className="modal wallet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transaktion löschen?</h2>
              <button className="modal-close" onClick={() => setLoescheId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text)' }}>
                Diese Transaktion wird unwiderruflich gelöscht und der Kontostand entsprechend angepasst.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setLoescheId(null)}>Abbrechen</button>
              <button className="btn-danger" onClick={() => { transaktionLoeschen(loescheId); setLoescheId(null); }}>
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
