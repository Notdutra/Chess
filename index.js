const chessboard = document.getElementById('chessboard');

const allPieces = loadPieces();

const board = createChessBoard();

startingPosition(board, allPieces);

buildBoard(board);

let currentPlayer = document.getElementById('player');
currentPlayer.innerHTML = 'White';

const piece = document.querySelectorAll('.piece');

// disabling context menu so right clicking on square isnt weird
chessboard.addEventListener('contextmenu', event => event.preventDefault());


// BOARD SECTION START

function createChessBoard() {
    let board = [];

    for (let rowIndex = 1; rowIndex <= 8; rowIndex++) { // Loops through 8 rows
        row = [];

        for (let columnIndex = 1; columnIndex <= 8; columnIndex++) { //Loops, in each row, 8 columns
            const square = document.createElement('div'); // create square div element
            square.classList.add('square', (rowIndex + columnIndex) % 2 === 0 ? 'dark' : 'light'); // adds the basic classes to the square el

            square.id = `${String.fromCharCode(96 + columnIndex)}${rowIndex}`;

            row.push(square);
        }

        board.unshift(row);
    }

    return board;
}

function buildBoard(board) {
    board.forEach(row => {
        chessboard.append(...row);
    });
}

function startingPosition(board, allPieces) {
    let idNum = 0;
    const whitePawnsRank = board[6];
    const whiteBackRank = board[7];

    for (let i = 0; i < whitePawnsRank.length; i++) {
        let piece = allPieces[0];
        piece.id = 'White-Pawn' + `-${(i + 1)}`;
        whitePawnsRank[i].append(piece.cloneNode(true));
    }

    for (let i = 0; i < whiteBackRank.length; i++) {
        let piece = allPieces[i + 1];
        piece.id += `-${(i + 1)}`;
        whiteBackRank[i].append(piece.cloneNode(true));
    }

    const blackBackRanks = board[0];
    const blackPawnsRank = board[1];

    for (let i = 0; i < blackBackRanks.length; i++) {
        let piece = allPieces[i + 10];
        piece.id += `-${(i + 1)}`;
        blackBackRanks[i].append(piece.cloneNode(true));
    }

    for (let i = 0; i < blackPawnsRank.length; i++) {
        let piece = allPieces[9];
        piece.id = 'Black-Pawn' + `-${(i + 1)}`;
        blackPawnsRank[i].append(piece.cloneNode(true));
    }
}

// BOARD SECTION END


// SQUARE SECTION START

const square = document.querySelectorAll('.square');
const pieceDiv = document.querySelectorAll('.piece-div');

let selectedPieceDiv = null;
let selectedPieceLegalMoves = [];
let highlighedSquares = [];

let whiteKingInCheck = false;
let blackKingInCheck = false;

let piecesAttackingWhiteKing = [];
let piecesAttackingBlackKing = [];

square.forEach(selectedSquare => {
    selectedSquare.addEventListener('click', () => {
        handlePieceEvent(selectedSquare);
    })

    selectedSquare.addEventListener('contextmenu', () => {
        selectedSquare.classList.toggle('highlight')
    })
})

// SQUARE SECTION END


// PIECE SECTION START

function handlePieceEvent(clickedSquareElement) {
    const clickedPieceDiv = clickedSquareElement.firstChild;

    if (clickedPieceDiv && checkPlayerTurn(clickedPieceDiv)) { // if clicked piece is a piece and it is the current player's turn select it
        selectPieceHandler(clickedPieceDiv);
        if (selectedPieceDiv) {// if there is a selected piece 
            if (kingInCheck()) {
                console.log('King is in check, make a move that gets it out of check');
                let allPossibleMoves = getAllPiecesMovementsOfColor(currentPlayer.innerHTML);
            } else {
                selectedPieceLegalMoves = getPieceMoveSetFromSquareElement(selectedPieceDiv); // get legal moves for selected piece
                showLegalMovesSquares(); // highlight legal moves for selected piece
                highlightSquare(clickedSquareElement); // highlight selected piece square 
            }
        }
    } else {
        // if clicked on a square and there is a selected piece, go to move piece handler to see if it is a legal move
        movePieceHandler(clickedSquareElement);
    }

}

function checkPlayerTurn(clickedPieceDiv) {
    let clickedPieceColor;

    clickedPieceColor = clickedPieceDiv.id.includes('White') ? 'White' : 'Black'

    if (currentPlayer.innerHTML == clickedPieceColor) {
        return true;
    } else {
        return false;
    }

}

