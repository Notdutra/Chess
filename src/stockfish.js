
const stockfish = new Worker('stockfish.js');

stockfish.onmessage = function (event) {
    console.log(event.data);
};

export function sendCommand(command) {
    stockfish.postMessage(command);
}

export function getBestMove(fen, callback) {
    stockfish.onmessage = function (event) {
        if (event.data.startsWith('bestmove')) {
            callback(event.data.split(' ')[1]);
        }
    };
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage('go movetime 1000');
}