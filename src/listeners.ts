import { HANDLER_EVENTS } from './constants';
import { EventListenerBindAction, HandlerEvents, Handlers } from './types';

/**
 * Converts a subscription callback function to a set of event callbacks.
 * @param callback - The onChange callback function.
 * @returns An object containing event handlers.
 */
export const callbackToHandlers = (callback: (event?: Event) => void): Handlers => ({
  open: callback,
  close: callback,
  error: callback
});

/**
 * Adds or removes event listeners on the WebSocket instance based on the specified action.
 * @param ws - The WebSocket instance.
 * @param action - The action to perform on the WebSocket instance.
 * @param handlers - The event handlers to add or remove.
 */
function setEventListeners(
  ws: WebSocket,
  action: keyof EventListenerBindAction,
  handlers: Handlers
) {
  HANDLER_EVENTS.forEach((type: HandlerEvents) => {
    if (handlers[type]) {
      ws[action](type, handlers[type] as EventListener);
    }
  });
}

/**
 * Adds WebSocket listeners.
 * @param ws - The WebSocket instance.
 * @param handlers - The event handlers to add.
 */
export function addListeners(ws: WebSocket, handlers: Handlers) {
  setEventListeners(ws, 'addEventListener', handlers);
}

/**
 * Removes WebSocket listeners.
 * @param ws - The WebSocket instance.
 * @param handlers - The event handlers to remove.
 */
export function removeListeners(ws: WebSocket, handlers: Handlers) {
  setEventListeners(ws, 'removeEventListener', handlers);
}

/**
 * Unsubscribes from the ready state of the WebSocket connection.
 * @param ws - The WebSocket instance.
 * @param readyStateSubs - The set of ready state change subscriptions.
 * @param callback - The callback function to be unsubscribed.
 */
export const readyStateUnsubscribe = (
  ws: WebSocket,
  readyStateSubs: Set<() => void>,
  callback: () => void
) => {
  if (!ws || !readyStateSubs.has(callback)) return;

  readyStateSubs.forEach((cb) => {
    if (callback === cb) removeListeners(ws, callbackToHandlers(callback));
  });

  readyStateSubs.delete(callback);
};

/**
 * Subscribes to the ready state of the WebSocket connection.
 * @param ws - The WebSocket instance.
 * @param readyStateSubs - The set of ready state change subscriptions.
 * @param callback - The callback function to be called when the ready state changes.
 */
export const readyStateSubscribe = (
  ws: WebSocket,
  readyStateSubs: Set<() => void>,
  callback: () => void
) => {
  if (ws && !readyStateSubs.has(callback)) {
    const handlers: Handlers = callbackToHandlers(callback);
    addListeners(ws, handlers);
    readyStateSubs.add(callback);
  }
};

/**
 * Removes all event listeners from the WebSocket instance
 * @param ws - The WebSocket instance.
 * @param eventHandlers - The event handlers to remove.
 * @param readyStateSubs - The set of ready state change subscriptions.
 * @param preserve - Whether to preserve the listeners and subscriptions to re-add them later.
 */
export function removeAllListeners(
  ws: WebSocket,
  eventHandlers: Handlers,
  readyStateSubs: Set<() => void>,
  preserve: boolean
) {
  removeListeners(ws, eventHandlers);
  readyStateSubs.forEach((callback) => removeListeners(ws, callbackToHandlers(callback)));

  if (!preserve) {
    readyStateSubs.clear();
  }
}
