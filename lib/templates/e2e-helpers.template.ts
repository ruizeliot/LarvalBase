/**
 * E2E Test Helpers - Verbose Assertions & Utilities
 * Pipeline v9.1 - Better visibility into test failures
 *
 * USAGE: Copy to your project as e2e/helpers/verbose.ts
 *
 * These helpers wrap common operations with:
 * - Descriptive console output
 * - Better error messages showing what was expected vs found
 * - Automatic retries with progress logging
 * - Screenshots at key checkpoints
 */

/**
 * Wait for element with verbose logging
 * Shows what selector we're looking for and reports when found/timeout
 */
export async function waitForElement(
  selector: string,
  options: {
    timeout?: number;
    description?: string;
    shouldExist?: boolean;
  } = {}
): Promise<WebdriverIO.Element | null> {
  const { timeout = 5000, description, shouldExist = true } = options;
  const desc = description || selector;

  console.log(`    [wait] Looking for: ${desc}`);
  console.log(`           Selector: ${selector}`);

  const startTime = Date.now();

  try {
    const element = await $(selector);

    if (shouldExist) {
      await element.waitForExist({ timeout });
      const elapsed = Date.now() - startTime;
      console.log(`    [wait] Found: ${desc} (${elapsed}ms)`);
      return element;
    } else {
      // Waiting for element to NOT exist
      await browser.waitUntil(
        async () => !(await element.isExisting()),
        { timeout, timeoutMsg: `Element still exists: ${selector}` }
      );
      const elapsed = Date.now() - startTime;
      console.log(`    [wait] Gone: ${desc} (${elapsed}ms)`);
      return null;
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`    [wait] TIMEOUT after ${elapsed}ms: ${desc}`);
    console.log(`           Selector: ${selector}`);

    // Try to provide more context
    const allElements = await $$(selector.split(' ')[0] || '*');
    if (allElements.length > 0) {
      console.log(`           Note: Found ${allElements.length} elements with base selector`);
    }

    throw new Error(
      `Element not found: ${desc}\n` +
      `  Selector: ${selector}\n` +
      `  Timeout: ${timeout}ms\n` +
      `  Tip: Check if element exists in DOM, or if selector is correct`
    );
  }
}

/**
 * Click element with verbose logging
 * Reports the click and any errors with context
 */
export async function clickElement(
  selector: string,
  description?: string
): Promise<void> {
  const desc = description || selector;
  console.log(`    [click] ${desc}`);

  try {
    const element = await waitForElement(selector, { description });
    if (!element) throw new Error('Element not found');

    // Check if clickable
    const isDisplayed = await element.isDisplayed();
    const isEnabled = await element.isEnabled();

    if (!isDisplayed) {
      console.log(`    [click] WARNING: Element not displayed`);
    }
    if (!isEnabled) {
      console.log(`    [click] WARNING: Element not enabled`);
    }

    await element.click();
    console.log(`    [click] OK: ${desc}`);
  } catch (error: any) {
    console.log(`    [click] FAILED: ${desc}`);
    console.log(`            Error: ${error.message?.substring(0, 100)}`);
    throw error;
  }
}

/**
 * Type text into element with verbose logging
 * Shows what we're typing and where
 */
export async function typeInto(
  selector: string,
  value: string,
  options: {
    description?: string;
    clearFirst?: boolean;
  } = {}
): Promise<void> {
  const { description, clearFirst = true } = options;
  const desc = description || selector;
  const displayValue = value.length > 30 ? `${value.substring(0, 30)}...` : value;

  console.log(`    [type] ${desc} = "${displayValue}"`);

  try {
    const element = await waitForElement(selector, { description });
    if (!element) throw new Error('Element not found');

    if (clearFirst) {
      await element.clearValue();
    }

    await element.setValue(value);
    console.log(`    [type] OK: typed ${value.length} chars`);
  } catch (error: any) {
    console.log(`    [type] FAILED: ${desc}`);
    throw error;
  }
}

/**
 * Assert element text with verbose comparison
 * Shows expected vs actual on failure
 */
