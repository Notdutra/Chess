import js from "@eslint/js";

const boardLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

let squareLetter;
let squareNumber;
let player;

var whiteKingInCheck;
var blackKingInCheck;
var checkmate;
var stalemate;
var winner;

const directionLetterBy = (direction, num) => {
    const index = boardLetters.indexOf(squareLetter) + direction * num;
    return boardLetters[index] || null;
};

const directionNumberBy = (direction, num) => {
    const newNumber = squareNumber + direction * num;
    return newNumber >= 1 && newNumber <= 8 ? newNumber : null;
};

export function createStartingPositionBoardArray() {
    return [
        ['BR1', 'BN1', 'BB1', 'BQ', 'BK', 'BB2', 'BN2', 'BR2'],
        ['BP1', 'BP2', 'BP3', 'BP4', 'BP5', 'BP6', 'BP7', 'BP8'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['WP1', 'WP2', 'WP3', 'WP4', 'WP5', 'WP6', 'WP7', 'WP8'],
        ['WR1', 'WN1', 'WB1', 'WQ', 'WK', 'WB2', 'WN2', 'WR2']
    ];
}

let possibleMoves = [];
let logOfMoves = [];


export function handleSquareClick(clickedSquare, gameState) {
    const { selectedSquare, currentPlayer, boardArray, setSelectedSquare, setBoardArray, setCurrentPlayer, setHighlightedSquares } = gameState;
    const piece = squareHasPiece(clickedSquare, boardArray);
    const pieceColor = piece ? getPieceColor(piece) : null;
    player = currentPlayer;


    let checkmate = checkmateCheck(getAllPieceInfo(boardArray)[0], boardArray);
    console.log(checkmate);


    if (checkGameStatus()) return;

    if (piece && pieceColor === currentPlayer && selectedSquare !== clickedSquare) {
        handlePieceSelection(clickedSquare, piece, pieceColor, selectedSquare, boardArray, setSelectedSquare, setHighlightedSquares);
        return;
    } else if (selectedSquare && possibleMoves.length > 0 && possibleMoves.includes(clickedSquare)) {
        handleMoveExecution(clickedSquare, selectedSquare, boardArray, setBoardArray, setSelectedSquare, setCurrentPlayer, currentPlayer);
    } else {
        setSelectedSquare(null);
        hideLegalMovesSquares();
        possibleMoves = [];
    }
}

function handleMoveExecution(clickedSquare, selectedSquare, boardArray, setBoardArray, setSelectedSquare, setCurrentPlayer, currentPlayer) {
    const preMoveBoard = movePiece(boardArray, selectedSquare, clickedSquare);
    const pieceInfo = getAllPieceInfo(preMoveBoard)[0];
    const kingInCheck = isOurKingInCheck(pieceInfo);
    const oponentInCheck = isOpponentKingInCheck(pieceInfo);

    if (kingInCheck) {
        console.log('Invalid move, Our King is in check');
        console.log('Invalid move');
        setSelectedSquare(null);
        hideLegalMovesSquares();
        possibleMoves = [];
        return;
    }

    if (oponentInCheck) {
        console.log('Opponent King is in check');
    }

    setBoardArray(preMoveBoard);
    setSelectedSquare(null);
    hideLegalMovesSquares();
    possibleMoves = [];
    setCurrentPlayer(changeCurrentPlayer(currentPlayer));
}

function handlePieceSelection(clickedSquare, piece, pieceColor, selectedSquare, boardArray, setSelectedSquare, setHighlightedSquares) {
    hideLegalMovesSquares();
    setSelectedSquare(clickedSquare);

    possibleMoves = getPossibleMoves(piece, clickedSquare, boardArray);
    let safeMoves = getValidMoves(piece, clickedSquare, boardArray);

    showLegalMovesSquares(safeMoves, boardArray);
}

function checkGameStatus() {
    if (checkmate) {
        console.log(`Checkmate ${winner} won`);
        endGame(checkmate);
        return true;
    } else if (stalemate) {
        endGame('Stalemate');
        return true;
    }
    return false;
}

function getPiecePosition(piece, boardArray) {
    if (piece && boardArray) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (boardArray[row][col] === piece) {
                    return `${boardLetters[col]}${8 - row}`;
                }
            }
        }
    } return null;
}

