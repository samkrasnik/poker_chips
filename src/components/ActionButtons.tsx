import React, { useState } from 'react';
import { ActionType, BettingLimit } from '../models/Game';
import { Player } from '../models/Player';
import './ActionButtons.css';

interface ActionButtonsProps {
  currentPlayer: Player;
  currentBet: number;
  minBet: number;
  minRaise: number;
  potSize: number;
  bettingLimit: BettingLimit;
  onAction: (action: ActionType, amount?: number) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  currentPlayer,
  currentBet,
  minBet,
  minRaise,
  potSize,
  bettingLimit,
  onAction
}) => {
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [raiseAmount, setRaiseAmount] = useState('');
  const [showBetModal, setShowBetModal] = useState(false);
  const [betAmount, setBetAmount] = useState('');

  const canCheck = currentBet === 0 || currentPlayer.currentBet >= currentBet;
  const canCall = currentBet > currentPlayer.currentBet && currentPlayer.stack > 0;
  const canBet = currentBet === 0 && currentPlayer.stack >= Math.min(minBet, currentPlayer.stack);
  const canRaise = currentBet > 0 && currentPlayer.stack > (currentBet - currentPlayer.currentBet);
  const callAmount = Math.min(currentBet - currentPlayer.currentBet, currentPlayer.stack);
  
  // Adjust minBet if player doesn't have enough chips (they would go all-in instead)
  const effectiveMinBet = Math.min(minBet, currentPlayer.stack);

  const handleBet = () => {
    const amount = parseInt(betAmount);
    let maxBet = currentPlayer.stack;
    const actualMinBet = Math.min(minBet, currentPlayer.stack);
    
    // In pot limit, max bet is pot size
    if (bettingLimit === BettingLimit.POT_LIMIT) {
      maxBet = Math.min(potSize, currentPlayer.stack);
    } else if (bettingLimit === BettingLimit.FIXED_LIMIT) {
      // In fixed limit, bet is exactly minBet (or all-in if stack is less)
      maxBet = Math.min(minBet, currentPlayer.stack);
    }
    
    if (amount >= actualMinBet && amount <= maxBet) {
      onAction(ActionType.BET, amount);
      setShowBetModal(false);
      setBetAmount('');
    } else {
      alert(`Bet must be between ${actualMinBet} and ${maxBet}`);
    }
  };

  const handleRaise = () => {
    const amount = parseInt(raiseAmount);
    let maxRaise = currentPlayer.stack + currentPlayer.currentBet;
    // If player can't meet minimum raise, they must go all-in
    const actualMinRaise = Math.min(minRaise, currentPlayer.stack - (currentBet - currentPlayer.currentBet));
    const minRaiseAmount = Math.min(currentBet + actualMinRaise, currentPlayer.stack + currentPlayer.currentBet);
    
    // Calculate max raise based on betting limit
    if (bettingLimit === BettingLimit.POT_LIMIT) {
      // In pot limit, max raise is pot size after calling
      const potAfterCall = potSize + (currentBet - currentPlayer.currentBet);
      maxRaise = Math.min(currentBet + potAfterCall, currentPlayer.stack + currentPlayer.currentBet);
    } else if (bettingLimit === BettingLimit.FIXED_LIMIT) {
      // In fixed limit, raise is exactly minRaise (or all-in if less)
      maxRaise = Math.min(currentBet + minRaise, currentPlayer.stack + currentPlayer.currentBet);
    }
    
    if (amount >= minRaiseAmount && amount <= maxRaise) {
      onAction(ActionType.RAISE, amount);
      setShowRaiseModal(false);
      setRaiseAmount('');
    } else {
      alert(`Raise must be between ${minRaiseAmount} and ${maxRaise}`);
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

      {bettingLimit !== BettingLimit.FIXED_LIMIT && (
        <button 
          className="action-button all-in" 
          onClick={() => onAction(ActionType.ALL_IN)}
          disabled={currentPlayer.stack === 0}
        >
          <span>ALL IN</span>
          <span className="amount">${currentPlayer.stack}</span>
        </button>
      )}

      {showBetModal && (
        <div className="modal-overlay" onClick={() => setShowBetModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Enter Bet Amount</h3>
            
            {bettingLimit === BettingLimit.FIXED_LIMIT ? (
              <div className="fixed-limit-info">
                <p>Fixed Limit: Bet will be ${minBet}</p>
              </div>
            ) : (
              <>
                <div className="quick-bets">
                  <QuickBetButton multiplier={0.33} label="1/3" />
                  <QuickBetButton multiplier={0.5} label="1/2" />
                  <QuickBetButton multiplier={0.75} label="3/4" />
                  {bettingLimit === BettingLimit.POT_LIMIT ? (
                    <QuickBetButton multiplier={1} label="POT" />
                  ) : (
                    <QuickBetButton multiplier={1} label="POT" />
                  )}
                </div>

                <input
                  type="number"
                  value={betAmount}
                  onChange={e => setBetAmount(e.target.value)}
                  placeholder={`Min: ${Math.min(minBet, currentPlayer.stack)}, Max: ${bettingLimit === BettingLimit.POT_LIMIT ? Math.min(potSize, currentPlayer.stack) : currentPlayer.stack}`}
                  autoFocus
                />
              </>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowBetModal(false)}>Cancel</button>
              <button onClick={() => {
                if (bettingLimit === BettingLimit.FIXED_LIMIT) {
                  onAction(ActionType.BET, minBet);
                  setShowBetModal(false);
                } else {
                  handleBet();
                }
              }} className="confirm">Bet</button>
            </div>
          </div>
        </div>
      )}

      {showRaiseModal && (
        <div className="modal-overlay" onClick={() => setShowRaiseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Enter Raise Amount</h3>
            
            {bettingLimit === BettingLimit.FIXED_LIMIT ? (
              <div className="fixed-limit-info">
                <p>Fixed Limit: Raise will be to ${currentBet + minRaise}</p>
              </div>
            ) : (
              <>
                <div className="quick-bets">
                  {bettingLimit === BettingLimit.POT_LIMIT ? (
                    <>
                      <button 
                        className="quick-bet-button pot-raise"
                        onClick={() => {
                          const potAfterCall = potSize + (currentBet - currentPlayer.currentBet);
                          const potRaise = currentBet + potAfterCall;
                          setRaiseAmount(potRaise.toString());
                        }}
                      >
                        <span className="quick-bet-label">POT</span>
                        <span className="quick-bet-amount">
                          ${Math.min(currentBet + potSize + (currentBet - currentPlayer.currentBet), 
                                     currentPlayer.stack + currentPlayer.currentBet)}
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <QuickBetButton multiplier={0.5} label="1/2" />
                      <QuickBetButton multiplier={0.75} label="3/4" />
                      <QuickBetButton multiplier={1} label="POT" />
                      <QuickBetButton multiplier={1.5} label="1.5x" />
                    </>
                  )}
                </div>

                <input
                  type="number"
                  value={raiseAmount}
                  onChange={e => setRaiseAmount(e.target.value)}
                  placeholder={`Min: ${Math.min(currentBet + minRaise, currentPlayer.stack + currentPlayer.currentBet)}, Max: ${
                    bettingLimit === BettingLimit.POT_LIMIT 
                      ? Math.min(currentBet + potSize + (currentBet - currentPlayer.currentBet), 
                                 currentPlayer.stack + currentPlayer.currentBet)
                      : currentPlayer.stack + currentPlayer.currentBet
                  }`}
                  autoFocus
                />
                
                {bettingLimit === BettingLimit.NO_LIMIT && (
                  <button 
                    className="all-in-in-modal"
                    onClick={() => {
                      onAction(ActionType.ALL_IN);
                      setShowRaiseModal(false);
                    }}
                  >
                    All In (${currentPlayer.stack})
                  </button>
                )}
              </>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowRaiseModal(false)}>Cancel</button>
              <button onClick={() => {
                if (bettingLimit === BettingLimit.FIXED_LIMIT) {
                  onAction(ActionType.RAISE, currentBet + minRaise);
                  setShowRaiseModal(false);
                } else {
                  handleRaise();
                }
              }} className="confirm">Raise</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionButtons;