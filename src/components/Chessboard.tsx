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

  const handlePieceMouseDown = (
    e: React.MouseEvent<HTMLImageElement>,
    piece: string,
    img: HTMLImageElement
  ) => {
    const squareName = img.parentElement?.id || null;
    lastMouseDownSquare.current = squareName;

    draggingPieceRef.current = piece;
    draggingFromSquareRef.current = squareName;
    selectedPieceRef.current = piece;
    if (squareName) {
      setHighlightedSquares([squareName]);
      const legalMoves = getLegalMoves(
        squareName,
        piece,
        boardArray as string[][],
        player.current
      );
      setValidSquares(legalMoves);
    }
    // Hide the original piece and show custom drag image
    img.style.display = 'none';

    // Set up custom drag image
    const customDragImage = document.querySelector(
      '.custom-drag-image'
    ) as HTMLElement;
    if (customDragImage && squaresize) {
      customDragImage.style.display = 'block';
      customDragImage.style.width = `${squaresize}px`;
      customDragImage.style.height = `${squaresize}px`;
      customDragImage.style.backgroundImage = `url(${img.src})`;
      customDragImage.style.left = `${e.clientX - squaresize / 2}px`;
      customDragImage.style.top = `${e.clientY - squaresize / 2}px`;
    }

    // Add event listeners for drag behavior
    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', mouseUpListener);
    document.body.style.cursor = 'grabbing';
  };

  const handlePieceDragEnd = (e: React.DragEvent<HTMLImageElement>) => {
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
    document.removeEventListener('mousemove', mouseMoveListener);
    document.removeEventListener('mouseup', mouseUpListener);

    // Show the original piece again
    if (draggingPieceRef.current) {
      const pieceElement = document.getElementById(draggingPieceRef.current);
      if (pieceElement) {
        pieceElement.style.display = 'block';
        (pieceElement as HTMLImageElement).style.opacity = '1';
      }
    }

    let pieceSquareElement = document.getElementById(selectedPieceRef.current!);
    let pieceHomeSquare = pieceSquareElement?.parentElement?.id;

    const dropSquareElement = document.getElementById(
      (e.target as HTMLElement).id
    );
    const dropSquare: string = dropSquareElement?.id || '';

    if (
      dropSquare &&
      dropSquare === pieceHomeSquare &&
      selectedPieceRef.current &&
      pieceColor(selectedPieceRef.current) === player.current
    ) {
      // Only deselect if this was a click (mouse down and up on same square)
      if (lastMouseDownSquare.current === dropSquare) {
        setValidSquares([]);
        setHighlightedSquares([]);
        selectedPieceRef.current = null;
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
        lastMouseDownSquare.current = null;
        return;
      } else {
        // If not a click, keep the home square highlighted
        setValidSquares([]);
        setHighlightedSquares([pieceHomeSquare]);
        selectedPieceRef.current = null;
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
        lastMouseDownSquare.current = null;
        return;
      }
    } else {
      if (dropSquare && validSquaresRef.current.includes(dropSquare)) {
        handleDrop(dropSquare);
        selectedPieceRef.current = null;
        return;
      }
    }

    // Reset everything
    selectedPieceRef.current = null;
    draggingPieceRef.current = null;
  };

  const handleDrop = (toSquare: string) => {
    const piece = draggingPieceRef.current;
    const fromSquare = draggingFromSquareRef.current;
    if (!piece || !fromSquare) {
      return;
    }

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
      botPlaying: false,
    };
    handleSquareClickLogic(toSquare, gameState);
    setValidSquares([]);
    setHighlightedSquares([]);
    draggingPieceRef.current = null;
    draggingFromSquareRef.current = null;
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
      onMouseDown={handlePieceMouseDown}
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
