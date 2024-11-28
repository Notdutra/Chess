import React from 'react';
import './Square.css';
import Piece from './Piece';

function Square({ squareName, color, piece, onMouseMove, onMouseDown, onDragStart, onDragEnd, onDrop, onDragOver, isSelected, isHighlighted, isLegalMove, isCaptureHint, squaresize }) {
    const className = `${color} square ${isSelected ? 'highlight' : ''} ${isLegalMove ? 'legal-move' : ''} ${isCaptureHint ? 'capture-hint' : ''}`;

    const handleDragOver = (e) => {
        e.preventDefault(); // Allow dropping
        onDragOver(squareName);
    };

    return (
        <div
            id={squareName}
            className={className}
            onMouseMove={onMouseMove}
            onMouseDown={onMouseDown}
            onDragOver={handleDragOver}
            onDrop={(e) => onDrop(e, squareName)}
            style={{
                '--border-width': `${(squaresize * 8.889) / 100}px`, // Set the border width as a CSS variable
                '--hover-border-width': `${(squaresize * 5) / 100}px` // Set the hover border width as a CSS variable
            }}
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