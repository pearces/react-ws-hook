import net from 'net';
import { renderHook, act, waitFor } from '@testing-library/react';
import WebSocket, { Server } from 'ws';
import { IncomingMessage } from 'http';
import useWebsocket from '..';
import { ERRORS } from '../constants';
import { Logger, WebSocketOptions } from '../types';

const CONNECTING = 'CONNECTING';
const OPEN = 'OPEN';

// this is needed to include the WebSocketServer type from the jest global config
type CustomGlobal = typeof globalThis & { WebSocketServer: typeof Server };

const { RECONNECT_LIMIT_EXCEEDED, WS_UNSUPPORTED } = ERRORS;
const { WebSocketServer } = global as CustomGlobal;

const portResolver = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });

let port: number;
let testUrl: string | URL;

beforeAll(async () => {
  port = await portResolver();
  testUrl = `ws://localhost:${port}/`;
});

const logger: Logger = {
  error: jest.fn(),
  warn: jest.fn()
};

let wss: Server<typeof WebSocket, typeof IncomingMessage>;
let ws: WebSocket;
let error: Event | undefined;

// client events
const onError = jest.fn((err: Event) => {
  error = err;
});
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
    ws.on('message', (msg) => onServerMessage(msg)); // eslint-disable-line @typescript-eslint/no-unsafe-return
    onServerConnect(ws);
  });
};

const closeConnections = () => wss.clients.forEach((socket) => socket.close());

const defaultOptions: WebSocketOptions = {
  onError,
  logger,
  onOpen,
  onClose,
  onMessage,
  onSend,
  reconnectWait: 150
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

  (logger.error as jest.Mock).mockReset();
  (logger.warn as jest.Mock).mockReset();

  if (wss) wss.close();
});

describe('invocation', () => {
  it('fails when websockets are unavailable', () => {
    const originalWebSocket = global.WebSocket;
    delete (global as Partial<CustomGlobal>).WebSocket;
    renderHook(() => useWebsocket(testUrl, defaultOptions));
    expect(logger.warn).toHaveBeenCalledWith(WS_UNSUPPORTED);
    global.WebSocket = originalWebSocket;
  });

  it('connects with basic options', async () => {
    startServer();

    renderHook(() => useWebsocket(testUrl, defaultOptions));
    await waitFor(() => expect(onOpen).toHaveBeenCalled());

    expect(error).toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    expect(onServerConnect).toHaveBeenCalled();
  });

  it('fails when unable to connect with basic options', async () => {
    const { result } = renderHook(() =>
      useWebsocket(testUrl, { ...defaultOptions, reconnect: false })
    );

    const { readyState, url } = result.current;
    expect(readyState).toEqual(CONNECTING);
    expect(url).toEqual(testUrl);
    expect(error).toBeUndefined();

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('connections', () => {
  const reconnectWait = 250;
  it('reconnects when disconnected', async () => {
    startServer();

    const { result } = renderHook(() =>
      useWebsocket(testUrl, { ...defaultOptions, reconnectWait })
    );

    await waitFor(() => expect(onOpen).toHaveBeenCalled());

    closeConnections();

    await waitFor(() => expect(onClose).toHaveBeenCalled());

    await waitFor(() => expect(onServerConnect).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(2));
    const { readyState } = result.current;
    await waitFor(() => expect(readyState).toEqual(OPEN), { timeout: 2000 });
  });

  it('reconnect attempts are delayed according to reconnectWait', async () => {
    startServer();

    renderHook(() =>
      useWebsocket(testUrl, {
        ...defaultOptions,
        reconnectAttempts: 2,
        reconnectWait
      })
    );
    await waitFor(() => expect(onOpen).toHaveBeenCalled());

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

    const { result } = renderHook(() => useWebsocket(testUrl, defaultOptions));
    const { send } = result.current;

    await waitFor(() => expect(onOpen).toHaveBeenCalled());

    const message = 'a string message';
    act(() => {
      send(message);
    });

    await waitFor(() => expect(onSend).toHaveBeenCalledWith(message));
    await waitFor(() => expect(onServerMessage).toHaveBeenCalledWith(Buffer.from(message)));
  });

  it('receives queued messages sent through the hook on the server after connecting', async () => {
    const { result } = renderHook(() => useWebsocket(testUrl, defaultOptions));
    const { send } = result.current;

    const messages = ['first', 'second', 'third'];
    act(() => {
      messages.forEach((message) => send(message));
      startServer();
    });

    await waitFor(() => expect(onOpen).toHaveBeenCalled());
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(onServerMessage).toHaveBeenCalledTimes(3));
    messages.forEach((message) =>
      expect(onServerMessage).toHaveBeenCalledWith(Buffer.from(message))
    );
  });
});

describe('receiving', () => {
  it('receives a message sent through the server on the client through the hook', async () => {
    startServer();

    const { result } = renderHook(() => useWebsocket(testUrl, defaultOptions));
    await waitFor(() => expect(onOpen).toHaveBeenCalled());

    const message = 'a string message';
    act(() => {
      ws.send(message);
    });

    await waitFor(() => expect(onMessage).toHaveBeenCalledWith(message, expect.any(Object)));
    await waitFor(() => expect(result.current.received).toEqual(message));
  });
});
