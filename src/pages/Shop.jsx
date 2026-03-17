import { useState, useEffect, useRef } from 'react';
import { useWallet }    from '../context/WalletContext';
import { useSammlung }  from '../context/SammlungContext';
import { useSpieler }   from '../context/SpielerContext';
import { useLiga, LIGEN } from '../context/LigaContext';
import { zieheSpieler, RARITAET_FARBE, RARITAET_GLOW } from '../services/ziehung';
import TrikotSVG        from '../components/trikot/TrikotSVG';
import '../shop.css';

// ── Vereinslogo (Transfermarkt CDN mit Farb-Fallback) ─────────────────────────
function VereinsLogo({ verein, size = 24 }) {
  const [fehler, setFehler] = useState(false);
  if (!verein) return null;
  const farbe  = verein.heimtrikot?.farbe1 || '#6b7280';
  const kuerzel = verein.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
  if (fehler) {
    return (
      <span
        className="verein-logo-fallback"
        style={{ width: size, height: size, background: farbe, fontSize: Math.max(8, size * 0.36) }}
      >
        {kuerzel}
      </span>
    );
  }
  return (
    <img
      className="verein-logo-img"
      src={`https://media.api-sports.io/football/teams/${verein.id}.png`}
      alt={verein.name}
      width={size}
      height={size}
      onError={() => setFehler(true)}
    />
  );
}

const PACK_PREIS = 200;

// Animations-Phasen
// bereit → kaufen → oeffnen → verdeckt → enthuellung → ergebnis
const PHASE_DAUER = {
  kaufen:      600,
  oeffnen:    1800,
  verdeckt:    800,
  enthuellung:2200,
};

// ── Pack-Visualisierung ───────────────────────────────────────────────────────
function MysteryPackVisual({ phase }) {
  return (
    <div className={`pack-wrap pack-wrap--${phase}`}>
      {(phase === 'oeffnen' || phase === 'verdeckt') && (
        <div className="pack-partikel">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="partikel" style={{ '--i': i }} />
          ))}
        </div>
      )}
      <div className="pack-body">
        <div className="pack-glow" />
        <div className="pack-streifen" />
        <div className="pack-logo">⚽</div>
        <div className="pack-text">Mystery Pack</div>
        <div className="pack-preis">{PACK_PREIS} €</div>
      </div>
    </div>
  );
}

// ── Spielerfoto (API-Sports CDN mit Initialen-Fallback) ──────────────────────
function SpielerFoto({ spieler, size = 54 }) {
  const [fehler, setFehler] = useState(false);
  const initialen = spieler.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  if (fehler) {
    return (
      <span className="spieler-foto-fallback" style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {initialen}
      </span>
    );
  }
  return (
    <img
      className="spieler-foto-img"
      src={`https://media.api-sports.io/football/players/${spieler.id}.png`}
      alt={spieler.name}
      width={size}
      height={size}
      onError={() => setFehler(true)}
    />
  );
}

