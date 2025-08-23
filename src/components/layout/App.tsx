import Chessboard from "../../components/chess/Chessboard";
import React from "react";

const App: React.FC = () => {
  return (
    <>
      <div className="view">
        {/* Flexible top spacer for future layout control (adjust h-12 as needed) */}
        <div className="w-full" style={{ height: "3rem" }}></div>
        <div className="app-container">
          <Chessboard />
        </div>
      </div>
    </>
  );
};

export default App;
