// Test script to verify game flow works correctly
// Run with: node test-game-flow.mjs

class PlayerStatus {
    static ACTIVE = 'active';
    static FOLDED = 'folded';
    static ALL_IN = 'all_in';
    static ELIMINATED = 'eliminated';
    static SITTING_OUT = 'sitting_out';
}

class Player {
    constructor(config) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = config.name;
        this.seatNumber = config.seatNumber;
        this.stack = config.stack;
        this.status = PlayerStatus.ACTIVE;
        this.currentBet = 0;
        this.hasActed = false;
        this.isDealer = false;
        this.isSmallBlind = false;
        this.isBigBlind = false;
        this.actionHistory = [];
    }

    bet(amount) {
        const actualAmount = Math.min(amount, this.stack);
        this.stack -= actualAmount;
        this.currentBet += actualAmount;
        return actualAmount;
    }

    fold() {
        this.status = PlayerStatus.FOLDED;
    }

    allIn() {
        const amount = this.stack;
        this.currentBet += amount;
        this.stack = 0;
        this.status = PlayerStatus.ALL_IN;
        return amount;
    }

    addChips(amount) {
        this.stack += amount;
    }

    resetForNewHand() {
        this.currentBet = 0;
        this.hasActed = false;
        this.status = this.stack > 0 ? PlayerStatus.ACTIVE : PlayerStatus.ELIMINATED;
        this.actionHistory = [];
    }

    resetForNewRound() {
        this.currentBet = 0;
        this.hasActed = false;
    }

    recordAction(action) {
        this.actionHistory.push(action);
    }
}

class PotManager {
    constructor() {
        this.pots = [];
        this.playerContributions = new Map();
        this.totalPot = 0;
    }

    addBet(playerId, amount) {
        const current = this.playerContributions.get(playerId) || 0;
        this.playerContributions.set(playerId, current + amount);
        this.totalPot += amount;
    }

    createSidePots(players) {
        const hasAllIn = players.some(p => p.status === 'all_in');
        if (!hasAllIn) {
            this.pots = [{
                id: Math.random().toString(36).substr(2, 9),
                amount: this.totalPot,
                eligiblePlayers: Array.from(this.playerContributions.keys()),
                isMain: true
            }];
            return;
        }
        
        this.pots = [];
        const contributions = Array.from(this.playerContributions.entries())
            .filter(([id, amount]) => amount > 0)
            .sort((a, b) => a[1] - b[1]);
        
        if (contributions.length === 0) return;
        
        let previousAmount = 0;
        const processedAmounts = new Set();
        
        for (const [_, contributionAmount] of contributions) {
            if (processedAmounts.has(contributionAmount)) continue;
            processedAmounts.add(contributionAmount);
            
            const potAmount = contributionAmount - previousAmount;
            const eligiblePlayers = contributions
                .filter(([id, amount]) => amount >= contributionAmount)
                .map(([id]) => id);
            
            if (potAmount > 0 && eligiblePlayers.length > 0) {
                const pot = {
                    id: Math.random().toString(36).substr(2, 9),
                    amount: potAmount * eligiblePlayers.length,
                    eligiblePlayers,
                    isMain: this.pots.length === 0
                };
                this.pots.push(pot);
            }
            
            previousAmount = contributionAmount;
        }
    }

    distributePots(winners) {
        const distributions = [];
        
        for (const pot of this.pots) {
            const potWinners = winners[pot.id] || winners['default'] || [];
            const winnersInPot = potWinners.filter(w => pot.eligiblePlayers.includes(w));
            
            if (winnersInPot.length > 0) {
                const amountPerWinner = Math.floor(pot.amount / winnersInPot.length);
                const remainder = pot.amount % winnersInPot.length;
                
                const distribution = {};
                winnersInPot.forEach((winnerId, index) => {
                    distribution[winnerId] = amountPerWinner + (index === 0 ? remainder : 0);
                });
                
                distributions.push({
                    potId: pot.id,
                    amount: pot.amount,
                    winners: winnersInPot,
                    distribution
                });
            }
        }
        
        return distributions;
    }

