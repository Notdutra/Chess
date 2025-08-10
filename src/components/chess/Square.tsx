import React, { useState } from "react";
import Piece from "./Piece";

interface SquareProps {
  squareName: string;
  color: "light" | "dark";
  piece?: string;
  onSquareMouseDown?: (squareName: string) => void;
  onPieceMouseDown?: (
    e: React.MouseEvent<HTMLImageElement>,
    piece: string,
    squareName: string
  ) => void;
  onPieceDragStart?: (
    e: React.DragEvent<HTMLImageElement>,
    piece: string,
    squareName: string
  ) => void;
  onPieceDragEnd?: (e: React.DragEvent<HTMLImageElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isLegalMove?: boolean;
  isCaptureHint?: boolean;
  isPremove?: boolean;
  squareSize: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  isAnimating?: boolean;
  animationFromSquare?: string;
  animationToSquare?: string;
}

function Square({
  squareName,
  color,
  piece,
  onSquareMouseDown,
  onPieceMouseDown,
  onPieceDragStart,
  onPieceDragEnd,
  onDrop,
  onDragOver,
  onMouseEnter,
  onMouseLeave,
  isSelected,
  isHighlighted,
  isLegalMove,
  isCaptureHint,
  isPremove,
  squareSize,
  isDragging,
  isDragOver,
  isAnimating,
  animationFromSquare,
  animationToSquare,
}: SquareProps) {
  // Compute className after all variables are defined
  const className = [
    color,
    "square",
    isHighlighted ? "highlight" : "",
    isLegalMove && !isCaptureHint ? "legal-move" : "",
    isCaptureHint ? "capture-hint" : "",
    isSelected ? "selected" : "",
    isDragOver ? "drag-over" : "",
    isPremove ? "premove" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Handle drag enter to add visual feedback
  // isDragOver is now controlled by prop from Chessboard
  // No local hover state; drag-over is fully controlled by isDragOver prop

  // Drag-over highlighting is now fully controlled by isDragOver prop from Chessboard

  // Compute cursor style
  let cursorStyle = undefined;
  if (isDragging) {
    cursorStyle = "grabbing";
  } else if (isLegalMove || isCaptureHint) {
    cursorStyle = "pointer";
  } else if (piece) {
    cursorStyle = "grab";
  }

  return (
    <div
      id={squareName}
      className={className}
      onMouseDown={() => onSquareMouseDown?.(squareName)}
      style={
        {
          "--border-width": `${(squareSize * 8.889) / 100}px`,
          "--hover-border-width": `${(squareSize * 5) / 100}px`,
          cursor: cursorStyle,
        } as React.CSSProperties
      }
    >
      {piece && (
        <Piece
          key={squareName}
          piece={piece}
          squareName={squareName}
          isAnimating={isAnimating}
          animationFromSquare={animationFromSquare}
          animationToSquare={animationToSquare}
          onMouseDown={onPieceMouseDown ? (e) => onPieceMouseDown(e, piece, squareName) : undefined}
          onDragEnd={onPieceDragEnd}
          onDragStart={onPieceDragStart ? (e) => onPieceDragStart(e, piece, squareName) : undefined}
        />
      )}
    </div>
  );
}

export default Square;