export async function expectText(
  selector: string,
  expectedText: string,
  options: {
    description?: string;
    exact?: boolean;
  } = {}
): Promise<void> {
  const { description, exact = true } = options;
  const desc = description || selector;

  console.log(`    [assert] ${desc} should ${exact ? 'equal' : 'contain'} "${expectedText}"`);

  try {
    const element = await waitForElement(selector, { description });
    if (!element) throw new Error('Element not found');

    const actualText = await element.getText();

    const matches = exact
      ? actualText === expectedText
      : actualText.includes(expectedText);

    if (!matches) {
      console.log(`    [assert] MISMATCH:`);
      console.log(`             Expected: "${expectedText}"`);
      console.log(`             Actual:   "${actualText}"`);
      throw new Error(
        `Text assertion failed for ${desc}\n` +
        `  Expected: "${expectedText}"\n` +
        `  Actual:   "${actualText}"\n` +
        `  Mode: ${exact ? 'exact match' : 'contains'}`
      );
    }

    console.log(`    [assert] OK: text matches`);
  } catch (error: any) {
    if (!error.message.includes('Text assertion failed')) {
      console.log(`    [assert] FAILED: ${error.message?.substring(0, 100)}`);
    }
    throw error;
  }
}

/**
 * Assert element exists/visible with verbose output
 */
export async function expectVisible(
  selector: string,
  options: {
    description?: string;
    shouldBeVisible?: boolean;
  } = {}
): Promise<void> {
  const { description, shouldBeVisible = true } = options;
  const desc = description || selector;
  const expectation = shouldBeVisible ? 'visible' : 'hidden';

  console.log(`    [assert] ${desc} should be ${expectation}`);

  try {
    const element = await $(selector);
    const exists = await element.isExisting();

    if (shouldBeVisible) {
      if (!exists) {
        console.log(`    [assert] FAILED: Element does not exist`);
        throw new Error(`Element should be visible but doesn't exist: ${selector}`);
      }

      const isDisplayed = await element.isDisplayed();
      if (!isDisplayed) {
        console.log(`    [assert] FAILED: Element exists but not displayed`);
        throw new Error(`Element exists but is not displayed: ${selector}`);
      }

      console.log(`    [assert] OK: element is visible`);
    } else {
      // Should NOT be visible
      if (exists) {
        const isDisplayed = await element.isDisplayed();
        if (isDisplayed) {
          console.log(`    [assert] FAILED: Element is still visible`);
          throw new Error(`Element should be hidden but is visible: ${selector}`);
        }
      }
      console.log(`    [assert] OK: element is hidden/gone`);
    }
  } catch (error: any) {
    if (!error.message.includes('should be')) {
      console.log(`    [assert] ERROR: ${error.message?.substring(0, 100)}`);
    }
    throw error;
  }
}

/**
 * Assert element count with verbose output
 */
export async function expectCount(
  selector: string,
  expectedCount: number,
  description?: string
): Promise<void> {
  const desc = description || selector;
  console.log(`    [assert] ${desc} count should be ${expectedCount}`);

  const elements = await $$(selector);
  const actualCount = elements.length;

  if (actualCount !== expectedCount) {
    console.log(`    [assert] MISMATCH:`);
    console.log(`             Expected: ${expectedCount}`);
    console.log(`             Actual:   ${actualCount}`);
    throw new Error(
      `Count assertion failed for ${desc}\n` +
      `  Expected: ${expectedCount} elements\n` +
      `  Actual:   ${actualCount} elements\n` +
      `  Selector: ${selector}`
    );
  }

  console.log(`    [assert] OK: count is ${actualCount}`);
}

/**
 * Take labeled screenshot for checkpoints
 */
export async function checkpoint(label: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `./e2e/screenshots/checkpoint-${label}-${timestamp}.png`;

  console.log(`    [checkpoint] ${label}`);

  try {
    await browser.saveScreenshot(filename);
    console.log(`    [checkpoint] Screenshot: ${filename}`);
  } catch (e) {
    console.log(`    [checkpoint] Screenshot failed (continuing)`);
  }
}

/**
 * Wait and retry with progress logging
 * Useful for actions that might need multiple attempts
 */
export async function retryUntil(
  action: () => Promise<boolean>,
  options: {
    description: string;
    maxAttempts?: number;
    delayMs?: number;
  }
): Promise<void> {
  const { description, maxAttempts = 5, delayMs = 500 } = options;

  console.log(`    [retry] ${description} (max ${maxAttempts} attempts)`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`    [retry] Attempt ${attempt}/${maxAttempts}...`);

    try {
      const success = await action();
      if (success) {
        console.log(`    [retry] OK: succeeded on attempt ${attempt}`);
        return;
      }
    } catch (error: any) {
      console.log(`    [retry] Attempt ${attempt} failed: ${error.message?.substring(0, 50)}`);
    }

    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  throw new Error(`Failed after ${maxAttempts} attempts: ${description}`);
}

/**
 * Log a test step for visibility
 */
export function step(description: string): void {
  console.log(`\n    --- ${description} ---`);
}
