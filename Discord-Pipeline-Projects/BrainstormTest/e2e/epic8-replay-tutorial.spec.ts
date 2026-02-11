import { test, expect } from '@playwright/test'

/** Navigate to app with tutorial welcome already dismissed */
async function skipTutorial(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('cascadesim-tutorial-progress', JSON.stringify({
      phase1: { status: 'available', stepsCompleted: [] },
      phase2: { status: 'locked', stepsCompleted: [] },
      phase3: { status: 'locked', stepsCompleted: [] },
      phase4: { status: 'locked', stepsCompleted: [] },
      welcomeSeen: true,
    }))
  })
  await page.goto('/')
  await page.waitForSelector('.react-flow')
}

test.describe('Epic 8 - US-8.4: Replay Tutorial via Help Button', () => {
  test('TC-8.4.1: Help button is always visible', async ({ page }) => {
    await skipTutorial(page)

    // Assert "?" button visible
    const helpBtn = page.getByTestId('help-button')
    await expect(helpBtn).toBeVisible()

    // Switch to Scenarios tab — still visible
    await page.getByTestId('tab-scenarios').click()
    await expect(helpBtn).toBeVisible()

    // Switch to Simulate tab — still visible
    await page.getByTestId('tab-simulate').click()
    await expect(helpBtn).toBeVisible()
  })

  test('TC-8.4.2: Help button opens tutorial menu with phase cards', async ({ page }) => {
    await skipTutorial(page)

    // Click "?" button
    await page.getByTestId('help-button').click()

    // Assert tutorial menu appears (E11 progressive tutorial)
    const menu = page.getByTestId('tutorial-menu')
    await expect(menu).toBeVisible()

    // Assert 4 phase cards are visible
    await expect(page.locator('[data-testid="tutorial-phase-1"]')).toBeVisible()
    await expect(page.locator('[data-testid="tutorial-phase-2"]')).toBeVisible()
    await expect(page.locator('[data-testid="tutorial-phase-3"]')).toBeVisible()
    await expect(page.locator('[data-testid="tutorial-phase-4"]')).toBeVisible()
  })

  test('TC-8.4.3: Starting Phase 1 from menu begins the walkthrough', async ({ page }) => {
    await skipTutorial(page)

    // Click "?" then start Phase 1
    await page.getByTestId('help-button').click()
    await expect(page.getByTestId('tutorial-menu')).toBeVisible()
    await page.locator('[data-testid="tutorial-phase-1"]').click()

    // Assert tour starts
    const popover = page.locator('.driver-popover')
    await expect(popover).toBeVisible({ timeout: 3000 })

    // Assert step 1 title
    await expect(popover.locator('.driver-popover-title')).toContainText('Drag a Component')

    // Assert step counter shows step 1
    await expect(popover.locator('[data-testid="step-counter"]')).toContainText('Step 1 of 5')
  })

  test('TC-8.4.4: Tutorial menu closes when clicking outside', async ({ page }) => {
    await skipTutorial(page)

    // Open menu
    await page.getByTestId('help-button').click()
    const menu = page.getByTestId('tutorial-menu')
    await expect(menu).toBeVisible()

    // Click on canvas area
    await page.mouse.click(400, 300)

    // Assert menu dismissed
    await expect(menu).not.toBeVisible()
  })

  test('TC-8.4.5: Help button does not overlap canvas controls', async ({ page }) => {
    await skipTutorial(page)

    const helpBtn = page.getByTestId('help-button')
    const controls = page.locator('.react-flow__controls')

    const helpBox = await helpBtn.boundingBox()
    const controlsBox = await controls.boundingBox()

    if (!helpBox || !controlsBox) throw new Error('Could not get bounding boxes')

    // Check no overlap
    const overlaps =
      helpBox.x < controlsBox.x + controlsBox.width &&
      helpBox.x + helpBox.width > controlsBox.x &&
      helpBox.y < controlsBox.y + controlsBox.height &&
      helpBox.y + helpBox.height > controlsBox.y

    expect(overlaps).toBe(false)
  })

  test('TC-8.4.6: Dismiss tour and verify app state restored', async ({ page }) => {
    await skipTutorial(page)

    // Build a model with a component
    const palette = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    const canvasBox = await canvas.boundingBox()
    if (!canvasBox) throw new Error('Canvas not found')
    await palette.dragTo(canvas, {
      targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
    })
    await page.waitForTimeout(500)

    // Verify node exists
    const nodesBefore = await page.locator('.react-flow__node').count()
    expect(nodesBefore).toBeGreaterThan(0)

    // Start Phase 1 from tutorial menu
    await page.getByTestId('help-button').click()
    await expect(page.getByTestId('tutorial-menu')).toBeVisible()
    await page.locator('[data-testid="tutorial-phase-1"]').click()
    await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 3000 })

    // Press Esc to dismiss
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Assert tour is dismissed
    await expect(page.locator('.driver-popover')).not.toBeVisible()

    // Assert components are still there
    const nodesAfter = await page.locator('.react-flow__node').count()
    expect(nodesAfter).toBe(nodesBefore)

    // Assert app is functional — can still interact with canvas
    await palette.dragTo(canvas, {
      targetPosition: { x: canvasBox.width / 3, y: canvasBox.height / 3 },
    })
    await page.waitForTimeout(500)
    const nodesNew = await page.locator('.react-flow__node').count()
    expect(nodesNew).toBe(nodesBefore + 1)
  })
})
