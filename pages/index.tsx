import dynamic from 'next/dynamic';

const ChessApp = dynamic(() => import('@/components/layout/App'), {
  ssr: false,
});

export default function HomePage() {
  return <ChessApp />;
}
