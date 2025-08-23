import React, { useState } from 'react';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'setup' | 'game'>('setup');

  return (
    <div className="App">
      {currentScreen === 'setup' ? (
        <SetupScreen onGameCreated={() => setCurrentScreen('game')} />
      ) : (
        <GameScreen onBack={() => setCurrentScreen('setup')} />
      )}
    </div>
  );
}

export default App;