    reset() {
        this.pots = [];
        this.playerContributions.clear();
        this.totalPot = 0;
    }
}

class Game {
    constructor(config = {}) {
        this.id = Math.random().toString(36).substr(2, 9);
        this.name = config.name || `Game ${new Date().toLocaleString()}`;
        this.status = 'waiting';
        this.players = [];
        this.maxPlayers = config.maxPlayers || 10;
        this.startingStack = config.startingStack || 1000;
        this.smallBlind = config.smallBlind || 5;
        this.bigBlind = config.bigBlind || 10;
        this.ante = config.ante || 0;
        this.minBet = config.minBet || this.bigBlind;
        this.minRaise = config.minRaise || this.bigBlind;
        this.dealerPosition = 0;
        this.currentPlayerIndex = 0;
        this.currentRound = 0;
        this.totalRounds = config.totalRounds || 4;
        this.handNumber = 0;
        this.potManager = new PotManager();
        this.currentBet = 0;
        this.history = [];
        this.actionHistory = [];
    }

    addPlayer(name, seatNumber, stack) {
        const player = new Player({
            name,
            seatNumber: seatNumber || this.getNextAvailableSeat(),
            stack: stack || this.startingStack
        });
        this.players.push(player);
        this.sortPlayersBySeat();
        return player;
    }

    getNextAvailableSeat() {
        for (let i = 1; i <= this.maxPlayers; i++) {
            if (!this.players.some(p => p.seatNumber === i)) {
                return i;
            }
        }
        throw new Error('No available seats');
    }

    sortPlayersBySeat() {
        this.players.sort((a, b) => a.seatNumber - b.seatNumber);
    }

    startHand() {
        if (this.getActivePlayers().length < 2) {
            throw new Error('Need at least 2 players to start');
        }

        this.handNumber++;
        this.status = 'in_progress';
        this.currentRound = 0;
        this.potManager.reset();
        
        this.players.forEach(player => player.resetForNewHand());
        
        this.moveDealerButton();
        this.postBlindsAndAntes();
        this.determineFirstActor();
    }

    moveDealerButton() {
        const activePlayers = this.getActivePlayers();
        if (activePlayers.length === 0) return;

        do {
            this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
        } while (this.players[this.dealerPosition].status === PlayerStatus.ELIMINATED);

        this.players.forEach(p => p.isDealer = false);
        this.players[this.dealerPosition].isDealer = true;
    }

    postBlindsAndAntes() {
        const activePlayers = this.getActivePlayers();
        
        if (activePlayers.length === 2) {
            const sbIndex = this.dealerPosition;
            const bbIndex = (this.dealerPosition + 1) % this.players.length;
            
            this.postBlind(this.players[sbIndex], this.smallBlind, true);
            this.postBlind(this.players[bbIndex], this.bigBlind, false);
        } else {
            const sbIndex = (this.dealerPosition + 1) % this.players.length;
            const bbIndex = (this.dealerPosition + 2) % this.players.length;
            
            this.postBlind(this.players[sbIndex], this.smallBlind, true);
            this.postBlind(this.players[bbIndex], this.bigBlind, false);
        }
        
        this.currentBet = this.bigBlind;
    }

    postBlind(player, amount, isSmallBlind) {
        if (player.status === PlayerStatus.ELIMINATED) return;
        
        const blindAmount = Math.min(amount, player.stack);
        if (blindAmount > 0) {
            if (blindAmount === player.stack) {
                player.allIn();
            } else {
                player.bet(blindAmount);
            }
            
            this.potManager.addBet(player.id, blindAmount);
            
            if (isSmallBlind) {
                player.isSmallBlind = true;
            } else {
                player.isBigBlind = true;
            }
        }
    }