function endGame(type) {
    if (type === 'checkmate') {
        console.log(`Game Over - Checkmate player ${winner} won 2`);
    } else if (type === 'stalemate') {
        console.log('Game Over - Stalemate');
    }
}

// Helper function to simulate a move and check if the king is in check
function isMoveSafe(boardArray, from, to) {
    // Create a deep copy of the board
    const newBoardArray = boardArray.map(row => row.slice());

    // Simulate the move
    const [startColumn, startRow] = from.split('');
    const [endColumn, endRow] = to.split('');
    const startRowIndex = 8 - parseInt(startRow);
    const startColumnIndex = startColumn.charCodeAt(0) - 97;
    const endRowIndex = 8 - parseInt(endRow);
    const endColumnIndex = endColumn.charCodeAt(0) - 97;

    const piece = newBoardArray[startRowIndex][startColumnIndex];
    newBoardArray[startRowIndex][startColumnIndex] = '';
    newBoardArray[endRowIndex][endColumnIndex] = piece;

    const simulatedMovesPieceInfoCurrent = getAllPieceInfo(newBoardArray)[0];
    const simulatedMovesPieceInfoOpponent = getAllPieceInfo(newBoardArray)[1];

    const isCheckCurrent = isOurKingInCheck(simulatedMovesPieceInfoCurrent);


    return !isCheckCurrent;
}

function getValidMoves(piece, position, boardArray) {
    const possibleMoves = getPossibleMoves(piece, position, boardArray);
    return possibleMoves.filter(move => isMoveSafe(boardArray, position, move));

}

function checkmateCheck(pieceInfo, boardArray) {
    if (checkmate) return true;

    let totalSafeMoves = [];
    let pieceInfoWithoutStatusText = pieceInfo.slice(0, -1);

    pieceInfoWithoutStatusText.forEach(piece => {
        totalSafeMoves.push(...piece.moves.filter(move => isMoveSafe(boardArray, piece.position, move)));
    });


    // console.log(totalSafeMoves);

    if (totalSafeMoves.length === 0) {
        if (whiteKingInCheck) {
            winner = 'black';
            checkmate = true;
            return true;
        } else if (blackKingInCheck) {
            winner = 'white';
            checkmate = true;
            return true;
        } else {
            stalemate = true;
        }
    }

    return false
}

export function getPossibleMoves(piece, position, boardArray) {
    squareLetter = position[0];
    squareNumber = parseInt(position[1]);
    let moves = [];

    const pieceType = getPieceType(piece)
    const pieceColor = getPieceColor(piece)

    switch (pieceType) {
        case 'pawn':
            moves = pawnMoves(piece, position, boardArray);
            break;
        case 'rook':
            moves = rookMoves(position, pieceColor, boardArray);
            break;
        case 'knight':
            moves = knightMoves(position, pieceColor, boardArray);
            break;
        case 'bishop':
            moves = bishopMoves(position, pieceColor, boardArray);
            break;
        case 'queen':
            moves = queenMoves(position, pieceColor, boardArray);
            break;
        case 'king':
            moves = kingMoves(position, pieceColor, boardArray);
            break;
        default:
    }

    return moves;
}

