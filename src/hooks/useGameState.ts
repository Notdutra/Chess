import { useCallback, useState, useRef } from "react";
import { ChessEngineInstance } from "../logic/ChessEngine";
import { GameState } from "../models/GameState";
import { PieceColor } from "../models/Piece";

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialState = ChessEngineInstance.getGameState();
    // Set game mode to AI for bot play
    initialState.gameMode = "ai";
    return initialState;
  });

  // Player vs opponent tracking (chess.com style)
  const playerRef = useRef<PieceColor>("white");
  const botColorRef = useRef<PieceColor | null>(null);

  const updateGameState = useCallback((newState: GameState | ((prev: GameState) => GameState)) => {
    if (typeof newState === "function") {
      setGameState((prev) => {
        const updated = newState(prev);
        ChessEngineInstance.setGameState(updated);
        return updated;
      });
    } else {
      setGameState(newState);
      ChessEngineInstance.setGameState(newState);
    }
  }, []);

  const selectSquare = useCallback(
    (squareName: string | null, forPremove = false) => {
      if (!squareName) {
        // Clear selection
        updateGameState((prev) => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
          highlightedSquares: [...(prev.lastMoves || [])],
        }));
        return;
      }

      updateGameState((prev) => {
        // Get piece from current game state's board array, not ChessEngine (which might be stale)
        const file = squareName.charCodeAt(0) - 97; // a=0, b=1, etc.
        const rank = 8 - parseInt(squareName[1]); // 8=0, 7=1, etc.
        const piece = prev.boardArray[rank]?.[file];

        console.log(`[selectSquare] squareName: ${squareName}, piece: ${piece}`);
        if (!piece) return prev;

        const pieceColor = piece[0] === "W" ? "white" : "black";
        console.log(`[selectSquare] pieceColor: ${pieceColor}, playerRef: ${playerRef.current}`);

        // Only allow selecting own pieces
        const isOwnPiece = pieceColor === playerRef.current;
        if (!isOwnPiece) {
          console.log(`[selectSquare] Not own piece, returning`);
          return prev;
        }

        // Check if it's player's turn (piece color matches current player)
        const isPlayerTurn = prev.currentPlayer === playerRef.current;
        console.log(
          `[selectSquare] forPremove: ${forPremove}, isPlayerTurn: ${isPlayerTurn}, currentPlayer: ${prev.currentPlayer}`
        );
        const prevLast = prev.lastMoves || [];

        // If it's opponent's turn (forPremove), show PREMOVE hints (less strict validation)
        // If it's player's turn, show valid moves
        if (forPremove || !isPlayerTurn) {
          // During opponent's turn - show where you CAN premove to
          const premoveMoves = ChessEngineInstance.getPremoveMoves(piece, squareName);
          console.log(`[selectSquare] Opponent's turn - premove hints:`, premoveMoves);
          return {
            ...prev,
            selectedSquare: squareName,
            validMoves: premoveMoves, // Show premove destinations as hints
            highlightedSquares: Array.from(new Set([...prevLast, squareName])),
          };
        }

        // Player's turn - show valid moves
        const validMoves = ChessEngineInstance.getValidMoves(piece, squareName);
        console.log(`[selectSquare] Player's turn - validMoves:`, validMoves);

        return {
          ...prev,
          selectedSquare: squareName,
          validMoves,
          highlightedSquares: Array.from(new Set([...prevLast, squareName])),
        };
      });
    },
    [updateGameState]
  );

  const clearSelection = useCallback(() => {
    updateGameState((prev) => ({
      ...prev,
      selectedSquare: null,
      validMoves: [],
      highlightedSquares: [...(prev.lastMoves || [])],
    }));
  }, [updateGameState]);

  const highlightLastMove = useCallback(
    (from: string, to: string) => {
      updateGameState((prev) => ({
        ...prev,
        lastMoves: [from, to],
        highlightedSquares: [from, to],
      }));
    },
    [updateGameState]
  );

  const isPlayerTurn = useCallback(
    (playerColor: PieceColor) => {
      return gameState.currentPlayer === playerColor;
    },
    [gameState.currentPlayer]
  );

  const setValidMoves = useCallback(
    (moves: string[]) => {
      updateGameState((prev) => ({
        ...prev,
        validMoves: moves,
      }));
    },
    [updateGameState]
  );

  const resetGame = useCallback(() => {
    const initialState = ChessEngineInstance.createInitialGameState();
    initialState.gameMode = "ai";
    updateGameState(initialState);
  }, [updateGameState]);

  // Helper methods for player/opponent logic
  const isPlayerColor = useCallback((color: PieceColor) => color === playerRef.current, []);

  const isOpponentTurn = useCallback(
    () => gameState.currentPlayer !== playerRef.current,
    [gameState.currentPlayer]
  );

  const setPlayerColor = useCallback((color: PieceColor) => {
    playerRef.current = color;
    botColorRef.current = color === "white" ? "black" : "white";
  }, []);

  return {
    gameState,
    updateGameState,
    selectSquare,
    clearSelection,
    highlightLastMove,
    isPlayerTurn,
    setValidMoves,
    resetGame,
    // New player/opponent methods
    isPlayerColor,
    isOpponentTurn,
    setPlayerColor,
    playerColor: playerRef.current,
    botColor: botColorRef.current,
  };
};
