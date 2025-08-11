// ...existing code...
import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChessEngineInstance } from "../../logic/ChessEngine";
import { GameState } from "../../models/GameState";
import { PieceColor } from "../../models/Piece";
import soundManager from "../../services/SoundManager";
import ChessApi from "../../services/chessApi";
import Square from "./Square";

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
  // Removed: pendingPremoves state (no longer used after debug cleanup)

  // Log pending premoves for debugging (suppresses unused variable warning)
  // (Debug logging removed)

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
    domClone?: HTMLElement | null;
  } | null>(null);

  const draggingPieceRef = useRef<string | null>(null);
  // Removed unused setDraggingPieceRef and setDraggingFromSquareRef
  const chessApiRef = useRef<ChessApi | null>(null);

  // Helper to animate a move by setting animatingPiece and clearing after timeout
  const animateMove = React.useCallback(
    (
      from: string,
      to: string,
      piece: string,
      fromRect: DOMRect,
      toRect: DOMRect,
      onDone?: () => void
    ) => {
      // Production: Remove debug logging and style overlays
      const fromSquareEl = document.getElementById(from);
      // Removed: toSquareEl (no longer used after debug cleanup)
      const fromImg = fromSquareEl ? fromSquareEl.querySelector("img") : null;
      let domClone: HTMLElement | null = null;
      if (fromImg) {
        domClone = fromImg.cloneNode(true) as HTMLElement;
        domClone.className = fromImg.className;
        const computed = window.getComputedStyle(fromImg);
        for (let i = 0; i < computed.length; i++) {
          const prop = computed[i];
          if (prop === "opacity" || prop === "display" || prop === "visibility") continue;
          domClone.style.setProperty(prop, computed.getPropertyValue(prop));
        }
        domClone.style.transform = "none";
        domClone.style.position = "absolute";
        domClone.style.left = `0px`;
        domClone.style.top = `0px`;
        domClone.style.width = `100%`;
        domClone.style.height = `100%`;
        domClone.style.pointerEvents = "none";
        domClone.style.zIndex = "2000";
        domClone.style.userSelect = "none";
        domClone.style.opacity = "1";
        domClone.style.display = "block";
        domClone.style.visibility = "visible";
        domClone.style.objectFit = "contain";
        domClone.style.boxSizing = "border-box";
        domClone.style.border = "none";
        domClone.style.background = "none";
      }
      setAnimatingPiece({
        piece,
        fromSquare: from,
        toSquare: to,
        fromRect,
        toRect,
        animationId: Date.now() + Math.random(),
        domClone,
      });
      setTimeout(() => {
        setAnimatingPiece(null);
        if (onDone) onDone();
      }, 400);
    },
    [setAnimatingPiece]
  );

  // Execute bot move received from Chess API
  const executeBotMove = useCallback(
    (moveString: string, currentState?: GameState) => {
      try {
        // Parse the move string (e.g., "e2e4")
        if (moveString.length < 4) {
          console.error("❌ Invalid bot move format:", moveString);
          return;
        }

        const fromSquare = moveString.substring(0, 2);
        const toSquare = moveString.substring(2, 4);

        console.log(`🤖 Executing bot move: ${fromSquare} -> ${toSquare}`);

        // Use the provided state or current gameState
        const stateToUse = currentState || gameState;
        ChessEngineInstance.setGameState(stateToUse);

        // Execute the move using the normal move handler
        setTimeout(() => handleDrop(toSquare, fromSquare, stateToUse), 100);
      } catch (error) {
        console.error("❌ Error executing bot move:", error);
        setIsBotThinking(false);
      }
    },
    [gameState, setIsBotThinking] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // --- All useEffect hooks must be at the top level of the component, not inside any function ---
  useEffect(() => {
    if (gameState.gameMode === "ai" && !chessApiRef.current) {
      const api = new ChessApi();
      api.onMove((move: string) => {
        // Always use the latest engine state for bot move
        executeBotMove(move, ChessEngineInstance.getGameState());
      });
      api.onError((error: unknown) => {
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
  }, [gameState.gameMode]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const startDrag = () => {
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
        startDrag();
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
  const handleDrop = (
    dropSquare: string,
    fromSquareOverride?: string,
    gameStateOverride?: GameState
  ) => {
    // Use override state if provided (for bot moves), else use current state
    const state = gameStateOverride || gameState;
    const fromSquare = fromSquareOverride || draggingFromSquareRef.current || state.selectedSquare;

    if (!fromSquare) {
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

    // Check if this is a premove or normal move
    const canMakePremove =
      (isDragging && currentPieceColor === playerRef.current) ||
      (!isDragging &&
        state.selectedSquare === fromSquare &&
        currentPieceColor === playerRef.current &&
        state.validMoves &&
        state.validMoves.includes(dropSquare));
    const isNormalMove = currentPieceColor === state.currentPlayer;

    // --- Always use the actual DOMRect of the static piece image if present ---
    function getPieceRect(squareName: string): DOMRect | null {
      const squareEl = document.getElementById(squareName);
      if (!squareEl) return null;
      const img = squareEl.querySelector("img");
      if (img) {
        return img.getBoundingClientRect();
      } else {
        // fallback: 90% of square, centered
        const sq = squareEl.getBoundingClientRect();
        const pieceSize = 0.9;
        return new DOMRect(
          sq.left + (sq.width * (1 - pieceSize)) / 2,
          sq.top + (sq.height * (1 - pieceSize)) / 2,
          sq.width * pieceSize,
          sq.height * pieceSize
        );
      }
    }

    if (isNormalMove) {
      const movingPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);

      const fromRect: DOMRect | null = getPieceRect(fromSquare);
      const toRect: DOMRect | null = getPieceRect(dropSquare);

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

      // ALWAYS animate click-to-move/capture, NEVER animate drag-and-drop
      if (!lastMoveWasDragRef.current && fromRect && toRect) {
        // Click-to-move: animate smoothly
        // DON'T update highlighting state here - it causes flickering apparently

        animateMove(fromSquare, dropSquare, movingPiece || "", fromRect, toRect, () => {
          executeChessMove(fromSquare, dropSquare);
          handleMoveComplete();
        });
      } else {
        // Drag-and-drop: no animation, immediate execution
        executeChessMove(fromSquare, dropSquare);
        handleMoveComplete();
      }
    } else if (canMakePremove) {
      // Not player's turn: queue as premove; fallback uses premove moves

      // Determine if this is a valid premove:
      // - Must be player's piece
      // - Destination must be in either current validMoves for selectedSquare,
      //   OR in the piece's available moves computed ad-hoc (fallback)
      let canQueuePremove = false;
      if (currentPieceColor === playerRef.current) {
        const usingSelected = state.selectedSquare === fromSquare;
        const hasValidMoves = Array.isArray(state.validMoves) && state.validMoves.length > 0;
        if (usingSelected && hasValidMoves) {
          canQueuePremove = state.validMoves!.includes(dropSquare);
        } else {
          // Fallback: compute available moves directly from engine
          const premovePiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
          const available = premovePiece
            ? ChessEngineInstance.getPremoveMoves(premovePiece, fromSquare)
            : [];
          canQueuePremove = available.includes(dropSquare);
        }
      }

      if (canQueuePremove) {
        // (Premove logic removed with debug code)
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
    isCaptureHint: boolean
  ) => {
    // Production: Remove debug overlays and borders
    return (
      <React.Fragment key={squareName + "-frag"}>
        <Square
          key={squareName}
          squareName={squareName}
          color={color as "light" | "dark"}
          piece={piece || undefined}
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
      </React.Fragment>
    );
  };

  // Animation: use state to trigger the transform after mount
  const [animTransform, setAnimTransform] = React.useState<"start" | "end">("start");
  React.useEffect(() => {
    if (animatingPiece && animatingPiece.fromRect && animatingPiece.toRect) {
      setAnimTransform("start");
      // Next animation frame, set to 'end' to trigger transition
      requestAnimationFrame(() => {
        setAnimTransform("end");
      });
    } else if (!animatingPiece) {
      setAnimTransform("start");
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

        // During animation: hide the moving piece at the source square only.
        // Keep the destination square's piece visible (for captures) to avoid flicker.
        if (animatingPiece && squareName === animatingPiece.fromSquare) {
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

    if (
      animatingPiece &&
      animatingPiece.fromRect &&
      animatingPiece.toRect &&
      animatingPiece.domClone
    ) {
      const boardEl = typeof window !== "undefined" ? document.querySelector(".chessboard") : null;
      if (boardEl) {
        const fromRect = animatingPiece.fromRect;
        const toRect = animatingPiece.toRect;
        const boardRect = boardEl.getBoundingClientRect();
        const dx = toRect.left - fromRect.left;
        const dy = toRect.top - fromRect.top;
        const transform =
          animTransform === "end" ? `translate(${dx}px, ${dy}px)` : "translate(0, 0)";
        animPieceEl = (
          <div
            key={animatingPiece.animationId}
            style={{
              position: "absolute",
              left: fromRect.left - boardRect.left,
              top: fromRect.top - boardRect.top,
              width: fromRect.width,
              height: fromRect.height,
              pointerEvents: "none",
              zIndex: 2000,
              transition: "transform 0.4s cubic-bezier(0.4,0,0.2,1)",
              transform,
              userSelect: "none",
            }}
            ref={(el) => {
              if (el && animatingPiece.domClone) {
                while (el.firstChild) el.removeChild(el.firstChild);
                el.appendChild(animatingPiece.domClone);
                animatingPiece.domClone.style.transform = "none";
              }
            }}
          />
        );
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
