import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChessEngineInstance } from "../../logic/ChessEngine";
import { GameState } from "../../models/GameState";
import { MoveResult } from "../../models/Move";
import { PieceColor } from "../../models/Piece";
import soundManager from "../../services/SoundManager";
import ChessApi from "../../services/chessApi";
import Square from "./Square";

// Board letters and numbers for algebraic notation
const boardLetters = ["a", "b", "c", "d", "e", "f", "g", "h"];
const boardNumbers = ["8", "7", "6", "5", "4", "3", "2", "1"];

const Chessboard = () => {
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

  // Premove state - stores a single pending move like chess.com
  const [pendingPremove, setPendingPremove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  // UI specific state
  const [squareSize, setSquareSize] = useState<number>(60); // Default size
  const [isDragging, setIsDragging] = useState<boolean>(false);
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
  const makeBotMoveRef = useRef<((currentState?: GameState) => Promise<void>) | null>(null);

  // Helper to compute the piece DOM rect for animation
  function getPieceRect(squareName: string): DOMRect | null {
    const squareEl = document.getElementById(squareName);
    if (!squareEl) return null;
    const img = squareEl.querySelector("img");
    if (img) {
      return img.getBoundingClientRect();
    } else {
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
  const animateMove = React.useCallback(
    (
      from: string,
      to: string,
      piece: string,
      fromRect: DOMRect,
      toRect: DOMRect,
      onDone?: () => void
    ) => {
      const fromSquareEl = document.getElementById(from);
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
      }

      const animationId = Date.now();
      setAnimatingPiece({
        piece,
        fromSquare: from,
        toSquare: to,
        fromRect,
        toRect,
        animationId,
        domClone,
      });

      const duration = 300; // ms (matches transition in render)
      const t = window.setTimeout(() => {
        setAnimatingPiece(null);
        if (onDone) onDone();
      }, duration + 20);

      return () => window.clearTimeout(t);
    },
    []
  );

  const applyResult = useCallback(
    (result: MoveResult) => {
      // Do not clear lastMoves here; it is set immediately on move initiation in handleDrop or before animation
      setGameState(result.newGameState);
      ChessEngineInstance.setGameState(result.newGameState);

      // Sounds based on move type
      const mover = gameState.currentPlayer; // Current player before the move
      const opponentInCheck =
        mover === "white"
          ? result.newGameState.blackKingInCheck
          : result.newGameState.whiteKingInCheck;

      if (result.newGameState.checkmate) {
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
        botColorRef.current = result.newGameState.currentPlayer;
      }

      // Schedule bot move if it's bot's turn (use ref to avoid circular deps)
      if (
        gameState.gameMode === "ai" &&
        botColorRef.current === result.newGameState.currentPlayer
      ) {
        const thinkingDelay = Math.random() * 1500 + 500;
        setTimeout(() => makeBotMoveRef.current?.(result.newGameState), thinkingDelay);
      }

      return result.newGameState;
    },
    [gameState]
  );

  const executeChessMove = useCallback(
    (fromSquare: string, toSquare: string) => {
      // Quick legality check before attempting animation
      const piece = ChessEngineInstance.getPieceAtPosition(fromSquare);
      if (!piece) {
        console.log("❌ No piece at fromSquare");
        return null;
      }
      const validMoves = ChessEngineInstance.getValidMoves(piece, fromSquare);
      if (!validMoves.includes(toSquare)) {
        console.log("❌ Move not allowed");
        return null;
      }

      // Clear any move hints (selection/validMoves) immediately, then highlight last move
      // so the UI paints the from/to squares before any animation starts.
      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        lastMoves: [fromSquare, toSquare],
        highlightedSquares: [fromSquare, toSquare],
      }));

      const mover = gameState.currentPlayer; // player who is moving now (before the move)

      // If this is an opponent move (not player) attempt to animate
      if (mover !== playerRef.current) {
        const fromRect = getPieceRect(fromSquare);
        const toRect = getPieceRect(toSquare);
        const movingPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
        if (fromRect && toRect && movingPiece) {
          // Animate then apply the move in callback
          animateMove(fromSquare, toSquare, movingPiece, fromRect, toRect, () => {
            const result = ChessEngineInstance.makeMove(fromSquare, toSquare);
            if (!result || !result.isValid) {
              console.log("❌ Move not allowed");
              return null;
            }
            applyResult(result);
          });
          return null;
        }
      }

      // Default: immediate application (player moves, drags, or missing DOM for animation)
      const result = ChessEngineInstance.makeMove(fromSquare, toSquare);
      if (!result || !result.isValid) {
        console.log("❌ Move not allowed");
        return null;
      }
      return applyResult(result);
    },
    [gameState, animateMove, applyResult]
  );
  const chessApiRef = useRef<ChessApi | null>(null);
  const chessApiConnectedRef = useRef<boolean>(false);

  // Initialize ChessApi once on mount and wire its callbacks
  useEffect(() => {
    const api = new ChessApi();
    chessApiRef.current = api;

    api.onMove((lan: string) => {
      // lan expected like 'e2e4' or 'e7e8q'
      if (!lan || lan.length < 4) return;
      const from = lan.slice(0, 2);
      const to = lan.slice(2, 4);
      // Execute move coming from the API (bot move)
      executeChessMove(from, to);
    });

    api.onError((err) => {
      console.error("ChessApi error:", err);
      chessApiConnectedRef.current = false;
    });

    // Try to establish WebSocket connection on mount so makeBotMove can use it
    api
      .connect()
      .then(() => {
        chessApiConnectedRef.current = true;
      })
      .catch((err) => {
        console.error("Failed to connect to ChessApi on mount:", err);
        chessApiConnectedRef.current = false;
      });

    return () => {
      api.disconnect();
      chessApiRef.current = null;
      chessApiConnectedRef.current = false;
    };
    // executeChessMove is stable (useCallback)
  }, [executeChessMove]);

  // Bot move logic: request move from API (or fallback) and execute it
  const makeBotMove = useCallback(
    async (currentState?: GameState) => {
      const stateToUse = currentState || gameState;
      if (stateToUse.checkmate || stateToUse.stalemate) return;
      if (isBotThinking) return; // Prevent multiple simultaneous requests

      try {
        setIsBotThinking(true);

        // Only make move if it's bot's turn
        if (stateToUse.currentPlayer !== botColorRef.current) {
          setIsBotThinking(false);
          return;
        }

        // Temporarily update the engine state to generate correct FEN
        if (currentState) {
          ChessEngineInstance.setGameState(currentState);
        }

        // Get current FEN from the chess engine
        const fen = ChessEngineInstance.convertBoardArrayToFEN();
        console.log("[FEN sent to chess API]:", fen);

        // Request move from chess-api.com (use initialized api or fallback)
        if (chessApiRef.current) {
          const lan = await chessApiRef.current.requestMove(fen);
          if (lan) {
            const from = lan.slice(0, 2);
            const to = lan.slice(2, 4);
            executeChessMove(from, to);
          }
        } else {
          // Fallback: create a temporary ChessApi instance and request a move
          const tempApi = new ChessApi();
          try {
            const lan = await tempApi.requestMove(fen);
            if (lan) {
              const from = lan.slice(0, 2);
              const to = lan.slice(2, 4);
              executeChessMove(from, to);
            }
          } catch (err) {
            console.error("Fallback chess API request failed:", err);
          } finally {
            tempApi.disconnect();
          }
        }
      } catch (error) {
        console.error("Bot move error:", error);
      } finally {
        setIsBotThinking(false);
      }
    },
    [gameState, isBotThinking, executeChessMove]
  );

  // keep a ref to the bot function so other callbacks can call it without creating circular deps
  useEffect(() => {
    makeBotMoveRef.current = makeBotMove;
    return () => {
      makeBotMoveRef.current = null;
    };
  }, [makeBotMove]);

  // animateMove helper defined earlier; duplicate removed

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

  // Auto-execute premove when turn changes - chess.com behavior
  useEffect(() => {
    if (pendingPremove && gameState.currentPlayer === playerRef.current) {
      const { from, to } = pendingPremove;

      // Check if premove is still legal in current position
      const piece = ChessEngineInstance.getPieceAtPosition(from);
      if (piece && piece[0] === (playerRef.current === "white" ? "W" : "B")) {
        const validMoves = ChessEngineInstance.getValidMoves(piece, from);
        if (validMoves.includes(to)) {
          console.log(`[PREMOVE] Auto-executing: ${from} -> ${to}`);
          setPendingPremove(null); // Clear premove before executing
          // Small delay to ensure state is clean
          setTimeout(() => handleDrop(to, from), 50);
          return;
        }
      }

      // Premove no longer legal, cancel it
      console.log(`[PREMOVE] Cancelled (illegal): ${from} -> ${to}`);
      setPendingPremove(null);
    }
  }, [gameState.currentPlayer, pendingPremove, playerRef]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Deselect if mouse up on the selected square, but preserve last-move highlight
      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        highlightedSquares: [...(prev.lastMoves || [])],
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
  // Keep a persistent click counter across renders so double-click logic survives re-renders
  const sameSquareCounterRef = useRef<number>(0);
  const handleSquareClick = (squareName: string) => {
    lastMoveWasDragRef.current = false; // This is a click, not a drag
    if (isDragging) return; // Prevent click logic during drag

    // Cancel pending premove if clicking elsewhere (chess.com behavior)
    if (pendingPremove && pendingPremove.to !== squareName) {
      setPendingPremove(null);
      console.log("[PREMOVE] Cancelled by user click");
    }

    if (gameState.currentPlayer !== playerRef.current) return;

    // If we already have a selected square, try to make a move
    if (gameState.selectedSquare) {
      console.log("Attempting move from", gameState.selectedSquare, "to", squareName);

      const fromSquare = gameState.selectedSquare;
      const toSquare = squareName;

      // Don't do anything if clicking the same square twice
      if (fromSquare === toSquare) {
        sameSquareCounterRef.current++;
        console.log("Clicked the same square:", squareName);

        if (sameSquareCounterRef.current > 1) {
          const updatedGameState = { ...gameState };
          updatedGameState.selectedSquare = null;
          updatedGameState.validMoves = [];
          updatedGameState.highlightedSquares = [];
          setGameState(updatedGameState);
          sameSquareCounterRef.current = 0; // Reset click count
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
            highlightedSquares: [...(prev.lastMoves || [])],
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
    if (!piece) return;

    const pieceColor = piece[0] === "W" ? "white" : "black";
    if (pieceColor !== gameState.currentPlayer) {
      soundManager.playMoveSound("illegalMove");
      return;
    }

    const updatedGameState: GameState = { ...gameState };
    updatedGameState.selectedSquare = squareName;

    // Engine valid moves (fully legal)
    const validMoves = ChessEngineInstance.getValidMoves(piece, squareName);
    updatedGameState.validMoves = validMoves;
    validSquaresRef.current = validMoves;

    // Preserve any existing last-move highlights (do not wipe opponent's from/to)
    const prevLast = gameState.lastMoves || [];
    updatedGameState.highlightedSquares = Array.from(new Set([...prevLast, squareName]));

    setGameState(updatedGameState);
  };

  // Select square and show available moves (not necessarily legal)
  const selectSquareWithAvailableMoves = (squareName: string) => {
    const piece = ChessEngineInstance.getPieceAtPosition(squareName);
    if (!piece) return;

    const updatedGameState: GameState = { ...gameState };
    updatedGameState.selectedSquare = squareName;

    // Premove moves (wide, ignores checks)
    const availableMoves = ChessEngineInstance.getPremoveMoves(piece, squareName);
    updatedGameState.validMoves = availableMoves;
    validSquaresRef.current = availableMoves;

    // Preserve any existing last-move highlights when showing available moves
    const prevLast = gameState.lastMoves || [];
    updatedGameState.highlightedSquares = Array.from(new Set([...prevLast, squareName]));

    console.log(
      `[selectSquareWithAvailableMoves] Available moves for ${piece} at ${squareName}:`,
      availableMoves
    );

    setGameState(updatedGameState);
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

    // Do not mark as drag yet; mark when drag actually starts to distinguish click vs drag
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
      // Not player's piece: clear selection but keep last move highlight
      if (gameState.selectedSquare) {
        setGameState((prev) => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
          highlightedSquares: [...(gameState.lastMoves || [])],
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
      // Mark that this action became a drag (not a click)
      lastMoveWasDragRef.current = true;
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

  // Animation ref and effect for click-to-move animation
  const pendingAnimationRef = useRef<{
    fromSquare: string;
    dropSquare: string;
    movingPiece: string | null;
    fromRect: DOMRect;
    toRect: DOMRect;
  } | null>(null);

  useEffect(() => {
    const pending = pendingAnimationRef.current;
    if (pending) {
      const { fromSquare, dropSquare, movingPiece, fromRect, toRect } = pending;
      animateMove(fromSquare, dropSquare, movingPiece || "", fromRect, toRect, () => {
        executeChessMove(fromSquare, dropSquare);
        // Clean up drag state
        setIsDragging(false);
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
        document.body.style.cursor = "grab";
        document.querySelectorAll(".custom-drag-image").forEach((el) => el.remove());
        document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
        document.querySelectorAll("img").forEach((img) => {
          if ((img as HTMLImageElement).style.position === "fixed") img.remove();
        });
        window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      });
      pendingAnimationRef.current = null;
    }
  }, [gameState.lastMoves, animateMove, executeChessMove]);

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

    // use shared getPieceRect helper defined above

    if (isNormalMove) {
      const movingPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
      const fromRect: DOMRect | null = getPieceRect(fromSquare);
      const toRect: DOMRect | null = getPieceRect(dropSquare);

      // Clear move hints (validMoves/selection) immediately when the move is decided,
      // then set last-move highlights so UI paints the from/to before animation.
      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        lastMoves: [fromSquare, dropSquare],
        highlightedSquares: [fromSquare, dropSquare],
      }));

      // Store pending animation/move in a ref to trigger in useEffect
      if (!lastMoveWasDragRef.current && fromRect && toRect) {
        // Click-to-move: animate smoothly (including captures)
        pendingAnimationRef.current = {
          fromSquare,
          dropSquare,
          movingPiece,
          fromRect,
          toRect,
        };
      } else {
        // Drag-and-drop: no animation, instant move, but highlight is set above
        executeChessMove(fromSquare, dropSquare);
        // Clean up drag state
        setIsDragging(false);
        draggingPieceRef.current = null;
        draggingFromSquareRef.current = null;
        document.body.style.cursor = "grab";
        document.querySelectorAll(".custom-drag-image").forEach((el) => el.remove());
        document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
        document.querySelectorAll("img").forEach((img) => {
          if ((img as HTMLImageElement).style.position === "fixed") img.remove();
        });
        window.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
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
        // Store the premove like chess.com - visual feedback and auto-execution on turn change
        setPendingPremove({ from: fromSquare, to: dropSquare });
        soundManager.playMoveSound("premove");
        console.log(`[PREMOVE] Queued: ${fromSquare} -> ${dropSquare}`);

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
    // Check if this square has a pending premove (for visual feedback)
    const isPremoveDestination = pendingPremove?.to === squareName;
    const isPremoveSource = pendingPremove?.from === squareName;

    // New: Mouse down handler for empty or valid move/capture squares
    const handleSquareMouseDown = () => {
      // If the square is empty or a valid move/capture, clear selection/highlights
      // Only clear when clicking an empty square that is not the selected square.
      // Do NOT clear when clicking a legal move destination — we need to keep the
      // selected-from highlight visible until the move completes.
      if (!piece && !isSelected && !isLegalMove) {
        setGameState((prev) => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
          highlightedSquares: [...(prev.lastMoves || [])],
        }));
      }
    };

    return (
      <React.Fragment key={squareName + "-frag"}>
        <Square
          key={squareName}
          squareName={squareName}
          color={color as "light" | "dark"}
          piece={piece || undefined}
          onSquareMouseDown={(sq) => {
            handleSquareMouseDown();
            handleSquareClick(sq);
          }}
          onPieceMouseDown={handleMouseDown}
          isSelected={isSelected}
          isHighlighted={isHighlighted}
          isLegalMove={isLegalMove}
          isCaptureHint={isCaptureHint}
          isPremove={isPremoveDestination || isPremoveSource}
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
              zIndex: 3500,
              transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
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
      <div className="chessboard-container" style={{ position: "relative" }}>
        {renderBoard(animTransform)}
      </div>
    </div>
  );
};

export default Chessboard;
