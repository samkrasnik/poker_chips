import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import './StatsModal.css';

interface StatsModalProps {
  show: boolean;
  onClose: () => void;
}

const StatsModal: React.FC<StatsModalProps> = ({ show, onClose }) => {
  const { getHistoricalStats, getGameStats } = useGameStore();
  const [range, setRange] = useState<string>('all');
  const [scope, setScope] = useState<string>('game');

  if (!show) return null;

  const lastN = range === 'all' ? undefined : parseInt(range, 10);
  const stats = scope === 'all' ? getHistoricalStats(lastN) : getGameStats(lastN);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Player Statistics</h2>

        <div className="stats-scope">
          <label htmlFor="stats-scope-select">Stats For:</label>
          <select
            id="stats-scope-select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="game">This Game</option>
            <option value="all">All Games</option>
          </select>
        </div>

        <div className="stats-range">
          <label htmlFor="stats-range-select">Show:</label>
          <select
            id="stats-range-select"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="all">All Hands</option>
            <option value="100">Last 100 Hands</option>
            <option value="500">Last 500 Hands</option>
          </select>
        </div>
        
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
                  <th>Raise%</th>
                  <th>Call%</th>
                  <th>Fold%</th>
                  <th>Total P/L</th>
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
                  
                  // Calculate action percentages (handle missing actionStats for backwards compatibility)
                  const hasActionStats = playerStat.actionStats && 
                    (playerStat.actionStats.raiseOpportunities > 0 || 
                     playerStat.actionStats.callOpportunities > 0 || 
                     playerStat.actionStats.foldOpportunities > 0);
                  
                  const raisePercent = playerStat.actionStats?.raiseOpportunities > 0
                    ? ((playerStat.actionStats.raises / playerStat.actionStats.raiseOpportunities) * 100).toFixed(1)
                    : hasActionStats ? '0.0' : '-';
                  const callPercent = playerStat.actionStats?.callOpportunities > 0
                    ? ((playerStat.actionStats.calls / playerStat.actionStats.callOpportunities) * 100).toFixed(1)
                    : hasActionStats ? '0.0' : '-';
                  const foldPercent = playerStat.actionStats?.foldOpportunities > 0
                    ? ((playerStat.actionStats.folds / playerStat.actionStats.foldOpportunities) * 100).toFixed(1)
                    : hasActionStats ? '0.0' : '-';
                  
                  return (
                    <tr key={playerStat.playerName}>
                      <td className="player-name">{playerStat.playerName}</td>
                      <td>{playerStat.handsPlayed}</td>
                      <td>{playerStat.handsWon}</td>
                      <td>{winRate}%</td>
                      <td>{playerStat.vpip}%</td>
                      <td>{raisePercent === '-' ? raisePercent : `${raisePercent}%`}</td>
                      <td>{callPercent === '-' ? callPercent : `${callPercent}%`}</td>
                      <td>{foldPercent === '-' ? foldPercent : `${foldPercent}%`}</td>
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
              <p><strong>VPIP:</strong> Voluntary Put money In Pot - percentage of hands where player voluntarily put money in pre-flop (bet/call/raise, not BB check)</p>
              <p><strong>Raise%/Call%/Fold%:</strong> Percentage of times player took each action when it was available</p>
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