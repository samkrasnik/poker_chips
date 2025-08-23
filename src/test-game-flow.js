// Test script to verify game flow works correctly
import { Game } from './models/Game.js';

console.log('Testing Poker Chips Game Flow...\n');

try {
    // Create a new game
    console.log('1. Creating new game...');
    const game = new Game({
        name: 'Test Game',
        smallBlind: 5,
        bigBlind: 10,
        startingStack: 1000
    });
    console.log('✓ Game created\n');

    // Add 3 players
    console.log('2. Adding 3 players...');
    game.addPlayer('Alice', 1, 1000);
    game.addPlayer('Bob', 2, 1000);
    game.addPlayer('Charlie', 3, 1000);
    console.log(`✓ Added ${game.players.length} players`);
    game.players.forEach(p => console.log(`  - ${p.name}: $${p.stack}`));
    console.log();

    // Start a hand
    console.log('3. Starting hand...');
    game.startHand();
    console.log(`✓ Hand started (Hand #${game.handNumber})`);
    console.log(`  Pot: $${game.potManager.totalPot}`);
    console.log(`  Dealer: ${game.players[game.dealerPosition].name}`);
    console.log(`  Current player: ${game.getCurrentPlayer().name}\n`);

    // Simulate betting - Player 3 (UTG) calls
    console.log('4. Player 3 (UTG) calls...');
    const player3 = game.getCurrentPlayer();
    game.performAction(player3.id, 'call');
    console.log(`✓ ${player3.name} called`);
    console.log(`  Pot: $${game.potManager.totalPot}\n`);

    // Player 1 (SB) folds
    console.log('5. Player 1 (SB) folds...');
    const player1 = game.getCurrentPlayer();
    game.performAction(player1.id, 'fold');
    console.log(`✓ ${player1.name} folded`);
    console.log(`  Pot: $${game.potManager.totalPot}\n`);

    // Player 2 (BB) checks
    console.log('6. Player 2 (BB) checks...');
    const player2 = game.getCurrentPlayer();
    game.performAction(player2.id, 'check');
    console.log(`✓ ${player2.name} checked`);
    console.log(`  Pot: $${game.potManager.totalPot}`);
    console.log(`  Round: ${game.currentRound + 1}\n`);

    // Continue checking through remaining rounds
    let round = 2;
    while (game.status === 'in_progress') {
        console.log(`Round ${round}: Players checking...`);
        
        // Both remaining players check
        for (let i = 0; i < 2; i++) {
            if (game.status === 'in_progress') {
                const currentPlayer = game.getCurrentPlayer();
                game.performAction(currentPlayer.id, 'check');
                console.log(`  ${currentPlayer.name} checked`);
            }
        }
        console.log(`  Pot: $${game.potManager.totalPot}\n`);
        round++;
    }

    // End hand and distribute pot
    console.log('7. Ending hand...');
    const remainingPlayers = game.getPlayersInHand();
    console.log(`  Remaining players: ${remainingPlayers.map(p => p.name).join(', ')}`);
    
    // Select Bob as winner
    const winner = remainingPlayers[0];
    console.log(`  Selecting ${winner.name} as winner`);
    
    const winnerStackBefore = winner.stack;
    game.endHand([winner.id]);
    const winnerStackAfter = winner.stack;
    
    console.log(`✓ Hand ended`);
    console.log(`  ${winner.name}'s stack: $${winnerStackBefore} → $${winnerStackAfter}`);
    console.log(`  Pot distributed: $${winnerStackAfter - winnerStackBefore}\n`);

    // Verify final state
    console.log('8. Final state:');
    game.players.forEach(p => {
        console.log(`  ${p.name}: $${p.stack} (${p.status})`);
    });
    console.log(`  Game status: ${game.status}`);
    console.log(`  Pot: $${game.potManager.totalPot}`);
    
    if (game.potManager.totalPot === 0 && game.status === 'waiting') {
        console.log('\n✅ All tests passed! Game flow working correctly.');
    } else {
        console.log('\n❌ Test failed: Pot not reset or game not in waiting state');
    }

} catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
}