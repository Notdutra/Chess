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
  isSelected?: boolean;
  isHighlighted?: boolean;
  isLegalMove?: boolean;
  isCaptureHint?: boolean;
  isPremove?: boolean;
  squareSize: number;
  isDragging?: boolean;
  isDragOver?: boolean;
  isAnimating?: boolean;
}
const Square: React.FC<SquareProps> = ({
  squareName,
  color,
  piece,
  onSquareMouseDown,
  onPieceMouseDown,
  onPieceDragStart,
  onPieceDragEnd,
  isSelected,
  isHighlighted,
  isLegalMove,
  isCaptureHint,
  isPremove,
  squareSize,
  isDragging,
  isDragOver,
  isAnimating,
}) => {
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
    cursorStyle = "pointer";
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
          onMouseDown={onPieceMouseDown ? (e) => onPieceMouseDown(e, piece, squareName) : undefined}
          onDragEnd={onPieceDragEnd}
          onDragStart={onPieceDragStart ? (e) => onPieceDragStart(e, piece, squareName) : undefined}
        />
      )}
    </div>
  );
};

export default Square;
