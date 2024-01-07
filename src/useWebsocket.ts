import { useRef, useState, useEffect } from 'react';
import {
  WebSocketOptions,
  Message,
  Handlers,
  MessageData,
  WebSocketResult,
  Logger,
  ReadyStateValue
} from './types';
import { READY_STATES, ERRORS, DEFAULT_OPTIONS, ACTIONS } from './constants';

const { WS_UNSUPPORTED, RECONNECT_LIMIT_EXCEEDED, SEND_ERROR } = ERRORS;
const readyStates = Object.keys(READY_STATES) as Array<keyof typeof READY_STATES>;
const { CONNECTING, OPEN, CLOSED } = READY_STATES;

const { CONNECTING: CONNECT, SENDING, DISCONNECTING } = ACTIONS;
type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

type HandlerEvents = keyof WebSocketEventMap & keyof Handlers;

export default (url: string | URL, options: WebSocketOptions): WebSocketResult => {
  const ws = useRef<WebSocket | null>(null);
  const [received, setReceived] = useState<MessageData | null>(null);
  const [readyState, setReadyState] = useState<ReadyStateValue>(CONNECTING);
  const messageQueue = useRef<Message[]>([]).current;
  let lastEvent = useRef<Action | null>(null).current;
  let isReconnecting = useRef(false).current;

  const {
    reconnectWait,
    reconnectAttempts = 0,
    reconnect: shouldReconnect,
    retrySend,
    onSend: sendHandler,
    onMessage: messageHandler,
    onOpen: openHandler,
    onClose: closeHandler,
    onError: errorHandler,
    logger = DEFAULT_OPTIONS.logger as Logger
  } = useRef<WebSocketOptions>({ ...DEFAULT_OPTIONS, ...options }).current;
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const handlers = useRef<Handlers | null>(null);
  const reconnects = useRef<number>(reconnectAttempts);

  if (typeof WebSocket === 'undefined') {
    logger.warn(WS_UNSUPPORTED);
    return { send: () => {}, received, readyState: readyStates[readyState], url };
  }

  const getReadyState = (): ReadyStateValue =>
    (ws?.current?.readyState || CONNECTING) as ReadyStateValue;

  const updateReadyState = (): ReadyStateValue => {
    const connectionState = getReadyState();
    setReadyState(connectionState);
    return connectionState;
  };

  const onError = (error: Event) => {
    logger.error(`Failed ${lastEvent || ''} ${error.toString()}`); // TODO: check if error.toString() is correct
    updateReadyState();
    if (errorHandler) errorHandler(error);
    lastEvent = null;
  };

  const onMessage = (event: Event | MessageEvent) => {
    const { data } = event as MessageEvent;
    setReceived(data);
    if (messageHandler) messageHandler(data, event);
  };

  const createSocket = () => {
    if (ws.current && getReadyState() !== CLOSED) return;

    lastEvent = CONNECT;
    ws.current = new WebSocket(url);

    if (handlers.current) {
      (Object.keys(handlers.current) as Array<HandlerEvents>).forEach((type) =>
        ws?.current?.addEventListener(type, (handlers.current as Handlers)[type])
      );
    }
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

  const onClose = (event: Event) => {
    const { current: reconnectsLeft } = reconnects;
    const willReconnect = shouldReconnect && reconnectsLeft !== 0;
    if (reconnectsLeft === 0) logger.warn(RECONNECT_LIMIT_EXCEEDED);
    if (!willReconnect || readyState !== CONNECTING) updateReadyState();
    if (willReconnect && !isReconnecting) reconnect();
    if (closeHandler) closeHandler(event);
  };

  const send = (message: Message) => {
    const currentState = updateReadyState();
    if (currentState === OPEN) {
      lastEvent = SENDING;
      ws?.current?.send(message);
      if (sendHandler) sendHandler(message);
    } else {
      if (retrySend) messageQueue.push(message);
      else logger.warn(SEND_ERROR);

      if (currentState !== CONNECTING) createSocket();
    }
  };

  const onOpen = (event: Event) => {
    updateReadyState();
    reconnects.current = reconnectAttempts;
    isReconnecting = false;
    if (openHandler) openHandler(event);
    lastEvent = null;
    if (messageQueue.length) {
      while (messageQueue.length && getReadyState() === OPEN) {
        const message = messageQueue.shift();
        if (message !== undefined) send(message);
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

  useEffect(
    () => () => {
      if (reconnectTimer.current !== null) clearTimeout(reconnectTimer.current);
      if (!ws.current) return;

      if (handlers.current !== null) {
        (Object.keys(handlers.current) as Array<HandlerEvents>).forEach((type) =>
          ws?.current?.removeEventListener(type, (handlers.current as Handlers)[type])
        );
      }
      handlers.current = null;

      // TODO: check if this works when closing the socket and erroring out
      lastEvent = DISCONNECTING; // eslint-disable-line react-hooks/exhaustive-deps
      ws.current.onerror = onError;
      ws.current.close();

      ws.current = null;
    },
    []
  );

  return {
    send,
    received,
    readyState: readyStates[readyState],
    url: ws?.current?.url || url
  };
};
