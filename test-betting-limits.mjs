#!/usr/bin/env node

/**
 * Test script for betting limit functionality
 * Tests No Limit, Pot Limit, and Fixed Limit poker betting rules
 */

import puppeteer from 'puppeteer';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBettingLimits() {
  console.log('🎰 Starting Betting Limit Tests...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await delay(1000);
    
    console.log('✅ Page loaded successfully');
    
    // Test 1: No Limit Game
    console.log('\n📝 Test 1: No Limit Hold\'em');
    await testNoLimit(page);
    
    // Refresh for next test
    await page.reload();
    await delay(1000);
    
    // Test 2: Pot Limit Game
    console.log('\n📝 Test 2: Pot Limit Hold\'em');
    await testPotLimit(page);
    
    // Refresh for next test
    await page.reload();
    await delay(1000);
    
    // Test 3: Fixed Limit Game  
    console.log('\n📝 Test 3: Fixed Limit Hold\'em');
    await testFixedLimit(page);
    
    console.log('\n✅ All betting limit tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

async function testNoLimit(page) {
  // Create game with No Limit
  await page.type('input[placeholder="Enter game name"]', 'No Limit Test');
  
  // Check if betting limit selector exists
  const hasLimitSelector = await page.$('select#bettingLimit') !== null;
  if (hasLimitSelector) {
    await page.select('select#bettingLimit', 'no_limit');
  }
  
  // Add players
  await page.type('input[placeholder="Enter player name"]', 'Alice');
  await page.click('button:has-text("Add Player")');
  await delay(500);
  
  await page.type('input[placeholder="Enter player name"]', 'Bob');
  await page.click('button:has-text("Add Player")');
  await delay(500);
  
  // Create game
  await page.click('button:has-text("Create Game")');
  await delay(1000);
  
  // Start hand
  await page.click('button:has-text("Start Hand")');
  await delay(1000);
  
  // Check for All In button (should be visible in No Limit)
  const allInButton = await page.$('.action-button.all-in');
  if (!allInButton) {
    throw new Error('No Limit game should have All In button visible');
  }
  console.log('  ✓ All In button visible in No Limit');
  
  // Test raise modal has All In option
  const raiseButton = await page.$('.action-button.raise');
  if (raiseButton) {
    await raiseButton.click();
    await delay(500);
    
    const allInInModal = await page.$('.all-in-in-modal');
    if (!allInInModal) {
      throw new Error('No Limit raise modal should have All In option');
    }
    console.log('  ✓ All In option in raise modal for No Limit');
    
    // Close modal
    await page.keyboard.press('Escape');
    await delay(500);
  }
}

async function testPotLimit(page) {
  // Create game with Pot Limit
  await page.type('input[placeholder="Enter game name"]', 'Pot Limit Test');
  
  // Check if betting limit selector exists
  const hasLimitSelector = await page.$('select#bettingLimit') !== null;
  if (hasLimitSelector) {
    await page.select('select#bettingLimit', 'pot_limit');
  }
  
  // Set starting stack and blinds for easier testing
  await page.evaluate(() => {
    const stackInput = document.querySelector('input[placeholder*="starting stack"]');
    if (stackInput) {
      stackInput.value = '1000';
      stackInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const smallBlindInput = document.querySelector('input[placeholder*="small blind"]');
    if (smallBlindInput) {
      smallBlindInput.value = '10';
      smallBlindInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const bigBlindInput = document.querySelector('input[placeholder*="big blind"]');
    if (bigBlindInput) {
      bigBlindInput.value = '20';
      bigBlindInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  
  // Add players
  await page.type('input[placeholder="Enter player name"]', 'Charlie');
  await page.click('button:has-text("Add Player")');
  await delay(500);
  
  await page.type('input[placeholder="Enter player name"]', 'Diana');
  await page.click('button:has-text("Add Player")');
  await delay(500);
  
  // Create game
  await page.click('button:has-text("Create Game")');
  await delay(1000);
  
  // Start hand
  await page.click('button:has-text("Start Hand")');
  await delay(1000);
  
  // Check for All In button (should still be visible in Pot Limit)
  const allInButton = await page.$('.action-button.all-in');
  if (!allInButton) {
    throw new Error('Pot Limit game should have All In button visible');
  }
  console.log('  ✓ All In button visible in Pot Limit');
  
  // Test pot size raise button
  const raiseButton = await page.$('.action-button.raise');
  if (raiseButton) {
    await raiseButton.click();
    await delay(500);
    
    const potRaiseButton = await page.$('.quick-bet-button.pot-raise');
    if (!potRaiseButton) {
      throw new Error('Pot Limit raise modal should have POT button');
    }
    console.log('  ✓ POT raise button in Pot Limit modal');
    
    // Get pot size info
    const potInfo = await page.evaluate(() => {
      const potButton = document.querySelector('.quick-bet-button.pot-raise');
      return potButton ? potButton.textContent : '';
    });
    console.log(`  ✓ Pot raise calculation shown: ${potInfo}`);
    
    // Close modal
    await page.keyboard.press('Escape');
    await delay(500);
  }
}

async function testFixedLimit(page) {
  // Create game with Fixed Limit
  await page.type('input[placeholder="Enter game name"]', 'Fixed Limit Test');
  
  // Check if betting limit selector exists
  const hasLimitSelector = await page.$('select#bettingLimit') !== null;
  if (hasLimitSelector) {
    await page.select('select#bettingLimit', 'fixed_limit');
  }
  
  // Add players
  await page.type('input[placeholder="Enter player name"]', 'Eve');
  await page.click('button:has-text("Add Player")');
  await delay(500);
  
  await page.type('input[placeholder="Enter player name"]', 'Frank');
  await page.click('button:has-text("Add Player")');
  await delay(500);
  
  // Create game
  await page.click('button:has-text("Create Game")');
  await delay(1000);
  
  // Start hand
  await page.click('button:has-text("Start Hand")');
  await delay(1000);
  
  // Check that All In button is NOT visible in Fixed Limit
  const allInButton = await page.$('.action-button.all-in');
  if (allInButton) {
    throw new Error('Fixed Limit game should NOT have All In button visible');
  }
  console.log('  ✓ All In button hidden in Fixed Limit');
  
  // Test fixed bet amount in bet modal
  const betButton = await page.$('.action-button.bet');
  if (betButton) {
    await betButton.click();
    await delay(500);
    
    const fixedLimitInfo = await page.$('.fixed-limit-info');
    if (!fixedLimitInfo) {
      throw new Error('Fixed Limit bet modal should show fixed amount');
    }
    
    const fixedText = await page.evaluate(() => {
      const info = document.querySelector('.fixed-limit-info');
      return info ? info.textContent : '';
    });
    console.log(`  ✓ Fixed Limit bet info shown: ${fixedText}`);
    
    // Close modal
    await page.keyboard.press('Escape');
    await delay(500);
  }
  
  // Fold to get to next player with a current bet
  await page.click('.action-button.fold');
  await delay(500);
  
  // Test fixed raise amount
  const raiseButton = await page.$('.action-button.raise');
  if (raiseButton) {
    await raiseButton.click();
    await delay(500);
    
    const fixedLimitInfo = await page.$('.fixed-limit-info');
    if (!fixedLimitInfo) {
      throw new Error('Fixed Limit raise modal should show fixed amount');
    }
    
    const fixedText = await page.evaluate(() => {
      const info = document.querySelector('.fixed-limit-info');
      return info ? info.textContent : '';
    });
    console.log(`  ✓ Fixed Limit raise info shown: ${fixedText}`);
    
    // Close modal
    await page.keyboard.press('Escape');
  }
}

// Run the tests
testBettingLimits().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});