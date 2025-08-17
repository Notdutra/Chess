import { ChessEngine } from "../../src/logic/ChessEngine";

describe("premove queue preview (engine-level)", () => {
  test("applying queued premoves on a temp engine yields expected board", () => {
    const engine = new ChessEngine();

    // Make a simple sequence: e2e4 (white pawn) then e7e5 (black pawn) then e4e5 (white capture)
    // Start from initial position
    const r1 = engine.makeMove("e2", "e4");
    expect(r1.isValid).toBe(true);
    engine.setGameState(r1.newGameState);

    const r2 = engine.makeMove("e7", "e5");
    expect(r2.isValid).toBe(true);
    engine.setGameState(r2.newGameState);

    // Now white premoves e4e5 (capture)
    // We'll simulate preview by cloning engine state and applying the premove
    const snap = engine.getGameState();
    const temp = new ChessEngine(JSON.parse(JSON.stringify(snap)));
    const r3 = temp.makeMove("e4", "e5");
    expect(r3.isValid).toBe(true);

    // After capture, e5 should contain a white pawn and e4 should be empty
    const after = r3.newGameState.boardArray;
    // e5 is file 'e' (4), rank 3 (8 - 5 = 3)
    expect(after[3][4]).toMatch(/WP/);
    expect(after[4][4]).toBe("");
  });
});
