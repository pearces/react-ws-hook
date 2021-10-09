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
  WS_UNSUPPORTED: 'Global WebSocket object not supported or unavailable, not running useWebsocket hook'
};

export const DEFAULT_OPTIONS = {
  reconnect: true,
  reconnectWait: 2000
};
