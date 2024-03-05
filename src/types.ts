/**
 * Represents a message that can be sent over a WebSocket connection.
 * It can be a string, ArrayBuffer, Blob, ArrayBufferView, or DataView.
 */
export type Message = string | ArrayBuffer | Blob | ArrayBufferView | DataView;

/**
 * Represents the data type that can be sent as a message.
 * It can be a string, an ArrayBuffer, or a Blob.
 */
export type MessageData = string | ArrayBuffer | Blob;

/**
 * Represents a logger object with error and warn methods.
 */
export type Logger = Pick<Console, 'error' | 'warn'>;

/**
 * Represents the options for configuring a WebSocket connection.
 */
export interface WebSocketOptions {
  reconnectWait?: number;
  reconnectAttempts?: number;
  reconnect?: boolean;
  retrySend?: boolean;
  onSend?: (message: Message) => void;
  onMessage?: (data: MessageData, event: Event | MessageEvent) => void;
  onOpen?: (event: Event) => void;
  onClose?: (event: Event) => void;
  onError?: (error: Event) => void;
  logger?: Logger | Console;
}

/**
 * Represents a collection of event handlers for a WebSocket connection.
 */
export interface Handlers {
  /**
   * Handles the 'message' event.
   * @param event The event object representing the 'message' event.
   */
  message: (event: Event | MessageEvent) => void;

  /**
   * Handles the 'open' event.
   * @param event The event object representing the 'open' event.
   */
  open: (event: Event) => void;

  /**
   * Handles the 'close' event.
   * @param event The event object representing the 'close' event.
   */
  close: (event: Event) => void;

  /**
   * Handles the 'error' event.
   * @param error The event object representing the 'error' event.
   */
  error: (error: Event) => void;

  /**
   * Handles any other event not explicitly defined.
   * @param event The event object representing the event.
   */
  [key: string]: (event: Event | MessageEvent) => void;
}

/**
 * Represents the possible ready states of a WebSocket connection.
 */
export type ReadyStates = Pick<WebSocket, 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'>;

/**
 * Represents a ready state of a WebSocket connection.
 */
export type ReadyState = keyof ReadyStates;

/**
 * Represents the value of the ready state.
 */
export type ReadyStateValue = ReadyStates[keyof ReadyStates];

/**
 * Represents the result of the useWebsocket hook.
 */
export interface WebSocketResult {
  send: (message: Message) => void;
  received: MessageData | null;
  readyState: ReadyState;
  url: string | URL;
}
