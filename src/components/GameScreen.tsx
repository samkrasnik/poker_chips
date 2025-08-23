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
  const { currentGame, startHand, performAction, endHand, endHandWithPots } = useGameStore();
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [potWinners, setPotWinners] = useState<{ [potId: string]: string[] }>({});

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
    // Force creation of pots before showing modal
    if (currentGame.potManager.pots.length === 0) {
      currentGame.potManager.createSidePots(currentGame.players);
    }
    
    // Initialize pot winners for each pot
    const initialPotWinners: { [potId: string]: string[] } = {};
    const currentPots = currentGame.potManager.pots;
    
    if (currentPots.length > 0) {
      currentPots.forEach(pot => {
        initialPotWinners[pot.id] = [];
      });
    } else {
      // Fallback - should not happen now
      initialPotWinners['default'] = [];
    }
    setPotWinners(initialPotWinners);
    setShowWinnerModal(true);
  };

  const selectWinners = () => {
    // Check if at least one pot has winners
    const hasWinners = Object.values(potWinners).some(winners => winners.length > 0);
    if (!hasWinners) {
      alert('Please select at least one winner for at least one pot');
      return;
    }
    
    // Pass the pot-specific winners to endHandWithPots
    endHandWithPots(potWinners);
    setPotWinners({});
    setShowWinnerModal(false);
  };

  const toggleWinnerForPot = (potId: string, playerId: string) => {
    setPotWinners(prev => {
      const currentWinners = prev[potId] || [];
      const newWinners = currentWinners.includes(playerId)
        ? currentWinners.filter(id => id !== playerId)
        : [...currentWinners, playerId];
      
      return {
        ...prev,
        [potId]: newWinners
      };
    });
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
        {currentGame.status === GameStatus.IN_PROGRESS && (
          <div className="betting-round-indicator">
            <span className="round-label">BETTING ROUND</span>
            <span className="round-number">{currentGame.currentRound + 1}</span>
            <span className="round-name">
              {currentGame.currentRound === 0 && '(Pre-flop)'}
              {currentGame.currentRound === 1 && '(Flop)'}
              {currentGame.currentRound === 2 && '(Turn)'}
              {currentGame.currentRound === 3 && '(River)'}
            </span>
          </div>
        )}
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
          <div className="modal-content winner-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Select Winners for Each Pot</h2>
            
            {currentGame.potManager.pots.length > 1 ? (
              // Multiple pots - show each separately
              <div className="pots-list">
                {currentGame.potManager.pots.map((pot, index) => {
                  const eligiblePlayers = currentGame.players.filter(p => 
                    pot.eligiblePlayers.includes(p.id) && 
                    p.status !== PlayerStatus.FOLDED
                  );
                  
                  return (
                    <div key={pot.id} className="pot-section">
                      <h3>
                        {pot.isMain ? 'Main Pot' : `Side Pot ${index}`}: ${pot.amount}
                      </h3>
                      <div className="eligible-note">
                        Eligible: {eligiblePlayers.map(p => p.name).join(', ')}
                      </div>
                      <div className="winner-list">
                        {eligiblePlayers.map(player => (
                          <div
                            key={player.id}
                            className={`winner-option ${(potWinners[pot.id] || []).includes(player.id) ? 'selected' : ''}`}
                            onClick={() => toggleWinnerForPot(pot.id, player.id)}
                          >
                            <input
                              type="checkbox"
                              checked={(potWinners[pot.id] || []).includes(player.id)}
                              onChange={() => toggleWinnerForPot(pot.id, player.id)}
                            />
                            <span>{player.name} (Stack: ${player.stack})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Single pot - simpler display
              <div className="pot-section">
                <h3>Pot: ${currentGame.potManager.pots[0]?.amount || potTotal}</h3>
                <div className="winner-list">
                  {currentGame.getPlayersInHand().map(player => (
                    <div
                      key={player.id}
                      className={`winner-option ${(potWinners[currentGame.potManager.pots[0]?.id || 'default'] || []).includes(player.id) ? 'selected' : ''}`}
                      onClick={() => toggleWinnerForPot(currentGame.potManager.pots[0]?.id || 'default', player.id)}
                    >
                      <input
                        type="checkbox"
                        checked={(potWinners[currentGame.potManager.pots[0]?.id || 'default'] || []).includes(player.id)}
                        onChange={() => toggleWinnerForPot(currentGame.potManager.pots[0]?.id || 'default', player.id)}
                      />
                      <span>{player.name} (Stack: ${player.stack})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="modal-actions">
              <button onClick={() => setShowWinnerModal(false)}>Cancel</button>
              <button onClick={selectWinners} className="confirm-button">
                Distribute Pots
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameScreen;