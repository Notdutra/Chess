# Chess Game

This project is a chess game built with React, Vite, and ESLint. The game features full gameplay, including check, checkmate, stalemate, and piece promotion, along with ongoing development for castling, sounds, and other features.

## Features

- **Full gameplay** with check, checkmate, and stalemate detection.
- **Piece promotion** (currently only to Queen, but plans to add a popup for other pieces).
- **Move validation** and proper piece behavior.
- **Endgame screen** (still in progress).
- **Sound effects** for piece movement and capture (to be added).
- **Future updates** planned, including castling, en passant, and drag-and-drop piece movement.

## Technologies Used

- **React** for frontend development.
- **Vite** for fast and efficient bundling.
- **ESLint** for maintaining code quality and consistency.
- **JavaScript** for the logic and interactivity.

## Roadmap

The following features are planned for future updates:

- **Implement Castling Logic**  
  This will allow players to perform castling moves, where the king and a rook can move simultaneously, given certain conditions. This is a key chess rule that will be added to complete the game's gameplay mechanics.

- **Add Drag-and-Drop Functionality for Piece Movement**  
  This feature will enable players to move their pieces by dragging them on the board, providing a more intuitive and interactive experience compared to click-to-move.

- **Create Piece Promotion Popup (for different pieces)**  
  Currently, pieces can only be promoted to a queen. This update will introduce a popup during promotion that allows players to choose between a queen, rook, bishop, or knight.

- **Add Sound Effects for Piece Movement and Capture**  
  To enhance the gaming experience, sound effects will be added for actions such as moving a piece and capturing an opponent's piece. This will make the game feel more dynamic and immersive.

- **Implement En Passant Capture for Pawns**  
  En passant is a special pawn capture rule. This feature will allow pawns to capture an opponent’s pawn that has just moved two squares forward, as long as the capture happens immediately after the move.

- **Implement Endgame Screen**  
  When the game ends, an endgame screen will display the result, whether it's checkmate, stalemate, or a draw. This screen will offer options for players to restart the game or exit.

## Setup

To run this project locally:

1. **Clone the repository:**

   ```bash
   git clone https://github.com/notdutra/Chess-game.git

   ```

2. **Navigate into the project directory:**

   ```bash
   cd Chess-game

   ```

3. **Install the dependencies:**

   ```bash
   npm install
   ```

4. **Run the development server:**

   ```bash
    npm run dev
   ```

5. **Open the project in your browser:**

   ```bash
    http://localhost:3000
   ```

## Contributing

I welcome contributions to improve the Chess Game project! Whether you're fixing bugs, adding new features, or enhancing documentation, your contributions are appreciated.

### How to Contribute

1. **Fork the repository**  
   Start by forking the repository to your own GitHub account. This creates a copy of the project where you can make changes without affecting the main codebase.

2. **Clone your fork**  
   Clone your forked repository to your local machine:

   ```bash
   git clone https://github.com/your-username/Chess-game.git
   ```

3. **Create a new branch**
   Create a new branch for your changes:

   ```bash
   git checkout -b feature/your-feature-name
   ```

   Replace `your-feature-name` with a descriptive name for your feature or fix.

4. **Make your changes**
   Make your changes to the codebase. You can test your changes by running the development server:

   ```bash
   npm run dev
   ```

5. **Commit your changes**
   Once you're happy with your changes, commit them with a descriptive commit message:

   ```bash
   git add .
   git commit -m "Add feature: your feature description"
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   Push your changes to your fork on GitHub and open a Pull Request in the main repository. Provide a detailed description of your changes and the problem you're solving.

7. **Discuss and Review**
   Once your Pull Request is open, it will be reviewed by me. You may need to make additional changes or address feedback before your changes are accepted.

# Code of Conduct

## Introduction

As the sole maintainer of this project, I am committed to providing a welcoming and inclusive environment for everyone who contributes to the Chess game project. This code of conduct outlines my expectations for all participants in the project to ensure a respectful and productive space for everyone.

## How I Expect You to Act

I expect all participants to follow these principles when engaging with the project:

- **Be respectful**: Treat others with kindness and respect, even when disagreements arise.
- **Be considerate**: Understand that everyone may have different perspectives and backgrounds.
- **Be collaborative**: Aim for cooperation and working together to improve the project.
- **Be mindful of others**: Ensure your interactions are inclusive, and avoid language or behavior that could make others feel uncomfortable or unwelcome.

## What to Do if You Witness or Experience Unacceptable Behavior

If you experience or witness any behavior that violates this code of conduct, please report it to me directly. I will take appropriate steps to address the issue and ensure that the project remains a welcoming space for all participants.

## Consequences of Unacceptable Behavior

If a participant engages in unacceptable behavior, I will take the necessary actions to address it. This could range from a warning to being temporarily or permanently banned from contributing to the project, depending on the severity of the situation.

## Conclusion

By contributing to the Chess game project, I expect everyone to engage respectfully and thoughtfully. Let's work together to create a positive and welcoming environment for all.
