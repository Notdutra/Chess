import './Square.css';
import Piece from './Piece';

function Square({ squareName, color, piece, onClick, isSelected, isHighlighted, isLegalMove, isCaptureHint }) {
    const className = `${color} square ${isSelected ? 'highlight' : ''} ${isLegalMove ? 'legal-move' : ''} ${isCaptureHint ? 'capture-hint' : ''}`;
    return (
        <div id={squareName} className={className} onClick={onClick}>
            <Piece piece={piece} />
        </div>
    );
}

export default Square;