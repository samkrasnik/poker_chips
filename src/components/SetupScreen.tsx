import React, { useState } from 'react';
import useGameStore from '../store/gameStore';
import { BettingLimit } from '../models/Game';
import './SetupScreen.css';

interface SetupScreenProps {
  onGameCreated: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onGameCreated }) => {
  const { createNewGame, addPlayer, getSavedGames, loadGame } = useGameStore();
  const [showLoadModal, setShowLoadModal] = useState(false);
  
  const [gameName, setGameName] = useState(`Game ${new Date().toLocaleDateString()}`);
  const [maxPlayers, setMaxPlayers] = useState('9');
  const [startingStack, setStartingStack] = useState('1000');
  const [smallBlind, setSmallBlind] = useState('5');
  const [bigBlind, setBigBlind] = useState('10');
  const [ante, setAnte] = useState('0');
  const [bettingLimit, setBettingLimit] = useState(BettingLimit.NO_LIMIT);
  const [totalRounds, setTotalRounds] = useState('4');
  const [players, setPlayers] = useState([
    { name: '', stack: '' },
    { name: '', stack: '' },
    { name: '', stack: '' }
  ]);

  const addPlayerField = () => {
    setPlayers([...players, { name: '', stack: '' }]);
  };

  const removePlayerField = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: 'name' | 'stack', value: string) => {
    const newPlayers = [...players];
    newPlayers[index][field] = value;
    setPlayers(newPlayers);
  };

  const handlePrefill = () => {
    const savedGames = getSavedGames();
    if (savedGames.length === 0) return;

    const lastGame = savedGames[savedGames.length - 1];
    try {
      const gameData = JSON.parse(lastGame.gameState);
      // Always start a fresh game name when prefilling
      setGameName(`Game ${new Date().toLocaleDateString()}`);
      setMaxPlayers(gameData.maxPlayers?.toString() || '9');
      setStartingStack(gameData.startingStack?.toString() || '1000');
      setSmallBlind(gameData.smallBlind?.toString() || '5');
      setBigBlind(gameData.bigBlind?.toString() || '10');
      setAnte(gameData.ante?.toString() || '0');
      setBettingLimit(gameData.bettingLimit || BettingLimit.NO_LIMIT);
      setTotalRounds(gameData.totalRounds?.toString() || '4');

      if (Array.isArray(gameData.players)) {
        setPlayers(
          gameData.players.map((p: any) => ({
            name: p.name || '',
            // Don't carry over stack amounts from last game
            stack: ''
          }))
        );
      }
    } catch (err) {
      console.error('Failed to prefill from last saved game', err);
    }
  };

  const handleLoad = (saveId: string) => {
    loadGame(saveId);
    onGameCreated();
  };

  const handleCreateGame = () => {
    const validPlayers = players.filter(p => p.name.trim());
    
    if (validPlayers.length < 2) {
      alert('You need at least 2 players to start a game');
      return;
    }

    const gameConfig = {
      name: gameName,
      maxPlayers: parseInt(maxPlayers) || 9,
      startingStack: parseInt(startingStack) || 1000,
      smallBlind: parseInt(smallBlind) || 5,
      bigBlind: parseInt(bigBlind) || 10,
      ante: parseInt(ante) || 0,
      bettingLimit,
      totalRounds: parseInt(totalRounds) || 4,
      minBet: parseInt(bigBlind) || 10,
      minRaise: parseInt(bigBlind) || 10
    };

    createNewGame(gameConfig);

    validPlayers.forEach((player, index) => {
      const stack = player.stack ? parseInt(player.stack) : gameConfig.startingStack;
      addPlayer(player.name, index + 1, stack);
    });

    onGameCreated();
  };

  return (
    <div className="setup-screen">
      <div className="setup-header">
        <h1>New Game Setup</h1>
        {getSavedGames().length > 0 && (
          <>
            <button className="prefill-button" onClick={handlePrefill}>
              🔄 Use Last Game
            </button>
            <button className="load-game-button" onClick={() => setShowLoadModal(true)}>
              📁 Load Saved Game
            </button>
          </>
        )}
      </div>
      
      <div className="form-section">
        <h2>Game Settings</h2>
        
        <div className="form-group">
          <label>Game Name</label>
          <input
            type="text"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            placeholder="Enter game name"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Max Players</label>
            <input
              type="number"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              min="2"
              max="10"
            />
          </div>

          <div className="form-group">
            <label>Starting Stack</label>
            <input
              type="number"
              value={startingStack}
              onChange={(e) => setStartingStack(e.target.value)}
              min="100"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Small Blind</label>
            <input
              type="number"
              value={smallBlind}
              onChange={(e) => setSmallBlind(e.target.value)}
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Big Blind</label>
            <input
              type="number"
              value={bigBlind}
              onChange={(e) => setBigBlind(e.target.value)}
              min="2"
            />
          </div>

          <div className="form-group">
            <label>Ante</label>
            <input
              type="number"
              value={ante}
              onChange={(e) => setAnte(e.target.value)}
              min="0"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Betting Limit</label>
          <div className="button-group">
            <button
              className={bettingLimit === BettingLimit.NO_LIMIT ? 'active' : ''}
              onClick={() => setBettingLimit(BettingLimit.NO_LIMIT)}
            >
              No Limit
            </button>
            <button
              className={bettingLimit === BettingLimit.POT_LIMIT ? 'active' : ''}
              onClick={() => setBettingLimit(BettingLimit.POT_LIMIT)}
            >
              Pot Limit
            </button>
            <button
              className={bettingLimit === BettingLimit.FIXED_LIMIT ? 'active' : ''}
              onClick={() => setBettingLimit(BettingLimit.FIXED_LIMIT)}
            >
              Fixed Limit
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Betting Rounds</label>
          <input
            type="number"
            value={totalRounds}
            onChange={(e) => setTotalRounds(e.target.value)}
            min="1"
            max="5"
          />
        </div>
      </div>

      <div className="form-section">
        <h2>Players</h2>
        
        {players.map((player, index) => (
          <div key={index} className="player-row">
            <input
              type="text"
              value={player.name}
              onChange={(e) => updatePlayer(index, 'name', e.target.value)}
              placeholder={`Player ${index + 1} name`}
              className="player-name-input"
            />
            
            <input
              type="number"
              value={player.stack}
              onChange={(e) => updatePlayer(index, 'stack', e.target.value)}
              placeholder="Custom stack (optional)"
              className="player-stack-input"
            />
            
            {players.length > 2 && (
              <button
                className="remove-button"
                onClick={() => removePlayerField(index)}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {players.length < parseInt(maxPlayers || '9') && (
          <button className="add-player-button" onClick={addPlayerField}>
            + Add Player
          </button>
        )}
      </div>

      <button className="create-game-button" onClick={handleCreateGame}>
        Create Game
      </button>
      
      {/* Load Game Modal */}
      {showLoadModal && (
        <div className="modal-overlay" onClick={() => setShowLoadModal(false)}>
          <div className="modal-content load-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Load Saved Game</h2>
            <div className="saved-games-list">
              {getSavedGames().map(save => (
                <div key={save.id} className="saved-game-item">
                  <div className="save-info">
                    <div className="save-name">{save.name}</div>
                    <div className="save-date">{new Date(save.savedAt).toLocaleString()}</div>
                  </div>
                  <button onClick={() => handleLoad(save.id)} className="load-btn">Load</button>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowLoadModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupScreen;