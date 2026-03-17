import { useEffect, useRef, useCallback } from 'react';
import { WS_URL } from '../config';

export function useWebSocket() {
  const ws = useRef(null);
  const subscribers = useRef({});
  const reconnectTimer = useRef(null);
  const connected = useRef(false);

  const connect = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        connected.current = true;
        // Re-subscribe all pending subscribers
        Object.keys(subscribers.current).forEach((id) => {
          ws.current.send(JSON.stringify({ type: 'subscribe', submissionId: id }));
        });
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const id = data.submissionId;
          if (id && subscribers.current[id]) {
            subscribers.current[id](data);
          }
        } catch {}
      };

      ws.current.onclose = () => {
        connected.current = false;
        // Reconnect after 2s
        reconnectTimer.current = setTimeout(connect, 2000);
      };

      ws.current.onerror = () => {
        ws.current?.close();
      };
    } catch {}
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((submissionId, callback) => {
    subscribers.current[submissionId] = callback;
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'subscribe', submissionId }));
    }
    return () => {
      delete subscribers.current[submissionId];
    };
  }, []);

  return { subscribe };
}
