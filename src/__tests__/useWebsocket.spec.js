import { renderHook, act } from '@testing-library/react-hooks';
import net from 'net';
import { WebSocketServer } from 'ws';
import useWebsocket from '..';
import { CONNECTION_STATES, ERRORS } from '../constants';

const { CONNECTING, OPEN } = CONNECTION_STATES;
const { RECONNECT_LIMIT_EXCEEDED, WS_SUPPORTED } = ERRORS;

const portResolver = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.on('error', reject);
  server.listen(0, () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

let port;
let testUrl;

beforeAll(async () => {
  port = await portResolver();
  testUrl = `ws://localhost:${port}/`;
});

const logger = {
  error: jest.fn(),
  warn: jest.fn()
};

let wss;
let ws;
let error;

// client events
const onError = jest.fn((err) => { error = err; });
const onOpen = jest.fn();
const onClose = jest.fn();
const onMessage = jest.fn();
const onSend = jest.fn();

// server events
const onServerMessage = jest.fn();
const onServerConnect = jest.fn();

const startServer = () => {
  wss = new WebSocketServer({ port });
  wss.on('connection', (socket) => {
    ws = socket;
    ws.on('message', (msg) => onServerMessage(msg));
    onServerConnect(ws);
  });
};

const closeConnections = () => wss.clients.forEach((socket) => socket.close());

const defaultOptions = {
  onError,
  logger,
  onOpen,
  onClose,
  onMessage,
  onSend,
  reconnectWait: 100
};

afterEach(() => {
  error = undefined;

  onError.mockReset();
  onOpen.mockReset();
  onClose.mockReset();
  onMessage.mockReset();
  onSend.mockReset();

  onServerConnect.mockReset();
  onServerMessage.mockReset();

  logger.error.mockReset();
  logger.warn.mockReset();

  if (wss) wss.close();
});

describe('invocation', () => {
  it('fails when websockets are unavailable', () => {
    const { WebSocket } = global;
    delete global.WebSocket;
    renderHook(() => useWebsocket(testUrl, defaultOptions));
    expect(logger.warn).toHaveBeenCalledWith(WS_SUPPORTED);
    global.WebSocket = WebSocket;
  });

  it('fails when unable to connect with basic options', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useWebsocket(testUrl, defaultOptions)
    );

    const [,, { readyState, url }] = result.current;
    expect(readyState).toEqual(CONNECTING);
    expect(url).toEqual(testUrl);
    expect(error).toBeUndefined();

    await waitForNextUpdate();
    expect(logger.error).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('connects with basic options', async () => {
    startServer();

    const { waitForNextUpdate } = renderHook(() => useWebsocket(testUrl, defaultOptions));
    await waitForNextUpdate();

    expect(error).toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    expect(onServerConnect).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('connections', () => {
  it('reconnects when disconnected', async () => {
    startServer();

    const { result, waitFor, waitForNextUpdate } = renderHook(
      () => useWebsocket(testUrl, defaultOptions)
    );
    await waitForNextUpdate();
    const [,, { readyState }] = result.current;

    closeConnections();
    await waitForNextUpdate();

    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(2));
    expect(readyState).toEqual(OPEN);
    expect(onServerConnect).toHaveBeenCalledTimes(2);
  });

  it('reconnect attempts are delayed according to reconnectWait', async () => {
    const reconnectWait = 250;
    startServer();

    const onReconnect = jest.fn();
    const { waitFor, waitForNextUpdate } = renderHook(
      () => useWebsocket(testUrl, {
        ...defaultOptions, reconnectAttempts: 2, reconnectWait, onReconnect
      })
    );
    await waitForNextUpdate();

    wss.close();
    closeConnections();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const disconnected = Date.now();

    await waitFor(() => expect(logger.warn).toHaveBeenCalledWith(RECONNECT_LIMIT_EXCEEDED));
    expect(Date.now() - disconnected).toBeGreaterThanOrEqual(reconnectWait);
  });
});

describe('sending', () => {
  it('receives a text message sent through the hook on the server', async () => {
    startServer();

    const { result, waitFor, waitForNextUpdate } = renderHook(
      () => useWebsocket(testUrl, defaultOptions)
    );
    await waitForNextUpdate();
    const [send] = result.current;

    const message = 'a string message';
    act(() => {
      send(message);
    });

    await waitFor(() => expect(onSend).toHaveBeenCalledWith(message));
    await waitFor(() => expect(onServerMessage).toHaveBeenCalledWith(Buffer.from(message)));
  });

  it('receives queued messages sent through the hook on the server after connecting', async () => {
    const { result, waitFor, waitForNextUpdate } = renderHook(
      () => useWebsocket(testUrl, defaultOptions)
    );
    await waitForNextUpdate();
    const [send] = result.current;

    const messages = ['first', 'second', 'third'];
    act(() => {
      messages.forEach((message) => send(message));
      startServer();
    });

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(onServerMessage).toHaveBeenCalledTimes(3));
    messages.forEach(
      (message) => expect(onServerMessage).toHaveBeenCalledWith(Buffer.from(message))
    );
  });
});

describe('receiving', () => {
  it('receives a message sent through the server on the client through the hook', async () => {
    startServer();

    const { result, waitFor, waitForNextUpdate } = renderHook(
      () => useWebsocket(testUrl, defaultOptions)
    );
    await waitForNextUpdate();

    const message = 'a string message';
    act(() => {
      ws.send(message);
    });

    await waitFor(() => expect(onMessage).toHaveBeenCalledWith(message, expect.any(Object)));
    const [, received] = result.current;
    expect(received).toEqual(message);
  });
});
