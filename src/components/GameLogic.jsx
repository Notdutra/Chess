import soundManager from '../SoundManager';

const boardLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

let squareLetter;
let squareNumber;
let player;

let whiteKingInCheck;
let blackKingInCheck;
let checkmate;
let stalemate;
let winner;
let enPassantStatus = false;


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


    if (checkmate || stalemate) return;

    const { selectedSquare, currentPlayer, boardArray, setSelectedSquare, setBoardArray, setCurrentPlayer, setHighlightedSquares } = gameState;

    const piece = squareHasPiece(clickedSquare, boardArray);
    const pieceColor = piece ? getPieceColor(piece) : null;
    player = currentPlayer;

    if (piece && pieceColor === currentPlayer && selectedSquare !== clickedSquare) {
        hideLegalMovesSquares();
        setSelectedSquare(clickedSquare);
        possibleMoves = getValidMoves(piece, clickedSquare, boardArray, true);
        if (enPassantStatus !== false && getPieceType(piece) === 'pawn') {
            const [enPassantPiece, enPassantSquare, , attackSquare, attackPawn] = enPassantStatus;
            if (attackPawn.includes(piece)) {
                possibleMoves.push(attackSquare);
            }
        }
        if (possibleMoves.length !== 0) {
            showLegalMovesSquares(possibleMoves, boardArray);
        } else {
            soundManager.play('illegalMove');
            setSelectedSquare(null);

        }
    } else if (selectedSquare && possibleMoves.length > 0 && possibleMoves.includes(clickedSquare)) {
        handleMoveExecution(clickedSquare, selectedSquare, boardArray, setBoardArray, setSelectedSquare, setCurrentPlayer, currentPlayer);
    } else {
        setSelectedSquare(null);
        hideLegalMovesSquares();
    }
}

export function handleMoveExecution(clickedSquare, selectedSquare, boardArray, setBoardArray, setSelectedSquare, setCurrentPlayer, currentPlayer) {
    const selectedPiece = squareHasPiece(selectedSquare, boardArray);
    const opponent = currentPlayer === 'white' ? 'black' : 'white';
    const preMoveBoard = movePiece(boardArray, selectedSquare, clickedSquare);
    const opponentPlayerInfo = getPlayerInfo(preMoveBoard, opponent);

    let currentPlayerInfo = getPlayerInfo(preMoveBoard, currentPlayer);

    setBoardArray(preMoveBoard);
    let soundPlayed = false;
    let isCheck = false;

    if (getPieceType(selectedPiece) === 'pawn') {
        const promotionBoard = promotePawnHandler(selectedPiece, clickedSquare, preMoveBoard);
        if (promotionBoard) {
            currentPlayerInfo = getPlayerInfo(promotionBoard, currentPlayer);
            pawnEnPassantHandler(selectedPiece, clickedSquare, preMoveBoard);
        }
    }

    isCheck = isOpponentKingInCheck(currentPlayer, currentPlayerInfo, true);
    const isCheckMate = isCheckmate(preMoveBoard);

    if (isCheck && !isCheckMate) {
        soundManager.play('check');
        soundPlayed = true;
    } else if (getPieceType(selectedPiece) === 'pawn' && (clickedSquare[1] === '8' || clickedSquare[1] === '1')) {
        soundManager.play('promote');
        soundPlayed = true;
    }

    if (!soundPlayed) {
        if (squareHasPiece(clickedSquare, boardArray)) {
            soundManager.play('capture');
        } else {
            soundManager.play(currentPlayer === 'white' ? 'playerMove' : 'opponentMove');
        }
    }

    isStalemate(opponentPlayerInfo, preMoveBoard);

    checkGameStatus(currentPlayerInfo);
    setCurrentPlayer(changeCurrentPlayer(currentPlayer));
    setSelectedSquare(null);
    hideLegalMovesSquares();
}

