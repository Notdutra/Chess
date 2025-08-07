import React, { useEffect, useState, useRef, MouseEvent } from 'react';

import Square from './Square';
import { ChessEngineInstance } from '../../logic/ChessEngine';
import { GameState } from '../../models/GameState';
import { PieceColor } from '../../models/Piece';
import soundManager from '../../services/SoundManager';

// Board letters and numbers for algebraic notation
const boardLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const boardNumbers = ['8', '7', '6', '5', '4', '3', '2', '1'];

const Chessboard = () => {
  // Use a single gameState object managed by the chess engine
  const [gameState, setGameState] = useState<GameState>(
    ChessEngineInstance.getGameState()
  );

  // UI specific state
  const [squareSize, setSquareSize] = useState<number>(60); // Default size
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const draggingPieceRef = useRef<string | null>(null);
  const draggingFromSquareRef = useRef<string | null>(null);
  const lastMouseDownSquare = useRef<string | null>(null);
  const playerRef = useRef<PieceColor>('white');

  // Refs for DOM elements
  const validSquaresRef = useRef<string[]>([]);
  const lastHoveredSquareRef = useRef<string | null>(null);

  // Effect to handle window resize for responsive board
  useEffect(() => {
    const handleResize = () => {
      const boardContainer = document.querySelector('.board-container');
      if (boardContainer) {
        const width = boardContainer.clientWidth;
        const height = boardContainer.clientHeight;
        const minSize = Math.min(width, height);
        setSquareSize(minSize / 8);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial size

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Play sound when game state changes
  useEffect(() => {
    // Play appropriate sounds based on game state changes
    if (gameState.checkmate) {
      soundManager.playGameStateSound('end');
    } else if (gameState.whiteKingInCheck || gameState.blackKingInCheck) {
      // Avoid duplicate sounds - the move handler already plays check sound
      if (!gameState.lastMoves || gameState.lastMoves.length === 0) {
        soundManager.playMoveSound('check');
      }
    }
  }, [
    gameState.checkmate,
    gameState.whiteKingInCheck,
    gameState.blackKingInCheck,
    gameState.lastMoves,
  ]);

  // Sound setup
  useEffect(() => {
    soundManager.loadSounds();
    soundManager.setGlobalVolume(0.5);

    // Play game start sound when component mounts
    // disabled curently for testing
    // soundManager.playGameStateSound('start');
  }, []);

  // Use ResizeObserver for responsive sizing
  useEffect(() => {
    const boardElement = document.querySelector('.chessboard-container');
    if (!boardElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const containerWidth = entry.contentRect.width;
        const newSquareSize = Math.floor((containerWidth - 16) / 8);
        setSquareSize(newSquareSize);
      }
    });

    resizeObserver.observe(boardElement);
    return () => resizeObserver.disconnect();
  }, []);

  // Update drag image size if squareSize changes during drag
  useEffect(() => {
    if (!isDragging || !draggingFromSquareRef.current) return;

    const dragImage = document.body.querySelector(
      'img[style*="position: fixed"]'
    ) as HTMLImageElement;
    if (dragImage) {
      // Find the original piece element to get its new size
      const originalPiece = document.querySelector(
        `#${draggingFromSquareRef.current} img`
      ) as HTMLImageElement;
      if (originalPiece) {
        const newRect = originalPiece.getBoundingClientRect();
        dragImage.style.width = `${newRect.width}px`;
        dragImage.style.height = `${newRect.height}px`;
      }
    }
  }, [squareSize, isDragging]);

  // Handle mouse movement during drag
  const handleMouseMove = (evt: MouseEvent) => {
    const customDragImage = document.querySelector(
      '.custom-drag-image'
    ) as HTMLElement;
    if (customDragImage) {
      const pieceWidth = customDragImage.offsetWidth;
      const pieceHeight = customDragImage.offsetHeight;
      customDragImage.style.left = `${evt.clientX - pieceWidth / 2}px`;
      customDragImage.style.top = `${evt.clientY - pieceHeight / 2}px`;
    }

    // Handle hover effect on squares
    const dropTarget = document.elementFromPoint(evt.clientX, evt.clientY);
    let currentSquareId: string | null = null;

    if (dropTarget) {
      if (dropTarget.classList.contains('square')) {
        currentSquareId = dropTarget.id;
      } else if (dropTarget.parentElement?.classList.contains('square')) {
        currentSquareId = dropTarget.parentElement.id;
      }
    }

    // If hovering over a new square, update classes
    if (currentSquareId !== lastHoveredSquareRef.current) {
      // Remove class from previously hovered square
      if (lastHoveredSquareRef.current) {
        const prevSquareEl = document.getElementById(
          lastHoveredSquareRef.current
        );
        if (prevSquareEl) {
          prevSquareEl.classList.remove('drag-over');
        }
      }

      // Add class to the new square if it's a valid move
      if (
        currentSquareId &&
        validSquaresRef.current.includes(currentSquareId)
      ) {
        const newSquareEl = document.getElementById(currentSquareId);
        if (newSquareEl) {
          newSquareEl.classList.add('drag-over');
        }
      }

      lastHoveredSquareRef.current = currentSquareId;
    }
  };

  // Handle mouse up to end drag
  const handleMouseUp = (evt: MouseEvent) => {
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

    // Clean up hover effect
    if (lastHoveredSquareRef.current) {
      const prevSquareEl = document.getElementById(
        lastHoveredSquareRef.current
      );
      if (prevSquareEl) {
        prevSquareEl.classList.remove('drag-over');
      }
      lastHoveredSquareRef.current = null;
    }

    // Show the original piece again
    if (draggingPieceRef.current) {
      const pieceElement = document.querySelector('.dragging') as HTMLElement;
      if (pieceElement) {
        pieceElement.classList.remove('dragging');
      }
    }

    // Get the target square from the element under the cursor
    const dropTarget = document.elementFromPoint(evt.clientX, evt.clientY);
    let targetSquare = '';
    if (dropTarget) {
      if (dropTarget.classList.contains('square')) {
        targetSquare = dropTarget.id;
      } else if (dropTarget.parentElement?.classList.contains('square')) {
        targetSquare = dropTarget.parentElement.id;
      }
    }

    if (targetSquare === lastMouseDownSquare.current) {
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      setIsDragging(false);
      return;
    }

    // If there's a valid target square, handle the drop
    if (targetSquare && validSquaresRef.current.includes(targetSquare)) {
      handleDrop(targetSquare);
    } else {
      // If the drop is not on a valid square, just clean up the drag state
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
    }
  };

  // Event listeners
  const mouseMoveListener = (evt: Event) => {
    handleMouseMove(evt as unknown as MouseEvent);
  };

  const mouseUpListener = (evt: Event) => {
    handleMouseUp(evt as unknown as MouseEvent);
  };

  // Handle square click
  let sameSquareCounter: number = 0;
  const handleSquareClick = (squareName: string) => {
    console.log(sameSquareCounter);

    if (isDragging) return; // Prevent click logic during drag
    if (gameState.currentPlayer !== playerRef.current) return;

    console.log(`Handling click on square: ${squareName}`);

    // If we already have a selected square, try to make a move
    if (gameState.selectedSquare) {
      const fromSquare = gameState.selectedSquare;
      const toSquare = squareName;

      // Don't do anything if clicking the same square twice
      if (fromSquare === toSquare) {
        sameSquareCounter++;
        console.log(sameSquareCounter);

        // Deselect
        if (sameSquareCounter > 1) {
          console.log(`Deselecting square: ${fromSquare}`);

          const updatedGameState = { ...gameState };
          updatedGameState.selectedSquare = null;
          updatedGameState.validMoves = [];
          updatedGameState.highlightedSquares = [];
          setGameState(updatedGameState);
          sameSquareCounter = 0; // Reset click count
        }
        return;
      }

      // Check if the clicked square is a valid move
      if (gameState.validMoves.includes(toSquare)) {
        handleDrop(toSquare); // Use handleDrop for move logic
      } else {
        // Check if the square has a piece of the current player
        const targetPiece = ChessEngineInstance.getPieceAtPosition(squareName);
        if (
          targetPiece &&
          ((targetPiece[0] === 'W' && gameState.currentPlayer === 'white') ||
            (targetPiece[0] === 'B' && gameState.currentPlayer === 'black'))
        ) {
          // If clicking on another piece of the same player, select that piece
          selectSquare(squareName);
        } else {
          // Play illegal move sound for invalid moves
          soundManager.playMoveSound('illegal');

          // Deselect current piece
          const updatedGameState = { ...gameState };
          updatedGameState.selectedSquare = null;
          updatedGameState.validMoves = [];
          updatedGameState.highlightedSquares = [];
          setGameState(updatedGameState);
        }
      }
    } else {
      // If no square is selected yet, select this one
      selectSquare(squareName);
    }
  };

  // Helper function to select a square and calculate valid moves
  const selectSquare = (squareName: string) => {
    const piece = ChessEngineInstance.getPieceAtPosition(squareName);

    // Only select squares with pieces of the current player
    if (piece) {
      const pieceColor = piece[0] === 'W' ? 'white' : 'black';
      if (pieceColor === gameState.currentPlayer) {
        // Play a subtle selection sound

        const updatedGameState = { ...gameState };
        updatedGameState.selectedSquare = squareName;

        // In a real implementation, this would come from ChessEngine
        const validMoves = calculateBasicValidMoves(
          squareName,
          piece,
          updatedGameState
        );
        updatedGameState.validMoves = validMoves;
        validSquaresRef.current = validMoves; // Store valid moves for drag-drop
        updatedGameState.highlightedSquares = [squareName];

        setGameState(updatedGameState);
      } else {
        // Not player's turn or piece
        soundManager.playMoveSound('illegal');
      }
    }
  };

  // A simple calculation of valid moves for basic demonstration
  // This would normally be handled by the ChessEngine
  const calculateBasicValidMoves = (
    squareName: string,
    piece: string,
    state: GameState
  ): string[] => {
    // This should be replaced with a call to the actual chess engine
    // For now, returning a dummy array for testing
    const { file, rank } = ChessEngineInstance.squareFromNotation(squareName);
    const validMoves: string[] = [];
    const pieceType = piece[1];
    const pieceColor = piece[0] === 'W' ? 'white' : 'black';

    // Basic pawn moves
    if (pieceType === 'P') {
      const direction = pieceColor === 'white' ? -1 : 1;
      const startRank = pieceColor === 'white' ? 6 : 1;

      // Forward one square
      const newRank = rank + direction;
      if (newRank >= 0 && newRank < 8 && !state.boardArray[newRank][file]) {
        validMoves.push(`${boardLetters[file]}${8 - newRank}`);

        // Forward two squares from starting position
        if (rank === startRank) {
          const twoAhead = rank + 2 * direction;
          if (
            twoAhead >= 0 &&
            twoAhead < 8 &&
            !state.boardArray[twoAhead][file]
          ) {
            validMoves.push(`${boardLetters[file]}${8 - twoAhead}`);
          }
        }
      }

      // Capturing diagonally
      for (const offset of [-1, 1]) {
        const newFile = file + offset;
        if (newFile >= 0 && newFile < 8) {
          const targetPiece = state.boardArray[newRank][newFile];
          if (targetPiece && targetPiece[0] !== piece[0]) {
            // Enemy piece
            validMoves.push(`${boardLetters[newFile]}${8 - newRank}`);
          }
        }
      }
    }

    return validMoves;
  };

  // Handle AI moves
  const makeBotMove = async () => {
    if (gameState.checkmate || gameState.stalemate) return;

    try {
      console.log('Making bot move...');
      // This is a placeholder for AI logic
      // In a real game, you would call your AI engine here
    } catch (error) {
      console.error('Error making bot move:', error);
    }
  };

  // Handle piece mouse down
  const handleMouseDown = (
    e: React.MouseEvent<HTMLImageElement>,
    piece: string,
    fromSquare: string
  ) => {
    console.log('Mouse down on piece:', piece, 'from', fromSquare);
    e.preventDefault();
    e.stopPropagation();

    const currentPieceColor = piece[0] === 'W' ? 'white' : 'black';
    if (
      currentPieceColor !== gameState.currentPlayer ||
      currentPieceColor !== playerRef.current
    ) {
      return;
    }

    if (!fromSquare) return;

    // Select the square if not already selected
    if (gameState.selectedSquare !== fromSquare) {
      selectSquare(fromSquare);
    }

    lastMouseDownSquare.current = fromSquare;
    draggingPieceRef.current = piece;
    draggingFromSquareRef.current = fromSquare;

    // Hide the original piece and show custom drag image
    const pieceElement = e.target as HTMLImageElement;

    // Create and style the drag image - keep it simple
    const dragImage = pieceElement.cloneNode(true) as HTMLImageElement;

    // Clear all styles and classes to avoid conflicts
    dragImage.removeAttribute('class');
    dragImage.removeAttribute('style');

    // Set basic drag image properties
    const rect = pieceElement.getBoundingClientRect();
    dragImage.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      width: ${rect.width}px;
      height: ${rect.height}px;
      left: ${rect.left}px;
      top: ${rect.top}px;
      object-fit: contain;
    `;

    document.body.appendChild(dragImage);
    // Hide the original piece visually (but not with display:none, to keep layout)
    pieceElement.classList.add('dragging');
    setIsDragging(true);

    // Position the drag image
    const updateDragImagePosition = (evt: MouseEvent | Event) => {
      const mouseEvt = evt as MouseEvent;
      dragImage.style.left = `${
        mouseEvt.clientX - dragImage.offsetWidth / 2
      }px`;
      dragImage.style.top = `${
        mouseEvt.clientY - dragImage.offsetHeight / 2
      }px`;
    };

    // Position the drag image after it's rendered
    requestAnimationFrame(() => {
      updateDragImagePosition(e.nativeEvent);
    });

    // Mousemove handler for drag image
    const dragImageMoveHandler = (evt: Event) => {
      updateDragImagePosition(evt);
    };
    document.addEventListener('mousemove', dragImageMoveHandler);

    // Mouseup handler to clean up drag image
    const dragImageUpHandler = () => {
      dragImage.remove();
      document.removeEventListener('mousemove', dragImageMoveHandler);
    };
    document.addEventListener('mouseup', dragImageUpHandler, { once: true });

    // Add event listeners for drag behavior
    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', mouseUpListener);
    document.body.classList.add('dragging');
  };

  // Handle piece drop
  const handleDrop = (dropSquare: string) => {
    const fromSquare = draggingFromSquareRef.current;
    console.log(`Handling drop: from ${fromSquare} to ${dropSquare}`);

    if (!fromSquare) {
      console.error('No fromSquare in draggingFromSquareRef!');
      return;
    }

    const piece = ChessEngineInstance.getPieceAtPosition(fromSquare);
    if (!piece) return;

    // Make the move
    const targetPiece = ChessEngineInstance.getPieceAtPosition(dropSquare);
    const updatedGameState = { ...gameState };

    const { file: fromFile, rank: fromRank } =
      ChessEngineInstance.squareFromNotation(fromSquare);
    const { file: toFile, rank: toRank } =
      ChessEngineInstance.squareFromNotation(dropSquare);

    updatedGameState.boardArray[toRank][toFile] =
      updatedGameState.boardArray[fromRank][fromFile];
    updatedGameState.boardArray[fromRank][fromFile] = '';

    // Clear selection and valid moves
    updatedGameState.selectedSquare = null;
    updatedGameState.validMoves = [];
    updatedGameState.highlightedSquares = [];

    // Toggle player
    updatedGameState.currentPlayer =
      updatedGameState.currentPlayer === 'white' ? 'black' : 'white';

    // Update last moves
    updatedGameState.lastMoves = [fromSquare, dropSquare];

    setGameState(updatedGameState);

    // Determine move type and play appropriate sound
    let moveType:
      | 'normal'
      | 'capture'
      | 'castle'
      | 'promotion'
      | 'en-passant'
      | 'check'
      | 'checkmate' = 'normal';

    if (targetPiece) {
      moveType = 'capture';
    }

    if (
      updatedGameState.whiteKingInCheck ||
      updatedGameState.blackKingInCheck
    ) {
      moveType = updatedGameState.checkmate ? 'checkmate' : 'check';
    }

    if (piece[1] === 'K') {
      const fromFileIdx =
        ChessEngineInstance.squareFromNotation(fromSquare).file;
      const toFileIdx = ChessEngineInstance.squareFromNotation(dropSquare).file;
      if (Math.abs(fromFileIdx - toFileIdx) > 1) {
        moveType = 'castle';
      }
    }

    soundManager.playMoveSound(moveType);

    // If playing against computer, make AI move after delay
    if (
      gameState.gameMode === 'ai' &&
      updatedGameState.currentPlayer === 'black'
    ) {
      setTimeout(() => {
        makeBotMove();
      }, 500);
    }

    // Clean up drag state
    setIsDragging(false);
    draggingPieceRef.current = null;
    draggingFromSquareRef.current = null;
  };

  // Render a square with its current piece
  const renderSquare = (
    squareName: string,
    piece: string | null,
    color: string,
    isSelected: boolean,
    isHighlighted: boolean,
    isLegalMove: boolean,
    isCaptureHint: boolean
  ) => {
    return (
      <Square
        key={squareName}
        squareName={squareName}
        color={color as 'light' | 'dark'}
        piece={piece || undefined}
        onPieceMouseDown={handleMouseDown}
        // onClick={() => handleSquareClick(squareName)}
        isSelected={isSelected}
        isHighlighted={isHighlighted}
        isLegalMove={isLegalMove}
        isCaptureHint={isCaptureHint}
        squareSize={squareSize}
      />
    );
  };

  // Render the chessboard
  const renderBoard = () => {
    const boardSquares = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const squareName = `${boardLetters[col]}${boardNumbers[row]}`;
        const color = (row + col) % 2 === 0 ? 'light' : 'dark';
        const piece = gameState.boardArray[row][col];

        const isSelected = gameState.selectedSquare === squareName;
        const isHighlighted = gameState.highlightedSquares.includes(squareName);
        const isLegalMove = gameState.validMoves?.includes(squareName) || false;
        const isCaptureHint = isLegalMove && piece !== null && piece !== '';

        boardSquares.push(
          renderSquare(
            squareName,
            piece,
            color,
            isSelected,
            isHighlighted,
            isLegalMove,
            isCaptureHint
          )
        );
      }
    }

    return <div className="chessboard">{boardSquares}</div>;
  };

  // Main component render
  return (
    <div className="chessboard-container">
      {renderBoard()}

      <div className="controls">
        <button
          onClick={() => {
            // For now just toggle player
            const updatedGameState = { ...gameState };
            updatedGameState.currentPlayer =
              updatedGameState.currentPlayer === 'white' ? 'black' : 'white';
            setGameState(updatedGameState);
            soundManager.play('playerMove');
          }}>
          Undo
        </button>
        <button
          onClick={() => {
            // For now just toggle player
            const updatedGameState = { ...gameState };
            updatedGameState.currentPlayer =
              updatedGameState.currentPlayer === 'white' ? 'black' : 'white';
            setGameState(updatedGameState);
            soundManager.play('playerMove');
          }}>
          Redo
        </button>
      </div>
    </div>
  );
};

export default Chessboard;
