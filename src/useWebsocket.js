/* eslint-disable no-console */
import { useRef, useState, useEffect } from 'react';
import { READY_STATES, ERRORS } from './constants';

const { WS_SUPPORTED } = ERRORS;

export default (url) => {
  const ws = useRef(null);
  const [messageCount, setMessageCount] = useState(0);
  const [received, setReceived] = useState(null);

  if (typeof WebSocket === 'undefined') {
    console.warn(WS_SUPPORTED);
    return [() => {}, received, messageCount, { readyState: READY_STATES[0] }];
  }

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

  const { readyState, url: wsUrl } = ws.current;
  return [send, received, messageCount, { readyState: READY_STATES[readyState], url: wsUrl }];
};
