import { useState } from 'react';
import { useSpieler }  from '../context/SpielerContext';
import { useWallet }   from '../context/WalletContext';
import { useSammlung } from '../context/SammlungContext';

function SpielerStats({ spieler, wallet, sammlung }) {
  const packs = wallet.transaktionen.filter(
    (t) => t.typ === 'mystery_pack' && t.betrag < 0
  ).length;
  const marktwert = sammlung.reduce((s, i) => s + (i.spieler?.marktwert ?? 0), 0);

  return (
    <div className="sl-spieler" style={{ '--sp-farbe': spieler.farbe }}>
      <span className="sl-dot" />
      <span className="sl-name">{spieler.name}</span>
      <span className="sl-trenner" />
      <span className="sl-stat" title="Geöffnete Packs">
        <span className="sl-stat-icon">📦</span>
        <span className="sl-stat-val">{packs}</span>
      </span>
      <span className="sl-trenner" />
      <span className="sl-stat" title="Gesamtmarktwert der Sammlung">
        <span className="sl-stat-icon">💰</span>
        <span className="sl-stat-val">{marktwert.toFixed(0)} Mio.</span>
      </span>
      <span className="sl-trenner" />
      <span className="sl-stat" title="Guthaben">
        <span className="sl-stat-icon">💳</span>
        <span className="sl-stat-val"
          style={{ color: wallet.guthaben < 200 ? '#ef4444' : undefined }}>
          {wallet.guthaben.toFixed(0)} €
        </span>
      </span>
    </div>
  );
}

export default function StatsLeiste() {
  const { spieler }               = useSpieler();
  const { walletVon, resetAlle: resetWallet }   = useWallet();
  const { sammlungVon, resetAlle: resetSammlung } = useSammlung();

  const [bestaetigung, setBestaetigung] = useState(false);

  function handleReset() {
    resetWallet();
    resetSammlung();
    setBestaetigung(false);
  }

  return (
    <>
      <div className="stats-leiste">
        <SpielerStats
          spieler={spieler[0]}
          wallet={walletVon(0)}
          sammlung={sammlungVon(0)}
        />

        <button className="sl-reset-btn" onClick={() => setBestaetigung(true)} title="Spiel zurücksetzen">
          ↺ Reset
        </button>

        <SpielerStats
          spieler={spieler[1]}
          wallet={walletVon(1)}
          sammlung={sammlungVon(1)}
        />
      </div>

      {bestaetigung && (
        <div className="modal-overlay" onClick={() => setBestaetigung(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔄 Spiel zurücksetzen?</h2>
              <button className="modal-close" onClick={() => setBestaetigung(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text)' }}>
                Alle Sammlungen, Transaktionen und Guthaben beider Spieler werden
                unwiderruflich gelöscht. Beide Spieler starten mit {1000} € neu.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setBestaetigung(false)}>Abbrechen</button>
              <button className="btn-danger" onClick={handleReset}>Zurücksetzen</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