function selectPieceHandler(clickedPieceDiv) {
    // if clicked piece is the same as the selected piece, deselect it
    if (clickedPieceDiv === selectedPieceDiv) {
        selectedPieceDiv = null;
    } else {
        // if clicked piece is not the same as the selected piece, select it
        selectedPieceDiv = clickedPieceDiv;
    }
    unHighlightSquare();
    hideLegalMovesSquares();
}


function clickedPieceIsOpponent(clickedSquareElement) {
    if (clickedSquareElement.firstChild) {
        if (clickedSquareElement.firstChild.id.includes(currentPlayer.innerHTML)) {
            return false;
        }
        return true;
    }

}

function movePieceHandler(clickedSquareElement) {
    if (selectedPieceDiv) { // if there is a selected piece

        if (selectedPieceLegalMoves.includes(clickedSquareElement)) {// if clicked square is a legal move for selected piece...
            highlightSquare(clickedSquareElement);
            if (clickedSquareElement.hasChildNodes() && clickedPieceIsOpponent(clickedSquareElement)) { // if clicked square has an opponent piece
                clickedSquareElement.replaceChildren(selectedPieceDiv);
            } else {
                // free to move selected piece to clicked square if legal
                clickedSquareElement.append(selectedPieceDiv);
            }

            // calculate current threats
            selectedPieceDiv = null;
            playerTurnChange(); // this has to be turned back on when the game is fully functional
        } else {
            selectedPieceDiv = null;
            unHighlightSquare();
        }

    }
    hideLegalMovesSquares();

}



function playerTurnChange() {
    if (currentPlayer.innerHTML === 'White') {
        if (kingInCheck()) { console.log('Black in Check'); }
        currentPlayer.innerHTML = 'Black'
    } else {
        if (kingInCheck()) { console.log('White in Check'); }
        currentPlayer.innerHTML = 'White';
    }
}

