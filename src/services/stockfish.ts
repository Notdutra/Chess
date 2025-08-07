const stockfish = new Worker('stockfish.js');

stockfish.onmessage = function (event: MessageEvent) {
  console.log(event.data);
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
