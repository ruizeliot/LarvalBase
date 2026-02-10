import { test, expect, type Page } from '@playwright/test'

/** Start the tutorial from a fresh state */
async function startTutorial(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/')
  await page.waitForSelector('.react-flow')
  await expect(page.getByTestId('welcome-overlay')).toBeVisible({ timeout: 3000 })
  await page.getByTestId('start-tutorial-button').click()
  await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 2000 })
}

test.describe('Epic 8 - US-8.2: Guided Tour Steps', () => {
  test('TC-8.2.1: Tour has 8 steps with correct targets', async ({ page }) => {
    await startTutorial(page)

    // Step 1: Canvas navigation
    const popover = page.locator('.driver-popover')
    await expect(popover).toBeVisible()
    await expect(popover.locator('.driver-popover-title')).toContainText('Canvas')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('1 of 8')

    // Step 2: Component palette
    await popover.locator('.driver-popover-next-btn').click()
    await expect(popover.locator('.driver-popover-title')).toContainText('Component Palette')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('2 of 8')

    // For action steps, use skip to advance
    // Click the skip action link to bypass the drag action
    await page.locator('[data-testid="tutorial-skip-action"]').click()

    // Step 3: Property editor
    await expect(popover.locator('.driver-popover-title')).toContainText('Property Editor')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('3 of 8')

    // Skip this action step too
    await page.locator('[data-testid="tutorial-skip-action"]').click()

    // Step 4: Causal chain builder
    await expect(popover.locator('.driver-popover-title')).toContainText('Causal Chain')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('4 of 8')

    // Step 5: Scenario tab
    await popover.locator('.driver-popover-next-btn').click()
    await expect(popover.locator('.driver-popover-title')).toContainText('Scenario')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('5 of 8')

    // Step 6: Forced events
    await popover.locator('.driver-popover-next-btn').click()
    await expect(popover.locator('.driver-popover-title')).toContainText('Forced Events')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('6 of 8')

    // Step 7: Simulate tab
    await popover.locator('.driver-popover-next-btn').click()
    await expect(popover.locator('.driver-popover-title')).toContainText('Simulate')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('7 of 8')

    // Skip action step
    await page.locator('[data-testid="tutorial-skip-action"]').click()

    // Step 8: Scenario library
    await expect(popover.locator('.driver-popover-title')).toContainText('Scenario Library')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('8 of 8')

    // Complete tour
    await popover.locator('.driver-popover-next-btn').click()
    await expect(popover).not.toBeVisible({ timeout: 2000 })
  })

  test('TC-8.2.2: Progress dots update correctly', async ({ page }) => {
    await startTutorial(page)

    const popover = page.locator('.driver-popover')
    // Step 1
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('1 of 8')

    // Step 2
    await popover.locator('.driver-popover-next-btn').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('2 of 8')

    // Step 3 (skip action)
    await page.locator('[data-testid="tutorial-skip-action"]').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('3 of 8')
  })

  test('TC-8.2.3: "Back" button navigates to previous step', async ({ page }) => {
    await startTutorial(page)

    const popover = page.locator('.driver-popover')
    // Navigate to step 2
    await popover.locator('.driver-popover-next-btn').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('2 of 8')

    // Skip action, go to step 3
    await page.locator('[data-testid="tutorial-skip-action"]').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('3 of 8')

    // Skip action, go to step 4
    await page.locator('[data-testid="tutorial-skip-action"]').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('4 of 8')

    // Click "Back" (Previous)
    await popover.locator('.driver-popover-prev-btn').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('3 of 8')
  })

  test('TC-8.2.4: Esc key dismisses the tour at any point', async ({ page }) => {
    await startTutorial(page)

    const popover = page.locator('.driver-popover')
    // Navigate to step 2
    await popover.locator('.driver-popover-next-btn').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('2 of 8')

    // Skip to step 3
    await page.locator('[data-testid="tutorial-skip-action"]').click()

    // Skip to step 4
    await page.locator('[data-testid="tutorial-skip-action"]').click()

    // Press Escape
    await page.keyboard.press('Escape')

    // Assert tour is dismissed
    await expect(popover).not.toBeVisible({ timeout: 2000 })

    // Assert normal app state is restored (canvas visible)
    await expect(page.locator('.react-flow')).toBeVisible()

    // Assert localStorage flag is set
    const flag = await page.evaluate(() => localStorage.getItem('cascadesim-tutorial-complete'))
    expect(flag).toBeTruthy()
  })

  test('TC-8.2.5: Arrow keys navigate between steps', async ({ page }) => {
    await startTutorial(page)

    const popover = page.locator('.driver-popover')

    // Step 1
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('1 of 8')

    // Press ArrowRight to go to step 2
    await page.keyboard.press('ArrowRight')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('2 of 8')

    // Skip action, advance to step 3
    await page.locator('[data-testid="tutorial-skip-action"]').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('3 of 8')

    // Skip action, advance to step 4
    await page.locator('[data-testid="tutorial-skip-action"]').click()
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('4 of 8')

    // Press ArrowLeft to go back to step 3
    await page.keyboard.press('ArrowLeft')
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('3 of 8')
  })

  test('TC-8.2.6: "Back" at step 1 does nothing', async ({ page }) => {
    await startTutorial(page)

    const popover = page.locator('.driver-popover')

    // At step 1 — verify title
    await expect(popover.locator('.driver-popover-title')).toContainText('Canvas')

    // Press ArrowLeft (back) — should stay at step 1
    await page.keyboard.press('ArrowLeft')

    // Still on step 1 — verify title is still Canvas
    await expect(popover.locator('.driver-popover-title')).toContainText('Canvas')
    await expect(popover).toBeVisible()
  })
})
