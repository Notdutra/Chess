# Testing Instructions - Move Hints Debug

## What We Fixed Today (Nov 25, 2025)

### 1. ✅ Created Comprehensive Review Document

- **File**: `nov-25.md`
- **Contents**: Complete analysis of all bugs, improvements, and roadmap to chess.com parity
- **Scope**: 400+ lines covering critical bugs, UX issues, and future enhancements

### 2. ✅ Added Debug Logging for Move Hints

- **Files Modified**:
  - `src/hooks/useGameState.ts`
  - `src/components/chess/ChessBoard/ChessBoard.tsx`
  - `src/components/chess/ChessBoard/BoardRenderer.tsx`

- **What the logs show**:
  - When you click a piece, you'll see console logs showing:
    - Square name and piece being selected
    - Player color vs current player
    - Whether it's premove mode or player's turn
    - **The validMoves array** (this is the key debug info!)
    - Whether legal moves are being passed to Square components

### 3. ✅ Safety Fixes Already Implemented

- Added 2-second safety timeout in premove execution
- Added null checks in animation system
- Added fallback for missing DOM elements

---

## How to Test the Move Hints Issue

### Step 1: Open the Game

1. The dev server is running at `http://localhost:3000`
2. Open Chrome/Firefox with DevTools (F12 or Cmd+Option+I)
3. Go to the Console tab

### Step 2: Click on a White Piece (e.g., e2 pawn)

**Expected Console Output**:

```
[ChessBoard] Calling selectSquare(e2, false)
[ChessBoard] Player color: white, Current player: white
[selectSquare] squareName: e2, piece: WP5
[selectSquare] pieceColor: white, playerRef: white
[selectSquare] forPremove: false, isPlayerTurn: true, currentPlayer: white
[selectSquare] Player's turn - validMoves: ["e3", "e4"]
[ChessBoard] After selectSquare, validMoves: ["e3", "e4"]
[BoardRenderer] Found legal move at e3: {
  validMoves: ["e3", "e4"],
  isLegalMove: true,
  isCaptureHint: false,
  piece: null
}
```

### Step 3: Check Visual State

**What you SHOULD see**:

- ✅ Yellow highlight on e2 (selected piece)
- ✅ Small green circles at e3 and e4 (legal moves)
- ✅ Cursor changes to pointer on hover

**What you MIGHT see (BUG)**:

- ✅ Yellow highlight on e2
- ❌ NO green circles
- Cursor works fine

### Step 4: Check React DevTools

1. Install React DevTools extension if you don't have it
2. Open React DevTools
3. Search for "Square" component
4. Find the e3 or e4 Square
5. Check props:
   - `isLegalMove` should be `true`
   - `isCaptureHint` should be `false`
   - Component should have className including "legal-move"

### Step 5: Check CSS

1. Inspect the e3 or e4 square in Elements tab
2. Look for classes:
   - Should have: `square light legal-move` or `square dark legal-move`
3. Check CSS:
   - `.legal-move.light::before` should have a circular green dot
   - Check if `::before` pseudo-element is visible

---

## Diagnosis Scenarios

### Scenario A: validMoves is Empty Array []

**Problem**: `ChessEngineInstance.getValidMoves()` is not returning moves
**Fix**: Check `ChessEngine.ts` - the move generation logic is broken

### Scenario B: validMoves has values BUT Square doesn't receive them

**Problem**: State update not propagating through React
**Fix**: Check if `gameState` object is being spread correctly

### Scenario C: Square receives `isLegalMove=true` BUT no visual hint

**Problem**: CSS not applied or ::before pseudo-element hidden
**Fixes to try**:

- Check z-index conflicts
- Check if another element is covering the circles
- Check if `::before` content is empty
- Check if the circle is transparent

### Scenario D: Everything works in DevTools but not visually

**Problem**: CSS specificity or cascade issue
**Fix**: Add `!important` to CSS rules (temporary) to test

---

## Quick Fixes to Try

### Fix 1: Force CSS Update

Add to `Square.css`:

```css
.legal-move.light::before {
  background-color: rgb(202, 203, 179) !important;
  content: "" !important;
  position: absolute !important;
  width: 33.33% !important;
  height: 33.33% !important;
  border-radius: 50% !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  z-index: 10 !important;
}
```

### Fix 2: Add Inline Debug Style

In `Square.tsx`, temporarily add:

```typescript
const debugStyle = isLegalMove
  ? {
      background: "rgba(0, 255, 0, 0.3)", // Bright green overlay
    }
  : {};
```

### Fix 3: Console Log in Square Component

Add to Square.tsx:

```typescript
if (isLegalMove) {
  console.log(`Square ${squareName} is legal move!`);
}
```

---

## Expected Results After Fixes

### ✅ Success Criteria:

1. Click on e2 pawn
2. See green circles at e3 and e4 immediately (< 50ms)
3. Click on e3 circle
4. Pawn animates smoothly to e3
5. Circles disappear
6. e2-e3 highlighted in yellow (last move)

### ✅ Premove Test:

1. Wait for black's turn (after bot moves)
2. Click on your piece (e.g., d2 pawn)
3. Should see yellow selection but NO circles (correct for premoves)
4. Click d4
5. Should see RED highlight on d2 and d4 (premove queued)
6. When black moves, your premove executes automatically

---

## Files with Debug Logging

All console.log statements start with `[ComponentName]` prefix:

- `[selectSquare]` - from useGameState.ts
- `[ChessBoard]` - from ChessBoard.tsx
- `[BoardRenderer]` - from BoardRenderer.tsx

**To remove debug logs later**: Search for `console.log` and replace with `logger.debug`

---

## Next Steps After Diagnosis

Based on what you find:

### If validMoves is populated correctly:

→ Issue is in CSS or React rendering
→ Check Square.css and Square.tsx
→ Verify z-index and positioning

### If validMoves is empty:

→ Issue is in ChessEngine.getValidMoves()
→ Check piece type detection
→ Check move generation logic

### If state doesn't update:

→ Issue is in useGameState hook
→ Check if updateGameState callback fires
→ Verify React state batching

---

## Contact & Support

If you find the issue:

1. Note the console output
2. Take screenshot of DevTools
3. Document the fix in nov-25.md under "Bug #001"

**Current Status**: 🔧 Debugging in progress
**Priority**: 🔴 Critical - blocks core gameplay
**ETA**: Should be fixed today (Nov 25)

---

## Additional Resources

- **Main Review Doc**: `nov-25.md`
- **Architecture**: See ChessBoard folder structure
- **State Flow**: useGameState → ChessBoard → BoardRenderer → Square
- **CSS**: Square.css lines 192-208 (legal-move styles)

---

_Good luck debugging! The logs will tell us exactly where the issue is._ 🎯
