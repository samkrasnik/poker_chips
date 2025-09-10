let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  console.warn('Skipping test_poker_simple.js: puppeteer not installed');
  process.exit(0);
}

async function testPokerApp() {
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 1000 // Slower for better visibility
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🎯 Starting Poker Chips Web App Test');
    
    // Navigate to the app
    console.log('📍 Step 1: Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test_initial.png', fullPage: true });
    
    // Fill in player names in the existing input fields
    console.log('👤 Step 2: Adding players Alice, Bob, Charlie');
    const players = ['Alice', 'Bob', 'Charlie'];
    
    // Fill the first 3 player name fields
    for (let i = 0; i < players.length; i++) {
      try {
        const selector = `input[placeholder="Player ${i + 1} name"]`;
        await page.waitForSelector(selector, { timeout: 5000 });
        await page.click(selector);
        await page.evaluate((sel) => {
          document.querySelector(sel).value = '';
        }, selector);
        await page.type(selector, players[i]);
        console.log(`✅ Added ${players[i]} to Player ${i + 1} field`);
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`❌ Error adding ${players[i]}:`, error.message);
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: 'test_players_added.png', fullPage: true });
    
    // Click "Create Game" button
    console.log('🚀 Step 3: Clicking Create Game button');
    try {
      await page.waitForSelector('button:has-text("Create Game")', { timeout: 5000 });
      await page.click('button:has-text("Create Game")');
      console.log('✅ Clicked Create Game button');
    } catch (error) {
      // Try alternative selector
      try {
        const createButton = await page.$('button');
        const buttonText = await page.evaluate(btn => btn.textContent, createButton);
        if (buttonText.includes('Create Game')) {
          await createButton.click();
          console.log('✅ Clicked Create Game button (alternative method)');
        }
      } catch (err) {
        console.log('❌ Error clicking Create Game:', error.message);
      }
    }
    
    // Wait for game screen to load
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: 'test_after_create.png', fullPage: true });
    
    // Check if we're now on the game screen
    const gameScreenText = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    if (gameScreenText.includes('Start Hand') || gameScreenText.includes('Current Pot') || gameScreenText.includes('Stack:')) {
      console.log('✅ Successfully transitioned to game screen');
      
      // Try to start a hand
      console.log('🃏 Step 4: Starting a hand');
      try {
        const startHandButton = await page.$('button');
        const allButtons = await page.$$eval('button', buttons => 
          buttons.map(btn => btn.textContent.trim())
        );
        console.log('Available buttons:', allButtons);
        
        // Look for Start Hand button
        const startHandExists = allButtons.some(text => text.includes('Start Hand'));
        if (startHandExists) {
          await page.evaluate(() => {
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
              if (btn.textContent.includes('Start Hand')) {
                btn.click();
                break;
              }
            }
          });
          console.log('✅ Started a hand');
          await new Promise(resolve => setTimeout(resolve, 2000));
          await page.screenshot({ path: 'test_hand_started.png', fullPage: true });
        } else {
          console.log('⚠️  Start Hand button not found');
        }
      } catch (error) {
        console.log('❌ Error starting hand:', error.message);
      }
      
      // Look for betting buttons
      console.log('💰 Step 5: Looking for betting actions');
      try {
        const allButtons = await page.$$eval('button', buttons => 
          buttons.map(btn => btn.textContent.trim())
        );
        console.log('Current available buttons:', allButtons);
        
        // Try to perform betting actions
        const bettingActions = ['Call', 'Check', 'Fold', 'Raise'];
        for (const action of bettingActions) {
          if (allButtons.some(text => text.includes(action))) {
            await page.evaluate((actionText) => {
              const buttons = document.querySelectorAll('button');
              for (let btn of buttons) {
                if (btn.textContent.includes(actionText)) {
                  btn.click();
                  break;
                }
              }
            }, action);
            console.log(`✅ Performed action: ${action}`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Take screenshot after action
            await page.screenshot({ path: `test_after_${action.toLowerCase()}.png`, fullPage: true });
            break; // Only perform one action for now
          }
        }
      } catch (error) {
        console.log('❌ Error with betting actions:', error.message);
      }
      
    } else if (gameScreenText.includes('New Game Setup')) {
      console.log('⚠️  Still on setup screen - Create Game button may not have worked');
      console.log('Current page content preview:', gameScreenText.substring(0, 200) + '...');
    } else {
      console.log('❓ Unknown screen state');
      console.log('Current page content preview:', gameScreenText.substring(0, 200) + '...');
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test_final.png', fullPage: true });
    
    console.log('🎉 Test completed!');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    await page.screenshot({ path: 'test_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

// Run the test
testPokerApp().catch(console.error);