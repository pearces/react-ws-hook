import { useRef, useState, useEffect, useSyncExternalStore } from 'react';
import {
  WebSocketOptions,
  Message,
  MessageData,
  WebSocketResult,
  ReadyStateValue,
  FinalWebSocketOptions,
  Action,
  WebSocketWrapperResult
} from './types';
import { READY_STATES, ERRORS, DEFAULT_OPTIONS, ACTIONS } from './constants';
import websocketWrapper from './websocketWrapper';

const { WS_UNSUPPORTED, RECONNECT_LIMIT_EXCEEDED, SEND_ERROR } = ERRORS;
const readyStates = Object.keys(READY_STATES) as Array<keyof typeof READY_STATES>;
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
  const messageQueue = useRef<Message[]>([]).current;
  let lastEvent = useRef<Action | null>(null).current;
  let isReconnecting = useRef(false).current;

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
      send: () => {},
      received,
      readyState: readyStates[typeof window !== 'undefined' ? CLOSED : CONNECTING], // only set to CLOSED if running in a browser to avoid breaking SSR
      url
    };
  }

  /* eslint-disable no-use-before-define */
  const {
    ws,
    readyStateSubscribe,
    getReadyState,
    reconnect: wsReconnect,
    disableAllListeners,
    kill
  } = useRef<WebSocketWrapperResult>(
    websocketWrapper(url, {
      open: onOpen,
      close: onClose,
      error: onError,
      message: onMessage
    })
  ).current;
  /* eslint-enable no-use-before-define */

  /** Subscribes to the ready state of the WebSocket connection. */
  const readyState = useSyncExternalStore<ReadyStateValue>(
    readyStateSubscribe,
    getReadyState,
    getReadyState
  );

  /**
   * Handles the error event for the WebSocket connection.
   * @param error - The error event object.
   */
  function onError(error: Event) {
    logger.error(`Failed ${lastEvent || ''} ${JSON.stringify(error)}`);
    if (errorHandler) errorHandler(error);
    lastEvent = null;
  }

  /**
   * Handles the incoming WebSocket message event.
   * @param event - The WebSocket message event.
   */
  function onMessage(event: Event | MessageEvent) {
    const { data } = event as MessageEvent;
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
      if (ws.readyState === CLOSED && reconnects.current > 0) {
        lastEvent = CONNECT;
        wsReconnect();
        reconnects.current -= 1;
        reconnect();
      } else {
        clearTimeout(reconnectTimer as NodeJS.Timeout);
        isReconnecting = false;
      }
    }, reconnectWait);
  }

  /**
   * Event handler for the WebSocket 'close' event.
   * @param event - The 'close' event object.
   */
  function onClose(event: Event) {
    const willReconnect = shouldReconnect && reconnects.current >= 0;
    if (reconnects.current === 0) logger.warn(RECONNECT_LIMIT_EXCEEDED);
    if (willReconnect && !isReconnecting) reconnect();
    if (closeHandler) closeHandler(event);
  }

  /**
   * Sends a message through the WebSocket connection.
   * @param message - The message to send through the WebSocket connection.
   */
  function send(message: Message) {
    const currentState = ws.readyState;
    if (currentState === OPEN) {
      lastEvent = SENDING;
      ws.send(message);
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
      while (messageQueue.length && readyState === OPEN) {
        const message = messageQueue.shift();
        if (message !== undefined) send(message);
      }
    }
  }

  useEffect(() => {
    lastEvent = CONNECT; // eslint-disable-line react-hooks/exhaustive-deps

    return () => {
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      if (!ws) return;

      disableAllListeners();

      ws.onerror = onError;
      if (readyState === OPEN) {
        lastEvent = DISCONNECTING; // eslint-disable-line react-hooks/exhaustive-deps
        ws.close();
      }
      kill();
    };
  }, []);

  return {
    send,
    received,
    readyState: readyStates[readyState],
    url: ws.url || url
  };
};
