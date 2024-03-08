import { WebSocketOptions, ReadyStates, HandlerEvents } from './types';

/**  Represents the ready states for a WebSocket connection. */
export const READY_STATES: ReadyStates = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
} as const;

/** Error messages used in the hook. */
export const ERRORS = {
  WS_UNSUPPORTED:
    'Global WebSocket object not supported or unavailable, not running useWebsocket hook',
  RECONNECT_LIMIT_EXCEEDED: 'Reconnect attempt limit exceeded',
  SEND_ERROR: 'Failed to send message'
} as const;

/** Default options for useWebsocket hook. */
export const DEFAULT_OPTIONS: WebSocketOptions = {
  reconnect: true,
  reconnectWait: 2000,
  reconnectAttempts: Infinity,
  retrySend: true,
  logger: console
} as const;

/** WebSocket actions. */
export const ACTIONS = {
  CONNECTING: 'connecting',
  SENDING: 'sending',
  DISCONNECTING: 'disconnecting'
} as const;

/** Represents the possible WebSocket event types. */
export const HANDLER_EVENTS: Array<HandlerEvents> = ['open', 'close', 'error', 'message'];
