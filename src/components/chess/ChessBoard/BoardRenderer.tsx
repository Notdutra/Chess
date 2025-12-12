import React, { memo } from "react";
import { GameState } from "../../../models/GameState";
import { DragAndDropHook, PremovesHook } from "../../../types/hooks";
import Square from "../Square";

const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h"];
const boardNumbers = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface BoardRendererProps {
  gameState: GameState;
  dragDrop: DragAndDropHook;
  premoves: PremovesHook;
  boardOverride?: (string | null)[][]; // NEW: allow overriding board state for premoves
  onSquareClick?: (squareName: string) => void;
  onPiecePointerDown?: (
    event: React.PointerEvent,
    piece: string,
    squareName: string
  ) => boolean | void;
  onDragEnd?: (fromSquare: string, toSquare: string, wasDragged: boolean) => void;
}

/**
 * Renders the chess board squares and pieces
 * Handles the visual representation and user interactions
 * Memoized for performance optimization
 */
const BoardRenderer: React.FC<BoardRendererProps> = memo(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ({
    gameState,
    dragDrop,
    premoves,
    boardOverride,
    onSquareClick,
    onPiecePointerDown,
    onDragEnd,
  }) => {
    const [squareSize, setSquareSize] = React.useState(60);

    // Handle pointer events for drag and drop
    React.useEffect(() => {
      const handlePointerMove = (event: PointerEvent) => {
        if (dragDrop.isDragging) {
          dragDrop.handlePointerMove(event);
        }
      };

      const handlePointerUp = (event: PointerEvent) => {
        if (dragDrop.isDragging && dragDrop.draggingFromSquare) {
          const dropTarget = document.elementFromPoint(event.clientX, event.clientY);
          let targetSquare: string | null = null;

          if (dropTarget) {
            if ((dropTarget as HTMLElement).classList.contains("square")) {
              targetSquare = (dropTarget as HTMLElement).id;
            } else if (dropTarget.parentElement?.classList.contains("square")) {
              targetSquare = dropTarget.parentElement.id;
            }
          }

          if (targetSquare && onDragEnd) {
            // Determine if this was an actual drag (pointer moved significantly)
            // We'll rely on whether targetSquare differs from draggingFromSquare
            const wasDragged = targetSquare !== dragDrop.draggingFromSquare;
            onDragEnd(dragDrop.draggingFromSquare, targetSquare, wasDragged);
          } else {
            dragDrop.endDrag();
          }
        }
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);

      return () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };
    }, [dragDrop, onDragEnd]);

    // Calculate board orientation
    const squares = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const squareName = `${boardLetters[col]}${boardNumbers[row]}`;
        // Use override if available (for premoves), otherwise real state
        const piece = boardOverride ? boardOverride[row][col] : gameState.boardArray[row][col];

        const isLightSquare = (row + col) % 2 === 0;
        const squareColor = isLightSquare ? "light" : "dark";

        const isSelected = gameState.selectedSquare === squareName;
        const isHighlighted = gameState.highlightedSquares?.includes(squareName) || false;
        const isLegalMove = gameState.validMoves?.includes(squareName) || false;
        // Capture hint logic needs to check the VISUAL piece
        const isCaptureHint = isLegalMove && !!piece;

        // Check if this square has a king in check
        const isKingInCheck =
          (piece === "WK" && gameState.whiteKingInCheck) ||
          (piece === "BK" && gameState.blackKingInCheck);

        // Debug logging for first legal move found
        if (isLegalMove && row === 0 && col === 0) {
          console.log(`[BoardRenderer] Found legal move at ${squareName}:`, {
            validMoves: gameState.validMoves,
            isLegalMove,
            isCaptureHint,
            piece,
          });
        }

        // Both from AND to squares of premoves should have premove styling
        const isPremoveSquare = premoves.premoveQueue.some(
          (p) => p.from === squareName || p.to === squareName
        );
        squares.push(
          <Square
            key={squareName}
            squareName={squareName}
            color={squareColor as "light" | "dark"}
            piece={piece || undefined}
            onSquareMouseDown={(sq) => {
              onSquareClick?.(sq);
            }}
            onPiecePointerDown={(e, p, sq) => {
              onPiecePointerDown?.(e, p, sq);
            }}
            isSelected={isSelected}
            isHighlighted={isHighlighted && !isPremoveSquare}
            isLegalMove={isLegalMove}
            isCaptureHint={isCaptureHint}
            // Both from and to squares of premoves get the red premove styling
            // Premove styling overrides last-move yellow highlighting
            isPremove={isPremoveSquare}
            isKingInCheck={isKingInCheck}
            squareSize={squareSize}
            isDragging={dragDrop.isDragging}
            isDragOver={dragDrop.hoveredSquare === squareName}
          />
        );
      }
    }

    // Handle board resizing
    React.useEffect(() => {
      const boardElement = document.querySelector(".chessboard");
      if (!boardElement) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          const newSquareSize = Math.floor(width / 8);
          setSquareSize(newSquareSize);
        }
      });

      resizeObserver.observe(boardElement);
      return () => resizeObserver.disconnect();
    }, []);

    return (
      <div className="chessboard" style={{ position: "relative" }}>
        {squares}
        {/* Animation is now handled directly in useChessAnimation hook via DOM manipulation */}
      </div>
    );
  }
);

BoardRenderer.displayName = "BoardRenderer";

export { BoardRenderer };
