import { Piece, PieceType, PieceColor } from './Piece';
import { Square } from './Square';
import { Move } from './Move';

export interface GameState {
  boardArray: (string | null)[][];
  currentPlayer: PieceColor;
  selectedSquare: string | null;
  whiteKingInCheck: boolean;
  blackKingInCheck: boolean;
  checkmate: boolean;
  stalemate: boolean;
  winner: PieceColor | null;
  enPassantStatus: EnPassantStatus | null;
  moveHistory: MoveRecord[];
  undoneMoves: MoveRecord[];
  highlightedSquares: string[];
  validMoves: string[];
  premoveSquares: string[]; // Squares that have been premovedto
  premovePositions: { [square: string]: string }; // Map of where pieces are visually positioned due to premoves (square -> piece)
  premoveOriginalPositions: { [square: string]: string }; // Map to track original positions of premoved pieces for reset (fromSquare -> piece)
  halfMoveCounter: number;
  fullMoveCounter: number;
  lastMoves: string[];
  gameMode: 'ai' | 'human' | 'online';
}

export interface EnPassantStatus {
  square: string;
  pawn: string;
}

export interface MoveRecord {
  boardArray: (string | null)[][];
  currentPlayer: PieceColor;
  selectedPiece: string | null;
  origin: string;
  destination: string;
  capturedPiece?: string;
  moveType?: 'normal' | 'capture' | 'castle' | 'promotion' | 'en-passant';
  whiteKingInCheck: boolean;
  blackKingInCheck: boolean;
  winner: PieceColor | null;
}

export const createInitialGameState = (): GameState => ({
  boardArray: [
    ['BR1', 'BN1', 'BB1', 'BQ', 'BK', 'BB2', 'BN2', 'BR2'],
    ['BP1', 'BP2', 'BP3', 'BP4', 'BP5', 'BP6', 'BP7', 'BP8'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['WP1', 'WP2', 'WP3', 'WP4', 'WP5', 'WP6', 'WP7', 'WP8'],
    ['WR1', 'WN1', 'WB1', 'WQ', 'WK', 'WB2', 'WN2', 'WR2'],
  ] as string[][],
  currentPlayer: 'white',
  selectedSquare: null,
  whiteKingInCheck: false,
  blackKingInCheck: false,
  checkmate: false,
  stalemate: false,
  winner: null,
  enPassantStatus: null,
  moveHistory: [],
  undoneMoves: [],
  highlightedSquares: [],
  validMoves: [],
  premoveSquares: [],
  premovePositions: {},
  premoveOriginalPositions: {},
  halfMoveCounter: 0,
  fullMoveCounter: 1,
  lastMoves: [],
  gameMode: 'ai', // Default to AI mode
});

export const getSquareFromPosition = (position: string): Square => {
  const file = position.charCodeAt(0) - 'a'.charCodeAt(0);
  const rank = 8 - parseInt(position[1]);
  return { file, rank };
};

export const getPositionFromSquare = (square: Square): string => {
  const file = String.fromCharCode('a'.charCodeAt(0) + square.file);
  const rank = 8 - square.rank;
  return `${file}${rank}`;
};

export const getPieceAtPosition = (
  position: string,
  boardArray: (string | null)[][]
): string | null => {
  const square = getSquareFromPosition(position);
  return boardArray[square.rank][square.file];
};

export const getPieceColor = (piece: string | null): PieceColor | null => {
  if (!piece) return null;
  return piece[0] === 'W' ? 'white' : 'black';
};

export const getPieceType = (piece: string | null): PieceType | null => {
  if (!piece) return null;

  if (piece.includes('PromotedPawn')) {
    piece = piece.split('PromotedPawn')[0];
  }

  const typeMap: Record<string, PieceType> = {
    P: 'pawn',
    R: 'rook',
    N: 'knight',
    B: 'bishop',
    Q: 'queen',
    K: 'king',
  };

  return typeMap[piece[1]] || null;
};
