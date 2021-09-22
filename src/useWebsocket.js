import { useRef, useState, useEffect } from 'react';
import { WebSocket } from 'ws';

export default (url, options) => {
  const ws = useRef(null);
  const [received, setReceived] = useState(null);

  if (!ws.current) ws.current = new WebSocket(url, options);

  const send = (message) => ws.current.send(message);
  useEffect(() => {
    ws.current.on('message', (message) => setReceived(message));
  });

  return [send, received, ws.current];
};
