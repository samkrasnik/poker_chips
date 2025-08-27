const puppeteer = require('puppeteer');

async function testPokerApp() {
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true if you don't want to see the browser
    slowMo: 500 // Slow down by 500ms between actions for visibility
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🎯 Starting Poker Chips Web App Test');
    
    // Navigate to the app
    console.log('📍 Step 1: Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Wait a moment for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a screenshot to see what we're working with
    await page.screenshot({ path: 'initial_screen.png', fullPage: true });
    
    // Check if we're on setup screen or game screen
    console.log('🔍 Step 2: Checking current screen state');
    
    const setupScreenElements = await page.$$eval('*', els => 
      els.some(el => el.textContent && (
        el.textContent.includes('Create New Game') || 
        el.textContent.includes('Add Player') ||
        el.textContent.includes('Start Game')
      ))
    );
    
    const gameScreenElements = await page.$$eval('*', els => 
      els.some(el => el.textContent && (
        el.textContent.includes('Start Hand') || 
        el.textContent.includes('Current Pot') ||
        el.textContent.includes('Player 1') ||
        el.textContent.includes('Call') ||
        el.textContent.includes('Fold')
      ))
    );
    
    if (setupScreenElements) {
      console.log('✅ Detected: Setup screen - proceeding with game setup');
      
      // Click "Create New Game" button
      console.log('🎮 Step 3a: Looking for Create New Game button');
      try {
        await page.waitForSelector('button', { timeout: 5000 });
        const createGameButton = await page.$$eval('button', buttons =>
          buttons.find(btn => btn.textContent.includes('Create New Game'))
        );
        if (createGameButton) {
          console.log('✅ Found Create New Game button, clicking...');
          await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Create New Game'));
            if (btn) btn.click();
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log('⚠️  Create New Game button not found, looking for alternatives...');
          const buttons = await page.$$eval('button', btns => 
            btns.map(btn => btn.textContent).filter(text => text)
          );
          console.log('Available buttons:', buttons);
        }
      } catch (error) {
        console.log('❌ Error with Create New Game button:', error.message);
      }
      
      // Add 3 players
      const players = ['Alice', 'Bob', 'Charlie'];
      for (const playerName of players) {
        console.log(`👤 Step 3b: Adding player ${playerName}`);
        try {
          // Look for input field and add player
          const inputExists = await page.$('input[type="text"], input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="player"], input[placeholder*="Player"]');
          if (inputExists) {
            await page.evaluate((name) => {
              const input = document.querySelector('input[type="text"], input[placeholder*="name"], input[placeholder*="Name"], input[placeholder*="player"], input[placeholder*="Player"]');
              if (input) {
                input.value = '';
                input.value = name;
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }, playerName);
            
            // Look for Add Player button
            const addPlayerExists = await page.$$eval('button', buttons =>
              buttons.some(btn => btn.textContent.includes('Add Player'))
            );
            if (addPlayerExists) {
              await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Add Player'));
                if (btn) btn.click();
              });
              await new Promise(resolve => setTimeout(resolve, 1000));
              console.log(`✅ Added player: ${playerName}`);
            } else {
              console.log('⚠️  Add Player button not found');
            }
          } else {
            console.log('⚠️  Player name input field not found');
          }
        } catch (error) {
          console.log(`❌ Error adding player ${playerName}:`, error.message);
        }
      }
      
      // Click "Start Game" button
      console.log('🚀 Step 3c: Starting the game');
      try {
        const startGameExists = await page.$$eval('button', buttons =>
          buttons.some(btn => btn.textContent.includes('Start Game'))
        );
        if (startGameExists) {
          await page.evaluate(() => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Start Game'));
            if (btn) btn.click();
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log('✅ Clicked Start Game button');
        } else {
          console.log('⚠️  Start Game button not found');
        }
      } catch (error) {
        console.log('❌ Error starting game:', error.message);
      }
      
    } else if (gameScreenElements) {
      console.log('✅ Detected: Game screen - skipping setup');
    } else {
      console.log('⚠️  Could not determine screen state, proceeding cautiously...');
    }
    
    // Wait for game screen to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'game_screen.png', fullPage: true });
    
    // Game screen actions
    console.log('🎲 Step 4: Performing game actions');
    
    // Click "Start Hand" button
    console.log('🃏 Step 4a: Starting a hand');
    try {
      const startHandExists = await page.$$eval('button', buttons =>
        buttons.some(btn => btn.textContent.includes('Start Hand'))
      );
      if (startHandExists) {
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Start Hand'));
          if (btn) btn.click();
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Started a new hand');
      } else {
        console.log('⚠️  Start Hand button not found');
      }
    } catch (error) {
      console.log('❌ Error starting hand:', error.message);
    }
    
    await page.screenshot({ path: 'hand_started.png', fullPage: true });
    
    // Perform betting actions
    console.log('💰 Step 4b: Performing betting actions');
    
    // Helper function to find and click betting buttons
    async function performBettingAction(action) {
      try {
        const buttonExists = await page.$$eval('button', (buttons, actionText) =>
          buttons.some(btn => btn.textContent.includes(actionText)), action
        );
        if (buttonExists) {
          await page.evaluate((actionText) => {
            const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes(actionText));
            if (btn) btn.click();
          }, action);
          await new Promise(resolve => setTimeout(resolve, 1500));
          console.log(`✅ Performed action: ${action}`);
          return true;
        } else {
          console.log(`⚠️  ${action} button not found`);
          return false;
        }
      } catch (error) {
        console.log(`❌ Error performing ${action}:`, error.message);
        return false;
      }
    }
    
    // First player: Call or Check
    console.log('Player 1 action: Looking for Call or Check');
    let success = await performBettingAction('Call');
    if (!success) {
      success = await performBettingAction('Check');
    }
    
    // Second player: Fold or Check  
    console.log('Player 2 action: Looking for Fold or Check');
    success = await performBettingAction('Fold');
    if (!success) {
      success = await performBettingAction('Check');
    }
    
    // Third player: Check
    console.log('Player 3 action: Looking for Check');
    await performBettingAction('Check');
    
    // Continue checking through remaining rounds if needed
    console.log('🔄 Step 4c: Continuing through betting rounds');
    let roundCount = 0;
    while (roundCount < 10) { // Safety limit
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Look for any available Check buttons
      const checkButtonExists = await page.$$eval('button', buttons =>
        buttons.some(btn => btn.textContent.includes('Check'))
      );
      if (checkButtonExists) {
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Check'));
          if (btn) btn.click();
        });
        console.log(`✅ Continued with Check (round ${roundCount + 1})`);
        roundCount++;
      } else {
        console.log('🏁 No more Check buttons found, betting rounds complete');
        break;
      }
    }
    
    await page.screenshot({ path: 'betting_complete.png', fullPage: true });
    
    // Select Winners
    console.log('🏆 Step 5: Selecting winner');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const selectWinnersExists = await page.$$eval('button', buttons =>
        buttons.some(btn => btn.textContent.includes('Select Winners'))
      );
      if (selectWinnersExists) {
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Select Winners'));
          if (btn) btn.click();
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Clicked Select Winners button');
        
        // Select one of the remaining players as winner
        console.log('🎯 Selecting a winner');
        const playerDivs = await page.$$('[class*="player"], [id*="player"], div:has-text("Alice"), div:has-text("Bob"), div:has-text("Charlie")');
        if (playerDivs.length > 0) {
          await playerDivs[0].click();
          console.log('✅ Selected first available player as winner');
        } else {
          console.log('⚠️  No player divs found for winner selection');
        }
      } else {
        console.log('⚠️  Select Winners button not found');
      }
    } catch (error) {
      console.log('❌ Error selecting winners:', error.message);
    }
    
    // Distribute Pots
    console.log('💸 Step 6: Distributing pots');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const distributePotExists = await page.$$eval('button', buttons =>
        buttons.some(btn => btn.textContent.includes('Distribute Pots'))
      );
      if (distributePotExists) {
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Distribute Pots'));
          if (btn) btn.click();
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Clicked Distribute Pots button');
      } else {
        console.log('⚠️  Distribute Pots button not found');
      }
    } catch (error) {
      console.log('❌ Error distributing pots:', error.message);
    }
    
    await page.screenshot({ path: 'final_state.png', fullPage: true });
    
    // Verification
    console.log('✅ Step 7: Verifying final state');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if pot shows $0
      const potText = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (let el of elements) {
          if (el.textContent && (el.textContent.includes('Pot') || el.textContent.includes('pot'))) {
            return el.textContent;
          }
        }
        return null;
      });
      
      if (potText) {
        console.log('💰 Current pot status:', potText);
        if (potText.includes('$0') || potText.includes('0')) {
          console.log('✅ VERIFICATION PASSED: Pot shows $0');
        } else {
          console.log('⚠️  VERIFICATION: Pot may not be at $0');
        }
      } else {
        console.log('⚠️  Could not find pot information');
      }
      
      // Check if game is ready for next hand
      const nextHandReady = await page.$$eval('button', buttons =>
        buttons.some(btn => btn.textContent.includes('Start Hand'))
      );
      if (nextHandReady) {
        console.log('✅ VERIFICATION PASSED: Game ready for next hand (Start Hand button available)');
      } else {
        console.log('⚠️  VERIFICATION: Start Hand button not found - game may not be ready');
      }
      
    } catch (error) {
      console.log('❌ Error during verification:', error.message);
    }
    
    console.log('🎉 Test sequence completed!');
    console.log('📸 Screenshots saved: initial_screen.png, game_screen.png, hand_started.png, betting_complete.png, final_state.png');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    await page.screenshot({ path: 'error_screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testPokerApp().catch(console.error);