function pawnMoves(piece, aPieceSquare, boardArray) {
    squareLetter = aPieceSquare[0];
    squareNumber = parseInt(aPieceSquare[1]);
    let moves = [];

    const aPieceColor = getPieceColor(piece)
    const direction = aPieceColor === 'white' ? 1 : -1; // 1 for White (up), -1 for Black (down)
    const startingRow = aPieceColor === 'white' ? 2 : 7;
    const promotionRow = aPieceColor === 'white' ? 8 : 1;

    // Check for promotion row
    if (squareNumber === promotionRow) {
        console.log('Promote Pawn');
        return moves;
    }

    // Forward move by 1 square
    const squareInFront = `${squareLetter}${squareNumber + direction}`;
    if (squareInFront && !boardArray[8 - (squareNumber + direction)][boardLetters.indexOf(squareLetter)]) { // check if square exists and is empty
        moves.push(squareInFront);

        // Double move if pawn is on starting row
        if (squareNumber === startingRow) { // if pawn is on starting row
            const doubleSquareInFront = `${squareLetter}${squareNumber + 2 * direction}`;
            if (doubleSquareInFront && !boardArray[8 - (squareNumber + 2 * direction)][boardLetters.indexOf(squareLetter)]) { // check if square exists and is also empty
                moves.push(doubleSquareInFront);
            }
        }
    }



    // Check diagonal captures (left and right)
    const diagonals = [
        squareLetter !== 'a' && `${directionLetterBy(-1, 1)}${squareNumber + direction}`,
        squareLetter !== 'h' && `${directionLetterBy(1, 1)}${squareNumber + direction}`
    ];

    diagonals.forEach(diagonal => {
        if (diagonal) {
            const captureSquare = boardArray[8 - (squareNumber + direction)][boardLetters.indexOf(diagonal[0])];
            if (captureSquare && isOpponentPiece(captureSquare, aPieceColor)) {
                if (!moves.includes(diagonal)) {  // Avoid duplicate entries
                    moves.push(diagonal);
                }
            }
        }
    });

    return moves;
}

function rookMoves(aPieceSquare, aPieceColor, boardArray) {
    squareLetter = aPieceSquare[0];
    squareNumber = parseInt(aPieceSquare[1]);
    let moves = [];

    // Define directions for rook: up, down, right, left
    const directions = [
        { letterDirection: 0, numberDirection: 1 },  // Up
        { letterDirection: 0, numberDirection: -1 }, // Down
        { letterDirection: 1, numberDirection: 0 },  // Right
        { letterDirection: -1, numberDirection: 0 }  // Left
    ];

    // Iterate over each direction
    directions.forEach(({ letterDirection, numberDirection }) => {
        for (let i = 1; i <= 7; i++) {
            const letter = directionLetterBy(letterDirection, i);
            const number = directionNumberBy(numberDirection, i);

            // Ensure we're within board bounds
            if (!letter || number < 1 || number > 8) break;

            const square = `${letter}${number}`;
            const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

            if (!addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves)) break;
        }
    });
    return moves;
}

function bishopMoves(aPieceSquare, aPieceColor, boardArray) {
    squareLetter = aPieceSquare[0];
    squareNumber = parseInt(aPieceSquare[1]);
    let moves = [];

    // Define diagonal directions: [up-right, up-left, down-right, down-left]
    const directions = [
        { letterDirection: 1, numberDirection: 1 },
        { letterDirection: -1, numberDirection: 1 },
        { letterDirection: 1, numberDirection: -1 },
        { letterDirection: -1, numberDirection: -1 }
    ];

    // Iterate over each diagonal direction
    directions.forEach(({ letterDirection, numberDirection }) => {
        for (let i = 1; i <= 7; i++) {
            const letter = directionLetterBy(letterDirection, i);
            const number = directionNumberBy(numberDirection, i);

            // Ensure we're within board bounds
            if (!letter || number < 1 || number > 8) break;

            const square = `${letter}${number}`;
            const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

            if (!addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves)) break;
        }
    });

    return moves;
}

