import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import { GameStatus, ActionType } from '../models/Game';
import { PlayerStatus } from '../models/Player';
import PlayerCard from './PlayerCard';
import ActionButtons from './ActionButtons';
import './GameScreen.css';

interface GameScreenProps {
  onBack: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ onBack }) => {
  const { currentGame, startHand, performAction, endHand } = useGameStore();
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);

  if (!currentGame) {
    return (
      <div className="game-screen">
        <div className="no-game">
          <h2>No Active Game</h2>
          <button onClick={onBack}>Create New Game</button>
        </div>
      </div>
    );
  }

  const currentPlayer = currentGame.getCurrentPlayer();
  const activePlayers = currentGame.getActivePlayers();
  const potTotal = currentGame.potManager.totalPot;
  const pots = currentGame.potManager.pots;

  const handleAction = (action: ActionType, amount?: number) => {
    try {
      performAction(currentPlayer.id, action, amount);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleStartHand = () => {
    try {
      startHand();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleEndHand = () => {
    setShowWinnerModal(true);
  };

  const selectWinners = () => {
    if (selectedWinners.length === 0) {
      alert('Please select at least one winner');
      return;
    }
    endHand(selectedWinners);
    setSelectedWinners([]);
    setShowWinnerModal(false);
  };

  const toggleWinner = (playerId: string) => {
    if (selectedWinners.includes(playerId)) {
      setSelectedWinners(selectedWinners.filter(id => id !== playerId));
    } else {
      setSelectedWinners([...selectedWinners, playerId]);
    }
  };

  return (
    <div className="game-screen">
      <div className="game-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>{currentGame.name}</h1>
        <div className="game-info">
          <span>Hand #{currentGame.handNumber}</span>
          <span>Round {currentGame.currentRound + 1}/{currentGame.totalRounds}</span>
          <span>Blinds: {currentGame.smallBlind}/{currentGame.bigBlind}</span>
        </div>
      </div>

      <div className="pot-container">
        <div className="main-pot">
          <h2>Total Pot: ${potTotal}</h2>
        </div>
        {pots.length > 1 && (
          <div className="side-pots">
            {pots.map((pot, index) => (
              <div key={pot.id} className="side-pot">
                {pot.isMain ? 'Main' : `Side ${index}`}: ${pot.amount}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="players-container">
        {currentGame.players.map(player => (
          <PlayerCard
            key={player.id}
            player={player}
            isCurrentTurn={currentGame.status === GameStatus.IN_PROGRESS && currentPlayer?.id === player.id}
          />
        ))}
      </div>

      {currentGame.status === GameStatus.IN_PROGRESS && currentPlayer && (
        <ActionButtons
          currentPlayer={currentPlayer}
          currentBet={currentGame.currentBet}
          minBet={currentGame.minBet}
          minRaise={currentGame.minRaise}
          potSize={potTotal}
          onAction={handleAction}
        />
      )}

      {currentGame.status === GameStatus.WAITING && (
        <div className="bottom-actions">
          <button className="start-hand-button" onClick={handleStartHand}>
            Start Hand
          </button>
        </div>
      )}

      {currentGame.status === GameStatus.HAND_COMPLETE && (
        <div className="bottom-actions">
          <button className="end-hand-button" onClick={handleEndHand}>
            Select Winners
          </button>
        </div>
      )}

      {showWinnerModal && (
        <div className="modal-overlay" onClick={() => setShowWinnerModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Select Winner(s)</h2>
            <div className="winner-list">
              {currentGame.getPlayersInHand().map(player => (
                <div
                  key={player.id}
                  className={`winner-option ${selectedWinners.includes(player.id) ? 'selected' : ''}`}
                  onClick={() => toggleWinner(player.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedWinners.includes(player.id)}
                    onChange={() => toggleWinner(player.id)}
                  />
                  <span>{player.name} (${player.stack + player.currentBet})</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowWinnerModal(false)}>Cancel</button>
              <button onClick={selectWinners} className="confirm-button">
                Distribute Pot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;