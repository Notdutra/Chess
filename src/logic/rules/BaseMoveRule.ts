import { Square } from "../../models/Square";

export interface MoveRule {
  name: string;
  getValidMoves(
    position: Square,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[];
  getPremoveMoves(position: Square): Square[];
}

export abstract class BaseMoveRule implements MoveRule {
  abstract name: string;

  abstract getValidMoves(
    position: Square,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[];

  abstract getPremoveMoves(position: Square): Square[];

  /**
   * Check if a square is within board bounds
   */
  protected isValidSquare(square: Square): boolean {
    return square.rank >= 0 && square.rank < 8 && square.file >= 0 && square.file < 8;
  }

  /**
   * Check if a square is occupied by a piece
   */
  protected isSquareOccupied(square: Square, boardArray: (string | null)[][]): boolean {
    return !!boardArray[square.rank][square.file];
  }

  /**
   * Get the piece color at a square
   */
  protected getPieceColor(
    square: Square,
    boardArray: (string | null)[][]
  ): "white" | "black" | null {
    const piece = boardArray[square.rank][square.file];
    if (!piece) return null;
    return piece[0] === "W" ? "white" : "black";
  }

  /**
   * Check if a square is occupied by an opponent piece
   */
  protected isOpponentPiece(
    square: Square,
    playerColor: "white" | "black",
    boardArray: (string | null)[][]
  ): boolean {
    const pieceColor = this.getPieceColor(square, boardArray);
    return pieceColor !== null && pieceColor !== playerColor;
  }

  /**
   * Get sliding moves for pieces like bishop, rook, queen
   */
  protected getSlidingMoves(
    position: Square,
    directions: Array<{ rankDir: number; fileDir: number }>,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[] {
    const moves: Square[] = [];

    for (const dir of directions) {
      let currentRank = position.rank + dir.rankDir;
      let currentFile = position.file + dir.fileDir;

      while (currentRank >= 0 && currentRank < 8 && currentFile >= 0 && currentFile < 8) {
        const currentSquare = { rank: currentRank, file: currentFile };
        const pieceOnSquare = boardArray[currentRank][currentFile];

        if (!pieceOnSquare) {
          // Empty square, add as valid move
          moves.push(currentSquare);
        } else {
          // Square has a piece
          const pieceColor = this.getPieceColor(currentSquare, boardArray);

          // If it's an opponent's piece, we can capture it
          if (pieceColor !== color) {
            moves.push(currentSquare);
          }

          // Either way, we can't move further in this direction
          break;
        }

        // Move to the next square in this direction
        currentRank += dir.rankDir;
        currentFile += dir.fileDir;
      }
    }

    return moves;
  }

  /**
   * Get sliding premoves (ignoring occupation for premove planning)
   */
  protected getSlidingPremoves(
    position: Square,
    directions: Array<{ dr: number; df: number }>
  ): Square[] {
    const moves: Square[] = [];

    for (const { dr, df } of directions) {
      let r = position.rank + dr;
      let f = position.file + df;

      while (r >= 0 && r < 8 && f >= 0 && f < 8) {
        moves.push({ rank: r, file: f });
        r += dr;
        f += df;
      }
    }

    return moves;
  }
}
