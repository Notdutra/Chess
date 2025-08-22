import React, { useEffect, useState, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { ChessEngineInstance } from "../../logic/ChessEngine";
import { GameState } from "../../models/GameState";
import { MoveResult } from "../../models/Move";
import { PieceColor } from "../../models/Piece";
import soundManager from "../../services/SoundManager";
import ChessApi from "../../services/chessApi";
import { createDedupe } from "../../utils/moveDedupe";
import { createDispatcher } from "../../utils/moveDispatcher";
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

  // Core refs for drag and selection logic
  const draggingFromSquareRef = useRef<string | null>(null);
  const validSquaresRef = useRef<string[]>([]);
  const lastHoveredSquareRef = useRef<string | null>(null);
  const lastMouseDownSquare = useRef<string | null>(null);
  const premoveSelectionRef = useRef<string | null>(null);
  const playerRef = useRef<PieceColor>("white");
  const botColorRef = useRef<PieceColor | null>(null);

  // Use a single gameState object managed by the chess engine
  const [gameState, setGameState] = useState<GameState>(() => {
    const initialState = ChessEngineInstance.getGameState();
    // Set game mode to AI for bot play
    initialState.gameMode = "ai";
    return initialState;
  });

  // SIMPLE PREMOVE SYSTEM - Chess.com style
  // Just a queue of moves and temp board for preview
  const premoveQueueRef = useRef<{ from: string; to: string }[]>([]);
  const [premoveQueue, setPremoveQueue] = useState<{ from: string; to: string }[]>([]);

  // Queue a premove (simple approach)
  const queuePremove = (from: string, to: string) => {
    // queuePremove: adds a premove to the queue if not duplicate

    const existingMove = premoveQueueRef.current.find((m) => m.from === from && m.to === to);

    if (existingMove) {
      return; // Don't add duplicates
    }

    // Allow multiple premoves - just add to the queue
    premoveQueueRef.current.push({ from, to });
    setPremoveQueue([...premoveQueueRef.current]);
    soundManager.playMoveSound("premove");

    // Clear any selection state after queueing premove to avoid visual confusion
    setGameState((prev) => ({
      ...prev,
      selectedSquare: null,
      validMoves: [],
      highlightedSquares: prev.lastMoves || [],
    }));

    // Clear premove selection reference
    premoveSelectionRef.current = null;
  };

  // Clear premove queue
  const clearPremoveQueue = useCallback(() => {
    premoveQueueRef.current = [];
    setPremoveQueue([]);

    // CRITICAL: Force immediate UI update to ensure preview pieces are hidden
    flushSync(() => {
      // Reset to real board state and clear selection/hints
      const freshGameState = ChessEngineInstance.getGameState();
      setGameState({
        ...freshGameState,
        selectedSquare: null,
        validMoves: [],
        highlightedSquares: freshGameState.lastMoves || [],
      });
    });

    // Clear premove selection reference
    premoveSelectionRef.current = null;
  }, []);

  // Validate premoves before opponent move
  const validatePremoveBeforeOpponentMove = useCallback(
    (from: string, to: string) => {
      if (premoveQueueRef.current.length === 0) {
        return;
      }

      // Check if the first premove is still valid after this opponent move
      const firstPremove = premoveQueueRef.current[0];
      if (firstPremove) {
        // Get the piece that would be at the premove source after the opponent's move
        const { file: fromFile, rank: fromRank } = ChessEngineInstance.squareFromNotation(from);
        const { file: toFile, rank: toRank } = ChessEngineInstance.squareFromNotation(to);

        // Check if the opponent's move would block or capture the piece needed for the premove
        const premoveSourceFile = ChessEngineInstance.squareFromNotation(firstPremove.from).file;
        const premoveSourceRank = ChessEngineInstance.squareFromNotation(firstPremove.from).rank;

        // If the opponent's move is to the same square as the premove source, the premove is invalid
        if (toFile === premoveSourceFile && toRank === premoveSourceRank) {
          clearPremoveQueue();
          return;
        }

        // If the opponent's move is from the same square as the premove source, the premove is invalid
        if (fromFile === premoveSourceFile && fromRank === premoveSourceRank) {
          clearPremoveQueue();
          return;
        }

        // Check if the opponent's move would block the path of the premove
        // This is a simplified check - we could make it more sophisticated
        const currentBoard = ChessEngineInstance.getGameState().boardArray;
        const pieceAtSource = currentBoard[premoveSourceRank][premoveSourceFile];

        if (!pieceAtSource || pieceAtSource[0] !== (playerRef.current === "white" ? "W" : "B")) {
          clearPremoveQueue();
          return;
        }
      }
    },
    [clearPremoveQueue]
  );

  // UI specific state
  const [squareSize, setSquareSize] = useState<number>(60);
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

  // Debug helpers (none currently used)

  const draggingPieceRef = useRef<string | null>(null);
  const makeBotMoveRef = useRef<((currentState?: GameState) => Promise<void>) | null>(null);
  const outgoingMovePendingRef = useRef<boolean>(false);
  const pendingAnimationTriggerRef = useRef<boolean>(false);
  const moveHistoryRef = useRef<
    { from: string | null; to: string | null; ts: number; by: "player" | "opponent" }[]
  >([]);
  const dedupeRef = useRef(createDedupe(3000));
  const dispatcherRef = useRef(createDispatcher(dedupeRef.current));
  const executeChessMoveRef = useRef<typeof executeChessMove | null>(null);

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
      // Prevent duplicate animations for the same move
      if (animatingPiece && animatingPiece.fromSquare === from && animatingPiece.toSquare === to) {
        if (onDone) onDone();
        return () => {};
      }

      const fromSquareEl = document.getElementById(from);
      const fromImg = fromSquareEl ? fromSquareEl.querySelector("img") : null;
      let domClone: HTMLElement | null = null;
      if (fromImg) {
        domClone = fromImg.cloneNode(true) as HTMLElement;
        // Mark the clone with a distinct class so we can style it separately
        // (keep it visible) while hiding the original piece when animating.
        domClone.className = fromImg.className + " animating-clone";
        domClone.style.pointerEvents = "none";
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
      }

      // Detect a capture target image for a late fade-out
      const toSquareEl = document.getElementById(to);
      const toImg = toSquareEl ? toSquareEl.querySelector("img") : null;

      const animationId = Date.now();
      // Mark the original image as animating so CSS will hide it immediately.
      let __prevOpacity: string | null = null;
      if (fromImg) {
        fromImg.classList.add("animating");
        try {
          __prevOpacity = fromImg.style.opacity || null;
          // Use inline style to force hide (overrides any other rules)
          fromImg.style.opacity = "0";
        } catch {
          __prevOpacity = null;
        }
      }
      setAnimatingPiece({
        piece,
        fromSquare: from,
        toSquare: to,
        fromRect,
        toRect,
        animationId,
        domClone,
      });

      const duration = 300;
      // If an opponent piece exists on destination, render a temporary overlay clone and fade it
      let fadeTimer: number | null = null;
      let destOverlay: HTMLDivElement | null = null;
      let destClone: HTMLElement | null = null;
      if (toImg) {
        // Only fade when the real board has an opponent piece on the destination
        const destPiece = ChessEngineInstance.getPieceAtPosition(to);
        const moverColor = piece && piece[0] ? (piece[0] === "W" ? "white" : "black") : null;
        const destColor =
          destPiece && destPiece[0] ? (destPiece[0] === "W" ? "white" : "black") : null;
        const isOpponentCapture =
          !!destPiece && !!moverColor && !!destColor && moverColor !== destColor;

        if (isOpponentCapture) {
          try {
            const boardEl = document.querySelector(".chessboard") as HTMLElement | null;
            if (boardEl && animatingPiece?.fromRect && animatingPiece?.toRect) {
              const boardRect = boardEl.getBoundingClientRect();
              // Overlay container positioned over destination square
              destOverlay = document.createElement("div");
              destOverlay.style.position = "absolute";
              destOverlay.style.pointerEvents = "none";
              destOverlay.style.left = `${animatingPiece.toRect.left - boardRect.left}px`;
              destOverlay.style.top = `${animatingPiece.toRect.top - boardRect.top}px`;
              destOverlay.style.width = `${animatingPiece.toRect.width}px`;
              destOverlay.style.height = `${animatingPiece.toRect.height}px`;
              destOverlay.style.zIndex = "999";

              // Clone the destination image into the overlay
              destClone = toImg.cloneNode(true) as HTMLElement;
              destClone.style.position = "absolute";
              destClone.style.left = "0";
              destClone.style.top = "0";
              destClone.style.width = "100%";
              destClone.style.height = "100%";
              destClone.style.opacity = "1";
              destClone.style.transition = "opacity 120ms ease-out";

              destOverlay.appendChild(destClone);
              // Append overlay as a sibling overlay inside board
              boardEl.appendChild(destOverlay);

              const fadeDelay = Math.max(0, duration - 120);
              fadeTimer = window.setTimeout(() => {
                try {
                  destClone!.style.opacity = "0";
                } catch {}
              }, fadeDelay);
            }
          } catch {}
        }
      }
      const t = window.setTimeout(() => {
        // Restore original image visibility
        if (fromImg) {
          fromImg.classList.remove("animating");
          try {
            if (__prevOpacity !== null) fromImg.style.opacity = __prevOpacity;
            else fromImg.style.removeProperty("opacity");
          } catch {}
        }
        // Clear animatingPiece state so the clone is removed from the DOM
        setAnimatingPiece(null);
        if (onDone) onDone();
      }, duration + 20);

      return () => {
        if (fadeTimer !== null) {
          window.clearTimeout(fadeTimer);
          fadeTimer = null;
        }
        if (fromImg) {
          fromImg.classList.remove("animating");
          try {
            if (__prevOpacity !== null) fromImg.style.opacity = __prevOpacity;
            else fromImg.style.removeProperty("opacity");
          } catch {}
        }
        // Cleanup destination overlay clone, if any
        try {
          if (destOverlay && destOverlay.parentElement) {
            destOverlay.parentElement.removeChild(destOverlay);
          }
        } catch {}
        setAnimatingPiece(null);
        window.clearTimeout(t);
      };
    },
    [animatingPiece]
  );

  // Process premove queue when opponent moves
  const processPremoveQueue = useCallback(
    async (confirmedState: GameState) => {
      if (!premoveQueueRef.current || premoveQueueRef.current.length === 0) return;

      // Work on a fresh engine snapshot for validation
      ChessEngineInstance.setGameState(confirmedState);
      let currentState = confirmedState;

      // Process each premove in sequence
      while (premoveQueueRef.current.length > 0) {
        const next = premoveQueueRef.current[0];
        if (!next) break;

        // Check if the piece exists at the expected position
        const piece = ChessEngineInstance.getPieceAtPosition(next.from);

        // Ensure the piece belongs to the player to move in the current state
        if (!piece || piece[0] !== (currentState.currentPlayer === "white" ? "W" : "B")) {
          clearPremoveQueue();
          return;
        }

        const validMoves = ChessEngineInstance.getValidMoves(piece, next.from);
        if (!validMoves.includes(next.to)) {
          clearPremoveQueue();
          return;
        }

        // It's legal: apply it optimistically and send via dispatcher
        const fen = ChessEngineInstance.convertBoardArrayToFEN();
        const lan = `${next.from}${next.to}`;
        const lanKey = `${fen}|${lan}`;

        // Apply locally (optimistic)
        const result = ChessEngineInstance.makeMove(next.from, next.to);
        if (!result || !result.isValid) {
          clearPremoveQueue();
          return;
        }

        // Update confirmed state locally and pop queue head
        premoveQueueRef.current.shift();
        setPremoveQueue([...premoveQueueRef.current]);

        // Update the current state for the next iteration
        currentState = result.newGameState;

        // Clear any lingering selection state after premove execution
        const cleanState = {
          ...result.newGameState,
          selectedSquare: null,
          validMoves: [],
          highlightedSquares: result.newGameState.lastMoves || [],
        };

        setGameState(cleanState);
        ChessEngineInstance.setGameState(result.newGameState);

        // Clear premove selection reference
        premoveSelectionRef.current = null;

        // Enqueue sending to server using dispatcher
        try {
          dispatcherRef.current
            .enqueue(async () => {
              return result;
            }, lanKey)
            .then((res) => {
              console.log("Premove dispatched successfully:", res);
            })
            .catch((err) => {
              console.error("Failed to dispatch premove:", err);
            });
        } catch (err) {
          console.error("Error occurred while dispatching premove:", err);
        }

        // If we've processed all premoves for the player, check if it's bot's turn
        if (premoveQueueRef.current.length === 0) {
          if (
            gameState.gameMode === "ai" &&
            botColorRef.current === result.newGameState.currentPlayer
          ) {
            const thinkingDelay = Math.random() * 1500 + 500;
            setTimeout(() => makeBotMoveRef.current?.(result.newGameState), thinkingDelay);
          }
          break;
        }

        // If it's no longer the player's turn after this move, trigger bot and stop processing
        if (result.newGameState.currentPlayer !== playerRef.current) {
          if (
            gameState.gameMode === "ai" &&
            botColorRef.current === result.newGameState.currentPlayer
          ) {
            const thinkingDelay = Math.random() * 1500 + 500;
            setTimeout(() => makeBotMoveRef.current?.(result.newGameState), thinkingDelay);
          }
          break;
        }
      }
    },
    [clearPremoveQueue, gameState]
  );

  const applyResultRef = useRef<((r: MoveResult) => GameState | null | undefined) | null>(null);

  const applyResult = useCallback(
    (result: MoveResult) => {
      applyResultRef.current = (r: MoveResult) => {
        setGameState(r.newGameState);
        ChessEngineInstance.setGameState(r.newGameState);
        return r.newGameState;
      };

      setGameState(result.newGameState);
      ChessEngineInstance.setGameState(result.newGameState);

      // Sounds based on move type
      const mover = gameState.currentPlayer;
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

      // Record move into lightweight history for UX coordination
      try {
        const mover = gameState.currentPlayer;
        const by = mover === playerRef.current ? "player" : "opponent";
        moveHistoryRef.current.unshift({
          from: result.move?.from || null,
          to: result.move?.to || null,
          ts: Date.now(),
          by,
        });

        if (by === "opponent") {
          premoveSelectionRef.current = null;
        }
      } catch (err) {
        console.error("Error recording move history:", err);
      }

      // Schedule bot move if it's bot's turn
      if (
        gameState.gameMode === "ai" &&
        botColorRef.current === result.newGameState.currentPlayer
      ) {
        const thinkingDelay = Math.random() * 1500 + 500;
        setTimeout(() => makeBotMoveRef.current?.(result.newGameState), thinkingDelay);
      }

      // After applying an incoming move, attempt to process the premove queue
      (async () => {
        await processPremoveQueue(result.newGameState);
      })().catch((err) => {
        console.error("Error processing premove queue:", err);
      });

      return result.newGameState;
    },
    [gameState, processPremoveQueue]
  );

  useEffect(() => {
    applyResultRef.current = applyResult;
  }, [applyResult]);

  const executeChessMove = useCallback(
    (fromSquare: string, toSquare: string, lan?: string, fen?: string) => {
      ChessEngineInstance.setGameState(gameState);

      const piece = ChessEngineInstance.getPieceAtPosition(fromSquare);
      if (!piece) {
        return null;
      }

      const validMoves = ChessEngineInstance.getValidMoves(piece, fromSquare);

      if (!validMoves.includes(toSquare)) {
        return null;
      }

      // Dedupe key
      const lanKey = fen && lan ? `${fen}|${lan}` : lan || `${fromSquare}${toSquare}`;

      // Clear any move hints and highlight last move
      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        lastMoves: [fromSquare, toSquare],
        highlightedSquares: [fromSquare, toSquare],
      }));

      const mover = gameState.currentPlayer;
      // Decide animation policy:
      // - Opponent moves: animate when rects are available (improves user's observation of opponent play).
      // - Player moves: animate only when it's a click-to-move (pendingAnimationTriggerRef === true)
      //   and not a drag; drag-and-drop moves should be instantaneous.
      const isOpponentMove = mover !== playerRef.current;
      const isPlayerClickMove =
        mover === playerRef.current &&
        pendingAnimationTriggerRef.current === true &&
        !isDraggingRef.current;

      // CRITICAL FIX: Validate premoves BEFORE any opponent move execution
      // This ensures the board state is clean before any animation starts
      if (isOpponentMove) {
        validatePremoveBeforeOpponentMove(fromSquare, toSquare);
      }

      const fromRect = getPieceRect(fromSquare);
      const toRect = getPieceRect(toSquare);
      const movingPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);

      // Animate opponent moves when possible
      if (isOpponentMove) {
        // Ensure last move highlights render BEFORE the animation starts
        try {
          flushSync(() => {
            setGameState((prev) => ({
              ...prev,
              selectedSquare: null,
              validMoves: [],
              lastMoves: [fromSquare, toSquare],
              highlightedSquares: [fromSquare, toSquare],
            }));
          });
        } catch {}
        if (fromRect && toRect && movingPiece) {
          animateMove(fromSquare, toSquare, movingPiece, fromRect, toRect, () => {
            outgoingMovePendingRef.current = true;
            dispatcherRef.current
              .enqueue(() => {
                const result = ChessEngineInstance.makeMove(fromSquare, toSquare);
                if (!result || !result.isValid) throw new Error("Invalid move");
                return applyResult(result);
              }, lanKey)
              .then(() => {
                outgoingMovePendingRef.current = false;
              })
              .catch(() => {
                outgoingMovePendingRef.current = false;
              });
          });

          return null;
        }
      }

      // Animate player's click-to-move only (not drag)
      if (isPlayerClickMove) {
        if (fromRect && toRect && movingPiece) {
          // consume the trigger
          pendingAnimationTriggerRef.current = false;
          animateMove(fromSquare, toSquare, movingPiece, fromRect, toRect, () => {
            outgoingMovePendingRef.current = true;
            dispatcherRef.current
              .enqueue(() => {
                const result = ChessEngineInstance.makeMove(fromSquare, toSquare);
                if (!result || !result.isValid) throw new Error("Invalid move");
                return applyResult(result);
              }, lanKey)
              .then(() => {
                outgoingMovePendingRef.current = false;
              })
              .catch(() => {
                outgoingMovePendingRef.current = false;
              });
          });

          return null;
        }
      }

      // Fallback: immediate application without animation
      outgoingMovePendingRef.current = true;
      dispatcherRef.current
        .enqueue(() => {
          const result = ChessEngineInstance.makeMove(fromSquare, toSquare);
          if (!result || !result.isValid) throw new Error("Invalid move");
          return applyResult(result);
        }, lanKey)
        .then(() => {
          outgoingMovePendingRef.current = false;
        })
        .catch(() => {
          outgoingMovePendingRef.current = false;
        });

      return null;
    },
    [gameState, validatePremoveBeforeOpponentMove, animateMove, applyResult]
  );

  // Handle pointer movement during drag (works for mouse and touch)
  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    const customDragImage = document.querySelector(".custom-drag-image") as HTMLElement;
    if (customDragImage) {
      const pieceWidth = customDragImage.offsetWidth;
      const pieceHeight = customDragImage.offsetHeight;
      customDragImage.style.left = `${clientX - pieceWidth / 2}px`;
      customDragImage.style.top = `${clientY - pieceHeight / 2}px`;
    }

    // Handle hover effect on squares
    const dropTarget = document.elementFromPoint(clientX, clientY);
    let currentSquareId: string | null = null;

    if (dropTarget) {
      if ((dropTarget as HTMLElement).classList.contains("square")) {
        currentSquareId = (dropTarget as HTMLElement).id;
      } else if (dropTarget.parentElement?.classList.contains("square")) {
        currentSquareId = dropTarget.parentElement.id;
      }
    }

    if (currentSquareId !== hoveredSquare) {
      setHoveredSquare(currentSquareId);
    }
  };

  // Chess API and bot logic
  const chessApiRef = useRef<ChessApi | null>(null);
  const chessApiConnectedRef = useRef<boolean>(false);
  const incomingMoveDedupeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    try {
      if (gameState.gameMode === "ai") {
        if (botColorRef.current) {
          playerRef.current = botColorRef.current === "white" ? "black" : "white";
        } else {
          playerRef.current = "white";
        }
      } else {
        playerRef.current = "white";
      }
    } catch (err) {
      console.error("Error occurred while determining player color:", err);
    }
  }, [gameState]);

  useEffect(() => {
    executeChessMoveRef.current = executeChessMove;
  }, [executeChessMove]);

  useEffect(() => {
    const api = new ChessApi();
    chessApiRef.current = api;

    api.onMove((lan: string) => {
      if (!lan || lan.length < 4) return;

      try {
        const now = Date.now();
        if (incomingMoveDedupeRef.current[lan] && now - incomingMoveDedupeRef.current[lan] < 2000) {
          return;
        }
        incomingMoveDedupeRef.current[lan] = now;
      } catch {}

      const from = lan.slice(0, 2);
      const to = lan.slice(2, 4);
      const fen = ChessEngineInstance.convertBoardArrayToFEN();

      // CRITICAL FIX: Validate premoves BEFORE calling executeChessMove
      // This ensures the board state is clean before any animation starts
      validatePremoveBeforeOpponentMove(from, to);

      try {
        executeChessMoveRef.current?.(from, to, lan, fen);
      } catch (err) {
        console.error("Error executing move from Chess API:", err);
      }
    });

    api.onError(() => {
      chessApiConnectedRef.current = false;
    });

    return () => {
      api.disconnect();
      chessApiRef.current = null;
      chessApiConnectedRef.current = false;
    };
  }, [validatePremoveBeforeOpponentMove]);

  const makeBotMove = useCallback(
    async (currentState?: GameState) => {
      const stateToUse = currentState || gameState;
      if (stateToUse.checkmate || stateToUse.stalemate) return;
      if (isBotThinking) return;

      try {
        setIsBotThinking(true);

        if (stateToUse.currentPlayer !== botColorRef.current) {
          return;
        }

        if (currentState) {
          ChessEngineInstance.setGameState(currentState);
        }

        const fen = ChessEngineInstance.convertBoardArrayToFEN();

        if (chessApiRef.current) {
          chessApiRef.current.requestMove(fen);
        } else {
          // Fallback: get all valid moves and pick a random one
          setTimeout(() => {
            try {
              const allValidMoves = [];
              const currentBoard = ChessEngineInstance.getGameState().boardArray;

              for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                  const piece = currentBoard[row][col];
                  if (piece && piece[0] === (stateToUse.currentPlayer === "white" ? "W" : "B")) {
                    const squareName = `${boardLetters[col]}${boardNumbers[row]}`;
                    const validMoves = ChessEngineInstance.getValidMoves(piece, squareName);
                    for (const move of validMoves) {
                      allValidMoves.push({ from: squareName, to: move });
                    }
                  }
                }
              }

              if (allValidMoves.length > 0) {
                const randomMove = allValidMoves[Math.floor(Math.random() * allValidMoves.length)];
                // CRITICAL FIX: Validate premoves BEFORE bot move execution
                validatePremoveBeforeOpponentMove(randomMove.from, randomMove.to);
                executeChessMove(randomMove.from, randomMove.to);
              }
            } catch (err) {
              console.error("Error occurred while making bot move:", err);
            }
          }, 1000);
        }
      } catch {
      } finally {
        setIsBotThinking(false);
      }
    },
    [gameState, isBotThinking, executeChessMove, validatePremoveBeforeOpponentMove]
  );

  useEffect(() => {
    makeBotMoveRef.current = makeBotMove;
    return () => {
      makeBotMoveRef.current = null;
    };
  }, [makeBotMove]);

  useEffect(() => {
    if (gameState.checkmate) {
      soundManager.playGameStateSound("end");
    } else if (gameState.whiteKingInCheck || gameState.blackKingInCheck) {
      if (!gameState.lastMoves || gameState.lastMoves.length === 0) {
        soundManager.playGameStateSound("end");
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
        const { width } = entry.contentRect;
        const newSquareSize = Math.floor(width / 8);
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
        dragImage.style.width = `${squareSize * 0.9}px`;
        dragImage.style.height = `${squareSize * 0.9}px`;
      }
    }
  }, [squareSize, isDragging]);

  // Auto-execute premove when turn changes
  useEffect(() => {
    const head = premoveQueue[0];
    if (!head) return;

    if (gameState.currentPlayer === playerRef.current) {
      (async () => {
        await processPremoveQueue(gameState);
      })();
    }
  }, [gameState, premoveQueue, processPremoveQueue, validatePremoveBeforeOpponentMove]);

  // Coordinate-based pointer up handler (works for touch and mouse)
  const handlePointerUp = (clientX: number, clientY: number) => {
    const customDragImage = document.querySelector(".custom-drag-image") as HTMLElement;
    if (customDragImage) {
      customDragImage.style.display = "none";
    }

    document.body.classList.remove("dragging");
    void document.body.offsetWidth;
    // Reset body cursor to default; allow squares/pieces to control their own cursor via CSS
    document.body.style.removeProperty("cursor");
    document.removeEventListener("mousemove", mouseMoveListener);
    document.removeEventListener("mouseup", mouseUpListener);

    if (lastHoveredSquareRef.current) {
      const prevSquareEl = document.getElementById(lastHoveredSquareRef.current);
      if (prevSquareEl) {
        prevSquareEl.classList.remove("square-hover");
      }
      lastHoveredSquareRef.current = null;
    }

    if (draggingPieceRef.current) {
      const pieceElement = document.querySelector(".dragging") as HTMLElement;
      if (pieceElement) {
        pieceElement.classList.remove("dragging");
      }
    }

    let targetSquare = "";
    try {
      const dropTarget = document.elementFromPoint(clientX, clientY);
      if (dropTarget) {
        if ((dropTarget as HTMLElement).classList.contains("square")) {
          targetSquare = (dropTarget as HTMLElement).id;
        } else if (dropTarget.parentElement?.classList.contains("square")) {
          targetSquare = dropTarget.parentElement.id;
        }
      }
    } catch {
      // elementFromPoint can throw if coords are invalid; ignore
      targetSquare = "";
    }

    if (targetSquare === lastMouseDownSquare.current && targetSquare === gameState.selectedSquare) {
      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        highlightedSquares: [...(prev.lastMoves || [])],
      }));

      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      setIsDragging(false);
      lastMoveWasDragRef.current = false;
      return;
    }

    if (targetSquare && validSquaresRef.current.includes(targetSquare)) {
      handleDrop(targetSquare);
    } else {
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      lastMoveWasDragRef.current = false;
    }
  };

  const mouseMoveListener = (evt: Event) => {
    // Support both MouseEvent and TouchEvent
    try {
      if ((evt as TouchEvent).touches && (evt as TouchEvent).touches.length > 0) {
        const t = (evt as TouchEvent).touches[0];
        handlePointerMove(t.clientX, t.clientY);
      } else {
        const me = evt as MouseEvent;
        handlePointerMove(me.clientX, me.clientY);
      }
    } catch {
      // ignore malformed events
    }
  };

  const mouseUpListener = (evt: Event) => {
    try {
      let clientX: number | null = null;
      let clientY: number | null = null;
      if ((evt as TouchEvent).changedTouches && (evt as TouchEvent).changedTouches.length > 0) {
        const t = (evt as TouchEvent).changedTouches[0];
        clientX = t.clientX;
        clientY = t.clientY;
      } else {
        const me = evt as MouseEvent;
        clientX = me.clientX;
        clientY = me.clientY;
      }
      if (clientX !== null && clientY !== null) {
        handlePointerUp(clientX, clientY);
      }
    } catch {
      // ignore
    }
  };

  // Handle square click
  const sameSquareCounterRef = useRef<number>(0);
  const handleSquareClick = (squareName: string) => {
    lastMoveWasDragRef.current = false;

    // Chess.com style: if a premove selection exists and it's opponent's turn, enqueue premove
    try {
      const persisted = premoveSelectionRef.current;
      const isOpponentsTurn =
        gameState.currentPlayer !== playerRef.current || outgoingMovePendingRef.current;

      if (isOpponentsTurn && persisted && persisted !== squareName) {
        // Check if this square is already a premove destination to avoid duplicates
        const isPremoveDestination = premoveQueue.some((p) => p.to === squareName);

        if (isPremoveDestination) {
          return;
        }

        const srcPiece = getPieceAtPositionPreview(persisted);

        if (srcPiece) {
          const premoveMoves = ChessEngineInstance.getPremoveMoves(srcPiece, persisted);

          if (premoveMoves.includes(squareName)) {
            queuePremove(persisted, squareName);
            premoveSelectionRef.current = null;
            return;
          }
        }
      }
    } catch {}

    if (isDragging) return;

    // More intelligent premove cancellation logic:
    // Only cancel premoves when clicking on an empty square with no valid moves
    // and no piece selection, which indicates the user wants to clear everything
    const head = premoveQueue[0];
    if (head && head.to !== squareName) {
      // Check if this is truly a cancellation scenario:
      // 1. No piece selected AND no premove selection
      // 2. Clicking on an empty square
      // 3. Not trying to make a valid premove chain
      const clickedPiece = getPieceAtPositionPreview(squareName);
      const hasSelection = gameState.selectedSquare || premoveSelectionRef.current;
      const isEmptySquareClick =
        !clickedPiece && !hasSelection && !gameState.validMoves?.includes(squareName);

      if (isEmptySquareClick) {
        premoveQueueRef.current.shift();
        setPremoveQueue([...premoveQueueRef.current]);
        // cancelled premove by user click
      }
    }

    // Special handling for premove destination squares:
    // Allow clicking on premove destinations when building premove chains,
    // but prevent direct clicks that would cause confusion
    const isPremoveDestination = premoveQueue.some((p) => p.to === squareName);
    const isChainablePremoveDestination =
      isPremoveDestination &&
      gameState.currentPlayer !== playerRef.current &&
      premoveSelectionRef.current && // We have a selected piece
      premoveSelectionRef.current !== squareName; // Not clicking on the same square

    if (isPremoveDestination && !isChainablePremoveDestination) {
      return;
    }

    // If it's not the player's turn, allow selecting the player's pieces to create premoves
    if (gameState.currentPlayer !== playerRef.current) {
      // Use preview board to check for pieces - handles premoved pieces correctly
      const clickedPiece = getPieceAtPositionPreview(squareName);
      const clickedColor = clickedPiece ? (clickedPiece[0] === "W" ? "white" : "black") : null;

      // Only allow selecting YOUR pieces for premoves, not opponent pieces
      if (!clickedPiece || clickedColor !== playerRef.current) return;

      if (!gameState.selectedSquare) {
        selectSquareWithAvailableMoves(squareName);
        return;
      }
    }

    // If we already have a selected square, try to make a move
    if (gameState.selectedSquare) {
      const fromSquare = gameState.selectedSquare;
      const toSquare = squareName;

      // Early authoritative premove guard
      if (gameState.currentPlayer !== playerRef.current) {
        ChessEngineInstance.setGameState(gameState);
        // Use preview board to check for the piece in its current visual position
        const srcPiece = getPieceAtPositionPreview(fromSquare);
        if (srcPiece) {
          const premoveMoves = ChessEngineInstance.getPremoveMoves(srcPiece, fromSquare);
          if (premoveMoves.includes(toSquare)) {
            queuePremove(fromSquare, toSquare);
            setGameState((prev) => ({
              ...prev,
              selectedSquare: null,
              validMoves: [],
              highlightedSquares: [...(prev.lastMoves || [])],
            }));
            return;
          }
        }
      }

      if (fromSquare === toSquare) {
        sameSquareCounterRef.current++;
        if (sameSquareCounterRef.current >= 2) {
          setGameState((prev) => ({
            ...prev,
            selectedSquare: null,
            validMoves: [],
            highlightedSquares: [...(prev.lastMoves || [])],
          }));
          sameSquareCounterRef.current = 0;
        }
        return;
      } else {
        sameSquareCounterRef.current = 0;
      }

      const uiValid =
        Array.isArray(gameState.validMoves) && gameState.validMoves.includes(toSquare);
      // Use preview board to check for the piece in its current visual position
      const srcPiece = getPieceAtPositionPreview(gameState.selectedSquare!);
      const enginePremove = srcPiece
        ? ChessEngineInstance.getPremoveMoves(srcPiece, gameState.selectedSquare!).includes(
            toSquare
          )
        : false;

      if (uiValid || enginePremove) {
        // If this is a player-initiated click-to-move (not a drag), set the pending animation trigger
        // so executeChessMove will animate the move. Drag-and-drop should remain instantaneous.
        try {
          const isPlayer = gameState.currentPlayer === playerRef.current;
          if (isPlayer && !isDraggingRef.current && !outgoingMovePendingRef.current) {
            pendingAnimationTriggerRef.current = true;
          }
        } catch {}

        executeChessMove(fromSquare, toSquare);
      } else {
        selectSquare(squareName);
      }
    } else {
      selectSquare(squareName);
    }
  };

  // Helper function to select a square and calculate valid moves
  const selectSquare = (squareName: string) => {
    // Use preview board to get the piece that the user actually sees
    const piece = getPieceAtPositionPreview(squareName);
    if (!piece) return;

    const pieceColor = piece[0] === "W" ? "white" : "black";
    if (pieceColor !== gameState.currentPlayer) {
      soundManager.playMoveSound("illegalMove");
      return;
    }

    const updatedGameState: GameState = { ...gameState };
    updatedGameState.selectedSquare = squareName;

    const validMoves = ChessEngineInstance.getValidMoves(piece, squareName);
    updatedGameState.validMoves = validMoves;
    validSquaresRef.current = validMoves;

    const prevLast = gameState.lastMoves || [];
    updatedGameState.highlightedSquares = Array.from(new Set([...prevLast, squareName]));

    setGameState(updatedGameState);
    premoveSelectionRef.current = squareName;
  };

  // Helper function to get preview board with premoves applied
  const getPreviewBoard = useCallback((): (string | null)[][] => {
    const previewBoard: (string | null)[][] = gameState.boardArray.map((r) => r.slice());

    try {
      const queue = premoveQueueRef.current || [];
      for (const mv of queue) {
        const from = mv.from;
        const to = mv.to;
        if (!from || !to) continue;
        const fromCol = boardLetters.indexOf(from[0]);
        const fromRow = boardNumbers.indexOf(from[1]);
        const toCol = boardLetters.indexOf(to[0]);
        const toRow = boardNumbers.indexOf(to[1]);
        if (
          fromRow >= 0 &&
          fromCol >= 0 &&
          toRow >= 0 &&
          toCol >= 0 &&
          previewBoard[fromRow] &&
          previewBoard[toRow]
        ) {
          const piece = previewBoard[fromRow][fromCol];
          previewBoard[fromRow][fromCol] = "";
          previewBoard[toRow][toCol] = piece;
        }
      }
    } catch (err) {
      // If preview overlay fails for any reason, fall back to the real board.
      console.error("Error applying premove queue to preview board:", err);
    }

    return previewBoard;
  }, [gameState.boardArray]);

  // Helper function to get piece at position from preview board
  const getPieceAtPositionPreview = useCallback(
    (squareName: string): string | null => {
      const previewBoard = getPreviewBoard();
      const col = boardLetters.indexOf(squareName[0]);
      const row = boardNumbers.indexOf(squareName[1]);
      if (row >= 0 && col >= 0 && previewBoard[row] && previewBoard[row][col]) {
        return previewBoard[row][col] as string;
      }
      return null;
    },
    [getPreviewBoard]
  );

  // Select square and show available moves (not necessarily legal)
  const selectSquareWithAvailableMoves = (squareName: string) => {
    // Use preview board to get the piece that the user actually sees
    const piece = getPieceAtPositionPreview(squareName);
    if (!piece) return;

    const updatedGameState: GameState = { ...gameState };
    updatedGameState.selectedSquare = squareName;

    const availableMoves = ChessEngineInstance.getPremoveMoves(piece, squareName);
    updatedGameState.validMoves = availableMoves;
    validSquaresRef.current = availableMoves;

    const prevLast = gameState.lastMoves || [];
    updatedGameState.highlightedSquares = Array.from(new Set([...prevLast, squareName]));

    setGameState(updatedGameState);
    premoveSelectionRef.current = squareName;
  };

  // Handle piece mouse down or touch start (unified)
  const handlePiecePointerDown = (
    e: React.MouseEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>,
    piece: string,
    fromSquare: string
  ) => {
    // Rely on element CSS (touch-action: none) to prevent native gestures.
    // Avoid calling preventDefault/stopPropagation here to prevent errors
    // when the browser registers touch listeners as passive.
    if (!fromSquare) return;

    lastMoveWasDragRef.current = false;

    const pieceElement = e.target as HTMLImageElement;
    let clientX: number, clientY: number;
    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return;
    }

    // If a piece is already selected and this square is a legal move/capture, treat as click-to-move
    if (gameState.selectedSquare && gameState.validMoves.includes(fromSquare)) {
      const src = gameState.selectedSquare;
      const fromRect = getPieceRect(src);
      const toRect = getPieceRect(fromSquare);

      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        lastMoves: [src, fromSquare],
        highlightedSquares: [src, fromSquare],
      }));

      const moverNow = gameState.currentPlayer;
      if (moverNow !== playerRef.current || outgoingMovePendingRef.current) {
        queuePremove(src, fromSquare);
        return;
      }

      if (!isDraggingRef.current && fromRect && toRect) {
        pendingAnimationTriggerRef.current = true;
        executeChessMove(src, fromSquare);
      } else {
        executeChessMove(src, fromSquare);
      }
      return;
    }

    // Check if this piece exists in preview position due to a premove
    const realPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
    const previewPiece = getPieceAtPositionPreview(fromSquare);
    const isPremoveDestination = premoveQueue.some((p) => p.to === fromSquare);

    const isChainablePremoveClick =
      isPremoveDestination &&
      gameState.currentPlayer !== playerRef.current &&
      previewPiece &&
      previewPiece[0] === (playerRef.current === "white" ? "W" : "B");

    if (isPremoveDestination && !isChainablePremoveClick) {
      return;
    }

    if (
      previewPiece &&
      !realPiece &&
      gameState.currentPlayer !== playerRef.current &&
      !isChainablePremoveClick
    ) {
      return;
    }

    document.body.classList.add("dragging");
    document.body.style.cursor = "grabbing";
    setHoveredSquare(fromSquare);

    // Create drag image
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
      left: ${clientX - rect.width / 2}px;
      top: ${clientY - rect.height / 2}px;
      object-fit: contain;
      opacity: 1;
    `;

    const squareEl = pieceElement.closest(".square");
    if (squareEl && squareEl.id) {
      setHoveredSquare(squareEl.id);
    }
    document.body.appendChild(dragImage);
    pieceElement.classList.add("dragging");

    document.body.classList.remove("dragging");
    void document.body.offsetWidth;
    document.body.style.removeProperty("cursor");

    const actualPiece = getPieceAtPositionPreview(fromSquare);
    const currentPieceColor = actualPiece ? (actualPiece[0] === "W" ? "white" : "black") : null;

    if (currentPieceColor === gameState.currentPlayer) {
      if (gameState.selectedSquare !== fromSquare) {
        selectSquare(fromSquare);
      }
    } else if (currentPieceColor && currentPieceColor !== gameState.currentPlayer) {
      if (currentPieceColor === playerRef.current) {
        if (gameState.selectedSquare !== fromSquare) {
          selectSquareWithAvailableMoves(fromSquare);
        }
      }
    } else {
      if (gameState.selectedSquare) {
        setGameState((prev) => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
          highlightedSquares: [...(prev.lastMoves || [])],
        }));
      }
    }

    lastMouseDownSquare.current = fromSquare;
    draggingPieceRef.current = piece;
    draggingFromSquareRef.current = fromSquare;

    // Mouse drag events
    const startDrag = () => {
      if (dragStarted) return;
      dragStarted = true;
      lastMoveWasDragRef.current = true;
      pieceElement.classList.add("dragging");
      setIsDragging(true);
      document.body.classList.add("dragging");
    };

    const updateDragImagePosition = (evt: MouseEvent | TouchEvent | Event) => {
      if (!dragStarted || !dragImage) return;
      let x, y;
      if (evt instanceof TouchEvent && evt.touches.length > 0) {
        x = evt.touches[0].clientX;
        y = evt.touches[0].clientY;
      } else if ("clientX" in evt) {
        x = (evt as MouseEvent).clientX;
        y = (evt as MouseEvent).clientY;
      } else {
        return;
      }
      dragImage.style.left = `${x - dragImage.offsetWidth / 2}px`;
      dragImage.style.top = `${y - dragImage.offsetHeight / 2}px`;
    };

    // Mouse move
    const dragImageMoveHandler = (evt: Event) => {
      if (!dragStarted) {
        startDrag();
      }
      updateDragImagePosition(evt);
    };
    document.addEventListener("mousemove", dragImageMoveHandler);
    // Touch move
    const dragImageTouchMoveHandler = (evt: TouchEvent) => {
      if (!dragStarted) {
        startDrag();
      }
      updateDragImagePosition(evt);
    };
    document.addEventListener("touchmove", dragImageTouchMoveHandler);

    // Mouse up
    const dragImageUpHandler = () => {
      setHoveredSquare(null);
      if (dragImage) dragImage.remove();
      pieceElement.classList.remove("dragging");
      document.removeEventListener("mousemove", dragImageMoveHandler);
      document.removeEventListener("touchmove", dragImageTouchMoveHandler);
    };
    document.addEventListener("mouseup", dragImageUpHandler, { once: true });
    // Touch end
    const dragImageTouchEndHandler = () => {
      setHoveredSquare(null);
      if (dragImage) dragImage.remove();
      pieceElement.classList.remove("dragging");
      document.removeEventListener("mousemove", dragImageMoveHandler);
      document.removeEventListener("touchmove", dragImageTouchMoveHandler);
    };
    document.addEventListener("touchend", dragImageTouchEndHandler, { once: true });

    document.addEventListener("mousemove", mouseMoveListener);
    document.addEventListener("mouseup", mouseUpListener);
    document.addEventListener("touchmove", mouseMoveListener);
    document.addEventListener("touchend", mouseUpListener);
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

      let resolveAnim: (() => void) | null = null;
      const animPromise = new Promise<void>((res) => {
        resolveAnim = res;
      });

      animateMove(fromSquare, dropSquare, movingPiece || "", fromRect, toRect, () => {
        resolveAnim?.();
      });

      const lanKey = `${fromSquare}${dropSquare}`;
      outgoingMovePendingRef.current = true;

      dispatcherRef.current
        .enqueue(async () => {
          await animPromise;
          const result = ChessEngineInstance.makeMove(fromSquare, dropSquare);
          if (!result || !result.isValid) throw new Error("Invalid move");
          setAnimatingPiece(null);
          return applyResult(result);
        }, lanKey)
        .then(() => {
          outgoingMovePendingRef.current = false;
        })
        .catch(() => {
          outgoingMovePendingRef.current = false;
        });

      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.classList.remove("dragging");
      void document.body.offsetWidth;
      document.body.style.cursor = "";
      document.querySelectorAll(".custom-drag-image").forEach((el) => el.remove());
      document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
      document.querySelectorAll("img").forEach((img) => {
        img.style.opacity = "1";
      });

      pendingAnimationRef.current = null;
    }
  }, [gameState.lastMoves, animateMove, executeChessMove, applyResult]);

  // Handle piece drop or click-to-move
  const handleDrop = (
    dropSquare: string,
    fromSquareOverride?: string,
    gameStateOverride?: GameState
  ) => {
    const state = gameStateOverride || gameState;
    const fromSquare = fromSquareOverride || draggingFromSquareRef.current || state.selectedSquare;

    if (!fromSquare) {
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.classList.remove("dragging");
      void document.body.offsetWidth;
      document.body.style.cursor = "";
      return;
    }

    ChessEngineInstance.setGameState(state);

    // Use preview board to get the piece that the user actually sees
    const piece = getPieceAtPositionPreview(fromSquare);
    const currentPieceColor =
      piece && piece[0] === "W" ? "white" : piece && piece[0] === "B" ? "black" : null;

    const isOpponentsTurn =
      state.currentPlayer !== playerRef.current || outgoingMovePendingRef.current;
    let canMakePremove = false;
    if (isOpponentsTurn && currentPieceColor === playerRef.current) {
      const hasValidMoves = Array.isArray(state.validMoves) && state.validMoves.length > 0;
      const validIncludes = hasValidMoves && state.validMoves!.includes(dropSquare);
      // Use preview board to check for premove availability
      const premovePiece = getPieceAtPositionPreview(fromSquare);
      const engineAvailable = premovePiece
        ? ChessEngineInstance.getPremoveMoves(premovePiece, fromSquare).includes(dropSquare)
        : false;
      canMakePremove = isDragging || validIncludes || engineAvailable;
    }
    const isNormalMove = currentPieceColor === state.currentPlayer;

    if (isNormalMove) {
      // For normal moves, get the piece from the preview board
      const movingPiece = getPieceAtPositionPreview(fromSquare);
      const fromRect: DOMRect | null = getPieceRect(fromSquare);
      const toRect: DOMRect | null = getPieceRect(dropSquare);

      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        lastMoves: [fromSquare, dropSquare],
        highlightedSquares: [fromSquare, dropSquare],
      }));

      if (!isDraggingRef.current && fromRect && toRect) {
        pendingAnimationRef.current = {
          fromSquare,
          dropSquare,
          movingPiece,
          fromRect,
          toRect,
        };
      } else {
        executeChessMove(fromSquare, dropSquare);
      }
      // Clean up drag cursor/state immediately after drop
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.classList.remove("dragging");
      void document.body.offsetWidth;
      document.body.style.removeProperty("cursor");
    } else if (canMakePremove) {
      let canQueuePremove = false;
      if (currentPieceColor === playerRef.current) {
        if (state.selectedSquare === fromSquare && Array.isArray(state.validMoves)) {
          canQueuePremove = state.validMoves.includes(dropSquare);
        } else {
          // Use preview board to check for premove moves
          const srcPiece = getPieceAtPositionPreview(fromSquare);
          if (srcPiece) {
            const availableMoves = ChessEngineInstance.getPremoveMoves(srcPiece, fromSquare);
            canQueuePremove = availableMoves.includes(dropSquare);
          }
        }
      }

      if (canQueuePremove) {
        queuePremove(fromSquare, dropSquare);
        setGameState((prev) => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
          highlightedSquares: [...(prev.lastMoves || [])],
        }));
      }
      // Also ensure cursor resets after premove drop
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.classList.remove("dragging");
      void document.body.offsetWidth;
      document.body.style.removeProperty("cursor");
    } else {
      // Invalid move - clean up drag state
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.classList.remove("dragging");
      void document.body.offsetWidth;
      document.body.style.cursor = "";
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
    const isPremoveDestination = premoveQueue.some((p) => p.to === squareName);
    const isPremoveSource = premoveQueue.some((p) => p.from === squareName);

    const handleSquareMouseDown = () => {
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
          onSquareMouseDown={(sq: string) => {
            handleSquareMouseDown();
            handleSquareClick(sq);
          }}
          onPieceMouseDown={(e: React.MouseEvent<HTMLImageElement>, p: string, sq: string) => {
            handlePiecePointerDown(e, p, sq);
          }}
          onPieceTouchStart={(e: React.TouchEvent<HTMLImageElement>, p: string, sq: string) => {
            handlePiecePointerDown(e, p, sq);
          }}
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

  // Animation state management
  const [animTransform, setAnimTransform] = React.useState<"start" | "end">("start");
  React.useEffect(() => {
    if (animatingPiece && animatingPiece.fromRect && animatingPiece.toRect) {
      setAnimTransform("start");
      requestAnimationFrame(() => {
        setAnimTransform("end");
      });
    } else if (!animatingPiece) {
      setAnimTransform("start");
    }
  }, [animatingPiece]);

  // Render the chessboard and the animating piece
  const renderBoard = (animTransform: "start" | "end") => {
    const boardSquares = [];

    // Use our helper function to get the preview board with premoves applied
    const previewBoard = getPreviewBoard();

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const squareName = `${boardLetters[col]}${boardNumbers[row]}`;
        const piece = previewBoard[row][col];
        const isLightSquare = (row + col) % 2 === 0;
        const squareColor = isLightSquare ? "light" : "dark";
        const isSelected = gameState.selectedSquare === squareName;
        const isHighlighted = gameState.highlightedSquares?.includes(squareName) || false;
        const isLegalMove = gameState.validMoves?.includes(squareName) || false;

        // For capture hints, use the REAL board state, not preview board
        // This prevents showing capture hints on premove destinations
        const realPiece = ChessEngineInstance.getPieceAtPosition(squareName);
        const isPremoveDestination = premoveQueue.some((p) => p.to === squareName);
        const isCaptureHint = isLegalMove && !!realPiece && !isPremoveDestination;

        boardSquares.push(
          renderSquare(
            squareName,
            piece,
            squareColor,
            isSelected,
            isHighlighted,
            isLegalMove,
            isCaptureHint
          )
        );
      }
    }

    // Render the animating piece
    let animPieceEl = null;

    if (
      animatingPiece &&
      animatingPiece.fromRect &&
      animatingPiece.toRect &&
      animatingPiece.domClone
    ) {
      const boardEl = typeof window !== "undefined" ? document.querySelector(".chessboard") : null;
      if (boardEl) {
        const boardRect = boardEl.getBoundingClientRect();
        const fromX = animatingPiece.fromRect.left - boardRect.left;
        const fromY = animatingPiece.fromRect.top - boardRect.top;
        const toX = animatingPiece.toRect.left - boardRect.left;
        const toY = animatingPiece.toRect.top - boardRect.top;

        const currentX = animTransform === "start" ? fromX : toX;
        const currentY = animTransform === "start" ? fromY : toY;

        animPieceEl = (
          <div
            style={{
              position: "absolute",
              left: `${currentX}px`,
              top: `${currentY}px`,
              width: `${animatingPiece.fromRect.width}px`,
              height: `${animatingPiece.fromRect.height}px`,
              transition: animTransform === "end" ? "all 0.3s ease-in-out" : "none",
              zIndex: 2000,
              pointerEvents: "none",
            }}
            dangerouslySetInnerHTML={{
              __html: animatingPiece.domClone.outerHTML,
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
      {/* Debug panel removed */}
    </div>
  );
};

export default Chessboard;
