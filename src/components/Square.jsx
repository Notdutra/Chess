import React from 'react';
import './Square.css';
import Piece from './Piece';

function Square({ squareName, color, piece, onMouseMove, onMouseDown, onDragStart, onDragEnd, onDrop, isSelected, isHighlighted, isLegalMove, isCaptureHint }) {
    const className = `${color} square ${isSelected ? 'highlight' : ''} ${isLegalMove ? 'legal-move' : ''} ${isCaptureHint ? 'capture-hint' : ''}`;

    const handleDragOver = (e) => {
        e.preventDefault(); // Allow dropping
    };

    return (
        <div
            id={squareName}
            className={className}
            onMouseMove={onMouseMove}
            onMouseDown={onMouseDown}
            onDragOver={handleDragOver}
            onDrop={(e) => onDrop(e, squareName)}
        >
            {piece && <Piece
                piece={piece}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
            />}
        </div>
    );
}

export default Square;