function checkGameStatus(currentPlayerInfo) {
    if (checkmate) {
        console.log(`Checkmate ${winner} won`);
        soundManager.play('check');
        setTimeout(() => {
            soundManager.play('gameEnd');
        }, 100); // Short delay to ensure both sounds play almost simultaneously
        endGame(checkmate);
    } else if (stalemate) {
        soundManager.play('gameEnd');
        endGame('Stalemate');
        return true;
    }
    return false;
}

function getAllSafeMovesForPlayer(pieceInfo, boardArray) {
    let infoCopy = pieceInfo.slice();
    infoCopy.pop();

    let allSafeMoves = [];

    infoCopy.forEach(infoCopy => {
        let piece = infoCopy.piece;
        let position = infoCopy.position;
        if (piece) {
            let safeMoves = getValidMoves(piece, position, boardArray, false)
            if (safeMoves.length !== 0) {
                allSafeMoves.push({ piece: piece, safeMoves: safeMoves });
            }
        }
    });

    return allSafeMoves;
}

function getPiecePosition(piece) {
    return document.getElementById(piece).parentElement.id;
}

function endGame(type) {
    if (type === 'checkmate') {
        console.log(`Game Over - Checkmate player ${winner} won 2`);
    } else if (type === 'stalemate') {
        console.log('Game Over - Stalemate');
    }
}

// Helper function to simulate a move and check if the king is in check
function isMoveSafe(piece, boardArray, from, to, real = false) {
    const color = getPieceColor(piece);

    // we need to get moves that leave the king out of check, or get king out of check

    // Simulate the move
    let newBoardArray = movePiece(boardArray, from, to);
    // in this newBoardArray, is ourKing in check? or (still in check?)
    const simulatedMovesPieceInfoCurrent = getPlayerInfo(newBoardArray, color);
    let ourKingInCheck = isOurKingInCheck(color, simulatedMovesPieceInfoCurrent, real);


    // if (ourKingInCheck) {
    //     console.log(`${color} king is in check at ${to}`);
    // } else {
    //     console.log(`${color} king is safe at ${to}`);
    // }

    return !ourKingInCheck;
}

function getValidMoves(piece, position, boardArray, real = false) {
    const possibleMoves = getPossibleMoves(piece, position, boardArray, false);

    let safeMoves = possibleMoves.filter(move => isMoveSafe(piece, boardArray, position, move, real));

    return safeMoves;
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
            return getAllPawnThreats(piece, position);
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

function pawnEnPassantHandler(selectedPiece, toSquare, boardArray) {

    if (enPassantStatus !== false) {
        const [enPassantPiece, enPassantSquare, parentEl, attackSquare, attackPawn] = enPassantStatus;

        if (attackPawn.includes(selectedPiece) && attackSquare === toSquare) {
            const [targetRow, targetCol] = getRowAndColumn(enPassantSquare);
            boardArray[8 - targetRow][targetCol] = '';
            boardArray = movePiece(boardArray, getPiecePosition(selectedPiece), toSquare);
        }
    }

    let attackPawn = [];

    const color = getPieceColor(selectedPiece);

    const fromSquare = getPiecePosition(selectedPiece);

    const [fromRow, fromColumn] = getRowAndColumn(fromSquare);
    const [toRow, toColumn] = getRowAndColumn(toSquare);

    const startingRow = color === 'white' ? 2 : 7;
    const doubleMoveRow = color === 'white' ? 4 : 5;

    if (fromRow == startingRow && toRow == doubleMoveRow) {

        const leftSquare = getLeftSquare(toSquare);
        const rightSquare = getRightSquare(toSquare);

        const leftPiece = document.getElementById(leftSquare)?.firstElementChild?.id || null;
        const rightPiece = document.getElementById(rightSquare)?.firstElementChild?.id || null;

        if (leftPiece) {
            if (getPieceType(leftPiece) === 'pawn' && getPieceColor(leftPiece) !== color) {
                attackPawn.push(leftPiece);
            }
        }

        if (rightPiece) {
            if (getPieceType(rightPiece) === 'pawn' && getPieceColor(rightPiece) !== color) {
                attackPawn.push(rightPiece);
            }
        }

    }

    if (attackPawn.length > 0) {
        const enPassantPieceParent = document.getElementById(selectedPiece)?.parentElement;
        const attackSquare = color === 'white' ? getDownSquare(toSquare) : getUpSquare(toSquare);
        enPassantStatus = [selectedPiece, toSquare, enPassantPieceParent, attackSquare, attackPawn];
        return true;
    } else {
        enPassantStatus = false;
    }

    return false;
}

function promotePawnHandler(selectedPiece, clickedSquare, preMoveBoard) {
    if (selectedPiece && getPieceType(selectedPiece) === 'pawn') {
        if (player === 'white' && clickedSquare[1] === '8') {
            return promotePawnTo(clickedSquare, preMoveBoard, 'Q');
        } else if (player === 'black' && clickedSquare[1] === '1') {
            return promotePawnTo(clickedSquare, preMoveBoard, 'Q');
        }
    }
    return false;
}

function promotePawnTo(clickedSquare, boardArray, newPiece = null) {
    let finalPiece;
    let color = player === 'white' ? 'W' : 'B';

    switch (newPiece) {
        case 'R': finalPiece = color[0] + 'R'; break;
        case 'B': finalPiece = color[0] + 'B'; break;
        case 'N': finalPiece = color[0] + 'N'; break;
        default: finalPiece = color[0] + 'Q-PromotedPawn'; break;
    }
    const [row, column] = getRowAndColumn(clickedSquare);
    boardArray[8 - row][column] = finalPiece;

    return boardArray;
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

function rookMoves(position, aPieceColor, boardArray, coverMoves = false) {
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

            if (!addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves, coverMoves)) break;
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

function knightMoves(position, aPieceColor, boardArray, coverMoves = false) {
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

        addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves, coverMoves);
    });

    return moves;
}