// ── Trikot-Karte (verdeckt/enthüllt) ─────────────────────────────────────────
function TrikotKarte({ ergebnis, phase }) {
  const farbe  = ergebnis ? RARITAET_FARBE[ergebnis.raritaetStufe]  : '#6b7280';
  const glow   = ergebnis ? RARITAET_GLOW[ergebnis.raritaetStufe]   : 'transparent';
  const sterne = ergebnis ? '★'.repeat(ergebnis.raritaetStufe) + '☆'.repeat(5 - ergebnis.raritaetStufe) : '';

  return (
    <div
      className={`trikot-karte-flip ${phase === 'enthuellung' || phase === 'ergebnis' ? 'trikot-karte-flip--aufgedeckt' : ''}`}
      style={{ '--raritaet-farbe': farbe, '--raritaet-glow': glow }}
    >
      {/* Rückseite */}
      <div className="trikot-karte-rueck">
        <div className="trikot-karte-rueck-muster" />
        <span className="trikot-karte-rueck-logo">⚽</span>
      </div>

      {/* Vorderseite */}
      <div className="trikot-karte-vorder">
        {ergebnis && (
          <>
            {/* Rarität */}
            <div className="trikot-karte-raritaet" style={{ color: farbe }}>
              <span className="trikot-karte-sterne">{sterne}</span>
              <span className="trikot-karte-label">{ergebnis.raritaetLabel}</span>
            </div>

            {/* Vereins-Header in Trikot-Farbe */}
            <div
              className="trikot-karte-verein-header"
              style={{ background: ergebnis.trikot.farbe1, color: ergebnis.trikot.farbe2 }}
            >
              <VereinsLogo verein={ergebnis.verein} size={22} />
              <span className="trikot-karte-verein-name">{ergebnis.verein.name}</span>
              <span className="trikot-karte-heimaus-badge">
                {ergebnis.trikotTyp === 'heim' ? 'Heim' : 'Auswärts'}
              </span>
            </div>

            {/* Trikot + Spielerfoto */}
            <div className="trikot-karte-haupt">
              <div className="trikot-karte-svg-wrap">
                <TrikotSVG
                  {...ergebnis.trikot}
                  nummer={ergebnis.spieler.nummer}
                  name={ergebnis.spieler.name}
                />
              </div>
              <div className="trikot-karte-foto-col">
                <SpielerFoto spieler={ergebnis.spieler} size={54} />
                <div className="trikot-karte-nr-badge" style={{ background: farbe }}>
                  #{ergebnis.spieler.nummer}
                </div>
              </div>
            </div>

            {/* Spieler-Info */}
            <div className="trikot-karte-info">
              <div className="trikot-karte-spieler">{ergebnis.spieler.name}</div>
              <div className="trikot-karte-meta">
                <span className="trikot-karte-pos">{ergebnis.spieler.position}</span>
                <span className="trikot-karte-wert" style={{ color: farbe }}>
                  {ergebnis.spieler.marktwert} Mio. €
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Liga-Hinweis wenn keine Spieler geladen ───────────────────────────────────
function ShopLigaHinweis({ liga }) {
  try {
    const raw = localStorage.getItem(`mysterypack_trikot_${liga.id}`);
    const vereine = raw ? JSON.parse(raw) : [];
    const spielerCount = vereine.reduce(
      (n, v) => n + v.spieler.filter((s) => s.marktwert > 0).length, 0
    );
    if (spielerCount === 0) {
      return (
        <p className="shop-liga-hinweis">
          ⚠️ Für <strong>{liga.icon} {liga.name}</strong> sind noch keine Spieler
          mit Marktwert geladen. Bitte erst in der{' '}
          <strong>Trikot-Datenbank</strong> die Kader per API laden.
        </p>
      );
    }
  } catch {}
  return null;
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function Shop() {
  const { guthaben, buchen }   = useWallet();
  const { hinzufuegen }        = useSammlung();
  const { aktiverSpieler, spieler, aktiverIndex, wechseln } = useSpieler();
  const { liga } = useLiga();

  const [phase, setPhase]      = useState('bereit');
  const [ergebnis, setErgebnis]= useState(null);
  const [gekaufteItems, setGekaufteItems] = useState(0);
  const timerRef               = useRef([]);

  // Refs damit der Cleanup-Effekt immer die aktuellen Werte sieht
  const phaseRef    = useRef(phase);
  const wechselnRef = useRef(wechseln);
  phaseRef.current    = phase;
  wechselnRef.current = wechseln;

  const kannKaufen = guthaben >= PACK_PREIS && phase === 'bereit';

  useEffect(() => () => {
    timerRef.current.forEach(clearTimeout);
    // Wenn ein Pack gezogen wurde und der Spieler einfach navigiert statt
    // den Wechsel-Button zu drücken, trotzdem automatisch wechseln.
    if (phaseRef.current === 'ergebnis') {
      wechselnRef.current();
    }
  }, []);

  function addTimer(fn, ms) {
    const t = setTimeout(fn, ms);
    timerRef.current.push(t);
    return t;
  }

  function handleKaufen() {
    if (!kannKaufen) return;
    buchen(-PACK_PREIS, 'mystery_pack', `Mystery Pack #${gekaufteItems + 1} gekauft`);
    setPhase('kaufen');
    const gezogen = zieheSpieler(liga.id);

    addTimer(() => setPhase('oeffnen'),      PHASE_DAUER.kaufen);
    addTimer(() => setPhase('verdeckt'),     PHASE_DAUER.kaufen + PHASE_DAUER.oeffnen);
    addTimer(() => {
      setErgebnis(gezogen);
      setPhase('enthuellung');
    }, PHASE_DAUER.kaufen + PHASE_DAUER.oeffnen + PHASE_DAUER.verdeckt);
    addTimer(() => {
      setPhase('ergebnis');
      if (gezogen) hinzufuegen(gezogen);
      setGekaufteItems((n) => n + 1);
    }, PHASE_DAUER.kaufen + PHASE_DAUER.oeffnen + PHASE_DAUER.verdeckt + PHASE_DAUER.enthuellung);
  }

  function handleNochmal() {
    setErgebnis(null);
    setPhase('bereit');
  }

  function handleSpielerWechsel() {
    // Phase zuerst zurücksetzen, damit der Unmount-Cleanup
    // keinen zweiten wechseln()-Aufruf macht.
    setPhase('bereit');
    setErgebnis(null);
    wechseln();
  }

  const naechsterSpieler = spieler[aktiverIndex === 0 ? 1 : 0];
  const zeigePack  = phase === 'bereit' || phase === 'kaufen' || phase === 'oeffnen';
  const zeigeKarte = phase === 'verdeckt' || phase === 'enthuellung' || phase === 'ergebnis';

  return (
    <div className="shop-page">

      {/* ── Header ── */}
      <div className="shop-header">
        <div>
          <h1 className="shop-titel">🎁 Shop / Mystery Pack</h1>
          <p className="shop-subtitel">
            {liga.icon} {liga.name} · Seltenheit nach Marktwert
          </p>
        </div>
        <div className="shop-header-rechts">
          {/* Aktiver Spieler */}
          <div className="shop-aktiver-spieler" style={{ '--sp-farbe': aktiverSpieler.farbe }}>
            <span className="shop-sp-dot" />
            <span className="shop-sp-name">{aktiverSpieler.name} ist dran</span>
          </div>
          <div className="shop-guthaben">
            <span className="shop-guthaben-label">💳 Guthaben</span>
            <span className={`shop-guthaben-betrag ${guthaben < PACK_PREIS ? 'shop-guthaben--knapp' : ''}`}>
              {guthaben.toFixed(2).replace('.', ',')} €
            </span>
          </div>
        </div>
      </div>

      {/* ── Haupt-Arena ── */}
      <div className="shop-arena">

        {/* Pack-Animation */}
        {zeigePack && (
          <div className="arena-pack-bereich">
            <MysteryPackVisual phase={phase} />
            <div className="arena-pack-info">
              <div className="pack-preis-gross">{PACK_PREIS} €</div>
              <div className="pack-preis-label">pro Mystery Pack</div>
            </div>
            {phase === 'bereit' && (
              <>
                <button
                  className={`shop-kauf-btn ${!kannKaufen ? 'shop-kauf-btn--disabled' : ''}`}
                  disabled={!kannKaufen}
                  onClick={handleKaufen}
                >
                  {guthaben < PACK_PREIS
                    ? `Zu wenig Guthaben (min. ${PACK_PREIS} €)`
                    : '📦 Pack öffnen'}
                </button>
                <ShopLigaHinweis liga={liga} />
              </>
            )}
            {phase === 'kaufen' && (
              <p className="arena-status">💸 Zahlung wird verarbeitet…</p>
            )}
            {phase === 'oeffnen' && (
              <p className="arena-status arena-status--spannend">✨ Pack wird geöffnet…</p>
            )}
          </div>
        )}

        {/* Karten-Enthüllung */}
        {zeigeKarte && (
          <div className="arena-karte-bereich">
            <div className="arena-karte-zeile">
              {/* Links: Vereinsname */}
              <div className="arena-karte-seite">
                {phase === 'ergebnis' && ergebnis && (
                  <span className="ergebnis-verein-name ergebnis-verein-name--seite">
                    {ergebnis.verein.name}
                  </span>
                )}
              </div>

              <TrikotKarte ergebnis={ergebnis} phase={phase} />

              {/* Rechts: Logo */}
              <div className="arena-karte-seite">
                {phase === 'ergebnis' && ergebnis && (
                  <VereinsLogo verein={ergebnis.verein} size={64} />
                )}
              </div>
            </div>

            {phase === 'verdeckt' && (
              <p className="arena-status arena-status--spannend">🎲 Ziehung läuft…</p>
            )}
            {phase === 'enthuellung' && ergebnis && (
              <p className="arena-status arena-status--enthuellung"
                style={{ color: RARITAET_FARBE[ergebnis.raritaetStufe] }}>
                {ergebnis.raritaetStufe >= 4 ? '🔥 ' : ''}{ergebnis.raritaetLabel}!
              </p>
            )}

            {phase === 'ergebnis' && ergebnis && (
              <div className="ergebnis-aktionen">
                <div className="ergebnis-zusammenfassung">
                  <p className="ergebnis-gz-text">
                    <strong>{ergebnis.spieler.name}</strong> wurde der Sammlung von{' '}
                    <span style={{ color: aktiverSpieler.farbe }}>{aktiverSpieler.name}</span>{' '}
                    hinzugefügt!
                  </p>
                  <p className="ergebnis-prob">
                    Ziehwahrscheinlichkeit: {ergebnis.wahrscheinlichkeit < 0.01
                      ? '< 0.01'
                      : ergebnis.wahrscheinlichkeit.toFixed(3)}%
                  </p>
                </div>
                <div className="ergebnis-btns">
                  {/* Nochmal – gleicher Spieler */}
                  {kannKaufen && (
                    <button className="ergebnis-btn ergebnis-btn--nochmal" onClick={handleNochmal}>
                      📦 Nochmal öffnen
                    </button>
                  )}
                  {/* Spielerwechsel + sofort ziehen */}
                  <button
                    className="ergebnis-btn ergebnis-btn--wechsel"
                    style={{ '--sp-farbe': naechsterSpieler.farbe }}
                    onClick={handleSpielerWechsel}
                  >
                    ⇄ {naechsterSpieler.name} ist dran
                  </button>
                  {/* Einfach zurück */}
                  <button className="ergebnis-btn ergebnis-btn--sammlung" onClick={handleNochmal}>
                    ← Zurück
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Raritäts-Tabelle ── */}
      {phase === 'bereit' && (
        <div className="shop-raritaeten">
          <h3 className="shop-raritaeten-titel">Raritätsstufen</h3>
          <div className="raritaet-grid">
            {[
              { stufe: 5, label: 'Legendär',     bedingung: '> 100 Mio. €', farbe: '#f59e0b' },
              { stufe: 4, label: 'Episch',        bedingung: '50 – 100 Mio. €', farbe: '#a855f7' },
              { stufe: 3, label: 'Selten',        bedingung: '20 – 50 Mio. €', farbe: '#3b82f6' },
              { stufe: 2, label: 'Ungewöhnlich',  bedingung: '5 – 20 Mio. €',  farbe: '#22c55e' },
              { stufe: 1, label: 'Gewöhnlich',    bedingung: '< 5 Mio. €',     farbe: '#6b7280' },
            ].map(({ stufe, label, bedingung, farbe }) => (
              <div key={stufe} className="raritaet-zeile" style={{ '--r-farbe': farbe }}>
                <span className="raritaet-sterne" style={{ color: farbe }}>
                  {'★'.repeat(stufe)}{'☆'.repeat(5 - stufe)}
                </span>
                <span className="raritaet-label" style={{ color: farbe }}>{label}</span>
                <span className="raritaet-bedingung">Marktwert {bedingung}</span>
              </div>
            ))}
          </div>
          <p className="shop-hinweis">
            Die Ziehwahrscheinlichkeit ist umgekehrt proportional zum Marktwert –
            ein 1-Mio.-Spieler ist ~200× häufiger als ein 200-Mio.-Spieler.
          </p>
        </div>
      )}
    </div>
  );
}
