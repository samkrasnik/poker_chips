import React, { useState } from 'react';
import { Player, PlayerStatus } from '../models/Player';
import useGameStore from '../store/gameStore';
import { GameStatus } from '../models/Game';
import './PlayerCard.css';

interface PlayerCardProps {
  player: Player;
  isCurrentTurn: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, isCurrentTurn }) => {
  const { currentGame, editPlayerStack, rebuyPlayer } = useGameStore();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmount, setEditAmount] = useState(player.stack.toString());
  const [rebuyAmount, setRebuyAmount] = useState('1000');
  const getBadges = () => {
    const badges = [];
    if (player.isDealer) badges.push('D');
    if (player.isSmallBlind) badges.push('SB');
    if (player.isBigBlind) badges.push('BB');
    return badges;
  };

  const getStatusClass = () => {
    switch (player.status) {
      case PlayerStatus.FOLDED:
        return 'folded';
      case PlayerStatus.ALL_IN:
        return 'all-in';
      case PlayerStatus.ELIMINATED:
        return 'eliminated';
      default:
        return 'active';
    }
  };

  const getLastAction = () => {
    if (player.actionHistory.length === 0) return null;
    const lastAction = player.actionHistory[player.actionHistory.length - 1];
    return lastAction.action.replace('_', ' ');
  };

  const handleEditStack = () => {
    const amount = parseInt(editAmount);
    if (!isNaN(amount) && amount >= 0) {
      editPlayerStack(player.id, amount);
      setShowEditModal(false);
    }
  };

  const handleRebuy = () => {
    const amount = parseInt(rebuyAmount);
    if (!isNaN(amount) && amount > 0) {
      rebuyPlayer(player.id, amount);
      setShowEditModal(false);
    }
  };

  const canEdit = currentGame?.status !== GameStatus.IN_PROGRESS;

  return (
    <>
      <div 
        className={`player-card ${getStatusClass()} ${isCurrentTurn ? 'current-turn' : ''} ${canEdit ? 'clickable' : ''}`}
        onClick={() => canEdit && setShowEditModal(true)}
      >
        <div className="player-header">
          <span className="player-name">{player.name}</span>
          <div className="player-badges">
            {getBadges().map(badge => (
              <span key={badge} className="badge">{badge}</span>
            ))}
            {canEdit && <span className="edit-icon">✏️</span>}
          </div>
        </div>
        
        <div className="player-info">
          <div className="stack-info">
            <span className="label">Stack:</span>
            <span className="value">${player.stack}</span>
          </div>
          
          {player.currentBet > 0 && (
            <div className="bet-info">
              <span className="label">Bet:</span>
              <span className="value">${player.currentBet}</span>
            </div>
          )}
          
          <div className="status-info">
            <span className="label">Status:</span>
            <span className="value">{player.status.toUpperCase()}</span>
          </div>
          
          {getLastAction() && (
            <div className="last-action">
              <span className="label">Last:</span>
              <span className="value">{getLastAction()}</span>
            </div>
          )}
        </div>
        
        {isCurrentTurn && (
          <div className="current-indicator">
            TO ACT
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Edit {player.name}'s Stack</h3>
            
            <div className="edit-section">
              <label>Set Stack To:</label>
              <input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                placeholder="Enter amount"
                autoFocus
              />
              <button onClick={handleEditStack} className="confirm">Set Stack</button>
            </div>

            {player.status === PlayerStatus.ELIMINATED && (
              <div className="edit-section">
                <label>Or Rebuy/Add-on:</label>
                <input
                  type="number"
                  value={rebuyAmount}
                  onChange={e => setRebuyAmount(e.target.value)}
                  placeholder="Enter rebuy amount"
                />
                <button onClick={handleRebuy} className="confirm">Add Chips</button>
              </div>
            )}

            {player.status !== PlayerStatus.ELIMINATED && (
              <div className="edit-section">
                <label>Add-on Amount:</label>
                <input
                  type="number"
                  value={rebuyAmount}
                  onChange={e => setRebuyAmount(e.target.value)}
                  placeholder="Enter add-on amount"
                />
                <button onClick={handleRebuy} className="confirm">Add Chips</button>
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerCard;