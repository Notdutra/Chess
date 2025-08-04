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
  onMouseDown?: (
    e: React.MouseEvent<HTMLImageElement>,
    piece: string,
    img: HTMLImageElement
  ) => void;
  onDragEnd?: React.DragEventHandler<HTMLImageElement>;
  onDragStart?: (
    e: React.DragEvent<HTMLImageElement>,
    piece: string,
    img: HTMLImageElement
  ) => void;
}

const Piece: React.FC<PieceProps> = ({
  piece,
  onMouseDown,
  onDragEnd,
  onDragStart,
}) => {
  const pieceImage = piece ? pieceImages[piece.slice(0, 2)] : undefined;

  return pieceImage ? (
    <img
      className="piece"
      id={piece}
      data-piece={piece}
      src={pieceImage}
      alt={piece}
      draggable={true}
      style={{ userSelect: 'none', touchAction: 'none' }}
      onMouseDown={
        onMouseDown
          ? (e) => {
              console.log('🖱️ Piece onMouseDown triggered for piece:', piece);
              onMouseDown(e, piece, e.currentTarget);
            }
          : undefined
      }
      onDragEnd={onDragEnd}
      onDragStart={
        onDragStart
          ? (e) => {
              console.log('🐉 Piece onDragStart triggered for piece:', piece);
              onDragStart(e, piece, e.currentTarget);
            }
          : undefined
      }
    />
  ) : null;
};

export default Piece;
