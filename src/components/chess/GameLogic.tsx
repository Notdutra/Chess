import soundManager from '../../services/SoundManager';

const boardLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

let squareLetter: string;
let squareNumber: number;
let player: 'white' | 'black';

let whiteKingInCheck: boolean;
let blackKingInCheck: boolean;

let checkmate: boolean;
let stalemate: boolean;

let winner: string | undefined;

let enPassantStatus: false | any[] = false;

let moveHistory: any[] = [];
let undoneMoves: any[] = [];

// Export function to add move to history for castling validation
export function addMoveToHistory(move: {
  selectedPiece: string;
  origin: string;
  destination: string;
  currentPlayer: string;
  boardArray: string[][];
}) {
  moveHistory.push({
    ...move,
    whiteKingInCheck,
    blackKingInCheck,
    winner,
  });
}

// Export function to get current move history (for debugging)
export function getMoveHistory() {
  return moveHistory;
}

// New function that returns updated game state instead of calling setters
export function executeMove(
  fromSquare: string,
  toSquare: string,
  gameState: any,
  currentPlayer: string
): { updatedGameState: any; moveResult: any } | null {
  const selectedPiece = squareHasPiece(fromSquare, gameState.boardArray);
  if (!selectedPiece) {
    console.error('No piece found at fromSquare:', fromSquare);
    return null;
  }

  // Create copy of game state
  const updatedGameState = JSON.parse(JSON.stringify(gameState));
  const opponent = currentPlayer === 'white' ? 'black' : 'white';
  let preMoveBoard = updatedGameState.boardArray.map((row: any[]) =>
    row.slice()
  );
  let soundPlayed = false;
  let isCheck = false;
  let castlingMove = false;
  let moveType:
    | 'normal'
    | 'capture'
    | 'castle'
    | 'promotion'
    | 'check'
    | 'checkmate' = 'normal';

  // Check if it's a capture
  const targetPiece = squareHasPiece(toSquare, updatedGameState.boardArray);
  if (targetPiece) {
    moveType = 'capture';
  }

  // Castling logic
  if (selectedPiece && getPieceType(selectedPiece) === 'king') {
    const isWhite = selectedPiece === 'WK';
    const isBlack = selectedPiece === 'BK';
    const castleAttempt =
      (isWhite &&
        fromSquare === 'e1' &&
        (toSquare === 'g1' || toSquare === 'c1')) ||
      (isBlack &&
        fromSquare === 'e8' &&
        (toSquare === 'g8' || toSquare === 'c8'));

    if (castleAttempt) {
      const status = castleKing(selectedPiece, updatedGameState.boardArray);
      if (status) {
        const wantsKingSide = toSquare === 'g1' || toSquare === 'g8';
        const wantsQueenSide = toSquare === 'c1' || toSquare === 'c8';
        const legalKingSide =
          (isWhite && status.includes('K')) ||
          (isBlack && status.includes('k'));
        const legalQueenSide =
          (isWhite && status.includes('Q')) ||
          (isBlack && status.includes('q'));

        if (
          (wantsKingSide && legalKingSide) ||
          (wantsQueenSide && legalQueenSide)
        ) {
          castlingMove = true;
          moveType = 'castle';
          soundPlayed = true;

          // Move king
          preMoveBoard = movePiece(preMoveBoard, fromSquare, toSquare);

          // Move rook
          let rookFrom = '';
          let rookTo = '';
          if (toSquare === 'g1') {
            rookFrom = 'h1';
            rookTo = 'f1';
          } else if (toSquare === 'c1') {
            rookFrom = 'a1';
            rookTo = 'd1';
          } else if (toSquare === 'g8') {
            rookFrom = 'h8';
            rookTo = 'f8';
          } else if (toSquare === 'c8') {
            rookFrom = 'a8';
            rookTo = 'd8';
          }

          if (rookFrom && rookTo) {
            preMoveBoard = movePiece(preMoveBoard, rookFrom, rookTo);
          }
        } else {
          // Castling not allowed
          console.log('❌ Castling not allowed');
          return null;
        }
      } else {
        // Castling not allowed
        console.log('❌ Castling not allowed - validation failed');
        return null;
      }
    }
  }

  if (!castlingMove) {
    preMoveBoard = movePiece(preMoveBoard, fromSquare, toSquare);
  }

  // Handle pawn promotion
  if (selectedPiece && getPieceType(selectedPiece) === 'pawn') {
    const promotionBoard = promotePawnHandler(
      selectedPiece,
      toSquare,
      preMoveBoard
    );
    if (promotionBoard) {
      preMoveBoard = promotionBoard;
      moveType = 'promotion';
    }
    pawnEnPassantHandler(selectedPiece, toSquare, preMoveBoard);
  }

  // Update board in game state
  updatedGameState.boardArray = preMoveBoard;

  // Update other game state properties
  updatedGameState.selectedSquare = null;
  updatedGameState.validMoves = [];
  updatedGameState.highlightedSquares = [];
  updatedGameState.currentPlayer = opponent;
  updatedGameState.lastMoves = [fromSquare, toSquare];

  // Add to move history
  addMoveToHistory({
    selectedPiece,
    origin: fromSquare,
    destination: toSquare,
    currentPlayer,
    boardArray: preMoveBoard,
  });

  // Check for check/checkmate
  const currentPlayerInfo = getPlayerInfo(preMoveBoard, currentPlayer);
  isCheck = isOpponentKingInCheck(currentPlayer, currentPlayerInfo, true);
  const isCheckMate = isCheckmate(preMoveBoard);

  if (isCheck && !isCheckMate) {
    moveType = 'check';
  } else if (isCheckMate) {
    moveType = 'checkmate';
  }

  const moveResult = {
    moveType,
    selectedPiece,
    fromSquare,
    toSquare,
    targetPiece,
    isCheck,
    isCheckMate,
    castlingMove,
  };

  return { updatedGameState, moveResult };
}

