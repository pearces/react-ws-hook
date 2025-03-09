import { useRef, useState, useEffect, useCallback } from 'react';
import {
  WebSocketOptions,
  Message,
  MessageData,
  WebSocketResult,
  ReadyStateValue,
  FinalWebSocketOptions,
  Action,
  Handlers
} from './types';
import { READY_STATES, ERRORS, DEFAULT_OPTIONS, ACTIONS } from './constants';
import { getReadyState, reconnect as wsReconnect, kill, connect } from './websocket';
import { removeAllListeners } from './listeners';

const { WS_UNSUPPORTED, RECONNECT_LIMIT_EXCEEDED, SEND_ERROR } = ERRORS;
const readyStates = Object.keys(READY_STATES) as (keyof typeof READY_STATES)[];
const { CONNECTING, OPEN, CLOSED } = READY_STATES;
const { CONNECTING: CONNECT, SENDING, DISCONNECTING } = ACTIONS;

/**
 * Custom WebSocket hook for using WebSocket connections in React.
 * @param url - The URL of the WebSocket server.
 * @param options - Additional options for configuring the WebSocket connection.
 * @returns An object containing the WebSocket connection state, received messages a method for sending messages.
 */
export default (url: string | URL, options: WebSocketOptions): WebSocketResult => {
  const [received, setReceived] = useState<MessageData | null>(null);
  const [readyState, setReadyState] = useState<ReadyStateValue>(CONNECTING);
  const messageQueue = useRef<Message[]>([]).current;
  let lastEvent = useRef<Action | null>(null).current;
  let isReconnecting = useRef(false).current;
  let currentReadyState = useRef<ReadyStateValue>(readyState).current;

  const combinedOptions = useRef<FinalWebSocketOptions>({ ...DEFAULT_OPTIONS, ...options }).current;
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
  } = combinedOptions;
  let reconnectTimer = useRef<NodeJS.Timeout | null>(null).current;
  const reconnects = useRef<number>(reconnectAttempts);

  if (typeof WebSocket === 'undefined') {
    logger.warn(WS_UNSUPPORTED);
    return {
      send: () => logger.warn(SEND_ERROR),
      received,
      readyState: readyStates[typeof window !== 'undefined' ? CLOSED : readyState], // only set to CLOSED if running in a browser to avoid breaking SSR
      url
    };
  }

  const ws = useRef<WebSocket | null>(null);
  const readyStateSubs = useRef<Set<() => void>>(new Set<() => void>()).current;

  /* eslint-disable no-use-before-define */
  const handlers = useRef<Handlers>({
    open: onOpen,
    close: onClose,
    error: onError,
    message: onMessage
  }).current;
  /* eslint-enable no-use-before-define */

  /**
   * Handles the error event for the WebSocket connection.
   * @param error - The error event object.
   */
  function onError(error: Event) {
    logger.error(`Failed ${lastEvent ?? ''} ${JSON.stringify(error)}`);
    if (errorHandler) errorHandler(error);
    lastEvent = null;
  }

  /**
   * Handles the incoming WebSocket message event.
   * @param event - The WebSocket message event.
   */
  function onMessage(event: Event | MessageEvent) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { data }: { data: MessageData | null } = event as MessageEvent;
    setReceived(data);
    if (messageHandler) messageHandler(data, event);
  }

  /**
   * Reconnects the WebSocket connection.
   * Sets the ready state to CONNECTING and initiates the reconnection process.
   * If the ready state is CLOSED, it creates a new WebSocket connection and decrements the reconnect count.
   * If the ready state is not CLOSED, it clears the reconnect timer.
   */
  function reconnect() {
    isReconnecting = true;
    reconnectTimer = setTimeout(() => {
      if (
        (currentReadyState === CLOSED || currentReadyState === CONNECTING) &&
        reconnects.current > 0
      ) {
        lastEvent = CONNECT;
        if (currentReadyState === CLOSED) wsReconnect(ws, url, handlers, readyStateSubs);
        reconnects.current -= 1;
        reconnect();
      } else {
        clearTimeout(reconnectTimer!);
        isReconnecting = false;
      }
    }, reconnectWait);
  }

  /**
   * Event handler for the WebSocket 'close' event.
   * @param event - The 'close' event object.
   */
  function onClose(event: Event) {
    const willReconnect = shouldReconnect && reconnects.current > 0;
    if (reconnects.current === 0) logger.warn(RECONNECT_LIMIT_EXCEEDED);
    if (closeHandler) closeHandler(event);
    if (willReconnect && !isReconnecting) reconnect();
  }

  /**
   * Sends a message through the WebSocket connection.
   * @param message - The message to send through the WebSocket connection.
   */
  function send(message: Message) {
    const currentState: ReadyStateValue = getReadyState(ws.current);

    if (currentState === OPEN) {
      lastEvent = SENDING;
      ws.current?.send(message);
      if (sendHandler) sendHandler(message);
    } else {
      if (retrySend) messageQueue.push(message);
      else logger.warn(SEND_ERROR);

      if (currentState !== CONNECTING) reconnect();
    }
  }

  /**
   * Event handler for the WebSocket 'open' event.
   * @param event - The 'open' event object.
   */
  function onOpen(event: Event) {
    reconnects.current = reconnectAttempts;
    isReconnecting = false;
    if (openHandler) openHandler(event);
    lastEvent = null;

    if (messageQueue.length) {
      while (messageQueue.length && currentReadyState === OPEN) {
        const message = messageQueue.shift();
        if (message !== undefined) send(message);
      }
    }
  }

  const readyStateCallback = useCallback(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    currentReadyState = getReadyState(ws.current);
    setReadyState(() => currentReadyState);
  }, []);

  useEffect(() => {
    if (!ws.current) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      lastEvent = CONNECT;
      connect(ws, url, handlers, readyStateSubs, readyStateCallback);
    }

    return () => {
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (!ws.current) return;

      removeAllListeners(ws.current, handlers, readyStateSubs, false);

      ws.current.onerror = onError;
      if (readyState === OPEN || readyState === CONNECTING) {
        lastEvent = DISCONNECTING;
        // eslint-disable-next-line react-hooks/exhaustive-deps
        ws.current?.close();
      }
      kill(ws);
    };
  }, []);

  return {
    send,
    received,
    readyState: readyStates[readyState],
    url: ws.current?.url ?? url
  };
};
