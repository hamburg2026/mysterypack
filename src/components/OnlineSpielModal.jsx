import { useState } from 'react';
import { useMultiplayer } from '../context/MultiplayerContext';
import { useSpieler }     from '../context/SpielerContext';
import '../online.css';

export default function OnlineSpielModal({ onClose }) {
  const {
    status, raumCode, meinSpielerIndex, dranIndex, onlineModus, fehler,
    openRoom, joinRoom, disconnect,
  } = useMultiplayer();

  const { spieler, umbenennen } = useSpieler();

  const [eingabeCode, setEingabeCode] = useState('');
  // Name für Raum eröffnen (Host)
  const [hostName, setHostName] = useState(spieler[0]?.name ?? 'Spieler 1');
  // Name für Raum beitreten (Gast)
  const [gastName, setGastName] = useState(spieler[1]?.name ?? 'Spieler 2');

  function handleOpenRoom() {
    const name = hostName.trim() || 'Spieler 1';
    umbenennen(0, name);
    openRoom();
  }

  function handleJoin() {
    if (eingabeCode.trim().length < 4) return;
    const name = gastName.trim() || 'Spieler 2';
    umbenennen(1, name);
    joinRoom(eingabeCode);
  }

  const statusLabel = {
    idle:       null,
    hosting:    { text: 'Warte auf Mitspieler …', color: '#f59e0b' },
    connecting: { text: 'Verbinde …',              color: '#f59e0b' },
    connected:  { text: 'Verbunden!',               color: '#22c55e' },
    error:      { text: 'Fehler',                   color: '#ef4444' },
  }[status];

  // Namen beider Spieler
  const meinName    = spieler[meinSpielerIndex]?.name ?? `Spieler ${meinSpielerIndex + 1}`;
  const gegnerIndex = 1 - meinSpielerIndex;
  const gegnerName  = spieler[gegnerIndex]?.name ?? `Spieler ${gegnerIndex + 1}`;
  const dranName    = spieler[dranIndex]?.name ?? `Spieler ${dranIndex + 1}`;

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
            {onlineModus && (
              <span className="online-spieler-chip">
                Du: <strong>{meinName}</strong>
              </span>
            )}
          </div>
        )}

        {fehler && (
          <div className="online-fehler">⚠ {fehler}</div>
        )}

        <div className="modal-body">

          {/* ── Verbunden: Status + Zug-Anzeige ── */}
          {onlineModus && (
            <div className="online-verbunden">
              {/* Spieler-Übersicht */}
              <div className="online-spieler-zeile">
                <div className={`online-spieler-card ${meinSpielerIndex === 0 ? 'online-spieler-card--aktiv' : ''}`}
                     style={{ '--sp-farbe': spieler[0]?.farbe ?? '#22c55e' }}>
                  <span className="osp-dot" />
                  <span className="osp-name">{spieler[0]?.name ?? 'Spieler 1'}</span>
                  {dranIndex === 0 && <span className="osp-dran">dran</span>}
                </div>
                <span className="online-vs">VS</span>
                <div className={`online-spieler-card ${meinSpielerIndex === 1 ? 'online-spieler-card--aktiv' : ''}`}
                     style={{ '--sp-farbe': spieler[1]?.farbe ?? '#3b82f6' }}>
                  <span className="osp-dot" />
                  <span className="osp-name">{spieler[1]?.name ?? 'Spieler 2'}</span>
                  {dranIndex === 1 && <span className="osp-dran">dran</span>}
                </div>
              </div>

              {/* Zug-Hinweis */}
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
                  <input
                    className="online-code-input online-name-input"
                    type="text"
                    maxLength={20}
                    placeholder="Spieler 1"
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
                  <input
                    className="online-code-input online-name-input"
                    type="text"
                    maxLength={20}
                    placeholder="Spieler 2"
                    value={gastName}
                    onChange={(e) => setGastName(e.target.value)}
                  />
                </label>
                <div className="online-join-row" style={{ marginTop: '0.5rem' }}>
                  <input
                    className="online-code-input"
                    type="text"
                    maxLength={6}
                    placeholder="XXXXXX"
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

          {/* ── Warte auf Gast ── */}
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
