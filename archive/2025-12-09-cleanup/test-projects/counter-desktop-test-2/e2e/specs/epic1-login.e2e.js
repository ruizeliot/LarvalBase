/**
 * Epic 1: Login - E2E Tests
 * Tests login functionality for the Counter Desktop App
 */

describe('Epic 1: Login', () => {
  // E2E-001: App Window Launches with Login (US-001)
  describe('E2E-001: App Window Launches with Login', () => {
    it('should display the login screen on launch', async () => {
      // Wait for login form to be visible
      const loginForm = await $('[data-testid="login-form"]');
      await loginForm.waitForDisplayed({ timeout: 10000 });

      // Verify login form elements exist
      const usernameInput = await $('[data-testid="username-input"]');
      const passwordInput = await $('[data-testid="password-input"]');
      const loginButton = await $('[data-testid="login-button"]');

      expect(await usernameInput.isDisplayed()).toBe(true);
      expect(await passwordInput.isDisplayed()).toBe(true);
      expect(await loginButton.isDisplayed()).toBe(true);
    });

    // E2E-001a: Window dimensions are reasonable
    it('E2E-001a: Window dimensions are reasonable (min 400x300)', async () => {
      const windowSize = await browser.getWindowSize();
      expect(windowSize.width).toBeGreaterThanOrEqual(400);
      expect(windowSize.height).toBeGreaterThanOrEqual(300);
    });

    // E2E-001b: Username field has focus on load
    it('E2E-001b: Username field has focus on load', async () => {
      const usernameInput = await $('[data-testid="username-input"]');
      await usernameInput.waitForDisplayed();

      // Check if username field is focused
      const isFocused = await usernameInput.isFocused();
      expect(isFocused).toBe(true);
    });
  });

  // E2E-002: User Login (US-002)
  describe('E2E-002: User Login', () => {
    it('should login with valid credentials and show counter view', async () => {
      // Wait for login form
      const loginForm = await $('[data-testid="login-form"]');
      await loginForm.waitForDisplayed();

      // Enter valid credentials
      const usernameInput = await $('[data-testid="username-input"]');
      const passwordInput = await $('[data-testid="password-input"]');
      const loginButton = await $('[data-testid="login-button"]');

      await usernameInput.setValue('user');
      await passwordInput.setValue('pass');
      await loginButton.click();

      // Wait for counter view to appear
      const counterView = await $('[data-testid="counter-view"]');
      await counterView.waitForDisplayed({ timeout: 5000 });

      // Verify counter display shows "0"
      const counterDisplay = await $('[data-testid="counter-display"]');
      const counterText = await counterDisplay.getText();
      expect(counterText).toBe('0');
    });

    // E2E-002a: Invalid credentials show error
    it('E2E-002a: Invalid credentials show error message', async () => {
      const loginForm = await $('[data-testid="login-form"]');
      await loginForm.waitForDisplayed();

      const usernameInput = await $('[data-testid="username-input"]');
      const passwordInput = await $('[data-testid="password-input"]');
      const loginButton = await $('[data-testid="login-button"]');

      await usernameInput.setValue('wrong');
      await passwordInput.setValue('wrong');
      await loginButton.click();

      // Wait for error message
      await browser.pause(500);
      const errorMessage = await $('[data-testid="login-error"]');
      await errorMessage.waitForDisplayed({ timeout: 5000 });

      const errorText = await errorMessage.getText();
      expect(errorText.toLowerCase()).toContain('invalid');
    });

    // E2E-002b: Empty username rejected
    it('E2E-002b: Empty username is rejected', async () => {
      const loginForm = await $('[data-testid="login-form"]');
      await loginForm.waitForDisplayed();

      const passwordInput = await $('[data-testid="password-input"]');
      const loginButton = await $('[data-testid="login-button"]');

      // Only enter password, leave username empty
      await passwordInput.setValue('pass');
      await loginButton.click();

      await browser.pause(500);
      const errorMessage = await $('[data-testid="login-error"]');
      await errorMessage.waitForDisplayed({ timeout: 5000 });

      expect(await errorMessage.isDisplayed()).toBe(true);
    });

    // E2E-002c: Empty password rejected
    it('E2E-002c: Empty password is rejected', async () => {
      const loginForm = await $('[data-testid="login-form"]');
      await loginForm.waitForDisplayed();

      const usernameInput = await $('[data-testid="username-input"]');
      const loginButton = await $('[data-testid="login-button"]');

      // Only enter username, leave password empty
      await usernameInput.setValue('user');
      await loginButton.click();

      await browser.pause(500);
      const errorMessage = await $('[data-testid="login-error"]');
      await errorMessage.waitForDisplayed({ timeout: 5000 });

      expect(await errorMessage.isDisplayed()).toBe(true);
    });

    // E2E-002d: Error clears on typing
    it('E2E-002d: Error message clears when user types', async () => {
      const loginForm = await $('[data-testid="login-form"]');
      await loginForm.waitForDisplayed();

      const usernameInput = await $('[data-testid="username-input"]');
      const passwordInput = await $('[data-testid="password-input"]');
      const loginButton = await $('[data-testid="login-button"]');

      // Enter invalid credentials to trigger error
      await usernameInput.setValue('wrong');
      await passwordInput.setValue('wrong');
      await loginButton.click();

      await browser.pause(500);
      const errorMessage = await $('[data-testid="login-error"]');
      await errorMessage.waitForDisplayed({ timeout: 5000 });

      // Start typing again
      await usernameInput.addValue('x');
      await browser.pause(300);

      // Error should be hidden now
      const isErrorDisplayed = await errorMessage.isDisplayed();
      expect(isErrorDisplayed).toBe(false);
    });

    // E2E-002e: Password field masks input
    it('E2E-002e: Password field masks input', async () => {
      const passwordInput = await $('[data-testid="password-input"]');
      await passwordInput.waitForDisplayed();

      const inputType = await passwordInput.getAttribute('type');
      expect(inputType).toBe('password');
    });
  });
});
