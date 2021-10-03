/* eslint-disable no-console */
import { useRef, useState, useEffect } from 'react';
import { READY_STATES, ERRORS, CONNECTION_STATES } from './constants';

const { WS_SUPPORTED } = ERRORS;
const { OPEN, CONNECTING } = CONNECTION_STATES;

export default (url) => {
  const ws = useRef(null);
  const [messageCount, setMessageCount] = useState(0);
  const [received, setReceived] = useState(null);
  const [readyState, setReadyState] = useState(CONNECTING);

  if (typeof WebSocket === 'undefined') {
    console.warn(WS_SUPPORTED);
    return [() => {}, received, messageCount, { readyState }];
  }

  const updateReadyState = () => {
    const connectionState = READY_STATES[ws.current.readyState];
    setReadyState(connectionState);
  };

  const handleError = (error) => {
    console.error(error);
    updateReadyState();
  };

  if (!ws.current) {
    ws.current = new WebSocket(url);
    ws.current.onopen = updateReadyState;
    ws.current.onclose = updateReadyState;
    ws.current.onerror = handleError;

    ws.current.onmessage = (message) => {
      setReceived(message.data);
      setMessageCount(messageCount + 1);
    };
  }

  const send = (message) => {
    updateReadyState();
    if (readyState === OPEN) ws.current.send(message);
  };

  useEffect(() => () => {
    if (!ws.current) return;

    ws.current.close();
    ws.current = null;
  }, []);

  const { url: wsUrl } = ws.current;
  return [send, received, messageCount, { readyState, url: wsUrl }];
};
