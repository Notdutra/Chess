import '@/components/chess/Chessboard.css';
import '@/components/chess/Piece.css';
import '@/components/chess/Square.css';
import '@/styles/App.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
