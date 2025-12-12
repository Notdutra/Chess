import { MoveRule } from "./BaseMoveRule";
import { PawnMoveRule } from "./PawnMoveRule";
import { RookMoveRule, BishopMoveRule, QueenMoveRule } from "./SlidingPieces";
import { KnightMoveRule } from "./KnightMoveRule";
import { KingMoveRule } from "./KingMoveRule";

export class MoveRuleFactory {
  private static rules = new Map<string, MoveRule>([
    ["pawn", new PawnMoveRule()],
    ["rook", new RookMoveRule()],
    ["bishop", new BishopMoveRule()],
    ["queen", new QueenMoveRule()],
    ["knight", new KnightMoveRule()],
    ["king", new KingMoveRule()],
  ]);

  static getRule(pieceType: string): MoveRule | null {
    return this.rules.get(pieceType.toLowerCase()) || null;
  }

  static getAllRules(): Map<string, MoveRule> {
    return new Map(this.rules);
  }

  /**
   * Extract piece type from piece notation (e.g., "WP1" -> "pawn")
   */
  static getPieceType(piece: string): string {
    if (!piece || piece.length < 2) return "";

    const typeChar = piece[1].toLowerCase();
    switch (typeChar) {
      case "p":
        return "pawn";
      case "r":
        return "rook";
      case "n":
        return "knight";
      case "b":
        return "bishop";
      case "q":
        return "queen";
      case "k":
        return "king";
      default:
        return "";
    }
  }
}
