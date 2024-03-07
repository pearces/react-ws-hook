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

/**
 * Custom WebSocket hook for using WebSocket connections in React.
 * @param url - The URL of the WebSocket server.
 * @param options - Additional options for configuring the WebSocket connection.
 * @returns An object containing the WebSocket connection state, received messages a method for sending messages.
 */
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
  let reconnectTimer = useRef<NodeJS.Timeout | null>(null).current;
  const handlers = useRef<Handlers | null>(null);
  let reconnects = useRef<number>(reconnectAttempts).current;

  if (typeof WebSocket === 'undefined') {
    logger.warn(WS_UNSUPPORTED);
    return { send: () => {}, received, readyState: readyStates[readyState], url };
  }

  /**
   * Returns the current ready state of the WebSocket connection.
   * @returns The ready state value.
   */
  const getReadyState = (): ReadyStateValue =>
    (ws.current?.readyState || CONNECTING) as ReadyStateValue;

  /**
   * Updates the ready state of the WebSocket connection and returns the updated state.
   * @returns The updated ready state of the WebSocket connection.
   */
  const updateReadyState = (): ReadyStateValue => {
    const connectionState = getReadyState();
    setReadyState(connectionState);
    return connectionState;
  };

  /**
   * Handles the error event for the WebSocket connection.
   * @param error - The error event object.
   */
  const onError = (error: Event) => {
    logger.error(`Failed ${lastEvent || ''} ${JSON.stringify(error)}`);
    updateReadyState();
    if (errorHandler) errorHandler(error);
    lastEvent = null;
  };

  /**
   * Handles the incoming WebSocket message event.
   * @param event - The WebSocket message event.
   */
  const onMessage = (event: Event | MessageEvent) => {
    const { data } = event as MessageEvent;
    setReceived(data);
    if (messageHandler) messageHandler(data, event);
  };

  /**
   * Creates a WebSocket connection and sets up event handlers.
   * If a WebSocket connection already exists and is not closed, this function does nothing.
   */
  const createSocket = () => {
    if (ws.current && getReadyState() !== CLOSED) return;

    lastEvent = CONNECT;
    ws.current = new WebSocket(url);

    if (handlers.current) {
      (Object.keys(handlers.current) as Array<HandlerEvents>).forEach((type) =>
        ws.current?.addEventListener(type, (handlers.current as Handlers)[type])
      );
    }
  };

  /**
   * Reconnects the WebSocket connection.
   * Sets the ready state to CONNECTING and initiates the reconnection process.
   * If the ready state is CLOSED, it creates a new WebSocket connection and decrements the reconnect count.
   * If the ready state is not CLOSED, it clears the reconnect timer.
   */
  const reconnect = () => {
    setReadyState(CONNECTING);
    isReconnecting = true;
    reconnectTimer = setTimeout(() => {
      if (getReadyState() === CLOSED) {
        createSocket();
        reconnects -= 1;
        reconnect();
      } else reconnectTimer = null;
    }, reconnectWait);
  };

  /**
   * Event handler for the WebSocket 'close' event.
   * @param event - The 'close' event object.
   */
  const onClose = (event: Event) => {
    const willReconnect = shouldReconnect && reconnects !== 0;
    if (reconnects === 0) logger.warn(RECONNECT_LIMIT_EXCEEDED);
    if (!willReconnect || readyState !== CONNECTING) updateReadyState();
    if (willReconnect && !isReconnecting) reconnect();
    if (closeHandler) closeHandler(event);
  };

  /**
   * Sends a message through the WebSocket connection.
   * @param message - The message to send through the WebSocket connection.
   */
  const send = (message: Message) => {
    const currentState = updateReadyState();
    if (currentState === OPEN) {
      lastEvent = SENDING;
      ws.current?.send(message);
      if (sendHandler) sendHandler(message);
    } else {
      if (retrySend) messageQueue.push(message);
      else logger.warn(SEND_ERROR);

      if (currentState !== CONNECTING) createSocket();
    }
  };

  /**
   * Event handler for the WebSocket 'open' event.
   * @param event - The 'open' event object.
   */
  const onOpen = (event: Event) => {
    updateReadyState();
    reconnects = reconnectAttempts;
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
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (!ws.current) return;

      if (handlers.current !== null) {
        (Object.keys(handlers.current) as Array<HandlerEvents>).forEach((type) =>
          ws.current?.removeEventListener(type, (handlers.current as Handlers)[type])
        );
      }
      handlers.current = null;

      // TODO: check if this works when closing the socket and erroring out
      lastEvent = DISCONNECTING; // eslint-disable-line react-hooks/exhaustive-deps
      if (ws.current) {
        ws.current.onerror = onError;
        ws.current.close();
        ws.current = null;
      }
    },
    []
  );

  return {
    send,
    received,
    readyState: readyStates[readyState],
    url: ws.current?.url || url
  };
};
