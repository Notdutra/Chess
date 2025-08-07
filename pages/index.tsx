import React from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Load ChessboardRefactored only on client side to avoid SSR issues
const ChessboardRefactored = dynamic(
  () => import('../src/components/ChessboardRefactored'),
  { ssr: false }
);

const HomePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Chess</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
      </Head>
      <div className="app-container">
        <h1>Refactored Chess Game</h1>
        <ChessboardRefactored />
      </div>
    </>
  );
};

export default HomePage;
