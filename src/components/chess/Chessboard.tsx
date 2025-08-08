import React, { useEffect, useState, useRef, useCallback } from 'react';
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

    // Handle hover effect on squares (React state only)
    const dropTarget = document.elementFromPoint(evt.clientX, evt.clientY);
    let currentSquareId: string | null = null;

    if (dropTarget) {
      if (dropTarget.classList.contains('square')) {
        currentSquareId = dropTarget.id;
      } else if (dropTarget.parentElement?.classList.contains('square')) {
        currentSquareId = dropTarget.parentElement.id;
      }
    }

    if (currentSquareId !== hoveredSquare) {
      setHoveredSquare(currentSquareId);
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
  // Debug: wrap setIsDragging to log changes
  const setIsDraggingDebug = (val: boolean) => {
    console.log('[setIsDragging]', val, new Error().stack.split('\n')[2]);
    setIsDragging(val);
  };
  const isDraggingRef = useRef(isDragging);
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const draggingPieceRef = useRef<string | null>(null);
  // Debug: wrap draggingPieceRef setter
  const setDraggingPieceRef = (val: string | null) => {
    console.log('[setDraggingPieceRef]', val, new Error().stack.split('\n')[2]);
    draggingPieceRef.current = val;
  };
  // Debug: wrap draggingFromSquareRef setter
  const setDraggingFromSquareRef = (val: string | null) => {
    console.log(
      '[setDraggingFromSquareRef]',
      val,
      new Error().stack.split('\n')[2]
    );
    draggingFromSquareRef.current = val;
  };
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
        // DEBUG: Log drag/bot move state before mouseup dispatch
        console.log(
          '[executeBotMove] isDraggingRef:',
          isDraggingRef.current,
          'draggingFromSquareRef:',
          draggingFromSquareRef.current,
          'botToSquare:',
          to,
          'botMoveType:',
          moveResult.moveResult?.moveType
        );
        // Clean up any active user drag state when bot makes a move
        const botToSquare = to;
        const botMoveType = moveResult.moveResult?.moveType;
        const userDragging =
          isDraggingRef.current && draggingFromSquareRef.current;

        // Only clear drag state if bot captured the dragged piece
        if (
          userDragging &&
          (botMoveType === 'capture' || botMoveType === 'en-passant') &&
          botToSquare === draggingFromSquareRef.current
        ) {
          console.log(
            '[executeBotMove] Bot captured dragged piece - clearing drag state'
          );
          // Clear drag state since the piece was captured
          setIsDragging(false);
          draggingPieceRef.current = null;
          draggingFromSquareRef.current = null;
          setHoveredSquare(null);
          document.body.style.cursor = 'grab';
          // Remove any lingering drag image and .dragging class
          document
            .querySelectorAll('.custom-drag-image')
            .forEach((el) => el.remove());
          document.querySelectorAll('.dragging').forEach((el) => {
            el.classList.remove('dragging');
          });
          window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        } else {
          console.log(
            '[executeBotMove] Preserving drag state: moveType',
            botMoveType,
            'botToSquare',
            botToSquare,
            'draggingFrom',
            draggingFromSquareRef.current
          );
          // Don't clear drag state - user can continue dragging for premove
        }

        setGameState(moveResult.updatedGameState);
        ChessEngineInstance.setGameState(moveResult.updatedGameState);
        // Play only the most important sound for the bot move
        const result = moveResult.moveResult;
        if (result.isCheckMate) {
          soundManager.playMoveSound('checkmate');
        } else if (result.isCheck) {
          soundManager.playMoveSound('check');
        } else if (
          result.moveType === 'capture' ||
          result.moveType === 'en-passant'
        ) {
          soundManager.playMoveSound('capture');
        } else if (result.moveType === 'castle') {
          soundManager.playMoveSound('castle');
        } else if (result.moveType === 'promotion') {
          soundManager.playMoveSound('promotion');
        } else {
          soundManager.playMoveSound('normal');
        }
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
        handleDrop(toSquare, gameState.selectedSquare); // Pass fromSquare for click-to-move
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
          // Deselect current piece (force state update)
          setGameState((prev) => ({
            ...prev,
            selectedSquare: null,
            validMoves: [],
            highlightedSquares: [],
          }));
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
    e.preventDefault();
    e.stopPropagation();
    if (!fromSquare) return;

    // --- Click-to-move/capture: if this is a valid move, do NOT start drag simulation ---
    if (gameState.selectedSquare && gameState.validMoves.includes(fromSquare)) {
      handleDrop(fromSquare, gameState.selectedSquare);
      // Clean up drag state and image immediately after move
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      setHoveredSquare(null);
      // Remove any drag image and .dragging class
      const pieceElement = e.target as HTMLImageElement;
      document.body.classList.remove('dragging');
      document.body.classList.add('force-grab'); // Force grab cursor
      pieceElement.classList.remove('dragging');
      // Force cursor on piece element as well (with !important)
      pieceElement.style.setProperty('cursor', 'grab', 'important');
      // Remove any custom drag image
      const dragImages = document.querySelectorAll(
        'img[style*="position: fixed"]'
      );
      dragImages.forEach((img) => img.remove());
      // Remove any pending drag event listeners to prevent further drag
      document.removeEventListener('mousemove', mouseMoveListener);
      document.removeEventListener('mouseup', mouseUpListener);
      // Remove force-grab and reset piece cursor on next mouseup anywhere
      const removeForceGrab = () => {
        document.body.classList.remove('force-grab');
        pieceElement.style.removeProperty('cursor');
        window.removeEventListener('mouseup', removeForceGrab);
      };
      window.addEventListener('mouseup', removeForceGrab);
      return;
    }

    // Always trigger grab simulation on mouse down (for drag)
    const pieceElement = e.target as HTMLImageElement;
    document.body.classList.add('dragging');
    document.body.style.cursor = 'grabbing';
    // Set hovered square to the square being picked up
    setHoveredSquare(fromSquare);

    // --- Grab simulation: show drag image immediately and hide original ---
    let dragImage: HTMLImageElement | null = null;
    let dragStarted = false;
    const rect = pieceElement.getBoundingClientRect();
    dragImage = pieceElement.cloneNode(true) as HTMLImageElement;
    dragImage.removeAttribute('class');
    dragImage.removeAttribute('style');
    dragImage.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      width: ${rect.width}px;
      height: ${rect.height}px;
      left: ${e.clientX - rect.width / 2}px;
      top: ${e.clientY - rect.height / 2}px;
      object-fit: contain;
      opacity: 1;
    `;
    // Set hovered square in state for highlight
    const squareEl = pieceElement.closest('.square');
    if (squareEl && squareEl.id) {
      setHoveredSquare(squareEl.id);
    }
    document.body.appendChild(dragImage);
    pieceElement.classList.add('dragging');

    // If a piece is selected and this square is a legal move, treat as click-to-move
    if (gameState.selectedSquare && gameState.validMoves.includes(fromSquare)) {
      handleDrop(fromSquare, gameState.selectedSquare);
      // Clean up drag state and image immediately after move
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      const pieceElement = e.target as HTMLImageElement;
      document.body.classList.add('dragging');
      document.body.style.cursor = 'grabbing';
      document.body.style.cursor = '';
      // Remove any pending drag event listeners to prevent further drag
      document.removeEventListener('mousemove', mouseMoveListener);
      document.removeEventListener('mouseup', mouseUpListener);
      return;
    }

    // Otherwise, only select if it's the player's own piece
    document.body.classList.remove('dragging');
    document.body.style.cursor = '';
    const currentPieceColor = piece[0] === 'W' ? 'white' : 'black';
    if (currentPieceColor === gameState.currentPlayer) {
      if (gameState.selectedSquare !== fromSquare) {
        selectSquare(fromSquare);
      }
    } else {
      // Not player's piece: clear selection if needed, but allow drag for fun
      if (gameState.selectedSquare) {
        setGameState((prev) => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
          highlightedSquares: [],
        }));
      }
    }

    // Always allow drag for fun, regardless of piece color
    lastMouseDownSquare.current = fromSquare;
    draggingPieceRef.current = piece;
    draggingFromSquareRef.current = fromSquare;

    // (removed duplicate declaration)

    const startDrag = (evt: MouseEvent | Event) => {
      if (dragStarted) return;
      dragStarted = true;
      // Only now hide the original piece
      pieceElement.classList.add('dragging');
      setIsDragging(true);
      document.body.classList.add('dragging');
    };

    const updateDragImagePosition = (evt: MouseEvent | Event) => {
      if (!dragStarted || !dragImage) return;
      const mouseEvt = evt as MouseEvent;
      dragImage.style.left = `${
        mouseEvt.clientX - dragImage.offsetWidth / 2
      }px`;
      dragImage.style.top = `${
        mouseEvt.clientY - dragImage.offsetHeight / 2
      }px`;
    };

    const dragImageMoveHandler = (evt: Event) => {
      if (!dragStarted) {
        startDrag(evt);
      }
      updateDragImagePosition(evt);
    };
    document.addEventListener('mousemove', dragImageMoveHandler);

    const dragImageUpHandler = () => {
      // Remove hover effect from the square
      setHoveredSquare(null);
      if (dragImage) dragImage.remove();
      pieceElement.classList.remove('dragging');
      document.removeEventListener('mousemove', dragImageMoveHandler);
    };
    document.addEventListener('mouseup', dragImageUpHandler, { once: true });

    document.addEventListener('mousemove', mouseMoveListener);
    document.addEventListener('mouseup', mouseUpListener);
  };

  // Handle piece drop or click-to-move
  const handleDrop = (dropSquare: string, fromSquareOverride?: string) => {
    const fromSquare = fromSquareOverride || draggingFromSquareRef.current;
    if (!fromSquare) {
      console.error('No fromSquare in draggingFromSquareRef or argument!');
      // Always reset cursor and drag state if something goes wrong
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.style.cursor = 'grab';
      return;
    }

    // Only allow move logic if the piece belongs to the current player
    const piece = ChessEngineInstance.getPieceAtPosition(fromSquare);
    const currentPieceColor =
      piece && piece[0] === 'W'
        ? 'white'
        : piece && piece[0] === 'B'
        ? 'black'
        : null;
    if (currentPieceColor !== gameState.currentPlayer) {
      // Not player's piece: treat as invalid drop, just clean up drag state
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.style.cursor = 'grab';
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

    // Play only the most important sound for the move
    if (result.isCheckMate) {
      soundManager.playMoveSound('checkmate');
    } else if (result.isCheck) {
      soundManager.playMoveSound('check');
    } else if (
      result.moveType === 'capture' ||
      result.moveType === 'en-passant'
    ) {
      soundManager.playMoveSound('capture');
    } else if (result.moveType === 'castle') {
      soundManager.playMoveSound('castle');
    } else if (result.moveType === 'promotion') {
      soundManager.playMoveSound('promotion');
    } else {
      soundManager.playMoveSound('normal');
    }

    // Determine bot color on first move if not set
    if (gameState.gameMode === 'ai' && !botColorRef.current) {
      botColorRef.current = updatedGameState.currentPlayer;
    }

    // Clean up drag state BEFORE bot move to prevent interference
    setIsDragging(false);
    draggingPieceRef.current = null;
    draggingFromSquareRef.current = null;
    document.body.style.cursor = 'grab';

    // If playing against computer, make AI move after drag cleanup
    if (
      gameState.gameMode === 'ai' &&
      botColorRef.current === updatedGameState.currentPlayer
    ) {
      makeBotMove(updatedGameState);
    }

    // Remove any lingering drag image and .dragging class
    document
      .querySelectorAll('.custom-drag-image')
      .forEach((el) => el.remove());
    document
      .querySelectorAll('.dragging')
      .forEach((el) => el.classList.remove('dragging'));
    document.querySelectorAll('img').forEach((img) => {
      if (img.style.position === 'fixed') img.remove();
    });
    // Force mouseup event to end any browser drag
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    // Force React to update board state immediately after drag cleanup
    window.requestAnimationFrame(() => {
      setGameState(updatedGameState);
    });
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
        isDragging={isDragging}
        isDragOver={hoveredSquare === squareName}
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
