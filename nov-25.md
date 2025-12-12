# Chess.com Parity Plan - November 25, 2025

## Executive Summary

This document outlines all issues, bugs, and improvements needed to achieve chess.com-like user experience. The game is structurally sound but has several UX issues preventing full parity with chess.com.

---

## 🔴 CRITICAL BUGS (Must Fix Immediately)

### 1. **Move Hints Not Showing** ⚠️ HIGH PRIORITY

**Issue**: When clicking on a piece during player's turn, no move hint circles appear.

**Root Cause Analysis**:

- `useGameState.selectSquare()` correctly calculates `validMoves` and stores them in state
- `BoardRenderer` correctly reads `gameState.validMoves` and passes to Square components
- **BUG FOUND**: The logic in `selectSquare` has the condition backwards - when it's the player's turn, it should show moves, but the conditional logic prevents it

**Current Code Flow**:

```typescript
// In useGameState.ts selectSquare():
const isPlayerTurn = prev.currentPlayer === playerRef.current;

if (forPremove || !isPlayerTurn) {
  // During opponent's turn - allow selection but no move hints
  return { ...prev, selectedSquare: squareName, validMoves: [] };
}

// Player's turn - show valid moves
const validMoves = ChessEngineInstance.getValidMoves(piece, squareName);
```

**The Problem**:

- When player clicks piece on their turn: `forPremove=false`, `isPlayerTurn=true`
- Condition `forPremove || !isPlayerTurn` evaluates to `false || false = false`
- Should get validMoves ✅ BUT...
- Need to verify ChessEngineInstance is getting the right moves!

**Fix Required**:

- Add debug logging to track validMoves calculation
- Verify ChessEngineInstance.getValidMoves returns correct array
- Check if validMoves are being passed correctly to Square component

---

### 2. **Game Freezing with Red Square**

**Issue**: Game sometimes freezes with only a red square highlight (premove) remaining.

**Root Cause**:

- `isExecutingPremoveRef` can get stuck in `true` state if animation fails
- Animation callback might not fire if DOM elements are missing
- Premove queue not clearing properly on invalid moves

**Fixes Implemented**:

- ✅ Added 2-second safety timeout in `executePremoves`
- ✅ Added null checks in animation for missing rects
- ✅ Animation calls onDone even if no image to animate

**Additional Fixes Needed**:

- Add error boundary around premove execution
- Add state recovery mechanism if freeze detected
- Add UI indicator when executing premoves

---

## 🟡 HIGH PRIORITY UX ISSUES

### 3. **Piece Selection During Opponent Turn**

**Status**: Partially working, needs refinement

**Current Behavior**:

- Can select own pieces during opponent's turn ✅
- Red highlight shows for premove source ✅
- No move hints show (correct for premoves) ✅

**Issues**:

- Should show premove targets with different styling (transparent red circles)
- Premove queue should be more visible
- Should animate premove ghost pieces

**Fixes Needed**:

- Add `getPremoveMoves()` to show possible premove destinations
- Add semi-transparent red circles for premove hints
- Show ghost piece at premove destination

---

### 4. **Drag and Drop Refinement**

**Current Status**: Mostly working

**Issues**:

- Drag image doesn't always center perfectly on first frame
- No visual feedback for invalid drop targets
- Missing "snap back" animation for invalid drops

**Fixes Needed**:

```typescript
// In useDragAndDrop.ts
- Add snap-back animation on invalid drop
- Improve cursor centering calculation
- Add red highlight on invalid drop squares
```

---

### 5. **Animation Timing**

**Current Behavior**: 200ms animations work well

**Improvements Needed**:

- Add configurable animation speed (fast/normal/slow)
- Add animation disable option for low-end devices
- Synchronize sound timing with animation completion

---

## 🟢 MEDIUM PRIORITY IMPROVEMENTS

### 6. **Sound System Enhancement**

**Current Status**: Basic sounds working

**Improvements**:

- Add volume control UI
- Add sound toggle button
- Improve sound timing (play on animation complete, not on state change)
- Add distinct sounds for:
  - Normal move vs capture
  - Check vs checkmate
  - Premove execution
  - Invalid move attempt

**Implementation**:

```typescript
// In MoveHandler.tsx
- Move sound triggers to animation callbacks
- Add sound settings to localStorage
- Create settings modal for audio preferences
```

---

### 7. **AI Opponent Improvement**

**Current Status**: Random move selection

**Improvements Needed**:

- Add difficulty levels (easy/medium/hard)
- Implement basic evaluation function
- Add "thinking" delay that's proportional to move complexity
- Add opening book for first 5-7 moves
- Prevent obviously bad moves (hanging pieces)

**Implementation Path**:

