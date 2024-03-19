// import WebSocket from 'ws';
import websocketWrapper from '../websocketWrapper';
import { Handlers, WebSocketWrapperResult } from '../types';

describe('websocketWrapper', () => {
  let mockWebSocket: WebSocket;
  let mockUrl: string;
  let mockEventHandlers: Handlers;
  let result: WebSocketWrapperResult;

  beforeEach(() => {
    mockWebSocket = new WebSocket('ws://localhost:8080');
    jest.spyOn(mockWebSocket, 'addEventListener');
    jest.spyOn(mockWebSocket, 'removeEventListener');

    mockUrl = 'ws://localhost:8080';
    mockEventHandlers = {
      open: jest.fn(),
      close: jest.fn(),
      message: jest.fn(),
      error: jest.fn()
    };

    jest.spyOn(global, 'WebSocket').mockImplementation(() => mockWebSocket);

    result = websocketWrapper(mockUrl, mockEventHandlers);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create a new WebSocket instance with the provided URL', () => {
    expect(global.WebSocket).toHaveBeenCalledWith(mockUrl);
  });

  it('should add event listeners to the WebSocket instance', () => {
    expect(mockWebSocket.addEventListener).toHaveBeenCalledTimes(4);
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', mockEventHandlers.open);
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('close', mockEventHandlers.close);
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith(
      'message',
      mockEventHandlers.message
    );
    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('error', mockEventHandlers.error);
  });

  it('should remove event listeners from the WebSocket instance', () => {
    result.disableAllListeners();

    expect(mockWebSocket.removeEventListener).toHaveBeenCalledTimes(4);
    expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith('open', mockEventHandlers.open);
    expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith(
      'close',
      mockEventHandlers.close
    );
    expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith(
      'message',
      mockEventHandlers.message
    );
    expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith(
      'error',
      mockEventHandlers.error
    );
  });

  it('should subscribe to the ready state of the WebSocket connection', () => {
    const callback = jest.fn();
    result.readyStateSubscribe(callback);

    expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('open', callback);
  });

  it('should unsubscribe from the ready state of the WebSocket connection', () => {
    const callback = jest.fn();
    result.readyStateSubscribe(callback);
    result.readyStateUnsubscribe(callback);

    expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith('open', callback);
  });

  it('should return the current ready state of the WebSocket connection', () => {
    const readyState = result.getReadyState();

    expect(readyState).toBe(mockWebSocket.readyState);
  });

  it('should reconnect the WebSocket connection', () => {
    result.reconnect();

    expect(global.WebSocket).toHaveBeenCalledWith(mockUrl);
    expect(mockWebSocket.addEventListener).toHaveBeenCalledTimes(4);
  });
});
