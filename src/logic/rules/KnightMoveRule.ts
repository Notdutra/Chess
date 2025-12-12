import { Square } from "../../models/Square";
import { BaseMoveRule } from "./BaseMoveRule";

export class KnightMoveRule extends BaseMoveRule {
  name = "knight";

  getValidMoves(
    position: Square,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[] {
    const moves: Square[] = [];

    // Knight moves in L-shapes: 2 squares in one direction, 1 in perpendicular
    const offsets = [
      { rankOffset: -2, fileOffset: -1 },
      { rankOffset: -2, fileOffset: 1 },
      { rankOffset: -1, fileOffset: -2 },
      { rankOffset: -1, fileOffset: 2 },
      { rankOffset: 1, fileOffset: -2 },
      { rankOffset: 1, fileOffset: 2 },
      { rankOffset: 2, fileOffset: -1 },
      { rankOffset: 2, fileOffset: 1 },
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
          moves.push(targetSquare);
        }
      }
    }

    return moves;
  }

  getPremoveMoves(position: Square): Square[] {
    const moves: Square[] = [];

    // For premoves, allow all possible knight moves regardless of occupation
    const offsets = [
      { dr: -2, df: -1 },
      { dr: -2, df: 1 },
      { dr: -1, df: -2 },
      { dr: -1, df: 2 },
      { dr: 1, df: -2 },
      { dr: 1, df: 2 },
      { dr: 2, df: -1 },
      { dr: 2, df: 1 },
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

    return moves;
  }
}
