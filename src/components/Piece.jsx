import React from 'react';
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

function Piece({ piece, onDragStart, onDragEnd }) {
    const pieceImage = piece ? pieceImages[piece.slice(0, 2)] : null;

    return (
        <div
            className="piece"
            id={piece}
            data-piece={piece}
            style={{ backgroundImage: `url(${pieceImage})` }}
            draggable="true"
            onDragStart={(e) => onDragStart(e, piece)}
            onDragEnd={onDragEnd}
        />
    );
}

export default Piece;