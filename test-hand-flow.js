const puppeteer = require('puppeteer');

async function testHandFlow() {
    console.log('🃏 Starting poker hand flow test...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });
    const page = await browser.newPage();
    
    try {
        // Navigate to the app
        console.log('📱 Loading poker app...');
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);
        
        // Step 1: Setup game with Bob and Charlie
        console.log('\n=== STEP 1: GAME SETUP ===');
        
        // Create new game
        await page.click('button');
        await page.waitForTimeout(500);
        console.log('✅ Game created');
        
        // Add Bob
        await page.type('input[placeholder="Player name"]', 'Bob');
        await page.click('button:has-text("Add Player")');
        await page.waitForTimeout(500);
        console.log('✅ Added Bob');
        
        // Add Charlie  
        await page.evaluate(() => document.querySelector('input[placeholder="Player name"]').value = '');
        await page.type('input[placeholder="Player name"]', 'Charlie');
        await page.click('button:has-text("Add Player")');
        await page.waitForTimeout(500);
        console.log('✅ Added Charlie');
        
        // Start game
        await page.click('button:has-text("Start Game")');
        await page.waitForTimeout(500);
        console.log('✅ Game started with Bob and Charlie');
        
        // Step 2: Start hand
        console.log('\n=== STEP 2: START HAND ===');
        await page.click('button:has-text("Start Hand")');
        await page.waitForTimeout(1000);
        console.log('✅ Hand started');
        
        // Step 3: Check game state
        console.log('\n=== STEP 3: GAME STATE ANALYSIS ===');
        
        // Get pot amount
        const potAmount = await page.evaluate(() => {
            const potEl = document.querySelector('.pot-amount');
            return potEl ? potEl.textContent.match(/\$(\d+)/)?.[1] || '0' : '0';
        });
        console.log(`💰 Current pot amount: $${potAmount}`);
        
        // Get current turn
        const currentTurn = await page.evaluate(() => {
            const turnEl = document.querySelector('.current-player');
            return turnEl ? turnEl.textContent.trim() : 'Unknown';
        });
        console.log(`🎯 Current turn: ${currentTurn}`);
        
        // Get available actions
        const availableActions = await page.evaluate(() => {
            const buttons = document.querySelectorAll('.action-buttons button');
            return Array.from(buttons).map(btn => btn.textContent.trim());
        });
        console.log(`🎮 Available actions: ${availableActions.join(', ')}`);
        
        // Step 4: First player action
        console.log('\n=== STEP 4: FIRST PLAYER ACTION ===');
        
        if (availableActions.includes('Call')) {
            await page.click('button:has-text("Call")');
            console.log('✅ First player called');
        } else if (availableActions.includes('Check')) {
            await page.click('button:has-text("Check")');
            console.log('✅ First player checked');
        } else {
            console.log('❌ No Call or Check button available');
        }
        await page.waitForTimeout(1000);
        
        // Step 5: Second player action  
        console.log('\n=== STEP 5: SECOND PLAYER ACTION ===');
        
        const secondActions = await page.evaluate(() => {
            const buttons = document.querySelectorAll('.action-buttons button');
            return Array.from(buttons).map(btn => btn.textContent.trim());
        });
        
        if (secondActions.includes('Check')) {
            await page.click('button:has-text("Check")');
            console.log('✅ Second player checked');
        } else {
            console.log(`❌ Check not available. Available: ${secondActions.join(', ')}`);
        }
        await page.waitForTimeout(1000);
        
        // Step 6: Continue through betting rounds
        console.log('\n=== STEP 6: BETTING ROUNDS ===');
        
        let roundCount = 0;
        while (roundCount < 10) { // Safety limit
            const actionButtons = await page.evaluate(() => {
                const buttons = document.querySelectorAll('.action-buttons button');
                return Array.from(buttons).map(btn => btn.textContent.trim());
            });
            
            if (actionButtons.length === 0) {
                console.log('🏁 No more betting actions - hand complete');
                break;
            }
            
            if (actionButtons.includes('Check')) {
                await page.click('button:has-text("Check")');
                console.log(`✅ Player checked (round ${roundCount + 1})`);
                await page.waitForTimeout(1000);
                roundCount++;
            } else {
                console.log(`🏁 No Check button available. Actions: ${actionButtons.join(', ')}`);
                break;
            }
        }
        
        // Step 7: Select winners
        console.log('\n=== STEP 7: SELECT WINNERS ===');
        
        const selectWinnersExists = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.some(btn => btn.textContent.includes('Select Winners'));
        });
        
        if (selectWinnersExists) {
            await page.click('button:has-text("Select Winners")');
            await page.waitForTimeout(1000);
            console.log('✅ Select Winners modal opened');
            
            // Select first available winner
            const winnerSelected = await page.evaluate(() => {
                const winnerOptions = document.querySelectorAll('.winner-option');
                if (winnerOptions.length > 0) {
                    winnerOptions[0].click();
                    return true;
                }
                return false;
            });
            
            if (winnerSelected) {
                console.log('✅ Winner selected');
            } else {
                console.log('❌ No winner options found');
            }
        } else {
            console.log('❌ Select Winners button not found');
        }
        
        // Step 8: Distribute pots
        console.log('\n=== STEP 8: DISTRIBUTE POTS ===');
        
        const distributePotExists = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.some(btn => btn.textContent.includes('Distribute Pots'));
        });
        
        if (distributePotExists) {
            await page.click('button:has-text("Distribute Pots")');
            await page.waitForTimeout(1000);
            console.log('✅ Pots distributed');
        } else {
            console.log('❌ Distribute Pots button not found');
        }
        
        // Step 9: Verify results
        console.log('\n=== STEP 9: VERIFICATION ===');
        await page.waitForTimeout(2000); // Give time for updates
        
        // Check pot is $0
        const finalPotAmount = await page.evaluate(() => {
            const potEl = document.querySelector('.pot-amount');
            return potEl ? potEl.textContent.match(/\$(\d+)/)?.[1] || '0' : '0';
        });
        console.log(`💰 Final pot amount: $${finalPotAmount}`);
        
        if (finalPotAmount === '0') {
            console.log('✅ Pot is now $0');
        } else {
            console.log(`❌ Pot should be $0 but is $${finalPotAmount}`);
        }
        
        // Check player stacks
        const playerStacks = await page.evaluate(() => {
            const playerCards = document.querySelectorAll('.player-card');
            const stacks = [];
            playerCards.forEach((card, index) => {
                const name = card.querySelector('h3')?.textContent || `Player ${index + 1}`;
                const stack = card.textContent.match(/Stack: \$(\d+)/)?.[1] || 'Unknown';
                stacks.push({ name, stack });
            });
            return stacks;
        });
        
        console.log('👥 Player stacks after distribution:');
        playerStacks.forEach(player => {
            console.log(`   ${player.name}: $${player.stack}`);
        });
        
        // Check if new hand can be started
        const startHandAvailable = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.some(btn => btn.textContent.includes('Start Hand'));
        });
        
        if (startHandAvailable) {
            console.log('✅ Start Hand button available for new hand');
        } else {
            console.log('❌ Start Hand button not available');
        }
        
        console.log('\n🎉 Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        // Keep browser open for manual inspection
        console.log('\n📝 Browser kept open for manual inspection...');
        // await browser.close();
    }
}

testHandFlow();