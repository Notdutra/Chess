# Chess Game

This project is a modern chess game built with Next.js, React, TypeScript, pnpm, and ESLint. It features full chess gameplay, including check, checkmate, stalemate, piece promotion, and AI opponent powered by chess-api.com.

## Features

- **Full gameplay**: Check, checkmate, stalemate, and complete move validation.
- **AI Opponent**: Play against a remote chess engine powered by chess-api.com with Stockfish 17 NNUE.
- **Smart Bot Logic**: Bot automatically determines its color based on your first move.
- **Piece promotion**: Choose which piece to promote to (coming soon: popup for all options).
- **Drag-and-drop**: Move pieces intuitively with drag-and-drop interface.
- **Sound effects**: Audio feedback for moves, captures, check, and game end.
- **Loading indicators**: Visual feedback while the bot calculates its move.
- **Error handling**: Graceful handling of API errors with automatic reconnection.
- **Responsive design**: Works seamlessly on desktop and mobile devices.
- **Configurable AI**: Adjust bot strength and behavior via environment variables.

## Bot Integration

The chess bot is powered by **chess-api.com**, providing access to Stockfish 17 NNUE calculation power with up to 80 MNPS performance.

### Bot Features:

- **Remote Engine**: No local CPU usage for chess calculations
- **Configurable Strength**: Adjust search depth (1-18) for different difficulty levels
- **Real-time Analysis**: Progressive move evaluation via WebSocket connection
- **Automatic Reconnection**: Handles network issues gracefully with retry logic
- **Smart Color Detection**: Bot plays opposite color of your first move

### Configuration

Bot behavior can be customized via environment variables in `.env.local`:

```bash
# Chess API Configuration
NEXT_PUBLIC_CHESS_API_URL=wss://chess-api.com/v1
NEXT_PUBLIC_CHESS_API_DEPTH=12                    # 1-18 (12 ≈ 2350 elo)
NEXT_PUBLIC_CHESS_API_VARIANTS=1                  # 1-5 variant lines
NEXT_PUBLIC_CHESS_API_MAX_THINKING_TIME=50        # 1-100 milliseconds
NEXT_PUBLIC_CHESS_API_MAX_RECONNECTS=3            # Retry attempts
```

### Strength Levels:

- **Depth 12**: ~2350 FIDE elo (International Master level)
- **Depth 18**: ~2750 FIDE elo (Grandmaster level)
- **Depth 20**: ~2850 FIDE elo (Super-GM level)

## Technologies Used

- **Next.js** – Full-stack React framework for SSR, static export, and routing.
- **React** – UI library for building interactive interfaces.
- **TypeScript** – Type safety and better developer experience.
- **pnpm** – Fast, efficient package management.
- **ESLint** – Code quality and consistency.
- **chess-api.com** – Remote Stockfish 17 NNUE engine for AI opponent.

## Architecture

### Bot Logic Flow:

1. **Move Detection**: After user makes a move, bot color is determined
2. **FEN Generation**: Current board position converted to FEN notation
3. **API Request**: Position sent to chess-api.com via WebSocket
4. **Move Calculation**: Stockfish evaluates position at configured depth
5. **Response Parsing**: Best move received in long algebraic notation (LAN)
6. **Move Execution**: Bot's move applied to board with sound effects
7. **Error Handling**: Connection issues handled with automatic retry logic

### Fallback Strategy:

- **Automatic Reconnection**: Up to 3 retry attempts with exponential backoff
- **User Notification**: Clear feedback when API is unavailable
- **Graceful Degradation**: Game continues in human-vs-human mode if API fails
- **Future Enhancement**: Local Stockfish fallback (planned)

## Roadmap

- **Enhanced AI Features**:
  - ✅ Remote engine integration via chess-api.com
  - ✅ Configurable bot strength and behavior
  - ✅ Smart color detection and loading indicators
  - ⏳ Local Stockfish fallback for offline play
  - ⏳ Multiple AI personality modes

- **Game Features**:
  - **Castling logic** (implemented in engine)
  - **Piece promotion popup** (enhanced UI)
  - **En passant** (implemented in engine)
  - **Enhanced endgame screen**
  - **Move history and analysis**

- **Multiplayer & Social**:
  - **Online multiplayer** (planned)
  - **User accounts and authentication**
  - **Game analysis and review**
  - **Rating system**

- **UI/UX Improvements**:
  - **Better accessibility**
  - **Smooth animations**
  - **Themes and customization**
  - **Mobile optimizations**

## Setup

To run this project locally:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/notdutra/Chess-game.git
   cd Chess-game
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Configure environment (optional):**
   Create a `.env.local` file to customize bot behavior:

   ```bash
   cp .env.local.example .env.local
   # Edit values as needed
   ```

4. **Run the development server:**

   ```bash
   pnpm run dev
   ```

5. **Open the app:**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Playing Against the Bot

1. **Start a new game** - the game defaults to AI mode
2. **Make your first move** - the bot will automatically play the opposite color
3. **Watch the "Bot is thinking..." indicator** while it calculates
4. **The bot will respond** automatically after each of your moves

### Troubleshooting

**Bot not responding:**

- Check browser console for WebSocket connection errors
- Verify internet connection (bot requires chess-api.com access)
- Try refreshing the page to reconnect

**Performance issues:**

- Lower `NEXT_PUBLIC_CHESS_API_DEPTH` in `.env.local` for faster responses
- Increase `NEXT_PUBLIC_CHESS_API_MAX_THINKING_TIME` for stronger play

## Environment Variables

| Variable                                  | Default                  | Description                            |
| ----------------------------------------- | ------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_CHESS_API_URL`               | `wss://chess-api.com/v1` | WebSocket endpoint for chess API       |
| `NEXT_PUBLIC_CHESS_API_DEPTH`             | `12`                     | Search depth (1-18, higher = stronger) |
| `NEXT_PUBLIC_CHESS_API_VARIANTS`          | `1`                      | Number of variant lines (1-5)          |
| `NEXT_PUBLIC_CHESS_API_MAX_THINKING_TIME` | `50`                     | Max thinking time in ms (1-100)        |
| `NEXT_PUBLIC_CHESS_API_MAX_RECONNECTS`    | `3`                      | Max reconnection attempts              |

## Deployment

This app is ready for deployment on [Vercel](https://vercel.com/):

- **Build Command:** `pnpm run build` or `next build`
- **Install Command:** `pnpm install`
- **Output Directory:** (leave blank for Next.js default)

## Contributing

Contributions are welcome! Whether you’re fixing bugs, adding features, or improving documentation, your help is appreciated.

### How to Contribute

1. **Fork the repository**
2. **Clone your fork**
3. **Create a new branch**
4. **Make your changes**
5. **Commit and push**
6. **Open a Pull Request**
7. **Discuss and review**

## Code of Conduct

All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md) to ensure a welcoming and respectful environment.
