import React, { memo } from "react";
import { GameStateHook } from "../../../types/hooks";

interface MoveHandlerProps {
  gameState: GameStateHook;
  onGameEnd?: (winner: "white" | "black" | "draw") => void;
}

/**
 * Handles chess move logic and game flow
 * This component manages the complex move execution logic
 * without cluttering the visual components
 * Memoized for performance optimization
 */
const MoveHandler: React.FC<MoveHandlerProps> = memo(({ gameState, onGameEnd }) => {
  // Handle game end conditions
  React.useEffect(() => {
    if (gameState.gameState.checkmate && onGameEnd) {
      const winner = gameState.gameState.currentPlayer === "white" ? "black" : "white";
      onGameEnd(winner);
    } else if (gameState.gameState.stalemate && onGameEnd) {
      onGameEnd("draw");
    }
  }, [
    gameState.gameState.checkmate,
    gameState.gameState.stalemate,
    gameState.gameState.currentPlayer,
    onGameEnd,
  ]);

  // This component doesn't render anything visual
  // It only manages the game logic
  return null;
});

MoveHandler.displayName = "MoveHandler";

export { MoveHandler };
