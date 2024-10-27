const chessboard = document.getElementById('chessboard');

const allPieces = loadPieces();

const board = createChessBoard();

startingPosition(board, allPieces);

buildBoard(board);

let currentPlayer = document.getElementById('player');
currentPlayer.innerHTML = 'White';

const piece = document.querySelectorAll('.piece');

chessboard.addEventListener('contextmenu', event => event.preventDefault());
// disabling context menu so right clicking on square isnt weird


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

let selectedPiece = null;
let selectedPieceLegalMoves = [];
let highlighedSquares = [];

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

function handlePieceEvent(clickedSquare) {
    const clickedPiece = clickedSquare.firstChild;

    if (clickedPiece && checkPlayerTurn(clickedPiece)) { // if clicked piece is a piece and it is the current player's turn select it
        selectPieceHandler(clickedPiece);

        if (selectedPiece) {// if there is a selected piece, get legal moves for it
            getPieceMoveSet(); // get legal moves for selected piece
            showLegalMovesSquares(); // highlight legal moves for selected piece
            unHighlightSquare(); // unhighlight other squares
            highlightSquare(clickedSquare); // highlight selected piece square 
        }
    } else {
        // if clicked on a square and there is a selected piece, go to move piece handler to see if it is a legal move
        movePieceHandler(clickedSquare);
        // highlightSquare(clickedSquare);
    }


}

function checkPlayerTurn(clickedPiece) {
    let clickedPieceColor;

    clickedPieceColor = clickedPiece.id.includes('White') ? 'White' : 'Black'

    if (currentPlayer.innerHTML == clickedPieceColor) {
        return true;
    } else {
        return false;
    }

}

function selectPieceHandler(clickedPiece) {
    // if clicked piece is the same as the selected piece, deselect it
    if (clickedPiece === selectedPiece) {
        selectedPiece = null;
    } else {
        // if clicked piece is not the same as the selected piece, select it
        selectedPiece = clickedPiece;
    }
    unHighlightSquare();
    hideLegalMovesSquares();


}

function getPieceMoveSet() {
    const clickedPieceInfo = selectedPiece.id.split('-');
    const clickedPieceColor = clickedPieceInfo[0];
    const clickedPieceName = clickedPieceInfo[1];

    const selectedPieceSquare = selectedPiece.parentElement.id;

    let moves;

    switch (clickedPieceName) {
        case 'Pawn':
            moves = pawnMoves(selectedPieceSquare, clickedPieceColor);
            break;
        case 'Rook':
            moves = rookMoves(selectedPieceSquare, clickedPieceColor);
            break;
        case 'Knight':
            knightMoves(selectedPieceSquare, clickedPieceColor);
            break;
        case 'Bishop':
            bishopMoves(selectedPieceSquare, clickedPieceColor);
            break;
        case 'Queen':
            queenMoves(selectedPieceSquare, clickedPieceColor);
            break;
        case 'King':
            kingMoves(selectedPieceSquare, clickedPieceColor);
            break;
    }

    selectedPieceLegalMoves = moves;
}

function movePieceHandler(clickedSquare) {
    if (selectedPiece) { // if there is a selected piece

        if (selectedPieceLegalMoves.includes(clickedSquare)) {// if clicked square is a legal move for selected piece...
            highlightSquare(clickedSquare);
            if (clickedSquare.hasChildNodes()) { // if clicked square has an opponent piece
                clickedSquare.replaceChildren(selectedPiece);
            } else {
                // free to move selected piece to clicked square if legal
                clickedSquare.replaceChildren(selectedPiece);
            }

            selectedPiece = null;
            playerTurnChange();
        } else {
            // if clicked square is not a legal move for selected piece, deselect the piece
            selectedPiece = null;
            selectedPieceLegalMoves = [];
            hideLegalMovesSquares();
            unHighlightSquare();
        }

    }
    hideLegalMovesSquares();

}



