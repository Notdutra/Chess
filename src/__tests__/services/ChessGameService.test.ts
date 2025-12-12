import { ChessGameService } from "../../services/chess/ChessGameService";
import { ChessEngineInstance } from "../../logic/ChessEngine";
import { MoveResult } from "../../models/Move";
import { GameState } from "../../models/GameState";

// Mock the ChessEngine
jest.mock("../../logic/ChessEngine");

describe("ChessGameService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("executeMove", () => {
    it("should execute valid move", () => {
      const mockGameState = {
        currentPlayer: "white",
        boardArray: [],
        checkmate: false,
        stalemate: false,
      } as unknown as GameState;

      const mockMoveResult: MoveResult = {
        isValid: true,
        moveType: "normal",
        newGameState: mockGameState,
        move: {
          from: "e2",
          to: "e4",
          piece: "WP",
        },
      };

      (ChessEngineInstance.getPieceAtPosition as jest.Mock).mockReturnValue("WP");
      (ChessEngineInstance.getValidMoves as jest.Mock).mockReturnValue(["e4"]);
      (ChessEngineInstance.makeMove as jest.Mock).mockReturnValue(mockMoveResult);

      const result = ChessGameService.executeMove("e2", "e4");

      expect(result).toEqual(mockMoveResult);
      expect(ChessEngineInstance.getPieceAtPosition).toHaveBeenCalledWith("e2");
      expect(ChessEngineInstance.getValidMoves).toHaveBeenCalledWith("WP", "e2");
      expect(ChessEngineInstance.makeMove).toHaveBeenCalledWith("e2", "e4");
    });

    it("should return null for empty square", () => {
      (ChessEngineInstance.getPieceAtPosition as jest.Mock).mockReturnValue(null);

      const result = ChessGameService.executeMove("e2", "e4");

      expect(result).toBeNull();
      expect(ChessEngineInstance.getPieceAtPosition).toHaveBeenCalledWith("e2");
      expect(ChessEngineInstance.getValidMoves).not.toHaveBeenCalled();
      expect(ChessEngineInstance.makeMove).not.toHaveBeenCalled();
    });

    it("should return null for invalid move", () => {
      (ChessEngineInstance.getPieceAtPosition as jest.Mock).mockReturnValue("WP");
      (ChessEngineInstance.getValidMoves as jest.Mock).mockReturnValue(["e3"]);

      const result = ChessGameService.executeMove("e2", "e4");

      expect(result).toBeNull();
      expect(ChessEngineInstance.getPieceAtPosition).toHaveBeenCalledWith("e2");
      expect(ChessEngineInstance.getValidMoves).toHaveBeenCalledWith("WP", "e2");
      expect(ChessEngineInstance.makeMove).not.toHaveBeenCalled();
    });
  });

  describe("getValidMoves", () => {
    it("should return valid moves for piece", () => {
      const expectedMoves = ["e3", "e4"];
      (ChessEngineInstance.getPieceAtPosition as jest.Mock).mockReturnValue("WP");
      (ChessEngineInstance.getValidMoves as jest.Mock).mockReturnValue(expectedMoves);

      const result = ChessGameService.getValidMoves("e2");

      expect(result).toEqual(expectedMoves);
      expect(ChessEngineInstance.getPieceAtPosition).toHaveBeenCalledWith("e2");
      expect(ChessEngineInstance.getValidMoves).toHaveBeenCalledWith("WP", "e2");
    });

    it("should return empty array for empty square", () => {
      (ChessEngineInstance.getPieceAtPosition as jest.Mock).mockReturnValue(null);

      const result = ChessGameService.getValidMoves("e2");

      expect(result).toEqual([]);
      expect(ChessEngineInstance.getPieceAtPosition).toHaveBeenCalledWith("e2");
      expect(ChessEngineInstance.getValidMoves).not.toHaveBeenCalled();
    });
  });

  describe("isValidMove", () => {
    it("should return true for valid move", () => {
      (ChessEngineInstance.getPieceAtPosition as jest.Mock).mockReturnValue("WP");
      (ChessEngineInstance.getValidMoves as jest.Mock).mockReturnValue(["e3", "e4"]);

      const result = ChessGameService.isValidMove("e2", "e4");

      expect(result).toBe(true);
      expect(ChessEngineInstance.getPieceAtPosition).toHaveBeenCalledWith("e2");
      expect(ChessEngineInstance.getValidMoves).toHaveBeenCalledWith("WP", "e2");
    });

    it("should return false for invalid move", () => {
      (ChessEngineInstance.getPieceAtPosition as jest.Mock).mockReturnValue("WP");
      (ChessEngineInstance.getValidMoves as jest.Mock).mockReturnValue(["e3"]);

      const result = ChessGameService.isValidMove("e2", "e4");

      expect(result).toBe(false);
    });

    it("should return false for empty square", () => {
      (ChessEngineInstance.getPieceAtPosition as jest.Mock).mockReturnValue(null);

      const result = ChessGameService.isValidMove("e2", "e4");

      expect(result).toBe(false);
    });
  });

  describe("getCurrentGameState", () => {
    it("should return current game state", () => {
      const mockGameState = {
        currentPlayer: "white",
        boardArray: [],
        checkmate: false,
        stalemate: false,
      };

      (ChessEngineInstance.getGameState as jest.Mock).mockReturnValue(mockGameState);

      const result = ChessGameService.getCurrentGameState();

      expect(result).toEqual(mockGameState);
      expect(ChessEngineInstance.getGameState).toHaveBeenCalled();
    });
  });

  describe("resetGame", () => {
    it("should reset the game", () => {
      const mockInitialState = {
        currentPlayer: "white",
        boardArray: [],
        checkmate: false,
        stalemate: false,
      };

      (ChessEngineInstance.createInitialGameState as jest.Mock).mockReturnValue(mockInitialState);
      (ChessEngineInstance.setGameState as jest.Mock).mockImplementation();

      const result = ChessGameService.resetGame();

      expect(result).toEqual(mockInitialState);
      expect(ChessEngineInstance.createInitialGameState).toHaveBeenCalled();
      expect(ChessEngineInstance.setGameState).toHaveBeenCalledWith(mockInitialState);
    });
  });
});
