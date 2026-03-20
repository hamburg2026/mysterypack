/**
 * MultiplayerContext – WebRTC-Verbindung über PeerJS.
 *
 * Host   = Spieler 0  →  eröffnet Raum, teilt den Raumcode, zieht zuerst
 * Gast   = Spieler 1  →  gibt Raumcode ein und tritt bei
 *
 * Synchronisiert: Wallet, Sammlung, Spielernamen, aktiver Zug (dranIndex)
 */

import {
  createContext, useContext, useState, useRef, useCallback, useEffect,
} from 'react';
import Peer from 'peerjs';
import { useWallet }   from './WalletContext';
import { useSammlung } from './SammlungContext';
import { useSpieler }  from './SpielerContext';

const MultiplayerContext = createContext(null);

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function MultiplayerProvider({ children }) {
  const { wallets, setWalletsExtern }         = useWallet();
  const { sammlungen, setSammlungenExtern }    = useSammlung();
  const { spieler, umbenennen, setAktiverIndex } = useSpieler();

  const [status, setStatus]                     = useState('idle');
  // idle | hosting | connecting | connected | error
  const [raumCode, setRaumCode]                 = useState('');
  const [meinSpielerIndex, setMeinSpielerIndex] = useState(0);
  const [dranIndex, setDranIndex]               = useState(0); // wer gerade ziehen darf
  const [fehler, setFehler]                     = useState('');

  const peerRef  = useRef(null);
  const connRef  = useRef(null);
  const indexRef = useRef(0);   // stable ref auf meinSpielerIndex
  const dranRef  = useRef(0);   // stable ref auf dranIndex

  // Stets aktuelle Daten in Refs halten (vermeidet stale closures in Callbacks)
  const walletsRef    = useRef(wallets);
  const sammlungenRef = useRef(sammlungen);
  const spielerRef    = useRef(spieler);
  useEffect(() => { walletsRef.current    = wallets;    }, [wallets]);
  useEffect(() => { sammlungenRef.current = sammlungen; }, [sammlungen]);
  useEffect(() => { spielerRef.current    = spieler;    }, [spieler]);
  useEffect(() => { dranRef.current       = dranIndex;  }, [dranIndex]);

  // ── Empfangene Nachrichten verarbeiten ────────────────────────────────────
  const handleData = useCallback((data) => {
    switch (data?.type) {
      case 'player_data': {
        const { spielerIndex, wallet, sammlung, name } = data;
        setWalletsExtern((prev)    => ({ ...prev, [spielerIndex]: wallet }));
        setSammlungenExtern((prev) => ({ ...prev, [spielerIndex]: sammlung }));
        if (name) umbenennen(spielerIndex, name);
        break;
      }
      case 'turn_update': {
        setDranIndex(data.dranIndex);
        dranRef.current = data.dranIndex;
        break;
      }
    }
  }, [setWalletsExtern, setSammlungenExtern, umbenennen]);

  // ── Eigene Spielerdaten an Gegner senden ──────────────────────────────────
  const sendOwnData = useCallback(() => {
    const conn = connRef.current;
    if (!conn?.open) return;
    const idx = indexRef.current;
    conn.send({
      type:        'player_data',
      spielerIndex: idx,
      wallet:       walletsRef.current[idx],
      sammlung:     sammlungenRef.current[idx] ?? [],
      name:         spielerRef.current[idx]?.name,
    });
  }, []);

  // ── Zug beenden: Turn an den anderen Spieler übergeben ───────────────────
  const zugBeenden = useCallback(() => {
    const naechster = 1 - dranRef.current;
    setDranIndex(naechster);
    dranRef.current = naechster;
    connRef.current?.send({ type: 'turn_update', dranIndex: naechster });
  }, []);

  // ── Verbindungs-Lifecycle ─────────────────────────────────────────────────
  function setupConn(conn) {
    connRef.current = conn;

    conn.on('open', () => {
      setStatus('connected');
      setFehler('');
      // Aktiven Spieler auf eigenen Index fixieren
      setAktiverIndex(indexRef.current);
      // Eigene Daten sofort übermitteln (inkl. Name)
      setTimeout(sendOwnData, 300);
    });

    conn.on('data', handleData);

    conn.on('close', () => {
      connRef.current = null;
      setStatus('idle');
      setRaumCode('');
      setDranIndex(0);
    });

    conn.on('error', (err) => {
      setFehler(err.message ?? 'Verbindungsfehler');
      setStatus('error');
    });
  }

  // ── Peer-Instanz erstellen ────────────────────────────────────────────────
  function createPeer(id) {
    const peer = new Peer(id, {
      debug: 0,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });
    peerRef.current = peer;

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        peer.destroy();
        openRoom();
        return;
      }
      setFehler(err.message ?? String(err));
      setStatus('error');
    });

    return peer;
  }

  // ── Raum eröffnen (Host = Spieler 0) ──────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const openRoom = useCallback(() => {
    disconnect();
    indexRef.current = 0;
    dranRef.current  = 0;
    setMeinSpielerIndex(0);
    setDranIndex(0);
    setFehler('');
    setStatus('hosting');

    const code = genCode();
    setRaumCode(code);
    const peer = createPeer(code);

    peer.on('connection', (conn) => setupConn(conn));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Raum beitreten (Gast = Spieler 1) ────────────────────────────────────
  const joinRoom = useCallback((code) => {
    disconnect();
    indexRef.current = 1;
    dranRef.current  = 0; // Host beginnt immer
    setMeinSpielerIndex(1);
    setDranIndex(0);
    setFehler('');
    setStatus('connecting');

    const peer = createPeer(undefined);
    peer.on('open', () => {
      const conn = peer.connect(code.trim().toUpperCase(), { reliable: true });
      setupConn(conn);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Verbindung trennen ────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    connRef.current?.close();
    peerRef.current?.destroy();
    connRef.current = null;
    peerRef.current = null;
    setStatus('idle');
    setRaumCode('');
    setFehler('');
    setDranIndex(0);
  }, []);

  // ── Auto-Sync: eigene Daten bei Änderung übertragen ──────────────────────
  useEffect(() => {
    if (status !== 'connected') return;
    sendOwnData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets[meinSpielerIndex], sammlungen[meinSpielerIndex], status]);

  const onlineModus = status === 'connected';
  const meineTurn   = dranIndex === meinSpielerIndex;

  return (
    <MultiplayerContext.Provider value={{
      status,
      raumCode,
      meinSpielerIndex,
      dranIndex,
      onlineModus,
      meineTurn,
      fehler,
      openRoom,
      joinRoom,
      zugBeenden,
      disconnect,
    }}>
      {children}
    </MultiplayerContext.Provider>
  );
}

export function useMultiplayer() {
  const ctx = useContext(MultiplayerContext);
  if (!ctx) throw new Error('useMultiplayer muss innerhalb von <MultiplayerProvider> verwendet werden');
  return ctx;
}
