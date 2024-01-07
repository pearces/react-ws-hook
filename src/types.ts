export type Message = string | ArrayBuffer | Blob | ArrayBufferView | DataView;

export type MessageData = string | ArrayBuffer | Blob;

export type Logger = Pick<Console, 'error' | 'warn'>;

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

export interface Handlers {
  message: (event: Event | MessageEvent) => void;
  open: (event: Event) => void;
  close: (event: Event) => void;
  error: (error: Event) => void;
  [key: string]: (event: Event | MessageEvent) => void;
}

export type ReadyStates = Pick<WebSocket, 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'>;

export type ReadyState = keyof ReadyStates;

export type ReadyStateValue = ReadyStates[keyof ReadyStates];

export interface WebSocketResult {
  send: (message: Message) => void;
  received: MessageData | null;
  readyState: ReadyState;
  url: string | URL;
}
