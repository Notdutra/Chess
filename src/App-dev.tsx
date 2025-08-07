import './App.css';
import ChessboardRefactored from './components/ChessboardRefactored';
import React from 'react';

const AppDev: React.FC = () => {
  return (
    <>
      <div className="app-container">
        <h1>Chess Game (Refactored)</h1>
        <ChessboardRefactored />
      </div>
    </>
  );
};

export default AppDev;
