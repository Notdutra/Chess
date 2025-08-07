import './App.css';
import ChessboardRefactored from './components/ChessboardRefactored';
import React from 'react';

const App: React.FC = () => {
  return (
    <>
      <div className="app-container">
        <h1>Refactored Chess Game</h1>
        <ChessboardRefactored />
      </div>
    </>
  );
};

export default App;
