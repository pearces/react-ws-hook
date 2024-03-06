# react-ws-hook

A custom React hook to communicate over WebSockets.

## Installation

To install the `react-ws-hook` package you first need to get an access token and add it to your `.npmrc` to use the GitHub npm registry [following these instructions](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

Then you can install the package using npm or yarn:

```shell
npm install @pearces/react-ws-hook@latest
```

Or:

```shell
yarn add @pearces/react-ws-hook@latest
```

## Dependencies

This package has the following dependencies: `React` `18.2.0` or later.

## Usage

First import the hook:

```javascript
import React from 'react';
import useWebsocket from '@pearces/react-ws-hook';
```

Then reference it in your component:

```javascript
const { sendMessage, lastMessage, readyState } = useWebsocket('ws://localhost:8080');
```

You can then use the `sendMessage` function to send messages to the server, and the `lastMessage` and `readyState` variables to read the last message received and the current state of the WebSocket connection.

## API Reference

### `useWebsocket(url: string | URL, options?: WebSocketOptions): WebSocketResult`

#### `url`

The WebSocket ws or wss URL of the server you want to connect to.

#### `WebSocketOptions`

An optional object containing the following properties:

- `reconnect` - A boolean value to determine if the hook should attempt to reconnect to the server if the connect is lost. Default is `true`.
- `reconnectWait` - The interval in milliseconds to wait before attempting to reconnect to the server. Default is 2000.
- `reconnectAttempts` - The number of times to attempt to reconnect to the server. Default is `Infinity`.
- retrySend - A boolean value to determine if the hook should attempt to resend messages that were sent while the WebSocket connection was not open. Default is `true`.
- `onOpen` - A handler function that is called when the WebSocket connection is opened. It is passed the open `event` object.
- `onClose` - A handler function handler that is called when the WebSocket connection is closed. It is passed the close `event` object.
- `onError` - A handler function that is called when an error occurs with the WebSocket connection. It is passed the error `event` object.
- `onMessage` - A handler function that is called when a message is received from the server. It is passed the message `event` that contains an `Event` or `MessageEvent` object.
- `onSend` - A handler function that is called when a message is sent to the server. It is passed a `message` that is a `string`, `ArrayBuffer`, `ArrayBufferView`, `Blob`, or `FormData` object.
- `logger` - An object that is called with log messages with `warn` and `error` methods. Defaults to `console`.

#### `WebSocketResult`

The result of the `useWebsocket` hook is an object containing the following properties:

- `sendMessage` - A function that sends a message to the server. It takes a single `string` argument that is the message to send.
- `lastMessage` - The last message received from the server. It is `null` if no message has been received, otherwise it is a `string`, `ArrayBuffer`, `ArrayBufferView`, `Blob`, or `FormData` object.
- `readyState` - The current state of the WebSocket connection. It is one of the following values: `CONNECTING`, `OPEN`, `CLOSING`, or `CLOSED`.
- `url` - The URL of the WebSocket server for the current connection.

## Contributing

Contributions to this project are welcome! Here are the steps to get started:

1. Fork the repository.
2. Clone your fork.
3. Make your changes.
4. Run the tests with `npm run test` to make sure they pass.
5. Submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