    determineFirstActor() {
        if (this.currentRound === 0) {
            const activePlayers = this.getActivePlayers();
            if (activePlayers.length === 2) {
                this.currentPlayerIndex = this.dealerPosition;
            } else {
                this.currentPlayerIndex = (this.dealerPosition + 3) % this.players.length;
            }
        } else {
            let index = (this.dealerPosition + 1) % this.players.length;
            let attempts = 0;
            
            while (attempts < this.players.length) {
                if (this.canPlayerAct(this.players[index])) {
                    this.currentPlayerIndex = index;
                    return;
                }
                index = (index + 1) % this.players.length;
                attempts++;
            }
            
            this.currentPlayerIndex = this.dealerPosition;
            return;
        }
        
        let attempts = 0;
        while (!this.canPlayerAct(this.players[this.currentPlayerIndex]) && attempts < this.players.length) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
        }
    }

    canPlayerAct(player) {
        return player.status === PlayerStatus.ACTIVE;
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getActivePlayers() {
        return this.players.filter(p => 
            p.status === PlayerStatus.ACTIVE || 
            p.status === PlayerStatus.ALL_IN
        );
    }

    getPlayersInHand() {
        return this.players.filter(p => 
            p.status !== PlayerStatus.FOLDED && 
            p.status !== PlayerStatus.ELIMINATED &&
            p.status !== PlayerStatus.SITTING_OUT
        );
    }

    performAction(playerId, action, amount = 0) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        if (this.players[this.currentPlayerIndex].id !== playerId) {
            throw new Error('Not this player\'s turn');
        }

        switch (action) {
            case 'check':
                this.handleCheck(player);
                break;
            case 'call':
                this.handleCall(player);
                break;
            case 'fold':
                this.handleFold(player);
                break;
            default:
                throw new Error('Invalid action');
        }

        player.hasActed = true;
        this.recordAction(player, action, amount);
        
        const remainingPlayers = this.getPlayersInHand();
        if (remainingPlayers.length === 1) {
            this.endHand([remainingPlayers[0].id]);
            return;
        }
        
        this.moveToNextPlayer();
        
        if (this.isRoundComplete()) {
            this.endRound();
        }
    }

    handleCheck(player) {
        if (this.currentBet > player.currentBet) {
            throw new Error('Cannot check, must call or fold');
        }
    }

    handleCall(player) {
        const callAmount = this.currentBet - player.currentBet;
        
        if (callAmount <= 0) {
            throw new Error('Nothing to call');
        }
        
        if (callAmount >= player.stack) {
            this.handleAllIn(player);
            return;
        }
        
        player.bet(callAmount);
        this.potManager.addBet(player.id, callAmount);
    }

    handleFold(player) {
        player.fold();
    }

    handleAllIn(player) {
        const amount = player.allIn();
        this.potManager.addBet(player.id, amount);
        
        if (player.currentBet > this.currentBet) {
            this.currentBet = player.currentBet;
            
            this.players.forEach((p, index) => {
                if (index !== this.currentPlayerIndex && p.status === PlayerStatus.ACTIVE) {
                    p.hasActed = false;
                }
            });
        }
    }

    moveToNextPlayer() {
        let attempts = 0;
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            attempts++;
            if (attempts > this.players.length) {
                break;
            }
        } while (!this.canPlayerAct(this.players[this.currentPlayerIndex]));
    }

    isRoundComplete() {
        const activePlayers = this.players.filter(p => 
            p.status === PlayerStatus.ACTIVE
        );
        
        if (activePlayers.length === 0) {
            return true;
        }
        
        if (activePlayers.length === 1) {
            const allInPlayers = this.players.filter(p => p.status === PlayerStatus.ALL_IN);
            if (allInPlayers.length === 0) {
                return true;
            }
            return activePlayers[0].hasActed;
        }
        
        const allActed = activePlayers.every(p => p.hasActed);
        const allMatched = activePlayers.every(p => p.currentBet === this.currentBet);
        
        return allActed && allMatched;
    }

    endRound() {
        this.currentRound++;
        
        if (this.currentRound >= this.totalRounds) {
            this.status = 'hand_complete';
            return;
        }
        
        this.players.forEach(player => player.resetForNewRound());
        this.currentBet = 0;
        
        const hasAllInPlayers = this.players.some(p => p.status === PlayerStatus.ALL_IN);
        if (hasAllInPlayers) {
            this.potManager.createSidePots(this.players);
        }
        
        this.determineFirstActor();
    }

    endHand(winnerIds) {
        this.potManager.createSidePots(this.players);
        
        const distributions = this.potManager.distributePots({
            default: winnerIds
        });
        
        distributions.forEach(dist => {
            Object.entries(dist.distribution).forEach(([playerId, amount]) => {
                const player = this.players.find(p => p.id === playerId);
                if (player) {
                    player.addChips(amount);
                }
            });
        });
        
        this.status = 'waiting';
        
        this.potManager.reset();
        
        this.players.forEach(player => {
            player.resetForNewHand();
            player.isSmallBlind = false;
            player.isBigBlind = false;
        });
    }

    recordAction(player, action, amount) {
        const actionRecord = {
            playerId: player.id,
            playerName: player.name,
            action,
            amount,
            timestamp: Date.now(),
            round: this.currentRound,
            pot: this.potManager.totalPot
        };
        
        this.actionHistory.push(actionRecord);
        player.recordAction(actionRecord);
    }
}

