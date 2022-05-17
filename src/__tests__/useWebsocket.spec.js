import { renderHook } from '@testing-library/react-hooks';
import net from 'net';
import { WebSocketServer } from 'ws';
import useWebsocket from '..';
import { CONNECTION_STATES, ERRORS } from '../constants';

const { CONNECTING, OPEN } = CONNECTION_STATES;
const { RECONNECT_LIMIT_EXCEEDED } = ERRORS;

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
let error;

const onError = jest.fn((err) => { error = err; });
const onConnect = jest.fn();
const onOpen = jest.fn();
const onClose = jest.fn();

const startServer = () => {
  wss = new WebSocketServer({ port });
  wss.on('connection', onConnect);
};

const closeConnections = () => wss.clients.forEach((ws) => ws.close());

const defaultOptions = {
  onError,
  logger,
  onOpen,
  onClose,
  reconnectWait: 100
};

afterEach(() => {
  error = undefined;

  onError.mockReset();
  onConnect.mockReset();
  onOpen.mockReset();
  onClose.mockReset();

  logger.error.mockReset();
  logger.warn.mockReset();

  if (wss) wss.close();
});

describe('invocation', () => {
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

    expect(onConnect).toHaveBeenCalled();
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
    expect(onConnect).toHaveBeenCalledTimes(2);
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
