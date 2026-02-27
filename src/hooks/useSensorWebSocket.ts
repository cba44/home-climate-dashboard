'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { ConnectionStatus, SensorMap, WsMessage } from '@/types/sensor';

type State = {
  sensors: SensorMap;
  status: ConnectionStatus;
};

type Action =
  | { type: 'SNAPSHOT'; data: SensorMap }
  | { type: 'UPDATE'; room: string; data: State['sensors'][string] }
  | { type: 'SET_STATUS'; status: ConnectionStatus };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SNAPSHOT':
      return { ...state, sensors: action.data };
    case 'UPDATE':
      return {
        ...state,
        sensors: { ...state.sensors, [action.room]: action.data },
      };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    default:
      return state;
  }
}

const INITIAL_STATE: State = { sensors: {}, status: 'connecting' };

// Exponential backoff: 1s, 2s, 4s, 8s, ..., max 30s
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export function useSensorWebSocket() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;

    function connect() {
      if (unmountedRef.current) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;

      dispatch({ type: 'SET_STATUS', status: 'connecting' });

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) {
          ws.close();
          return;
        }
        retryCountRef.current = 0;
        dispatch({ type: 'SET_STATUS', status: 'connected' });
      };

      ws.onmessage = (event) => {
        if (unmountedRef.current) return;
        try {
          const msg: WsMessage = JSON.parse(event.data as string);
          if (msg.type === 'snapshot') {
            dispatch({ type: 'SNAPSHOT', data: msg.data });
          } else if (msg.type === 'update') {
            dispatch({ type: 'UPDATE', room: msg.room, data: msg.data });
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (unmountedRef.current) return;
        dispatch({ type: 'SET_STATUS', status: 'disconnected' });
        scheduleRetry();
      };

      ws.onerror = () => {
        if (unmountedRef.current) return;
        dispatch({ type: 'SET_STATUS', status: 'error' });
        ws.close();
      };
    }

    function scheduleRetry() {
      if (unmountedRef.current) return;
      const delay = BACKOFF_DELAYS[Math.min(retryCountRef.current, BACKOFF_DELAYS.length - 1)];
      retryCountRef.current += 1;
      retryTimeoutRef.current = setTimeout(connect, delay);
    }

    connect();

    return () => {
      unmountedRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { sensors: state.sensors, status: state.status };
}
