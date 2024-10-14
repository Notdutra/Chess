// src/App.jsx
import React from 'react';
import Square from './Square';
import ChessBoard from './ChessBoard';
import './styles/Chessboard.css';
import './styles/App.css';

function App() {
  return (
    <main>
      <div className="App">
        <h1>Chess</h1>
        <ChessBoard />
      </div>
    </main>

  );
}

export default App;