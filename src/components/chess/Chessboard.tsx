import React, {
  useEffect,
  useState,
  useRef,
  MouseEvent,
  useCallback,
} from 'react';
import { getValidMoves, executeMove } from './GameLogic';

import Square from './Square';
import { ChessEngineInstance } from '../../logic/ChessEngine';
import { GameState } from '../../models/GameState';
import { PieceColor } from '../../models/Piece';
import soundManager from '../../services/SoundManager';
import ChessApi from '../../services/chessApi';

// Board letters and numbers for algebraic notation
const boardLetters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const boardNumbers = ['8', '7', '6', '5', '4', '3', '2', '1'];

const Chessboard = () => {
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
  // Restore missing refs for drag and hover logic
  const draggingFromSquareRef = useRef<string | null>(null);
  const validSquaresRef = useRef<string[]>([]);
  const lastHoveredSquareRef = useRef<string | null>(null);
  const lastMouseDownSquare = useRef<string | null>(null);
  const playerRef = useRef<PieceColor>('white');
  const botColorRef = useRef<PieceColor | null>(null);
  // Use a single gameState object managed by the chess engine
  const [gameState, setGameState] = useState<GameState>(
    ChessEngineInstance.getGameState()
  );

  // UI specific state
  const [squareSize, setSquareSize] = useState<number>(60); // Default size
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const draggingPieceRef = useRef<string | null>(null);
  const chessApiRef = useRef<ChessApi | null>(null);
  // Execute bot move received from API
  // Always use the latest state for bot move
  const executeBotMove = useCallback(
    (moveString: string, stateOverride?: GameState) => {
      const from = moveString.slice(0, 2);
      const to = moveString.slice(2, 4);
      const promotion = moveString.length > 4 ? moveString.slice(4) : null;

      // Use the most up-to-date state
      const baseState = stateOverride || ChessEngineInstance.getGameState();
      let updatedGameState = { ...baseState };

      let moveResult = null;
      if (promotion) {
        moveResult = executeMove(
          from,
          to,
          updatedGameState,
          updatedGameState.currentPlayer
        );
      } else {
        moveResult = executeMove(
          from,
          to,
          updatedGameState,
          updatedGameState.currentPlayer
        );
      }

      if (moveResult && moveResult.updatedGameState) {
        setGameState(moveResult.updatedGameState);
        ChessEngineInstance.setGameState(moveResult.updatedGameState);
        soundManager.playMoveSound('normal');
      } else {
        console.error('Bot move could not be executed:', moveString);
      }

      setIsBotThinking(false);
    },
    []
  );

  // --- All useEffect hooks must be at the top level of the component, not inside any function ---
  useEffect(() => {
    if (gameState.gameMode === 'ai' && !chessApiRef.current) {
      const api = new ChessApi();
      api.onMove((move: string) => {
        // Always use the latest engine state for bot move
        executeBotMove(move, ChessEngineInstance.getGameState());
      });
      api.onError((error: any) => {
        console.error('Chess API error:', error);
        setIsBotThinking(false);
      });
      api.onLoading((loading: boolean) => {
        setIsBotThinking(loading);
      });
      chessApiRef.current = api;
    }
    return () => {
      if (chessApiRef.current) {
        chessApiRef.current.disconnect();
        chessApiRef.current = null;
      }
    };
  }, [gameState.gameMode, executeBotMove]);

  useEffect(() => {
    if (gameState.checkmate) {
      soundManager.playGameStateSound('end');
    } else if (gameState.whiteKingInCheck || gameState.blackKingInCheck) {
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

  useEffect(() => {
    soundManager.loadSounds();
    soundManager.setGlobalVolume(0.5);
    // soundManager.playGameStateSound('start');
  }, []);

  useEffect(() => {
    const boardElement = document.querySelector('.chessboard');
    if (!boardElement) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const boardWidth = entry.contentRect.width;
        const newSquareSize = Math.floor(boardWidth / 8);
        setSquareSize(newSquareSize);
      }
    });
    resizeObserver.observe(boardElement);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!isDragging || !draggingFromSquareRef.current) return;
    const dragImage = document.body.querySelector(
      'img[style*="position: fixed"]'
    ) as HTMLImageElement;
    if (dragImage) {
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
    // ...existing code...

    if (isDragging) return; // Prevent click logic during drag
    if (gameState.currentPlayer !== playerRef.current) return;

    // ...existing code...

    // If we already have a selected square, try to make a move
    if (gameState.selectedSquare) {
      const fromSquare = gameState.selectedSquare;
      const toSquare = squareName;

      // Don't do anything if clicking the same square twice
      if (fromSquare === toSquare) {
        sameSquareCounter++;
        // ...existing code...

        // Deselect
        if (sameSquareCounter > 1) {
          // ...existing code...

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

        // Get valid moves from GameLogic
        // Convert boardArray to string[][] (replace nulls with empty string)
        const boardArrayString = gameState.boardArray.map((row) =>
          row.map((cell) => cell || '')
        );
        const validMoves = getValidMoves(piece, squareName, boardArrayString);
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

  // Handle AI moves
  const makeBotMove = async (currentState?: GameState) => {
    const stateToUse = currentState || gameState;
    if (stateToUse.checkmate || stateToUse.stalemate) return;
    if (isBotThinking) return; // Prevent multiple simultaneous requests

    try {
      // Making bot move for current player

      // Only make move if it's bot's turn
      if (stateToUse.currentPlayer !== botColorRef.current) {
        return;
      }

      // Bot's turn confirmed, generating FEN...

      // Temporarily update the engine state to generate correct FEN
      if (currentState) {
        ChessEngineInstance.setGameState(currentState);
      }

      // Get current FEN from the chess engine
      const fen = ChessEngineInstance.convertBoardArrayToFEN();
      console.log('[FEN sent to chess API]:', fen);

      // Request move from chess-api.com
      if (chessApiRef.current) {
        await chessApiRef.current.requestMove(fen);
      } else {
        throw new Error('Chess API not initialized');
      }
    } catch (error) {
      console.error('❌ Error making bot move:', error);
      setIsBotThinking(false);
    }
  };

  // Handle piece mouse down
  const handleMouseDown = (
    e: React.MouseEvent<HTMLImageElement>,
    piece: string,
    fromSquare: string
  ) => {
    // ...existing code...
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

    if (!fromSquare) {
      console.error('No fromSquare in draggingFromSquareRef!');
      return;
    }

    // Use GameLogic to execute the move
    const moveResult = executeMove(
      fromSquare,
      dropSquare,
      gameState,
      gameState.currentPlayer
    );

    if (!moveResult) {
      console.log('❌ Move not allowed');
      return;
    }

    const { updatedGameState, moveResult: result } = moveResult;

    // Update React state
    setGameState(updatedGameState);

    // Sync engine state with new board
    ChessEngineInstance.setGameState({
      ...ChessEngineInstance.getGameState(),
      boardArray: updatedGameState.boardArray,
      currentPlayer: updatedGameState.currentPlayer,
    } as any);

    // Play appropriate sound
    soundManager.playMoveSound(result.moveType);

    // Determine bot color on first move if not set
    if (gameState.gameMode === 'ai' && !botColorRef.current) {
      botColorRef.current = updatedGameState.currentPlayer;
    }

    // If playing against computer, make AI move after delay
    if (
      gameState.gameMode === 'ai' &&
      botColorRef.current === updatedGameState.currentPlayer
    ) {
      setTimeout(() => {
        makeBotMove(updatedGameState);
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
        onSquareMouseDown={handleSquareClick}
        onPieceMouseDown={handleMouseDown}
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
    <div
      className="chessboard-wrapper"
      style={{ position: 'relative' }}>
      {isBotThinking && (
        <div className="bot-thinking-indicator">
          <div className="thinking-spinner"></div>
          <span>Bot is thinking...</span>
        </div>
      )}

      <div className="chessboard-container">{renderBoard()}</div>
    </div>
  );
};

export default Chessboard;