function loadPieces() {
    const nameOfPieces = ['P', 'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    const fullNameOfPieces = { 'P': 'Pawn', 'R': 'Rook', 'N': 'Knight', 'B': 'Bishop', 'Q': 'Queen', 'K': 'King' }

    let whitePieces = [];
    let blackPieces = [];

    nameOfPieces.forEach(pieceName => {
        const whitePieceDiv = document.createElement('div')
        const blackPieceDiv = document.createElement('div')

        whitePieceDiv.classList.add('piece-div');
        whitePieceDiv.id = `White-${fullNameOfPieces[pieceName]}`;

        blackPieceDiv.classList.add('piece-div');
        blackPieceDiv.id = `Black-${fullNameOfPieces[pieceName]}`;

        let whitePieceImg = document.createElement('img');
        let blackPieceImg = document.createElement('img');

        whitePieceImg.classList.add('piece', 'white');
        blackPieceImg.classList.add('piece', 'black');

        whitePieceImg.src = `./assets/pieces/W${pieceName}.png`;
        blackPieceImg.src = `./assets/pieces/B${pieceName}.png`;

        whitePieceDiv.append(whitePieceImg);
        blackPieceDiv.append(blackPieceImg);

        whitePieces.push(whitePieceDiv);
        blackPieces.push(blackPieceDiv);
    });

    const allPieces = [...whitePieces, ...blackPieces]

    return allPieces;

    /* White Pieces:
        Pawn - 0
        Left Rook - 1
        Left Knight - 2
        Left Bishop - 3
        Queen - 4
        King - 5
        Right Bishop - 6
        Right Knight - 7
        Right Rook - 8

        Black Pieces:
        Pawn - 9
        Rook - 10
        Knight - 11
        Bishop - 12
        Queen - 13
        King - 14
        Right Bishop - 15
        Right Knight - 16
        Right Rook - 17
    */
}

// PIECE SECTION END

// PIECE MOVEMENT SECTION START

const boardLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

let squareLetter;
let squareNumber;

const leftLetterBy = (num) => boardLetters[boardLetters.indexOf(squareLetter) - num];
const rightLetterBy = (num) => boardLetters[boardLetters.indexOf(squareLetter) + num];

const upNumberBy = (num) => squareNumber + num;
const downNumberBy = (num) => squareNumber - num;

const directionNumberBy = (direction, num) => squareNumber + direction * num; // 1 for up, -1 for down
const directionLetterBy = (direction, num) => boardLetters[boardLetters.indexOf(squareLetter) + direction * num]; // 1 for right, -1 for left

function getPieceMoveSetFromSquareElement(squareElement) {
    const aPieceId = squareElement.id;
    const aPieceName = getPieceNameFromId(aPieceId);
    const aPieceSquare = squareElement.parentElement.id;
    const aPieceColor = getPieceColorFromId(aPieceId);
    let moves;

    switch (aPieceName) {
        case 'Pawn':
            moves = pawnMoves(aPieceSquare, aPieceColor);
            break;
        case 'Rook':
            moves = rookMoves(aPieceSquare, aPieceColor);
            break;
        case 'Knight':
            moves = knightMoves(aPieceSquare, aPieceColor);
            break;
        case 'Bishop':
            moves = bishopMoves(aPieceSquare, aPieceColor);
            break;
        case 'Queen':
            moves = queenMoves(aPieceSquare, aPieceColor);
            break;
        case 'King':
            moves = kingMoves(aPieceSquare, aPieceColor);
            break;
    }

    let safeMove = moves.map(move => isMoveSafe(aPieceId, move.id));
    return moves;
}

function pawnMoves(aPieceSquare, aPieceColor) {
    squareLetter = aPieceSquare[0];
    squareNumber = parseInt(aPieceSquare[1]);
    let moves = [];

    const direction = aPieceColor === 'White' ? 1 : -1; // 1 for White (up), -1 for Black (down)
    const startingRow = aPieceColor === 'White' ? 2 : 7;
    const promotionRow = aPieceColor === 'White' ? 8 : 1;

    // Check for promotion row
    if (squareNumber === promotionRow) {
        console.log('Promote Pawn');
        return moves;
    }

    // Forward move by 1 square
    const squareInFront = document.getElementById(`${squareLetter}${squareNumber + direction}`);
    if (squareInFront && !squareInFront.firstChild) { // check if square exists and is empty
        moves.push(squareInFront);

        // Double move if pawn is on starting row
        if (squareNumber === startingRow) { // if pawn is on starting row
            const doubleSquareInFront = document.getElementById(`${squareLetter}${squareNumber + 2 * direction}`);
            if (doubleSquareInFront && !doubleSquareInFront.firstChild) { // check if square exists and is also empty
                moves.push(doubleSquareInFront);
            }
        }
    }

    // Check diagonal captures (left and right)
    const diagonals = [
        squareLetter !== 'a' && document.getElementById(directionLetterBy(-1, 1) + (squareNumber + direction)),
        squareLetter !== 'h' && document.getElementById(directionLetterBy(1, 1) + (squareNumber + direction))
    ];

    diagonals.forEach(diagonal => {
        if (diagonal?.firstChild && diagonal.firstChild.id.split('-')[0] !== aPieceColor) {
            moves.push(diagonal);
        }
    });
    return moves;
}

function rookMoves(aPieceSquare, aPieceColor) {
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

            const square = document.getElementById(letter + number);

            if (!addMoveOrCapture(square, moves, aPieceColor)) break;
        }
    });

    return moves;
}

function knightMoves(aPieceSquare, aPieceColor) {
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
        { numberDirection: 1, letterDirection: -2 }, // 1 up 2 left (Backwards L, 1 counter clockwise turn)

    ];

    directions.forEach(({ numberDirection, letterDirection }) => {
        const letter = directionLetterBy(letterDirection, 1);
        const number = directionNumberBy(numberDirection, 1);

        if (!letter || number < 1 || number > 8) return;

        const square = document.getElementById(letter + number);

        if (!addMoveOrCapture(square, moves, aPieceColor)) return;
    });

    return moves;

}

function bishopMoves(aPieceSquare, aPieceColor) {
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

            const square = document.getElementById(letter + number);

            if (!addMoveOrCapture(square, moves, aPieceColor)) break;
        }
    });

    return moves;
}

function queenMoves(aPieceSquare, aPieceColor) {
    let moves = [];
    moves.push(...rookMoves(aPieceSquare, aPieceColor));
    moves.push(...bishopMoves(aPieceSquare, aPieceColor));

    return moves;
}

function kingMoves(aPieceSquare, aPieceColor) {
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

        const square = document.getElementById(letter + number);

        if (!addMoveOrCapture(square, moves, aPieceColor)) return;
    });

    return moves;

}

