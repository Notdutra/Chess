import React, { useEffect, useState, useRef } from 'react';
import './Chessboard.css';
import Square from './Square';
import { createStartingPositionBoardArray, handleSquareClick as handleSquareClickLogic } from './GameLogic';
import soundManager from '../SoundManager';

function Chessboard() {
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState('white');
    const [boardArray, setBoardArray] = useState(createStartingPositionBoardArray());
    const [highlightedSquares, setHighlightedSquares] = useState([]);
    const [validSquares, setValidSquares] = useState([]);
    const validSquaresRef = useRef(validSquares);
    const draggingPieceRef = useRef(null);
    const draggingFromSquareRef = useRef(null);
    const dragImageRef = useRef(null);
    const selectedPieceRef = useRef(null);
    const sameSquareDrop = useRef(0);

    const pieceColor = (piece) => piece[0] === 'W' ? 'white' : 'black';

    useEffect(() => {
        soundManager.loadSounds();
        soundManager.setGlobalVolume(0.5);
    }, []);

    useEffect(() => {
        sameSquareDrop.current = sameSquareDrop.current;
    }, [sameSquareDrop.current]);

    useEffect(() => {
        selectedPieceRef.current = selectedPieceRef.current;
    }, [selectedPieceRef.current]);

    useEffect(() => {
        validSquaresRef.current = validSquares;
    }, [validSquares]);

    useEffect(() => {
        draggingPieceRef.current = draggingPieceRef.current;
    }, [draggingPieceRef.current]);

    useEffect(() => {
        draggingFromSquareRef.current = draggingFromSquareRef.current;
    }, [draggingFromSquareRef.current]);

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

    const handleMouseDown = (e, piece, squareName) => {
        e.preventDefault();

        if (selectedPieceRef.current) {
            if (pieceColor(selectedPieceRef.current) === currentPlayer) {
                if (validSquaresRef.current.includes(squareName)) {
                    handleSquareClick(squareName);
                    selectedPieceRef.current = null;
                    return;
                }
            }
        }
        if (piece) {
            if (selectedPieceRef.current === null || selectedPieceRef.current !== piece) {
                selectedPieceRef.current = piece;
                handleSquareClick(squareName);
                sameSquareDrop.current = 0;
            }
            const pieceElement = e.target;
            const validSquares = Array.from(document.querySelectorAll('.legal-move, .capture-hint')).map(square => square.id);
            setValidSquares(validSquares);

            if (pieceColor(selectedPieceRef.current) !== currentPlayer) {
                handleSquareClick(squareName);
            }

            pieceElement.style.display = 'none'; // Hide the piece while dragging

            document.body.style.cursor = 'grabbing';
            draggingPieceRef.current = piece;
            draggingFromSquareRef.current = squareName;

            // Create a custom drag image
            const img = dragImageRef.current;
            img.style.backgroundImage = e.target.style.backgroundImage;
            img.style.display = 'block';
            img.style.zIndex = '9999';
            img.style.width = '90px'; // Match this to your square size
            img.style.height = '90px'; // Match this to your square size
            img.style.opacity = '1';
            img.style.position = 'absolute';
            img.style.pointerEvents = 'none';
            document.body.appendChild(img);

            if (img && e.clientX && e.clientY) {
                img.style.left = `${e.clientX - img.clientWidth / 2}px`;
                img.style.top = `${e.clientY - img.clientHeight / 2}px`;
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

        } else {
            if (selectedPieceRef.current && validSquaresRef.current.includes(squareName)) {
                handleSquareClick(squareName);
            }
        }

    };

    const handleMouseMove = (e) => {
        const img = dragImageRef.current;
        if (img && e.clientX && e.clientY) {
            img.style.left = `${e.clientX - img.clientWidth / 2}px`;
            img.style.top = `${e.clientY - img.clientHeight / 2}px`;
        }
    };

    const handleMouseUp = (e) => {
        let pieceSquareElement = document.getElementById(selectedPieceRef.current);
        let pieceHomeSquare = pieceSquareElement.parentElement.id;

        const dropSquareElement = document.getElementById(e.target.id);
        const dropSquare = dropSquareElement.id;

        if (dropSquare === pieceHomeSquare && pieceColor(selectedPieceRef.current) === currentPlayer) {
            if (sameSquareDrop.current > 0) {
                handleSquareClick(dropSquare);
                sameSquareDrop.current = 0;
                document.body.style.cursor = 'default';
                const img = dragImageRef.current;
                img.style.display = 'none';
                document.body.removeChild(img);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                const pieceElement = document.getElementById(draggingPieceRef.current);
                if (pieceElement) {
                    pieceElement.style.display = 'block'; // Show the piece again
                }
                selectedPieceRef.current = null;
                draggingPieceRef.current = null;
                return;
            }
            sameSquareDrop.current++;
            document.body.style.cursor = 'default';
            const img = dragImageRef.current;
            img.style.display = 'none';
            document.body.removeChild(img);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);

            const pieceElement = document.getElementById(draggingPieceRef.current);
            if (pieceElement) {
                pieceElement.style.display = 'block'; // Show the piece again
            }

            return
        } else {
            sameSquareDrop.current++;
            if (validSquaresRef.current.includes(dropSquare)) {
                handleDrop(dropSquare);
                document.body.style.cursor = 'default';
                const img = dragImageRef.current;
                img.style.display = 'none';
                document.body.removeChild(img);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                return
            } else {
            }
            if (draggingPieceRef.current) {
                const pieceElement = document.getElementById(draggingPieceRef.current);
                if (pieceElement) {
                    pieceElement.style.display = 'block'; // Show the piece again
                }
            }

            document.body.style.cursor = 'default';
            const img = dragImageRef.current;
            img.style.display = 'none';
            document.body.removeChild(img);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    };

    const handleDrop = (toSquare) => {
        const piece = draggingPieceRef.current;
        const fromSquare = draggingFromSquareRef.current;
        if (!piece || !fromSquare) {
            return;
        }
        const gameState = {
            selectedSquare: fromSquare,
            currentPlayer,
            boardArray,
            setSelectedSquare,
            setBoardArray,
            setCurrentPlayer,
            setHighlightedSquares
        };
        handleSquareClickLogic(toSquare, gameState);
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
    };

    const renderSquare = (piece, squareName, color, isSelected, isHighlighted, isLegalMove, isCaptureHint) => (
        <Square
            key={squareName}
            squareName={squareName}
            color={color}
            piece={draggingPieceRef.current === squareName ? null : piece} // Hide piece if it is being dragged
            onClick={() => handleSquareClick(squareName)}
            onMouseDown={(e) => handleMouseDown(e, piece, squareName)}
            onDragEnd={handleMouseUp}
            onDrop={(e) => handleDrop(squareName)}
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

    return (
        <div className="chessboard" onContextMenu={(e) => e.preventDefault()}>
            {renderBoard(boardArray)}
            <div
                ref={dragImageRef}
                className="custom-drag-image"
            />
        </div>
    );
}

export default Chessboard;