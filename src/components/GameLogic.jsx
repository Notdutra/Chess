import js from "@eslint/js";

const boardLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

let squareLetter;
let squareNumber;
let player;

let whiteKingInCheck;
let blackKingInCheck;
let checkmate;
let stalemate;
let winner;

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
    let opponent = currentPlayer === 'white' ? 'black' : 'white';

    const currentPlayerInfo = getPlayerPieceInfo(boardArray, player);
    // const opponentPlayerInfo = getPlayerPieceInfo(boardArray, opponent);

    let check = isBoardInCheck(currentPlayerInfo);


    checkmateCheck(currentPlayerInfo, boardArray);

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

export function handleMoveExecution(clickedSquare, selectedSquare, boardArray, setBoardArray, setSelectedSquare, setCurrentPlayer, currentPlayer) {
    let opponent = currentPlayer === 'white' ? 'black' : 'white';

    const preMoveBoard = movePiece(boardArray, selectedSquare, clickedSquare);

    const currentPlayerInfo = getPlayerPieceInfo(preMoveBoard, currentPlayer);
    const opponentPlayerInfo = getPlayerPieceInfo(preMoveBoard, opponent);

    if (isOurKingInCheck(currentPlayerInfo)) {
        console.log('our king is in check');
        setSelectedSquare(null);
        hideLegalMovesSquares();
        possibleMoves = [];
    } else {
        setBoardArray(preMoveBoard);
        setSelectedSquare(null);
        hideLegalMovesSquares();
        setCurrentPlayer(changeCurrentPlayer(currentPlayer));

        let isCheck = isBoardInCheck(currentPlayerInfo);

        if (isCheck) {
            console.log(`${currentPlayer} put ${opponent} in check`);
        }

        const didPlayerPutOpponentInCheckmate = checkmateCheck(currentPlayerInfo, preMoveBoard);
    }
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
function isMoveSafe(piece, boardArray, from, to) {
    const color = getPieceColor(piece);

    // Create a deep copy of the board
    const newBoardArray = boardArray.map(row => row.slice());

    // Simulate the move
    const [startColumn, startRow] = from.split('');
    const [endColumn, endRow] = to.split('');
    const startRowIndex = 8 - parseInt(startRow);
    const startColumnIndex = startColumn.charCodeAt(0) - 97;
    const endRowIndex = 8 - parseInt(endRow);
    const endColumnIndex = endColumn.charCodeAt(0) - 97;

    const newPiece = newBoardArray[startRowIndex][startColumnIndex];
    newBoardArray[startRowIndex][startColumnIndex] = '';
    newBoardArray[endRowIndex][endColumnIndex] = newPiece;

    const simulatedMovesPieceInfoCurrent = getPlayerPieceInfo(newBoardArray, color);

    const isCheckCurrent = isOurKingInCheck(simulatedMovesPieceInfoCurrent);

    return !isCheckCurrent;
}

function getValidMoves(piece, position, boardArray) {
    const possibleMoves = getPossibleMoves(piece, position, boardArray);
    return possibleMoves.filter(move => isMoveSafe(piece, boardArray, position, move));

}

function isSquareBeingAttacked(square, boardArray) {
    const opponentColor = player === 'white' ? 'black' : 'white';
    const opponentInfo = getPlayerPieceInfo(boardArray, opponentColor);
    const opponentMoves = opponentInfo.flatMap(info => info.moves);
    const opponnentAttacks = opponentInfo.flatMap(info => info.attacks);
}

function checkmateCheck(currentPlayerInfo, boardArray) {
    if (checkmate) { return true }
    if (blackKingInCheck || whiteKingInCheck) {

        console.log(boardArray);

        const opponentColor = player === 'white' ? 'black' : 'white';
        const opponentKing = player === 'white' ? 'BK' : 'WK';
        const opponentInfo = getPlayerPieceInfo(boardArray, opponentColor);

        // Lets imagine we are white
        console.log('Current player info', currentPlayerInfo);
        const currentPlayer = currentPlayerInfo.slice();
        const playerAttacks = currentPlayer[currentPlayer.length - 1].attacks;
        const playerThreats = currentPlayer[currentPlayer.length - 1].threats;
        const playerAttackSquares = currentPlayer[currentPlayer.length - 1].attackSquares;
        const playerThreatenedSquares = currentPlayer[currentPlayer.length - 1].threatenedSquares;
        const playerCoverMoves = currentPlayer[currentPlayer.length - 1].coverMoves;
        currentPlayer.pop(); // remove the last element which is the player status

        // And the opponent is black, not being racist, just for the sake of the example
        console.log('Opponent player info', opponentInfo);
        let opponent = opponentInfo.slice();
        const OpponentAttacks = opponent[opponent.length - 1].attacks;
        const OpponentThreats = opponent[opponent.length - 1].threats;
        const OpponentAttackSquares = opponent[opponent.length - 1].attackSquares;
        const OpponentThreatenedSquares = opponent[opponent.length - 1].threatenedSquares;
        const OpponentCoverMoves = opponent[opponent.length - 1].coverMoves;
        opponent.pop();

        let piecesAttackignOpponentKing = [];
        currentPlayer.forEach(pieceInfo => {
            const piece = pieceInfo.piece;
            const attacks = pieceInfo.attacks;
            if (attacks.includes(opponentKing)) {
                piecesAttackignOpponentKing.push(piece);
            }
        });

        let piecesProtectingPiecesThatAttackOpponentKing = [];
        piecesAttackignOpponentKing.forEach(pieceAttackingKing => {
            currentPlayer.forEach(pieceInfo => {
                const piece = pieceInfo.piece;
                const attackSquares = pieceInfo.coverMoves;

                if (attackSquares.includes(getPiecePosition(pieceAttackingKing, boardArray))) {
                    console.log('piece bla bla bla ', piece);
                    console.log('pieceAttackingKing bla bla bla', pieceAttackingKing);

                    piecesProtectingPiecesThatAttackOpponentKing.push(piece);
                }
            });
        });


        console.log('piecesAttackignOpponentKing', piecesAttackignOpponentKing);
        console.log('piecesProtectingPiecesThatAttackOpponentKing', piecesProtectingPiecesThatAttackOpponentKing);



        // console.log('piecesAttackignOpponentKing', piecesAttackignOpponentKing);



    }


    return false;
}

// Export function for getting possible moves (default is without occupied squares)
export function getPossibleMoves(piece, position, boardArray) {
    const squareLetter = position[0];
    const squareNumber = parseInt(position[1]);
    let moves = [];

    const pieceType = getPieceType(piece);
    const pieceColor = getPieceColor(piece);

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
    }

    return moves;
}