// Run the test
console.log('Testing Poker Chips Game Flow...\n');

try {
    const game = new Game({
        name: 'Test Game',
        smallBlind: 5,
        bigBlind: 10,
        startingStack: 1000
    });
    console.log('✓ Game created\n');

    game.addPlayer('Alice', 1, 1000);
    game.addPlayer('Bob', 2, 1000);
    game.addPlayer('Charlie', 3, 1000);
    console.log(`✓ Added ${game.players.length} players\n`);

    game.startHand();
    console.log(`✓ Hand started - Pot: $${game.potManager.totalPot}\n`);

    // UTG calls
    game.performAction(game.getCurrentPlayer().id, 'call');
    console.log(`✓ ${game.players[2].name} called - Pot: $${game.potManager.totalPot}`);

    // SB folds
    game.performAction(game.getCurrentPlayer().id, 'fold');
    console.log(`✓ ${game.players[0].name} folded - Pot: $${game.potManager.totalPot}`);

    // BB checks
    game.performAction(game.getCurrentPlayer().id, 'check');
    console.log(`✓ ${game.players[1].name} checked - Pot: $${game.potManager.totalPot}\n`);

    // Continue checking through remaining rounds
    let round = 2;
    while (game.status === 'in_progress') {
        for (let i = 0; i < 2; i++) {
            if (game.status === 'in_progress') {
                game.performAction(game.getCurrentPlayer().id, 'check');
            }
        }
        if (game.status === 'in_progress') {
            console.log(`✓ Round ${round} complete - Pot: $${game.potManager.totalPot}`);
        }
        round++;
    }

    // End hand
    const remainingPlayers = game.getPlayersInHand();
    const winner = remainingPlayers[0];
    const winnerStackBefore = winner.stack;
    
    game.endHand([winner.id]);
    
    const winnerStackAfter = winner.stack;
    const potWon = winnerStackAfter - winnerStackBefore;
    
    console.log(`\n✓ Hand ended - ${winner.name} won $${potWon}`);
    console.log('\nFinal stacks:');
    game.players.forEach(p => {
        console.log(`  ${p.name}: $${p.stack}`);
    });
    
    if (game.potManager.totalPot === 0 && game.status === 'waiting' && potWon > 0) {
        console.log('\n✅ All tests passed! Game flow working correctly.');
    } else {
        console.log('\n❌ Test failed: Issues with pot distribution or game state');
        console.log(`  Pot: $${game.potManager.totalPot}`);
        console.log(`  Status: ${game.status}`);
        console.log(`  Pot won: $${potWon}`);
    }

} catch (error) {
    console.error('❌ Test failed:', error.message);
}