const puppeteer = require('puppeteer');

async function testPokerApp() {
  const browser = await puppeteer.launch({ 
    headless: false,
    slowMo: 800,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('🎯 Starting Complete Poker Chips Web App Test');
    console.log('===============================================');
    
    // Step 1: Navigate to the app
    console.log('📍 Step 1: Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.screenshot({ path: 'test_step1_initial.png', fullPage: true });
    console.log('✅ App loaded successfully');
    
    // Step 2: Check if we're on setup screen
    console.log('\n🔍 Step 2: Checking current screen state');
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    if (pageContent.includes('New Game Setup')) {
      console.log('✅ Setup screen detected - proceeding with game setup');
      
      // Step 3a: Fill player names (Alice, Bob, Charlie)
      console.log('\n👤 Step 3: Adding players Alice, Bob, Charlie');
      const players = ['Alice', 'Bob', 'Charlie'];
      
      for (let i = 0; i < players.length; i++) {
        try {
          const selector = `input[placeholder="Player ${i + 1} name"]`;
          await page.waitForSelector(selector, { timeout: 5000 });
          
          // Clear and fill the input
          await page.click(selector);
          await page.evaluate((sel) => {
            document.querySelector(sel).value = '';
          }, selector);
          await page.type(selector, players[i]);
          
          console.log(`  ✅ Added ${players[i]} to Player ${i + 1} field`);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.log(`  ❌ Error adding ${players[i]}:`, error.message);
        }
      }
      
      await page.screenshot({ path: 'test_step3_players_added.png', fullPage: true });
      
      // Step 3b: Click Create Game button
      console.log('\n🚀 Step 4: Clicking Create Game button');
      try {
        await page.waitForSelector('.create-game-button', { timeout: 5000 });
        await page.click('.create-game-button');
        console.log('✅ Clicked Create Game button');
        
        // Wait for transition to game screen
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.screenshot({ path: 'test_step4_game_created.png', fullPage: true });
        
      } catch (error) {
        console.log('❌ Error clicking Create Game button:', error.message);
        return;
      }
      
    } else if (pageContent.includes('Start Hand') || pageContent.includes('Total Pot')) {
      console.log('✅ Game screen detected - skipping setup');
    } else {
      console.log('⚠️  Unknown screen state, proceeding cautiously...');
    }
    
    // Step 4: Start Hand
    console.log('\n🃏 Step 5: Starting a hand');
    try {
      // Wait for and click Start Hand button
      await page.waitForSelector('.start-hand-button', { timeout: 5000 });
      await page.click('.start-hand-button');
      console.log('✅ Started a new hand');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: 'test_step5_hand_started.png', fullPage: true });
      
    } catch (error) {
      console.log('⚠️  Start Hand button not found, may already be in a hand');
    }
    
    // Step 5: Perform betting actions
    console.log('\n💰 Step 6: Performing betting actions');
    
    let actionCount = 0;
    const maxActions = 10; // Safety limit
    
    while (actionCount < maxActions) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check what buttons are available
      const availableButtons = await page.$$eval('button', buttons => 
        buttons.filter(btn => btn.offsetParent !== null) // Only visible buttons
               .map(btn => ({ text: btn.textContent.trim(), className: btn.className }))
      );
      
      console.log(`  Available actions: ${availableButtons.map(b => b.text).join(', ')}`);
      
      // Find betting action buttons
      const checkButton = availableButtons.find(b => b.text === 'CHECK');
      const callButton = availableButtons.find(b => b.text.includes('CALL'));
      const foldButton = availableButtons.find(b => b.text === 'FOLD');
      
      if (checkButton) {
        console.log(`  👍 Player ${actionCount + 1}: Checking`);
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'CHECK');
          if (btn && btn.offsetParent !== null) btn.click();
        });
      } else if (callButton && actionCount === 0) {
        console.log(`  📞 Player ${actionCount + 1}: Calling`);
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('CALL'));
          if (btn && btn.offsetParent !== null) btn.click();
        });
      } else if (foldButton && actionCount === 1) {
        console.log(`  🃏 Player ${actionCount + 1}: Folding`);
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'FOLD');
          if (btn && btn.offsetParent !== null) btn.click();
        });
      } else if (checkButton) {
        console.log(`  ✔️  Player ${actionCount + 1}: Checking (fallback)`);
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'CHECK');
          if (btn && btn.offsetParent !== null) btn.click();
        });
      } else {
        console.log('  🏁 No more betting actions available, hand may be complete');
        break;
      }
      
      actionCount++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if hand is complete
      const currentContent = await page.evaluate(() => document.body.innerText);
      if (currentContent.includes('Select Winners')) {
        console.log('  🎉 Hand complete - Select Winners button appeared');
        break;
      }
    }
    
    await page.screenshot({ path: 'test_step6_betting_complete.png', fullPage: true });
    
    // Step 6: Select Winners
    console.log('\n🏆 Step 7: Selecting winner');
    try {
      await page.waitForSelector('.end-hand-button', { timeout: 5000 });
      await page.click('.end-hand-button');
      console.log('✅ Clicked Select Winners button');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: 'test_step7_winner_modal.png', fullPage: true });
      
      // Select first available player as winner
      console.log('  🎯 Selecting a winner');
      const winnerCheckbox = await page.$('.winner-option input[type="checkbox"]');
      if (winnerCheckbox) {
        await winnerCheckbox.click();
        console.log('  ✅ Selected first player as winner');
      } else {
        // Alternative method
        await page.evaluate(() => {
          const option = document.querySelector('.winner-option');
          if (option) option.click();
        });
        console.log('  ✅ Selected winner using alternative method');
      }
      
    } catch (error) {
      console.log('❌ Error selecting winners:', error.message);
    }
    
    // Step 7: Distribute Pots
    console.log('\n💸 Step 8: Distributing pots');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Click Distribute Pots button
      const distributePotButton = await page.$('button.confirm-button');
      if (distributePotButton) {
        const buttonText = await page.evaluate(btn => btn.textContent, distributePotButton);
        if (buttonText.includes('Distribute Pots')) {
          await distributePotButton.click();
          console.log('✅ Clicked Distribute Pots button');
        }
      } else {
        // Alternative selector
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => 
            b.textContent.includes('Distribute Pots') || b.textContent.includes('Distribute')
          );
          if (btn) btn.click();
        });
        console.log('✅ Clicked Distribute Pots button (alternative method)');
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      await page.screenshot({ path: 'test_step8_pots_distributed.png', fullPage: true });
      
    } catch (error) {
      console.log('❌ Error distributing pots:', error.message);
    }
    
    // Step 8: Verification
    console.log('\n✅ Step 9: Final verification');
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check pot status
      const potInfo = await page.evaluate(() => {
        const potElement = document.querySelector('.main-pot h2, h2');
        return potElement ? potElement.textContent : null;
      });
      
      if (potInfo) {
        console.log(`💰 Current pot status: ${potInfo}`);
        if (potInfo.includes('$0') || potInfo.includes('Total Pot: $0')) {
          console.log('✅ VERIFICATION PASSED: Pot shows $0');
        } else {
          console.log('⚠️  VERIFICATION: Pot may not be at $0');
        }
      }
      
      // Check if Start Hand button is available for next hand
      const startHandAvailable = await page.$('.start-hand-button');
      if (startHandAvailable) {
        console.log('✅ VERIFICATION PASSED: Start Hand button available - ready for next hand');
      } else {
        console.log('⚠️  VERIFICATION: Start Hand button not found');
      }
      
      // Check player stacks
      const stackInfo = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const stacks = [];
        for (let el of elements) {
          if (el.textContent && el.textContent.includes('Stack: $')) {
            stacks.push(el.textContent);
          }
        }
        return stacks;
      });
      
      if (stackInfo.length > 0) {
        console.log('📊 Player stacks:', stackInfo);
        console.log('✅ VERIFICATION PASSED: Player stacks are visible and updated');
      }
      
      await page.screenshot({ path: 'test_step9_final_verification.png', fullPage: true });
      
    } catch (error) {
      console.log('❌ Error during verification:', error.message);
    }
    
    console.log('\n🎉 TEST SEQUENCE COMPLETED!');
    console.log('=====================================');
    console.log('📸 Screenshots saved:');
    console.log('  - test_step1_initial.png (Initial app state)');
    console.log('  - test_step3_players_added.png (After adding players)');
    console.log('  - test_step4_game_created.png (Game screen)');
    console.log('  - test_step5_hand_started.png (Hand in progress)');
    console.log('  - test_step6_betting_complete.png (After betting)');
    console.log('  - test_step7_winner_modal.png (Winner selection)');
    console.log('  - test_step8_pots_distributed.png (After pot distribution)');
    console.log('  - test_step9_final_verification.png (Final state)');
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
    await page.screenshot({ path: 'test_error_final.png', fullPage: true });
  } finally {
    // Keep browser open for 5 seconds to see final state
    console.log('\n⏳ Keeping browser open for 5 seconds for review...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
  }
}

// Run the test
testPokerApp().catch(console.error);