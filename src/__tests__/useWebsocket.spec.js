import { renderHook } from '@testing-library/react-hooks';
import net from 'net';
import { WebSocketServer } from 'ws';
import useWebsocket from '..';
import { CONNECTION_STATES } from '../constants';

const { CONNECTING } = CONNECTION_STATES;

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

const startServer = () => {
  wss = new WebSocketServer({ port });
  wss.on('connection', onConnect);
};

const defaultOptions = { onError, logger, onOpen };

afterEach(() => {
  error = undefined;

  onError.mockReset();
  onConnect.mockReset();
  onOpen.mockReset();

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

    const { waitForNextUpdate } = renderHook(
      () => useWebsocket(testUrl, defaultOptions)
    );

    await waitForNextUpdate();

    expect(error).toBeUndefined();
    expect(logger.error).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    expect(onConnect).toHaveBeenCalled();
    expect(onOpen).toHaveBeenCalled();
  });
});
