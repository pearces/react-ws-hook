import { useRef, useState, useEffect } from 'react';
import {
  READY_STATES,
  ERRORS,
  CONNECTION_STATES,
  DEFAULT_OPTIONS,
  ACTIONS
} from './constants';

const { WS_SUPPORTED, RECONNECT_LIMIT_EXCEEDED, SEND_ERROR } = ERRORS;
const { OPEN, CONNECTING, CLOSED } = CONNECTION_STATES;
const { CONNECTING: CONNECT, SENDING, DISCONNECTING } = ACTIONS;

export default (url, options) => {
  const ws = useRef(null);
  const [received, setReceived] = useState(null);
  const [readyState, setReadyState] = useState(CONNECTING);
  const messageQueue = useRef([]).current;
  let lastEvent = useRef(null).current;
  let isReconnecting = useRef(false).current;

  const {
    reconnectWait,
    reconnectAttempts,
    reconnect: shouldReconnect,
    retrySend,
    onSend: sendHandler,
    onMessage: messageHandler,
    onOpen: openHandler,
    onClose: closeHandler,
    onError: errorHandler,
    logger
  } = useRef({ ...DEFAULT_OPTIONS, ...options }).current;
  const reconnectTimer = useRef(null);
  const handlers = useRef(null);
  const reconnects = useRef(reconnectAttempts);

  if (typeof WebSocket === 'undefined') {
    logger.warn(WS_SUPPORTED);
    return [() => {}, received, { readyState }];
  }

  const getReadyState = () => READY_STATES[ws?.current?.readyState || 0];

  const updateReadyState = () => {
    const connectionState = getReadyState();
    setReadyState(connectionState);
    return connectionState;
  };

  const onError = (error) => {
    logger.error(`Failed ${lastEvent || ''} ${error.toString()}`);
    updateReadyState();
    if (errorHandler) errorHandler(error);
    lastEvent = null;
  };

  const onMessage = (event) => {
    const { data } = event;
    setReceived(data);
    if (messageHandler) messageHandler(data, event);
  };

  const createSocket = () => {
    if (ws.current && getReadyState() !== CLOSED) return;

    lastEvent = CONNECT;
    ws.current = new WebSocket(url);

    Object.keys(handlers.current).forEach(
      (type) => ws.current.addEventListener(type, handlers.current[type])
    );
  };

  const reconnect = () => {
    setReadyState(CONNECTING);
    isReconnecting = true;
    reconnectTimer.current = setTimeout(() => {
      if (getReadyState() === CLOSED) {
        createSocket();
        reconnects.current -= 1;
        reconnect();
      } else reconnectTimer.current = null;
    }, reconnectWait);
  };

  const onClose = (event) => {
    const { current: reconnectsLeft } = reconnects;
    const willReconnect = shouldReconnect && reconnectsLeft !== 0;
    if (reconnectsLeft === 0) logger.warn(RECONNECT_LIMIT_EXCEEDED);
    if (!willReconnect || readyState !== CONNECTING) updateReadyState();
    if (willReconnect && !isReconnecting) reconnect();
    if (closeHandler) closeHandler(event);
  };

  const send = (message) => {
    const currentState = updateReadyState();
    if (currentState === OPEN) {
      lastEvent = SENDING;
      ws.current.send(message);
      if (sendHandler) sendHandler(message);
    } else {
      if (retrySend) messageQueue.push(message);
      else logger.warn(SEND_ERROR);

      if (currentState !== CONNECTING) createSocket();
    }
  };

  const onOpen = (event) => {
    updateReadyState();
    reconnects.current = reconnectAttempts;
    isReconnecting = false;
    if (openHandler) openHandler(event);
    lastEvent = null;
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
      (type) => ws.current.removeEventListener(type, handlers.current[type])
    );
    handlers.current = null;

    // TODO: check if this works when closing the socket and erroring out
    lastEvent = DISCONNECTING; // eslint-disable-line react-hooks/exhaustive-deps
    ws.current.onError = onError;
    ws.current.close();

    ws.current = null;
  }, []);

  const { url: wsUrl } = ws.current;
  return {
    send,
    received,
    readyState,
    url: wsUrl
  };
};
