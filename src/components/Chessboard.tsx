import { useEffect, useState, useRef, MouseEvent } from 'react';
import axios from 'axios';
import './Chessboard.css';
import './Piece.css';
import './Square.css';

import Square from './Square';
import {
  createStartingPositionBoardArray,
  handleSquareClick as handleSquareClickLogic,
  convertBoardArrayToFEN,
  getLegalMoves,
} from './GameLogic';
import soundManager from '../SoundManager';

type BoardArray = (string | null)[][];

const Chessboard: React.FC = () => {
  const player = useRef<'white' | 'black'>('white');
  const selectedSquare = useRef<string | null>(null);
  const [boardArray, setBoardArray] = useState<BoardArray>(
    createStartingPositionBoardArray()
  );
  const [highlightedSquares, setHighlightedSquares] = useState<string[]>([]);
  const [validSquares, setValidSquares] = useState<string[]>([]);
  const validSquaresRef = useRef<string[]>(validSquares);
  const draggingPieceRef = useRef<string | null>(null);
  const draggingFromSquareRef = useRef<string | null>(null);
  const selectedPieceRef = useRef<string | null>(null);
  const sameSquareDrop = useRef<number>(0);
  const pieceColor = (piece: string) => (piece[0] === 'W' ? 'white' : 'black');
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);

  const difficulty = 1;
  const [squaresize, setSquareSize] = useState<number | undefined>(
    (document.querySelector('.square') as HTMLElement)?.clientWidth
  );

  useEffect(() => {
    soundManager.loadSounds();
    soundManager.setGlobalVolume(0.5);
  }, []);

  useEffect(() => {
    validSquaresRef.current = validSquares;
  }, [validSquares]);

  useEffect(() => {
    const handleResize = () => {
      setSquareSize(
        (document.querySelector('.square') as HTMLElement)?.clientWidth
      );
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const mouseMoveListener = (evt: Event) => {
    handleMouseMove(evt as unknown as MouseEvent);
  };
  const mouseUpListener = (evt: Event) => {
    handleMouseUp(evt as unknown as MouseEvent);
  };

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

  const handleSquareClick = (squareName: string) => {
    const gameState = {
      selectedSquare: selectedSquare.current,
      currentPlayer: player.current,
      boardArray,
      setSelectedSquare: (newSelectedSquare: string | null) => {
        selectedSquare.current = newSelectedSquare;
      },
      setBoardArray,
      setCurrentPlayer: (otherPlayer: 'white' | 'black') => {
        player.current = otherPlayer;
      },
      setHighlightedSquares,
      botPlaying: false,
    };
    handleSquareClickLogic(squareName, gameState);
  };

  const fishy = async () => {
    const board: string[][] = boardArray.map((row) =>
      row.map((cell) => cell || '')
    );
    const fen = convertBoardArrayToFEN(board, player.current);

    try {
      const response = await axios.post(
        `https://stockfish.online/api/s/v2.php?fen=${fen}&depth=${difficulty}`
      );
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
            setSelectedSquare: (newSelectedSquare: string | null) => {
              selectedSquare.current = newSelectedSquare;
            },
            setBoardArray,
            setCurrentPlayer: (otherPlayer: 'white' | 'black') => {
              player.current = otherPlayer;
            },
            setHighlightedSquares,
            botPlaying: true,
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

  // Track the last mouse down square for click-to-deselect logic
  const lastMouseDownSquare = useRef<string | null>(null);

  const handleMouseDown = (
    e: React.MouseEvent<HTMLImageElement>,
    piece: string,
    img: HTMLImageElement
  ) => {
    console.log('🖱️ Mouse down on piece:', piece);
    e.preventDefault();
    e.stopPropagation();

    // Only handle pieces of the current player
    const pieceColor = piece[0] === 'W' ? 'white' : 'black';
    if (pieceColor !== player.current) {
      console.log('❌ Not your piece:', piece);
      return;
    }

    const squareName = img.parentElement?.id || null;
    if (!squareName) {
      console.log('No square found for piece:', piece);
      return;
    }

    lastMouseDownSquare.current = squareName;

    // If clicking on different piece, clear old selection
    if (selectedPieceRef.current && selectedPieceRef.current !== piece) {
      console.log('🔄 Different piece clicked - clearing old selection');
      setValidSquares([]);
      setHighlightedSquares([]);
    }

    // Always select the piece and show its moves
    selectedSquare.current = squareName;
    selectedPieceRef.current = piece;
    draggingPieceRef.current = piece;
    draggingFromSquareRef.current = squareName;

    // Highlight square and show legal moves
    setHighlightedSquares([squareName]);

    const legalMoves = getLegalMoves(
      squareName,
      piece,
      boardArray as string[][],
      player.current
    );
    setValidSquares(legalMoves);

    // Hide the original piece and show custom drag image
    img.classList.add('dragging');

    // Set up custom drag image using the parent square's size and piece percentage
    const customDragImage = document.querySelector(
      '.custom-drag-image'
    ) as HTMLElement;
    if (customDragImage && img.parentElement) {
      const squareRect = img.parentElement.getBoundingClientRect();
      const pieceWidth = squareRect.width * 0.9;
      const pieceHeight = squareRect.height * 0.9;
      customDragImage.style.display = 'block';
      customDragImage.style.width = `${pieceWidth}px`;
      customDragImage.style.height = `${pieceHeight}px`;
      customDragImage.style.backgroundImage = `url(${img.src})`;
      customDragImage.style.left = `${e.clientX - pieceWidth / 2}px`;
      customDragImage.style.top = `${e.clientY - pieceHeight / 2}px`;
    }

    // Add event listeners for drag behavior
    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', mouseUpListener);
    document.body.classList.add('dragging');

    console.log('🎯 Piece selected and drag started');
  };

  const handlePieceDragEnd = (e: React.DragEvent<HTMLImageElement>) => {
    console.log('🐉 Piece drag ended');
    const img = e.currentTarget;
    img.style.opacity = '1';
    img.style.display = 'block';
    draggingPieceRef.current = null;
    draggingFromSquareRef.current = null;
  };

  const handleMouseMove = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    handleSquareHover(target.id);

    // Update custom drag image position
    const customDragImage = document.querySelector(
      '.custom-drag-image'
    ) as HTMLElement;
    if (customDragImage && squaresize) {
      customDragImage.style.left = `${e.clientX - squaresize / 2}px`;
      customDragImage.style.top = `${e.clientY - squaresize / 2}px`;
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    console.log('🖱️ Mouse up');
    removeAllHoverSquares();

    // Hide custom drag image
    const customDragImage = document.querySelector(
      '.custom-drag-image'
    ) as HTMLElement;
    if (customDragImage) {
      customDragImage.style.display = 'none';
    }

    // Reset cursor and remove event listeners
    document.body.style.cursor = 'default';
    document.body.classList.remove('dragging');
    document.removeEventListener('mousemove', mouseMoveListener);
    document.removeEventListener('mouseup', mouseUpListener);

    // Show the original piece again
    if (draggingPieceRef.current) {
      const pieceElement = document.getElementById(draggingPieceRef.current);
      if (pieceElement) {
        pieceElement.classList.remove('dragging');
      }
    }

    // Get the target square
    const target = e.target as HTMLElement;
    let targetSquare = target.id;

    // If we clicked on a piece, get its parent square
    if (target.classList.contains('piece') || target.tagName === 'IMG') {
      targetSquare = target.parentElement?.id || '';
    }

    console.log(
      '🎯 Target square:',
      targetSquare,
      'Mouse down was on:',
      lastMouseDownSquare.current
    );

    // If mouse up on same square as mouse down
    if (targetSquare === lastMouseDownSquare.current) {
      console.log('🔄 Same square - keeping selection, ending drag visual');
      // Just end the drag visual but keep piece selected with legal moves shown
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      // Keep selectedPieceRef, selectedSquare, highlightedSquares, and validSquares
      return;
    }

    // If mouse up on a valid move square - execute the move
    if (targetSquare && validSquaresRef.current.includes(targetSquare)) {
      console.log('🎯 Valid move - executing on', targetSquare);
      handleDrop(targetSquare);
      return;
    }

    // Mouse up on invalid square - just end drag visual and keep selection
    console.log('❌ Invalid square - keeping selection');
    draggingPieceRef.current = null;
    draggingFromSquareRef.current = null;
    // Keep selectedPieceRef, selectedSquare, highlightedSquares, and validSquares
  };

  const handleDrop = (dropSquare: string) => {
    console.log('🎯 Handling drop on:', dropSquare);

    if (!selectedPieceRef.current || !draggingFromSquareRef.current) {
      console.log('❌ No piece selected or drag source');
      return;
    }

    const fromSquare = draggingFromSquareRef.current;

    // Clear all UI state immediately
    selectedPieceRef.current = null;
    draggingPieceRef.current = null;
    draggingFromSquareRef.current = null;
    setValidSquares([]);
    setHighlightedSquares([]);

    // Play move sound
    soundManager.play('playerMove');

    // Convert boardArray to string[][] to prevent null values
    const board: string[][] = boardArray.map((row) =>
      row.map((cell) => cell || '')
    );

    // Create game state for the move
    const gameState = {
      board: board,
      setBoard: setBoardArray,
      player: player.current,
      setPlayer: (newPlayer: 'white' | 'black') => {
        player.current = newPlayer;
      },
      setHighlightedSquares,
      setValidSquares,
      validSquares,
      highlightedSquares,
      selectedSquare: selectedSquare.current,
      setSelectedSquare: (square: string | null) => {
        selectedSquare.current = square;
      },
    };

    // Execute the move using the game logic
    handleSquareClickLogic(dropSquare, gameState);
  };

  const handleSquareHover = (squareName: string) => {
    removeAllHoverSquares();
    if (squareName[0] === 'W' || squareName[0] === 'B' || squareName === '')
      return;

    let currentSquare = document.getElementById(squareName);
    if (currentSquare) {
      currentSquare.classList.add('hover-square');
    }
  };

  const removeAllHoverSquares = () => {
    const allSquares = Array.from(document.querySelectorAll('.square'));
    allSquares.forEach((square) => {
      (square as HTMLElement).classList.remove('hover-square');
    });
  };

  const renderSquare = (
    piece: string,
    squareName: string,
    color: string,
    isSelected: boolean,
    isHighlighted: boolean,
    isLegalMove: boolean,
    isCaptureHint: boolean
  ) => (
    <Square
      key={squareName}
      squareName={squareName}
      color={color}
      piece={piece || undefined}
      onMouseDown={handleMouseDown}
      onDragEnd={handlePieceDragEnd}
      onDrop={(_e, sq) => handleDrop(sq)}
      onDragOver={handleSquareHover}
      onClick={handleSquareClick}
      isSelected={isSelected}
      isHighlighted={isHighlighted}
      isLegalMove={isLegalMove}
      isCaptureHint={isCaptureHint}
      squaresize={squaresize || 60}
    />
  );

  const renderBoard = (board: BoardArray) => {
    return board.flatMap((row, rowIndex) => {
      const squareRow = 8 - rowIndex;
      return row.map((piece, columnIndex) => {
        const squareColumnLetter = String.fromCharCode(97 + columnIndex);
        const squareName = `${squareColumnLetter}${squareRow}`;
        const color = (rowIndex + columnIndex) % 2 === 0 ? 'light' : 'dark';
        const isSelected = squareName === selectedSquare.current;
        const isHighlighted = highlightedSquares.includes(squareName);
        const isLegalMove = validSquares.includes(squareName) && !piece;
        const isCaptureHint = validSquares.includes(squareName) && !!piece;
        return renderSquare(
          piece as string,
          squareName,
          color,
          isSelected,
          isHighlighted,
          isLegalMove,
          isCaptureHint
        );
      });
    });
  };

  return (
    <div className="container">
      <div
        className="chessboard"
        onContextMenu={(e) => e.preventDefault()}>
        {renderBoard(boardArray)}
        <div className="custom-drag-image"></div>
      </div>
    </div>
  );
};

export default Chessboard;
