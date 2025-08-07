import React, { useState, useEffect } from 'react';
import './Piece.css';
import BR from '../assets/pieces/BR.png';
import BN from '../assets/pieces/BN.png';
import BB from '../assets/pieces/BB.png';
import BQ from '../assets/pieces/BQ.png';
import BK from '../assets/pieces/BK.png';
import BP from '../assets/pieces/BP.png';
import WR from '../assets/pieces/WR.png';
import WN from '../assets/pieces/WN.png';
import WB from '../assets/pieces/WB.png';
import WQ from '../assets/pieces/WQ.png';
import WK from '../assets/pieces/WK.png';
import WP from '../assets/pieces/WP.png';

const pieceImages: Record<string, string> = {
  BR,
  BN,
  BB,
  BQ,
  BK,
  BP,
  WR,
  WN,
  WB,
  WQ,
  WK,
  WP,
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
    console.log(`Drag started from: ${currentSquare} with piece: ${piece}`);

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

      console.log(
        `Set dataTransfer with fromSquare=${currentSquare}, piece=${piece}`
      );
    } catch (error) {
      console.error('Error setting drag data:', error);
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
