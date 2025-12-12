import { useCallback, useRef, useState, useMemo } from "react";
import { DragState, DragAndDropHook } from "../types/hooks";

export const useDragAndDrop = (): DragAndDropHook => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggingPiece: null,
    draggingFromSquare: null,
    lastMouseDownSquare: null,
    lastHoveredSquare: null,
    hoveredSquare: null,
    activePointerId: null,
  });

  const isDraggingRef = useRef(dragState.isDragging);
  const draggingPieceRef = useRef<string | null>(null);
  const draggingFromSquareRef = useRef<string | null>(null);
  const lastMouseDownSquareRef = useRef<string | null>(null);
  const lastHoveredSquareRef = useRef<string | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  // Update refs when state changes
  const updateDragState = useCallback((newState: Partial<DragState>) => {
    setDragState((prev) => {
      const updated = { ...prev, ...newState };
      isDraggingRef.current = updated.isDragging;
      draggingPieceRef.current = updated.draggingPiece;
      draggingFromSquareRef.current = updated.draggingFromSquare;
      lastMouseDownSquareRef.current = updated.lastMouseDownSquare;
      lastHoveredSquareRef.current = updated.lastHoveredSquare;
      activePointerIdRef.current = updated.activePointerId;
      return updated;
    });
  }, []);

  // Cleanup any active drag state
  const cleanupActiveDrag = useCallback(() => {
    try {
      updateDragState({
        isDragging: false,
        draggingPiece: null,
        draggingFromSquare: null,
        lastMouseDownSquare: null,
        lastHoveredSquare: null,
        hoveredSquare: null,
        activePointerId: null,
      });

      document.body.classList.remove("dragging");
      document.body.style.removeProperty("cursor");

      // Remove any floating drag images
      document
        .querySelectorAll('.custom-drag-image, img[style*="position: fixed"]')
        .forEach((el) => el.remove());

      // Restore original piece visibility
      document.querySelectorAll('img[style*="opacity: 0"]').forEach((img) => {
        (img as HTMLElement).style.opacity = "1";
      });

      // Remove dragging classes
      document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
    } catch {
      // Ignore cleanup errors
    }
  }, [updateDragState]);

  // Handle pointer movement during drag
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const clientX = event.clientX;
      const clientY = event.clientY;

      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;

      const customDragImage = document.querySelector(".custom-drag-image") as HTMLElement;

      // Update position of drag image (it's already created in startDrag)
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

      if (currentSquareId !== dragState.hoveredSquare) {
        updateDragState({ hoveredSquare: currentSquareId });
      }
    },
    [dragState.hoveredSquare, updateDragState]
  );

  // Start drag operation with immediate visual feedback
  // The piece should IMMEDIATELY appear centered under the cursor
  const startDrag = useCallback(
    (piece: string, fromSquare: string, pointerId?: number, clientX?: number, clientY?: number) => {
      updateDragState({
        isDragging: true,
        draggingPiece: piece,
        draggingFromSquare: fromSquare,
        lastMouseDownSquare: fromSquare,
        activePointerId: pointerId || null,
      });

      document.body.classList.add("dragging");
      document.body.style.cursor = "grabbing";

      // Create visual drag image immediately for instant feedback
      const sourceSquare = document.getElementById(fromSquare);
      const sourceImg = sourceSquare?.querySelector("img");

      if (sourceImg) {
        const rect = sourceImg.getBoundingClientRect();

        // Clone the piece image for dragging
        const dragImage = sourceImg.cloneNode(true) as HTMLImageElement;
        dragImage.className = "custom-drag-image";
        dragImage.style.cssText = `
          position: fixed;
          pointer-events: none;
          z-index: 9999;
          width: ${rect.width}px;
          height: ${rect.height}px;
          object-fit: contain;
          opacity: 1;
          transition: none;
        `;

        // Position IMMEDIATELY centered under the cursor (chess.com behavior)
        // If no clientX/Y provided, fall back to piece center
        const posX = clientX ?? rect.left + rect.width / 2;
        const posY = clientY ?? rect.top + rect.height / 2;
        dragImage.style.left = `${posX - rect.width / 2}px`;
        dragImage.style.top = `${posY - rect.height / 2}px`;

        document.body.appendChild(dragImage);

        // Hide the original piece during drag
        sourceImg.style.opacity = "0";
      }
    },
    [updateDragState]
  );

  // End drag operation
  const endDrag = useCallback(() => {
    cleanupActiveDrag();
  }, [cleanupActiveDrag]);

  // Set hovered square
  const setHoveredSquare = useCallback(
    (square: string | null) => {
      updateDragState({ hoveredSquare: square });
    },
    [updateDragState]
  );

  return useMemo(
    () => ({
      // State
      isDragging: dragState.isDragging,
      draggingPiece: dragState.draggingPiece,
      draggingFromSquare: dragState.draggingFromSquare,
      hoveredSquare: dragState.hoveredSquare,

      // Refs (for performance-critical operations)
      isDraggingRef,
      draggingPieceRef,
      draggingFromSquareRef,
      lastMouseDownSquareRef,
      lastHoveredSquareRef,
      activePointerIdRef,

      // Actions
      startDrag,
      endDrag,
      cleanupActiveDrag,
      handlePointerMove,
      setHoveredSquare,
    }),
    [
      dragState.isDragging,
      dragState.draggingPiece,
      dragState.draggingFromSquare,
      dragState.hoveredSquare,
      startDrag,
      endDrag,
      cleanupActiveDrag,
      handlePointerMove,
      setHoveredSquare,
    ]
  );
};
