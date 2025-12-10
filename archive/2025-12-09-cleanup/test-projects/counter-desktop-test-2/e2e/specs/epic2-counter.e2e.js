/**
 * Epic 2: Counter - E2E Tests
 * Tests counter functionality for the Counter Desktop App
 */

describe('Epic 2: Counter', () => {
  // Login before each test (fixture from Test Independence Matrix)
  beforeEach(async () => {
    // Wait for login form
    const loginForm = await $('[data-testid="login-form"]');
    await loginForm.waitForDisplayed({ timeout: 10000 });

    // Login with valid credentials
    const usernameInput = await $('[data-testid="username-input"]');
    const passwordInput = await $('[data-testid="password-input"]');
    const loginButton = await $('[data-testid="login-button"]');

    await usernameInput.setValue('user');
    await passwordInput.setValue('pass');
    await loginButton.click();

    // Wait for counter view
    const counterView = await $('[data-testid="counter-view"]');
    await counterView.waitForDisplayed({ timeout: 5000 });
  });

  // E2E-003: Counter Display (US-003)
  describe('E2E-003: Counter Display', () => {
    it('should display counter with initial value of 0', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      await counterDisplay.waitForDisplayed();

      const counterText = await counterDisplay.getText();
      expect(counterText).toBe('0');
    });

    it('should display all control buttons', async () => {
      const incrementButton = await $('[data-testid="increment-button"]');
      const decrementButton = await $('[data-testid="decrement-button"]');
      const resetButton = await $('[data-testid="reset-button"]');

      expect(await incrementButton.isDisplayed()).toBe(true);
      expect(await decrementButton.isDisplayed()).toBe(true);
      expect(await resetButton.isDisplayed()).toBe(true);
    });

    // E2E-003a: Counter display is centered and large
    it('E2E-003a: Counter display has appropriate styling', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      await counterDisplay.waitForDisplayed();

      const fontSize = await counterDisplay.getCSSProperty('font-size');
      // Font size should be at least 24px
      const fontSizeValue = parseInt(fontSize.value, 10);
      expect(fontSizeValue).toBeGreaterThanOrEqual(24);
    });
  });

  // E2E-004: Increment Counter (US-004)
  describe('E2E-004: Increment Counter', () => {
    it('should increment counter by 1 when clicking +', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const incrementButton = await $('[data-testid="increment-button"]');

      // Get initial value
      const initialText = await counterDisplay.getText();
      expect(initialText).toBe('0');

      // Click increment
      await incrementButton.click();
      await browser.pause(200);

      // Verify counter incremented to 1
      const newText = await counterDisplay.getText();
      expect(newText).toBe('1');

      // Click again
      await incrementButton.click();
      await browser.pause(200);

      // Verify counter is now 2
      const finalText = await counterDisplay.getText();
      expect(finalText).toBe('2');
    });

    // E2E-004a: Multiple rapid clicks
    it('E2E-004a: Multiple rapid clicks increment correctly', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const incrementButton = await $('[data-testid="increment-button"]');

      // Click 5 times quickly
      for (let i = 0; i < 5; i++) {
        await incrementButton.click();
      }
      await browser.pause(500);

      const counterText = await counterDisplay.getText();
      expect(counterText).toBe('5');
    });

    // E2E-004b: Increment from negative
    it('E2E-004b: Increment from negative value works', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const decrementButton = await $('[data-testid="decrement-button"]');
      const incrementButton = await $('[data-testid="increment-button"]');

      // Decrement 5 times to get to -5
      for (let i = 0; i < 5; i++) {
        await decrementButton.click();
      }
      await browser.pause(200);

      // Verify at -5
      let counterText = await counterDisplay.getText();
      expect(counterText).toBe('-5');

      // Increment once
      await incrementButton.click();
      await browser.pause(200);

      // Should be -4
      counterText = await counterDisplay.getText();
      expect(counterText).toBe('-4');
    });
  });

  // E2E-005: Decrement Counter (US-005)
  describe('E2E-005: Decrement Counter', () => {
    it('should decrement counter by 1 when clicking -', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const decrementButton = await $('[data-testid="decrement-button"]');

      // Get initial value
      const initialText = await counterDisplay.getText();
      expect(initialText).toBe('0');

      // Click decrement
      await decrementButton.click();
      await browser.pause(200);

      // Verify counter decremented to -1
      const newText = await counterDisplay.getText();
      expect(newText).toBe('-1');

      // Click again
      await decrementButton.click();
      await browser.pause(200);

      // Verify counter is now -2
      const finalText = await counterDisplay.getText();
      expect(finalText).toBe('-2');
    });

    // E2E-005a: Counter can go negative from zero
    it('E2E-005a: Counter can go negative from zero', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const decrementButton = await $('[data-testid="decrement-button"]');

      // Start at 0, click decrement
      await decrementButton.click();
      await browser.pause(200);

      const counterText = await counterDisplay.getText();
      expect(counterText).toBe('-1');
    });

    // E2E-005b: Multiple rapid decrements
    it('E2E-005b: Multiple rapid decrements work correctly', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const decrementButton = await $('[data-testid="decrement-button"]');

      // Click 5 times quickly
      for (let i = 0; i < 5; i++) {
        await decrementButton.click();
      }
      await browser.pause(500);

      const counterText = await counterDisplay.getText();
      expect(counterText).toBe('-5');
    });
  });

  // E2E-006: Reset Counter (US-006)
  describe('E2E-006: Reset Counter', () => {
    it('should reset counter to 0 when clicking Reset', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const incrementButton = await $('[data-testid="increment-button"]');
      const resetButton = await $('[data-testid="reset-button"]');

      // Increment to 5
      for (let i = 0; i < 5; i++) {
        await incrementButton.click();
      }
      await browser.pause(200);

      // Verify at 5
      let counterText = await counterDisplay.getText();
      expect(counterText).toBe('5');

      // Click reset
      await resetButton.click();
      await browser.pause(200);

      // Verify back to 0
      counterText = await counterDisplay.getText();
      expect(counterText).toBe('0');
    });

    // E2E-006a: Reset from negative
    it('E2E-006a: Reset from negative value works', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const decrementButton = await $('[data-testid="decrement-button"]');
      const resetButton = await $('[data-testid="reset-button"]');

      // Decrement to -3
      for (let i = 0; i < 3; i++) {
        await decrementButton.click();
      }
      await browser.pause(200);

      // Verify at -3
      let counterText = await counterDisplay.getText();
      expect(counterText).toBe('-3');

      // Click reset
      await resetButton.click();
      await browser.pause(200);

      // Should be 0
      counterText = await counterDisplay.getText();
      expect(counterText).toBe('0');
    });

    // E2E-006b: Reset when already zero
    it('E2E-006b: Reset when already at zero has no error', async () => {
      const counterDisplay = await $('[data-testid="counter-display"]');
      const resetButton = await $('[data-testid="reset-button"]');

      // Verify at 0
      let counterText = await counterDisplay.getText();
      expect(counterText).toBe('0');

      // Click reset anyway
      await resetButton.click();
      await browser.pause(200);

      // Should still be 0
      counterText = await counterDisplay.getText();
      expect(counterText).toBe('0');
    });
  });
});
