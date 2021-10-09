/* eslint-disable no-console */
import { useRef, useState, useEffect } from 'react';
import {
  READY_STATES,
  ERRORS,
  CONNECTION_STATES,
  DEFAULT_OPTIONS
} from './constants';

const { WS_SUPPORTED } = ERRORS;
const { OPEN, CONNECTING, CLOSED } = CONNECTION_STATES;

export default (url, hookOptions) => {
  const ws = useRef(null);
  const [messageCount, setMessageCount] = useState(0);
  const [received, setReceived] = useState(null);
  const [readyState, setReadyState] = useState(CONNECTING);
  const messageQueue = useRef([]).current;
  const options = useRef({ ...DEFAULT_OPTIONS, ...hookOptions }).current;
  const reconnectTimer = useRef(null);

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

  const initializeWS = () => { /* eslint-disable no-use-before-define */
    if (ws.current && getReadyState() !== CLOSED) return;

    ws.current = new WebSocket(url);
    ws.current.onopen = onOpen;
    ws.current.onclose = onClose;
    ws.current.onerror = handleError;

    ws.current.onmessage = (message) => {
      setReceived(message.data);
      setMessageCount(messageCount + 1);
    };
  };

  const reconnect = () => {
    setReadyState(CONNECTING);
    initializeWS();
    reconnectTimer.current = setTimeout(() => {
      if (getReadyState() === CLOSED) reconnect();
      else reconnectTimer.current = null;
    }, options.reconnectWait);
  };

  const onClose = () => {
    const { reconnect: shouldReconnect } = options;
    if (!shouldReconnect || readyState !== CONNECTING) updateReadyState();
    if (shouldReconnect) reconnect();
  };

  const send = (message) => {
    const currentState = updateReadyState();
    if (currentState === OPEN) ws.current.send(message);
    else {
      messageQueue.push(message);
      if (currentState !== CONNECTING) initializeWS();
    }
  };

  const onOpen = () => {
    updateReadyState();
    if (messageQueue.length) {
      while (messageQueue.length && getReadyState() === OPEN) {
        const message = messageQueue.shift();
        send(message);
      }
    }
  };

  if (!ws.current) initializeWS();

  useEffect(() => () => {
    if (reconnectTimer.current !== null) clearTimeout(reconnectTimer.current);
    if (!ws.current) return;

    ws.current.close();
    ws.current = null;
  }, []);

  const { url: wsUrl } = ws.current;
  return [send, received, messageCount, { readyState, url: wsUrl }];
};
