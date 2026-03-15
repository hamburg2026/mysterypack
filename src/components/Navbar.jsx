import { NavLink } from 'react-router-dom';
import { useSpieler } from '../context/SpielerContext';

const navItems = [
  { path: '/',           label: 'Trikot-DB',  icon: '👕' },
  { path: '/quiz',       label: 'Quiz',        icon: '🧠' },
  { path: '/shop',       label: 'Shop',        icon: '🎁' },
  { path: '/sammlung',   label: 'Sammlung',    icon: '🏆' },
  { path: '/wallet',     label: 'Wallet',      icon: '💳' },
];

export default function Navbar() {
  const { spieler, aktiverIndex, wechseln } = useSpieler();
  const aktiver = spieler[aktiverIndex];
  const naechster = spieler[aktiverIndex === 0 ? 1 : 0];

  return (
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

      {/* Spieler-Indikator */}
      <button
        className="navbar-spieler"
        style={{ '--sp-farbe': aktiver.farbe }}
        onClick={wechseln}
        title={`Wechseln zu ${naechster.name}`}
      >
        <span className="navbar-spieler-dot" />
        <span className="navbar-spieler-name">{aktiver.name}</span>
        <span className="navbar-spieler-wechsel">⇄</span>
      </button>
    </nav>
  );
}
