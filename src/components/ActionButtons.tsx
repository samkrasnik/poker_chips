import React, { useState } from 'react';
import { ActionType } from '../models/Game';
import { Player } from '../models/Player';
import './ActionButtons.css';

interface ActionButtonsProps {
  currentPlayer: Player;
  currentBet: number;
  minBet: number;
  minRaise: number;
  potSize: number;
  onAction: (action: ActionType, amount?: number) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  currentPlayer,
  currentBet,
  minBet,
  minRaise,
  potSize,
  onAction
}) => {
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState('');
  const [showBetModal, setShowBetModal] = useState(false);
  const [betAmount, setBetAmount] = useState('');

  const canCheck = currentBet === 0 || currentPlayer.currentBet >= currentBet;
  const canCall = currentBet > currentPlayer.currentBet && currentPlayer.stack > 0;
  const canBet = currentBet === 0 && currentPlayer.stack > 0;
  const canRaise = currentBet > 0 && currentPlayer.stack > (currentBet - currentPlayer.currentBet);
  const callAmount = Math.min(currentBet - currentPlayer.currentBet, currentPlayer.stack);

  const handleBet = () => {
    const amount = parseInt(betAmount);
    if (amount >= minBet && amount <= currentPlayer.stack) {
      onAction(ActionType.BET, amount);
      setShowBetModal(false);
      setBetAmount('');
    } else {
      alert(`Bet must be between ${minBet} and ${currentPlayer.stack}`);
    }
  };

  const handleRaise = () => {
    const amount = parseInt(raiseAmount);
    if (amount >= currentBet + minRaise && amount <= currentPlayer.stack + currentPlayer.currentBet) {
      onAction(ActionType.RAISE, amount);
      setShowRaiseModal(false);
      setRaiseAmount('');
    } else {
      alert(`Raise must be between ${currentBet + minRaise} and ${currentPlayer.stack + currentPlayer.currentBet}`);
    }
  };

  const QuickBetButton: React.FC<{ multiplier: number; label: string }> = ({ multiplier, label }) => {
    const amount = Math.floor(potSize * multiplier);
    const isValid = canBet ? amount >= minBet && amount <= currentPlayer.stack : 
                   amount >= currentBet + minRaise && amount <= currentPlayer.stack + currentPlayer.currentBet;
    
    return (
      <button
        className={`quick-bet-button ${!isValid ? 'disabled' : ''}`}
        onClick={() => {
          if (!isValid) return;
          if (canBet) {
            setBetAmount(amount.toString());
          } else {
            setRaiseAmount(amount.toString());
          }
        }}
        disabled={!isValid}
      >
        <span className="quick-bet-label">{label}</span>
        <span className="quick-bet-amount">${amount}</span>
      </button>
    );
  };

  return (
    <div className="action-buttons">
      <div className="info-row">
        <span>Pot: ${potSize}</span>
        <span>To Call: ${callAmount}</span>
        <span>Stack: ${currentPlayer.stack}</span>
      </div>

      <div className="button-row">
        {canCheck && (
          <button className="action-button check" onClick={() => onAction(ActionType.CHECK)}>
            CHECK
          </button>
        )}

        {canCall && (
          <button className="action-button call" onClick={() => onAction(ActionType.CALL)}>
            <span>CALL</span>
            <span className="amount">${callAmount}</span>
          </button>
        )}

        {canBet && (
          <button className="action-button bet" onClick={() => setShowBetModal(true)}>
            BET
          </button>
        )}

        {canRaise && (
          <button className="action-button raise" onClick={() => setShowRaiseModal(true)}>
            RAISE
          </button>
        )}

        <button className="action-button fold" onClick={() => onAction(ActionType.FOLD)}>
          FOLD
        </button>
      </div>

      <button 
        className="action-button all-in" 
        onClick={() => onAction(ActionType.ALL_IN)}
        disabled={currentPlayer.stack === 0}
      >
        <span>ALL IN</span>
        <span className="amount">${currentPlayer.stack}</span>
      </button>

      {showBetModal && (
        <div className="modal-overlay" onClick={() => setShowBetModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Enter Bet Amount</h3>
            
            <div className="quick-bets">
              <QuickBetButton multiplier={0.33} label="1/3" />
              <QuickBetButton multiplier={0.5} label="1/2" />
              <QuickBetButton multiplier={0.75} label="3/4" />
              <QuickBetButton multiplier={1} label="POT" />
            </div>

            <input
              type="number"
              value={betAmount}
              onChange={e => setBetAmount(e.target.value)}
              placeholder={`Min: ${minBet}, Max: ${currentPlayer.stack}`}
              autoFocus
            />

            <div className="modal-actions">
              <button onClick={() => setShowBetModal(false)}>Cancel</button>
              <button onClick={handleBet} className="confirm">Bet</button>
            </div>
          </div>
        </div>
      )}

      {showRaiseModal && (
        <div className="modal-overlay" onClick={() => setShowRaiseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Enter Raise Amount</h3>
            
            <div className="quick-bets">
              <QuickBetButton multiplier={0.5} label="1/2" />
              <QuickBetButton multiplier={0.75} label="3/4" />
              <QuickBetButton multiplier={1} label="POT" />
              <QuickBetButton multiplier={1.5} label="1.5x" />
            </div>

            <input
              type="number"
              value={raiseAmount}
              onChange={e => setRaiseAmount(e.target.value)}
              placeholder={`Min: ${currentBet + minRaise}, Max: ${currentPlayer.stack + currentPlayer.currentBet}`}
              autoFocus
            />

            <div className="modal-actions">
              <button onClick={() => setShowRaiseModal(false)}>Cancel</button>
              <button onClick={handleRaise} className="confirm">Raise</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;