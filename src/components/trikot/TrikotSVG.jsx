/**
 * Stilisierte Trikot-Karte als SVG.
 * Unterstützt: plain, stripes (vertikal), hoops (horizontal), split (diagonal), sash
 */

export default function TrikotSVG({
  farbe1 = '#FFFFFF',
  farbe2 = '#000000',
  muster = 'plain',
  nummer = '',
  name = '',
  mini = false,
}) {
  const uid = `t_${farbe1.replace('#', '')}_${muster}_${nummer}`;
  const W = 120, H = 130;

  // ── Muster-Definitionen ──────────────────────────────────────────────────
  const renderDefs = () => {
    switch (muster) {
      case 'stripes':
        return (
          <defs>
            <pattern id={`pat_${uid}`} patternUnits="userSpaceOnUse" width="12" height="130">
              <rect width="6"  height="130" fill={farbe1} />
              <rect x="6" width="6" height="130" fill={farbe2} />
            </pattern>
          </defs>
        );
      case 'hoops':
        return (
          <defs>
            <pattern id={`pat_${uid}`} patternUnits="userSpaceOnUse" width="120" height="16">
              <rect width="120" height="8"  fill={farbe1} />
              <rect y="8" width="120" height="8" fill={farbe2} />
            </pattern>
          </defs>
        );
      case 'split':
        return (
          <defs>
            <linearGradient id={`pat_${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="50%" stopColor={farbe1} />
              <stop offset="50%" stopColor={farbe2} />
            </linearGradient>
          </defs>
        );
      case 'sash':
        return (
          <defs>
            <linearGradient id={`pat_${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="35%" stopColor={farbe1} />
              <stop offset="35%" stopColor={farbe2} />
              <stop offset="65%" stopColor={farbe2} />
              <stop offset="65%" stopColor={farbe1} />
            </linearGradient>
          </defs>
        );
      default:
        return null;
    }
  };

  const hasMuster = ['stripes', 'hoops', 'split', 'sash'].includes(muster);
  const bodyFill = hasMuster ? `url(#pat_${uid})` : farbe1;

  // Konturfarbe: leicht dunkler als farbe1 (einfach rgba)
  const stroke = 'rgba(0,0,0,0.18)';
  const numFarbe = farbe2;
  const nameFarbe = farbe2;

  // ── Jersey-Pfad ──────────────────────────────────────────────────────────
  // Koordinaten für W=120, H=130
  const jersey = `
    M 38,2
    C 48,-4 72,-4 82,2
    L 118,30 L 100,44 L 100,126 L 20,126 L 20,44 L 2,30 Z
  `;
  // Ärmelpfad links
  const armL = `M 20,44 L 2,30 L 12,18 L 38,2`;
  // Ärmelpfad rechts
  const armR = `M 100,44 L 118,30 L 108,18 L 82,2`;
  // Halsausschnitt
  const neck = `M 46,2 Q 60,20 74,2`;

  // ── Mini-Modus (nur Farbe, kein Text) ────────────────────────────────────
  if (mini) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="48" height="52" xmlns="http://www.w3.org/2000/svg">
        {renderDefs()}
        <path d={jersey} fill={bodyFill} stroke={stroke} strokeWidth="1.5" />
        <path d={neck}   fill="none"     stroke={farbe2}  strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" className="trikot-svg">
      {renderDefs()}
      {/* Trikot-Körper */}
      <path d={jersey} fill={bodyFill} stroke={stroke} strokeWidth="1.5" />
      {/* Ärmel gleiche Farbe */}
      <path d={armL} fill={bodyFill} stroke={stroke} strokeWidth="1" />
      <path d={armR} fill={bodyFill} stroke={stroke} strokeWidth="1" />
      {/* Halsausschnitt */}
      <path d={neck} fill="none" stroke={farbe2} strokeWidth="3" strokeLinecap="round" />
      {/* Spielername */}
      {name && (
        <text
          x="60" y="112"
          textAnchor="middle"
          fontSize="7.5"
          fontWeight="700"
          fontFamily="'Inter',system-ui,sans-serif"
          letterSpacing="1"
          fill={nameFarbe}
          opacity="0.75"
          style={{ userSelect: 'none' }}
        >
          {name.toUpperCase().slice(0, 14)}
        </text>
      )}
    </svg>
  );
}
