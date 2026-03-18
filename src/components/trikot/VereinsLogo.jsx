import { useState } from 'react';

/**
 * Vereins-Logo: lädt von media.api-sports.io und fällt auf ein farbiges
 * Kürzel-Badge zurück, wenn das Bild nicht geladen werden kann.
 *
 * Props:
 *   verein  – Vereins-Objekt mit id, name, heimtrikot
 *   size    – Breite/Höhe in px (default: 32)
 *   className – optionale CSS-Klasse
 */
export default function VereinsLogo({ verein, size = 32, className = '' }) {
  const [fehler, setFehler] = useState(false);
  if (!verein) return null;

  const farbe   = verein.heimtrikot?.farbe1 || '#6b7280';
  const kuerzel = verein.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase();

  if (fehler) {
    return (
      <span
        className={`verein-logo-fallback ${className}`}
        style={{
          width: size,
          height: size,
          background: farbe,
          fontSize: Math.max(8, Math.round(size * 0.36)),
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          flexShrink: 0,
          fontWeight: 900,
          color: 'rgba(255,255,255,0.9)',
          letterSpacing: '-0.5px',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
        title={verein.name}
      >
        {kuerzel}
      </span>
    );
  }

  return (
    <img
      key={verein.id}
      className={`verein-logo-img ${className}`}
      src={`https://media.api-sports.io/football/teams/${verein.id}.png`}
      alt={verein.name}
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      loading="eager"
      onError={() => setFehler(true)}
      title={verein.name}
      style={{ borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
