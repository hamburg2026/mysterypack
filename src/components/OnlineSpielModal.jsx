import { useState } from 'react';
import { useMultiplayer } from '../context/MultiplayerContext';
import '../online.css';

export default function OnlineSpielModal({ onClose }) {
  const {
    status, raumCode, meinSpielerIndex, fehler,
    openRoom, joinRoom, disconnect,
  } = useMultiplayer();

  const [eingabeCode, setEingabeCode] = useState('');

  function handleJoin() {
    if (eingabeCode.trim().length < 4) return;
    joinRoom(eingabeCode);
  }

  function handleTrennen() {
    disconnect();
  }

  const statusLabel = {
    idle:       null,
    hosting:    { text: 'Warte auf Mitspieler …', color: '#f59e0b' },
    connecting: { text: 'Verbinde …',              color: '#f59e0b' },
    connected:  { text: 'Verbunden!',               color: '#22c55e' },
    error:      { text: 'Fehler',                   color: '#ef4444' },
  }[status];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal online-modal">

        <div className="modal-header">
          <h2>🌐 Online-Spiel</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Status-Badge */}
        {statusLabel && (
          <div className="online-status-badge" style={{ color: statusLabel.color, borderColor: statusLabel.color }}>
            <span className="online-dot" style={{ background: statusLabel.color }} />
            {statusLabel.text}
            {status === 'connected' && (
              <span className="online-spieler-chip">
                Du spielst als Spieler {meinSpielerIndex + 1}
              </span>
            )}
          </div>
        )}

        {fehler && (
          <div className="online-fehler">⚠ {fehler}</div>
        )}

        <div className="modal-body">
          {/* ── Verbunden ── */}
          {status === 'connected' && (
            <div className="online-verbunden">
              <p className="online-hint">
                Wallet und Sammlung beider Spieler werden automatisch synchronisiert.
              </p>
              <button className="btn-danger" onClick={handleTrennen}>
                Verbindung trennen
              </button>
            </div>
          )}

          {/* ── Raum eröffnen / hosten ── */}
          {(status === 'idle' || status === 'error') && (
            <div className="online-optionen">
              <div className="online-option">
                <h3>Raum eröffnen</h3>
                <p>Du spielst als <strong>Spieler 1</strong>. Teile den Raumcode mit dem anderen Gerät.</p>
                <button className="btn-primary" onClick={openRoom}>
                  🎮 Raum eröffnen
                </button>
              </div>
              <div className="online-divider">oder</div>
              <div className="online-option">
                <h3>Raum beitreten</h3>
                <p>Du spielst als <strong>Spieler 2</strong>. Gib den Raumcode des anderen Geräts ein.</p>
                <div className="online-join-row">
                  <input
                    className="online-code-input"
                    type="text"
                    maxLength={6}
                    placeholder="XXXXXX"
                    value={eingabeCode}
                    onChange={(e) => setEingabeCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  />
                  <button
                    className="btn-primary"
                    disabled={eingabeCode.trim().length < 4}
                    onClick={handleJoin}
                  >
                    Beitreten
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Warte auf Gast ── */}
          {status === 'hosting' && (
            <div className="online-hosting">
              <p className="online-hint">Teile diesen Raumcode mit dem anderen Gerät:</p>
              <div className="online-raumcode">{raumCode}</div>
              <p className="online-hint" style={{ marginTop: '0.5rem' }}>
                Das andere Gerät wählt <em>Raum beitreten</em> und gibt diesen Code ein.
              </p>
              <button className="btn-ghost" style={{ marginTop: '1rem' }} onClick={handleTrennen}>
                Abbrechen
              </button>
            </div>
          )}

          {/* ── Verbindet ── */}
          {status === 'connecting' && (
            <div className="online-hosting">
              <p className="online-hint">Verbinde mit Raumcode <strong>{eingabeCode.toUpperCase()}</strong> …</p>
              <button className="btn-ghost" style={{ marginTop: '1rem' }} onClick={handleTrennen}>
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
