import { useState, useMemo, useCallback, useRef } from 'react';
import fragenDaten from '../data/fussball_fragen.json';
import { useWallet } from '../context/WalletContext';
import '../quiz.css';

// ── Konstanten ────────────────────────────────────────────────────────────────
const KATEGORIEN = fragenDaten.kategorien;

const KATEGORIE_META = {
  champions_league: { icon: '🏆', farbe: '#f59e0b' },
  bundesliga:       { icon: '🇩🇪', farbe: '#22c55e' },
  weltmeisterschaft:{ icon: '🌍', farbe: '#3b82f6' },
  transfermarkt:    { icon: '💶', farbe: '#a855f7' },
  spielerkarrieren: { icon: '⭐', farbe: '#ef4444' },
};

const SCHWIERIGKEIT_META = {
  1: { label: 'Leicht',      farbe: '#22c55e', multiplikator: 1   },
  2: { label: 'Einfach',     farbe: '#84cc16', multiplikator: 1.5 },
  3: { label: 'Mittel',      farbe: '#f59e0b', multiplikator: 2   },
  4: { label: 'Schwer',      farbe: '#ef4444', multiplikator: 3   },
  5: { label: 'Experte',     farbe: '#a855f7', multiplikator: 5   },
};

const SCHNELLEINSAETZE = [5, 10, 25, 50];

