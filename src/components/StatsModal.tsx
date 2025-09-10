import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import './StatsModal.css';

interface StatsModalProps {
  show: boolean;
  onClose: () => void;
}

interface HandDetailsPlayer {
  playerId: string;
  playerName: string;
  stackBefore: number;
  profit: number;
  won: boolean;
  vpip: boolean;
  actionStats: {
    raises: number;
    calls: number;
    folds: number;
    checks: number;
    bets: number;
    allIns: number;
    raiseOpportunities: number;
    callOpportunities: number;
    foldOpportunities: number;
    checkOpportunities: number;
    betOpportunities: number;
  };
}

interface HandDetailsEntry {
  timestamp: number;
  gameId?: string;
  players: HandDetailsPlayer[];
  winners: string[];
}

const StatsModal: React.FC<StatsModalProps> = ({ show, onClose }) => {
  const { getHistoricalStats, getGameStats, handHistory, currentGame } = useGameStore();
  const [range, setRange] = useState<string>('all');
  const [scope, setScope] = useState<string>('game');
  const [showDetails, setShowDetails] = useState<boolean>(false);

  if (!show) return null;

  const lastN = range === 'all' ? undefined : parseInt(range, 10);
  const stats = scope === 'all' ? getHistoricalStats(lastN) : getGameStats(lastN);

  const historyBase = scope === 'all'
    ? handHistory
    : handHistory.filter((h: HandDetailsEntry) => h.gameId === currentGame?.id);
  const history: HandDetailsEntry[] = lastN ? historyBase.slice(-lastN) : historyBase;
  
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

        {showDetails && (
          history.length === 0 ? (
            <p className="no-stats">No hand history available.</p>
          ) : (
            <div className="hand-details">
              <h3>Hand Details</h3>
              {history.map((hand, index) => (
                <div key={index} className="hand-detail">
                  <h4>
                    Hand {index + 1} - {new Date(hand.timestamp).toLocaleString()}
                  </h4>
                  <div className="stats-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Player</th>
                          <th>Won</th>
                          <th>Profit</th>
                          <th>VPIP</th>
                          <th>Raises</th>
                          <th>Calls</th>
                          <th>Folds</th>
                          <th>Checks</th>
                          <th>Bets</th>
                          <th>All-Ins</th>
                          <th>Raise Opp</th>
                          <th>Call Opp</th>
                          <th>Fold Opp</th>
                          <th>Check Opp</th>
                          <th>Bet Opp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hand.players.map((p) => {
                          const profitClass = p.profit > 0 ? 'profit' : p.profit < 0 ? 'loss' : '';
                          return (
                            <tr key={p.playerId}>
                              <td className="player-name">{p.playerName}</td>
                              <td>{p.won ? 'Yes' : 'No'}</td>
                              <td className={profitClass}>
                                {p.profit > 0 ? '+' : ''}${p.profit}
                              </td>
                              <td>{p.vpip ? 'Yes' : 'No'}</td>
                              <td>{p.actionStats.raises}</td>
                              <td>{p.actionStats.calls}</td>
                              <td>{p.actionStats.folds}</td>
                              <td>{p.actionStats.checks}</td>
                              <td>{p.actionStats.bets}</td>
                              <td>{p.actionStats.allIns}</td>
                              <td>{p.actionStats.raiseOpportunities}</td>
                              <td>{p.actionStats.callOpportunities}</td>
                              <td>{p.actionStats.foldOpportunities}</td>
                              <td>{p.actionStats.checkOpportunities}</td>
                              <td>{p.actionStats.betOpportunities}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        <div className="modal-actions">
          <button onClick={() => setShowDetails(d => !d)}>
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;