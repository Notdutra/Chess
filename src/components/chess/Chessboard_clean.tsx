import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChessEngineInstance, ChessEngine } from "../../logic/ChessEngine";
import { GameState } from "../../models/GameState";
import { MoveResult } from "../../models/Move";
import { PieceColor } from "../../models/Piece";
import soundManager from "../../services/SoundManager";
import ChessApi from "../../services/chessApi";
import { createDedupe } from "../../utils/moveDedupe";
import { createDispatcher } from "../../utils/moveDispatcher";
import logger from "../../utils/logger";
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
  const [gameState, setGameState] = useState<GameState>(ChessEngineInstance.getGameState());

  // SIMPLE PREMOVE SYSTEM - Chess.com style
  // Just a queue of moves and temp board for preview
  const premoveQueueRef = useRef<{ from: string; to: string }[]>([]);
  const [premoveQueue, setPremoveQueue] = useState<{ from: string; to: string }[]>([]);

  // Queue a premove (simple approach)
  const queuePremove = (from: string, to: string) => {
    premoveQueueRef.current.push({ from, to });
    setPremoveQueue([...premoveQueueRef.current]);
    soundManager.playMoveSound("premove");
    appendPersistentLog(
      `[PREMOVE] Queued ${from}->${to}, total: ${premoveQueueRef.current.length}`
    );

    // Update preview immediately
    updatePremovePreview();
  };

  // Clear premove queue
  const clearPremoveQueue = useCallback(() => {
    premoveQueueRef.current = [];
    setPremoveQueue([]);
    // Reset to real board state
    setGameState(ChessEngineInstance.getGameState());
    appendPersistentLog("[PREMOVE] Queue cleared");
  }, []);

  // Update preview by applying all queued moves to temp board
  const updatePremovePreview = useCallback(() => {
    if (premoveQueueRef.current.length === 0) {
      // No premoves - show real board
      setGameState(ChessEngineInstance.getGameState());
      return;
    }

    try {
      // Start with real board state
      const realState = ChessEngineInstance.getGameState();
      const tempEngine = new ChessEngine(JSON.parse(JSON.stringify(realState)));

      // Apply all queued moves to temp engine
      for (const move of premoveQueueRef.current) {
        const result = tempEngine.makeMove(move.from, move.to);
        if (!result || !result.isValid) {
          // Invalid premove - clear queue and reset
          clearPremoveQueue();
          return;
        }
      }

      // Update UI to show temp board state (with premoved pieces)
      setGameState(tempEngine.getGameState());
      appendPersistentLog(`[PREMOVE] Preview updated with ${premoveQueueRef.current.length} moves`);
    } catch (err) {
      appendPersistentLog(`[PREMOVE] Preview failed: ${err}`);
      clearPremoveQueue();
    }
  }, [clearPremoveQueue]);

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

  // Debug helpers
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const showDebug = (msg: string) => {
    setDebugMessage(msg);
    console.log("[UI]", msg);
    window.setTimeout(() => setDebugMessage(null), 2000);
  };

  const persistentLogsRef = useRef<string[]>([]);
  const appendPersistentLog = (msg: string) => {
    console.log("[PERSISTENT-UI]", msg);
    persistentLogsRef.current = [msg, ...persistentLogsRef.current].slice(0, 50);
    window.setTimeout(() => setDebugMessage((prev) => prev), 0);
  };

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
        appendPersistentLog(
          `animateMove: SKIPPED duplicate id=${animatingPiece.animationId} from=${from} to=${to} piece=${piece}`
        );
        if (onDone) onDone();
        return () => {};
      }

      const fromSquareEl = document.getElementById(from);
      const fromImg = fromSquareEl ? fromSquareEl.querySelector("img") : null;
      let domClone: HTMLElement | null = null;
      if (fromImg) {
        domClone = fromImg.cloneNode(true) as HTMLElement;
        // Mark clone so it can be styled separately from the original
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

      const animationId = Date.now();
      // Mark the original image as animating so CSS will hide it immediately.
      let __prevOpacity: string | null = null;
      if (fromImg) {
        fromImg.classList.add("animating");
        try {
          __prevOpacity = fromImg.style.opacity || null;
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

      appendPersistentLog(
        "animateMove: start id=" + animationId + " from=" + from + " to=" + to + " piece=" + piece
      );

      const duration = 300;
      const t = window.setTimeout(() => {
        appendPersistentLog("animateMove: end id=" + animationId);
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
        if (fromImg) {
          fromImg.classList.remove("animating");
          try {
            if (__prevOpacity !== null) fromImg.style.opacity = __prevOpacity;
            else fromImg.style.removeProperty("opacity");
          } catch {}
        }
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

      // Validate first premove
      const next = premoveQueueRef.current[0];
      if (!next) return;

      appendPersistentLog(
        `[PREMOVE PROCESS] head=${next.from}->${next.to} queueLen=${premoveQueueRef.current.length}`
      );

      const piece = ChessEngineInstance.getPieceAtPosition(next.from);
      // Ensure the piece belongs to the player to move in the confirmed state
      if (!piece || piece[0] !== (confirmedState.currentPlayer === "white" ? "W" : "B")) {
        appendPersistentLog(
          `[PREMOVE PROCESS] REJECT head=${next.from}->${next.to} reason=missing-or-wrong-color piece=${piece} expected=${confirmedState.currentPlayer}`
        );
        clearPremoveQueue();
        return;
      }

      const validMoves = ChessEngineInstance.getValidMoves(piece, next.from);
      if (!validMoves.includes(next.to)) {
        appendPersistentLog(
          `[PREMOVE PROCESS] REJECT head=${next.from}->${next.to} reason=not-in-valid-moves validCount=${validMoves.length}`
        );
        clearPremoveQueue();
        return;
      }

      // It's legal: apply it optimistically and send via dispatcher
      const fen = ChessEngineInstance.convertBoardArrayToFEN();
      const lan = `${next.from}${next.to}`;
      const lanKey = `${fen}|${lan}`;

      // Apply locally (optimistic)
      appendPersistentLog(`[PREMOVE PROCESS] APPLY optimistic head=${next.from}->${next.to}`);
      const result = ChessEngineInstance.makeMove(next.from, next.to);
      if (!result || !result.isValid) {
        appendPersistentLog(
          `[PREMOVE PROCESS] APPLY FAILED head=${next.from}->${next.to} result=${result}`
        );
        clearPremoveQueue();
        return;
      }

      // Update confirmed state locally and pop queue head
      premoveQueueRef.current.shift();
      setPremoveQueue([...premoveQueueRef.current]);

      setGameState(result.newGameState);
      ChessEngineInstance.setGameState(result.newGameState);

      // Enqueue sending to server using dispatcher
      try {
        appendPersistentLog(
          `[PREMOVE PROCESS] ENQUEUE head=${next.from}->${next.to} lanKey=${lanKey}`
        );
        dispatcherRef.current
          .enqueue(async () => {
            return result;
          }, lanKey)
          .then((res) => {
            appendPersistentLog(
              `[PREMOVE PROCESS] DISPATCHER_DONE head=${next.from}->${next.to} res=${!!res}`
            );
          })
          .catch((err) => {
            appendPersistentLog(
              `[PREMOVE PROCESS] DISPATCHER_ERR head=${next.from}->${next.to} err=${String(err)}`
            );
          });
      } catch (err) {
        appendPersistentLog(
          `[PREMOVE PROCESS] ENQUEUE_EXCEPTION head=${next.from}->${next.to} err=${String(err)}`
        );
      }

      // Update preview for remaining premoves
      updatePremovePreview();
    },
    [clearPremoveQueue, updatePremovePreview]
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
        logger.debug("moveHistory update failed:", err);
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
      })().catch((err) => logger.debug("processPremoveQueue error:", err));

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
      appendPersistentLog(
        `executeChessMove: from=${fromSquare} to=${toSquare} uiCurrent=${gameState.currentPlayer} playerRef=${playerRef.current} selected=${gameState.selectedSquare}`
      );

      const piece = ChessEngineInstance.getPieceAtPosition(fromSquare);
      if (!piece) {
        logger.debug("❌ No piece at fromSquare");
        appendPersistentLog(`executeChessMove: no piece at ${fromSquare}`);
        return null;
      }

      const validMoves = ChessEngineInstance.getValidMoves(piece, fromSquare);
      appendPersistentLog(
        `executeChessMove: piece=${piece} validMovesCount=${validMoves.length} includesTo=${validMoves.includes(toSquare)}`
      );

      if (!validMoves.includes(toSquare)) {
        logger.debug("❌ Move not allowed");
        appendPersistentLog(`executeChessMove: move not allowed ${fromSquare}->${toSquare}`);
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

      // If this is an opponent move or forced animated, try to animate
      const forceAnimated = pendingAnimationTriggerRef.current === true;
      if (mover !== playerRef.current || forceAnimated) {
        const fromRect = getPieceRect(fromSquare);
        const toRect = getPieceRect(toSquare);
        const movingPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);

        if (fromRect && toRect && movingPiece) {
          pendingAnimationTriggerRef.current = false;

          // Use animateMove helper so a DOM clone is created and stored on animatingPiece
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

      // Default: try to animate player's immediate moves when possible
      const fromRect = getPieceRect(fromSquare);
      const toRect = getPieceRect(toSquare);
      const movingPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);

      // If we can animate (have rects) and this is the player's move, run animateMove
      if (
        fromRect &&
        toRect &&
        movingPiece &&
        mover === playerRef.current &&
        !pendingAnimationTriggerRef.current
      ) {
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

      // Fallback: immediate application without animation
      appendPersistentLog(
        `executeChessMove: immediate enqueue ${fromSquare}->${toSquare} lanKey=${lanKey}`
      );
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
    [gameState, applyResult, animateMove]
  );

  // Handle mouse movement during drag
  const handleMouseMove = (evt: MouseEvent) => {
    const customDragImage = document.querySelector(".custom-drag-image") as HTMLElement;
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
      logger.debug("[PLAYER] playerRef set to", playerRef.current);
    } catch (err) {
      logger.debug("[PLAYER] failed to set playerRef:", err);
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

      try {
        executeChessMoveRef.current?.(from, to, lan, fen);
      } catch (err) {
        logger.debug("executeChessMove error:", err);
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
  }, []);

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
        logger.debug("[FEN sent to chess API]:", fen);

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
                executeChessMove(randomMove.from, randomMove.to);
              }
            } catch (err) {
              logger.debug("Fallback bot move error:", err);
            }
          }, 1000);
        }
      } catch {
        // Handle error silently
      } finally {
        setIsBotThinking(false);
      }
    },
    [gameState, isBotThinking, executeChessMove]
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
  }, [gameState, premoveQueue, processPremoveQueue]);

  // Handle mouse up to end drag
  const handleMouseUp = (evt: MouseEvent) => {
    const customDragImage = document.querySelector(".custom-drag-image") as HTMLElement;
    if (customDragImage) {
      customDragImage.style.display = "none";
    }

    document.body.style.cursor = "default";
    document.body.classList.remove("dragging");
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

    if (targetSquare && validSquaresRef.current.includes(targetSquare)) {
      handleDrop(targetSquare);
    } else {
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
    }
  };

  const mouseMoveListener = (evt: Event) => {
    handleMouseMove(evt as unknown as MouseEvent);
  };

  const mouseUpListener = (evt: Event) => {
    handleMouseUp(evt as unknown as MouseEvent);
  };

  // Handle square click
  const sameSquareCounterRef = useRef<number>(0);
  const handleSquareClick = (squareName: string) => {
    lastMoveWasDragRef.current = false;
    appendPersistentLog(`handleSquareClick: square=${squareName}`);

    appendPersistentLog(
      `[CLICK SNAP] square=${squareName} currentPlayer=${gameState.currentPlayer} playerRef=${playerRef.current} selected=${gameState.selectedSquare} premoveSelection=${premoveSelectionRef.current} outgoingPending=${outgoingMovePendingRef.current} isDragging=${isDragging} validMovesCount=${(gameState.validMoves || []).length}`
    );

    // Chess.com style: if a premove selection exists and it's opponent's turn, enqueue premove
    try {
      const persisted = premoveSelectionRef.current;
      const isOpponentsTurn =
        gameState.currentPlayer !== playerRef.current || outgoingMovePendingRef.current;
      if (isOpponentsTurn && persisted && persisted !== squareName) {
        const srcPiece = ChessEngineInstance.getPieceAtPosition(persisted);
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

    // Cancel any queued head premove if clicking elsewhere
    const head = premoveQueue[0];
    if (head && head.to !== squareName) {
      premoveQueueRef.current.shift();
      setPremoveQueue([...premoveQueueRef.current]);
      const cancelMsg = `[PREMOVE] Cancelled by user click: removed ${head.from}->${head.to}`;
      logger.debug(cancelMsg);
      showDebug(cancelMsg);
    }

    // If it's not the player's turn, allow selecting the player's pieces to create premoves
    if (gameState.currentPlayer !== playerRef.current) {
      const clickedPiece = ChessEngineInstance.getPieceAtPosition(squareName);
      const clickedColor = clickedPiece ? (clickedPiece[0] === "W" ? "white" : "black") : null;

      if (!clickedPiece || clickedColor !== playerRef.current) return;

      if (!gameState.selectedSquare) {
        selectSquareWithAvailableMoves(squareName);
        return;
      }
    }

    // If we already have a selected square, try to make a move
    if (gameState.selectedSquare) {
      logger.debug("Attempting move from", gameState.selectedSquare, "to", squareName);

      const fromSquare = gameState.selectedSquare;
      const toSquare = squareName;

      // Early authoritative premove guard
      if (gameState.currentPlayer !== playerRef.current) {
        ChessEngineInstance.setGameState(gameState);
        const srcPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
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
      const srcPiece = ChessEngineInstance.getPieceAtPosition(gameState.selectedSquare!);
      const enginePremove = srcPiece
        ? ChessEngineInstance.getPremoveMoves(srcPiece, gameState.selectedSquare!).includes(
            toSquare
          )
        : false;

      if (uiValid || enginePremove) {
        executeChessMove(fromSquare, toSquare);
      } else {
        selectSquare(squareName);
      }
    } else {
      selectSquare(squareName);
    }
  };

  // Handle piece pointer down (for compatibility with refactored Square)
  const handlePointerDown = (
    e: React.PointerEvent<HTMLImageElement>,
    piece: string,
    fromSquare: string
  ) => {
    // Optionally adapt to MouseEvent if needed
    // If handleMouseDown is not needed elsewhere, you can inline the logic here
    // For now, just call handleMouseDown with a cast
    handleMouseDown(e as unknown as React.MouseEvent<HTMLImageElement>, piece, fromSquare);
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

    const validMoves = ChessEngineInstance.getValidMoves(piece, squareName);
    updatedGameState.validMoves = validMoves;
    validSquaresRef.current = validMoves;

    const prevLast = gameState.lastMoves || [];
    updatedGameState.highlightedSquares = Array.from(new Set([...prevLast, squareName]));

    setGameState(updatedGameState);
    premoveSelectionRef.current = squareName;
  };

  // Select square and show available moves (not necessarily legal)
  const selectSquareWithAvailableMoves = (squareName: string) => {
    const piece = ChessEngineInstance.getPieceAtPosition(squareName);
    if (!piece) return;

    const updatedGameState: GameState = { ...gameState };
    updatedGameState.selectedSquare = squareName;

    const availableMoves = ChessEngineInstance.getPremoveMoves(piece, squareName);
    updatedGameState.validMoves = availableMoves;
    validSquaresRef.current = availableMoves;

    const prevLast = gameState.lastMoves || [];
    updatedGameState.highlightedSquares = Array.from(new Set([...prevLast, squareName]));

    logger.debug(
      `[selectSquareWithAvailableMoves] Available moves for ${piece} at ${squareName}:`,
      availableMoves
    );

    appendPersistentLog(
      `[selectSquareWithAvailableMoves] ${piece}@${squareName} -> ${availableMoves.length} moves`
    );

    setGameState(updatedGameState);
    premoveSelectionRef.current = squareName;
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

    lastMoveWasDragRef.current = false;
    appendPersistentLog(`handleMouseDown: piece=${piece} from=${fromSquare}`);

    const pieceElement = e.target as HTMLImageElement;

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

      if (!lastMoveWasDragRef.current && fromRect && toRect) {
        pendingAnimationTriggerRef.current = true;
        executeChessMove(src, fromSquare);
      } else {
        executeChessMove(src, fromSquare);
      }
      return;
    }

    // Otherwise proceed with drag setup
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
      left: ${e.clientX - rect.width / 2}px;
      top: ${e.clientY - rect.height / 2}px;
      object-fit: contain;
      opacity: 1;
    `;

    const squareEl = pieceElement.closest(".square");
    if (squareEl && squareEl.id) {
      setHoveredSquare(squareEl.id);
    }
    document.body.appendChild(dragImage);
    pieceElement.classList.add("dragging");

    // If a piece is selected and this square is a legal move, treat as click-to-move
    if (gameState.selectedSquare && gameState.validMoves.includes(fromSquare)) {
      handleDrop(fromSquare, gameState.selectedSquare);
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.classList.remove("dragging");
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", mouseMoveListener);
      document.removeEventListener("mouseup", mouseUpListener);
      return;
    }

    // Otherwise, select the piece and show moves
    document.body.classList.remove("dragging");
    document.body.style.cursor = "";
    const currentPieceColor = piece[0] === "W" ? "white" : "black";

    if (currentPieceColor === gameState.currentPlayer) {
      if (gameState.selectedSquare !== fromSquare) {
        selectSquare(fromSquare);
      }
    } else if (currentPieceColor && currentPieceColor !== gameState.currentPlayer) {
      if (gameState.selectedSquare !== fromSquare) {
        selectSquareWithAvailableMoves(fromSquare);
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

    const startDrag = () => {
      if (dragStarted) return;
      dragStarted = true;
      lastMoveWasDragRef.current = true;
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
      appendPersistentLog(
        `pendingAnimation: start from=${pending.fromSquare} to=${pending.dropSquare} piece=${pending.movingPiece}`
      );
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
      document.body.style.cursor = "grab";
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
    appendPersistentLog(`handleDrop: drop=${dropSquare} override=${fromSquareOverride || "none"}`);
    const state = gameStateOverride || gameState;
    const fromSquare = fromSquareOverride || draggingFromSquareRef.current || state.selectedSquare;

    if (!fromSquare) {
      setIsDragging(false);
      draggingPieceRef.current = null;
      draggingFromSquareRef.current = null;
      document.body.style.cursor = "grab";
      return;
    }

    ChessEngineInstance.setGameState(state);

    const piece = ChessEngineInstance.getPieceAtPosition(fromSquare);
    appendPersistentLog(`engine-piece-at-${fromSquare} = ${piece}`);
    const currentPieceColor =
      piece && piece[0] === "W" ? "white" : piece && piece[0] === "B" ? "black" : null;

    const isOpponentsTurn =
      state.currentPlayer !== playerRef.current || outgoingMovePendingRef.current;
    let canMakePremove = false;
    if (isOpponentsTurn && currentPieceColor === playerRef.current) {
      const hasValidMoves = Array.isArray(state.validMoves) && state.validMoves.length > 0;
      const validIncludes = hasValidMoves && state.validMoves!.includes(dropSquare);
      const premovePiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
      const engineAvailable = premovePiece
        ? ChessEngineInstance.getPremoveMoves(premovePiece, fromSquare).includes(dropSquare)
        : false;
      canMakePremove = isDragging || validIncludes || engineAvailable;
    }
    const isNormalMove = currentPieceColor === state.currentPlayer;

    appendPersistentLog(
      `premove-gate: isDragging=${isDragging} currentPieceColor=${currentPieceColor} state.currentPlayer=${state.currentPlayer} state.selected=${state.selectedSquare} validMovesIncludesDrop=${
        (state.validMoves && state.validMoves.includes(dropSquare)) || false
      } engineAvailable=${ChessEngineInstance.getPremoveMoves(ChessEngineInstance.getPieceAtPosition(fromSquare) || "", fromSquare).includes(dropSquare)} playerRef=${playerRef.current}`
    );

    if (isNormalMove) {
      const movingPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
      const fromRect: DOMRect | null = getPieceRect(fromSquare);
      const toRect: DOMRect | null = getPieceRect(dropSquare);

      appendPersistentLog(
        `handleDrop animation check: lastMoveWasDrag=${lastMoveWasDragRef.current} fromRect=${!!fromRect} toRect=${!!toRect} movingPiece=${movingPiece}`
      );

      setGameState((prev) => ({
        ...prev,
        selectedSquare: null,
        validMoves: [],
        lastMoves: [fromSquare, dropSquare],
        highlightedSquares: [fromSquare, dropSquare],
      }));

      if (!lastMoveWasDragRef.current && fromRect && toRect) {
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
    } else if (canMakePremove) {
      let canQueuePremove = false;
      if (currentPieceColor === playerRef.current) {
        if (state.selectedSquare === fromSquare && Array.isArray(state.validMoves)) {
          canQueuePremove = state.validMoves.includes(dropSquare);
        } else {
          const srcPiece = ChessEngineInstance.getPieceAtPosition(fromSquare);
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
          onSquareMouseDown={(sq) => {
            handleSquareMouseDown();
            handleSquareClick(sq);
          }}
          onPiecePointerDown={handlePointerDown}
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

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const squareName = `${boardLetters[col]}${boardNumbers[row]}`;
        const piece = gameState.boardArray[row][col];
        const isLightSquare = (row + col) % 2 === 0;
        const squareColor = isLightSquare ? "light" : "dark";
        const isSelected = gameState.selectedSquare === squareName;
        const isHighlighted = gameState.highlightedSquares?.includes(squareName) || false;
        const isLegalMove = gameState.validMoves?.includes(squareName) || false;
        // Treat empty string ("") as empty as well as null/undefined.
        const isCaptureHint = isLegalMove && !!piece;

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
              zIndex: 1000,
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
      {/* Debug panel */}
      <div
        style={{
          position: "absolute",
          right: 8,
          top: 8,
          width: 320,
          maxHeight: 220,
          overflow: "auto",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          fontSize: 12,
          padding: 8,
          borderRadius: 6,
          zIndex: 5000,
        }}
      >
        <div>Current Player: {gameState.currentPlayer}</div>
        <div>Player Ref: {playerRef.current}</div>
        <div>Selected: {gameState.selectedSquare || "none"}</div>
        <div>Premove Queue: {premoveQueue.length}</div>
        <div>Debug: {debugMessage}</div>
        <div style={{ maxHeight: 100, overflow: "auto", marginTop: 8 }}>
          {persistentLogsRef.current.slice(0, 10).map((log, i) => (
            <div key={i} style={{ fontSize: 10, opacity: 0.8 }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Chessboard;