let halfMoveCounter: number = 0;
let fullMoveCounter: number = 1;

let lastMoves: string[] = [];

export function createStartingPositionBoardArray(): string[][] {
  return [
    ['BR1', 'BN1', 'BB1', 'BQ', 'BK', 'BB2', 'BN2', 'BR2'],
    ['BP1', 'BP2', 'BP3', 'BP4', 'BP5', 'BP6', 'BP7', 'BP8'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['WP1', 'WP2', 'WP3', 'WP4', 'WP5', 'WP6', 'WP7', 'WP8'],
    ['WR1', 'WN1', 'WB1', 'WQ', 'WK', 'WB2', 'WN2', 'WR2'],
  ] as string[][];
}

let possibleMoves: string[] = [];

export function handleSquareClick(clickedSquare: string, gameState: any) {
  if (checkmate || stalemate) return;
  const {
    selectedSquare,
    currentPlayer,
    boardArray,
    setSelectedSquare,
    setBoardArray,
    setCurrentPlayer,
    botPlaying,
  } = gameState;
  player = currentPlayer;
  let piece = squareHasPiece(clickedSquare, boardArray);
  // ...existing code...

  let pieceColor = piece ? getPieceColor(piece) : null;
  const currentPlayerInfo = getPlayerInfo(boardArray, currentPlayer);
  isBoardInCheck(currentPlayer, currentPlayerInfo, true);

  if (
    !botPlaying &&
    piece &&
    pieceColor === currentPlayer &&
    selectedSquare !== clickedSquare
  ) {
    const pieceType = getPieceType(piece);
    hideLegalMovesSquares();
    setSelectedSquare(clickedSquare);
    possibleMoves = getValidMoves(piece, clickedSquare, boardArray, false);
    if (enPassantStatus !== false && pieceType === 'pawn') {
      const [, , , attackSquare, attackPawn] = enPassantStatus;
      if (attackPawn.includes(piece)) {
        possibleMoves.push(attackSquare);
      }
    } else if (pieceType === 'king') {
      castleKing(piece, boardArray);
    }
    if (possibleMoves.length !== 0) {
      showLegalMovesSquares(possibleMoves, boardArray);
    } else if (
      (currentPlayer === 'white' && whiteKingInCheck) ||
      (currentPlayer === 'black' && blackKingInCheck)
    ) {
      soundManager.play('illegalMove');
      setSelectedSquare(null);
    }
  } else if (
    (selectedSquare &&
      possibleMoves.length > 0 &&
      possibleMoves.includes(clickedSquare)) ||
    botPlaying
  ) {
    handleMoveExecution(
      clickedSquare,
      selectedSquare,
      boardArray,
      setBoardArray,
      setSelectedSquare,
      setCurrentPlayer,
      currentPlayer
    );
    if (enPassantStatus && clickedSquare !== enPassantStatus[1])
      enPassantStatus = false;
  } else {
    setSelectedSquare(null);
    // hideLegalMovesSquares();
  }
}

export function handleMoveExecution(
  clickedSquare: string,
  selectedSquare: string,
  boardArray: string[][],
  setBoardArray: (b: string[][]) => void,
  setSelectedSquare: (s: string | null) => void,
  setCurrentPlayer: (p: string) => void,
  currentPlayer: string,
  botPlaying = false
): void {
  lastMoves = [selectedSquare, clickedSquare];
  halfMoveCounter++;
  const selectedPiece = squareHasPiece(selectedSquare, boardArray);

  const opponent = currentPlayer === 'white' ? 'black' : 'white';
  let preMoveBoard = boardArray.map((row) => row.slice());
  let soundPlayed = false;
  let isCheck = false;
  let castlingMove = false;

  // Castling logic: if king moves to a castling square, move rook as well
  if (selectedPiece && getPieceType(selectedPiece) === 'king') {
    // Detect a castling attempt by king moving two files from its starting square
    const isWhite = selectedPiece === 'WK';
    const isBlack = selectedPiece === 'BK';
    const from = selectedSquare;
    const to = clickedSquare;
    const castleAttempt =
      (isWhite && from === 'e1' && (to === 'g1' || to === 'c1')) ||
      (isBlack && from === 'e8' && (to === 'g8' || to === 'c8'));

    if (castleAttempt) {
      // Re-evaluate castle legality at execution time (don't rely solely on precomputed possibleMoves)
      const status = castleKing(selectedPiece, boardArray); // returns string like 'KQ', 'K', 'Q', etc. or false
      if (status) {
        const wantsKingSide = to === 'g1' || to === 'g8';
        const wantsQueenSide = to === 'c1' || to === 'c8';
        const legalKingSide =
          (isWhite && status.includes('K')) ||
          (isBlack && status.includes('k'));
        const legalQueenSide =
          (isWhite && status.includes('Q')) ||
          (isBlack && status.includes('q'));

        if (
          (wantsKingSide && legalKingSide) ||
          (wantsQueenSide && legalQueenSide)
        ) {
          castlingMove = true;
          soundManager.play('castle');
          soundPlayed = true;

          // Move king
          preMoveBoard = movePiece(preMoveBoard, from, to);

          // Determine rook movement
          let rookFrom = '';
          let rookTo = '';
          if (to === 'g1') {
            rookFrom = 'h1';
            rookTo = 'f1';
          } else if (to === 'c1') {
            rookFrom = 'a1';
            rookTo = 'd1';
          } else if (to === 'g8') {
            rookFrom = 'h8';
            rookTo = 'f8';
          } else if (to === 'c8') {
            rookFrom = 'a8';
            rookTo = 'd8';
          }

          if (rookFrom && rookTo) {
            preMoveBoard = movePiece(preMoveBoard, rookFrom, rookTo);
          }
        }
      }
    }
  }
  if (!castlingMove) {
    preMoveBoard = movePiece(preMoveBoard, selectedSquare, clickedSquare);
  }
  setBoardArray(preMoveBoard);
  const opponentPlayerInfo = getPlayerInfo(preMoveBoard, opponent);
  let currentPlayerInfo = getPlayerInfo(preMoveBoard, currentPlayer);

  if (selectedPiece && getPieceType(selectedPiece) === 'pawn') {
    halfMoveCounter = 0;
    const promotionBoard = promotePawnHandler(
      selectedPiece,
      clickedSquare,
      preMoveBoard
    );
    if (promotionBoard) {
      setBoardArray(promotionBoard);
      currentPlayerInfo = getPlayerInfo(promotionBoard, currentPlayer);
    }
    pawnEnPassantHandler(selectedPiece, clickedSquare, preMoveBoard);
  }

  isCheck = isOpponentKingInCheck(currentPlayer, currentPlayerInfo, true);
  const isCheckMate = isCheckmate(preMoveBoard);

  if (isCheck && !isCheckMate) {
    soundManager.play('check');
    soundPlayed = true;
  } else if (
    selectedPiece &&
    getPieceType(selectedPiece) === 'pawn' &&
    (clickedSquare[1] === '8' || clickedSquare[1] === '1')
  ) {
    soundManager.play('promote');
    soundPlayed = true;
  }

  if (!soundPlayed) {
    if (squareHasPiece(clickedSquare, boardArray)) {
      halfMoveCounter = 0;
      soundManager.play('capture');
    } else {
      soundManager.play(
        currentPlayer === 'white' ? 'playerMove' : 'opponentMove'
      );
    }
  }

  moveHistory.push({
    boardArray: JSON.parse(JSON.stringify(boardArray)),
    currentPlayer,
    selectedPiece,
    origin: selectedSquare,
    destination: clickedSquare,
    whiteKingInCheck,
    blackKingInCheck,
    winner,
  });

  undoneMoves = [];

  isStalemate(opponentPlayerInfo, preMoveBoard);

  checkGameStatus();
  setCurrentPlayer(changeCurrentPlayer(currentPlayer));
  setSelectedSquare(null);
  hideLegalMovesSquares();
}

export function kingCastlingLogic(king: string) {
  const rookQueenSide = king === 'WK' ? 'WR1' : 'BR1';
  const rookKingSide = king === 'WK' ? 'WR2' : 'BR2';

  const queenSideCastle = king === 'WK' ? 'Q' : 'q';
  const kingSideCastle = king === 'WK' ? 'K' : 'k';

  const kingMoves = moveHistory.filter((moves) => moves.selectedPiece === king);

  // Castling check for king and rooks

  if (kingMoves.length > 0) {
    return '';
  }

  let kingCastling = '';

  const rookKingSideMoves = moveHistory.filter(
    (moves) => moves.selectedPiece === rookKingSide
  );

  // King-side rook moves: [count]
  if (rookKingSideMoves.length === 0) kingCastling += kingSideCastle;

  const rookQueenSideMoves = moveHistory.filter(
    (moves) => moves.selectedPiece === rookQueenSide
  );

  // Queen-side rook moves: [count]
  if (rookQueenSideMoves.length === 0) kingCastling += queenSideCastle;

  return kingCastling;
}

export function castleKing(king: string, boardArray: string[][]) {
  if (
    (king === 'WK' && whiteKingInCheck) ||
    (king === 'BK' && blackKingInCheck)
  )
    return false;
  const castleStatus = kingCastlingLogic(king);

  if (!castleStatus) return false;

  const kingSquare = getPiecePosition(king, boardArray);
  if (!kingSquare) return false;

  let queenSide: string | null = player === 'white' ? 'Q' : 'q';
  let kingSide: string | null = player === 'white' ? 'K' : 'k';

  if (!castleStatus.includes(kingSide)) {
    kingSide = null;
  }
  if (!castleStatus.includes(queenSide)) {
    queenSide = null;
  }

  if (castleStatus) {
    const squareIsEmptyAndSafe = (square: string) => {
      const piece = squareHasPiece(square, boardArray);
      return (
        !piece && isMoveSafe(king, boardArray, kingSquare, square, false, true)
      );
    };

    if (kingSide) {
      const bishopSquare = player === 'white' ? 'f1' : 'f8';
      const knightSquare = player === 'white' ? 'g1' : 'g8';

      let kingSideSquares = [bishopSquare, knightSquare];
      let kingSidePieces = kingSideSquares.map((square) =>
        squareIsEmptyAndSafe(square)
      );

      if (kingSidePieces.every((piece) => piece)) {
        const kingDestination = player === 'white' ? 'g1' : 'g8';
        possibleMoves.push(kingDestination);
      }
    }

    if (queenSide) {
      const knightSquare = player === 'white' ? 'b1' : 'b8';
      const bishopSquare = player === 'white' ? 'c1' : 'c8';
      const queenSquare = player === 'white' ? 'd1' : 'd8';

      let queenSideSquares = [knightSquare, bishopSquare, queenSquare];
      let queenSidePieces = queenSideSquares.map((square) =>
        squareIsEmptyAndSafe(square)
      );

      if (queenSidePieces.every((piece) => piece)) {
        const kingDestination = player === 'white' ? 'c1' : 'c8';
        possibleMoves.push(kingDestination);
      }
    }
  }

  return castleStatus;
}

export function undoLastMove(
  setBoardArray: (b: string[][]) => void,
  setCurrentPlayer: (p: string) => void,
  setSelectedSquare: (s: string | null) => void
): void {
  if (moveHistory.length === 0) return;

  const lastMove = moveHistory.pop();
  undoneMoves.push({
    boardArray: JSON.parse(JSON.stringify(lastMove.boardArray)),
    currentPlayer: lastMove.currentPlayer,
    selectedPiece: lastMove.selectedPiece,
    origin: lastMove.origin,
    destination: lastMove.destination,
    whiteKingInCheck: lastMove.whiteKingInCheck,
    blackKingInCheck: lastMove.blackKingInCheck,
    winner: lastMove.winner,
  });

  setBoardArray(lastMove.boardArray);
  setCurrentPlayer(lastMove.currentPlayer);
  setSelectedSquare(lastMove.origin);
  whiteKingInCheck = lastMove.whiteKingInCheck;
  blackKingInCheck = lastMove.blackKingInCheck;
  winner = lastMove.winner;
}

export function redoLastMove(
  setBoardArray: (b: string[][]) => void,
  setCurrentPlayer: (p: string) => void,
  setSelectedSquare: (s: string | null) => void
): void {
  if (undoneMoves.length === 0) return;

  const redoMove = undoneMoves.pop();
  moveHistory.push({
    boardArray: JSON.parse(JSON.stringify(redoMove.boardArray)),
    currentPlayer: redoMove.currentPlayer,
    selectedPiece: redoMove.selectedPiece,
    origin: redoMove.origin,
    destination: redoMove.destination,
    whiteKingInCheck: redoMove.whiteKingInCheck,
    blackKingInCheck: redoMove.blackKingInCheck,
    winner: redoMove.winner,
  });

  setBoardArray(redoMove.boardArray);
  setCurrentPlayer(redoMove.currentPlayer);
  setSelectedSquare(redoMove.origin);
  whiteKingInCheck = redoMove.whiteKingInCheck;
  blackKingInCheck = redoMove.blackKingInCheck;
  winner = redoMove.winner;
}

function checkGameStatus() {
  if (checkmate) {
    // ...existing code...
    soundManager.play('check');
    setTimeout(() => {
      soundManager.play('gameEnd');
    }, 100); // Short delay to ensure both sounds play almost simultaneously
    endGame('checkmate');
  } else if (stalemate) {
    soundManager.play('gameEnd');
    endGame('stalemate');
    return true;
  }
  return false;
}

function getAllSafeMovesForPlayer(pieceInfo: any[], boardArray: string[][]) {
  let infoCopy = pieceInfo.slice();
  infoCopy.pop();

  let allSafeMoves: { piece: string; safeMoves: string[] }[] = [];

  infoCopy.forEach((info) => {
    let piece = info.piece;
    let position = info.position;
    if (piece && position) {
      let safeMoves = getValidMoves(piece, position, boardArray, false);
      if (safeMoves.length !== 0) {
        allSafeMoves.push({ piece: piece, safeMoves: safeMoves });
      }
    }
  });

  return allSafeMoves;
}

// Find piece position from the board array instead of DOM
function getPiecePosition(
  piece: string,
  boardArray?: string[][]
): string | null {
  // If no boardArray is provided, we cannot determine the position
  if (!boardArray) {
    console.error('No board array provided to getPiecePosition');
    return null;
  }

  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      if (boardArray[rank][file] === piece) {
        const fileChar = String.fromCharCode('a'.charCodeAt(0) + file);
        const rankNumber = 8 - rank;
        return `${fileChar}${rankNumber}`;
      }
    }
  }
  return null;
}

