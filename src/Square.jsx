import React from 'react';
import Piece from './Piece';
import './styles/Square.css';

function Square({ color, piece, onDragStart, onDrop, row, column }) {
    const handleDrop = (e) => {
        e.preventDefault();
        onDrop(e);  // Trigger the parent component's drop handler
    };

    const allowDrop = (e) => {
        e.preventDefault();  // Allow the drop to occur
    };

    return (
        <div
            className={`square ${color}`}
            onDrop={handleDrop}
            onDragOver={allowDrop}  // Allow dragging over the square
        >
            {piece && <Piece type={piece} onDragStart={onDragStart} />}
        </div>
    );
}

export default Square;