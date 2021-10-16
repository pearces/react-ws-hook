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

export default (url, options) => {
  const ws = useRef(null);
  const [messageCount, setMessageCount] = useState(0);
  const [received, setReceived] = useState(null);
  const [readyState, setReadyState] = useState(CONNECTING);
  const messageQueue = useRef([]).current;
  const {
    reconnectWait,
    reconnect: shouldReconnect,
    onSend: sendHandler,
    onMessage: messageHandler,
    onOpen: openHandler,
    onClose: closeHandler,
    onError: errorHandler
  } = useRef({ ...DEFAULT_OPTIONS, ...options }).current;
  const reconnectTimer = useRef(null);
  const handlers = useRef(null);

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

  const onError = (error) => {
    console.error(error);
    updateReadyState();
    if (errorHandler) errorHandler(error);
  };

  const onMessage = (event) => {
    const { data } = event;
    setReceived(data);
    setMessageCount(messageCount + 1);
    if (messageHandler) messageHandler(data, event);
  };

  const createSocket = () => {
    if (ws.current && getReadyState() !== CLOSED) return;

    ws.current = new WebSocket(url);

    Object.keys(handlers.current).forEach(
      (type) => ws.current.addEventListener(type, handlers.current[type])
    );
  };

  const reconnect = () => {
    setReadyState(CONNECTING);
    createSocket();
    reconnectTimer.current = setTimeout(() => {
      if (getReadyState() === CLOSED) reconnect();
      else reconnectTimer.current = null;
    }, reconnectWait);
  };

  const onClose = (event) => {
    if (!shouldReconnect || readyState !== CONNECTING) updateReadyState();
    if (shouldReconnect) reconnect();
    if (closeHandler) closeHandler(event);
  };

  const send = (message) => {
    const currentState = updateReadyState();
    if (currentState === OPEN) {
      ws.current.send(message);
      if (sendHandler) sendHandler(message);
    } else {
      messageQueue.push(message);
      if (currentState !== CONNECTING) createSocket();
    }
  };

  const onOpen = (event) => {
    updateReadyState();
    if (openHandler) openHandler(event);
    if (messageQueue.length) {
      while (messageQueue.length && getReadyState() === OPEN) {
        const message = messageQueue.shift();
        send(message);
      }
    }
  };

  if (!handlers.current) {
    handlers.current = {
      open: onOpen,
      close: onClose,
      error: onError,
      message: onMessage
    };
  }
  if (!ws.current) createSocket();

  useEffect(() => () => {
    if (reconnectTimer.current !== null) clearTimeout(reconnectTimer.current);
    if (!ws.current) return;

    Object.keys(handlers.current).forEach(
      (type) => ws.current.removeEventListener(type, handlers[type])
    );
    handlers.current = null;

    ws.current.close();
    ws.current = null;
  }, []);

  const { url: wsUrl } = ws.current;
  return [send, received, messageCount, { readyState, url: wsUrl }];
};
