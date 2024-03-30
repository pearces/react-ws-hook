import { HANDLER_EVENTS } from '../constants';
import {
  callbackToHandlers,
  addListeners,
  removeListeners,
  readyStateUnsubscribe,
  readyStateSubscribe,
  removeAllListeners
} from '../listeners';
import { HandlerEvents, Handlers } from '../types';

describe('listeners', () => {
  let ws: WebSocket;
  const url = 'ws://localhost:8080';
  let readyStateSubs: Set<() => void>;

  const eventHandlers: Handlers = {
    open: jest.fn(),
    close: jest.fn(),
    message: jest.fn(),
    error: jest.fn()
  };

  const handlers: Handlers = {
    open: jest.fn(),
    close: jest.fn(),
    error: jest.fn()
  };

  beforeEach(() => {
    readyStateSubs = new Set<() => void>();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('callbackToHandlers', () => {
    it('should return an object containing event handlers with the provided callback', () => {
      const callback = jest.fn();
      const handlersResult = callbackToHandlers(callback);

      expect(handlersResult).toEqual({
        open: callback,
        close: callback,
        error: callback
      });
    });
  });

  describe('addListeners', () => {
    it('should add event listeners to the WebSocket instance', () => {
      ws = new WebSocket(url);
      const addListener = jest.spyOn(WebSocket.prototype, 'addEventListener');

      addListeners(ws, handlers);
      expect(addListener).toHaveBeenCalledTimes(3);
      HANDLER_EVENTS.forEach((key: HandlerEvents) => {
        if (handlers[key]) expect(addListener).toHaveBeenCalledWith(key, handlers[key]);
      });
    });
  });

  describe('removeListeners', () => {
    it('should remove event listeners from the WebSocket instance', () => {
      const removeListener = jest.spyOn(WebSocket.prototype, 'removeEventListener');

      ws = new WebSocket(url);
      removeListeners(ws, eventHandlers);

      expect(removeListener).toHaveBeenCalledTimes(4);
      HANDLER_EVENTS.forEach((key: HandlerEvents) =>
        expect(removeListener).toHaveBeenCalledWith(key, eventHandlers[key])
      );
    });
  });

  describe('readyStateUnsubscribe', () => {
    it('should remove event listeners for the specified callback from the WebSocket instance', () => {
      const callback = jest.fn();
      const removeListener = jest.spyOn(WebSocket.prototype, 'removeEventListener');

      ws = new WebSocket(url);
      readyStateSubs.add(callback);
      readyStateUnsubscribe(ws, readyStateSubs, callback);

      expect(removeListener).toHaveBeenCalledTimes(3);
      HANDLER_EVENTS.forEach((key: HandlerEvents) => {
        if (key in handlers) expect(removeListener).toHaveBeenCalledWith(key, callback);
      });
      expect(readyStateSubs.size).toBe(0);
    });

    it('should not remove event listeners if the WebSocket instance or callback is not found', () => {
      const callback = jest.fn();
      const removeListener = jest.spyOn(WebSocket.prototype, 'removeEventListener');

      ws = new WebSocket(url);
      /* @ts-expect-error ws is not defined */
      readyStateUnsubscribe(null, readyStateSubs, callback);
      /* @ts-expect-error callback is not defined */
      readyStateUnsubscribe(ws, readyStateSubs, null);

      expect(removeListener).not.toHaveBeenCalledWith(callback);
      expect(readyStateSubs.size).toBe(0);
    });
  });

  describe('readyStateSubscribe', () => {
    it('should add event listeners for the specified callback to the WebSocket instance', () => {
      const callback = jest.fn();
      const addListener = jest.spyOn(WebSocket.prototype, 'addEventListener');

      ws = new WebSocket(url);
      readyStateSubscribe(ws, readyStateSubs, callback);

      expect(addListener).toHaveBeenCalledTimes(3);
      HANDLER_EVENTS.forEach((key: HandlerEvents) => {
        if (key in handlers) expect(addListener).toHaveBeenCalledWith(key, callback);
      });
      expect(readyStateSubs.size).toBe(1);
    });

    it('should not add event listeners if the WebSocket instance or callback is already subscribed', () => {
      const callback = jest.fn();
      const addListener = jest.spyOn(WebSocket.prototype, 'addEventListener');

      ws = new WebSocket(url);
      readyStateSubs.add(callback);
      readyStateSubscribe(ws, readyStateSubs, callback);

      expect(addListener).not.toHaveBeenCalled();
      expect(readyStateSubs.size).toBe(1);
    });

    it('should not add event listeners if the WebSocket instance is not provided', () => {
      const callback = jest.fn();

      ws = null as unknown as WebSocket;
      readyStateSubscribe(ws, readyStateSubs, callback);

      expect(readyStateSubs.size).toBe(0);
    });
  });

  describe('removeAllListeners', () => {
    it('should remove all event listeners and clear the ready state subscriptions while preserving them', () => {
      const callback = jest.fn();
      const removeListener = jest.spyOn(WebSocket.prototype, 'removeEventListener');

      ws = new WebSocket(url);
      readyStateSubs.add(callback);
      removeAllListeners(ws, eventHandlers, readyStateSubs, true);

      expect(removeListener).toHaveBeenCalledTimes(7);
      HANDLER_EVENTS.forEach((key: HandlerEvents) => {
        expect(removeListener).toHaveBeenCalledWith(key, eventHandlers[key]);
        if (key in handlers) expect(removeListener).toHaveBeenCalledWith(key, callback);
      });
      expect(readyStateSubs.size).toBe(1);
    });

    it('should remove all event listeners and clear the ready state subscriptions without preserving them', () => {
      const callback = jest.fn();
      const removeListener = jest.spyOn(WebSocket.prototype, 'removeEventListener');

      ws = new WebSocket(url);
      readyStateSubs.add(callback);
      removeAllListeners(ws, eventHandlers, readyStateSubs, false);

      expect(removeListener).toHaveBeenCalledTimes(7);
      HANDLER_EVENTS.forEach((key: HandlerEvents) => {
        expect(removeListener).toHaveBeenCalledWith(key, eventHandlers[key]);
        if (key in handlers) expect(removeListener).toHaveBeenCalledWith(key, callback);
      });
      expect(readyStateSubs.size).toBe(0);
    });
  });
});
