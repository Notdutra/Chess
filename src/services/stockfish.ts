// DEPRECATED: Local Stockfish engine - replaced by chess-api.com
// This service is disabled as part of migration to remote engine

/*
const stockfish = new Worker('stockfish.js');

stockfish.onmessage = function (event: MessageEvent) {
  // ...existing code...
};

export function sendCommand(command: string): void {
  stockfish.postMessage(command);
}

export function getBestMove(
  fen: string,
  callback: (move: string) => void
): void {
  stockfish.onmessage = function (event: MessageEvent) {
    if (typeof event.data === 'string' && event.data.startsWith('bestmove')) {
      callback(event.data.split(' ')[1]);
    }
  };
  stockfish.postMessage(`position fen ${fen}`);
  stockfish.postMessage('go movetime 1000');
}
*/

// Placeholder functions for compatibility
export function sendCommand(command: string): void {
  console.warn(
    'Local Stockfish is disabled. Use chess-api.com service instead.'
  );
}

export function getBestMove(
  fen: string,
  callback: (move: string) => void
): void {
  console.warn(
    'Local Stockfish is disabled. Use chess-api.com service instead.'
  );
}
