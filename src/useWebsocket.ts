import { useRef, useState, useEffect, useCallback } from 'react';
import type {
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
const useWebsocket = (url: string | URL, options: WebSocketOptions): WebSocketResult => {
  const [received, setReceived] = useState<MessageData | null>(null);
  const [readyState, setReadyState] = useState<ReadyStateValue>(CONNECTING);
  const messageQueueRef = useRef<Message[]>([]);
  const lastEventRef = useRef<Action | null>(null);
  const isReconnectingRef = useRef(false);
  const currentReadyStateRef = useRef<ReadyStateValue>(readyState);

  const combinedOptions = { ...DEFAULT_OPTIONS, ...options } as FinalWebSocketOptions;
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
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnects = useRef<number>(reconnectAttempts);

  const ws = useRef<WebSocket | null>(null);
  const readyStateSubsRef = useRef<Set<() => void>>(new Set<() => void>());

  const handlersRef = useRef<Handlers>({} as Handlers);

  const readyStateCallback = useCallback(() => {
    currentReadyStateRef.current = getReadyState(ws.current);
    setReadyState(currentReadyStateRef.current);
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (typeof WebSocket === 'undefined') {
      logger.warn(WS_UNSUPPORTED);
      return;
    }
    if (!ws.current) {
      lastEventRef.current = CONNECT;
      connect(ws, url, handlersRef.current, readyStateSubsRef.current, readyStateCallback);
    }

    return () => {
      const handlers = handlersRef.current;
      const readyStateSubs = readyStateSubsRef.current;
      const wsCurrent = ws.current;

      if (reconnectTimerRef.current !== null) clearTimeout(reconnectTimerRef.current);
      if (!wsCurrent) return;

      removeAllListeners(wsCurrent, handlers, readyStateSubs, false);

      wsCurrent.onerror = onError;
      if (readyState === OPEN || readyState === CONNECTING) {
        lastEventRef.current = DISCONNECTING;
        wsCurrent?.close();
      }
      kill(ws);
    };
  }, []);

  if (typeof WebSocket === 'undefined') {
    logger.warn(WS_UNSUPPORTED);
    return {
      send: () => logger.warn(SEND_ERROR),
      received,
      readyState: readyStates[typeof window !== 'undefined' ? CLOSED : readyState], // only set to CLOSED if running in a browser to avoid breaking SSR
      url
    };
  }

  /**
   * Handles the error event for the WebSocket connection.
   * @param error - The error event object.
   */
  function onError(error: Event) {
    logger.error(`Failed ${lastEventRef.current ?? ''} ${JSON.stringify(error)}`);
    if (errorHandler) errorHandler(error);
    lastEventRef.current = null;
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
    isReconnectingRef.current = true;
    reconnectTimerRef.current = setTimeout(() => {
      if (
        (currentReadyStateRef.current === CLOSED || currentReadyStateRef.current === CONNECTING) &&
        reconnects.current > 0
      ) {
        lastEventRef.current = CONNECT;
        if (currentReadyStateRef.current === CLOSED)
          wsReconnect(ws, url, handlersRef.current, readyStateSubsRef.current);
        reconnects.current -= 1;
        reconnect();
      } else {
        clearTimeout(reconnectTimerRef.current!);
        isReconnectingRef.current = false;
        if (reconnects.current === 0) logger.warn(RECONNECT_LIMIT_EXCEEDED);
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
    if (willReconnect && !isReconnectingRef.current) reconnect();
  }

  /**
   * Sends a message through the WebSocket connection.
   * @param message - The message to send through the WebSocket connection.
   */
  function send(message: Message) {
    const currentState: ReadyStateValue = getReadyState(ws.current);

    if (currentState === OPEN) {
      lastEventRef.current = SENDING;
      ws.current?.send(message);
      if (sendHandler) sendHandler(message);
    } else {
      if (retrySend) messageQueueRef.current.push(message);
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
    isReconnectingRef.current = false;
    if (openHandler) openHandler(event);
    lastEventRef.current = null;

    if (messageQueueRef.current.length) {
      while (messageQueueRef.current.length && currentReadyStateRef.current === OPEN) {
        const message = messageQueueRef.current.shift();
        if (message !== undefined) send(message);
      }
    }
  }

  // populate handlersRef after function declarations so they reference the latest functions
  handlersRef.current = {
    open: onOpen,
    close: onClose,
    error: onError,
    message: onMessage
  };
  return {
    send,
    received,
    readyState: readyStates[readyState],
    url: ws.current?.url ?? url
  };
};

export default useWebsocket;
