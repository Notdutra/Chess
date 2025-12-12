import React, { memo, useCallback, useRef, useEffect, useMemo } from "react";
import { useGameState } from "../../../hooks/useGameState";
import { useChessAnimation } from "../../../hooks/useChessAnimation";
import { useDragAndDrop } from "../../../hooks/useDragAndDrop";
import { usePremoves } from "../../../hooks/usePremoves";
import { ChessGameService } from "../../../services/chess/ChessGameService";
import { ChessEngineInstance } from "../../../logic/ChessEngine";
import { BoardRenderer } from "./BoardRenderer";
import { MoveHandler } from "./MoveHandler";
import logger from "../../../utils/logger";
import soundManager from "../../../services/SoundManager";

interface ChessBoardProps {
  onGameEnd?: (winner: "white" | "black" | "draw") => void;
}

/**
 * Modern ChessBoard component with chess.com-like UX
 */
const ChessBoard: React.FC<ChessBoardProps> = memo(({ onGameEnd }) => {
  const gameState = useGameState();
  const animation = useChessAnimation();
  const dragDrop = useDragAndDrop();
  const premoves = usePremoves();

  // Compute preview board for visual premoves (ghost pieces)
  const previewBoard = useMemo(() => {
    return premoves.getPreviewBoard(gameState.gameState);
  }, [premoves, gameState.gameState]);

  // Refs for sophisticated UX logic
  const lastMoveWasDragRef = useRef(false);
  const isExecutingPremoveRef = useRef(false);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartedDuringOpponentTurnRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simulateOpponentMoveRef = useRef<(state?: any) => void>(() => {});

  // Initialize player color for AI games
  useEffect(() => {
    if (gameState.gameState.gameMode === "ai" && !gameState.botColor) {
      gameState.setPlayerColor("white");
    }
  }, [gameState]);

  // Execute queued premoves when it becomes player's turn
  const executePremoves = useCallback(
    (currentState = gameState.gameState) => {
      logger.debug(
        `executePremoves called, premoveQueueLen=${premoves.premoveQueueRef.current.length}, currentPlayer=${currentState.currentPlayer}, playerColor=${gameState.playerColor}`
      );
      if (isExecutingPremoveRef.current) return;
      if (premoves.premoveQueueRef.current.length === 0) return;
      if (currentState.currentPlayer !== gameState.playerColor) return;

      isExecutingPremoveRef.current = true;

      // Safety timeout to prevent permanent freeze
      const safetyTimeout = setTimeout(() => {
        isExecutingPremoveRef.current = false;
        logger.debug("Premove execution safety timeout triggered");
      }, 2000);

      // Get the first premove
      const premove = premoves.premoveQueueRef.current[0];
      if (!premove) {
        clearTimeout(safetyTimeout);
        isExecutingPremoveRef.current = false;
        return;
      }

      // Remove from ref immediately (for logic), but delay state update (for UI) until after move commits
      const newQueue = premoves.premoveQueueRef.current.slice(1);
      premoves.premoveQueueRef.current = newQueue;
      // NOTE: Don't call setPremoveQueue here - wait until game state is updated
      // This prevents the ghost piece from disappearing before the real piece appears

      logger.debug(`Executing premove: ${premove.from} -> ${premove.to}`);
      console.log(`[Premove] Executing premove: ${premove.from} -> ${premove.to}`);

      // Try to execute the premove
      const result = ChessGameService.executeMove(premove.from, premove.to, currentState);

      if (result && result.isValid) {
        // Premove was valid - NO ANIMATION needed since ghost piece is already at destination
        // Just update state directly - the ghost becomes the real piece
        gameState.highlightLastMove(premove.from, premove.to);
        gameState.clearSelection();

        // Play the move sound
        soundManager.playMoveSound("playerMove");

        clearTimeout(safetyTimeout);
        gameState.updateGameState(result.newGameState);
        // NOW update the queue state after game state is updated
        premoves.setPremoveQueue(newQueue);
        isExecutingPremoveRef.current = false;

        // After executing this premove, trigger opponent if AI mode
        if (
          gameState.gameState.gameMode === "ai" &&
          result.newGameState.currentPlayer === gameState.botColor
        ) {
          setTimeout(() => simulateOpponentMoveRef.current(result.newGameState), 2000);
        }
      } else {
        // Premove was invalid - clear remaining premoves
        clearTimeout(safetyTimeout);
        logger.debug(`Premove ${premove.from} -> ${premove.to} is invalid, clearing queue`);
        console.log(`[Premove] Premove invalid/failed: ${premove.from} -> ${premove.to}`);
        premoves.clearPremoveQueue();
        isExecutingPremoveRef.current = false;
      }
    },
    [gameState, premoves]
  );

  // Simulate opponent move with realistic AI behavior
  const simulateOpponentMove = useCallback(
    (currentState = gameState.gameState) => {
      logger.debug(`simulateOpponentMove called, current player: ${currentState.currentPlayer}`);

      if (currentState.currentPlayer !== gameState.botColor) {
        logger.debug(`Not bot's turn, current player is: ${currentState.currentPlayer}`);
        return;
      }

      // Find all valid moves for the bot
      const pieces = [];
      const botPrefix = gameState.botColor === "white" ? "W" : "B";

      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const piece = currentState.boardArray[rank][file];
          if (piece && piece[0] === botPrefix) {
            const square = String.fromCharCode(97 + file) + (8 - rank);
            pieces.push({ piece, square });
          }
        }
      }

      logger.debug(`Found ${pieces.length} bot pieces`);

      if (pieces.length > 0) {
        // Pick a random piece with valid moves
        const piecesWithMoves = pieces
          .map((p) => ({
            ...p,
            moves: ChessGameService.getValidMoves(p.square),
          }))
          .filter((p) => p.moves.length > 0);

        if (piecesWithMoves.length > 0) {
          const randomPiece = piecesWithMoves[Math.floor(Math.random() * piecesWithMoves.length)];
          const randomMove =
            randomPiece.moves[Math.floor(Math.random() * randomPiece.moves.length)];

          logger.debug(`Bot moving from ${randomPiece.square} to ${randomMove}`);

          // Validate premoves before opponent move - pass playerColor since currentPlayer is opponent
          premoves.validatePremoveBeforeOpponentMove(
            randomPiece.square,
            randomMove,
            currentState,
            gameState.playerColor
          );

          const result = ChessGameService.executeMove(randomPiece.square, randomMove, currentState);

          if (result && result.isValid) {
            gameState.highlightLastMove(randomPiece.square, randomMove);
            gameState.clearSelection();

            const fromRect = animation.getPieceRect(randomPiece.square);
            const toRect = animation.getPieceRect(randomMove);

            // Opponent moves ALWAYS animate
            if (fromRect && toRect) {
              animation.animateMove(
                randomPiece.square,
                randomMove,
                result.move.piece,
                fromRect,
                toRect,
                () => {
                  gameState.updateGameState(result.newGameState);
                  // After opponent move completes, execute any queued premoves
                  setTimeout(() => executePremoves(result.newGameState), 100);
                }
              );
            } else {
              gameState.updateGameState(result.newGameState);
              // Execute premoves after state update
              setTimeout(() => executePremoves(result.newGameState), 100);
            }
          }
        }
      }
    },
    [gameState, premoves, animation, executePremoves]
  );

  // Keep ref updated so executePremoves can call it
  useEffect(() => {
    simulateOpponentMoveRef.current = simulateOpponentMove;
  }, [simulateOpponentMove]);

  // Sophisticated move execution with context-aware animation
  const handleMoveExecution = useCallback(
    (fromSquare: string, toSquare: string, shouldAnimate = false) => {
      logger.debug(`Executing move ${fromSquare} to ${toSquare}, shouldAnimate: ${shouldAnimate}`);
      console.log(
        `[Move] Processing move attempt: ${fromSquare} -> ${toSquare} (Animate: ${shouldAnimate})`
      );

      const result = ChessGameService.executeMove(fromSquare, toSquare, gameState.gameState);

      if (!result || !result.isValid) {
        logger.debug(`Move ${fromSquare} to ${toSquare} is invalid`);
        return;
      }

      // Remove any matching premove from queue to prevent duplicate execution
      const matchingPremoveIndex = premoves.premoveQueueRef.current.findIndex(
        (pm) => pm.from === fromSquare && pm.to === toSquare
      );
      if (matchingPremoveIndex !== -1) {
        logger.debug(`Removing duplicate premove from queue: ${fromSquare} -> ${toSquare}`);
        const filtered = premoves.premoveQueueRef.current.filter(
          (_, idx) => idx !== matchingPremoveIndex
        );
        premoves.premoveQueueRef.current = filtered;
        // Keep state array in sync so UI panels reflect removal
        if (premoves.setPremoveQueue) {
          premoves.setPremoveQueue(filtered);
        }
      }

      // Clear selection and set last move highlights
      gameState.highlightLastMove(fromSquare, toSquare);
      gameState.clearSelection();

      // Get animation rects
      const fromRect = animation.getPieceRect(fromSquare);
      const toRect = animation.getPieceRect(toSquare);

      logger.debug(
        `Animation - shouldAnimate: ${shouldAnimate}, hasRects: ${!!(fromRect && toRect)}`
      );

      // Animate click-to-move, but NOT drag-and-drop
      if (shouldAnimate && fromRect && toRect) {
        logger.debug(`Animating move...`);
        console.log(`[Move] Animating move: ${fromSquare} -> ${toSquare}`);

        animation.animateMove(fromSquare, toSquare, result.move.piece, fromRect, toRect, () => {
          logger.debug(`Animation complete, updating game state`);
          console.log(`[Move] Animation finished, updating state for ${fromSquare} -> ${toSquare}`);
          gameState.updateGameState(result.newGameState);

          // Trigger opponent move if it's AI mode and bot's turn
          if (
            gameState.gameState.gameMode === "ai" &&
            result.newGameState.currentPlayer === gameState.botColor
          ) {
            setTimeout(() => simulateOpponentMove(result.newGameState), 2000);
          }
        });
      } else {
        console.log(`[Move] Move executed (instant): ${fromSquare} -> ${toSquare}`);
        logger.debug(`No animation, updating immediately`);
        gameState.updateGameState(result.newGameState);

        // Trigger opponent move if needed
        if (
          gameState.gameState.gameMode === "ai" &&
          result.newGameState.currentPlayer === gameState.botColor
        ) {
          setTimeout(() => simulateOpponentMove(result.newGameState), 2000);
        }
      }

      // Reset drag flags and clear pointerDownPos
      lastMoveWasDragRef.current = false;
      pointerDownPosRef.current = null;
    },
    [gameState, animation, simulateOpponentMove, premoves]
  );

  // Handle square click - for click-to-move and piece selection
  const handleSquareClick = useCallback(
    (squareName: string) => {
      logger.debug(`Square clicked: ${squareName}`);

      // Get piece from PREVIEW board to support chained premoves
      const file = squareName.charCodeAt(0) - 97;
      const rank = 8 - parseInt(squareName[1]);
      // Use previewBoard if available, falling back to current state
      // This allows selecting "ghost" pieces from previous premoves
      const piece = previewBoard
        ? previewBoard[rank][file]
        : gameState.gameState.boardArray[rank][file];

      logger.debug(`Piece at ${squareName}: ${piece}`);
      logger.debug(`Current player: ${gameState.gameState.currentPlayer}`);
      logger.debug(`Selected square: ${gameState.gameState.selectedSquare}`);
      logger.debug(`Selected square: ${gameState.gameState.selectedSquare}`);
      logger.debug(`Is opponent turn: ${gameState.isOpponentTurn()}`);

      console.log(`[Interaction] Square clicked: ${squareName} (Piece: ${piece || "none"})`);

      if (gameState.gameState.selectedSquare) {
        // A square is already selected - try to make a move or queue premove
        const from = gameState.gameState.selectedSquare;
        const to = squareName;

        // If clicking on the same square, just deselect
        if (from === to) {
          gameState.clearSelection();
          return;
        }

        logger.debug(`Attempting move from ${from} to ${to}`);

        // Check if this is a valid move or should be queued as premove
        const playerPrefix = gameState.playerColor === "white" ? "W" : "B";
        const fromFile = from.charCodeAt(0) - 97;
        const fromRank = 8 - parseInt(from[1]);
        const pieceAtFrom = previewBoard
          ? previewBoard[fromRank][fromFile]
          : gameState.gameState.boardArray[fromRank][fromFile];

        // Check if move is valid for current turn
        const isValidMove = gameState.gameState.validMoves?.includes(to) || false;

        if (pieceAtFrom && pieceAtFrom[0] === playerPrefix && !isValidMove) {
          // Only queue premove during opponent's turn
          if (gameState.isOpponentTurn()) {
            // Validate premove using ChessEngine
            const premoveMoves = ChessEngineInstance.getPremoveMoves(pieceAtFrom, from);
            if (premoveMoves.includes(to)) {
              logger.debug(`Queueing valid premove: ${from} -> ${to}`);
              premoves.queuePremove(from, to);
              gameState.clearSelection();
              return;
            } else {
              // Invalid premove - just clear selection
              logger.debug(`Invalid premove attempt: ${from} -> ${to}`);
              gameState.clearSelection();
              return;
            }
          } else {
            // It's player's turn but move is invalid - reject it
            logger.debug(`Invalid move during player's turn: ${from} -> ${to}`);
            gameState.clearSelection();
            return;
          }
        }

        // Execute the move with animation (click-to-move always animates)
        handleMoveExecution(from, to, true);
      } else {
        // No square selected - select this square if it has a piece
        if (piece) {
          const pieceColor = piece[0] === "W" ? "white" : "black";
          // Allow selecting own pieces (for premoves during opponent's turn)
          if (pieceColor === gameState.playerColor) {
            logger.debug(`Selecting square ${squareName} with piece ${piece}`);
            console.log(
              `[ChessBoard] Calling selectSquare(${squareName}, ${gameState.isOpponentTurn()})`
            );
            console.log(
              `[ChessBoard] Player color: ${gameState.playerColor}, Current player: ${gameState.gameState.currentPlayer}`
            );
            gameState.selectSquare(squareName, gameState.isOpponentTurn());
            console.log(
              `[ChessBoard] After selectSquare, validMoves:`,
              gameState.gameState.validMoves
            );
          } else {
            logger.debug(`Cannot select opponent piece at ${squareName}`);
          }
        } else {
          // Clicked on empty square - clear any selection
          gameState.clearSelection();
          logger.debug(`No piece to select at ${squareName}`);
        }
      }
    },
    [gameState, premoves, handleMoveExecution, previewBoard]
  );

  // Handle piece pointer down - for drag and drop AND selection
  const handlePiecePointerDown = useCallback(
    (event: React.PointerEvent, piece: string, squareName: string): boolean => {
      const pieceColor = piece[0] === "W" ? "white" : "black";
      if (pieceColor === gameState.playerColor) {
        logger.debug(`handlePiecePointerDown: square=${squareName}, piece=${piece}`);
        logger.debug(
          `  currentPlayer=${gameState.gameState.currentPlayer}, playerColor=${gameState.playerColor}`
        );
        logger.debug(
          `  isOpponentTurn(): ${gameState.isOpponentTurn()}, dragStartedDuringOpponentTurnRef=${
            dragStartedDuringOpponentTurnRef.current
          }`
        );
        logger.debug(
          `  selected=${gameState.gameState.selectedSquare}, validMoves=${JSON.stringify(
            gameState.gameState.validMoves
          )}, premoveQueueLen=${premoves.premoveQueueRef.current.length}`
        );
        // Store initial pointer position to detect if this is a click or drag
        pointerDownPosRef.current = { x: event.clientX, y: event.clientY };

        // Remember if drag started during opponent's turn (for premove intent)
        dragStartedDuringOpponentTurnRef.current = gameState.isOpponentTurn();

        // Select the square immediately (shows move hints)
        gameState.selectSquare(squareName, gameState.isOpponentTurn());

        // Start drag visual feedback
        dragDrop.startDrag(piece, squareName, event.pointerId, event.clientX, event.clientY);
        lastMoveWasDragRef.current = false; // Will be set to true if actual movement detected
        return true;
      }
      return false;
    },
    [gameState, dragDrop, premoves]
  );

  // Handle drag end (drop) with move execution
  const handleDragEnd = useCallback(
    (fromSquare: string, toSquare: string, wasDragged: boolean) => {
      logger.debug(`handleDragEnd: ${fromSquare} -> ${toSquare}, wasDragged: ${wasDragged}`);
      logger.debug(
        `  currentPlayer=${gameState.gameState.currentPlayer}, playerColor=${gameState.playerColor}`
      );
      logger.debug(
        `  isOpponentTurn(): ${gameState.isOpponentTurn()}, dragStartedDuringOpponentTurnRef=${
          dragStartedDuringOpponentTurnRef.current
        }`
      );
      logger.debug(
        `  selected=${gameState.gameState.selectedSquare}, validMoves=${JSON.stringify(
          gameState.gameState.validMoves
        )}, premoveQueueLen=${premoves.premoveQueueRef.current.length}`
      );

      console.log(
        `[Interaction] Drag ended: ${fromSquare} -> ${toSquare} (wasDragged: ${wasDragged})`
      );

      // If released on same square AND no significant movement, it's a click
      if (fromSquare === toSquare && !wasDragged) {
        // This was a click/tap, not a drag - selection already done, just cleanup
        dragDrop.endDrag();
        pointerDownPosRef.current = null;
        logger.debug(`Click/tap detected, selection already showing hints`);
        return;
      }

      // Check if this is a valid move or should be queued as premove
      const playerPrefix = gameState.playerColor === "white" ? "W" : "B";
      const fromFile = fromSquare.charCodeAt(0) - 97;
      const fromRank = 8 - parseInt(fromSquare[1]);
      const pieceAtFrom = previewBoard
        ? previewBoard[fromRank][fromFile]
        : gameState.gameState.boardArray[fromRank][fromFile];
      const isValidMove = gameState.gameState.validMoves?.includes(toSquare) || false;

      // If not a valid move, check if it should be queued as premove
      if (pieceAtFrom && pieceAtFrom[0] === playerPrefix && !isValidMove) {
        // Use the flag from when drag started to determine premove intent
        // This prevents race condition where bot moves between pointerDown and pointerUp
        const wasPremoveIntent = dragStartedDuringOpponentTurnRef.current;

        if (wasPremoveIntent || gameState.isOpponentTurn()) {
          // Allow premove if drag started during opponent's turn OR still opponent's turn
          const premoveMoves = ChessEngineInstance.getPremoveMoves(pieceAtFrom, fromSquare);
          if (premoveMoves.includes(toSquare)) {
            logger.debug(`Queueing valid premove from drag: ${fromSquare} -> ${toSquare}`);
            premoves.queuePremove(fromSquare, toSquare);
            // If the opponent's move already completed and it's now the player's turn,
            // execute the move immediately instead of waiting for executePremoves to run
            if (gameState.gameState.currentPlayer === gameState.playerColor) {
              logger.debug(
                `Turn switched before release; executing queued move immediately: ${fromSquare} -> ${toSquare}`
              );
              // handleMoveExecution will also remove any duplicate premove from the queue
              handleMoveExecution(fromSquare, toSquare, false);
              dragDrop.endDrag();
              dragStartedDuringOpponentTurnRef.current = false;
              return;
            }

            gameState.clearSelection();
            dragDrop.endDrag();
            dragStartedDuringOpponentTurnRef.current = false;
            return;
          } else {
            // Invalid premove - just end drag
            logger.debug(`Invalid premove attempt from drag: ${fromSquare} -> ${toSquare}`);
            gameState.clearSelection();
            dragDrop.endDrag();
            dragStartedDuringOpponentTurnRef.current = false;
            return;
          }
        } else {
          // It's player's turn and move is invalid - reject it
          logger.debug(`Invalid move during player's turn: ${fromSquare} -> ${toSquare}`);
          gameState.clearSelection();
          dragDrop.endDrag();
          dragStartedDuringOpponentTurnRef.current = false;
          return;
        }
      }

      // Execute the move (drag-and-drop does NOT animate - piece is already there)
      handleMoveExecution(fromSquare, toSquare, false);
      dragDrop.endDrag();
      dragStartedDuringOpponentTurnRef.current = false;
    },
    [dragDrop, handleMoveExecution, gameState, premoves, previewBoard]
  );

  return (
    <div className="chess-board-container">
      <MoveHandler gameState={gameState} onGameEnd={onGameEnd} />

      <BoardRenderer
        gameState={gameState.gameState}
        dragDrop={dragDrop}
        premoves={premoves}
        boardOverride={previewBoard}
        onSquareClick={handleSquareClick}
        onPiecePointerDown={handlePiecePointerDown}
        onDragEnd={handleDragEnd}
      />

      {/* Debug information in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="debug-panel">
          <div>Current Player: {gameState.gameState.currentPlayer}</div>
          <div>Selected: {gameState.gameState.selectedSquare || "none"}</div>
          <div>Premoves: {premoves.premoveQueue.length}</div>
          <div>Dragging: {dragDrop.isDragging ? "Yes" : "No"}</div>
          <div>Player Color: {gameState.playerColor}</div>
          <div>Is Opponent Turn: {gameState.isOpponentTurn() ? "Yes" : "No"}</div>
        </div>
      )}
    </div>
  );
});

ChessBoard.displayName = "ChessBoard";

export { ChessBoard };
