/**
 * MultiplayerContext – WebRTC-Verbindung über PeerJS.
 *
 * Host   = Spieler 0  →  eröffnet Raum, teilt den Raumcode
 * Gast   = Spieler 1  →  gibt Raumcode ein und tritt bei
 *
 * Jedes Gerät schickt nur seine eigenen Spielerdaten (Wallet + Sammlung)
 * zum anderen Gerät. Empfangene Daten werden direkt in die Kontexte
 * geschrieben – dadurch bleiben beide Stände synchron.
 */

import {
  createContext, useContext, useState, useRef, useCallback, useEffect,
} from 'react';
import Peer from 'peerjs';
import { useWallet } from './WalletContext';
import { useSammlung } from './SammlungContext';

const MultiplayerContext = createContext(null);

/** 6-stelligen alphanumerischen Raumcode erzeugen */
function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function MultiplayerProvider({ children }) {
  const { wallets, setWalletsExtern }         = useWallet();
  const { sammlungen, setSammlungenExtern }    = useSammlung();

  const [status, setStatus]                   = useState('idle');
  // idle | hosting | connecting | connected | error
  const [raumCode, setRaumCode]               = useState('');
  const [meinSpielerIndex, setMeinSpielerIndex] = useState(0);
  const [fehler, setFehler]                   = useState('');

  const peerRef   = useRef(null);
  const connRef   = useRef(null);
  const indexRef  = useRef(0); // stable ref für Callbacks

  // Aktuelle Sync-Daten via Ref – verhindert stale closures in send
  const walletsRef    = useRef(wallets);
  const sammlungenRef = useRef(sammlungen);
  useEffect(() => { walletsRef.current    = wallets;    }, [wallets]);
  useEffect(() => { sammlungenRef.current = sammlungen; }, [sammlungen]);

  // ── Empfangene Daten in die Kontexte schreiben ─────────────────────────────
  const handleData = useCallback((data) => {
    if (data?.type !== 'player_data') return;
    const { spielerIndex, wallet, sammlung } = data;
    setWalletsExtern((prev) => ({ ...prev, [spielerIndex]: wallet }));
    setSammlungenExtern((prev) => ({ ...prev, [spielerIndex]: sammlung }));
  }, [setWalletsExtern, setSammlungenExtern]);

  // ── Eigene Daten zum anderen Gerät senden ──────────────────────────────────
  const sendOwnData = useCallback(() => {
    const conn = connRef.current;
    if (!conn?.open) return;
    const idx = indexRef.current;
    conn.send({
      type: 'player_data',
      spielerIndex: idx,
      wallet:    walletsRef.current[idx],
      sammlung:  sammlungenRef.current[idx] ?? [],
    });
  }, []);

  // ── Verbindungs-Lifecycle ──────────────────────────────────────────────────
  function setupConn(conn) {
    connRef.current = conn;

    conn.on('open', () => {
      setStatus('connected');
      setFehler('');
      // Initial-Sync: eigene Daten sofort senden
      setTimeout(sendOwnData, 300);
    });

    conn.on('data', handleData);

    conn.on('close', () => {
      connRef.current = null;
      setStatus('idle');
      setRaumCode('');
    });

    conn.on('error', (err) => {
      setFehler(err.message ?? 'Verbindungsfehler');
      setStatus('error');
    });
  }

  // ── Peer aufsetzen ─────────────────────────────────────────────────────────
  function createPeer(id) {
    const peer = new Peer(id, {
      debug: 0,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });
    peerRef.current = peer;

    peer.on('error', (err) => {
      // Raumcode bereits vergeben → neuen Code versuchen
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
  const openRoom = useCallback(() => {
    disconnect();
    indexRef.current = 0;
    setMeinSpielerIndex(0);
    setFehler('');
    setStatus('hosting');

    const code = genCode();
    setRaumCode(code);

    const peer = createPeer(code);

    peer.on('open', () => {
      // Warten auf eingehende Verbindung vom Gast
    });

    peer.on('connection', (conn) => {
      setupConn(conn);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Raum beitreten (Gast = Spieler 1) ─────────────────────────────────────
  const joinRoom = useCallback((code) => {
    disconnect();
    indexRef.current = 1;
    setMeinSpielerIndex(1);
    setFehler('');
    setStatus('connecting');

    const peer = createPeer(undefined); // zufällige ID für den Gast

    peer.on('open', () => {
      const conn = peer.connect(code.trim().toUpperCase(), { reliable: true });
      setupConn(conn);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Verbindung trennen ─────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    connRef.current?.close();
    peerRef.current?.destroy();
    connRef.current = null;
    peerRef.current = null;
    setStatus('idle');
    setRaumCode('');
    setFehler('');
  }, []);

  // ── Eigene Daten senden, sobald sie sich ändern ────────────────────────────
  useEffect(() => {
    if (status !== 'connected') return;
    sendOwnData();
  // wallets und sammlungen (indirekt via Ref) – nur Änderungen des eigenen Spielers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets[meinSpielerIndex], sammlungen[meinSpielerIndex], status]);

  return (
    <MultiplayerContext.Provider value={{
      status,
      raumCode,
      meinSpielerIndex,
      fehler,
      openRoom,
      joinRoom,
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
