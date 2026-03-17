import TrikotSVG from './TrikotSVG';
import { seltenheit } from '../../hooks/useTrikotDaten';

const STUFE_FARBE = ['', '#6b7280', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];
const STUFE_GLOW  = ['', 'none', '0 0 8px #22c55e55', '0 0 10px #3b82f655', '0 0 14px #a855f766', '0 0 18px #f59e0b88'];

export default function SpielerKarte({
  spieler,
  heimtrikot,
  auswaertstrikot,
  wahrscheinlichkeit,
  onEdit,
}) {
  const { label, stufe } = seltenheit(spieler.marktwert);
  const prob = wahrscheinlichkeit ?? 0;

  return (
    <div
      className="spieler-karte"
      style={{ '--akzent': STUFE_FARBE[stufe], boxShadow: STUFE_GLOW[stufe] }}
    >
      {/* Rarität */}
      <div className="karte-raritaet" style={{ color: STUFE_FARBE[stufe] }}>
        {'★'.repeat(stufe)}{'☆'.repeat(5 - stufe)}
        <span className="karte-label">{label}</span>
      </div>

      {/* Zwei Trikots */}
      <div className="karte-trikots">
        <div className="karte-trikot-wrap">
          <TrikotSVG {...heimtrikot} nummer={spieler.nummer} name={spieler.name} />
          <span className="karte-trikot-typ">Heim</span>
        </div>
        <div className="karte-trikot-wrap">
          <TrikotSVG {...auswaertstrikot} nummer={spieler.nummer} name={spieler.name} />
          <span className="karte-trikot-typ">Auswärts</span>
        </div>
      </div>

      {/* Infoleiste */}
      <div className="karte-info">
        <div className="karte-name">{spieler.name}</div>
        <div className="karte-meta">
          <span className="karte-pos">{spieler.position}</span>
        </div>
        <div className="karte-wert">
          {spieler.marktwert != null
            ? `${spieler.marktwert >= 1 ? spieler.marktwert + ' Mio. €' : (spieler.marktwert * 1000) + 'k €'}`
            : 'Marktwert unbekannt'}
        </div>
        <div className="karte-prob" title="Ziehwahrscheinlichkeit">
          <span className="prob-icon">🎰</span>
          {prob < 0.01 ? '< 0.01' : prob.toFixed(3)}%
        </div>
      </div>

      {/* Edit-Button */}
      <button className="karte-edit-btn" onClick={() => onEdit(spieler)} title="Bearbeiten">
        ✏️
      </button>
    </div>
  );
}
