You're absolutely right - I've been massively overcomplicating this! Let me implement the simple chess.com approach:

## Simple Chess.com Premove System

Here's how it should work:

1. **Queue**: Just a simple array of `{from, to}` moves
2. **Preview**: Apply all queued moves to a temp board, show that board state
3. **Validation**: When opponent moves, check if first queued move is legal
4. **Execute or Clear**: If legal, execute it and continue. If not, clear entire queue.

The key insight is that we don't need complex preview position tracking, interim states, or incremental building. We just:

- Keep the real board state in the engine
- Show a temp board state in the UI (real board + all queued premoves applied)
- When opponent moves, validate against the real board, not the temp board

This is much simpler and more robust. The current system is trying to track partial states and preview positions which is unnecessary complexity.

Would you like me to implement this simple approach? It would involve:

1. Replacing the complex `premoveQueueRef` with simple `{from, to}[]`
2. Removing all the preview position tracking logic
3. Adding a simple `updatePremovePreview()` that applies all moves to temp engine
4. Simplifying `processPremoveQueue()` to just check first move legality
5. Updating piece selection to check the displayed temp board state

This would be much cleaner and match how chess.com actually works.
