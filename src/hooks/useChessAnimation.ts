import { useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatingPiece, ChessAnimationHook } from "../types/hooks";

export const useChessAnimation = (): ChessAnimationHook => {
  const [animatingPiece, setAnimatingPiece] = useState<AnimatingPiece | null>(null);

  // Helper to compute the piece DOM rect for animation
  const getPieceRect = useCallback((squareName: string): DOMRect | null => {
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
  }, []);

  const animateMove = useCallback(
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

      // Safety: If we can't get the rects, just call onDone immediately
      if (!fromRect || !toRect) {
        if (onDone) onDone();
        return () => {};
      }

      const fromSquareEl = document.getElementById(from);
      const fromImg = fromSquareEl ? fromSquareEl.querySelector("img") : null;
      let domClone: HTMLElement | null = null;

      if (fromImg) {
        // Create the animated clone with FIXED positioning (chess.com behavior)
        domClone = fromImg.cloneNode(true) as HTMLElement;
        domClone.className = "animating-clone";

        // Use fixed positioning with explicit dimensions matching the original piece
        domClone.style.cssText = `
          position: fixed;
          left: ${fromRect.left}px;
          top: ${fromRect.top}px;
          width: ${fromRect.width}px;
          height: ${fromRect.height}px;
          z-index: 9999;
          pointer-events: none;
          object-fit: contain;
          transition: none;
          will-change: left, top;
        `;

        // Append directly to body for fixed positioning to work correctly
        document.body.appendChild(domClone);

        // Force reflow to ensure initial position is applied BEFORE hiding original
        domClone.getBoundingClientRect();

        // Hide the original piece AFTER clone is visible to prevent flicker
        fromImg.style.opacity = "0";
        fromImg.classList.add("animating");

        // Use requestAnimationFrame to ensure paint before transition starts
        requestAnimationFrame(() => {
          if (domClone) {
            // Now add transition and animate to destination
            domClone.style.transition = "left 200ms ease-out, top 200ms ease-out";
            domClone.style.left = `${toRect.left}px`;
            domClone.style.top = `${toRect.top}px`;
          }
        });
      } else {
        // No image to animate - just call onDone after a short delay
        setTimeout(() => {
          if (onDone) onDone();
        }, 50);
        return () => {};
      }

      const animationId = Date.now();
      // Note: Original piece is now hidden in the clone creation block above
      // to prevent flicker (clone visible before original hidden)

      // Set animating piece synchronously so callers see the change immediately
      flushSync(() => {
        setAnimatingPiece({
          piece,
          fromSquare: from,
          toSquare: to,
          fromRect,
          toRect,
          animationId,
          domClone,
        });
      });

      const duration = 200;
      const t = window.setTimeout(() => {
        // CRITICAL: Call onDone FIRST to update game state before cleanup
        // This ensures piece appears at new position before we remove the clone
        console.log(`[Animation] Animation complete for ${piece} (${from} -> ${to})`);

        // Clear animating piece state first
        flushSync(() => setAnimatingPiece(null));

        // Call the completion callback to update game state
        // This renders the piece at its new position
        if (onDone) onDone();

        // Now safely remove the clone (piece is already at destination)
        if (domClone && domClone.parentNode) {
          domClone.parentNode.removeChild(domClone);
        }

        // NOTE: We intentionally do NOT restore the original image visibility here
        // The game state update re-renders the board, so the old piece element
        // may no longer exist or should remain hidden to prevent flicker
      }, duration + 50);

      console.log(`[Animation] Animation started for ${piece} (${from} -> ${to})`);

      return () => {
        // Remove the clone from DOM on cleanup
        if (domClone && domClone.parentNode) {
          domClone.parentNode.removeChild(domClone);
        }

        if (fromImg) {
          fromImg.classList.remove("animating");
          fromImg.style.removeProperty("opacity");
        }

        flushSync(() => setAnimatingPiece(null));
        window.clearTimeout(t);
      };
    },
    [animatingPiece]
  );

  const clearAnimation = useCallback(() => {
    flushSync(() => setAnimatingPiece(null));
  }, []);

  return {
    animatingPiece,
    animateMove,
    getPieceRect,
    clearAnimation,
  };
};