function getCoverMoves(piece, position, boardArray) {
    const pieceType = getPieceType(piece);
    const pieceColor = getPieceColor(piece);

    switch (pieceType) {
        case 'pawn':
            return getAllPawnThreats(piece, position); // for pawns, only threats are diagonal
        case 'rook':
            return rookMoves(position, pieceColor, boardArray, true);
        case 'knight':
            return knightMoves(position, pieceColor, boardArray, true);
        case 'bishop':
            return bishopMoves(position, pieceColor, boardArray, true);
        case 'queen':
            return queenMoves(position, pieceColor, boardArray, true);
        case 'king':
            return kingMoves(position, pieceColor, boardArray, true);
    }
}

function pawnMoves(piece, position, boardArray, includeOccupied = false) {
    const squareLetter = position[0];
    const squareNumber = parseInt(position[1]);
    let moves = [];

    const pieceColor = getPieceColor(piece);
    const direction = pieceColor === 'white' ? 1 : -1; // 1 for White (up), -1 for Black (down)
    const startingRow = pieceColor === 'white' ? 2 : 7;
    const promotionRow = pieceColor === 'white' ? 8 : 1;

    // Check for promotion row
    if (squareNumber === promotionRow) {
        console.log('Promote Pawn');
        return moves;
    }

    // Forward move by 1 square
    const squareInFront = `${squareLetter}${squareNumber + direction}`;
    if (!includeOccupied && squareInFront && !boardArray[8 - (squareNumber + direction)][boardLetters.indexOf(squareLetter)]) {
        moves.push(squareInFront);

        // Double move if pawn is on starting row
        if (squareNumber === startingRow) {
            const doubleSquareInFront = `${squareLetter}${squareNumber + 2 * direction}`;
            if (doubleSquareInFront && !boardArray[8 - (squareNumber + 2 * direction)][boardLetters.indexOf(squareLetter)]) {
                moves.push(doubleSquareInFront);
            }
        }
    }

    // Check diagonal captures (left and right)
    const diagonals = [
        squareLetter !== 'a' && `${directionLetterBy(-1, 1, squareLetter)}${squareNumber + direction}`,
        squareLetter !== 'h' && `${directionLetterBy(1, 1, squareLetter)}${squareNumber + direction}`
    ];

    diagonals.forEach(diagonal => {
        if (diagonal) {
            const captureSquare = boardArray[8 - (squareNumber + direction)][boardLetters.indexOf(diagonal[0])];
            if (includeOccupied || (captureSquare && isOpponentPiece(captureSquare, pieceColor))) {
                moves.push(diagonal);
            }
        }
    });

    return moves;
}

