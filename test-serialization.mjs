#!/usr/bin/env node

// Test serialization/deserialization of game objects

class Player {
  constructor(config) {
    this.id = config.id || Math.random().toString(36).substr(2, 9);
    this.name = config.name;
    this.seatNumber = config.seatNumber;
    this.stack = config.stack;
    this.hasActedVoluntarily = false;
  }
  
  resetForNewHand() {
    console.log(`Resetting ${this.name} for new hand`);
    this.hasActedVoluntarily = false;
  }
}

class PotManager {
  constructor() {
    this.pots = [];
    this.playerContributions = new Map();
    this.totalPot = 0;
  }
  
  reset() {
    console.log('Resetting pot manager');
    this.pots = [];
    this.playerContributions.clear();
    this.totalPot = 0;
  }
}

// Test serialization
const testGame = {
  id: 'test123',
  name: 'Test Game',
  players: [
    new Player({ name: 'Alice', seatNumber: 1, stack: 1000 }),
    new Player({ name: 'Bob', seatNumber: 2, stack: 1000 })
  ],
  potManager: new PotManager()
};

console.log('Original game:');
console.log('- Players have resetForNewHand?', testGame.players.every(p => typeof p.resetForNewHand === 'function'));
console.log('- PotManager has reset?', typeof testGame.potManager.reset === 'function');

// Serialize
const serialized = JSON.stringify({
  ...testGame,
  potManager: {
    ...testGame.potManager,
    playerContributions: Array.from(testGame.potManager.playerContributions.entries())
  }
});

console.log('\nSerialized (length:', serialized.length, 'chars)');

// Deserialize (wrong way - loses methods)
const wrongWay = JSON.parse(serialized);
console.log('\nWrong deserialization:');
console.log('- Players have resetForNewHand?', wrongWay.players.every(p => typeof p.resetForNewHand === 'function'));
console.log('- PotManager has reset?', typeof wrongWay.potManager?.reset === 'function');

// Deserialize (correct way - restore prototypes)
const gameData = JSON.parse(serialized);
const correctGame = {
  ...gameData,
  players: gameData.players.map(pd => {
    const player = new Player({
      id: pd.id,
      name: pd.name,
      seatNumber: pd.seatNumber,
      stack: pd.stack
    });
    Object.keys(pd).forEach(key => {
      if (!['id', 'name', 'seatNumber', 'stack'].includes(key)) {
        player[key] = pd[key];
      }
    });
    return player;
  }),
  potManager: (() => {
    const pm = new PotManager();
    pm.pots = gameData.potManager.pots || [];
    pm.totalPot = gameData.potManager.totalPot || 0;
    pm.playerContributions = new Map(gameData.potManager.playerContributions || []);
    return pm;
  })()
};

console.log('\nCorrect deserialization:');
console.log('- Players have resetForNewHand?', correctGame.players.every(p => typeof p.resetForNewHand === 'function'));
console.log('- PotManager has reset?', typeof correctGame.potManager.reset === 'function');

// Test the methods work
console.log('\nTesting methods:');
correctGame.players[0].resetForNewHand();
correctGame.potManager.reset();

console.log('\n✅ Serialization/deserialization test complete!');