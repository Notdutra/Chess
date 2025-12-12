import React, { useCallback, useRef, useState } from "react";
import logger from "../utils/logger";
import { flushSync } from "react-dom";
import { ChessEngineInstance } from "../logic/ChessEngine";
import { GameState } from "../models/GameState";
import soundManager from "../services/SoundManager";

interface PremoveQueue {
  from: string;
  to: string;
}

export const usePremoves = () => {
  const premoveQueueRef = useRef<PremoveQueue[]>([]);
  const [premoveQueue, setPremoveQueue] = useState<PremoveQueue[]>([]);
  const premoveSelectionRef = useRef<string | null>(null);

  // Queue a premove (simple approach)
  const queuePremove = useCallback((from: string, to: string) => {
    logger.debug(
      `queuePremove called: ${from} -> ${to}, currentQueue=${JSON.stringify(premoveQueueRef.current)}`
    );
    const existingMove = premoveQueueRef.current.find((m) => m.from === from && m.to === to);

    if (existingMove) {
      logger.debug(`queuePremove: duplicate ignored ${from} -> ${to}`);
      return; // Don't add duplicates
    }

    // Allow multiple premoves - just add to the queue
    premoveQueueRef.current.push({ from, to });
    setPremoveQueue([...premoveQueueRef.current]);
    logger.debug(
      `queuePremove: queued ${from} -> ${to}, newQueue=${JSON.stringify(premoveQueueRef.current)}`
    );
    soundManager.playMoveSound("premove");
  }, []);

  // Clear premove queue
  const clearPremoveQueue = useCallback(() => {
    premoveQueueRef.current = [];
    setPremoveQueue([]);

    // Force immediate UI update to ensure preview pieces are hidden
    flushSync(() => {
      // Reset to real board state and clear selection/hints
      ChessEngineInstance.getGameState();
      // This would need to be passed as a parameter or handled differently
      // setGameState({
      //   ...freshGameState,
      //   selectedSquare: null,
      //   validMoves: [],
      //   highlightedSquares: freshGameState.lastMoves || [],
      // });
    });

    // Clear premove selection reference
    premoveSelectionRef.current = null;
  }, []);

  // Validate premoves before opponent move
  // playerColor is needed because currentPlayer will be the opponent when this is called
  const validatePremoveBeforeOpponentMove = useCallback(
    (from: string, to: string, currentGameState?: GameState, playerColor?: "white" | "black") => {
      if (premoveQueueRef.current.length === 0) {
        return;
      }

      // Check if the first premove is still valid after this opponent move
      const firstPremove = premoveQueueRef.current[0];
      if (firstPremove) {
        // Get the piece positions
        const { file: fromFile, rank: fromRank } = ChessEngineInstance.squareFromNotation(from);
        const { file: toFile, rank: toRank } = ChessEngineInstance.squareFromNotation(to);

        // Check if the opponent's move would affect the premove
        const premoveSourceFile = ChessEngineInstance.squareFromNotation(firstPremove.from).file;
        const premoveSourceRank = ChessEngineInstance.squareFromNotation(firstPremove.from).rank;

        // If the opponent's move is to the same square as the premove source, the premove is invalid
        if (toFile === premoveSourceFile && toRank === premoveSourceRank) {
          clearPremoveQueue();
          return;
        }

        // If the opponent's move is from the same square as the premove source, the premove is invalid
        if (fromFile === premoveSourceFile && fromRank === premoveSourceRank) {
          clearPremoveQueue();
          return;
        }

        // Check if the piece still exists at the premove source
        // Use passed state if available, otherwise fetch recent
        const gameState = currentGameState || ChessEngineInstance.getGameState();
        const currentBoard = gameState.boardArray;
        const pieceAtSource = currentBoard[premoveSourceRank][premoveSourceFile];

        // Determine the "own" piece prefix from PLAYER color (not currentPlayer which is the opponent)
        const ownPrefix = playerColor === "white" ? "W" : "B";

        if (!pieceAtSource || pieceAtSource[0] !== ownPrefix) {
          logger.debug(
            `validatePremove: piece at ${firstPremove.from} is ${pieceAtSource}, expected ${ownPrefix} prefix. Clearing queue.`
          );
          clearPremoveQueue();
          return;
        }
      }
    },
    [clearPremoveQueue]
  );

  // Helper to get preview board with premoves applied
  const getPreviewBoard = useCallback((gameState: GameState): (string | null)[][] => {
    const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const boardNumbers = ["8", "7", "6", "5", "4", "3", "2", "1"];
    const previewBoard: (string | null)[][] = gameState.boardArray.map((r) => r.slice());

    try {
      const queue = premoveQueueRef.current || [];
      for (const mv of queue) {
        const from = mv.from;
        const to = mv.to;
        if (!from || !to) continue;

        const fromCol = boardLetters.indexOf(from[0]);
        const fromRow = boardNumbers.indexOf(from[1]);
        const toCol = boardLetters.indexOf(to[0]);
        const toRow = boardNumbers.indexOf(to[1]);

        if (
          fromRow >= 0 &&
          fromCol >= 0 &&
          toRow >= 0 &&
          toCol >= 0 &&
          previewBoard[fromRow] &&
          previewBoard[toRow]
        ) {
          const piece = previewBoard[fromRow][fromCol];
          previewBoard[fromRow][fromCol] = null;
          previewBoard[toRow][toCol] = piece;
        }
      }
    } catch (err) {
      console.error("Error applying premove queue to preview board:", err);
    }

    return previewBoard;
  }, []);

  // Helper to get piece at position from preview board
  const getPieceAtPositionPreview = useCallback(
    (squareName: string, gameState: GameState): string | null => {
      const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const boardNumbers = ["8", "7", "6", "5", "4", "3", "2", "1"];
      const previewBoard = getPreviewBoard(gameState);
      const col = boardLetters.indexOf(squareName[0]);
      const row = boardNumbers.indexOf(squareName[1]);

      if (row >= 0 && col >= 0 && previewBoard[row] && previewBoard[row][col]) {
        return previewBoard[row][col] as string;
      }
      return null;
    },
    [getPreviewBoard]
  );

  return React.useMemo(
    () => ({
      // State
      premoveQueue,
      premoveSelection: premoveSelectionRef.current,
      setPremoveQueue,

      // Actions
      queuePremove,
      clearPremoveQueue,
      validatePremoveBeforeOpponentMove,
      getPreviewBoard,
      getPieceAtPositionPreview,

      // Refs
      premoveQueueRef,
      premoveSelectionRef,
    }),
    [
      premoveQueue,
      queuePremove,
      clearPremoveQueue,
      validatePremoveBeforeOpponentMove,
      getPreviewBoard,
      getPieceAtPositionPreview,
    ]
  );
};
