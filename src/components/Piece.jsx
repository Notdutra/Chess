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

const pieceImages = {
    BR, BN, BB, BQ, BK, BP,
    WR, WN, WB, WQ, WK, WP
};

const pieceTypes = {
    P: 'pawn',
    R: 'rook',
    N: 'knight',
    B: 'bishop',
    Q: 'queen',
    K: 'king'
};

function Piece({ piece }) {
    const pieceType = piece ? piece.slice(0, 2) : null;
    const pieceImage = pieceType ? pieceImages[pieceType] : null;

    function getPieceType(piece) {
        if (!piece || !piece[1] || !pieceTypes[piece[1]]) return null;
        return pieceTypes[piece[1]];
    }

    function getPieceData(piece) {
        if (!piece || !piece[1] || !pieceTypes[piece[1]]) return null;
        const color = piece[0] === 'W' ? 'white' : 'black';
        const type = pieceTypes[piece[1]];
        const number = piece.slice(2);
        if (type === 'queen' || type === 'king') return color + '-' + type;
        return `${color}-${type}-${number}`;
    }

    const pieceTypeName = getPieceType(piece);
    const pieceData = getPieceData(piece);

    return (
        <div className="piece" id={piece} data-piece={pieceData} data-piece-type={pieceTypeName}>
            {piece && <img src={pieceImage} alt={pieceData} />}
        </div>
    );
}

export default Piece;