function zufaelligeFrage(kategorieId, schwierigkeit, gezeigte) {
  const kat = KATEGORIEN.find((k) => k.id === kategorieId);
  if (!kat) return null;
  const passend = kat.fragen.filter((f) => f.schwierigkeit === schwierigkeit);
  if (passend.length === 0) return null;
  // Versuche zunächst eine noch nicht gezeigte Frage
  const nochNicht = passend.filter((f) => !gezeigte.has(f.id));
  const pool = nochNicht.length > 0 ? nochNicht : passend;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Screen 1: Auswahl ─────────────────────────────────────────────────────────
function AuswahlScreen({ onStart, guthaben }) {
  const [kategorie, setKategorie]       = useState(null);
  const [schwierigkeit, setSchwierigkeit] = useState(null);
  const [einsatz, setEinsatz]           = useState('');

  const einsatzNum  = parseFloat(String(einsatz).replace(',', '.')) || 0;
  const meta        = schwierigkeit ? SCHWIERIGKEIT_META[schwierigkeit] : null;
  const gewinn      = meta ? Math.round(einsatzNum * meta.multiplikator * 100) / 100 : 0;
  const kannStarten = kategorie && schwierigkeit && einsatzNum >= 1 && einsatzNum <= guthaben;

  const setSchnellEinsatz = (betrag) =>
    setEinsatz(String(Math.min(betrag, guthaben)));

  return (
    <div className="quiz-auswahl">

      {/* Kontostand */}
      <div className="quiz-guthaben-banner">
        <span className="quiz-guthaben-label">💳 Dein Kontostand</span>
        <span className="quiz-guthaben-betrag">{guthaben.toFixed(2).replace('.', ',')} €</span>
      </div>

      {/* Kategorie */}
      <section className="auswahl-sektion">
        <h2 className="auswahl-sektion-titel">1 · Kategorie wählen</h2>
        <div className="kategorie-grid">
          {KATEGORIEN.map((k) => {
            const m = KATEGORIE_META[k.id];
            const aktiv = kategorie === k.id;
            return (
              <button
                key={k.id}
                className={`kategorie-karte ${aktiv ? 'kategorie-karte--aktiv' : ''}`}
                style={{ '--kat-farbe': m.farbe }}
                onClick={() => setKategorie(k.id)}
              >
                <span className="kategorie-icon">{m.icon}</span>
                <span className="kategorie-name">{k.name}</span>
                <span className="kategorie-anzahl">{k.fragen.length} Fragen</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Schwierigkeit */}
      <section className="auswahl-sektion">
        <h2 className="auswahl-sektion-titel">2 · Schwierigkeit wählen</h2>
        <div className="schwierigkeit-reihe">
          {[1, 2, 3, 4, 5].map((s) => {
            const m = SCHWIERIGKEIT_META[s];
            const aktiv = schwierigkeit === s;
            return (
              <button
                key={s}
                className={`schwierigkeit-btn ${aktiv ? 'schwierigkeit-btn--aktiv' : ''}`}
                style={{ '--sw-farbe': m.farbe }}
                onClick={() => setSchwierigkeit(s)}
              >
                <span className="schwierigkeit-sterne">{'★'.repeat(s)}{'☆'.repeat(5 - s)}</span>
                <span className="schwierigkeit-label">{m.label}</span>
                <span className="schwierigkeit-multi">×{m.multiplikator}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Einsatz */}
      <section className="auswahl-sektion">
        <h2 className="auswahl-sektion-titel">3 · Einsatz festlegen</h2>
        <div className="einsatz-bereich">
          <div className="einsatz-schnell">
            {SCHNELLEINSAETZE.map((b) => (
              <button
                key={b}
                className="einsatz-schnell-btn"
                onClick={() => setSchnellEinsatz(b)}
                disabled={b > guthaben}
              >
                {b} €
              </button>
            ))}
            <button
              className="einsatz-schnell-btn einsatz-schnell-btn--max"
              onClick={() => setEinsatz(String(guthaben))}
              disabled={guthaben <= 0}
            >
              Max
            </button>
          </div>
          <div className="einsatz-input-wrap">
            <input
              type="number"
              className="einsatz-input"
              min="1"
              max={guthaben}
              step="1"
              placeholder="Betrag eingeben…"
              value={einsatz}
              onChange={(e) => setEinsatz(e.target.value)}
            />
            <span className="einsatz-waehrung">€</span>
          </div>
          {einsatzNum > 0 && einsatzNum > guthaben && (
            <p className="einsatz-fehler">⚠ Einsatz übersteigt dein Guthaben ({guthaben.toFixed(2)} €)</p>
          )}
          {einsatzNum > 0 && einsatzNum <= guthaben && schwierigkeit && (
            <div className="einsatz-vorschau">
              <span>Bei richtiger Antwort erhältst du</span>
              <strong className="einsatz-gewinn">+{gewinn.toFixed(2).replace('.', ',')} €</strong>
            </div>
          )}
        </div>
      </section>

      {/* Start-Button */}
      <button
        className={`quiz-start-btn ${kannStarten ? '' : 'quiz-start-btn--disabled'}`}
        disabled={!kannStarten}
        onClick={() => onStart({ kategorie, schwierigkeit, einsatz: einsatzNum })}
      >
        {kannStarten ? '⚽ Quiz starten' : 'Kategorie, Schwierigkeit und Einsatz wählen'}
      </button>
    </div>
  );
}

// ── Screen 2: Frage ───────────────────────────────────────────────────────────
function FrageScreen({ frage, kategorie, schwierigkeit, einsatz, onAntwort }) {
  const [gewaehlt, setGewaehlt] = useState(null);
  const katMeta = KATEGORIE_META[kategorie];
  const swMeta  = SCHWIERIGKEIT_META[schwierigkeit];

  const handleWahl = (idx) => {
    if (gewaehlt !== null) return;
    setGewaehlt(idx);
    // Kurze Pause damit der Spieler das Feedback sieht
    setTimeout(() => onAntwort(idx === frage.richtig, idx), 1200);
  };

  return (
    <div className="quiz-frage-screen">

      {/* Info-Leiste */}
      <div className="frage-infobar">
        <span className="frage-info-chip" style={{ background: `${katMeta.farbe}22`, color: katMeta.farbe, borderColor: `${katMeta.farbe}55` }}>
          {katMeta.icon} {KATEGORIEN.find(k => k.id === kategorie)?.name}
        </span>
        <span className="frage-info-chip" style={{ color: swMeta.farbe, borderColor: `${swMeta.farbe}55` }}>
          {'★'.repeat(schwierigkeit)} {swMeta.label}
        </span>
        <span className="frage-info-chip frage-info-chip--einsatz">
          🎰 Einsatz: <strong>{einsatz.toFixed(2).replace('.', ',')} €</strong>
        </span>
        <span className="frage-info-chip frage-info-chip--gewinn" style={{ color: swMeta.farbe }}>
          🏆 Möglicher Gewinn: <strong>+{(einsatz * swMeta.multiplikator).toFixed(2).replace('.', ',')} €</strong>
        </span>
      </div>

      {/* Frage */}
      <div className="frage-box">
        <p className="frage-box-text">{frage.frage}</p>
      </div>

      {/* Antworten */}
      <div className="frage-antworten">
        {frage.antworten.map((antwort, idx) => {
          let klasse = 'antwort-btn';
          if (gewaehlt !== null) {
            if (idx === frage.richtig)         klasse += ' antwort-btn--richtig';
            else if (idx === gewaehlt)         klasse += ' antwort-btn--falsch';
            else                               klasse += ' antwort-btn--inaktiv';
          }
          return (
            <button key={idx} className={klasse} onClick={() => handleWahl(idx)}>
              <span className="antwort-buchstabe">{String.fromCharCode(65 + idx)}</span>
              <span className="antwort-text">{antwort}</span>
              {gewaehlt !== null && idx === frage.richtig  && <span className="antwort-icon">✓</span>}
              {gewaehlt !== null && idx === gewaehlt && idx !== frage.richtig && <span className="antwort-icon">✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Screen 3: Ergebnis ────────────────────────────────────────────────────────
function ErgebnisScreen({ richtig, einsatz, gewinn, richtigeAntwort, gewaehlt, onNochmal, onZurueck }) {
  return (
    <div className={`quiz-ergebnis-screen ${richtig ? 'ergebnis--richtig' : 'ergebnis--falsch'}`}>
      <div className="ergebnis-glow" />

      <div className="ergebnis-icon">{richtig ? '🎉' : '😞'}</div>
      <h2 className="ergebnis-titel">{richtig ? 'Richtig!' : 'Falsch!'}</h2>

      <div className={`ergebnis-betrag ${richtig ? 'ergebnis-betrag--positiv' : 'ergebnis-betrag--negativ'}`}>
        {richtig ? `+${gewinn.toFixed(2).replace('.', ',')} €` : `–${einsatz.toFixed(2).replace('.', ',')} €`}
      </div>

      {!richtig && (
        <p className="ergebnis-richtige">
          Richtige Antwort: <strong>{richtigeAntwort}</strong>
        </p>
      )}
      {richtig && (
        <p className="ergebnis-richtige ergebnis-richtige--positiv">
          Einsatz × Multiplikator = {einsatz.toFixed(2).replace('.', ',')} € × {gewinn / einsatz} = {gewinn.toFixed(2).replace('.', ',')} €
        </p>
      )}

      <div className="ergebnis-aktionen">
        <button className="ergebnis-btn ergebnis-btn--nochmal" onClick={onNochmal}>
          🔄 Nochmal spielen
        </button>
        <button className="ergebnis-btn ergebnis-btn--zurueck" onClick={onZurueck}>
          ← Zur Auswahl
        </button>
      </div>
    </div>
  );
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────
export default function Quiz() {
  const { guthaben, buchen } = useWallet();

  const [screen, setScreen]           = useState('auswahl'); // auswahl | frage | ergebnis
  const [aktuelleKategorie, setAktuelleKategorie]   = useState(null);
  const [aktuelleSchwierigkeit, setAktuelleSchwierigkeit] = useState(null);
  const [aktuellerEinsatz, setAktuellerEinsatz]     = useState(0);
  const [aktuelleFrage, setAktuelleFrage]           = useState(null);
  const [letzteRunde, setLetzteRunde]               = useState(null);
  // Tracking gezeigte Fragen je Kategorie+Schwierigkeit um Wiederholungen zu vermeiden
  const gezeigteFragenRef = useRef({});

  function getGezeigteSet(kategorieId, schwierigkeit) {
    const key = `${kategorieId}_${schwierigkeit}`;
    if (!gezeigteFragenRef.current[key]) gezeigteFragenRef.current[key] = new Set();
    return gezeigteFragenRef.current[key];
  }

  const handleStart = useCallback(({ kategorie, schwierigkeit, einsatz }) => {
    const gezeigte = getGezeigteSet(kategorie, schwierigkeit);
    const frage = zufaelligeFrage(kategorie, schwierigkeit, gezeigte);
    if (!frage) return;
    gezeigte.add(frage.id);
    setAktuelleKategorie(kategorie);
    setAktuelleSchwierigkeit(schwierigkeit);
    setAktuellerEinsatz(einsatz);
    setAktuelleFrage(frage);
    setScreen('frage');
  }, []);

  const handleAntwort = useCallback((richtig, gewaehltIdx) => {
    const swMeta   = SCHWIERIGKEIT_META[aktuelleSchwierigkeit];
    const gewinn   = Math.round(aktuellerEinsatz * swMeta.multiplikator * 100) / 100;
    const katName  = KATEGORIEN.find(k => k.id === aktuelleKategorie)?.name ?? '';

    if (richtig) {
      buchen(
        gewinn,
        'quiz_gewinn',
        `Quiz gewonnen – ${katName} ★${'★'.repeat(aktuelleSchwierigkeit - 1)} (${aktuellerEinsatz.toFixed(2)} € × ${swMeta.multiplikator})`
      );
    } else {
      buchen(
        -aktuellerEinsatz,
        'quiz_verlust',
        `Quiz verloren – ${katName} ★${'★'.repeat(aktuelleSchwierigkeit - 1)} (Einsatz: ${aktuellerEinsatz.toFixed(2)} €)`
      );
    }

    setLetzteRunde({
      richtig,
      einsatz: aktuellerEinsatz,
      gewinn,
      multiplikator: swMeta.multiplikator,
      richtigeAntwort: aktuelleFrage.antworten[aktuelleFrage.richtig],
    });
    setScreen('ergebnis');
  }, [aktuelleSchwierigkeit, aktuellerEinsatz, aktuelleKategorie, aktuelleFrage, buchen]);

  const handleNochmal = useCallback(() => {
    if (guthaben < 1) { setScreen('auswahl'); return; }
    const gezeigte = getGezeigteSet(aktuelleKategorie, aktuelleSchwierigkeit);
    const frage = zufaelligeFrage(aktuelleKategorie, aktuelleSchwierigkeit, gezeigte);
    if (!frage) { setScreen('auswahl'); return; }
    gezeigte.add(frage.id);
    setAktuelleFrage(frage);
    setScreen('frage');
  }, [aktuelleKategorie, aktuelleSchwierigkeit, guthaben]);

  return (
    <div className="quiz-page">
      <div className="quiz-page-header">
        <h1 className="quiz-page-titel">🧠 Quiz</h1>
        {screen !== 'auswahl' && (
          <button className="quiz-back-link" onClick={() => setScreen('auswahl')}>
            ← Neue Auswahl
          </button>
        )}
      </div>

      {screen === 'auswahl' && (
        <AuswahlScreen onStart={handleStart} guthaben={guthaben} />
      )}
      {screen === 'frage' && aktuelleFrage && (
        <FrageScreen
          frage={aktuelleFrage}
          kategorie={aktuelleKategorie}
          schwierigkeit={aktuelleSchwierigkeit}
          einsatz={aktuellerEinsatz}
          onAntwort={handleAntwort}
        />
      )}
      {screen === 'ergebnis' && letzteRunde && (
        <ErgebnisScreen
          {...letzteRunde}
          onNochmal={handleNochmal}
          onZurueck={() => setScreen('auswahl')}
        />
      )}
    </div>
  );
}
