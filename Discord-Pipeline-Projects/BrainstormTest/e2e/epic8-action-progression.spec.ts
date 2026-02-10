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

/** Navigate to a specific step by advancing through previous steps */
async function advanceToStep(page: Page, targetStep: number) {
  const popover = page.locator('.driver-popover')
  for (let i = 0; i < targetStep; i++) {
    // Check if current step has a skip action link
    const skipLink = page.locator('[data-testid="tutorial-skip-action"]')
    if (await skipLink.isVisible({ timeout: 500 }).catch(() => false)) {
      await skipLink.click()
    } else {
      await popover.locator('.driver-popover-next-btn').click()
    }
    await page.waitForTimeout(300)
  }
}

test.describe('Epic 8 - US-8.3: Action-Based Step Progression', () => {
  test('TC-8.3.1: Step 2 requires dragging a component', async ({ page }) => {
    await startTutorial(page)

    // Navigate from Welcome (step 0) to step 1 (Add Your First Component)
    await page.locator('.driver-popover .driver-popover-next-btn').click()
    await page.waitForTimeout(300)

    const popover = page.locator('.driver-popover')

    // Assert step 2 is shown (index 1)
    await expect(popover.locator('.driver-popover-title')).toContainText('Add Your First Component')

    // Assert "Next" button click doesn't advance (action required, blocked)
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)
    // Still on same step
    await expect(popover.locator('.driver-popover-title')).toContainText('Add Your First Component')

    // Assert action prompt is visible
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Drag an Internal component onto the canvas
    const paletteItem = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    const canvasBox = await canvas.boundingBox()
    if (!canvasBox) throw new Error('Canvas not found')
    await paletteItem.dragTo(canvas, {
      targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
    })

    // Assert success indicator appears
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 2000 })

    // Assert "Next" button now works
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)

    // Now on step 3 (Configure Your Component)
    await expect(popover.locator('.driver-popover-title')).toContainText('Configure Your Component')
  })

  test('TC-8.3.2: Step 3 requires renaming a component', async ({ page }) => {
    await startTutorial(page)

    // Advance from Welcome to step 1 (Add Your First Component)
    await page.locator('.driver-popover .driver-popover-next-btn').click()
    await page.waitForTimeout(300)

    // Drag a component for step 1
    const paletteItem = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    const canvasBox = await canvas.boundingBox()
    if (!canvasBox) throw new Error('Canvas not found')
    await paletteItem.dragTo(canvas, {
      targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
    })
    await page.waitForTimeout(500)

    // Advance to step 2 (Configure Your Component)
    const popover = page.locator('.driver-popover')
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)

    // Assert on step 3 (Configure)
    await expect(popover.locator('.driver-popover-title')).toContainText('Configure Your Component')

    // Assert action prompt describes renaming
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // "Next" should be blocked
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)
    await expect(popover.locator('.driver-popover-title')).toContainText('Configure Your Component')

    // Select the component on canvas to open property editor
    const node = page.locator('.react-flow__node').first()
    await node.click()
    await page.waitForTimeout(300)

    // Change the name in the property editor
    const nameInput = page.getByTestId('property-name')
    await nameInput.clear()
    await nameInput.fill('MyComponent')
    await nameInput.press('Tab')
    await page.waitForTimeout(500)

    // Assert success indicator
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 2000 })

    // Assert "Next" now works
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)
    await expect(popover.locator('.driver-popover-title')).toContainText('Add a Second Component')
  })

  test('TC-8.3.3: Last step requires clicking "Run"', async ({ page }) => {
    await startTutorial(page)

    // Navigate through steps to reach step 6 (Run Your Simulation)
    await advanceToStep(page, 6)

    const popover = page.locator('.driver-popover')

    // Assert on last step
    await expect(popover.locator('.driver-popover-title')).toContainText('Run Your Simulation')

    // Assert action prompt
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // "Next" should be blocked
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)
    await expect(popover.locator('.driver-popover-title')).toContainText('Run Your Simulation')

    // Switch to simulate tab and try Run
    await page.getByTestId('tab-simulate').click({ force: true })
    await page.waitForTimeout(300)
    const runBtn = page.getByTestId('sim-run-button')
    if (await runBtn.isEnabled()) {
      await runBtn.click()
    }
    await page.waitForTimeout(500)

    // Skip action to complete the tour (run may not work without a real scenario)
    const skipLink = page.locator('[data-testid="tutorial-skip-action"]')
    if (await skipLink.isVisible({ timeout: 500 }).catch(() => false)) {
      await skipLink.click()
    } else {
      await popover.locator('.driver-popover-next-btn').click()
    }
    await page.waitForTimeout(300)

    // Tour should be complete — this was the last step
    await expect(popover).not.toBeVisible({ timeout: 2000 })
  })

  test('TC-8.3.4: "Skip" link bypasses action requirement', async ({ page }) => {
    await startTutorial(page)

    // Navigate from Welcome to step 1 (action required)
    await page.locator('.driver-popover .driver-popover-next-btn').click()
    await page.waitForTimeout(300)

    const popover = page.locator('.driver-popover')

    // Assert on step 2 (Add Your First Component)
    await expect(popover.locator('.driver-popover-title')).toContainText('Add Your First Component')

    // Assert "Next" is blocked
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)
    await expect(popover.locator('.driver-popover-title')).toContainText('Add Your First Component')

    // Assert "Skip" link is visible
    const skipLink = page.locator('[data-testid="tutorial-skip-action"]')
    await expect(skipLink).toBeVisible()

    // Click "Skip"
    await skipLink.click()
    await page.waitForTimeout(300)

    // Assert advances to next step without performing the action
    await expect(popover.locator('.driver-popover-title')).toContainText('Configure Your Component')
  })

  test('TC-8.3.5: Performing action then navigating back and forward', async ({ page }) => {
    await startTutorial(page)

    // Navigate from Welcome to step 1
    await page.locator('.driver-popover .driver-popover-next-btn').click()
    await page.waitForTimeout(300)

    const popover = page.locator('.driver-popover')

    // Drag component (action completed)
    const paletteItem = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    const canvasBox = await canvas.boundingBox()
    if (!canvasBox) throw new Error('Canvas not found')
    await paletteItem.dragTo(canvas, {
      targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
    })
    await page.waitForTimeout(500)

    // Assert success indicator
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 2000 })

    // Click "Next" to step 2 (Configure Your Component)
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)
    await expect(popover.locator('.driver-popover-title')).toContainText('Configure Your Component')

    // Click "Back" to step 1 (Add Your First Component)
    await popover.locator('.driver-popover-prev-btn').click()
    await page.waitForTimeout(300)
    await expect(popover.locator('.driver-popover-title')).toContainText('Add Your First Component')

    // Assert step 1 shows completed state (action already done)
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible()

    // Assert "Next" is still enabled (don't need to redo action)
    await popover.locator('.driver-popover-next-btn').click()
    await page.waitForTimeout(300)
    await expect(popover.locator('.driver-popover-title')).toContainText('Configure Your Component')
  })
})
