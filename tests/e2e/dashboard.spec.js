import { test, expect } from '@playwright/test';

test.describe('Vanguard Arena AI Dashboard - E2E Specs', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to page (base URL configured in playwright.config.js)
    await page.goto('/');
  });

  test('should render header and telemetry health bar', async ({ page }) => {
    const title = page.locator('.header-title');
    await expect(title).toHaveText('VANGUARD ARENA AI');
    
    const healthBar = page.locator('#system-health-bar');
    await expect(healthBar).toBeVisible();
    await expect(healthBar.locator('#health-ai')).toContainText('NOMINAL');
  });

  test('should switch views between Operations and Fan Concierge Hub', async ({ page }) => {
    const btnFanView = page.locator('#btn-fan-view');
    const fanPanel = page.locator('#fan-view-panel');
    const staffPanel = page.locator('#staff-view-panel');

    // Switch to Fan view
    await btnFanView.click();
    await expect(fanPanel).not.toHaveClass(/hidden-panel/);
    await expect(staffPanel).toHaveClass(/hidden-panel/);
  });

  test('should draw neon SVG routing lines and tracking indicators on wayfinder execution', async ({ page }) => {
    // Switch to Fan Concierge
    await page.locator('#btn-fan-view').click();
    
    // Switch to Wayfinder tab
    await page.locator('#tab-btn-navigation').click();
    
    // Fill in route criteria and click submit
    await page.selectOption('#input-gate', 'Gate B');
    await page.selectOption('#input-sector', '104');
    await page.locator('#btn-calculate-route').click();

    // Verify SVG path coordinates exist and are visible
    const path = page.locator('#active-routing-path');
    const pathGlow = page.locator('#active-routing-path-glow');
    const pathTracker = page.locator('#active-routing-tracker');

    await expect(path).toBeVisible();
    await expect(pathGlow).toBeVisible();
    await expect(pathTracker).toBeVisible();
    
    await expect(path).toHaveAttribute('d', /M/);
    await expect(pathGlow).toHaveAttribute('d', /M/);
  });

  test('should compute Gemini crowd predictions and simulate progress loaders', async ({ page }) => {
    // Switch to Fan Concierge
    await page.locator('#btn-fan-view').click();
    
    // Go to Predictions tab
    await page.locator('#tab-btn-predictions').click();
    
    // Trigger analysis
    await page.locator('#btn-run-predictions').click();

    // Verify loading progress bar scales up
    const loader = page.locator('#predictions-loader');
    await expect(loader).toBeVisible();

    // Verify final dynamic forecast report details render
    const output = page.locator('#predictions-output-container');
    await expect(output).toBeVisible();
    await expect(output.locator('#predictions-ai-content')).toContainText('Strategy');
  });

  test('should toggle Accessibility Mode and strip CRT scanlines', async ({ page }) => {
    const btnAccessibility = page.locator('#btn-accessibility-mode');
    const body = page.locator('body');
    const bezel = page.locator('.crt-screen-bezel');

    // Enable Accessibility
    await btnAccessibility.click();
    await expect(body).toHaveClass(/accessibility-mode/);
    await expect(bezel).toBeHidden();

    // Disable Accessibility
    await btnAccessibility.click();
    await expect(body).not.toHaveClass(/accessibility-mode/);
    await expect(bezel).toBeVisible();
  });

  test('should support AI Concierge Chat flow, showing spinners and confidence badges', async ({ page }) => {
    // Switch to Fan Concierge
    await page.locator('#btn-fan-view').click();
    
    const chatInput = page.locator('#chat-input');
    const btnSend = page.locator('#btn-chat-send');
    const messages = page.locator('#chat-messages-log');

    // Type query
    await chatInput.fill('Where is the restroom near Sector 104?');
    await btnSend.click();

    // Verify spinning bar loader is displayed during dispatch
    const spinner = messages.locator('.ai-spinner-container');
    await expect(spinner).toBeVisible();

    // Verify reply details and confidence scores print
    const aiResponse = messages.locator('.chat-bubble.ai-bubble').last();
    await expect(aiResponse).toBeVisible();
    await expect(aiResponse.locator('.ai-confidence-badge')).toContainText('CONF');
  });
});