function endGame(type: string) {
  if (type === 'checkmate') {
    // ...existing code...
  } else if (type === 'stalemate') {
    // ...existing code...
  }
}

// Helper function to simulate a move and check if the king is in check
function isMoveSafe(
  piece: string,
  boardArray: string[][],
  from: string,
  to: string,
  real = false,
  skipCastling = false
): boolean {
  const color = getPieceColor(piece);

  // Simulate the move
  let newBoardArray = movePiece(boardArray, from, to);
  // Check if our king is in check after the move
  const simulatedMovesPieceInfoCurrent = getPlayerInfo(
    newBoardArray,
    color,
    skipCastling
  );
  let ourKingInCheck = isOurKingInCheck(
    color,
    simulatedMovesPieceInfoCurrent,
    real
  );

  return !ourKingInCheck;
}

export function getValidMoves(
  piece: string,
  position: string,
  boardArray: string[][],
  real = false,
  skipCastling = false
): string[] {
  const possibleMoves = getPossibleMoves(
    piece,
    position,
    boardArray,
    false,
    skipCastling
  );
  let safeMoves = possibleMoves.filter((move) =>
    isMoveSafe(piece, boardArray, position, move, real, true)
  );
  return safeMoves;
}

const directionLetterBy = (direction: number, num: number): string | null => {
  const index = boardLetters.indexOf(squareLetter) + direction * num;
  return boardLetters[index] || null;
};

