import { Square } from "../../models/Square";
import { BaseMoveRule } from "./BaseMoveRule";

export class PawnMoveRule extends BaseMoveRule {
  name = "pawn";

  getValidMoves(
    position: Square,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[] {
    const moves: Square[] = [];
    const direction = color === "white" ? -1 : 1; // White moves up (decreasing rank), black moves down

    // Forward move
    const oneStep = {
      rank: position.rank + direction,
      file: position.file,
    };

    if (this.isValidSquare(oneStep) && !this.isSquareOccupied(oneStep, boardArray)) {
      moves.push(oneStep);

      // Two-step move from starting position
      const startingRank = color === "white" ? 6 : 1;
      if (position.rank === startingRank) {
        const twoStep = {
          rank: position.rank + direction * 2,
          file: position.file,
        };
        if (this.isValidSquare(twoStep) && !this.isSquareOccupied(twoStep, boardArray)) {
          moves.push(twoStep);
        }
      }
    }

    // Diagonal captures
    const leftCapture = {
      rank: position.rank + direction,
      file: position.file - 1,
    };
    const rightCapture = {
      rank: position.rank + direction,
      file: position.file + 1,
    };

    if (this.isValidSquare(leftCapture) && this.isOpponentPiece(leftCapture, color, boardArray)) {
      moves.push(leftCapture);
    }

    if (this.isValidSquare(rightCapture) && this.isOpponentPiece(rightCapture, color, boardArray)) {
      moves.push(rightCapture);
    }

    // TODO: Add en passant logic here

    return moves;
  }

  getPremoveMoves(position: Square): Square[] {
    const moves: Square[] = [];

    // For premoves, we allow both forward moves and diagonal captures
    // regardless of current board state

    // Forward moves (1 or 2 squares)
    for (let steps = 1; steps <= 2; steps++) {
      const forward = {
        rank: position.rank - steps, // Assuming white perspective for premoves
        file: position.file,
      };
      if (this.isValidSquare(forward)) {
        moves.push(forward);
      }

      const backward = {
        rank: position.rank + steps, // For black pawns
        file: position.file,
      };
      if (this.isValidSquare(backward)) {
        moves.push(backward);
      }
    }

    // Diagonal moves (captures)
    const diagonals = [
      { rank: position.rank - 1, file: position.file - 1 },
      { rank: position.rank - 1, file: position.file + 1 },
      { rank: position.rank + 1, file: position.file - 1 },
      { rank: position.rank + 1, file: position.file + 1 },
    ];

    for (const diagonal of diagonals) {
      if (this.isValidSquare(diagonal)) {
        moves.push(diagonal);
      }
    }

    return moves;
  }
}