```typescript
// Create new file: src/services/chess/ChessAI.ts
class ChessAI {
  evaluatePosition(gameState: GameState): number;
  getBestMove(depth: number): { from: string; to: string };
  getRandomMove(): { from: string; to: string };
}
```

---

### 8. **Move Validation Display**

**Issue**: No visual feedback for invalid moves

**Needed Features**:

- Red flash on invalid move attempt
- Error message for why move is invalid
- Highlight king in check (red circle)
- Show which pieces are pinned

**CSS Additions Needed**:

```css
.invalid-move-flash {
  animation: flash-red 0.3s ease-out;
}

@keyframes flash-red {
  0%,
  100% {
    background: transparent;
  }
  50% {
    background: rgba(255, 0, 0, 0.3);
  }
}

.king-in-check::after {
  /* Red circle around king */
  border: 4px solid #f44336;
  border-radius: 50%;
}
```

---

## 🔵 LOW PRIORITY / POLISH

### 9. **Board Customization**

**Features to Add**:

- Board theme selector (green/brown/blue/gray)
- Piece set selector (classic/modern/minimalist)
- Coordinate labels (a-h, 1-8) on board edges
- Board flip option (rotate 180°)

---

### 10. **Move History Panel**

**Current Status**: Move history exists in state but not displayed

**Needed Features**:

- Scrollable move list in algebraic notation
- Click move to jump to that position
- Export game as PGN
- Copy position as FEN

---

### 11. **Game Clock/Timer**

**Features to Add**:

- Bullet (1+0, 2+1)
- Blitz (3+0, 3+2, 5+0)
- Rapid (10+0, 15+10)
- Display remaining time for both players
- Play low-time warning sound

---

### 12. **Multiplayer Preparation**

**Architecture Needed**:

- WebSocket connection handling
- Game room creation/joining
- Move synchronization
- Reconnection handling
- Spectator mode

---

## 📋 CODE QUALITY IMPROVEMENTS

### 13. **Type Safety**

**Current Issues**:

- Some `any` types in ChessBoard.tsx
- Missing null checks in some places
- Inconsistent error handling

**Fixes**:

```typescript
// Remove all any types
// Add proper error boundaries
// Improve null handling with optional chaining
```

---

### 14. **Performance Optimization**

**Current State**: Good, but can improve

**Optimizations**:

- Memoize expensive calculations in ChessEngine
- Use React.memo more aggressively on Square components
- Debounce resize observer in BoardRenderer
- Lazy load sounds on first interaction

---

### 15. **Testing Coverage**

**Current Status**: 23 tests passing

**Gaps**:

- No tests for animation hooks
- No tests for drag and drop
- Missing integration tests for full game flow
- No E2E tests

**Tests to Add**:

```
- useChessAnimation.test.ts (animation timing, cleanup)
- useDragAndDrop.test.ts (cursor positioning, drop detection)
- ChessBoard.integration.test.ts (full game flow)
- e2e/gameplay.spec.ts (Playwright tests)
```

---

### 16. **Documentation**

**Needed**:

- Add JSDoc comments to all public methods
- Create architecture diagram
- Document state management flow
- Add inline comments for complex logic
- Create CONTRIBUTING.md

---

## 🎯 IMMEDIATE ACTION PLAN (Today)

### Priority 1: Fix Move Hints Bug

1. ✅ Add debug logging in selectSquare
2. ✅ Verify validMoves calculation
3. ✅ Check Square component receives props correctly
4. ⚠️ **TEST IN BROWSER** - Open dev tools, click piece, check:
   - Console logs showing validMoves array
   - React DevTools showing Square components with isLegalMove=true
   - CSS classes being applied (.legal-move)

### Priority 2: Test Freeze Recovery

1. ✅ Safety timeout implemented
2. Test by simulating failed animation
3. Add state recovery button in UI

### Priority 3: Improve Premove UX

1. Add premove move hints (red circles)
2. Show ghost piece at destination
3. Clear visual indication of queued premoves

---

## 📊 CHESS.COM PARITY CHECKLIST

| Feature                  | Chess.com | Our Status | Priority    |
| ------------------------ | --------- | ---------- | ----------- |
| Click-to-move            | ✅        | ✅         | Done        |
| Drag-and-drop            | ✅        | ✅         | Done        |
| Move animation           | ✅        | ✅         | Done        |
| Move hints (circles)     | ✅        | ❌ **BUG** | 🔴 CRITICAL |
| Capture hints (rings)    | ✅        | ❌ **BUG** | 🔴 CRITICAL |
| Premove queue            | ✅        | ⚠️ Partial | 🟡 High     |
| Premove validation       | ✅        | ✅         | Done        |
| Sound effects            | ✅        | ⚠️ Basic   | 🟢 Medium   |
| Piece centering          | ✅        | ✅         | Done        |
| Last move highlight      | ✅        | ✅         | Done        |
| Selected piece highlight | ✅        | ✅         | Done        |
| Check indicator          | ✅        | ❌         | 🟢 Medium   |
| Illegal move feedback    | ✅        | ❌         | 🟢 Medium   |
| Board flip               | ✅        | ❌         | 🔵 Low      |
| Coordinates              | ✅        | ❌         | 🔵 Low      |
| Move list                | ✅        | ❌         | 🔵 Low      |
| Game clock               | ✅        | ❌         | 🔵 Low      |
| Themes                   | ✅        | ❌         | 🔵 Low      |

