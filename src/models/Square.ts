export interface Square {
  file: number; // 0-7 (a-h)
  rank: number; // 0-7 (8-1)
}

export interface SquareUI {
  id: string; // Position like "e4"
  color: 'light' | 'dark';
  piece: string | null; // Piece ID or null
  isSelected: boolean;
  isHighlighted: boolean;
  isLegalMove: boolean;
  isCaptureHint: boolean;
}

export const getSquareColor = (
  file: number,
  rank: number
): 'light' | 'dark' => {
  return (file + rank) % 2 === 0 ? 'dark' : 'light';
};