const directionNumberBy = (direction: number, num: number): number | null => {
  const newNumber = squareNumber + direction * num;
  return newNumber >= 1 && newNumber <= 8 ? newNumber : null;
};

export function getPossibleMoves(
  piece: string,
  position: string,
  boardArray: string[][],
  allowPromotion = false,
  skipCastling = false
): string[] {
  squareLetter = position[0];
  squareNumber = parseInt(position[1]);
  let moves: string[] = [];

  const pieceType = getPieceType(piece);
  const pieceColor = getPieceColor(piece);

  switch (pieceType) {
    case 'pawn':
      moves = pawnMoves(
        piece,
        position,
        pieceColor,
        boardArray,
        allowPromotion
      );
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
      moves = kingMoves(position, pieceColor, boardArray, false, skipCastling);
      break;
  }

  return moves;
}

function getCoverMoves(
  piece: string,
  position: string,
  boardArray: string[][],
  allowPromotion = false
): string[] | undefined {
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
      return kingMoves(position, pieceColor, boardArray, true, true);
  }
}

function pawnEnPassantHandler(
  selectedPiece: string,
  toSquare: string,
  boardArray: string[][]
) {
  if (enPassantStatus !== false) {
    const [, enPassantSquare, , attackSquare, attackPawn] = enPassantStatus;

    if (attackPawn.includes(selectedPiece) && attackSquare === toSquare) {
      const [targetRow, targetCol] = getRowAndColumn(enPassantSquare);
      boardArray[8 - targetRow][targetCol] = '';
      const fromPos = getPiecePosition(selectedPiece, boardArray);
      if (fromPos) {
        boardArray = movePiece(boardArray, fromPos, toSquare);
      }
    }
  }

  let attackPawn = [];

  const color = getPieceColor(selectedPiece);

  const fromSquare = getPiecePosition(selectedPiece, boardArray);
  if (!fromSquare) return false;

  const [fromRow] = getRowAndColumn(fromSquare);
  const [toRow] = getRowAndColumn(toSquare);

  const startingRow = color === 'white' ? 2 : 7;
  const doubleMoveRow = color === 'white' ? 4 : 5;

  if (fromRow == startingRow && toRow == doubleMoveRow) {
    const leftSquare = getLeftSquare(toSquare);
    const rightSquare = getRightSquare(toSquare);

    const leftPiece = leftSquare
      ? document.getElementById(leftSquare)?.firstElementChild?.id || null
      : null;
    const rightPiece = rightSquare
      ? document.getElementById(rightSquare)?.firstElementChild?.id || null
      : null;

    if (leftPiece) {
      if (
        getPieceType(leftPiece) === 'pawn' &&
        getPieceColor(leftPiece) !== color
      ) {
        attackPawn.push(leftPiece);
      }
    }

    if (rightPiece) {
      if (
        getPieceType(rightPiece) === 'pawn' &&
        getPieceColor(rightPiece) !== color
      ) {
        attackPawn.push(rightPiece);
      }
    }

    const enPassantPieceParent =
      document.getElementById(selectedPiece)?.parentElement;
    const attackSquare =
      color === 'white' ? getDownSquare(toSquare) : getUpSquare(toSquare);

    if (attackPawn.length > 0) {
      enPassantStatus = [
        selectedPiece,
        toSquare,
        enPassantPieceParent,
        attackSquare,
        attackPawn,
      ];
      return true;
    } else {
      enPassantStatus = [
        selectedPiece,
        toSquare,
        enPassantPieceParent,
        attackSquare,
        [],
      ];
    }
  }
  return false;
}

