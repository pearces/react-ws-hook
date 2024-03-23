import { MutableRefObject } from 'react';
import { READY_STATES } from './constants';
import { Handlers, ReadyStateValue } from './types';
import {
  addListeners,
  callbackToHandlers,
  readyStateSubscribe,
  removeAllListeners
} from './listeners';

const { CLOSED, CONNECTING } = READY_STATES;

/**
 * Returns the current ready state of the WebSocket connection.
 * @param ws - The WebSocket instance.
 * @returns The ready state value.
 */
export const getReadyState = (ws?: WebSocket | null): ReadyStateValue =>
  (ws?.readyState || CONNECTING) as ReadyStateValue;

/**
 * Synchronizes the ready state with the ready state subscription callbacks.
 * @param ws - The WebSocket instance.
 * @param readyStateSubs - The set of ready state change subscriptions.
 */
const syncReadyState = (ws: WebSocket, readyStateSubs: Set<() => void>) =>
  readyStateSubs.forEach((callback) => callback());

/**
 * Creates a new WebSocket connection.
 * @param ws - The WebSocket instance.
 * @param url - The URL of the WebSocket server.
 * @param eventHandlers - The event handlers for the WebSocket connection.
 * @param readyStateSubs - The set of ready state change subscriptions.
 * @param readyStateCallback - The callback function to be called when the ready state changes.
 */
export const connect = (
  ws: MutableRefObject<WebSocket | null>,
  url: URL | string,
  eventHandlers: Handlers,
  readyStateSubs: Set<() => void>,
  readyStateCallback?: () => void
) => {
  // eslint-disable-next-line no-param-reassign
  ws.current = new WebSocket(url);
  if (readyStateCallback) {
    readyStateSubscribe(ws.current, readyStateSubs, readyStateCallback);
  } else if (readyStateSubs.size) {
    readyStateSubs.forEach((callback) =>
      addListeners(ws.current as WebSocket, callbackToHandlers(callback))
    );
  }
  addListeners(ws.current, eventHandlers);

  syncReadyState(ws.current, readyStateSubs);
};

/**
 * Reconnects the WebSocket connection.
 * @param ws - The WebSocket instance.
 * @param url - The URL of the WebSocket server.
 * @param eventHandlers - The event handlers for the WebSocket connection.
 * @param readyStateSubs - The set of ready state change subscriptions.
 */
export const reconnect = (
  ws: MutableRefObject<WebSocket | null>,
  url: URL | string,
  eventHandlers: Handlers,
  readyStateSubs: Set<() => void>
) => {
  if (ws.current) {
    if (ws.current?.readyState !== CLOSED) return;
    removeAllListeners(ws.current, eventHandlers, readyStateSubs, true);
  }

  connect(ws, url, eventHandlers, readyStateSubs);
};

/**
 * Disposes the WebSocket connection.
 * @param ws - The WebSocket instance.
 */
export const kill = (ws: MutableRefObject<WebSocket | null>) => {
  // eslint-disable-next-line no-param-reassign, @typescript-eslint/no-unused-vars
  ws.current = null;
};
