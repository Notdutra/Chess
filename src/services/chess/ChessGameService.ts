import { ChessEngineInstance } from "../../logic/ChessEngine";
import { GameState } from "../../models/GameState";
import { MoveResult } from "../../models/Move";

/**
 * Service layer for chess game operations
 * Provides a clean interface between UI components and chess engine
 */
export class ChessGameService {
  /**
   * Execute a chess move and return the result
   */
  static executeMove(from: string, to: string, currentGameState?: GameState): MoveResult | null {
    // Sync the engine with current game state if provided
    if (currentGameState) {
      ChessEngineInstance.setGameState(currentGameState);
    }

    const piece = ChessEngineInstance.getPieceAtPosition(from);
    if (!piece) return null;

    const validMoves = ChessEngineInstance.getValidMoves(piece, from);
    if (!validMoves.includes(to)) return null;

    return ChessEngineInstance.makeMove(from, to);
  }

  /**
   * Get valid moves for a piece at a specific position
   */
  static getValidMoves(position: string): string[] {
    const piece = ChessEngineInstance.getPieceAtPosition(position);
    if (!piece) return [];

    return ChessEngineInstance.getValidMoves(piece, position);
  }

  /**
   * Get premove possibilities for a piece (less strict validation)
   */
  static getPremoveMoves(position: string): string[] {
    const piece = ChessEngineInstance.getPieceAtPosition(position);
    if (!piece) return [];

    return ChessEngineInstance.getPremoveMoves(piece, position);
  }

  /**
   * Check if a move is valid without executing it
   */
  static isValidMove(from: string, to: string): boolean {
    const piece = ChessEngineInstance.getPieceAtPosition(from);
    if (!piece) return false;

    const validMoves = ChessEngineInstance.getValidMoves(piece, from);
    return validMoves.includes(to);
  }

  /**
   * Get the current game state
   */
  static getGameState(): GameState {
    return ChessEngineInstance.getGameState();
  }

  /**
   * Update the game state
   */
  static setGameState(gameState: GameState): void {
    ChessEngineInstance.setGameState(gameState);
  }

  /**
   * Get piece at specific board position
   */
  static getPieceAt(position: string): string | null {
    return ChessEngineInstance.getPieceAtPosition(position);
  }

  /**
   * Convert current board to FEN notation
   */
  static getBoardAsFEN(): string {
    return ChessEngineInstance.convertBoardArrayToFEN();
  }

  /**
   * Check if the king is in check
   */
  static isKingInCheck(color: "white" | "black"): boolean {
    return ChessEngineInstance.isKingInCheck(color);
  }

  /**
   * Get all possible moves for the current player
   */
  static getAllValidMoves(): Array<{ from: string; to: string }> {
    const gameState = ChessEngineInstance.getGameState();
    const moves: Array<{ from: string; to: string }> = [];
    const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const boardNumbers = ["8", "7", "6", "5", "4", "3", "2", "1"];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = gameState.boardArray[row][col];
        if (piece && piece[0] === (gameState.currentPlayer === "white" ? "W" : "B")) {
          const squareName = `${boardLetters[col]}${boardNumbers[row]}`;
          const validMoves = ChessEngineInstance.getValidMoves(piece, squareName);
          for (const move of validMoves) {
            moves.push({ from: squareName, to: move });
          }
        }
      }
    }

    return moves;
  }

  /**
   * Get the current game state
   */
  static getCurrentGameState(): GameState {
    return ChessEngineInstance.getGameState();
  }

  /**
   * Reset game to initial state
   */
  static resetGame(): GameState {
    const initialState = ChessEngineInstance.createInitialGameState();
    ChessEngineInstance.setGameState(initialState);
    return initialState;
  }
}
