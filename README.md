# Chess Game

This project is a modern chess game built with Next.js, React, TypeScript, pnpm, and ESLint. It features full chess gameplay, including check, checkmate, stalemate, piece promotion, and more. The app is designed for extensibility, performance, and a great user experience.

## Features

- **Full gameplay**: Check, checkmate, stalemate, and move validation.
- **Piece promotion**: Choose which piece to promote to (coming soon: popup for all options).
- **Drag-and-drop**: Move pieces intuitively with drag-and-drop.
- **Sound effects**: Audio feedback for moves and captures.
- **Endgame screen**: Displays result and options to restart (in progress).
- **Bot play**: Play against a chess engine (integration in progress).
- **Multiplayer (planned)**: Play against friends online (planned).
- **Responsive design**: Works on desktop and mobile.

## Technologies Used

- **Next.js** – Full-stack React framework for SSR, static export, and routing.
- **React** – UI library for building interactive interfaces.
- **TypeScript** – Type safety and better developer experience.
- **pnpm** – Fast, efficient package management.
- **ESLint** – Code quality and consistency.

## Roadmap

- **Castling logic**
- **Piece promotion popup**
- **En passant**
- **Enhanced endgame screen**
- **Multiplayer support**
- **Bot integration with chess-api.com**
- **User accounts and authentication**
- **Improved accessibility and animations**

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
3. **Run the development server:**
   ```bash
   pnpm run dev
   ```
4. **Open the app:**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

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