function promotePawnHandler(
  selectedPiece: string,
  clickedSquare: string,
  preMoveBoard: string[][]
) {
  if (selectedPiece && getPieceType(selectedPiece) === 'pawn') {
    if (player === 'white' && clickedSquare[1] === '8') {
      return promotePawnTo(clickedSquare, preMoveBoard, 'Q');
    } else if (player === 'black' && clickedSquare[1] === '1') {
      return promotePawnTo(clickedSquare, preMoveBoard, 'Q');
    }
  }
  return false;
}

function promotePawnTo(
  clickedSquare: string,
  boardArray: string[][],
  newPiece: string | null = null
) {
  let finalPiece;
  let color = player === 'white' ? 'W' : 'B';

  switch (newPiece) {
    case 'R':
      finalPiece = color[0] + 'R';
      break;
    case 'B':
      finalPiece = color[0] + 'B';
      break;
    case 'N':
      finalPiece = color[0] + 'N';
      break;
    default:
      finalPiece = color[0] + 'Q-PromotedPawn';
      break;
  }
  const [row, column] = getRowAndColumn(clickedSquare);
  boardArray[8 - row][column] = finalPiece;

  return boardArray;
}

function pawnMoves(
  piece: string,
  position: string,
  aPieceColor: string,
  boardArray: string[][],
  allowPromotion = false
): string[] {
  squareLetter = position[0];
  squareNumber = parseInt(position[1]);
  let moves: string[] = [];

  const direction = aPieceColor === 'white' ? 1 : -1; // 1 for White (up), -1 for Black (down)
  const startingRow = aPieceColor === 'white' ? 2 : 7;
  const lastRow = aPieceColor === 'white' ? 8 : 1;
  if (squareNumber === lastRow) {
    return moves;
  }

  // Forward move by 1 square
  const squareInFront = `${squareLetter}${squareNumber + direction}`;
  if (
    squareInFront &&
    !boardArray[8 - (squareNumber + direction)][
      boardLetters.indexOf(squareLetter)
    ]
  ) {
    // check if square exists and is empty
    moves.push(squareInFront);

    // Double move if pawn is on starting row
    if (squareNumber === startingRow) {
      // if pawn is on starting row
      const doubleSquareInFront = `${squareLetter}${
        squareNumber + 2 * direction
      }`;
      if (
        doubleSquareInFront &&
        !boardArray[8 - (squareNumber + 2 * direction)][
          boardLetters.indexOf(squareLetter)
        ]
      ) {
        // check if square exists and is also empty
        moves.push(doubleSquareInFront);
      }
    }
  }

  // Check diagonal captures (left and right)
  const diagonals = [
    squareLetter !== 'a' &&
      `${directionLetterBy(-1, 1)}${squareNumber + direction}`,
    squareLetter !== 'h' &&
      `${directionLetterBy(1, 1)}${squareNumber + direction}`,
  ];

  diagonals.forEach((diagonal) => {
    if (diagonal) {
      const captureSquare =
        boardArray[8 - (squareNumber + direction)][
          boardLetters.indexOf(diagonal[0])
        ];
      if (captureSquare && isOpponentPiece(captureSquare, aPieceColor)) {
        if (!moves.includes(diagonal)) {
          // Avoid duplicate entries
          moves.push(diagonal);
        }
      }
    }
  });

  return moves;
}

function rookMoves(
  position: string,
  aPieceColor: string,
  boardArray: string[][],
  coverMoves = false
): string[] {
  squareLetter = position[0];
  squareNumber = parseInt(position[1]);
  let moves: string[] = [];

  // Define directions for rook: up, down, right, left
  const directions = [
    { letterDirection: 0, numberDirection: 1 }, // Up
    { letterDirection: 0, numberDirection: -1 }, // Down
    { letterDirection: 1, numberDirection: 0 }, // Right
    { letterDirection: -1, numberDirection: 0 }, // Left
  ];

  // Iterate over each direction
  directions.forEach(({ letterDirection, numberDirection }) => {
    for (let i = 1; i <= 7; i++) {
      const letter = directionLetterBy(letterDirection, i);
      const number = directionNumberBy(numberDirection, i);

      // Ensure we're within board bounds
      if (!letter || number === null || number < 1 || number > 8) break;

      const square = `${letter}${number}`;
      const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

      if (
        !addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves, coverMoves)
      )
        break;
    }
  });
  return moves;
}

