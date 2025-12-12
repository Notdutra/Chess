import React from "react";
import { GameState } from "../models/GameState";

export interface AnimatingPiece {
  piece: string;
  fromSquare: string;
  toSquare: string;
  fromRect: DOMRect | null;
  toRect: DOMRect | null;
  animationId: number;
  domClone?: HTMLElement | null;
}

export interface ChessAnimationHook {
  animatingPiece: AnimatingPiece | null;
  animateMove: (
    from: string,
    to: string,
    piece: string,
    fromRect: DOMRect,
    toRect: DOMRect,
    onDone?: () => void
  ) => () => void;
  getPieceRect: (squareName: string) => DOMRect | null;
  clearAnimation: () => void;
}

export interface DragState {
  isDragging: boolean;
  draggingPiece: string | null;
  draggingFromSquare: string | null;
  lastMouseDownSquare: string | null;
  lastHoveredSquare: string | null;
  hoveredSquare: string | null;
  activePointerId: number | null;
}

export interface DragAndDropHook {
  // State
  isDragging: boolean;
  draggingPiece: string | null;
  draggingFromSquare: string | null;
  hoveredSquare: string | null;

  // Refs (for performance-critical operations)
  isDraggingRef: React.MutableRefObject<boolean>;
  draggingPieceRef: React.MutableRefObject<string | null>;
  draggingFromSquareRef: React.MutableRefObject<string | null>;
  lastMouseDownSquareRef: React.MutableRefObject<string | null>;
  lastHoveredSquareRef: React.MutableRefObject<string | null>;
  activePointerIdRef: React.MutableRefObject<number | null>;

  // Actions
  startDrag: (
    piece: string,
    fromSquare: string,
    pointerId?: number,
    clientX?: number,
    clientY?: number
  ) => void;
  endDrag: () => void;
  cleanupActiveDrag: () => void;
  handlePointerMove: (event: PointerEvent) => void;
  setHoveredSquare: (square: string | null) => void;
}

export interface PremoveQueue {
  from: string;
  to: string;
}

export interface PremovesHook {
  // State
  premoveQueue: PremoveQueue[];
  premoveSelection: string | null;

  // Actions
  queuePremove: (from: string, to: string) => void;
  clearPremoveQueue: () => void;
  validatePremoveBeforeOpponentMove: (from: string, to: string) => void;
  getPreviewBoard: (gameState: GameState) => (string | null)[][];
  getPieceAtPositionPreview: (squareName: string, gameState: GameState) => string | null;

  // Refs
  premoveQueueRef: React.MutableRefObject<PremoveQueue[]>;
  premoveSelectionRef: React.MutableRefObject<string | null>;
}

export interface GameStateHook {
  gameState: GameState;
  updateGameState: (newState: GameState | ((prev: GameState) => GameState)) => void;
  selectSquare: (squareName: string | null, forPremove?: boolean) => void;
  clearSelection: () => void;
  highlightLastMove: (from: string, to: string) => void;
  isPlayerTurn: (playerColor: "white" | "black") => boolean;
  setValidMoves: (moves: string[]) => void;
  resetGame: () => void;
  // Player/opponent tracking
  isPlayerColor: (color: "white" | "black") => boolean;
  isOpponentTurn: () => boolean;
  setPlayerColor: (color: "white" | "black") => void;
  playerColor: "white" | "black";
  botColor: "white" | "black" | null;
}