// Helper function to add a move or capture to the moves array
function addMoveOrCapture(square, moves, aPieceColor) {
    const piece = square.firstChild;
    if (piece) {
        const pieceColor = getPieceColorFromId(piece.id);
        if (pieceColor !== aPieceColor) {
            moves.push(square); // Capture
        }
        return false; // Stop further moves in this direction
    } else {
        moves.push(square); // Regular move
        return true; // Continue checking moves in this direction
    }
}

function getAllPieceDivsOfColor(color) {
    let pieces = [];
    square.forEach(square => square.firstChild && square.firstChild.id.includes(color) ? pieces.push(square.firstChild) : null);
    return pieces;
}

// Helper function to check if a piece can capture
function possibleCaptureWithPieceId(aPieceId) {
    const piece = document.getElementById(aPieceId);
    const moves = getPieceMoveSetFromSquareElement(piece)
        .filter(square => square.firstChild); // Filter only squares with a piece on them

    moves.forEach(square => {
        const attackedPieceId = square.firstChild.id;
        if (getPieceNameFromId(attackedPieceId) === 'King') {
            const attackedColor = getPieceColorFromId(attackedPieceId);
            const attackingMove = { piece, attackedPieceId };
            if (attackedColor === 'White') {
                whiteKingInCheck = true;
                piecesAttackingWhiteKing.push(attackingMove);
            } else if (attackedColor === 'Black') {
                blackKingInCheck = true;
                piecesAttackingBlackKing.push(attackingMove);
            }
        }
    });

    return moves;
}

// Helper function to get all pieces movements of a specific color
function getAllPiecesMovementsOfColor(color) {
    const result = getAllPieceDivsOfColor(color)
        .map(piece => {
            const moves = getPieceMoveSetFromSquareElement(piece);
            return moves.length > 0 ? { piece, moves } : null;
        })
        .filter(moves => moves !== null);

    return result;
}

// Helper function to get all pieces captures of a specific color
function getAllPiecesCapturesOfColor(color) {
    const result = getAllPieceDivsOfColor(color)
        .map(piece => {
            const captures = possibleCaptureWithPieceId(piece.id);
            return captures.length > 0 ? { piece, captures } : null;
        })
        .filter(capture => capture !== null);  // Keep only entries with captures

    return result;
}

// Helper function to get all threatened pieces of a specific color
function allThreatenedPiecesOfColor(color) {
    let possibleCaptures = getAllPiecesCapturesOfColor(color);
    let threatenedPieces = [];

    possibleCaptures.forEach(capture => {
        capture.captures.forEach(square => {
            threatenedPieces.push(square.firstChild);
        });
    });

    return threatenedPieces;
}

// Helper function to check if a king is in check
function kingInCheck() {
    if (whiteKingInCheck || blackKingInCheck) { return true; }
    let color = currentPlayer.innerHTML;
    let threatenedPieces = allThreatenedPiecesOfColor(color);

    threatenedPieces.forEach(piece => {
        const pieceId = piece.id;
        return pieceId.includes('King') ? color === 'White' ? whiteKingInCheck = true : blackKingInCheck = true : null;
    });

    return whiteKingInCheck || blackKingInCheck;
}

function isMoveSafe(aPieceId, onSquareId) {
    let currentBoard = boardToSimpleNotation();
}

// Helper function to convert the board to a simple notation
function boardToSimpleNotation() {
    let boardAsList = [];
    square.forEach(square => {

        let piece = square.firstChild;
        if (piece) {
            let pieceId = piece.id;
            let squareId = square.id;
            boardAsList.push({ pieceId, squareId });
        } else {
            boardAsList.push({ pieceId: '', squareId: square.id });
        }
    });

    let board = [];
    for (let i = 0; i < 64; i += 8) {
        board.push(boardAsList.slice(i, i + 8));
    }

    return board;
}


// PIECE MOVEMENT SECTION END

// Random stuff 

function showLegalMovesSquares() {
    selectedPieceLegalMoves.forEach(square => {
        if (square) {
            square.hasChildNodes() ? square.classList.add('capture-hint') : square.classList.add('legal-move');
        }
    });
}

function hideLegalMovesSquares() {
    square.forEach(square => {
        square.firstChild && square.classList.remove('capture-hint');
        square.classList.remove('legal-move');
    })
}

function highlightSquare(square) {
    square.classList.add('highlight');
}

function unHighlightSquare() {
    square.forEach(square => {
        square.classList.remove('highlight');
    })
}

function getPieceNameFromId(pieceId) {
    return pieceId.split('-')[1];
}

function getPieceColorFromId(pieceId) {
    return pieceId.split('-')[0];

}