function playerTurnChange() {
    if (currentPlayer.innerHTML === 'White') {
        currentPlayer.innerHTML = 'Black'
    } else {
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

function pawnMoves(selectedPieceSquare, clickedPieceColor) {
    let legalSquares = []

    squareLetter = selectedPieceSquare[0];
    squareNumber = parseInt(selectedPieceSquare[1]);

    let pieceInFront = null;

    if (clickedPieceColor === 'White') {

        if (squareNumber !== 8) {
            pieceInFront = document.getElementById(`${squareLetter}${squareNumber + 1}`).firstChild;

            leftDiagonal = squareLetter !== 'a' && document.getElementById(leftLetterBy(1) + (squareNumber + 1));
            rightDiagonal = squareLetter !== 'h' && document.getElementById(rightLetterBy(1) + (squareNumber + 1));
        } else {
            console.log('Promote Pawn')
        }

        if (!pieceInFront) {
            if (squareNumber === 2) {
                legalSquares.push(`${squareLetter}${squareNumber + 1}`);
                legalSquares.push(`${squareLetter}${squareNumber + 2}`);
            } else {
                legalSquares.push(squareLetter + (squareNumber + 1))
            }
        }

    }

    if (clickedPieceColor === 'Black') {

        if (squareNumber !== 1) {
            pieceInFront = document.getElementById(`${squareLetter}${squareNumber - 1}`).firstChild;

            leftDiagonal = squareLetter !== 'a' && document.getElementById(leftLetterBy(1) + (squareNumber - 1));
            rightDiagonal = squareLetter !== 'h' && document.getElementById(rightLetterBy(1) + (squareNumber - 1));
        } else {
            console.log('Promote Pawn')
        }

        if (!pieceInFront) {
            if (squareNumber === 7) {
                legalSquares.push(`${squareLetter}${squareNumber - 1}`);
                legalSquares.push(`${squareLetter}${squareNumber - 2}`);
            }
            else {
                legalSquares.push(squareLetter + (squareNumber - 1))
            }
        }
    }

    if (leftDiagonal.firstChild && leftDiagonal.firstChild.id.split('-')[0] !== clickedPieceColor) {
        legalSquares.push(leftDiagonal.id);
    }

    if (rightDiagonal.firstChild && rightDiagonal.firstChild.id.split('-')[0] !== clickedPieceColor) {
        legalSquares.push(rightDiagonal.id);
    }

    return legalSquares.map(move => document.getElementById(move));

}

function rookMoves(selectedPieceSquare, clickedPieceColor) {
    const squareLetter = selectedPieceSquare[0];
    const squareNumber = parseInt(selectedPieceSquare[1]);
    let moves = [];

    getVerticalMoves(1);  // Move up
    getVerticalMoves(-1); // Move down

    function getVerticalMoves(direction) {
        for (let i = squareNumber + direction; i >= 1 && i <= 8; i += direction) {
            const square = document.getElementById(squareLetter + i);
            const piece = square.firstChild;

            if (piece) {
                const pieceColor = piece.id.split('-')[0];
                if (pieceColor !== clickedPieceColor) moves.push(square);
                break;
            } else {
                moves.push(square);
            }
        }
    }

    getHorizontalMoves(-1); // Move left
    getHorizontalMoves(1); // Move right

    function getHorizontalMoves(direction) {
        for (let i = boardLetters.indexOf(squareLetter) + direction; i >= 0 && i <= 7; i += direction) {
            const square = document.getElementById(boardLetters[i] + squareNumber);
            const piece = square.firstChild;

            if (piece) {
                const pieceColor = piece.id.split('-')[0];
                if (pieceColor !== clickedPieceColor) moves.push(square);
                break;
            } else {
                moves.push(square);
            }
        }

    }
    return moves;
}

function knightMoves(selectedPieceSquare, clickedPieceColor) {

}

function bishopMoves(selectedPieceSquare, clickedPieceColor) {

}

function queenMoves(selectedPieceSquare, clickedPieceColor) {

}

function kingMoves(selectedPieceSquare, clickedPieceColor) {

}

function showLegalMovesSquares() {
    selectedPieceLegalMoves.forEach(square => {
        square.hasChildNodes() ? square.classList.add('capture-hint') : square.classList.add('legal-move');
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

