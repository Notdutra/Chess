import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import './Chessboard.css';
import './Piece.css';
import './Square.css';

import Square from './Square';
import { createStartingPositionBoardArray, handleSquareClick as handleSquareClickLogic, convertBoardArrayToFEN } from './GameLogic';
import soundManager from '../SoundManager';

function Chessboard() {
    const player = useRef('white');
    const selectedSquare = useRef(null);
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
    const [hoveredSquare, setHoveredSquare] = useState(null);

    const dificulty = 1;
    const [squaresize, setSquareSize] = useState(document.querySelector('.square')?.clientWidth);

    useEffect(() => {
        soundManager.loadSounds();
        soundManager.setGlobalVolume(0.5);
    }, []);

    useEffect(() => {
        validSquaresRef.current = validSquares;
    }, [validSquares]);

    useEffect(() => {
        const handleResize = () => {
            setSquareSize(document.querySelector('.square')?.clientWidth);
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call to set the size

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (player.current === 'black') {
            fishy();
        }
    }, [player.current]);

    useEffect(() => {
        if (hoveredSquare) {
            const squareElement = document.getElementById(hoveredSquare);
            if (squareElement) {
                squareElement.classList.add('hover-square');
            }
        }
    }, [hoveredSquare]);

    const handleSquareClick = (squareName) => {
        const gameState = {
            selectedSquare: selectedSquare.current,
            currentPlayer: player.current,
            boardArray,
            setSelectedSquare: (newSelectedSquare) => { selectedSquare.current = newSelectedSquare },
            setBoardArray,
            setCurrentPlayer: (otherPlayer) => { player.current = otherPlayer },
            setHighlightedSquares,
            botPlaying: false
        };
        handleSquareClickLogic(squareName, gameState);
    };

    const fishy = async () => {
        const board = convertBoardArrayToFEN(boardArray, player.current);

        try {
            const response = await axios.post(`https://stockfish.online/api/s/v2.php?fen=${board}&depth=${dificulty}`);
            const { success, bestmove } = response.data;

            if (success) {
                const move = bestmove.split(' ')[1];
                const fromSquare = move.slice(0, 2);
                const toSquare = move.slice(2, 4);

                setTimeout(() => {
                    const gameState = {
                        selectedSquare: fromSquare,
                        currentPlayer: player.current,
                        boardArray,
                        setSelectedSquare: (newSelectedSquare) => { selectedSquare.current = newSelectedSquare },
                        setBoardArray,
                        setCurrentPlayer: (otherPlayer) => { player.current = otherPlayer },
                        setHighlightedSquares,
                        botPlaying: true
                    };
                    handleSquareClickLogic(toSquare, gameState);
                }, 500);
            } else {
                console.error('Stockfish API did not return a successful response');
                console.error(response.data);
            }
        } catch (error) {
            console.error('Error calling Stockfish API:', error);
        }
    };

    const handleMouseDown = (e, piece, squareName) => {
        e.preventDefault();

        if (selectedPieceRef.current) {
            if (pieceColor(selectedPieceRef.current) === player.current && piece !== selectedPieceRef.current) {
                if (validSquaresRef.current.includes(squareName)) {
                    handleSquareClick(squareName);
                    selectedPieceRef.current = null;
                    return;
                }
            } else {
                selectedPieceRef.current = null;
            }
        }

        if (piece) {
            setHoveredSquare(squareName);

            if (selectedPieceRef.current === null || selectedPieceRef.current !== piece) {
                selectedPieceRef.current = piece;
                handleSquareClick(squareName);
                sameSquareDrop.current = 0;
            }

            const pieceElement = e.target;
            const validSquares = Array.from(document.querySelectorAll('.legal-move, .capture-hint')).map(square => square.id);
            setValidSquares(validSquares);

            if (pieceColor(selectedPieceRef.current) !== player.current) {
                handleSquareClick(squareName);
            }

            pieceElement.style.display = 'none'; // Hide the piece while dragging

            document.body.style.cursor = 'grabbing';
            draggingPieceRef.current = piece;
            draggingFromSquareRef.current = squareName;

            const computedStyle = window.getComputedStyle(pieceElement?.parentElement);

            // Create a custom drag image
            const img = dragImageRef.current;
            img.className = 'custom-drag-image';
            img.style.backgroundImage = e.target.style.backgroundImage;
            img.style.display = 'block';
            img.style.width = computedStyle.height;
            img.style.height = computedStyle.height;
            document.body.appendChild(img);

            if (img && e.clientX && e.clientY) {
                img.style.left = `${e.clientX - img.clientWidth / 2}px`;
                img.style.top = `${e.clientY - img.clientHeight / 2}px`;
            }

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    const handleMouseMove = (e) => {
        handleSquareHover(e.target.id);
        const img = dragImageRef.current;
        if (img && e.clientX && e.clientY) {
            img.style.left = `${e.clientX - img.clientWidth / 2}px`;
            img.style.top = `${e.clientY - img.clientHeight / 2}px`;
        }
    };

    const handleMouseUp = (e) => {
        removeAllHoverSquares();

        let pieceSquareElement = document.getElementById(selectedPieceRef.current);
        let pieceHomeSquare = pieceSquareElement?.parentElement?.id;

        const dropSquareElement = document.getElementById(e.target.id);
        const dropSquare = dropSquareElement?.id;

        if (dropSquare === pieceHomeSquare && pieceColor(selectedPieceRef.current) === player.current) {
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

            return;
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
                selectedPieceRef.current = null;
                return;
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
        }
    };

    const handleDrop = (toSquare) => {
        const piece = draggingPieceRef.current;
        const fromSquare = draggingFromSquareRef.current;
        if (!piece || !fromSquare) {
            return;
        }
        const gameState = {
            selectedSquare: fromSquare,
            currentPlayer: player.current,
            boardArray,
            setSelectedSquare: (newSelectedSquare) => { selectedSquare.current = newSelectedSquare },
            setBoardArray,
            setCurrentPlayer: (otherPlayer) => { player.current = otherPlayer },
            setHighlightedSquares,
            botPlaying: false
        };
        handleSquareClickLogic(toSquare, gameState);
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
    };

    const handleSquareHover = (squareName) => {
        removeAllHoverSquares();
        if (squareName[0] === 'W' || squareName[0] === 'B' || squareName === "") return;

        let currentSquare = document.getElementById(squareName);

        currentSquare.classList.add('hover-square');
    };

    const removeAllHoverSquares = () => {
        const allSquares = Array.from(document.querySelectorAll('.square'));
        allSquares.forEach(square => {
            square.classList.remove('hover-square');
        });
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
            onDragOver={handleSquareHover}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            isLegalMove={isLegalMove}
            isCaptureHint={isCaptureHint}
            squaresize={squaresize} // Pass the square size as a prop
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
                return renderSquare(piece, squareName, color, squareName === selectedSquare.current, isHighlighted, isLegalMove, isCaptureHint);
            });
        });
    };

    return (
        <div className="container">
            <div className="chessboard" onContextMenu={(e) => e.preventDefault()}>
                {renderBoard(boardArray)}
                <div
                    ref={dragImageRef}
                    className="custom-drag-image"
                />
            </div>
        </div>
    );
}

export default Chessboard;