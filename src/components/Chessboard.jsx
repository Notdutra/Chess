import React, { useEffect, useState } from 'react';
import './Chessboard.css';
import Square from './Square';
import { createStartingPositionBoardArray, handleSquareClick as handleSquareClickLogic } from './GameLogic';

function Chessboard() {
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState('white');
    const [boardArray, setBoardArray] = useState(createStartingPositionBoardArray());
    const [highlightedSquares, setHighlightedSquares] = useState([]);

    useEffect(() => {
        const chessboardElement = document.querySelector('.chessboard');
        const handleContextMenu = (event) => {
            event.preventDefault();
        };
        chessboardElement.addEventListener('contextmenu', handleContextMenu);
        return () => {
            chessboardElement.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const handleSquareClick = (squareName) => {
        const gameState = {
            selectedSquare,
            currentPlayer,
            boardArray,
            setSelectedSquare,
            setBoardArray,
            setCurrentPlayer,
            setHighlightedSquares
        };
        handleSquareClickLogic(squareName, gameState);
    };

    const renderSquare = (piece, squareName, color, isSelected, isHighlighted, isLegalMove, isCaptureHint) => (
        <Square
            key={squareName}
            squareName={squareName}
            color={color}
            piece={piece}
            onClick={() => handleSquareClick(squareName)}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isLegalMove={isLegalMove}
            isCaptureHint={isCaptureHint}
        />
    );

    const renderBoard = (board) => {
        return board.flatMap((row, rowIndex) => {
            const squareRow = 8 - rowIndex;
            return row.map((piece, columnIndex) => {
                const squareColumnLetter = String.fromCharCode(97 + columnIndex);
                const squareName = `${squareColumnLetter}${squareRow}`;
                const color = (rowIndex + columnIndex) % 2 === 0 ? 'light' : 'dark';
                const isHighlighted = highlightedSquares.includes(squareName);
                const isLegalMove = highlightedSquares.includes(squareName) && !piece;
                const isCaptureHint = highlightedSquares.includes(squareName) && piece;
                return renderSquare(piece, squareName, color, squareName === selectedSquare, isHighlighted, isLegalMove, isCaptureHint);
            });
        });
    };

    // Debugging state changes
    useEffect(() => {
    }, [boardArray, currentPlayer, selectedSquare]);

    return (
        <div className="chessboard">
            {renderBoard(boardArray)}
        </div>
    );
}

export default Chessboard;