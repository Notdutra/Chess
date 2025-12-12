import { renderHook, act } from "@testing-library/react";
import { useChessAnimation } from "../../hooks/useChessAnimation";

describe("useChessAnimation", () => {
  let mockImg: HTMLImageElement;
  let mockSquare: HTMLDivElement;

  beforeEach(() => {
    // Create real DOM elements for testing
    mockImg = document.createElement("img");
    mockImg.className = "piece";
    Object.defineProperty(mockImg, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 60,
        height: 60,
      }),
    });

    mockSquare = document.createElement("div");
    mockSquare.appendChild(mockImg);
    document.body.appendChild(mockSquare);

    // Mock document.getElementById to return our mock square
    jest.spyOn(document, "getElementById").mockImplementation((id) => {
      if (id === "e4" || id === "e5") {
        return mockSquare;
      }
      return null;
    });

    // Mock window.getComputedStyle
    Object.defineProperty(window, "getComputedStyle", {
      value: jest.fn(() => ({
        length: 0,
        getPropertyValue: jest.fn(() => ""),
        setProperty: jest.fn(),
      })),
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("should initialize with no animating piece", () => {
    const { result } = renderHook(() => useChessAnimation());

    expect(result.current.animatingPiece).toBeNull();
  });

  it("should get piece rect for valid square", () => {
    const { result } = renderHook(() => useChessAnimation());

    const rect = result.current.getPieceRect("e4");

    expect(rect).toEqual({
      left: 0,
      top: 0,
      width: 60,
      height: 60,
    });
  });

  it("should return null for invalid square", () => {
    jest.spyOn(document, "getElementById").mockReturnValue(null);

    const { result } = renderHook(() => useChessAnimation());

    const rect = result.current.getPieceRect("invalid");

    expect(rect).toBeNull();
  });

  it("should animate move and call onDone", (done) => {
    const { result } = renderHook(() => useChessAnimation());

    const fromRect = new DOMRect(0, 0, 60, 60);
    const toRect = new DOMRect(60, 60, 60, 60);

    act(() => {
      result.current.animateMove("e4", "e5", "WP", fromRect, toRect, () => {
        expect(result.current.animatingPiece).toBeNull();
        done();
      });

      expect(result.current.animatingPiece).not.toBeNull();
      expect(result.current.animatingPiece?.fromSquare).toBe("e4");
      expect(result.current.animatingPiece?.toSquare).toBe("e5");
      expect(result.current.animatingPiece?.piece).toBe("WP");
    });
  });

  it("should prevent duplicate animations", () => {
    const { result } = renderHook(() => useChessAnimation());

    const fromRect = new DOMRect(0, 0, 60, 60);
    const toRect = new DOMRect(60, 60, 60, 60);

    act(() => {
      // Start first animation
      result.current.animateMove("e4", "e5", "WP", fromRect, toRect);
      const firstAnimation = result.current.animatingPiece;

      // Try to start same animation again
      result.current.animateMove("e4", "e5", "WP", fromRect, toRect);
      const secondAnimation = result.current.animatingPiece;

      expect(firstAnimation).toBe(secondAnimation);
    });
  });

  it("should clear animation", () => {
    const { result } = renderHook(() => useChessAnimation());

    const fromRect = new DOMRect(0, 0, 60, 60);
    const toRect = new DOMRect(60, 60, 60, 60);

    act(() => {
      result.current.animateMove("e4", "e5", "WP", fromRect, toRect);
      expect(result.current.animatingPiece).not.toBeNull();

      result.current.clearAnimation();
      expect(result.current.animatingPiece).toBeNull();
    });
  });

  it("should handle cleanup function", () => {
    const { result } = renderHook(() => useChessAnimation());

    const fromRect = new DOMRect(0, 0, 60, 60);
    const toRect = new DOMRect(60, 60, 60, 60);

    let cleanup: (() => void) | undefined;

    act(() => {
      cleanup = result.current.animateMove("e4", "e5", "WP", fromRect, toRect);
      expect(result.current.animatingPiece).not.toBeNull();
    });

    act(() => {
      cleanup?.();
      expect(result.current.animatingPiece).toBeNull();
    });
  });
});
