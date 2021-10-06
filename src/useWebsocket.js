/* eslint-disable no-console */
import { useRef, useState, useEffect } from 'react';
import { READY_STATES, ERRORS, CONNECTION_STATES } from './constants';

const { WS_SUPPORTED } = ERRORS;
const { OPEN, CONNECTING, CLOSED } = CONNECTION_STATES;

export default (url) => {
  const ws = useRef(null);
  const [messageCount, setMessageCount] = useState(0);
  const [received, setReceived] = useState(null);
  const [readyState, setReadyState] = useState(CONNECTING);
  const messageQueue = useRef([]);

  if (typeof WebSocket === 'undefined') {
    console.warn(WS_SUPPORTED);
    return [() => {}, received, messageCount, { readyState }];
  }

  const getReadyState = () => READY_STATES[ws?.current?.readyState || 0];

  const updateReadyState = () => {
    const connectionState = getReadyState();
    setReadyState(connectionState);
    return connectionState;
  };

  const handleError = (error) => {
    console.error(error);
    updateReadyState();
  };

  const initializeWS = () => {
    if (ws.current && getReadyState() !== CLOSED) return;

    ws.current = new WebSocket(url);
    // eslint-disable-next-line no-use-before-define
    ws.current.onopen = onOpen;
    ws.current.onclose = updateReadyState; // TODO add a loop to reopen
    ws.current.onerror = handleError;

    ws.current.onmessage = (message) => {
      setReceived(message.data);
      setMessageCount(messageCount + 1);
    };
  };

  const send = (message) => {
    const currentState = updateReadyState();
    if (currentState === OPEN) ws.current.send(message);
    else {
      messageQueue.current.push(message);
      if (currentState !== CONNECTING) initializeWS();
    }
  };

  const onOpen = () => {
    updateReadyState();
    if (messageQueue.current.length) {
      while (messageQueue.current.length && getReadyState() === OPEN) {
        const message = messageQueue.current.shift();
        send(message);
      }
    }
  };

  if (!ws.current) initializeWS();

  useEffect(() => () => {
    if (!ws.current) return;

    ws.current.close();
    ws.current = null;
  }, []);

  const { url: wsUrl } = ws.current;
  return [send, received, messageCount, { readyState, url: wsUrl }];
};