function rookMoves(position, pieceColor, boardArray, includeOccupied = false) {
    const squareLetter = position[0];
    const squareNumber = parseInt(position[1]);
    let moves = [];
    const directions = [
        { letterDirection: 0, numberDirection: 1 }, { letterDirection: 0, numberDirection: -1 },
        { letterDirection: 1, numberDirection: 0 }, { letterDirection: -1, numberDirection: 0 }
    ];

    directions.forEach(({ letterDirection, numberDirection }) => {
        for (let i = 1; i <= 7; i++) {
            const letter = directionLetterBy(letterDirection, i, squareLetter);
            const number = directionNumberBy(numberDirection, i, squareNumber);
            if (!letter || number < 1 || number > 8) break;

            const square = `${letter}${number}`;
            const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

            if (includeOccupied || addMoveIfOpponentOrEmpty(square, piece, pieceColor, moves)) {
                moves.push(square);
            }
            if (piece && !includeOccupied) break;
        }
    });

    return moves;
}

function bishopMoves(position, pieceColor, boardArray, includeOccupied = false) {
    const squareLetter = position[0];
    const squareNumber = parseInt(position[1]);
    let moves = [];

    // Define diagonal directions: up-right, up-left, down-right, down-left
    const directions = [
        { letterDirection: 1, numberDirection: 1 },    // Up-Right
        { letterDirection: -1, numberDirection: 1 },   // Up-Left
        { letterDirection: 1, numberDirection: -1 },   // Down-Right
        { letterDirection: -1, numberDirection: -1 }   // Down-Left
    ];

    // Iterate over each diagonal direction
    directions.forEach(({ letterDirection, numberDirection }) => {
        for (let i = 1; i <= 7; i++) {
            const letter = directionLetterBy(letterDirection, i, squareLetter);
            const number = directionNumberBy(numberDirection, i, squareNumber);

            // Ensure we're within board bounds
            if (!letter || number < 1 || number > 8) break;

            const square = `${letter}${number}`;
            const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

            // Add the square to moves and stop if there's a piece, unless includeOccupied is true
            if (includeOccupied || addMoveIfOpponentOrEmpty(square, piece, pieceColor, moves)) {
                moves.push(square);
            }
            if (piece && !includeOccupied) break;
        }
    });

    return moves;
}

function knightMoves(position, pieceColor, boardArray, includeOccupied = false) {
    const squareLetter = position[0];
    const squareNumber = parseInt(position[1]);
    let moves = [];
    const directions = [
        { numberDirection: -2, letterDirection: 1 }, { numberDirection: 1, letterDirection: 2 },
        { numberDirection: 2, letterDirection: -1 }, { numberDirection: -1, letterDirection: -2 },
        { numberDirection: -2, letterDirection: -1 }, { numberDirection: -1, letterDirection: 2 },
        { numberDirection: 2, letterDirection: 1 }, { numberDirection: 1, letterDirection: -2 }
    ];

    directions.forEach(({ numberDirection, letterDirection }) => {
        const letter = directionLetterBy(letterDirection, 1, squareLetter);
        const number = directionNumberBy(numberDirection, 1, squareNumber);
        if (!letter || number < 1 || number > 8) return;

        const square = `${letter}${number}`;
        const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

        if (includeOccupied || addMoveIfOpponentOrEmpty(square, piece, pieceColor, moves)) {
            moves.push(square);
        }
    });

    return moves;
}

function queenMoves(position, pieceColor, boardArray, includeOccupied = false) {
    let moves = [];
    moves.push(...rookMoves(position, pieceColor, boardArray, includeOccupied));
    moves.push(...bishopMoves(position, pieceColor, boardArray, includeOccupied));
    return moves;
}


