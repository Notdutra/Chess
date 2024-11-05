import React, { useEffect } from 'react';
import './Chessboard.css';
import Square from './Square';
import { useState } from 'react';
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

    function handleSquareClick(squareName) {
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
    }

    function renderBoard(board) {
        return board.flatMap((row, rowIndex) => {
            const squareRow = 8 - rowIndex;
            return row.map((piece, columnIndex) => {
                const squareColumnLetter = String.fromCharCode(97 + columnIndex);
                const squareName = squareColumnLetter + squareRow;
                const color = (rowIndex + columnIndex) % 2 === 0 ? 'light' : 'dark';
                const isHighlighted = highlightedSquares.includes(squareName);
                const isLegalMove = highlightedSquares.includes(squareName) && !piece;
                const isCaptureHint = highlightedSquares.includes(squareName) && piece;
                return (
                    <Square
                        key={squareName}
                        squareName={squareName}
                        color={color}
                        piece={piece}
                        onClick={() => handleSquareClick(squareName)}
                        isSelected={squareName === selectedSquare}
                        isHighlighted={isHighlighted}
                        isLegalMove={isLegalMove}
                        isCaptureHint={isCaptureHint}
                    />
                );
            });
        });
    }

    return (
        <div className="chessboard">
            {renderBoard(boardArray)}
        </div>
    );
}

export default Chessboard;