function queenMoves(position, aPieceColor, boardArray, coverMoves = false) {
    let moves = [];
    moves.push(...rookMoves(position, aPieceColor, boardArray));
    moves.push(...bishopMoves(position, aPieceColor, boardArray));

    return moves;
}

function kingMoves(position, aPieceColor, boardArray, coverMoves = false) {
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

        addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves, coverMoves);
    });

    return moves;
}

function movePiece(boardArray, fromSquare, toSquare) {
    let newBoardArray = boardArray.map(row => row.slice());
    const [startColumn, startRow] = fromSquare.split('');
    const [endColumn, endRow] = toSquare.split('');
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
    const allThreatenedPieces = opponentInfo.flatMap(piece => piece.attacks || []);

    currentPlayerInfo.forEach(pieceInfo => {
        if (pieceInfo.piece === 'WK' || pieceInfo.piece === 'BK') {
            pieceInfo.moves = pieceInfo.moves.filter(move => !allThreatenedSquares.includes(move));
        }
    });

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

    const pieceInfo = {
        piece: piece,
        position: position,
        moves: moves,
        attacks: attacks,
        attackSquares: attackedSquares,
    };

    return pieceInfo;
}

function getAttackedSquares(piece, position, boardArray) {
    let attackedSquares = [];
    if (getPieceType(piece) === 'pawn') {
        attackedSquares = getAllPawnThreats(piece, position)
    } else {
        attackedSquares = getCoverMoves(piece, position, boardArray, false)
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

function getAllPawnThreats(piece, position) {
    const pieceColor = getPieceColor(piece);
    let [row, column] = getRowAndColumn(position);
    const letter = boardLetters[column];

    const direction = pieceColor === 'white' ? 1 : -1;

    const left = directionLetterBy(-1, 1);
    const right = directionLetterBy(1, 1);

    const leftDiagonal = `${left}${row + direction}`;
    const rightDiagonal = `${right}${row + direction}`;

    return letter === 'a' ? [rightDiagonal] : letter === 'h' ? [leftDiagonal] : [leftDiagonal, rightDiagonal];

}

function getMovesOnly(moves, boardArray) {
    return moves.filter(square => !squareHasPiece(square, boardArray));
}

function getCapturesOnly(color, moves, boardArray) {
    return moves.filter(square => squareHasOpponentPiece(color, square, boardArray));
}

function addMoveIfOpponentOrEmpty(square, piece, clickedPieceColor, moves, coverMoves = false) {
    if (!piece) {
        moves.push(square);
        return true; // Continue moving in this direction
    } else if (isOpponentPiece(piece, clickedPieceColor) || (coverMoves)) {
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

function isStalemate(currentPlayerInfo, boardArray) {
    if (stalemate) return true
    if (!blackKingInCheck && !whiteKingInCheck) {
        const currentPlayer = currentPlayerInfo.slice();
        const allPiecesSafeMoves = getAllSafeMovesForPlayer(currentPlayer, boardArray);
        const allSafeMoves = allPiecesSafeMoves.flatMap(item => item.safeMoves);

        if (allSafeMoves.length === 0) {
            stalemate = true;
            return true;
        }
    }
}

function isCheckmate(boardArray) {
    if (checkmate) return true
    if (blackKingInCheck || whiteKingInCheck) {

        const opponentColor = player === 'white' ? 'black' : 'white';
        const opponentInfo = getPlayerInfo(boardArray, opponentColor);
        const opponent = opponentInfo.slice();

        const allPiecesSafeMoves = getAllSafeMovesForPlayer(opponent, boardArray);
        const allSafeMoves = allPiecesSafeMoves.flatMap(item => item.safeMoves);

        if (allSafeMoves.length === 0) {
            checkmate = true;
            winner = player;
            return true;
        }
    }

    return false;
}

function isBoardInCheck(color, currentPlayerInfo, real = false) {
    const ourKing = isOurKingInCheck(color, currentPlayerInfo, real);
    const opponentKing = isOpponentKingInCheck(color, currentPlayerInfo, real);
    return ourKing || opponentKing;
}

function isOurKingInCheck(color, currentPlayerInfo, real = false) {
    const currentKing = color === 'white' ? 'WK' : 'BK';

    const threats = currentPlayerInfo[currentPlayerInfo.length - 1].threats;

    if (threats.includes(currentKing)) {
        if (real) {
            currentKing === 'WK' ? whiteKingInCheck = true : blackKingInCheck = true;
            return true;
        }
        return true;
    }

    return false;
}

function isOpponentKingInCheck(color, currentPlayerInfo, real = false) {

    let opponentKing = color === 'white' ? 'BK' : 'WK';
    let attacks = currentPlayerInfo[currentPlayerInfo.length - 1].attacks;

    if (attacks.includes(opponentKing)) {
        if (real) {
            opponentKing === 'WK' ? whiteKingInCheck = true : blackKingInCheck = true;
            return true;
        }
        return true;
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
    if (piece.includes('PromotedPawn')) piece = piece.split('PromotedPawn')[0];

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

function getRowAndColumn(square) {
    const column = square.charCodeAt(0) - 97
    const row = parseInt(square[1]);
    return [row, column];
}

// these functions are all from whites perspective
// when i have to implement black perspective where these are called i guess i will just reverse the row and column
// or implement up, down, left, right checking current player color
function getUpSquare(currentSquareName) {
    if (currentSquareName[1] === '8') return null;
    const [row, column] = getRowAndColumn(currentSquareName);
    return boardLetters[column] + (row + 1);
}

function getDownSquare(currentSquareName) {
    if (currentSquareName[1] === '1') return null;
    const [row, column] = getRowAndColumn(currentSquareName);
    return boardLetters[column] + (row - 1);
}

function getLeftSquare(currentSquareName) {
    if (currentSquareName[0] === 'a') return null;
    const [row, column] = getRowAndColumn(currentSquareName);
    return boardLetters[column - 1] + row;
}

function getRightSquare(currentSquareName) {
    if (currentSquareName[0] === 'h') return null;
    const [row, column] = getRowAndColumn(currentSquareName);
    return boardLetters[column + 1] + row;
}

export function getLegalMoves(squareName, piece, boardArray, currentPlayer) {
    const pieceColor = getPieceColor(piece);
    if (pieceColor !== currentPlayer) {
        return [];
    }
    const legalMoves = getValidMoves(piece, squareName, boardArray, true);
    return legalMoves;
}