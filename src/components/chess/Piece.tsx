import React, { useState, useEffect } from 'react';
import { getBasePath } from '../../utils/paths';

const getPieceImages = (): Record<string, string> => {
  const basePath = getBasePath();
  return {
    BR: `${basePath}/pieces/BR.png`,
    BN: `${basePath}/pieces/BN.png`,
    BB: `${basePath}/pieces/BB.png`,
    BQ: `${basePath}/pieces/BQ.png`,
    BK: `${basePath}/pieces/BK.png`,
    BP: `${basePath}/pieces/BP.png`,
    WR: `${basePath}/pieces/WR.png`,
    WN: `${basePath}/pieces/WN.png`,
    WB: `${basePath}/pieces/WB.png`,
    WQ: `${basePath}/pieces/WQ.png`,
    WK: `${basePath}/pieces/WK.png`,
    WP: `${basePath}/pieces/WP.png`,
  };
};

interface PieceProps {
  piece: string;
  squareName?: string; // Add squareName prop
  isDragging?: boolean;
  isAnimating?: boolean;
  isSelected?: boolean;
  onMouseDown?: (
    e: React.MouseEvent<HTMLImageElement>,
    piece: string,
    squareName: string
  ) => void;
  onDragEnd?: React.DragEventHandler<HTMLImageElement>;
  onDragStart?: (
    e: React.DragEvent<HTMLImageElement>,
    piece: string,
    squareName: string
  ) => void;
}

const Piece: React.FC<PieceProps> = ({
  piece,
  squareName,
  isDragging: propIsDragging,
  isAnimating,
  isSelected,
  onMouseDown,
  onDragEnd,
  onDragStart,
}) => {
  const [localIsDragging, setLocalIsDragging] = useState(false);
  const isDragging = propIsDragging || localIsDragging;
  const pieceImages = getPieceImages();
  const pieceImage = piece ? pieceImages[piece.slice(0, 2)] : undefined;

  const className = [
    'piece',
    isDragging ? 'dragging' : '',
    isAnimating ? 'animating' : '',
    isSelected ? 'selected' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleDragStart = (e: React.DragEvent<HTMLImageElement>) => {
    e.stopPropagation();
    setLocalIsDragging(true);

    // Use the passed squareName prop directly
    const currentSquare = squareName || e.currentTarget.parentElement?.id || '';

    try {
      // Set drag image
      const img = new Image();
      img.src = pieceImage || '';
      img.width = 50;
      img.height = 50;

      // Create a transparent drag image (improves UX)
      e.dataTransfer.setDragImage(img, 25, 25);
      e.dataTransfer.effectAllowed = 'move';

      // Critical: set the data first thing
      e.dataTransfer.setData('text/plain', currentSquare);
      e.dataTransfer.setData('application/chess-piece', piece);
    } catch (error) {
      // ignore drag image errors
    }

    if (onDragStart) {
      onDragStart(e, piece, currentSquare);
    }
  };

  const handleDragEnd = (e: React.DragEvent<HTMLImageElement>) => {
    setLocalIsDragging(false);
    if (onDragEnd) {
      onDragEnd(e);
    }
  };

  return pieceImage ? (
    <img
      className={className}
      id={piece}
      data-piece={piece}
      data-square={squareName} // Add data attribute for square name
      src={pieceImage}
      alt={piece}
      draggable={true}
      style={{
        userSelect: 'none',
        touchAction: 'none',
        cursor: 'grab',
      }}
      onMouseDown={(e) =>
        onMouseDown && onMouseDown(e, piece, squareName || '')
      }
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
    />
  ) : null;
};

export default Piece;
