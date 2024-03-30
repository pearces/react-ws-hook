import { MutableRefObject } from 'react';
import { connect, getReadyState, kill, reconnect } from '../websocket';
import { HANDLER_EVENTS, READY_STATES } from '../constants';
import { HandlerEvents, Handlers } from '../types';

const { CLOSED, CONNECTING } = READY_STATES;

describe('websocket', () => {
  let ws: MutableRefObject<WebSocket | null>;
  const eventHandlers: Handlers = {
    open: jest.fn(),
    close: jest.fn(),
    message: jest.fn(),
    error: jest.fn()
  };

  let readyStateSubs: Set<() => void>;
  const url = 'ws://localhost:8080';

  beforeEach(() => {
    ws = { current: null };
    readyStateSubs = new Set<() => void>();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getReadyState', () => {
    it('should return the ready state value of the WebSocket connection', () => {
      const readyState = getReadyState(null);

      expect(readyState).toBe(CONNECTING);
    });

    it('should return the ready state value of the WebSocket connection when ws is provided', () => {
      const mockWebSocket = { readyState: CLOSED } as WebSocket;
      const readyState = getReadyState(mockWebSocket);

      expect(readyState).toBe(CLOSED);
    });
  });

  describe('connect', () => {
    it('should create a new WebSocket connection', () => {
      const readyStateCallback = jest.fn();
      connect(ws, url, eventHandlers, readyStateSubs, readyStateCallback);

      expect(ws.current).toBeInstanceOf(WebSocket);
      expect(ws.current?.url).toContain(url); // a trailing slash can be added
      expect(readyStateSubs.size).toBe(1);
      expect(readyStateCallback).toHaveBeenCalled();
    });

    it('should add event listeners to the WebSocket connection', () => {
      const addListener = jest.spyOn(WebSocket.prototype, 'addEventListener');
      connect(ws, url, eventHandlers, readyStateSubs);

      expect(addListener).toHaveBeenCalledTimes(4);
      HANDLER_EVENTS.forEach((key: HandlerEvents) => {
        expect(addListener).toHaveBeenCalledWith(key, eventHandlers[key]);
      });
    });
  });

  describe('reconnect', () => {
    it('should attempt to reconnect the WebSocket connection', () => {
      const removeListener = jest.spyOn(WebSocket.prototype, 'removeEventListener');
      connect(ws, url, eventHandlers, readyStateSubs);
      ws.current?.close();
      reconnect(ws, url, eventHandlers, readyStateSubs);

      setTimeout(() => expect(removeListener).toHaveBeenCalled(), 0); // wait for the listeners to be removed
    });

    it('should not reconnect if the WebSocket connection is not closed', () => {
      const removeListener = jest.spyOn(WebSocket.prototype, 'removeEventListener');
      connect(ws, url, eventHandlers, readyStateSubs);
      reconnect(ws, url, eventHandlers, readyStateSubs);

      expect(removeListener).not.toHaveBeenCalled();
    });
  });

  describe('kill', () => {
    it('should dispose the WebSocket connection', () => {
      ws.current = new WebSocket('ws://localhost:8080');
      kill(ws);

      expect(ws.current).toBeNull();
    });
  });
});
