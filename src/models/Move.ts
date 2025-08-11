// import { PieceColor } from "./Piece"; // Removed unused import
import { GameState, getSquareFromPosition } from "./GameState";

export interface Move {
  from: string; // Starting position (e.g., "e2")
  to: string; // Destination position (e.g., "e4")
  piece: string; // The piece being moved (e.g., "WP1")
  capturedPiece?: string; // The captured piece if any
  isCheck?: boolean; // Whether this move puts opponent in check
  isCheckmate?: boolean; // Whether this move creates checkmate
  isPromotion?: boolean; // Whether this is a pawn promotion
  promotedTo?: string; // What the pawn is promoted to (e.g., "WQ")
  isCastling?: boolean; // Whether this is a castling move
  isEnPassant?: boolean; // Whether this is an en passant capture
  rookMove?: {
    // For castling, the associated rook move
    from: string;
    to: string;
    piece: string;
  };
}

export interface MoveResult {
  newGameState: GameState;
  move: Move;
  isValid: boolean;
  moveType: "normal" | "capture" | "castle" | "promotion" | "en-passant";
  specialEvent?: "check" | "checkmate" | "stalemate";
}

export interface LegalMovesMap {
  [position: string]: string[]; // Map from position to array of legal destination positions
}

// Convert between algebraic notation and move objects
export const algebraicToMove = (algebraic: string, boardArray: string[][]): Move | null => {
  // Simple implementation for e2e4 style moves
  if (algebraic.length < 4) return null;

  const from = algebraic.substring(0, 2);
  const to = algebraic.substring(2, 4);

  // Find the piece at the starting position
  const square = getSquareFromPosition(from);
  if (!square) return null;

  const piece = boardArray[square.rank][square.file];
  if (!piece) return null;

  return {
    from,
    to,
    piece,
  };
};

export const moveToAlgebraic = (move: Move): string => {
  return `${move.from}${move.to}`;
};
export function moveToString(move: Move): string {
  // Simple string representation: e2e4, e7e8Q, etc.
  let str = `${move.from}${move.to}`;
  if (move.promotedTo) str += move.promotedTo;
  return str;
}
