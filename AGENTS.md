# AGENTS.md

This document provides guidance for AI agents working on the `react-ws-hook` repository.

## Repository Overview

**Description:** A custom React hook to communicate over WebSockets

**Language Composition:**
- TypeScript: 97.4%
- JavaScript: 2.6%

This is a specialized React hook library for WebSocket communication, written almost entirely in TypeScript. It provides a clean, React-idiomatic way to integrate WebSocket functionality into React applications.

## Key Concepts

### React Hooks Architecture
- Custom hook for managing WebSocket connections
- Follows React hooks conventions and best practices
- Manages lifecycle and side effects using standard hook patterns
- Likely uses `useEffect`, `useState`, `useCallback`, etc.

### WebSocket Communication
- Real-time bidirectional communication between client and server
- Connection lifecycle management (connect, disconnect, reconnect)
- Message sending and receiving
- Connection state tracking (connecting, connected, disconnected, error states)

### Type Safety
- 97.4% TypeScript codebase
- Strong type definitions for WebSocket messages and events
- Generic types for flexible message payload handling
- TypeScript configuration should be strict

## Common Tasks

### Working with the Hook API
- Understand the hook's public interface and parameters
- Review how the hook manages connection state
- Check message event handling and callbacks
- Validate proper cleanup and connection termination

### WebSocket Connection Management
- Connection initialization and configuration
- Automatic reconnection logic (if implemented)
- Connection state updates and listeners
- Error handling and recovery strategies
- Proper cleanup on component unmount

### Message Handling
- Sending messages over the WebSocket connection
- Receiving and dispatching messages
- Message queuing (if not connected)
- Handling different message types
- Serialization/deserialization logic

### Type Definitions
- Define types for message payloads
- Create interfaces for hook options and return values
- Type WebSocket event handlers
- Support generic message types for flexibility

## Hook Interface Considerations

When working on this hook:
- Review the hook's parameter interface (URL, options, callbacks)
- Check the return value structure (connection state, send function, etc.)
- Validate hook dependencies and effect cleanup
- Ensure proper handling of connection state changes
- Test message delivery and error scenarios

## Common Pitfalls to Avoid

1. **Memory Leaks:** Ensure WebSocket connections are properly closed on unmount
2. **Stale Closures:** Use proper dependencies in `useEffect` to avoid referencing old state/props
3. **Race Conditions:** Handle rapid connect/disconnect cycles correctly
4. **Message Ordering:** Ensure messages aren't lost if connection drops
5. **Reconnection Loops:** Prevent infinite reconnection attempts on permanent failures
6. **Type Safety:** Don't use `any` for message types—leverage generics
7. **Error Handling:** Provide clear error states and recovery mechanisms

## Code Structure

When exploring this repository:
- Identify the main hook implementation file
- Look for type definitions (interfaces, types for messages and options)
- Check for utility functions (connection logic, message handling, etc.)
- Review any provider components (if context-based approach)
- Find tests and examples demonstrating hook usage
- Check for TypeScript configuration strictness

## Testing Considerations

- Unit tests for hook behavior with mock WebSocket connections
- Test connection lifecycle (connect, disconnect, reconnect)
- Verify message sending and receiving
- Test error states and recovery
- Validate proper cleanup on unmount
- Test with real WebSocket connections (integration tests)
- Consider testing with different message payloads

## Test Validation Commands

Before committing changes, run these validation commands:

```bash
# Type checking - Validate TypeScript compilation and type safety
npm run typecheck

# Linting - Check code quality and style compliance
npm run lint

# Testing - Run all unit and integration tests
npm run test
```

**All commands must pass before submitting a pull request.** These commands verify:
- **typecheck:** No TypeScript errors, proper type usage throughout the codebase
- **lint:** Code style compliance, potential issues, and best practices
- **test:** All functionality works as expected, no regressions introduced

## API Design Focus

When reviewing the hook implementation:
- **Simplicity:** API should be easy to understand and use
- **Flexibility:** Support different message types and configurations
- **Error Handling:** Clear error states and callbacks
- **Performance:** Avoid unnecessary re-renders
- **Memory Safety:** No leaks on mount/unmount
- **Type Safety:** Full TypeScript support with proper generics

## Usage Patterns

Typical usage would involve:
```typescript
const { state, send, connect, disconnect } = useWebSocket(url, options);
```

Consider:
- How connection state is exposed to consumers
- How messages are sent and received
- What lifecycle events are available
- How errors are communicated
- Whether automatic reconnection is handled

## Code Review Focus Areas

When reviewing PRs:
- Verify WebSocket lifecycle is properly managed
- Check for memory leaks (connection cleanup)
- Validate error handling and edge cases
- Ensure TypeScript types are correct and strict
- Test actual WebSocket communication
- Verify hook doesn't cause excessive re-renders
- Check backward compatibility for API changes
- Confirm all validation commands pass (`npm run typecheck`, `npm run lint`, `npm run test`)

## Common Use Cases

This hook is designed for:
- Real-time notifications and updates
- Live chat and messaging applications
- Collaborative editing tools
- Live data streaming
- Server push notifications
- Bi-directional communication with backends

## Dependencies and Integration

- Core dependency: React (hooks API)
- WebSocket API (browser native or polyfill)
- TypeScript for type definitions
- Testing libraries (Jest, React Testing Library, etc.)
- Optional: Mock WebSocket libraries for testing

## Performance Considerations

- Minimize re-renders when connection state changes
- Efficiently handle high-frequency message flows
- Proper debouncing/throttling if needed
- Memory efficiency with long-lived connections
- Battery/network efficiency for mobile clients

## Resources

- **React Hooks Documentation:** https://react.dev/reference/react/hooks
- **WebSocket API:** https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- **Custom Hooks Best Practices:** Building reusable hooks
- **TypeScript Generics:** For flexible message type handling

## Getting Started with Development

1. Review the main hook implementation file
2. Understand the WebSocket connection lifecycle
3. Check the type definitions for messages and options
4. Look at existing tests and examples
5. Verify TypeScript configuration is properly set up
6. Test the hook with a local WebSocket server
7. Run validation commands: `npm run typecheck`, `npm run lint`, `npm run test`

---

**Last Updated:** 2026-08-23

*This guide helps agents understand the WebSocket hook implementation and requirements for contributing to this React hook library.*
