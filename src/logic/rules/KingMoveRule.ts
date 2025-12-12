import { Square } from "../../models/Square";
import { BaseMoveRule } from "./BaseMoveRule";

export class KingMoveRule extends BaseMoveRule {
  name = "king";

  getValidMoves(
    position: Square,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[] {
    const moves: Square[] = [];

    // King moves one square in any direction
    const offsets = [
      { rankOffset: -1, fileOffset: -1 }, // top-left
      { rankOffset: -1, fileOffset: 0 }, // top
      { rankOffset: -1, fileOffset: 1 }, // top-right
      { rankOffset: 0, fileOffset: -1 }, // left
      { rankOffset: 0, fileOffset: 1 }, // right
      { rankOffset: 1, fileOffset: -1 }, // bottom-left
      { rankOffset: 1, fileOffset: 0 }, // bottom
      { rankOffset: 1, fileOffset: 1 }, // bottom-right
    ];

    for (const offset of offsets) {
      const targetSquare = {
        rank: position.rank + offset.rankOffset,
        file: position.file + offset.fileOffset,
      };

      // Check if target square is on the board
      if (this.isValidSquare(targetSquare)) {
        const pieceOnSquare = boardArray[targetSquare.rank][targetSquare.file];

        // Square is empty or has opponent's piece
        if (!pieceOnSquare || this.isOpponentPiece(targetSquare, color, boardArray)) {
          // TODO: Add check for king safety (not moving into check)
          moves.push(targetSquare);
        }
      }
    }

    // TODO: Add castling logic here

    return moves;
  }

  getPremoveMoves(position: Square): Square[] {
    const moves: Square[] = [];

    // For premoves, allow all adjacent squares
    const offsets = [
      { dr: -1, df: -1 }, // top-left
      { dr: -1, df: 0 }, // top
      { dr: -1, df: 1 }, // top-right
      { dr: 0, df: -1 }, // left
      { dr: 0, df: 1 }, // right
      { dr: 1, df: -1 }, // bottom-left
      { dr: 1, df: 0 }, // bottom
      { dr: 1, df: 1 }, // bottom-right
    ];

    for (const { dr, df } of offsets) {
      const targetSquare = {
        rank: position.rank + dr,
        file: position.file + df,
      };

      if (this.isValidSquare(targetSquare)) {
        moves.push(targetSquare);
      }
    }

    // TODO: Add castling squares for premoves

    return moves;
  }
}
