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
let promotionPieces = [];

export function createStartingPositionBoardArray() {
    savePromotionPieces();
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

    if (checkGameStatus()) {
        return;
    }

    const { selectedSquare, currentPlayer, boardArray, setSelectedSquare, setBoardArray, setCurrentPlayer, setHighlightedSquares } = gameState;
    const piece = squareHasPiece(clickedSquare, boardArray);
    const pieceColor = piece ? getPieceColor(piece) : null;
    player = currentPlayer;
    let opponent = currentPlayer === 'white' ? 'black' : 'white';
    const currentPlayerInfo = getPlayerInfo(boardArray, player);
    updatePieceInfoMovesToSafemoves(currentPlayerInfo, boardArray)

    isCheckmate(currentPlayerInfo, boardArray);
    isStalemate(currentPlayerInfo);

    console.log(piece);
    console.log(boardArray);



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

function handlePieceSelection(clickedSquare, piece, pieceColor, selectedSquare, boardArray, setSelectedSquare, setHighlightedSquares) {
    hideLegalMovesSquares();

    possibleMoves = getPossibleMoves(piece, clickedSquare, boardArray, true);
    const safeMoves = getPieceValidMoves(piece, boardArray, false, true);

    if (safeMoves.length !== 0) {
        setSelectedSquare(clickedSquare);
        showLegalMovesSquares(safeMoves, boardArray);
    }

}

export function handleMoveExecution(clickedSquare, selectedSquare, boardArray, setBoardArray, setSelectedSquare, setCurrentPlayer, currentPlayer) {
    const selectedPiece = squareHasPiece(selectedSquare, boardArray);

    let opponent = currentPlayer === 'white' ? 'black' : 'white';

    const preMoveBoard = movePiece(boardArray, selectedSquare, clickedSquare);

    const currentPlayerInfo = getPlayerInfo(preMoveBoard, currentPlayer);
    const opponentPlayerInfo = getPlayerInfo(preMoveBoard, opponent);

    updatePieceInfoMovesToSafemoves(currentPlayerInfo, boardArray)
    updatePieceInfoMovesToSafemoves(opponentPlayerInfo, boardArray)

    if (isOurKingInCheck(currentPlayerInfo)) {
        console.log('our king is in check');
        setSelectedSquare(null);
        hideLegalMovesSquares();
        possibleMoves = [];
    } else {
        setBoardArray(preMoveBoard);
        setSelectedSquare(null);
        hideLegalMovesSquares();

        if (selectedPiece && getPieceType(selectedPiece) === 'pawn') {
            if (currentPlayer === 'white' && clickedSquare[1] === '8') {
                promotePawnTo(selectedPiece, clickedSquare, preMoveBoard, 'Q');
            } else if (currentPlayer === 'black' && clickedSquare[1] === '1') {
                promotePawnTo(selectedPiece, clickedSquare, preMoveBoard, 'Q');
            }
        }

        setCurrentPlayer(changeCurrentPlayer(currentPlayer));

        isBoardInCheck(currentPlayerInfo, true);

        isCheckmate(currentPlayerInfo, preMoveBoard);
        isStalemate(opponentPlayerInfo);
    }

    if (checkGameStatus()) {
        return;
    };
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

function getAllMovesForPlayer(pieceInfo) {
    let allValidMoves = [];
    pieceInfo.forEach(pieceInfo => {
        const moves = pieceInfo.moves;
        (moves && moves.length > 0) && allValidMoves.push(moves);
    });

    return allValidMoves;
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
function isMoveSafe(piece, boardArray, from, to, premove = false, real = false) {
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

    const simulatedMovesPieceInfoCurrent = getPlayerInfo(newBoardArray, color);

    if (premove) {
        const isCheck = isBoardInCheck(simulatedMovesPieceInfoCurrent, real)
        return !isCheck;
    }

    const isCheck = isOurKingInCheck(simulatedMovesPieceInfoCurrent, real);

    return !isCheck;
}

function getPieceValidMoves(piece, boardArray, premove = false, real = false) {
    const position = getPiecePosition(piece, boardArray);
    return getValidMoves(piece, position, boardArray, premove, real);
}

function getValidMoves(piece, position, boardArray, premove = false, real = false) {
    const possibleMoves = getPossibleMoves(piece, position, boardArray, false);
    return possibleMoves.filter(move => isMoveSafe(piece, boardArray, position, move, premove, real));
}

const directionLetterBy = (direction, num) => {
    const index = boardLetters.indexOf(squareLetter) + direction * num;
    return boardLetters[index] || null;
};

const directionNumberBy = (direction, num) => {
    const newNumber = squareNumber + direction * num;
    return newNumber >= 1 && newNumber <= 8 ? newNumber : null;
};

export function getPossibleMoves(piece, position, boardArray, allowPromotion = false) {
    const squareLetter = position[0];
    const squareNumber = parseInt(position[1]);
    let moves = [];

    const pieceType = getPieceType(piece);
    const pieceColor = getPieceColor(piece);

    switch (pieceType) {
        case 'pawn':
            moves = pawnMoves(piece, position, pieceColor, boardArray, allowPromotion);
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

function getCoverMoves(piece, position, boardArray, allowPromotion = false) {

    const pieceType = getPieceType(piece);
    const pieceColor = getPieceColor(piece);

    switch (pieceType) {
        case 'pawn':
            return pawnMoves(piece, position, pieceColor, boardArray, allowPromotion);
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

function promotePawnTo(piece, clickedSquare, boardArray, newPiece = null) {
    let finalPiece;

    switch (newPiece) {
        case 'R': finalPiece = piece[0] + 'R1'; break;
        case 'B': finalPiece = piece[0] + 'B1'; break;
        case 'N': finalPiece = piece[0] + 'N1'; break;
        default: finalPiece = piece[0] + 'Q'; break;
    }

    const [column, row] = getColumnAndRow(clickedSquare);
    boardArray[row][column] = finalPiece;
}

function pawnMoves(piece, position, aPieceColor, boardArray, allowPromotion = false) {

    squareLetter = position[0];
    squareNumber = parseInt(position[1]);
    let moves = [];

    const direction = aPieceColor === 'white' ? 1 : -1; // 1 for White (up), -1 for Black (down)
    const startingRow = aPieceColor === 'white' ? 2 : 7;
    const lastRow = aPieceColor === 'white' ? 8 : 1;
    if (squareNumber === lastRow) {
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

function rookMoves(position, aPieceColor, boardArray) {
    squareLetter = position[0];
    squareNumber = parseInt(position[1]);
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

function bishopMoves(position, aPieceColor, boardArray, coverMoves = false) {
    squareLetter = position[0];
    squareNumber = parseInt(position[1]);
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


            if (!addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves, coverMoves)) break;
        }
    });

    return moves;
}

function knightMoves(position, aPieceColor, boardArray) {
    squareLetter = position[0];
    squareNumber = parseInt(position[1]);
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

function queenMoves(position, aPieceColor, boardArray) {
    let moves = [];
    moves.push(...rookMoves(position, aPieceColor, boardArray));
    moves.push(...bishopMoves(position, aPieceColor, boardArray));

    return moves;
}

function kingMoves(position, aPieceColor, boardArray) {
    squareLetter = position[0];
    squareNumber = parseInt(position[1]);
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

function getPlayerInfo(boardArray, pieceColor) {
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
    const possibleMoves = getPossibleMoves(piece, position, boardArray, false);
    const moves = getMovesOnly(possibleMoves, boardArray);
    const captures = getCapturesOnly(pieceColor, possibleMoves, boardArray);
    const attacks = captures.map(square => squareHasPiece(square, boardArray));
    const attackedSquares = getAttackedSquares(piece, position, boardArray);
    const coverMoves = getCoverMoves(piece, position, boardArray).filter(square => (!moves.includes(square) && !captures.includes(square)));

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
        attackedSquares = getPossibleMoves(piece, position, boardArray, false)
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

function updatePieceInfoMovesToSafemoves(pieceInfo, boardArray) {
    let copy = pieceInfo.slice();
    copy.pop();

    copy.forEach(pieceInfo => {
        const piece = pieceInfo.piece;
        const position = pieceInfo.position;

        const validMoves = getValidMoves(piece, position, boardArray, true, false);
        pieceInfo.moves = validMoves;
    });
}

function addMoveIfOpponentOrEmpty(square, piece, clickedPieceColor, moves, coverMoves = false) {
    if (!piece) {
        moves.push(square);
        return true; // Continue moving in this direction
    } else if (isOpponentPiece(piece, clickedPieceColor) || (coverMoves && !isOpponentPiece(piece, clickedPieceColor))) {
        moves.push(square);
        return false; // Stop moving in this direction after capturing an opponent piece or if we're looking for cover moves
    } return false; // Stop moving in this direction if it's our own piece and we're not looking for cover moves
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

function getAllPiecesAttackingAPiece(aPiece, aPlayerInfo) {
    let list = [];
    aPlayerInfo.forEach(pieceInfo => {
        const piece = pieceInfo.piece;
        const attacks = pieceInfo.attacks;
        (attacks.includes(aPiece)) && list.push(piece);
    });

    return list;
}

function isStalemate(playerInfo) {
    if (stalemate) { return true }

    if (!isBoardInCheck(playerInfo)) {
        const info = playerInfo.slice();
        info.pop();

        let allMoves = getAllMovesForPlayer(info).flat();

        if (allMoves.length === 0) {
            console.log('Stalemate');
            stalemate = true;
            return true;
        }
    }

    return false;

}

function isCheckmate(currentPlayerInfo, boardArray) {
    if (checkmate) { return true }
    if (blackKingInCheck || whiteKingInCheck) {

        const opponentColor = player === 'white' ? 'black' : 'white';
        const opponentKing = opponentColor === 'white' ? 'WK' : 'BK';

        const opponentInfo = getPlayerInfo(boardArray, opponentColor);
        updatePieceInfoMovesToSafemoves(opponentInfo, boardArray)

        const currentPlayer = currentPlayerInfo.slice();
        currentPlayer.pop();

        let piecesAttackignOpponentKing = getAllPiecesAttackingAPiece(opponentKing, currentPlayer);


        let piecesProtectingAttackPiece = [];
        piecesAttackignOpponentKing.forEach(pieceAttackingKing => {
            currentPlayer.forEach(pieceInfo => {
                if (pieceInfo.coverMoves.includes(getPiecePosition(pieceAttackingKing, boardArray))) {
                    piecesProtectingAttackPiece.push(pieceInfo.piece);
                }
            });
        });

        if (piecesProtectingAttackPiece.length !== 0) {
            checkmate = true;
            winner = player;
            return true;
        }

    }

    return false;
}

function isBoardInCheck(currentPlayerInfo, real = false) {
    let ourKing = isOurKingInCheck(currentPlayerInfo, real);
    let opponentKing = isOpponentKingInCheck(currentPlayerInfo, real);

    return ourKing || opponentKing;
}

function isOurKingInCheck(currentPlayerInfo, real = false) {
    const currentKing = player === 'white' ? 'WK' : 'BK';
    const threats = currentPlayerInfo[currentPlayerInfo.length - 1].threats;

    if (threats.includes(currentKing)) {
        if (real) {
            currentKing === 'WK' ? whiteKingInCheck = true : blackKingInCheck = true;
        }
        return true;
    } else {
        currentKing === 'WK' ? whiteKingInCheck = false : blackKingInCheck = false;
    }

    return false;
}

function isOpponentKingInCheck(currentPlayerInfo, real = false) {
    let opponentKing = player === 'white' ? 'BK' : 'WK';
    let attacks = currentPlayerInfo[currentPlayerInfo.length - 1].attacks;


    if (attacks.includes(opponentKing)) {
        if (real) {
            opponentKing === 'WK' ? whiteKingInCheck = true : blackKingInCheck = true;
        }
        return true;
    } else {
        opponentKing === 'WK' ? whiteKingInCheck = false : blackKingInCheck = false;
    }

    return false;
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
// make funcction that take e4 or d5 and return it as a row and column number used in for loop
function getColumnAndRow(square) {
    const column = parseInt(boardLetters.indexOf(square[0]));
    const row = parseInt(square[1]);
    return [column, row];
}

function savePromotionPieces() {
    const blackQueen = document.getElementById('BQ');
    const blackRook = document.getElementById('BR1');
    const blackBishop = document.getElementById('BB1');
    const blackKnight = document.getElementById('BN1');

    const whiteQueen = document.getElementById('WQ');
    const whiteRook = document.getElementById('WR1');
    const whiteBishop = document.getElementById('WB1');
    const whiteKnight = document.getElementById('WN1');

    promotionPieces.push(blackQueen, blackRook, blackBishop, blackKnight, whiteQueen, whiteRook, whiteBishop, whiteKnight);
}