function kingMoves(position, pieceColor, boardArray, includeOccupied = false) {
    const squareLetter = position[0];
    const squareNumber = parseInt(position[1]);
    let moves = [];
    const directions = [
        { letterDirection: 0, numberDirection: 1 }, { letterDirection: 1, numberDirection: 1 },
        { letterDirection: 1, numberDirection: 0 }, { letterDirection: 1, numberDirection: -1 },
        { letterDirection: 0, numberDirection: -1 }, { letterDirection: -1, numberDirection: -1 },
        { letterDirection: -1, numberDirection: 0 }, { letterDirection: -1, numberDirection: 1 }
    ];

    directions.forEach(({ letterDirection, numberDirection }) => {
        const letter = directionLetterBy(letterDirection, 1, squareLetter);
        const number = directionNumberBy(numberDirection, 1, squareNumber);
        if (!letter || number < 1 || number > 8) return;

        const square = `${letter}${number}`;
        const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

        if (includeOccupied || addMoveIfOpponentOrEmpty(square, piece, pieceColor, moves)) {
            moves.push(square);
        }
    });

    return moves;
}

// function getCoverMoves(piece, boardArray) {

// }

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

    const threats = currentPlayerInfo[currentPlayerInfo.length - 1].threats;

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
    let attacks = currentPlayerInfo[currentPlayerInfo.length - 1].attacks;
    let opponentKing = player === 'white' ? 'BK' : 'WK';


    if (attacks.includes(opponentKing)) {
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

function getPlayerPieceInfo(boardArray, pieceColor) {
    const currentColor = pieceColor;
    const opponentColor = pieceColor === 'white' ? 'black' : 'white';

    const currentPlayerInfo = [];
    let opponentInfo = [];

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardArray[row][col];
            if (piece) {
                const aPosition = `${boardLetters[col]}${8 - row}`;
                const aPieceColor = getPieceColor(piece);
                const aPieceInfo = createPieceInfo(piece, aPosition, aPieceColor, boardArray);

                aPieceColor === pieceColor ? currentPlayerInfo.push(aPieceInfo) : opponentInfo.push(aPieceInfo);
            }
        }
    }

    const allPlayerAttackedSquares = sortSquares(currentPlayerInfo.flatMap(piece => piece.attackSquares || []));
    const allThreatenedSquares = sortSquares(opponentInfo.flatMap(piece => piece.attackSquares || []));

    const allAttackedPieces = currentPlayerInfo.flatMap(piece => piece.attacks || []);
    const allThreatenedPieces = opponentInfo.flatMap(piece => piece.attacks || []);;

    const generateStatusText = (player1, player2, attackedPieces, threatenedPieces) => ({
        attacks: `Pieces ${player1} can capture: ${attackedPieces}`,
        threats: `Pieces ${player1} could lose: ${threatenedPieces}`,
        attackSquares: `Squares ${player1} is defending: ${allPlayerAttackedSquares}`,
        threatenedSquares: `Squares ${player2} is defending: ${[allThreatenedSquares]}`,
    });

    const playerStatus = generateStatusText(currentColor, opponentColor, allAttackedPieces, allThreatenedPieces);

    currentPlayerInfo.push(playerStatus);

    return currentPlayerInfo;
}


function createPieceInfo(piece, position, pieceColor, boardArray) {
    const possibleMoves = getPossibleMoves(piece, position, boardArray);
    const moves = getMovesOnly(possibleMoves, boardArray);
    const attacks = getCapturesOnly(pieceColor, possibleMoves, boardArray).map(square => squareHasPiece(square, boardArray));
    const attackedSquares = getAttackedSquares(piece, position, boardArray);
    const coverMoves = getCoverMoves(piece, position);

    const pieceInfo = {
        piece: piece,
        position: position,
        moves: moves,
        attacks: attacks,
        attackSquares: attackedSquares,
        coverMoves: coverMoves
    };

    return pieceInfo;
}

function getAttackedSquares(piece, position, boardArray) {
    let attackedSquares = [];
    if (getPieceType(piece) === 'pawn') {
        // attackedSquares = getAllPawnThreats(piece, position)
        // should not need this function anymore
    } else {
        attackedSquares = getPossibleMoves(piece, position, boardArray)
    }

    return attackedSquares;
}

function sortSquares(squares) {
    return squares.sort((a, b) => {
        const [aLetter, aNumber] = [a[0], parseInt(a[1])];
        const [bLetter, bNumber] = [b[0], parseInt(b[1])];

        if (aLetter === bLetter) {
            return aNumber - bNumber;
        }
        return aLetter.localeCompare(bLetter);
    });
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