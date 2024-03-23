import { ACTIONS } from './constants';

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

/** Represents a logger object with error and warn methods. */
export type Logger = Pick<Console, 'error' | 'warn'>;

/** Represents the options for configuring a WebSocket connection. */
export interface WebSocketOptions {
  /** The time to wait (in milliseconds) before attempting to reconnect after a disconnect. */
  reconnectWait?: number;

  /** The maximum number of attempts to reconnect. */
  reconnectAttempts?: number;

  /** Indicates whether the hook will automatically reconnect after being disconnected. */
  reconnect?: boolean;

  /** Indicates whether to retry sending a message if the WebSocket connection is not open. */
  retrySend?: boolean;

  /**
   * A callback function that will be called before sending a message.
   * @param message The message to be sent.
   */
  onSend?: (message: Message) => void;

  /**
   * A callback function that will be called when a message is received.
   * @param data The parsed message data.
   * @param event The original WebSocket event or MessageEvent.
   */
  onMessage?: (data: MessageData, event: Event | MessageEvent) => void;

  /**
   * A callback function that will be called when the WebSocket connection is opened.
   * @param event The WebSocket event.
   */
  onOpen?: (event: Event) => void;

  /**
   * A callback function that will be called when the WebSocket connection is closed.
   * @param event The WebSocket event.
   */
  onClose?: (event: Event) => void;

  /**
   * A callback function that will be called when an error occurs in the WebSocket connection.
   * @param error The WebSocket error event.
   */
  onError?: (error: Event) => void;

  /** A logger instance or console object to use for logging WebSocket events and errors. */
  logger?: Logger | Console;
}

/** Represents the final WebSocket options after merging with the default options. */
export type FinalWebSocketOptions = WebSocketOptions &
  Required<Omit<WebSocketOptions, 'onSend' | 'onMessage' | 'onOpen' | 'onClose' | 'onError'>>;

/** Represents an object that binds and unbinds event listeners to a WebSocket. */
export type EventListenerBindAction = Pick<WebSocket, 'addEventListener' | 'removeEventListener'>;

/** Represents a collection of event handlers for a WebSocket connection. */
export interface Handlers {
  /**
   * Handles the 'message' event.
   * @param event The event object representing the 'message' event.
   */
  message?: (event: Event | MessageEvent) => void;

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
}

/** Represents the possible ready states of a WebSocket connection. */
export type ReadyStates = Pick<WebSocket, 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'>;

/** Represents a ready state of a WebSocket connection. */
export type ReadyState = keyof ReadyStates;

/** Represents the value of the ready state. */
export type ReadyStateValue = ReadyStates[keyof ReadyStates];

/** Represents the result of the useWebsocket hook. */
export interface WebSocketResult {
  /**
   * Sends a message through the WebSocket connection.
   * @param message The message to send.
   */
  send: (message: Message) => void;

  /** The last received message data, or null if no message has been received yet. */
  received: MessageData | null;

  /** The current state of the WebSocket connection. */
  readyState: ReadyState;

  /** The URL of the WebSocket connection. */
  url: string | URL;
}

/**
 * Represents the union of WebSocket event types and the keys of the `Handlers` object.
 * @template Handlers - The type of the WebSocket event handlers.
 */
export type HandlerEvents = keyof WebSocketEventMap & keyof Handlers;

/** Represents the possible WebSocket event types. */
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

/** Represents the resulting state of the WebSocket wrapper instance */
export type WebSocketWrapperResult = {
  /** The current WebSocket */
  ws?: WebSocket;

  /** Subscribes to the ready state of the WebSocket connection. */
  readyStateSubscribe: (callback: (event?: Event) => void) => void;

  /** Unsubscribes from the ready state of the WebSocket connection. */
  readyStateUnsubscribe: (callback: (event?: Event) => void) => void;

  /** Returns the current ready state of the WebSocket connection. */
  getReadyState: () => ReadyStateValue;

  /** Reconnects to the WebSocket server. */
  reconnect: () => void;

  /** Disables all event listeners on the WebSocket instance. */
  disableAllListeners: () => void;

  /** Terminates the current WebSocket */
  kill: () => void;
};
