import React, { useState } from 'react';
import Square from './Square';
import './styles/ChessBoard.css';

function ChessBoard() {
    const [board, setBoard] = useState(generateInitialBoard());
    const [draggingPiece, setDraggingPiece] = useState(null); // Track the piece being dragged

    // Function to generate the initial board configuration
    function generateInitialBoard() {
        const piecePositions = {
            "a1": "WR", "b1": "WN", "c1": "WB", "d1": "WQ", "e1": "WK", "f1": "WB", "g1": "WN", "h1": "WR",
            "a2": "WP", "b2": "WP", "c2": "WP", "d2": "WP", "e2": "WP", "f2": "WP", "g2": "WP", "h2": "WP",
            "a8": "BR", "b8": "BN", "c8": "BB", "d8": "BQ", "e8": "BK", "f8": "BB", "g8": "BN", "h8": "BR",
            "a7": "BP", "b7": "BP", "c7": "BP", "d7": "BP", "e7": "BP", "f7": "BP", "g7": "BP", "h7": "BP"
        };

        const newBoard = Array(8).fill().map((_, row) => {
            return Array(8).fill().map((_, col) => {
                const color = (row + col) % 2 === 0 ? 'light' : 'dark';
                const pieceKey = `${String.fromCharCode(97 + col)}${8 - row}`; // a1, b1, c1, ...
                const piece = piecePositions[pieceKey] || null; // Fetch piece from positions
                return { piece, color };
            });
        });
        return newBoard;
    }

    // Handle the drag start event
    const handleDragStart = (e, row, col, pieceType) => {
        e.dataTransfer.setData('piece', pieceType);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingPiece({ row, col, pieceType }); // Set the dragging piece info
    };

    // Handle the drop logic and update the board state
    const handleDrop = (e, row, col) => {
        e.preventDefault();
        const pieceType = e.dataTransfer.getData('piece');

        // Get the position of the piece being dragged
        const { row: startRow, col: startCol } = draggingPiece;

        // Create a deep copy of the board
        const newBoard = board.map((r) => [...r]);

        // Move the piece on the board
        newBoard[row][col].piece = pieceType;
        newBoard[startRow][startCol].piece = null;

        // Update the board state
        setBoard(newBoard);
        setDraggingPiece(null); // Reset dragging state
    };

    return (
        <div className="board">
            {board.map((row, rowIndex) => (
                <div key={rowIndex} className="board-row">
                    {row.map((square, colIndex) => (
                        <Square
                            key={`${rowIndex}-${colIndex}`}
                            color={square.color}
                            piece={square.piece}
                            row={rowIndex}
                            column={colIndex}
                            onDragStart={(e) => handleDragStart(e, rowIndex, colIndex, square.piece)}
                            onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

export default ChessBoard;