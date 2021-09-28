import { useRef, useState, useEffect } from 'react';

export default (url) => {
  const ws = useRef(null);
  const [messageCount, setMessageCount] = useState(0);
  const [received, setReceived] = useState(null);

  if (typeof WebSocket === 'undefined') return [() => {}, received, messageCount];

  if (!ws.current) {
    ws.current = new WebSocket(url);
    ws.current.onmessage = (message) => {
      setReceived(message.data);
      setMessageCount(messageCount + 1);
    };
  }

  const send = (message) => ws.current.send(message);

  useEffect(() => () => {
    if (!ws.current) return;

    ws.current.close();
    ws.current = null;
  }, []);

  return [send, received, messageCount, ws.current];
};
