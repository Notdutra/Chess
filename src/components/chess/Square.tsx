import React, { useState } from 'react';
import Piece from './Piece';

interface SquareProps {
  squareName: string;
  color: 'light' | 'dark';
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
  squareSize: number;
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
  squareSize,
}: SquareProps) {
  const className = [
    color,
    'square',
    isHighlighted ? 'highlight' : '',
    isLegalMove && !isCaptureHint ? 'legal-move' : '',
    isCaptureHint ? 'capture-hint' : '',
    isSelected ? 'selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Handle drag enter to add visual feedback
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // This is critical to enable drop
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
    onDragOver?.(e);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default to allow drop
    e.stopPropagation();
    setIsDragOver(false);

    // Get the source square from dataTransfer
    const fromSquare = e.dataTransfer.getData('text/plain');
    const piece = e.dataTransfer.getData('application/chess-piece');

    onDrop?.(e);
  };
  return (
    <div
      id={squareName}
      className={`${className} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={() => onSquareMouseDown?.(squareName)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={
        {
          '--border-width': `${(squareSize * 8.889) / 100}px`,
          '--hover-border-width': `${(squareSize * 5) / 100}px`,
        } as React.CSSProperties
      }>
      {piece && (
        <Piece
          piece={piece}
          squareName={squareName}
          onMouseDown={
            onPieceMouseDown
              ? (e) => onPieceMouseDown(e, piece, squareName)
              : undefined
          }
          onDragEnd={onPieceDragEnd}
          onDragStart={
            onPieceDragStart
              ? (e) => onPieceDragStart(e, piece, squareName)
              : undefined
          }
        />
      )}
    </div>
  );
}

export default Square;
