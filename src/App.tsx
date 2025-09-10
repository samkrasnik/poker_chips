import React, { useState, useEffect } from 'react';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import useGameStore from './store/gameStore';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'setup' | 'game'>('setup');
  const { getSavedGames, currentGame } = useGameStore();
  
  useEffect(() => {
    // Check if there's a current game on startup (from saved games)
    const savedGames = getSavedGames();
    if (savedGames.length > 0 && !currentGame) {
      // Stay on setup screen but user can load a saved game
      console.log(`Found ${savedGames.length} saved game(s)`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="App">
      {currentScreen === 'setup' ? (
        <SetupScreen onGameCreated={() => setCurrentScreen('game')} />
      ) : (
        <GameScreen onNewGame={() => setCurrentScreen('setup')} />
      )}
    </div>
  );
}

export default App;
