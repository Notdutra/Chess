import React, { useRef, useEffect } from "react";
import { getBasePath } from "../../utils/paths";

const getPieceImages = (): Record<string, string> => {
  const basePath = getBasePath();
  return {
    BR: `${basePath}/pieces/BR.png`,
    BN: `${basePath}/pieces/BN.png`,
    BB: `${basePath}/pieces/BB.png`,
    BQ: `${basePath}/pieces/BQ.png`,
    BK: `${basePath}/pieces/BK.png`,
    BP: `${basePath}/pieces/BP.png`,
    WR: `${basePath}/pieces/WR.png`,
    WN: `${basePath}/pieces/WN.png`,
    WB: `${basePath}/pieces/WB.png`,
    WQ: `${basePath}/pieces/WQ.png`,
    WK: `${basePath}/pieces/WK.png`,
    WP: `${basePath}/pieces/WP.png`,
  };
};

interface PieceProps {
  piece: string;
  squareName?: string;
  isDragging?: boolean;
  isAnimating?: boolean;
  isSelected?: boolean;
  onMouseDown?: (e: React.MouseEvent<HTMLImageElement>, piece: string, squareName: string) => void;
  onPointerDown?: (
    e: React.PointerEvent<HTMLImageElement>,
    piece: string,
    squareName: string
  ) => void;
  onDragEnd?: React.DragEventHandler<HTMLImageElement>;
  onDragStart?: (e: React.DragEvent<HTMLImageElement>, piece: string, squareName: string) => void;
  style?: React.CSSProperties;
}

const Piece: React.FC<PieceProps> = ({
  piece,
  squareName,
  isDragging,
  isAnimating,
  isSelected,
  onPointerDown,
  style,
}) => {
  const pieceImages = getPieceImages();
  const pieceKey = piece ? piece.slice(0, 2) : "";
  const pieceImage = pieceKey ? pieceImages[pieceKey] : undefined;
  const imgRef = useRef<HTMLImageElement | null>(null);

  const className = [
    "piece",
    isDragging ? "dragging" : "",
    isAnimating ? "animating" : "",
    isSelected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // No local drag handlers needed

  const handleContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
  };

  // Attach a non-passive touchstart listener directly to the image element so we can
  // safely call preventDefault to avoid the long-press image menu on mobile.
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const onTouchStart = (evt: TouchEvent) => {
      try {
        if (evt.cancelable) evt.preventDefault();
      } catch {}
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    return () => el.removeEventListener("touchstart", onTouchStart);
  }, [imgRef]);

  return pieceImage ? (
    <img
      className={className}
      id={piece}
      data-piece={piece}
      data-square={squareName}
      src={pieceImage}
      alt={piece}
      draggable={false}
      style={{
        userSelect: "none",
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "inherit",
        ...(style || {}),
      }}
      ref={imgRef}
      onPointerDown={onPointerDown ? (e) => onPointerDown(e, piece, squareName || "") : undefined}
      onContextMenu={handleContextMenu}
    />
  ) : null;
};

// (listener is attached inside the component via useEffect)

export default Piece;
