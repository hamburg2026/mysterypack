import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSpieler } from '../context/SpielerContext';
import { useMultiplayer } from '../context/MultiplayerContext';
import OnlineSpielModal from './OnlineSpielModal';

const navItems = [
  { path: '/',           label: 'Trikot-DB',  icon: '👕' },
  { path: '/quiz',       label: 'Quiz',        icon: '🧠' },
  { path: '/shop',       label: 'Shop',        icon: '🎁' },
  { path: '/sammlung',   label: 'Sammlung',    icon: '🏆' },
  { path: '/wallet',     label: 'Wallet',      icon: '💳' },
];

const STATUS_DOT = {
  idle:       null,
  hosting:    '#f59e0b',
  connecting: '#f59e0b',
  connected:  '#22c55e',
  error:      '#ef4444',
};

export default function Navbar() {
  const { spieler, aktiverIndex, wechseln } = useSpieler();
  const { status } = useMultiplayer();
  const aktiver   = spieler[aktiverIndex];
  const naechster = spieler[aktiverIndex === 0 ? 1 : 0];
  const [onlineOffen, setOnlineOffen] = useState(false);
  const dotFarbe = STATUS_DOT[status];

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-icon">⚽</span>
          <span className="brand-name">MysteryPack</span>
        </div>
        <ul className="nav-links">
          {navItems.map(({ path, label, icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                end={path === '/'}
                className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="navbar-rechts">
          {/* Online-Spiel Button */}
          <button
            className="navbar-online-btn"
            title="Online-Spiel"
            onClick={() => setOnlineOffen(true)}
          >
            <span className="nav-icon">🌐</span>
            <span className="nav-label">Online</span>
            {dotFarbe && (
              <span
                className="online-status-dot"
                style={{ background: dotFarbe }}
              />
            )}
          </button>

          {/* Spieler-Indikator – im Online-Modus gesperrt */}
          <button
            className={`navbar-spieler ${status === 'connected' ? 'navbar-spieler--gesperrt' : ''}`}
            style={{ '--sp-farbe': aktiver.farbe }}
            onClick={status === 'connected' ? undefined : wechseln}
            title={status === 'connected' ? `Online-Modus: Du spielst als ${aktiver.name}` : `Wechseln zu ${naechster.name}`}
          >
            <span className="navbar-spieler-dot" />
            <span className="navbar-spieler-name">{aktiver.name}</span>
            {status !== 'connected' && <span className="navbar-spieler-wechsel">⇄</span>}
            {status === 'connected' && <span className="navbar-spieler-wechsel">🔒</span>}
          </button>
        </div>
      </nav>

      {onlineOffen && <OnlineSpielModal onClose={() => setOnlineOffen(false)} />}
    </>
  );
}
