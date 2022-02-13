import { renderHook } from '@testing-library/react-hooks';
import useWebsocket from '../useWebsocket';
import { CONNECTION_STATES } from '../constants';

const { CONNECTING } = CONNECTION_STATES;

describe('invocation', () => {
  const logger = {
    error: jest.fn(),
    warn: jest.fn()
  };

  it('fails when unable to connect with basic options', async () => {
    let error;
    const onError = (err) => { error = err; };
    const testUrl = 'ws://localhost:8888/';
    const { result, waitForNextUpdate } = renderHook(
      () => useWebsocket(testUrl, { onError, logger })
    );

    const [,, { readyState, url }] = result.current;
    expect(readyState).toEqual(CONNECTING);
    expect(url).toEqual(testUrl);
    expect(error).toBeUndefined();

    await waitForNextUpdate();
    expect(logger.error).toHaveBeenCalled();
    expect(error).not.toBeUndefined();
  });
});
