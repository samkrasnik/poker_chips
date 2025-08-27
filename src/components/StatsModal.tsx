import React from 'react';
import useGameStore from '../store/gameStore';
import './StatsModal.css';

interface StatsModalProps {
  show: boolean;
  onClose: () => void;
}

const StatsModal: React.FC<StatsModalProps> = ({ show, onClose }) => {
  const { getPlayerStats } = useGameStore();
  
  if (!show) return null;
  
  const stats = getPlayerStats();
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Player Statistics</h2>
        
        {stats.length === 0 ? (
          <p className="no-stats">No statistics available yet. Play some hands to see stats!</p>
        ) : (
          <div className="stats-table">
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Hands Played</th>
                  <th>Hands Won</th>
                  <th>Win Rate</th>
                  <th>VPIP</th>
                  <th>Total Profit/Loss</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((playerStat) => {
                  const winRate = playerStat.handsPlayed > 0 
                    ? ((playerStat.handsWon / playerStat.handsPlayed) * 100).toFixed(1)
                    : '0.0';
                  const roi = playerStat.startingStack > 0
                    ? ((playerStat.totalProfit / playerStat.startingStack) * 100).toFixed(1)
                    : '0.0';
                  const profitClass = playerStat.totalProfit > 0 ? 'profit' : playerStat.totalProfit < 0 ? 'loss' : '';
                  
                  return (
                    <tr key={playerStat.playerName}>
                      <td className="player-name">{playerStat.playerName}</td>
                      <td>{playerStat.handsPlayed}</td>
                      <td>{playerStat.handsWon}</td>
                      <td>{winRate}%</td>
                      <td>{playerStat.vpip}%</td>
                      <td className={profitClass}>
                        {playerStat.totalProfit > 0 ? '+' : ''}
                        ${playerStat.totalProfit}
                      </td>
                      <td className={profitClass}>
                        {parseFloat(roi) > 0 ? '+' : ''}
                        {roi}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <div className="stats-legend">
              <p><strong>VPIP:</strong> Voluntary Put money In Pot - percentage of hands where player voluntarily bet/raised pre-flop</p>
              <p><strong>ROI:</strong> Return on Investment - profit/loss as percentage of starting stack</p>
            </div>
          </div>
        )}
        
        <div className="modal-actions">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;