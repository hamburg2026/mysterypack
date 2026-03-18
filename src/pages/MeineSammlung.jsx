import { useState, useMemo } from 'react';
import { useSammlung }   from '../context/SammlungContext';
import { useSpieler }    from '../context/SpielerContext';
import { useWallet }     from '../context/WalletContext';
import { RARITAET_FARBE } from '../services/ziehung';
import TrikotSVG          from '../components/trikot/TrikotSVG';
import VereinsLogo         from '../components/trikot/VereinsLogo';
import '../sammlung.css';

const PACK_PREIS = 200;

/** Verkaufspreis: proportional zum Marktwert, Referenz 100 Mio = 200 € */
function verkaufsPreis(marktwert) {
  return Math.max(5, Math.round(PACK_PREIS * (marktwert ?? 0) / 100));
}

const RARITAET_LABEL = {
  1: 'Gewöhnlich', 2: 'Ungewöhnlich', 3: 'Selten', 4: 'Episch', 5: 'Legendär',
};

function formatDatum(iso) {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Einzelne Karte ────────────────────────────────────────────────────────────
function SammlungsKarte({ item, isDuplikat, onLoeschen, onVerkaufen }) {
  const farbe  = RARITAET_FARBE[item.raritaetStufe] ?? '#6b7280';
  const sterne = '★'.repeat(item.raritaetStufe) + '☆'.repeat(5 - item.raritaetStufe);
  const preis  = verkaufsPreis(item.spieler.marktwert);

  return (
    <div className={`s-karte ${isDuplikat ? 's-karte--duplikat' : ''}`} style={{ '--r-farbe': farbe }}>
      {isDuplikat && <div className="s-karte-duplikat-badge">Duplikat</div>}

      <div className="s-karte-raritaet" style={{ color: farbe }}>
        <span>{sterne}</span>
        <span className="s-karte-r-label">{item.raritaetLabel ?? RARITAET_LABEL[item.raritaetStufe]}</span>
      </div>

      <div className="s-karte-trikot">
        <TrikotSVG
          {...item.trikot}
          nummer={item.spieler.nummer}
          name={item.spieler.name}
        />
      </div>

      <div className="s-karte-info">
        <div className="s-karte-spieler-zeile">
          <VereinsLogo verein={item.verein} size={18} />
          <div className="s-karte-spieler">{item.spieler.name}</div>
        </div>
        <div className="s-karte-verein">{item.verein.name}</div>
        <div className="s-karte-meta">
          <span className="s-karte-typ">
            {item.trikotTyp === 'heim' ? '🏠 Heim' : '✈️ Auswärts'}
          </span>
          <span className="s-karte-nr">#{item.spieler.nummer}</span>
        </div>
        <div className="s-karte-wert" style={{ color: farbe }}>
          {item.spieler.marktwert} Mio. €
        </div>
        {item.ligaId && <div className="s-karte-saison">{item.ligaId.toUpperCase()}</div>}
        <div className="s-karte-datum">{formatDatum(item.gezogenAm)}</div>
      </div>

      {onVerkaufen && (
        <button
          className="s-karte-verkaufen"
          onClick={() => onVerkaufen(item, preis)}
          title={`Verkaufen für ${preis} €`}
        >
          💰 {preis} €
        </button>
      )}

      {onLoeschen && (
        <button className="s-karte-loeschen" onClick={() => onLoeschen(item.id)} title="Aus Sammlung entfernen">
          🗑
        </button>
      )}
    </div>
  );
}

// ── Gruppen-Header ────────────────────────────────────────────────────────────
function GruppenHeader({ name, anzahl, farbe }) {
  return (
    <div className="sammlung-gruppe-header" style={{ '--g-farbe': farbe ?? 'var(--border)' }}>
      <span className="sammlung-gruppe-name">{name}</span>
      <span className="sammlung-gruppe-anzahl">{anzahl}</span>
    </div>
  );
}

// ── Gruppenlogik ──────────────────────────────────────────────────────────────
const RARITAET_REIHENFOLGE = [5, 4, 3, 2, 1];

function gruppeKey(item, gruppiertNach) {
  switch (gruppiertNach) {
    case 'verein':    return item.verein.name;
    case 'raritaet':  return String(item.raritaetStufe);
    case 'liga':      return item.ligaId ?? 'Unbekannt';
    case 'typ':       return item.trikotTyp === 'heim' ? 'Heimtrikots' : 'Auswärtstrikots';
    default:          return 'Alle';
  }
}

function gruppenFarbe(key, gruppiertNach) {
  if (gruppiertNach === 'raritaet') return RARITAET_FARBE[Number(key)] ?? '#6b7280';
  if (gruppiertNach === 'typ') return key === 'Heimtrikots' ? '#22c55e' : '#3b82f6';
  return null;
}

function gruppenLabel(key, gruppiertNach) {
  if (gruppiertNach === 'raritaet') return `${'★'.repeat(Number(key))} ${RARITAET_LABEL[Number(key)] ?? key}`;
  return key;
}

function sortiereGruppen(gruppen, gruppiertNach) {
  if (gruppiertNach === 'raritaet') {
    return gruppen.sort((a, b) =>
      RARITAET_REIHENFOLGE.indexOf(Number(a.key)) - RARITAET_REIHENFOLGE.indexOf(Number(b.key))
    );
  }
  return gruppen.sort((a, b) => a.key.localeCompare(b.key, 'de'));
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function MeineSammlung() {
  const { sammlungVon, loeschen } = useSammlung();
  const { spieler, aktiverIndex }  = useSpieler();
  const { buchen }                 = useWallet();

  const [ansichtIndex, setAnsichtIndex] = useState(aktiverIndex);
  const [filterStufe,  setFilterStufe]  = useState(0);
  const [filterTyp,    setFilterTyp]    = useState('alle');
  const [filterVerein, setFilterVerein] = useState('alle');
  const [filterDuplikat, setFilterDuplikat] = useState(false);
  const [sortierung,   setSortierung]   = useState('neu');
  const [gruppiertNach, setGruppiertNach] = useState('verein');
  const [loescheId,    setLoescheId]    = useState(null);
  const [verkaufItem,  setVerkaufItem]  = useState(null); // { item, preis }

  const istEigene = ansichtIndex === aktiverIndex;
  const sammlung  = sammlungVon(ansichtIndex);
  const angezeigterSpieler = spieler[ansichtIndex];

  // ── Duplikat-Erkennung ──
  const duplikatSet = useMemo(() => {
    const seen  = new Set();
    const dupes = new Set();
    const sorted = [...sammlung].sort((a, b) => new Date(a.gezogenAm) - new Date(b.gezogenAm));
    for (const item of sorted) {
      const key = `${item.spieler.id}_${item.trikotTyp}`;
      if (seen.has(key)) dupes.add(item.id);
      else seen.add(key);
    }
    return dupes;
  }, [sammlung]);

  // ── Dynamische Filter-Optionen ──
  const verfuegbareVereine = useMemo(
    () => [...new Set(sammlung.map((i) => i.verein.name))].sort(),
    [sammlung]
  );
  // ── Gefiltert + sortiert ──
  const gefiltert = useMemo(() => {
    let liste = [...sammlung];
    if (filterStufe > 0)         liste = liste.filter((i) => i.raritaetStufe === filterStufe);
    if (filterTyp !== 'alle')    liste = liste.filter((i) => i.trikotTyp === filterTyp);
    if (filterVerein !== 'alle') liste = liste.filter((i) => i.verein.name === filterVerein);
    if (filterDuplikat)          liste = liste.filter((i) => duplikatSet.has(i.id));
    switch (sortierung) {
      case 'alt':        liste.sort((a, b) => new Date(a.gezogenAm) - new Date(b.gezogenAm)); break;
      case 'marktwert':  liste.sort((a, b) => (b.spieler.marktwert ?? 0) - (a.spieler.marktwert ?? 0)); break;
      case 'seltenheit': liste.sort((a, b) => b.raritaetStufe - a.raritaetStufe); break;
      default:           liste.sort((a, b) => new Date(b.gezogenAm) - new Date(a.gezogenAm));
    }
    return liste;
  }, [sammlung, filterStufe, filterTyp, filterVerein, filterDuplikat, sortierung, duplikatSet]);

  // ── Gruppen bilden ──
  const gruppen = useMemo(() => {
    if (gruppiertNach === 'keine') {
      return [{ key: 'alle', label: 'Alle', farbe: null, items: gefiltert }];
    }
    const map = new Map();
    for (const item of gefiltert) {
      const key = gruppeKey(item, gruppiertNach);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    const result = [...map.entries()].map(([key, items]) => ({
      key,
      label: gruppenLabel(key, gruppiertNach),
      farbe: gruppenFarbe(key, gruppiertNach),
      items,
    }));
    return sortiereGruppen(result, gruppiertNach);
  }, [gefiltert, gruppiertNach]);

  // ── Statistiken ──
  const stats = useMemo(() => {
    const stufen = [1, 2, 3, 4, 5].map((s) => ({
      stufe: s,
      anzahl: sammlung.filter((i) => i.raritaetStufe === s).length,
    }));
    const gesamtMarktwert = sammlung.reduce((s, i) => s + (i.spieler.marktwert ?? 0), 0);
    return { stufen, gesamtMarktwert, duplikatAnzahl: duplikatSet.size };
  }, [sammlung, duplikatSet]);

  return (
    <div className="sammlung-page">

      {/* ── Spieler-Tabs ── */}
      <div className="sammlung-spieler-tabs">
        {spieler.map((sp, idx) => (
          <button
            key={idx}
            className={`sammlung-spieler-tab ${ansichtIndex === idx ? 'sammlung-spieler-tab--aktiv' : ''}`}
            style={{ '--sp-farbe': sp.farbe }}
            onClick={() => setAnsichtIndex(idx)}
          >
            <span className="sst-dot" />
            <span className="sst-name">{sp.name}</span>
            <span className="sst-anzahl">{sammlungVon(idx).length}</span>
          </button>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="sammlung-header" style={{ '--sp-farbe': angezeigterSpieler.farbe }}>
        <div>
          <h1 className="sammlung-titel">🏆 Sammlung von {angezeigterSpieler.name}</h1>
          <p className="sammlung-subtitel">
            {sammlung.length} Trikot{sammlung.length !== 1 ? 's' : ''}
            {stats.duplikatAnzahl > 0 && ` · ${stats.duplikatAnzahl} Duplikat${stats.duplikatAnzahl !== 1 ? 'e' : ''}`}
          </p>
        </div>
        <div className="sammlung-stats">
          {stats.stufen.filter((s) => s.anzahl > 0).map(({ stufe, anzahl }) => (
            <div key={stufe} className="sammlung-stat" style={{ '--r-farbe': RARITAET_FARBE[stufe] }}>
              <span className="sammlung-stat-sterne" style={{ color: RARITAET_FARBE[stufe] }}>
                {'★'.repeat(stufe)}
              </span>
              <span className="sammlung-stat-anzahl" style={{ color: RARITAET_FARBE[stufe] }}>{anzahl}×</span>
            </div>
          ))}
          <div className="sammlung-stat sammlung-stat--wert">
            <span className="sammlung-stat-lbl">Gesamtwert</span>
            <span className="sammlung-stat-anzahl">{stats.gesamtMarktwert.toFixed(0)} Mio.&nbsp;€</span>
          </div>
        </div>
      </div>

      {sammlung.length === 0 ? (
        <div className="sammlung-leer">
          <div className="sammlung-leer-icon">📦</div>
          <h2>Noch keine Trikots</h2>
          <p>Kaufe ein Mystery Pack im Shop und ziehe dein erstes Trikot!</p>
        </div>
      ) : (
        <>
          {/* ── Filter + Gruppierung ── */}
          <div className="sammlung-filter-bar">

            {/* Gruppierung */}
            <div className="sammlung-filter-gruppe">
              <span className="filter-label">Gruppe</span>
              <div className="filter-chips">
                {[
                  ['verein',   '🏟 Verein'],
                  ['raritaet', '⭐ Rarität'],
                  ['liga',     '🏆 Liga'],
                  ['typ',      '👕 Typ'],
                  ['keine',    'Keine'],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    className={`filter-chip ${gruppiertNach === v ? 'filter-chip--aktiv' : ''}`}
                    onClick={() => setGruppiertNach(v)}
                  >{l}</button>
                ))}
              </div>
            </div>

            {/* Duplikate */}
            {stats.duplikatAnzahl > 0 && (
              <div className="sammlung-filter-gruppe">
                <span className="filter-label">Extras</span>
                <div className="filter-chips">
                  <button
                    className={`filter-chip ${filterDuplikat ? 'filter-chip--aktiv' : ''}`}
                    style={filterDuplikat ? { '--akzent': '#ef4444' } : {}}
                    onClick={() => setFilterDuplikat((v) => !v)}
                  >
                    🔁 Nur Duplikate
                    <span className="chip-anzahl">{stats.duplikatAnzahl}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Rarität */}
            <div className="sammlung-filter-gruppe">
              <span className="filter-label">Rarität</span>
              <div className="filter-chips">
                <button className={`filter-chip ${filterStufe === 0 ? 'filter-chip--aktiv' : ''}`}
                  onClick={() => setFilterStufe(0)}>Alle</button>
                {[5, 4, 3, 2, 1].map((s) => (
                  <button
                    key={s}
                    className={`filter-chip ${filterStufe === s ? 'filter-chip--aktiv' : ''}`}
                    style={{ '--akzent': RARITAET_FARBE[s] }}
                    onClick={() => setFilterStufe(s)}
                  >
                    <span style={{ color: RARITAET_FARBE[s] }}>{'★'.repeat(s)}</span>
                    {' '}{RARITAET_LABEL[s]}
                    <span className="chip-anzahl">{sammlung.filter((i) => i.raritaetStufe === s).length}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Typ */}
            <div className="sammlung-filter-gruppe">
              <span className="filter-label">Typ</span>
              <div className="filter-chips">
                {[['alle','Alle'],['heim','🏠 Heim'],['auswaerts','✈️ Auswärts']].map(([v, l]) => (
                  <button key={v} className={`filter-chip ${filterTyp === v ? 'filter-chip--aktiv' : ''}`}
                    onClick={() => setFilterTyp(v)}>{l}</button>
                ))}
              </div>
            </div>

            {/* Verein */}
            {verfuegbareVereine.length > 1 && (
              <div className="sammlung-filter-gruppe">
                <span className="filter-label">Verein</span>
                <div className="filter-chips">
                  <button className={`filter-chip ${filterVerein === 'alle' ? 'filter-chip--aktiv' : ''}`}
                    onClick={() => setFilterVerein('alle')}>
                    Alle<span className="chip-anzahl">{sammlung.length}</span>
                  </button>
                  {verfuegbareVereine.map((v) => (
                    <button key={v}
                      className={`filter-chip ${filterVerein === v ? 'filter-chip--aktiv' : ''}`}
                      onClick={() => setFilterVerein(v)}>
                      {v}
                      <span className="chip-anzahl">{sammlung.filter((i) => i.verein.name === v).length}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sortierung */}
            <div className="sammlung-filter-gruppe">
              <span className="filter-label">Sortierung</span>
              <select className="tdb-select" value={sortierung} onChange={(e) => setSortierung(e.target.value)}>
                <option value="neu">Neueste zuerst</option>
                <option value="alt">Älteste zuerst</option>
                <option value="marktwert">Marktwert ↓</option>
                <option value="seltenheit">Seltenheit ↓</option>
              </select>
            </div>
          </div>

          {/* ── Gruppen + Karten ── */}
          {gefiltert.length === 0 ? (
            <div className="sammlung-filter-leer">Keine Karten für diese Filterauswahl.</div>
          ) : (
            <div className="sammlung-gruppen">
              {gruppen.map((gruppe) => (
                <div key={gruppe.key} className="sammlung-gruppe">
                  {gruppiertNach !== 'keine' && (
                    <GruppenHeader
                      name={gruppe.label}
                      anzahl={gruppe.items.length}
                      farbe={gruppe.farbe}
                    />
                  )}
                  <div className="sammlung-grid">
                    {gruppe.items.map((item) => (
                      <SammlungsKarte
                        key={item.id}
                        item={item}
                        isDuplikat={duplikatSet.has(item.id)}
                        onLoeschen={istEigene ? setLoescheId : null}
                        onVerkaufen={istEigene ? (it, preis) => setVerkaufItem({ item: it, preis }) : null}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Verkaufs-Bestätigung ── */}
      {verkaufItem && (
        <div className="modal-overlay" onClick={() => setVerkaufItem(null)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 Karte verkaufen?</h2>
              <button className="modal-close" onClick={() => setVerkaufItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
                <TrikotSVG
                  {...verkaufItem.item.trikot}
                  nummer={verkaufItem.item.spieler.nummer}
                  name={verkaufItem.item.spieler.name}
                  style={{ width: 70, height: 76 }}
                />
                <div>
                  <div style={{ fontWeight: 800, color: 'var(--text-h)', fontSize: 15 }}>
                    {verkaufItem.item.spieler.name}
                  </div>
                  <div style={{ color: 'var(--text)', fontSize: 13 }}>{verkaufItem.item.verein.name}</div>
                  <div style={{ color: RARITAET_FARBE[verkaufItem.item.raritaetStufe], fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                    {'★'.repeat(verkaufItem.item.raritaetStufe)} {verkaufItem.item.raritaetLabel}
                  </div>
                  <div style={{ color: 'var(--text)', fontSize: 12, marginTop: 2 }}>
                    Marktwert: {verkaufItem.item.spieler.marktwert} Mio. €
                  </div>
                </div>
              </div>
              <p style={{ color: 'var(--text)', margin: 0, fontSize: 14 }}>
                Verkaufserlös:{' '}
                <strong style={{ color: '#22c55e', fontSize: 18 }}>{verkaufItem.preis} €</strong>
                <span style={{ fontSize: 11, color: 'var(--text)', marginLeft: 6 }}>
                  (Faktor: {verkaufItem.item.spieler.marktwert} Mio. / 100 × 200 €)
                </span>
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setVerkaufItem(null)}>Abbrechen</button>
              <button
                className="btn-primary"
                style={{ background: '#22c55e', color: '#000' }}
                onClick={() => {
                  loeschen(verkaufItem.item.id);
                  buchen(
                    verkaufItem.preis,
                    'karten_verkauf',
                    `Karte verkauft: ${verkaufItem.item.spieler.name} (${verkaufItem.item.verein.name})`
                  );
                  setVerkaufItem(null);
                }}
              >
                💰 Für {verkaufItem.preis} € verkaufen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lösch-Bestätigung ── */}
      {loescheId && (
        <div className="modal-overlay" onClick={() => setLoescheId(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Trikot entfernen?</h2>
              <button className="modal-close" onClick={() => setLoescheId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text)' }}>Das Trikot wird unwiderruflich aus deiner Sammlung gelöscht.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setLoescheId(null)}>Abbrechen</button>
              <button className="btn-danger" onClick={() => { loeschen(loescheId); setLoescheId(null); }}>
                Entfernen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