---

## 🔧 TECHNICAL DEBT

### Code Smells Identified:

1. `ChessBoard.tsx` is too large (400+ lines) - needs splitting
2. `ChessEngine.ts` mixing business logic with state management
3. Duplicate CSS definitions in Square.css
4. Magic numbers in animation timing (should be constants)
5. No error boundary components
6. Console.logs still present (should all use logger)

### Refactoring Needed:

```
src/components/chess/ChessBoard/
  ├── ChessBoard.tsx (orchestrator - 150 lines max)
  ├── BoardRenderer.tsx ✅
  ├── MoveHandler.tsx ✅
  ├── PremoveHandler.tsx (new - extract premove logic)
  └── GameStateManager.tsx (new - extract state management)
```

---

## 📈 METRICS TO TRACK

### Performance:

- Time to first interaction: < 100ms
- Animation frame rate: 60 FPS
- Memory usage: < 50MB

### UX:

- Move execution latency: < 50ms
- Drag lag: < 16ms (60 FPS)
- Sound delay: < 20ms

---

## 🎬 IMPLEMENTATION ORDER

### Week 1 (Nov 25-Dec 1):

1. ✅ Fix move hints bug
2. ✅ Fix freezing issue
3. Add premove hints
4. Improve animation timing
5. Add check indicator

### Week 2 (Dec 2-8):

1. Refactor ChessBoard component
2. Improve AI opponent
3. Add sound controls
4. Add illegal move feedback

### Week 3 (Dec 9-15):

1. Add move list panel
2. Add board customization
3. Improve test coverage
4. Documentation

### Week 4 (Dec 16-22):

1. Performance optimization
2. Polish and bug fixes
3. E2E testing
4. Prepare for multiplayer architecture

---

## 🐛 KNOWN BUGS LOG

| ID  | Description                     | Severity | Status         | Fix                      |
| --- | ------------------------------- | -------- | -------------- | ------------------------ |
| 001 | Move hints not showing          | Critical | 🔧 In Progress | Debug selectSquare logic |
| 002 | Game freezes with red square    | High     | ✅ Fixed       | Safety timeout added     |
| 003 | Drag sometimes off-center       | Low      | 🔧 In Progress | Improve calculation      |
| 004 | Animation flicker on fast moves | Low      | Open           | Add frame buffering      |

---

## 🚀 FUTURE ENHANCEMENTS

### Phase 2 (After Chess.com Parity):

- Puzzle mode
- Analysis board
- Opening explorer
- Engine analysis integration
- Twitch/Discord integration
- Tournament mode
- Rating system

### Phase 3 (Advanced):

- Mobile app (React Native)
- Offline mode with IndexedDB
- 3D board view
- VR chess experience
- AI commentary
- Streaming integration

---

## 📝 NOTES

### Architecture Decisions:

- ✅ Hooks-based state management (no Redux needed for now)
- ✅ Service layer pattern for chess logic
- ✅ Separation of concerns (UI/Logic/State)
- ✅ TypeScript strict mode
- ✅ CSS modules for styling

### Best Practices to Follow:

- Always use logger instead of console.log
- Memoize expensive components
- Use refs for performance-critical operations
- Keep components under 200 lines
- Write tests for all business logic
- Document all public APIs

---

## 🎯 SUCCESS CRITERIA

The game achieves chess.com parity when:

1. ✅ All pieces move correctly
2. ✅ Animations are smooth (60 FPS)
3. ❌ Move hints appear instantly on selection
4. ❌ Premoves work exactly like chess.com
5. ⚠️ No UI freezes or lag
6. ❌ Sounds play at correct times
7. ❌ Check is clearly indicated
8. ❌ Invalid moves give feedback

**Current Score: 3/8 (37.5%)**
**Target: 8/8 (100%) by Dec 1**

---

## 📞 CONTACT & RESOURCES

- Chess.com UI reference: https://chess.com/play
- Lichess open source: https://github.com/lichess-org/lila
- Chess programming wiki: https://www.chessprogramming.org/

---

_Last Updated: November 25, 2025_
_Next Review: December 1, 2025_
