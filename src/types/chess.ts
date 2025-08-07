export type ChessTheme = {
  lightSquare: string;
  darkSquare: string;
  selected: string;
  validMove: string;
  check: string;
  lastMove: string;
};

export type ChessSoundOptions = {
  moveSound: boolean;
  captureSound: boolean;
  checkSound: boolean;
  gameEndSound: boolean;
};
