import { useState, useEffect } from 'react';
import { useMultiplayer } from '../context/MultiplayerContext';
import { useSpieler }     from '../context/SpielerContext';
import '../online.css';

export default function OnlineSpielModal({ onClose }) {
  const {
    status, raumCode, meinSpielerIndex, dranIndex,
    onlineModus, gameStarted, fehler,
    openRoom, joinRoom, startSpiel, disconnect,
  } = useMultiplayer();

  const { spieler, umbenennen } = useSpieler();

  const [eingabeCode, setEingabeCode] = useState('');
  const [hostName,    setHostName]    = useState(spieler[0]?.name ?? 'Spieler 1');
  const [gastName,    setGastName]    = useState(spieler[1]?.name ?? 'Spieler 2');

  // Modal automatisch schließen, wenn das Spiel gestartet wird
  useEffect(() => {
    if (gameStarted) onClose();
  }, [gameStarted, onClose]);

  function handleOpenRoom() {
    umbenennen(0, hostName.trim() || 'Spieler 1');
    openRoom();
  }

  function handleJoin() {
    if (eingabeCode.trim().length < 4) return;
    umbenennen(1, gastName.trim() || 'Spieler 2');
    joinRoom(eingabeCode);
  }

  const statusLabel = {
    idle:       null,
    hosting:    { text: 'Warte auf Mitspieler …', color: '#f59e0b' },
    connecting: { text: 'Verbinde …',              color: '#f59e0b' },
    connected:  { text: 'Verbunden!',               color: '#22c55e' },
    error:      { text: 'Fehler',                   color: '#ef4444' },
  }[status];

  const meinName   = spieler[meinSpielerIndex]?.name ?? `Spieler ${meinSpielerIndex + 1}`;
  const gegnerName = spieler[1 - meinSpielerIndex]?.name ?? `Spieler ${2 - meinSpielerIndex}`;
  const istHost    = meinSpielerIndex === 0;
  const istVerbunden = status === 'connected' && !gameStarted;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal online-modal">

        <div className="modal-header">
          <h2>🌐 Online-Spiel</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Status-Badge */}
        {statusLabel && (
          <div className="online-status-badge"
               style={{ color: statusLabel.color, borderColor: statusLabel.color }}>
            <span className="online-dot" style={{ background: statusLabel.color }} />
            {statusLabel.text}
            {status === 'connected' && (
              <span className="online-spieler-chip">
                Du: <strong>{meinName}</strong>
              </span>
            )}
          </div>
        )}

        {fehler && <div className="online-fehler">⚠ {fehler}</div>}

        <div className="modal-body">

          {/* ── Verbunden aber noch nicht gestartet ── */}
          {istVerbunden && (
            <div className="online-verbunden">
              {/* Spieler-Übersicht */}
              <div className="online-spieler-zeile">
                {[0, 1].map((idx) => (
                  <div key={idx}
                       className={`online-spieler-card ${meinSpielerIndex === idx ? 'online-spieler-card--aktiv' : ''}`}
                       style={{ '--sp-farbe': spieler[idx]?.farbe ?? (idx === 0 ? '#22c55e' : '#3b82f6') }}>
                    <span className="osp-dot" />
                    <span className="osp-name">{spieler[idx]?.name ?? `Spieler ${idx + 1}`}</span>
                    {idx === 0 && <span className="osp-dran">zieht zuerst</span>}
                  </div>
                ))}
              </div>

              {/* Host: Starten-Button / Gast: Warten */}
              {istHost ? (
                <>
                  <p className="online-hint" style={{ textAlign: 'center' }}>
                    Beide Spieler sind bereit. Starte das Spiel wenn du möchtest.
                  </p>
                  <button className="btn-primary online-start-btn" onClick={startSpiel}>
                    🚀 Spiel starten
                  </button>
                </>
              ) : (
                <p className="online-hint online-warten-text">
                  ⏳ Warte auf <strong>{gegnerName}</strong>, das Spiel zu starten …
                </p>
              )}

              <button className="btn-ghost" style={{ marginTop: '0.25rem' }}
                onClick={() => { disconnect(); onClose(); }}>
                Verbindung trennen
              </button>
            </div>
          )}

          {/* ── Im laufenden Spiel (modal vom Hook bereits geschlossen, aber als Fallback) ── */}
          {onlineModus && (
            <div className="online-verbunden">
              <div className="online-spieler-zeile">
                {[0, 1].map((idx) => (
                  <div key={idx}
                       className={`online-spieler-card ${meinSpielerIndex === idx ? 'online-spieler-card--aktiv' : ''}`}
                       style={{ '--sp-farbe': spieler[idx]?.farbe ?? (idx === 0 ? '#22c55e' : '#3b82f6') }}>
                    <span className="osp-dot" />
                    <span className="osp-name">{spieler[idx]?.name ?? `Spieler ${idx + 1}`}</span>
                    {dranIndex === idx && <span className="osp-dran">dran</span>}
                  </div>
                ))}
              </div>
              <p className="online-hint" style={{ textAlign: 'center' }}>
                {dranIndex === meinSpielerIndex
                  ? '🟢 Du bist dran – öffne ein Pack im Shop!'
                  : `⏳ Warte auf ${gegnerName} …`}
              </p>
              <button className="btn-ghost" style={{ marginTop: '0.5rem' }}
                onClick={() => { disconnect(); onClose(); }}>
                Verbindung trennen
              </button>
            </div>
          )}

          {/* ── Raum eröffnen / beitreten ── */}
          {(status === 'idle' || status === 'error') && (
            <div className="online-optionen">
              <div className="online-option">
                <h3>Raum eröffnen</h3>
                <p>Du spielst als <strong>Spieler 1</strong> und ziehst zuerst.</p>
                <label className="online-label">
                  Dein Name
                  <input className="online-code-input online-name-input"
                    type="text" maxLength={20} placeholder="Spieler 1"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenRoom()}
                  />
                </label>
                <button className="btn-primary" style={{ marginTop: '0.5rem' }}
                  onClick={handleOpenRoom}>
                  🎮 Raum eröffnen
                </button>
              </div>

              <div className="online-divider">oder</div>

              <div className="online-option">
                <h3>Raum beitreten</h3>
                <p>Du spielst als <strong>Spieler 2</strong>. Gib den Raumcode ein.</p>
                <label className="online-label">
                  Dein Name
                  <input className="online-code-input online-name-input"
                    type="text" maxLength={20} placeholder="Spieler 2"
                    value={gastName}
                    onChange={(e) => setGastName(e.target.value)}
                  />
                </label>
                <div className="online-join-row" style={{ marginTop: '0.5rem' }}>
                  <input className="online-code-input"
                    type="text" maxLength={6} placeholder="XXXXXX"
                    value={eingabeCode}
                    onChange={(e) => setEingabeCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                  />
                  <button className="btn-primary"
                    disabled={eingabeCode.trim().length < 4}
                    onClick={handleJoin}>
                    Beitreten
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Warte auf Gast (noch nicht verbunden) ── */}
          {status === 'hosting' && (
            <div className="online-hosting">
              <p className="online-hint">Teile diesen Raumcode mit dem anderen Gerät:</p>
              <div className="online-raumcode">{raumCode}</div>
              <p className="online-hint" style={{ marginTop: '0.5rem' }}>
                Das andere Gerät wählt <em>Raum beitreten</em> und gibt diesen Code ein.
              </p>
              <button className="btn-ghost" style={{ marginTop: '1rem' }}
                onClick={() => disconnect()}>
                Abbrechen
              </button>
            </div>
          )}

          {/* ── Verbindet ── */}
          {status === 'connecting' && (
            <div className="online-hosting">
              <p className="online-hint">
                Verbinde mit Raumcode <strong>{eingabeCode.toUpperCase()}</strong> …
              </p>
              <button className="btn-ghost" style={{ marginTop: '1rem' }}
                onClick={() => disconnect()}>
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
