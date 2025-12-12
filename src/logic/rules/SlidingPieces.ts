import { Square } from "../../models/Square";
import { BaseMoveRule } from "./BaseMoveRule";

export class RookMoveRule extends BaseMoveRule {
  name = "rook";

  getValidMoves(
    position: Square,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[] {
    // Rook moves along ranks and files (horizontal and vertical)
    const directions = [
      { rankDir: 1, fileDir: 0 }, // down
      { rankDir: -1, fileDir: 0 }, // up
      { rankDir: 0, fileDir: 1 }, // right
      { rankDir: 0, fileDir: -1 }, // left
    ];

    return this.getSlidingMoves(position, directions, color, boardArray);
  }

  getPremoveMoves(position: Square): Square[] {
    const directions = [
      { dr: 1, df: 0 }, // down
      { dr: -1, df: 0 }, // up
      { dr: 0, df: 1 }, // right
      { dr: 0, df: -1 }, // left
    ];

    return this.getSlidingPremoves(position, directions);
  }
}

export class BishopMoveRule extends BaseMoveRule {
  name = "bishop";

  getValidMoves(
    position: Square,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[] {
    // Bishop moves along diagonals
    const directions = [
      { rankDir: -1, fileDir: -1 }, // top-left
      { rankDir: -1, fileDir: 1 }, // top-right
      { rankDir: 1, fileDir: -1 }, // bottom-left
      { rankDir: 1, fileDir: 1 }, // bottom-right
    ];

    return this.getSlidingMoves(position, directions, color, boardArray);
  }

  getPremoveMoves(position: Square): Square[] {
    const directions = [
      { dr: -1, df: -1 }, // top-left
      { dr: -1, df: 1 }, // top-right
      { dr: 1, df: -1 }, // bottom-left
      { dr: 1, df: 1 }, // bottom-right
    ];

    return this.getSlidingPremoves(position, directions);
  }
}

export class QueenMoveRule extends BaseMoveRule {
  name = "queen";

  getValidMoves(
    position: Square,
    color: "white" | "black",
    boardArray: (string | null)[][]
  ): Square[] {
    // Queen combines rook and bishop moves
    const directions = [
      // Rook directions
      { rankDir: 1, fileDir: 0 },
      { rankDir: -1, fileDir: 0 },
      { rankDir: 0, fileDir: 1 },
      { rankDir: 0, fileDir: -1 },
      // Bishop directions
      { rankDir: -1, fileDir: -1 },
      { rankDir: -1, fileDir: 1 },
      { rankDir: 1, fileDir: -1 },
      { rankDir: 1, fileDir: 1 },
    ];

    return this.getSlidingMoves(position, directions, color, boardArray);
  }

  getPremoveMoves(position: Square): Square[] {
    const directions = [
      // Rook directions
      { dr: 1, df: 0 },
      { dr: -1, df: 0 },
      { dr: 0, df: 1 },
      { dr: 0, df: -1 },
      // Bishop directions
      { dr: -1, df: -1 },
      { dr: -1, df: 1 },
      { dr: 1, df: -1 },
      { dr: 1, df: 1 },
    ];

    return this.getSlidingPremoves(position, directions);
  }
}
