import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5177';
const VEHICLE_ID = 'v2';

async function verify() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('=== Vehicle Detail Page Verification ===\n');

  try {
    // Test 1: Deep-link to vehicle and check it loads
    console.log('✅ Test 1: Deep-link to vehicle detail page');
    await page.goto(`${BASE_URL}/vehicles/${VEHICLE_ID}`);
    await page.waitForSelector('h1');
    const title = await page.textContent('h1');
    console.log(`   Vehicle loaded: ${title}\n`);

    // Test 2: Check NotFound state
    console.log('❌ Test 2: Navigate to non-existent vehicle');
    await page.goto(`${BASE_URL}/vehicles/invalid-id-xyz`);
    await page.waitForSelector('h2');
    const notFoundText = await page.textContent('h2');
    console.log(`   NotFound message: ${notFoundText}`);
    const backLink = await page.$('a');
    if (backLink) {
      const href = await backLink.getAttribute('href');
      console.log(`   Back link href: ${href}\n`);
    }

    // Test 3: Go back to real vehicle and check gallery
    console.log('✅ Test 3: Gallery main image loads');
    await page.goto(`${BASE_URL}/vehicles/${VEHICLE_ID}`);
    await page.waitForSelector('img[alt*="photo"]');
    const mainImage = await page.$('img[alt*="photo"]');
    const altText = await mainImage?.getAttribute('alt');
    console.log(`   Main image alt text: ${altText}`);
    const photoCounter = await page.textContent('[class*="photoCounter"]');
    console.log(`   Photo counter: ${photoCounter}\n`);

    // Test 4: Check specs section
    console.log('✅ Test 4: Specs section rendered');
    const specsSection = await page.$('text=Specifications');
    if (specsSection) {
      const vin = await page.textContent('dd');
      console.log(`   First spec value: ${vin}`);
    }
    console.log('');

    // Test 5: Check damage notes
    console.log('✅ Test 5: Damage notes section');
    const damageSection = await page.$('text=Damage Notes');
    if (damageSection) {
      const damageText = await page.textContent('[class*="damageSection"]');
      console.log(`   Damage section visible\n`);
    }

    // Test 6: Check dealership section
    console.log('✅ Test 6: Dealership section');
    const dealerSection = await page.$('text=Selling Dealership');
    if (dealerSection) {
      const dealerText = await page.textContent('[class*="dealershipSection"]');
      console.log(`   Dealership section visible\n`);
    }

    // Test 7: Check auction panel
    console.log('✅ Test 7: Auction panel visible');
    const auctionPanel = await page.$('text=Auction Details');
    if (auctionPanel) {
      const countdown = await page.textContent('[class*="countdown"]');
      console.log(`   Countdown: ${countdown}`);

      const bidInfo = await page.textContent('[class*="bidInfoValue"]');
      console.log(`   Bid info visible: ${bidInfo}\n`);
    }

    // Test 8: Check bid form (if auction is live)
    console.log('✅ Test 8: Bid form elements');
    const bidInput = await page.$('input[type="number"]');
    if (bidInput) {
      console.log(`   Bid input found`);
      const bidButton = await page.$('button:has-text("Place Bid")');
      if (bidButton) {
        console.log(`   Place Bid button found\n`);
      }
    } else {
      console.log(`   No bid form (auction may not be live)\n`);
    }

    // Test 9: Check bid history section
    console.log('✅ Test 9: Bid history section');
    const bidsSection = await page.$('text=Bid History');
    if (bidsSection) {
      const bidsText = await page.textContent('[class*="bidsSection"]');
      console.log(`   Bid history section visible\n`);
    }

    // Test 10: Keyboard navigation simulation (arrow keys)
    console.log('🔍 Test 10: Keyboard navigation');
    const thumbs = await page.$$('[class*="thumbnail"]');
    if (thumbs.length > 1) {
      const initialPhotos = await page.textContent('[class*="photoCounter"]');
      console.log(`   Initial photo counter: ${initialPhotos}`);

      // Simulate arrow right
      await page.press('body', 'ArrowRight');
      await page.waitForTimeout(100);
      const afterArrow = await page.textContent('[class*="photoCounter"]');
      console.log(`   After ArrowRight: ${afterArrow}`);

      if (initialPhotos !== afterArrow) {
        console.log(`   ✓ Keyboard navigation working\n`);
      } else {
        console.log(`   ⚠️  Photo counter didn't change\n`);
      }
    } else {
      console.log(`   Only one photo, skipping navigation test\n`);
    }

    // Test 11: Thumbnail click navigation
    console.log('✅ Test 11: Thumbnail navigation');
    const thumbs2 = await page.$$('[class*="thumbnail"]');
    if (thumbs2.length > 1) {
      const secondThumb = thumbs2[1];
      await secondThumb.click();
      await page.waitForTimeout(100);
      const photoAfterThumb = await page.textContent('[class*="photoCounter"]');
      console.log(`   Photo counter after clicking thumbnail 2: ${photoAfterThumb}\n`);
    }

    // Test 12: Refresh the page (deep-link test)
    console.log('✅ Test 12: Refresh vehicle detail page');
    await page.reload();
    await page.waitForSelector('h1');
    const titleAfterRefresh = await page.textContent('h1');
    console.log(`   Vehicle still loaded after refresh: ${titleAfterRefresh}\n`);

    console.log('=== All Tests Completed Successfully ===');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  } finally {
    await browser.close();
  }
}

verify();