function bishopMoves(
  position: string,
  aPieceColor: string,
  boardArray: string[][],
  coverMoves = false
): string[] {
  squareLetter = position[0];
  squareNumber = parseInt(position[1]);
  let moves: string[] = [];

  // Define diagonal directions: [up-right, up-left, down-right, down-left]
  const directions = [
    { letterDirection: 1, numberDirection: 1 },
    { letterDirection: -1, numberDirection: 1 },
    { letterDirection: 1, numberDirection: -1 },
    { letterDirection: -1, numberDirection: -1 },
  ];

  // Iterate over each diagonal direction
  directions.forEach(({ letterDirection, numberDirection }) => {
    for (let i = 1; i <= 7; i++) {
      const letter = directionLetterBy(letterDirection, i);
      const number = directionNumberBy(numberDirection, i);

      // Ensure we're within board bounds
      if (!letter || number === null || number < 1 || number > 8) break;

      const square = `${letter}${number}`;
      const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

      if (
        !addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves, coverMoves)
      )
        break;
    }
  });

  return moves;
}

function knightMoves(
  position: string,
  aPieceColor: string,
  boardArray: string[][],
  coverMoves = false
): string[] {
  squareLetter = position[0];
  squareNumber = parseInt(position[1]);
  let moves: string[] = [];

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

    if (!letter || number === null || number < 1 || number > 8) return;

    const square = `${letter}${number}`;
    const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

    addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves, coverMoves);
  });

  return moves;
}

function queenMoves(
  position: string,
  aPieceColor: string,
  boardArray: string[][],
  coverMoves = false
): string[] {
  let moves: string[] = [];
  moves.push(...rookMoves(position, aPieceColor, boardArray));
  moves.push(...bishopMoves(position, aPieceColor, boardArray));

  return moves;
}

function kingMoves(
  position: string,
  aPieceColor: string,
  boardArray: string[][],
  coverMoves = false,
  skipCastling = false
): string[] {
  squareLetter = position[0];
  squareNumber = parseInt(position[1]);
  let moves: string[] = [];

  const directions = [
    { letterDirection: 0, numberDirection: 1 }, // Up
    { letterDirection: 1, numberDirection: 1 }, // Up-Right
    { letterDirection: 1, numberDirection: 0 }, // Right
    { letterDirection: 1, numberDirection: -1 }, // Down-Right
    { letterDirection: 0, numberDirection: -1 }, // Down
    { letterDirection: -1, numberDirection: -1 }, // Down-Left
    { letterDirection: -1, numberDirection: 0 }, // Left
    { letterDirection: -1, numberDirection: 1 }, // Up-Left
  ];

  directions.forEach(({ letterDirection, numberDirection }) => {
    const letter = directionLetterBy(letterDirection, 1);
    const number = directionNumberBy(numberDirection, 1);

    if (!letter || number === null || number < 1 || number > 8) return;

    const square = `${letter}${number}`;
    const piece = boardArray[8 - number][boardLetters.indexOf(letter)];

    addMoveIfOpponentOrEmpty(square, piece, aPieceColor, moves, coverMoves);
  });

  // Integrate castling logic
  // Only add castling moves if not coverMoves and not skipCastling (i.e., real move generation, not threat map or safety check)
  if (!coverMoves && !skipCastling) {
    // Save current possibleMoves
    const prevPossibleMoves = possibleMoves;
    possibleMoves = [...moves];
    // Use the global player variable if available, else infer from aPieceColor
    const kingPiece = aPieceColor === 'white' ? 'WK' : 'BK';
    const prevPlayer = player;
    player = aPieceColor as 'white' | 'black';
    castleKing(kingPiece, boardArray);
    // Merge castling moves added to possibleMoves
    moves = Array.from(new Set([...moves, ...possibleMoves]));
    // Restore previous state
    possibleMoves = prevPossibleMoves;
    player = prevPlayer;
  }
  return moves;
}

function movePiece(
  boardArray: string[][],
  fromSquare: string,
  toSquare: string
): string[][] {
  let newBoardArray = boardArray.map((row) => row.slice());
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

function getPlayerInfo(
  boardArray: string[][],
  pieceColor: string,
  skipCastling = false
): any[] {
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
        const aPieceInfo = createPieceInfo(
          piece,
          aPosition,
          aPieceColor,
          boardArray,
          skipCastling
        );

        aPieceColor === pieceColor
          ? currentPlayerInfo.push(aPieceInfo)
          : opponentInfo.push(aPieceInfo);
      }
    }
  }

  const allPlayerAttackedSquares = sortSquares(
    currentPlayerInfo.flatMap((piece) => piece.attackSquares || [])
  );
  const allThreatenedSquares = sortSquares(
    opponentInfo.flatMap((piece) => piece.attackSquares || [])
  );

  const allAttackedPieces = currentPlayerInfo.flatMap(
    (piece) => piece.attacks || []
  );
  const allThreatenedPieces = opponentInfo.flatMap(
    (piece) => piece.attacks || []
  );

  currentPlayerInfo.forEach((pieceInfo: any) => {
    if (pieceInfo.piece === 'WK' || pieceInfo.piece === 'BK') {
      pieceInfo.moves = pieceInfo.moves.filter(
        (move: string) => !allThreatenedSquares.includes(move)
      );
    }
  });

  const generateStatusText = (
    player1: string,
    player2: string,
    attackedPieces: string[],
    threatenedPieces: string[]
  ) => ({
    attacks: `Pieces ${player1} can capture: ${attackedPieces}`,
    threats: `Pieces ${player1} could lose: ${threatenedPieces}`,
    attackSquares: `Squares ${player1} is defending: ${allPlayerAttackedSquares}`,
    threatenedSquares: `Squares ${player2} is defending: ${[
      allThreatenedSquares,
    ]}`,
  });

  const playerStatus = generateStatusText(
    currentColor,
    opponentColor,
    allAttackedPieces,
    allThreatenedPieces
  );

  currentPlayerInfo.push(playerStatus);

  return currentPlayerInfo;
}

