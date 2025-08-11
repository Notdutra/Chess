import React from "react";
import { getBasePath } from "../../utils/paths";

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
  squareName?: string;
  isDragging?: boolean;
  isAnimating?: boolean;
  isSelected?: boolean;
  onMouseDown?: (e: React.MouseEvent<HTMLImageElement>, piece: string, squareName: string) => void;
  onDragEnd?: React.DragEventHandler<HTMLImageElement>;
  onDragStart?: (e: React.DragEvent<HTMLImageElement>, piece: string, squareName: string) => void;
}

const Piece: React.FC<PieceProps> = ({
  piece,
  squareName,
  isDragging,
  isAnimating,
  isSelected,
  onMouseDown,
}) => {
  // No local drag state or effects needed
  const pieceImages = getPieceImages();
  const pieceImage = piece ? pieceImages[piece.slice(0, 2)] : undefined;

  const className = [
    "piece",
    isDragging ? "dragging" : "",
    isAnimating ? "animating" : "",
    isSelected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // No local drag handlers needed

  return pieceImage ? (
    <img
      className={className}
      id={piece}
      data-piece={piece}
      data-square={squareName}
      src={pieceImage}
      alt={piece}
      draggable={false}
      style={{
        userSelect: "none",
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "inherit",
      }}
      onMouseDown={onMouseDown ? (e) => onMouseDown(e, piece, squareName || "") : undefined}
    />
  ) : null;
};

export default Piece;
