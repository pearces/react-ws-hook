export const CONNECTION_STATES = {
  CONNECTING: 'CONNECTING',
  OPEN: 'OPEN',
  CONNECTION: 'CLOSING',
  CLOSED: 'CLOSED'
};

export const READY_STATES = [
  CONNECTION_STATES.CONNECTING,
  CONNECTION_STATES.OPEN,
  CONNECTION_STATES.CLOSING,
  CONNECTION_STATES.CLOSED
];

export const ERRORS = {
  WS_UNSUPPORTED:
    'Global WebSocket object not supported or unavailable, not running useWebsocket hook',
  RECONNECT_LIMIT_EXCEEDED: 'Reconnect attempt limit exceeded',
  SEND_ERROR: 'Failed to send message'
};

export const DEFAULT_OPTIONS = {
  reconnect: true,
  reconnectWait: 2000,
  reconnectAttempts: Infinity,
  retrySend: true,
  logger: console
};

export const ACTIONS = {
  CONNECTING: 'connecting',
  SENDING: 'sending',
  DISCONNECTING: 'disconnecting'
};