function createPieceInfo(
  piece: string,
  position: string,
  pieceColor: string,
  boardArray: string[][],
  skipCastling = false
): any {
  const possibleMoves = getPossibleMoves(
    piece,
    position,
    boardArray,
    false,
    skipCastling
  );
  const moves = getMovesOnly(possibleMoves, boardArray);
  const captures = getCapturesOnly(pieceColor, possibleMoves, boardArray);
  const attacks = captures.map((square) => squareHasPiece(square, boardArray));
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

function getAttackedSquares(
  piece: string,
  position: string,
  boardArray: string[][]
): string[] | undefined {
  let attackedSquares: string[] = [];
  if (getPieceType(piece) === 'pawn') {
    attackedSquares = getAllPawnThreats(piece, position);
  } else {
    const cover = getCoverMoves(piece, position, boardArray, false);
    attackedSquares = cover ? cover : [];
  }
  return attackedSquares;
}

function sortSquares(squares: string[]): string[] {
  return squares.sort((a, b) => {
    const [aLetter, aNumber] = [a[0], parseInt(a[1])];
    const [bLetter, bNumber] = [b[0], parseInt(b[1])];

    if (aLetter === bLetter) {
      return aNumber - bNumber;
    }
    return aLetter.localeCompare(bLetter);
  });
}

function getAllPawnThreats(piece: string, position: string): string[] {
  const pieceColor = getPieceColor(piece);
  let [row, column] = getRowAndColumn(position);
  const letter = boardLetters[column];

  const direction = pieceColor === 'white' ? 1 : -1;

  const left = directionLetterBy(-1, 1);
  const right = directionLetterBy(1, 1);

  const leftDiagonal = `${left}${row + direction}`;
  const rightDiagonal = `${right}${row + direction}`;

  return letter === 'a'
    ? [rightDiagonal]
    : letter === 'h'
    ? [leftDiagonal]
    : [leftDiagonal, rightDiagonal];
}

function getMovesOnly(moves: string[], boardArray: string[][]): string[] {
  return moves.filter((square) => !squareHasPiece(square, boardArray));
}

function getCapturesOnly(
  color: string,
  moves: string[],
  boardArray: string[][]
): string[] {
  return moves.filter((square) =>
    squareHasOpponentPiece(color, square, boardArray)
  );
}

function addMoveIfOpponentOrEmpty(
  square: string,
  piece: string,
  clickedPieceColor: string,
  moves: string[],
  coverMoves = false
): boolean {
  if (!piece) {
    moves.push(square);
    return true; // Continue moving in this direction
  } else if (isOpponentPiece(piece, clickedPieceColor) || coverMoves) {
    moves.push(square);
    return false; // Stop moving in this direction after capturing an opponent piece or if we're looking for cover moves
  }
  return false; // Stop moving in this direction if it's our own piece and we're not looking for cover moves
}

function isOpponentPiece(piece: string, clickedPieceColor: string): boolean {
  return getPieceColor(piece) !== clickedPieceColor;
}

function squareHasPiece(
  squareName: string,
  boardArray: string[][]
): string | null {
  const [column, row] = squareName.split('');
  const columnNumber = boardLetters.indexOf(column);
  const rowNumber = 8 - Number(row);
  if (columnNumber < 0 || rowNumber < 0 || rowNumber > 7) return null;
  const piece = boardArray[rowNumber][columnNumber];
  return piece ? piece : null;
}

function squareHasOpponentPiece(
  color: string,
  squareName: string,
  boardArray: string[][]
): boolean {
  const piece = squareHasPiece(squareName, boardArray);
  return !!piece && getPieceColor(piece) !== color;
}

function isStalemate(
  currentPlayerInfo: any[],
  boardArray: string[][]
): boolean | undefined {
  if (stalemate) return true;
  if (halfMoveCounter >= 50) {
    soundManager.play('gameEnd');
    stalemate = true;
    endGame('stalemate');
    return;
  } else if (!blackKingInCheck && !whiteKingInCheck) {
    const currentPlayer = currentPlayerInfo.slice();
    const allPiecesSafeMoves = getAllSafeMovesForPlayer(
      currentPlayer,
      boardArray
    );
    const allSafeMoves = allPiecesSafeMoves.flatMap((item) => item.safeMoves);

    if (allSafeMoves.length === 0) {
      stalemate = true;
      return true;
    }
  }
}

function isCheckmate(boardArray: string[][]): boolean {
  if (checkmate) return true;
  if (blackKingInCheck || whiteKingInCheck) {
    const opponentColor = player === 'white' ? 'black' : 'white';
    const opponentInfo = getPlayerInfo(boardArray, opponentColor);
    const opponent = opponentInfo.slice();

    const allPiecesSafeMoves = getAllSafeMovesForPlayer(opponent, boardArray);
    const allSafeMoves = allPiecesSafeMoves.flatMap((item) => item.safeMoves);

    if (allSafeMoves.length === 0) {
      checkmate = true;
      winner = player;
      return true;
    }
  }

  return false;
}

function isBoardInCheck(
  color: string,
  currentPlayerInfo: any[],
  real = false
): boolean {
  const ourKing = isOurKingInCheck(color, currentPlayerInfo, real);
  const opponentKing = isOpponentKingInCheck(color, currentPlayerInfo, real);
  return ourKing || opponentKing;
}

function isOurKingInCheck(
  color: string,
  currentPlayerInfo: any[],
  real = false
): boolean {
  const currentKing = color === 'white' ? 'WK' : 'BK';
  const threats = currentPlayerInfo[currentPlayerInfo.length - 1].threats;

  if (!threats.includes(currentKing)) {
    if (real)
      currentKing === 'WK'
        ? (whiteKingInCheck = false)
        : (blackKingInCheck = false);
    return false;
  } else {
    if (real)
      currentKing === 'WK'
        ? (whiteKingInCheck = true)
        : (blackKingInCheck = true);
    return true;
  }
}

function isOpponentKingInCheck(
  color: string,
  currentPlayerInfo: any[],
  real = false
): boolean {
  let opponentKing = color === 'white' ? 'BK' : 'WK';
  let attacks = currentPlayerInfo[currentPlayerInfo.length - 1].attacks;

  if (!attacks.includes(opponentKing)) {
    if (real)
      opponentKing === 'BK'
        ? (blackKingInCheck = false)
        : (whiteKingInCheck = false);
    return false;
  } else {
    if (real)
      opponentKing === 'BK'
        ? (blackKingInCheck = true)
        : (whiteKingInCheck = true);
    return true;
  }
}

function hideLegalMovesSquares(): void {
  const squares = document.querySelectorAll('.legal-move, .capture-hint');
  squares.forEach((square) => {
    square.classList.remove('legal-move', 'capture-hint');
  });
}

function showLegalMovesSquares(
  squares: string[],
  boardArray: string[][]
): void {
  hideLegalMovesSquares();
  squares.forEach((squareName) => {
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

function getPieceColor(piece: string): string {
  if (piece[0] === 'W' || piece[0] === 'w') {
    return 'white';
  } else {
    return 'black';
  }
}

function getPieceType(piece: string): string {
  if (piece.includes('PromotedPawn')) piece = piece.split('PromotedPawn')[0];

  const pieces = {
    P: 'pawn',
    R: 'rook',
    N: 'knight',
    B: 'bishop',
    Q: 'queen',
    K: 'king',
  };

  // Only allow keys that are valid for the pieces object
  const key = piece[1] as keyof typeof pieces;
  if (piece.length <= 3 && Object.prototype.hasOwnProperty.call(pieces, key)) {
    return pieces[key];
  } else {
    return piece.split('-')[1];
  }
}

function changeCurrentPlayer(currentPlayer: string): string {
  if (currentPlayer === 'white') {
    return 'black';
  } else {
    fullMoveCounter++;
    return 'white';
  }
}

function getRowAndColumn(square: string): [number, number] {
  const column = square.charCodeAt(0) - 97;
  const row = parseInt(square[1]);
  return [row, column];
}

// these functions are all from whites perspective
// when i have to implement black perspective where these are called i guess i will just reverse the row and column
// or implement up, down, left, right checking current player color
function getUpSquare(currentSquareName: string): string | null {
  if (currentSquareName[1] === '8') return null;
  const [row, column] = getRowAndColumn(currentSquareName);
  return boardLetters[column] + (row + 1);
}

function getDownSquare(currentSquareName: string): string | null {
  if (currentSquareName[1] === '1') return null;
  const [row, column] = getRowAndColumn(currentSquareName);
  return boardLetters[column] + (row - 1);
}

function getLeftSquare(currentSquareName: string): string | null {
  if (currentSquareName[0] === 'a') return null;
  const [row, column] = getRowAndColumn(currentSquareName);
  return boardLetters[column - 1] + row;
}

function getRightSquare(currentSquareName: string): string | null {
  if (currentSquareName[0] === 'h') return null;
  const [row, column] = getRowAndColumn(currentSquareName);
  return boardLetters[column + 1] + row;
}

export function getLegalMoves(
  squareName: string,
  piece: string,
  boardArray: string[][],
  currentPlayer: string
): string[] {
  const pieceColor = getPieceColor(piece);
  if (pieceColor !== currentPlayer) {
    return [];
  }
  const legalMoves = getValidMoves(piece, squareName, boardArray, true);
  return legalMoves;
}

export function convertBoardArrayToFEN(
  boardArray: string[][],
  player: string
): string {
  let fen = '';
  const pieceMap = {
    W: {
      P: 'P',
      R: 'R',
      N: 'N',
      B: 'B',
      Q: 'Q',
      K: 'K',
    },
    B: {
      P: 'p',
      R: 'r',
      N: 'n',
      B: 'b',
      Q: 'q',
      K: 'k',
    },
  };

  fen = boardArray
    .map((row) => {
      let fenRow = '';
      let emptyCount = 0;

      for (let square of row) {
        if (square === '') {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fenRow += emptyCount;
            emptyCount = 0;
          }
          const color = square[0] as 'W' | 'B'; // First character: W or B
          const type = square[1] as keyof (typeof pieceMap)['W']; // Second character: P, R, N, etc.
          if (
            (color === 'W' || color === 'B') &&
            Object.prototype.hasOwnProperty.call(pieceMap[color], type)
          ) {
            fenRow += pieceMap[color][type];
          }
        }
      }

      if (emptyCount > 0) fenRow += emptyCount;
      return fenRow;
    })
    .join('/');

  const turn = player === 'white' ? 'w' : 'b';

  const whiteKingCastle = kingCastlingLogic('WK');
  const blackKingCastle = kingCastlingLogic('BK');

  let castling = '';
  castling += whiteKingCastle ? whiteKingCastle : '';
  castling += blackKingCastle ? blackKingCastle : '';

  if (castling === '') castling = '-';

  const enPassant = enPassantStatus ? enPassantStatus[3] : '-';
  const halfMove = halfMoveCounter;
  const fullMove = fullMoveCounter;

  fen += ` ${turn} ${castling} ${enPassant} ${halfMove} ${fullMove}`;

  return fen;
}