function knightMoves(aPieceSquare, aPieceColor, boardArray) {
    squareLetter = aPieceSquare[0];
    squareNumber = parseInt(aPieceSquare[1]);
    let moves = [];

    const directions = [
        { numberDirection: -2, letterDirection: 1 }, // 2 down 1 right (Upright L)
        { numberDirection: 1, letterDirection: 2 }, // 1 up 2 right (1 clockwise turn)
        { numberDirection: 2, letterDirection: -1 }, // 2 up 1 left (Upside down L)
        { numberDirection: -1, letterDirection: -2 }, // 1 down 2 left (1 counter clockwise turn)
        { numberDirection: -2, letterDirection: -1 }, // 2 down 1 left (Backwards L)
        { numberDirection: -1, letterDirection: 2 }, // 1 down 2 right (Backwards L, 1 clockwise turn)
        { numberDirection: 2, letterDirection: 1 }, // 2 up 1 right (Backwards L, UpsideDown)
        { numberDirection: 1, letterDirection: -2 } // 1 up 2 left (Backwards L, 1 counter clockwise turn)
    ];

    directions.forEach(({ numberDirection, letterDirection }) => {
        const letter = directionLetterBy(letterDirection, 1);
        const number = directionNumberBy(numberDirection, 1);

        if (!letter || number < 1 || number > 8) return;

        const square = `${letter}${number}`;
        const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

        addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves);
    });

    return moves;
}

function queenMoves(aPieceSquare, aPieceColor, boardArray) {
    let moves = [];
    moves.push(...rookMoves(aPieceSquare, aPieceColor, boardArray));
    moves.push(...bishopMoves(aPieceSquare, aPieceColor, boardArray));

    return moves;
}

function kingMoves(aPieceSquare, aPieceColor, boardArray) {
    squareLetter = aPieceSquare[0];
    squareNumber = parseInt(aPieceSquare[1]);
    let moves = [];

    const directions = [
        { letterDirection: 0, numberDirection: 1 }, // Up
        { letterDirection: 1, numberDirection: 1 }, // Up-Right
        { letterDirection: 1, numberDirection: 0 }, // Right
        { letterDirection: 1, numberDirection: -1 }, // Down-Right
        { letterDirection: 0, numberDirection: -1 }, // Down
        { letterDirection: -1, numberDirection: -1 }, // Down-Left
        { letterDirection: -1, numberDirection: 0 }, // Left
        { letterDirection: -1, numberDirection: 1 } // Up-Left
    ];

    directions.forEach(({ letterDirection, numberDirection }) => {
        const letter = directionLetterBy(letterDirection, 1);
        const number = directionNumberBy(numberDirection, 1);

        if (!letter || number < 1 || number > 8) return;

        const square = `${letter}${number}`;
        const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

        addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves);
    });

    return moves;
}

function movePiece(boardArray, selectedSquare, squareName) {
    let newBoardArray = boardArray.map(row => row.slice());
    const [startColumn, startRow] = selectedSquare.split('');
    const [endColumn, endRow] = squareName.split('');
    const startRowIndex = 8 - parseInt(startRow);
    const startColumnIndex = startColumn.charCodeAt(0) - 97;
    const endRowIndex = 8 - parseInt(endRow);
    const endColumnIndex = endColumn.charCodeAt(0) - 97;

    const piece = newBoardArray[startRowIndex][startColumnIndex];
    newBoardArray[startRowIndex][startColumnIndex] = '';
    newBoardArray[endRowIndex][endColumnIndex] = piece;
    return newBoardArray;
}

function isOurKingInCheck(currentPlayerInfo) {
    const currentKing = player === 'white' ? 'WK' : 'BK';

    const threats = currentPlayerInfo[currentPlayerInfo.length - 1].threat;

    if (threats.includes(currentKing)) {
        if (player === 'white') {
            whiteKingInCheck = true;
        } else {
            blackKingInCheck = true;
        }
        return true;
    }

    return false;

}

function isOpponentKingInCheck(currentPlayerInfo) {
    let attacks = currentPlayerInfo[currentPlayerInfo.length - 1].attack;
    let opponentKing = player === 'white' ? 'BK' : 'WK';

    if (attacks.includes(opponentKing)) {
        console.log(`The ${opponentKing} is in check`);
        if (player === 'white') {
            blackKingInCheck = true;
        } else {
            whiteKingInCheck = true;
        }
        return true;
    }

    return false;
}

function isBoardInCheck(currentPlayerInfo) {
    let ourKing = isOurKingInCheck(currentPlayerInfo);
    let opponentKing = isOpponentKingInCheck(currentPlayerInfo);

    return ourKing || opponentKing;
}

