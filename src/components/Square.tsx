import './Square.css';
import Piece from './Piece';

interface SquareProps {
  squareName: string;
  color: string;
  piece?: string;
  onMouseDown?: (
    e: React.MouseEvent<HTMLImageElement>,
    piece: string,
    img: HTMLImageElement
  ) => void;
  onDragEnd?: React.DragEventHandler<HTMLImageElement>;
  onDrop?: (e: React.DragEvent<HTMLDivElement>, squareName: string) => void;
  onDragOver?: (squareName: string) => void;
  onClick?: (squareName: string) => void;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isLegalMove?: boolean;
  isCaptureHint?: boolean;
  squaresize: number;
}

function Square({
  squareName,
  color,
  piece,
  onMouseDown,
  onDragEnd,
  onDrop,
  onDragOver,
  onClick,
  isSelected,
  isHighlighted,
  isLegalMove,
  isCaptureHint,
  squaresize,
}: SquareProps) {
  const className = `${color} square ${isHighlighted ? 'highlight' : ''} ${
    isLegalMove ? 'legal-move' : ''
  } ${isCaptureHint ? 'capture-hint' : ''}`;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    onDragOver?.(squareName);
  };

  return (
    <div
      id={squareName}
      className={className}
      onDragOver={handleDragOver}
      onDrop={(e) => onDrop?.(e, squareName)}
      onClick={() => onClick?.(squareName)}
      style={
        {
          '--border-width': `${(squaresize * 8.889) / 100}px`,
          '--hover-border-width': `${(squaresize * 5) / 100}px`,
        } as React.CSSProperties
      }>
      {piece && (
        <Piece
          piece={piece}
          onMouseDown={onMouseDown}
          onDragEnd={onDragEnd}
        />
      )}
    </div>
  );
}

export default Square;
