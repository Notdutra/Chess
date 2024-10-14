import React from 'react';
import './styles/Piece.css';

// Import all pieces' images
import WP from './assets/pieces/neo/WP.png';
import WR from './assets/pieces/neo/WR.png';
import WN from './assets/pieces/neo/WN.png';
import WB from './assets/pieces/neo/WB.png';
import WQ from './assets/pieces/neo/WQ.png';
import WK from './assets/pieces/neo/WK.png';
import BP from './assets/pieces/neo/BP.png';
import BR from './assets/pieces/neo/BR.png';
import BN from './assets/pieces/neo/BN.png';
import BB from './assets/pieces/neo/BB.png';
import BQ from './assets/pieces/neo/BQ.png';
import BK from './assets/pieces/neo/BK.png';

function Piece({ type, onDragStart }) {
    const pieceImages = {
        WP: WP,
        WR: WR,
        WN: WN,
        WB: WB,
        WQ: WQ,
        WK: WK,
        BP: BP,
        BR: BR,
        BN: BN,
        BB: BB,
        BQ: BQ,
        BK: BK
    };

    return (
        <img
            className="piece"  // Ensure this class is applied for correct sizing
            src={pieceImages[type]}
            alt={type}
            draggable="true"  // Ensure draggable is true
            onDragStart={(e) => onDragStart(e, type)}  // Pass the handler
        />
    );
}

export default Piece;