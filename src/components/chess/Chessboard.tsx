// ...existing code...
import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChessEngineInstance } from "../../logic/ChessEngine";
import { GameState } from "../../models/GameState";
import { PieceColor } from "../../models/Piece";
import soundManager from "../../services/SoundManager";
import ChessApi from "../../services/chessApi";
import Square from "./Square";
import Piece from "./Piece";

// Board letters and numbers for algebraic notation
const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h"];
const boardNumbers = ["8", "7", "6", "5", "4", "3", "2", "1"];

const Chessboard = () => {
  // Helper function to execute a move and handle post-move actions
  const executeChessMove = (fromSquare: string, toSquare: string) => {
    const result = ChessEngineInstance.makeMove(fromSquare, toSquare);
    if (!result || !result.isValid) {
      console.log("❌ Move not allowed");
      return null;
    }

    const updatedGameState = result.newGameState;
    setGameState(updatedGameState);
    ChessEngineInstance.setGameState(updatedGameState);

    // Sounds based on move type
    const mover = gameState.currentPlayer; // Current player before the move
    const opponentInCheck =
      mover === "white" ? updatedGameState.blackKingInCheck : updatedGameState.whiteKingInCheck;

    if (updatedGameState.checkmate) {
      soundManager.playMoveSound("checkmate");
    } else if (opponentInCheck) {
      soundManager.playMoveSound("check");
    } else if (result.moveType === "capture" || result.moveType === "en-passant") {
      soundManager.playMoveSound("capture");
    } else if (result.moveType === "castle") {
      soundManager.playMoveSound("castle");
    } else if (result.moveType === "promotion") {
      soundManager.playMoveSound("promote");
    } else {
      soundManager.playMoveSound(mover === playerRef.current ? "playerMove" : "opponentMove");
    }

    // Determine bot color on first move if not set
    if (gameState.gameMode === "ai" && !botColorRef.current) {
      botColorRef.current = updatedGameState.currentPlayer;
    }

    // Schedule bot move if it's bot's turn
    if (gameState.gameMode === "ai" && botColorRef.current === updatedGameState.currentPlayer) {
      const thinkingDelay = Math.random() * 1500 + 500;
      setTimeout(() => makeBotMove(updatedGameState), thinkingDelay);
    }

    return updatedGameState;
  };
  // Track if last move was a drag
  const lastMoveWasDragRef = useRef(false);
  useEffect(() => {
    const enableAudio = () => {
      soundManager.preloadAllSounds();
      soundManager.setGlobalVolume(1);
      window.removeEventListener("pointerdown", enableAudio);
    };
    window.addEventListener("pointerdown", enableAudio, { once: true });
    return () => window.removeEventListener("pointerdown", enableAudio);
  }, []);

  // Removed unused refs: lastSelectedSquare, mouseDownOnSelected

  // Handle mouse movement during drag
  const handleMouseMove = (evt: MouseEvent) => {
    const customDragImage = document.querySelector(".custom-drag-image") as HTMLElement;
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
      if (dropTarget.classList.contains("square")) {
        currentSquareId = dropTarget.id;
      } else if (dropTarget.parentElement?.classList.contains("square")) {
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
  const playerRef = useRef<PieceColor>("white");
  const botColorRef = useRef<PieceColor | null>(null);
  // Use a single gameState object managed by the chess engine
  const [gameState, setGameState] = useState<GameState>(ChessEngineInstance.getGameState());

  // State to store a pending premove
  // Queue of pending premoves, executed in order when it becomes the player's turn
  const [pendingPremoves, setPendingPremoves] = useState<Array<{ from: string; to: string }>>([]);

  // UI specific state
  const [squareSize, setSquareSize] = useState<number>(60); // Default size
  const [isDragging, setIsDragging] = useState<boolean>(false);
  // Removed unused setIsDraggingDebug
  const isDraggingRef = useRef(isDragging);
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);

  // Animation state
  const [animatingPiece, setAnimatingPiece] = useState<{
    piece: string;
    fromSquare: string;
    toSquare: string;
    fromRect: DOMRect | null;
    toRect: DOMRect | null;
    animationId: number;
  } | null>(null);

  const draggingPieceRef = useRef<string | null>(null);
  // Removed unused setDraggingPieceRef and setDraggingFromSquareRef
  const chessApiRef = useRef<ChessApi | null>(null);

  // Animation helper function
  // Helper to get the DOMRect of a square
  const getSquareRect = (square: string): DOMRect | null => {
    const el = document.getElementById(square);
    if (el) return el.getBoundingClientRect();
    return null;
  };

  // Animate a move by rendering an absolutely positioned piece, then call a callback after
  const animateMove = useCallback(
    (fromSquare: string, toSquare: string, piece: string, onDone?: () => void) => {
      console.log(
        `[Animation] animateMove called: piece=${piece}, from=${fromSquare}, to=${toSquare}`
      );
      // Get the exact pixel coordinates of the source and destination squares
      const fromRect = getSquareRect(fromSquare);
      const toRect = getSquareRect(toSquare);
      console.log("[Animation] fromRect:", fromRect);
      console.log("[Animation] toRect:", toRect);
      if (!fromRect || !toRect) {
        console.log("[Animation] Missing fromRect or toRect, skipping animation.");
        if (onDone) onDone();
        return;
      }

      const animationId = Date.now() + Math.random();
      setAnimatingPiece({
        piece,
        fromSquare,
        toSquare,
        fromRect,
        toRect,
        animationId,
      });
      console.log("[Animation] animatingPiece set:", {
        piece,
        fromSquare,
        toSquare,
        fromRect,
        toRect,
        animationId,
      });

      // Wait for the animation to complete before calling the callback
      // Duration should match the CSS animation (default 300ms, adjust as needed)
      setTimeout(() => {
        console.log("[Animation] Animation timeout complete, clearing animatingPiece");
        setAnimatingPiece(null);
        if (onDone) {
          console.log("[Animation] Calling onDone callback");
          onDone();
        }
      }, 300);
    },
    []
  );

  // Execute bot move received from API
  // Always use the latest state for bot move
  const executeBotMove = useCallback(
    (moveString: string, stateOverride?: GameState) => {
      const from = moveString.slice(0, 2);
      const to = moveString.slice(2, 4);

      // Ensure engine has latest state
      if (stateOverride) {
        ChessEngineInstance.setGameState(stateOverride);
      }
      const baseState = ChessEngineInstance.getGameState();

      // Always animate before updating state
      const movingPiece = ChessEngineInstance.getPieceAtPosition(from);
      animateMove(from, to, movingPiece || "", () => {
        const result = ChessEngineInstance.makeMove(from, to);
        if (!result || !result.isValid) return;
        const updatedGameState = result.newGameState;
        setGameState(updatedGameState);
        ChessEngineInstance.setGameState(updatedGameState);

        // Sounds
        const mover = baseState.currentPlayer; // bot just moved
        const opponentInCheck =
          mover === "white" ? updatedGameState.blackKingInCheck : updatedGameState.whiteKingInCheck;

        if (updatedGameState.checkmate) {
          soundManager.playMoveSound("checkmate");
        } else if (opponentInCheck) {
          soundManager.playMoveSound("check");
        } else if (result.moveType === "capture" || result.moveType === "en-passant") {
          soundManager.playMoveSound("capture");
        } else if (result.moveType === "castle") {
          soundManager.playMoveSound("castle");
        } else if (result.moveType === "promotion") {
          soundManager.playMoveSound("promote");
        } else {
          soundManager.playMoveSound("opponentMove");
        }
      });
    },
    [animateMove]
  );

  // Removed unused resetPremovePosition
  useEffect(() => {
    if (gameState.currentPlayer !== playerRef.current) return;
    if (!pendingPremoves.length) return;

    // Work on a copy of the queue
    const queue = [...pendingPremoves];
    let executed = false;

    while (queue.length && !executed) {
      const { from, to } = queue[0];

      // For execution, we need to work with the real board state, not visual premove state
      // So we temporarily clear premove positions to check the actual piece position
      const realPiece =
        gameState.boardArray[ChessEngineInstance.squareFromNotation(from).rank]?.[
          ChessEngineInstance.squareFromNotation(from).file
        ];

      if (!realPiece) {
        // Piece no longer exists at the real position; discard this premove
        console.log("[premove] Discarding no-piece premove:", from, "->", to);
        queue.shift();
        continue;
      }

      // Check if the move is legal from the real board state
      const tempGameState = {
        ...gameState,
        premovePositions: {},
        premoveOriginalPositions: {},
      };
      ChessEngineInstance.setGameState(tempGameState);
      const legalMoves = ChessEngineInstance.getValidMoves(realPiece, from) || [];
      ChessEngineInstance.setGameState(gameState); // Restore original state

      if (legalMoves.includes(to)) {
        console.log("[premove] Executing queued premove:", from, "->", to);

        // Clear all premove visual state before executing
        const clearedGameState = {
          ...gameState,
          premovePositions: {},
          premoveOriginalPositions: {},
          premoveSquares: [],
        };
        ChessEngineInstance.setGameState(clearedGameState);
        setGameState(clearedGameState);

        // Remove this premove from the queue
        setPendingPremoves(queue.slice(1));

        // Execute the move
        setTimeout(() => handleDrop(to, from), 0);
        executed = true;
      } else {
        console.log("[premove] Discarding illegal premove:", from, "->", to, "legal:", legalMoves);
        // Not legal in current position; discard and check next
        queue.shift();
      }
    }

    if (!executed && queue.length < pendingPremoves.length) {
      // We discarded some premoves, update the queue and clear visual state
      setPendingPremoves(queue);
      const clearedGameState = {
        ...gameState,
        premovePositions: {},
        premoveOriginalPositions: {},
        premoveSquares: [],
      };
      ChessEngineInstance.setGameState(clearedGameState);
      setGameState(clearedGameState);
    }
  }, [gameState.currentPlayer, pendingPremoves]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- All useEffect hooks must be at the top level of the component, not inside any function ---
  useEffect(() => {
    if (gameState.gameMode === "ai" && !chessApiRef.current) {
      const api = new ChessApi();
      api.onMove((move: string) => {
        // Always use the latest engine state for bot move
        executeBotMove(move, ChessEngineInstance.getGameState());
      });
      api.onError((error: any) => {
        console.error("Chess API error:", error);
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
      soundManager.playGameStateSound("end");
    } else if (gameState.whiteKingInCheck || gameState.blackKingInCheck) {
      if (!gameState.lastMoves || gameState.lastMoves.length === 0) {
        soundManager.playMoveSound("check");
      }
    }
  }, [
    gameState.checkmate,
    gameState.whiteKingInCheck,
    gameState.blackKingInCheck,
    gameState.lastMoves,
  ]);

  useEffect(() => {
    const boardElement = document.querySelector(".chessboard");
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
    const customDragImage = document.querySelector(".custom-drag-image") as HTMLElement;
    if (customDragImage) {
      customDragImage.style.display = "none";
    }

    // Reset cursor and remove event listeners
    document.body.style.cursor = "default";
    document.body.classList.remove("dragging");
    document.removeEventListener("mousemove", mouseMoveListener);
    document.removeEventListener("mouseup", mouseUpListener);

    // Clean up hover effect
    if (lastHoveredSquareRef.current) {
      const prevSquareEl = document.getElementById(lastHoveredSquareRef.current);
      if (prevSquareEl) {
        prevSquareEl.classList.remove("drag-over");
      }
      lastHoveredSquareRef.current = null;
    }

    // Show the original piece again
    if (draggingPieceRef.current) {
      const pieceElement = document.querySelector(".dragging") as HTMLElement;
      if (pieceElement) {
        pieceElement.classList.remove("dragging");
      }
    }

    // Get the target square from the element under the cursor
    const dropTarget = document.elementFromPoint(evt.clientX, evt.clientY);
    let targetSquare = "";
    if (dropTarget) {
      if (dropTarget.classList.contains("square")) {
        targetSquare = dropTarget.id;
      } else if (dropTarget.parentElement?.classList.contains("square")) {
        targetSquare = dropTarget.parentElement.id;
      }
    }

    if (targetSquare === lastMouseDownSquare.current && targetSquare === gameState.selectedSquare) {
      // Deselect if mouse up on the selected square
      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        highlightedSquares: [],
      }));
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
    lastMoveWasDragRef.current = false; // This is a click, not a drag
    if (isDragging) return; // Prevent click logic during drag
    if (gameState.currentPlayer !== playerRef.current) return;

    // If we already have a selected square, try to make a move
    if (gameState.selectedSquare) {
      console.log("Attempting move from", gameState.selectedSquare, "to", squareName);

      const fromSquare = gameState.selectedSquare;
      const toSquare = squareName;

      // Don't do anything if clicking the same square twice
      if (fromSquare === toSquare) {
        sameSquareCounter++;
        console.log("Clicked the same square:", squareName);

        if (sameSquareCounter > 1) {
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
          ((targetPiece[0] === "W" && gameState.currentPlayer === "white") ||
            (targetPiece[0] === "B" && gameState.currentPlayer === "black"))
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
    if (piece) {
      const pieceColor = piece[0] === "W" ? "white" : "black";
      if (pieceColor === gameState.currentPlayer) {
        const updatedGameState = { ...gameState };
        updatedGameState.selectedSquare = squareName;

        // Engine valid moves (fully legal)
        const validMoves = ChessEngineInstance.getValidMoves(piece, squareName);
        updatedGameState.validMoves = validMoves;
        validSquaresRef.current = validMoves;
        updatedGameState.highlightedSquares = [squareName];

        setGameState(updatedGameState);
      } else {
        soundManager.playMoveSound("illegalMove");
      }
    }
  };

  // Select square and show available moves (not necessarily legal)
  const selectSquareWithAvailableMoves = (squareName: string) => {
    const piece = ChessEngineInstance.getPieceAtPosition(squareName);
    if (piece) {
      const updatedGameState = { ...gameState };
      updatedGameState.selectedSquare = squareName;

      // Premove moves (wide, ignores checks)
      const availableMoves = ChessEngineInstance.getPremoveMoves(piece, squareName);

      updatedGameState.validMoves = availableMoves;
      validSquaresRef.current = availableMoves;
      updatedGameState.highlightedSquares = [squareName];

      console.log(
        `[selectSquareWithAvailableMoves] Available moves for ${piece} at ${squareName}:`,
        availableMoves
      );
      setGameState(updatedGameState);
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
      console.log("[FEN sent to chess API]:", fen);

      // Request move from chess-api.com
      if (chessApiRef.current) {
        await chessApiRef.current.requestMove(fen);
      } else {
        throw new Error("Chess API not initialized");
      }
    } catch (error) {
      console.error("❌ Error making bot move:", error);
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
      document.body.classList.remove("dragging");
      document.body.classList.add("force-grab"); // Force grab cursor
      pieceElement.classList.remove("dragging");
      // Force cursor on piece element as well (with !important)
      pieceElement.style.setProperty("cursor", "grab", "important");
      // Remove any custom drag image
      const dragImages = document.querySelectorAll('img[style*="position: fixed"]');
      dragImages.forEach((img) => img.remove());
      // Remove any pending drag event listeners to prevent further drag
      document.removeEventListener("mousemove", mouseMoveListener);
      document.removeEventListener("mouseup", mouseUpListener);
      // Remove force-grab and reset piece cursor on next mouseup anywhere
      const removeForceGrab = () => {
        document.body.classList.remove("force-grab");
        pieceElement.style.removeProperty("cursor");
        window.removeEventListener("mouseup", removeForceGrab);
      };
      window.addEventListener("mouseup", removeForceGrab);
      return;
    }

    // Always trigger grab simulation on mouse down (for drag)
    lastMoveWasDragRef.current = true;
    const pieceElement = e.target as HTMLImageElement;
    document.body.classList.add("dragging");
    document.body.style.cursor = "grabbing";
    // Set hovered square to the square being picked up
    setHoveredSquare(fromSquare);

    // --- Grab simulation: show drag image immediately and hide original ---
    let dragImage: HTMLImageElement | null = null;
    let dragStarted = false;
    const rect = pieceElement.getBoundingClientRect();
    dragImage = pieceElement.cloneNode(true) as HTMLImageElement;
    dragImage.removeAttribute("class");
    dragImage.removeAttribute("style");
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
    const squareEl = pieceElement.closest(".square");
    if (squareEl && squareEl.id) {
      setHoveredSquare(squareEl.id);
    }
    document.body.appendChild(dragImage);
    pieceElement.classList.add("dragging");

    // If a piece is selected and this square is a legal move, treat as click-to-move
    if (gameState.selectedSquare && gameState.validMoves.includes(fromSquare)) {
      handleDrop(fromSquare, gameState.selectedSquare);
      // Clean up drag state and image immediately after move
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      const pieceElement = e.target as HTMLImageElement;
      document.body.classList.add("dragging");
      document.body.style.cursor = "grabbing";
      document.body.style.cursor = "";
      // Remove any pending drag event listeners to prevent further drag
      document.removeEventListener("mousemove", mouseMoveListener);
      document.removeEventListener("mouseup", mouseUpListener);
      return;
    }

    // Otherwise, select the piece and show moves regardless of whose turn it is
    document.body.classList.remove("dragging");
    document.body.style.cursor = "";
    const currentPieceColor = piece[0] === "W" ? "white" : "black";

    if (currentPieceColor === gameState.currentPlayer) {
      // Player's piece and their turn - show legal moves
      if (gameState.selectedSquare !== fromSquare) {
        selectSquare(fromSquare);
      }
    } else if (currentPieceColor === playerRef.current) {
      // Player's piece but not their turn - show available moves
      if (gameState.selectedSquare !== fromSquare) {
        selectSquareWithAvailableMoves(fromSquare);
      }
    } else {
      // Not player's piece: clear selection
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
      pieceElement.classList.add("dragging");
      setIsDragging(true);
      document.body.classList.add("dragging");
    };

    const updateDragImagePosition = (evt: MouseEvent | Event) => {
      if (!dragStarted || !dragImage) return;
      const mouseEvt = evt as MouseEvent;
      dragImage.style.left = `${mouseEvt.clientX - dragImage.offsetWidth / 2}px`;
      dragImage.style.top = `${mouseEvt.clientY - dragImage.offsetHeight / 2}px`;
    };

    const dragImageMoveHandler = (evt: Event) => {
      if (!dragStarted) {
        startDrag(evt);
      }
      updateDragImagePosition(evt);
    };
    document.addEventListener("mousemove", dragImageMoveHandler);

    const dragImageUpHandler = () => {
      // Remove hover effect from the square
      setHoveredSquare(null);
      if (dragImage) dragImage.remove();
      pieceElement.classList.remove("dragging");
      document.removeEventListener("mousemove", dragImageMoveHandler);
    };
    document.addEventListener("mouseup", dragImageUpHandler, { once: true });

    document.addEventListener("mousemove", mouseMoveListener);
    document.addEventListener("mouseup", mouseUpListener);
  };

  // Handle piece drop or click-to-move
  const handleDrop = (dropSquare: string, fromSquareOverride?: string) => {
    // Always use selectedSquare if not dragging, for premove/click-to-move
    const fromSquare =
      fromSquareOverride || draggingFromSquareRef.current || gameState.selectedSquare;

    if (!fromSquare) {
      console.error("[handleDrop] No fromSquare found!");
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.style.cursor = "grab";
      return;
    }

    // Only allow move logic if the piece belongs to the current player
    // OR if this is a premove (user was dragging before bot moved)
    const piece = ChessEngineInstance.getPieceAtPosition(fromSquare);
    const currentPieceColor =
      piece && piece[0] === "W" ? "white" : piece && piece[0] === "B" ? "black" : null;

    const isPremove =
      (isDragging && currentPieceColor === playerRef.current) ||
      (!isDragging &&
        gameState.selectedSquare === fromSquare &&
        currentPieceColor === playerRef.current &&
        gameState.validMoves &&
        gameState.validMoves.includes(dropSquare));
    const isNormalMove = currentPieceColor === gameState.currentPlayer;

    if (isNormalMove) {
      console.log(
        `[handleDrop] Normal move from ${fromSquare} to ${dropSquare}, drag=${lastMoveWasDragRef.current}`
      );
      const movingPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);

      // Handle normal move execution
      const handleMoveComplete = () => {
        // Clean up drag state
        setIsDragging(false);
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
        document.body.style.cursor = "grab";

        // Clean up drag visuals
        document.querySelectorAll(".custom-drag-image").forEach((el) => el.remove());
        document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
        document.querySelectorAll("img").forEach((img) => {
          if ((img as HTMLImageElement).style.position === "fixed") img.remove();
        });
        window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      };

      // Always animate the move, regardless of drag or click
      animateMove(fromSquare, dropSquare, movingPiece || "", () => {
        executeChessMove(fromSquare, dropSquare);
        handleMoveComplete();
      });
    } else {
      // Not player's turn: queue as premove; fallback uses premove moves
      console.log("[handleDrop] Debug premove check:", {
        currentPieceColor,
        playerRefCurrent: playerRef.current,
        gameStateCurrentPlayer: gameState.currentPlayer,
        gameStateSelectedSquare: gameState.selectedSquare,
        fromSquare,
        dropSquare,
        validMoves: gameState.validMoves,
      });

      // Determine if this is a valid premove:
      // - Must be player's piece
      // - Destination must be in either current validMoves for selectedSquare,
      //   OR in the piece's available moves computed ad-hoc (fallback)
      let canQueuePremove = false;
      if (currentPieceColor === playerRef.current) {
        const usingSelected = gameState.selectedSquare === fromSquare;
        const hasValidMoves =
          Array.isArray(gameState.validMoves) && gameState.validMoves.length > 0;
        if (usingSelected && hasValidMoves) {
          canQueuePremove = gameState.validMoves!.includes(dropSquare);
        } else {
          // Fallback: compute available moves directly from engine
          const premovePiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
          const available = premovePiece
            ? ChessEngineInstance.getPremoveMoves(premovePiece, fromSquare)
            : [];
          canQueuePremove = available.includes(dropSquare);
          console.log("[handleDrop] Fallback premove moves", {
            fromSquare,
            available,
          });
        }
      }

      if (canQueuePremove) {
        setPendingPremoves((prev) => [...prev, { from: fromSquare, to: dropSquare }]);
        console.log(`[handleDrop] Premove queued: ${fromSquare} -> ${dropSquare}`);

        // Play premove sound
        soundManager.playMoveSound("premove");

        // Add visual feedback for queued premove - update game state to highlight the target square
        const updatedGameState = { ...gameState };
        updatedGameState.premoveSquares = [...gameState.premoveSquares, dropSquare];

        // Visually move the piece to the destination
        const piece = ChessEngineInstance.getPieceAtPosition(fromSquare);
        if (piece) {
          // Store original position for potential reset (only if not already stored)
          if (!gameState.premoveOriginalPositions[fromSquare]) {
            updatedGameState.premoveOriginalPositions = {
              ...gameState.premoveOriginalPositions,
              [fromSquare]: piece,
            };
          } else {
            // Keep existing original position mapping
            updatedGameState.premoveOriginalPositions = {
              ...gameState.premoveOriginalPositions,
            };
          }

          // Move piece visually to destination
          updatedGameState.premovePositions = {
            ...gameState.premovePositions,
            [dropSquare]: piece,
          };

          // Remove piece from current visual position
          if (gameState.premovePositions[fromSquare]) {
            // Piece is currently in a premove position, remove it from there
            const { [fromSquare]: removedPiece, ...remainingPositions } =
              gameState.premovePositions;
            updatedGameState.premovePositions = {
              ...remainingPositions,
              [dropSquare]: piece,
            };
          } else {
            // Piece is on the actual board, just add it to premove positions
            // DO NOT modify the actual board array for premoves!
            updatedGameState.premovePositions = {
              ...gameState.premovePositions,
              [dropSquare]: piece,
            };
          }
        }

        ChessEngineInstance.setGameState(updatedGameState);
        setGameState(updatedGameState);

        // Clean up drag state after queuing premove
        setIsDragging(false);
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
        document.body.style.cursor = "grab";
      } else {
        console.log("[handleDrop] Invalid move: not player piece or not a valid premove");

        // Clean up drag state for invalid moves
        setIsDragging(false);
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
        document.body.style.cursor = "grab";
      }
    }
  };

  // Render a square with its current piece
  const renderSquare = (
    squareName: string,
    piece: string | null,
    color: string,
    isSelected: boolean,
    isHighlighted: boolean,
    isLegalMove: boolean,
    isCaptureHint: boolean,
    isAnimatingFrom?: boolean,
    isAnimatingTo?: boolean
  ) => {
    // Hide the piece in the source and destination squares during animation
    let showPiece = piece;
    if (
      animatingPiece &&
      (squareName === animatingPiece.fromSquare || squareName === animatingPiece.toSquare)
    ) {
      showPiece = null;
    }
    return (
      <Square
        key={squareName}
        squareName={squareName}
        color={color as "light" | "dark"}
        piece={showPiece || undefined}
        onSquareMouseDown={handleSquareClick}
        onPieceMouseDown={handleMouseDown}
        isSelected={isSelected}
        isHighlighted={isHighlighted}
        isLegalMove={isLegalMove}
        isCaptureHint={isCaptureHint}
        isPremove={gameState.premoveSquares.includes(squareName)}
        squareSize={squareSize}
        isDragging={isDragging}
        isDragOver={hoveredSquare === squareName}
      />
    );
  };

  // Animation: use state to trigger the transform after mount
  const [animTransform, setAnimTransform] = React.useState<"start" | "end">("start");
  React.useEffect(() => {
    if (animatingPiece && animatingPiece.fromRect && animatingPiece.toRect) {
      console.log("[Animation] animatingPiece detected, resetting animTransform to start");
      setAnimTransform("start");
      // Next animation frame, set to 'end' to trigger transition
      requestAnimationFrame(() => {
        console.log("[Animation] requestAnimationFrame: setting animTransform to end");
        setAnimTransform("end");
      });
    }
  }, [animatingPiece]);

  // Render the chessboard and the animating piece absolutely over the board
  const renderBoard = (animTransform: "start" | "end") => {
    const boardSquares = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const squareName = `${boardLetters[col]}${boardNumbers[row]}`;
        const color = (row + col) % 2 === 0 ? "light" : "dark";

        // Determine what piece to show at this square
        let piece = gameState.boardArray[row][col];

        // If there's a premove piece at this position, show it instead
        if (gameState.premovePositions[squareName]) {
          piece = gameState.premovePositions[squareName];
        }
        // If this square's piece has been moved via premove, hide it
        else if (piece && gameState.premoveOriginalPositions[squareName]) {
          piece = null; // Hide the piece since it's been moved via premove
        }

        // Hide the piece in the source and destination squares during animation
        if (
          animatingPiece &&
          (squareName === animatingPiece.fromSquare || squareName === animatingPiece.toSquare)
        ) {
          piece = null;
        }

        const isSelected = gameState.selectedSquare === squareName;
        const isHighlighted = gameState.highlightedSquares.includes(squareName);
        const isLegalMove = gameState.validMoves?.includes(squareName) || false;
        const isCaptureHint = isLegalMove && piece !== null && piece !== "";

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

    // Render the animating piece absolutely over the board
    let animPieceEl = null;
    // Animation: use state to trigger the transform after mount

    if (animatingPiece && animatingPiece.fromRect && animatingPiece.toRect) {
      const boardEl = typeof window !== "undefined" ? document.querySelector(".chessboard") : null;
      if (boardEl) {
        const boardRect = boardEl.getBoundingClientRect();
        const from = animatingPiece.fromRect;
        const to = animatingPiece.toRect;
        const dx = to.left - from.left;
        const dy = to.top - from.top;
        const transform =
          animTransform === "end" ? `translate(${dx}px, ${dy}px)` : "translate(0, 0)";
        console.log("[Animation] Render animPieceEl:", {
          fromSquare: animatingPiece.fromSquare,
          toSquare: animatingPiece.toSquare,
          from,
          to,
          dx,
          dy,
          animTransform,
          transform,
        });
        animPieceEl = (
          <div
            key={animatingPiece.animationId}
            style={{
              position: "absolute",
              left: from.left - boardRect.left,
              top: from.top - boardRect.top,
              width: from.width,
              height: from.height,
              pointerEvents: "none",
              zIndex: 20,
              transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
              transform,
            }}
          >
            <Piece
              piece={animatingPiece.piece}
              squareName={animatingPiece.toSquare}
              isAnimating={true}
            />
          </div>
        );
        console.log("[Animation] No boardEl found for animPieceEl");
      }
    }

    return (
      <div className="chessboard" style={{ position: "relative" }}>
        {boardSquares}
        {animPieceEl}
      </div>
    );
  };

  return (
    <div className="chessboard-wrapper" style={{ position: "relative" }}>
      {isBotThinking && (
        <div className="bot-thinking-indicator">
          <div className="thinking-spinner"></div>
          <span>Bot is thinking...</span>
        </div>
      )}
      <div className="chessboard-container" style={{ position: "relative" }}>
        {renderBoard(animTransform)}
      </div>
    </div>
  );
};

export default Chessboard;
