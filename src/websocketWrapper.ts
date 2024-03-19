import { HANDLER_EVENTS, READY_STATES } from './constants';
import {
  EventListenerBindAction,
  HandlerEvents,
  Handlers,
  ReadyStateValue,
  WebSocketWrapperResult
} from './types';

const { CLOSED, CONNECTING } = READY_STATES;

/**
 * Converts a subscription callback function to a set of event callbacks.
 * @param callback - The onChange callback function.
 * @returns An object containing event handlers.
 */
const callbackToHandlers = (callback: (event?: Event) => void): Handlers => ({
  open: callback,
  close: callback,
  error: callback
});

/**
 * Creates a WebSocket wrapper with event handling and ready state change subscriptions.
 * @param url - The URL of the WebSocket server.
 * @param eventHandlers - The event handlers for WebSocket events.
 * @returns The WebSocket wrapper result object.
 */
export default (url: URL | string, eventHandlers: Handlers): WebSocketWrapperResult => {
  const readyStateSubs = new Set<() => void>();
  const listeners = new Map<keyof Handlers, Handlers[keyof Handlers]>();
  let ws: WebSocket = new WebSocket(url);

  addListeners(eventHandlers); // eslint-disable-line no-use-before-define
  HANDLER_EVENTS.forEach((type: HandlerEvents) => {
    listeners.set(type, eventHandlers[type]);
  });

  /**
   * Adds or removes event listeners on the WebSocket instance based on the specified action.
   * @param action - The action to perform on the WebSocket instance.
   * @param handlers - The event handlers to add or remove.
   */
  function setEventListeners(action: keyof EventListenerBindAction, handlers: Handlers) {
    HANDLER_EVENTS.forEach((type: HandlerEvents) => {
      if (handlers[type]) {
        ws[action](type, handlers[type] as EventListener);
      }
    });
  }

  /**
   * Adds WebSocket listeners.
   * @param handlers - The event handlers to add.
   */
  function addListeners(handlers: Handlers) {
    setEventListeners('addEventListener', handlers);
  }

  /**
   * Removes WebSocket listeners.
   * @param handlers - The event handlers to remove.
   */
  function removeListeners(handlers: Handlers) {
    setEventListeners('removeEventListener', handlers);
  }

  /**
   * Unsubscribes from the ready state of the WebSocket connection.
   * @param callback - The callback function to be unsubscribed.
   */
  const readyStateUnsubscribe = (callback: () => void) => {
    if (!ws || !readyStateSubs.has(callback)) return;

    readyStateSubs.forEach((cb) => {
      if (callback === cb) removeListeners(callbackToHandlers(callback));
    });

    readyStateSubs.delete(callback);
  };

  /**
   * Subscribes to the ready state of the WebSocket connection.
   * @param callback - The callback function to be called when the ready state changes.
   * @returns A function to unsubscribe from the ready state changes.
   */
  const readyStateSubscribe = (callback: () => void): (() => void) => {
    if (ws && !readyStateSubs.has(callback)) {
      const handlers: Handlers = callbackToHandlers(callback);
      addListeners(handlers);
      readyStateSubs.add(callback);
    }

    return () => readyStateUnsubscribe(callback);
  };

  /**
   * Returns the current ready state of the WebSocket connection.
   * @returns The ready state value.
   */
  const getReadyState = (): ReadyStateValue => (ws?.readyState || CONNECTING) as ReadyStateValue;

  /**
   * Synchronizes the ready state with the ready state subscription callbacks.
   */
  const syncReadyState = () => readyStateSubs.forEach((callback) => callback());

  /**
   * Removes all event listeners from the WebSocket instance.
   * @param preserve - Whether to preserve the listeners and subscriptions to re-add them later.
   */
  function removeAllListeners(preserve: boolean) {
    removeListeners(eventHandlers);

    readyStateSubs.forEach((callback) => removeListeners(callbackToHandlers(callback)));

    if (!preserve) {
      listeners.clear();
      readyStateSubs.clear();
    }
  }

  /**
   * Reconnects the WebSocket connection.
   */
  const reconnect = () => {
    if (ws) {
      if (ws.readyState !== CLOSED) return;
      removeAllListeners(true);
    }

    ws = new WebSocket(url);
    addListeners(eventHandlers);

    readyStateSubs.forEach((callback) => addListeners(callbackToHandlers(callback)));
    syncReadyState();
  };

  /**
   * Disposes the WebSocket connection.
   */
  const kill = () => {
    // @ts-expect-error ws isn't used after this
    ws = null;
  };

  return {
    ws,
    getReadyState,
    readyStateSubscribe,
    readyStateUnsubscribe,
    reconnect,
    disableAllListeners: () => removeAllListeners(true),
    kill
  };
};
