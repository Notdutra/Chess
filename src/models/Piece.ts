export type PieceColor = 'white' | 'black';
export type PieceType =
  | 'pawn'
  | 'rook'
  | 'knight'
  | 'bishop'
  | 'queen'
  | 'king';

export interface Piece {
  id: string; // Unique identifier for the piece (e.g., "WP1")
  color: PieceColor; // 'white' or 'black'
  type: PieceType; // 'pawn', 'rook', etc.
  hasMoved: boolean; // Tracks if piece has moved (for castling, pawn first move)
}

export const createPiece = (id: string): Piece => {
  const color = id[0] === 'W' ? 'white' : 'black';

  let type: PieceType;
  switch (id[1]) {
    case 'P':
      type = 'pawn';
      break;
    case 'R':
      type = 'rook';
      break;
    case 'N':
      type = 'knight';
      break;
    case 'B':
      type = 'bishop';
      break;
    case 'Q':
      type = 'queen';
      break;
    case 'K':
      type = 'king';
      break;
    default:
      type = 'pawn'; // Default fallback
  }

  return {
    id,
    color,
    type,
    hasMoved: false,
  };
};