function getAllPieceInfo(boardArray) {
    const currentPlayerInfo = [];
    const opponentInfo = [];

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardArray[row][col];
            if (piece) {
                const position = `${boardLetters[col]}${8 - row}`;
                const pieceColor = getPieceColor(piece);
                const pieceInfo = createPieceInfo(piece, position, pieceColor, boardArray);

                pieceColor === player ? currentPlayerInfo.push(pieceInfo) : opponentInfo.push(pieceInfo);
            }
        }
    }

    const allAtackedPieces = currentPlayerInfo.flatMap(piece => piece.attacks || []);
    const allThreatenedPieces = opponentInfo.flatMap(piece => piece.attacks || []);

    let color = player === 'white' ? 'white' : 'black';

    let attack = `Pieces ${color} can capture: ${[...allAtackedPieces].join(', ')}`;
    let threat = `Pieces ${color} could lose: ${[...allThreatenedPieces].join(', ')}`;

    currentPlayerInfo.push({ attack, threat });
    opponentInfo.push({ attack, threat });

    return [currentPlayerInfo, opponentInfo];
}

function createPieceInfo(piece, position, pieceColor, boardArray) {
    const possibleMoves = getPossibleMoves(piece, position, boardArray);
    const moves = getMovesOnly(possibleMoves, boardArray);;
    const attacks = getCapturesOnly(pieceColor, possibleMoves, boardArray).map(square => squareHasPiece(square, boardArray));

    const pieceInfo = {
        piece: piece,
        position: position,
        moves: moves,
        attacks: attacks
    };

    return pieceInfo;
}

function getMovesOnly(moves, boardArray) {
    return moves.filter(square => !squareHasPiece(square, boardArray));
}

function getCapturesOnly(color, moves, boardArray) {
    return moves.filter(square => squareHasOpponentPiece(color, square, boardArray));
}

function addMoveIfOpponentOrEmpty(square, piece, clickedPieceColor, moves) {
    if (!piece) {
        moves.push(square);
        return true;
    } else if (isOpponentPiece(piece, clickedPieceColor)) {
        moves.push(square);
        return false;
    }
    return false;
}

function isOpponentPiece(piece, clickedPieceColor) {
    return getPieceColor(piece) !== clickedPieceColor;
}

function squareHasPiece(squareName, boardArray) {
    const [column, row] = squareName.split('');
    const columnNumber = boardLetters.indexOf(column);
    const rowNumber = 8 - row;

    const piece = boardArray[rowNumber][columnNumber];

    return piece ? piece : null;
}

function squareHasOpponentPiece(color, squareName, boardArray) {
    const piece = squareHasPiece(squareName, boardArray);
    return piece && getPieceColor(piece) !== color;
}

function hideLegalMovesSquares() {
    const squares = document.querySelectorAll('.legal-move, .capture-hint');
    squares.forEach(square => {
        square.classList.remove('legal-move', 'capture-hint');
    });
}

function showLegalMovesSquares(squares, boardArray) {
    hideLegalMovesSquares();
    squares.forEach(squareName => {
        const square = document.getElementById(squareName);
        if (square) {
            const pieceElement = squareHasPiece(squareName, boardArray);
            if (pieceElement) {
                square.classList.add('capture-hint');
            } else {
                square.classList.add('legal-move');
            }
        }
    });
}

function getPieceColor(piece) {


    if (piece[0] === 'W' || piece[0] === 'w') {
        return 'white';
    } else {
        return 'black';
    }
}

function getPieceType(piece) {
    const pieces = {
        'P': 'pawn',
        'R': 'rook',
        'N': 'knight',
        'B': 'bishop',
        'Q': 'queen',
        'K': 'king'
    };

    return piece.length <= 3 ? pieces[piece[1]] : piece.split('-')[1];
}

function changeCurrentPlayer(currentPlayer) {
    return currentPlayer === 'white' ? 'black' : 'white';
}