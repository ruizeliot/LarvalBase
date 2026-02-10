import { test, expect } from '@playwright/test'

/** Navigate to app with tutorial already dismissed */
async function skipTutorial(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('cascadesim-tutorial-complete', 'true')
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

  test('TC-8.4.2: Help menu opens with expected options', async ({ page }) => {
    await skipTutorial(page)

    // Click "?" button
    await page.getByTestId('help-button').click()

    // Assert help menu appears
    const menu = page.getByTestId('help-menu')
    await expect(menu).toBeVisible()

    // Assert options
    await expect(page.getByTestId('help-replay-tutorial')).toBeVisible()
    await expect(page.getByTestId('help-keyboard-shortcuts')).toBeVisible()
  })

  test('TC-8.4.3: "Replay Tutorial" starts the walkthrough', async ({ page }) => {
    await skipTutorial(page)

    // Click "?" then "Replay Tutorial"
    await page.getByTestId('help-button').click()
    await page.getByTestId('help-replay-tutorial').click()

    // Assert tour starts
    const popover = page.locator('.driver-popover')
    await expect(popover).toBeVisible({ timeout: 2000 })

    // Assert step 1 title
    await expect(popover.locator('.driver-popover-title')).toContainText('Canvas')

    // Assert progress shows step 1
    await expect(popover.locator('.driver-popover-progress-text')).toContainText('1 of 8')
  })

  test('TC-8.4.4: Help menu closes when clicking outside', async ({ page }) => {
    await skipTutorial(page)

    // Open menu
    await page.getByTestId('help-button').click()
    const menu = page.getByTestId('help-menu')
    await expect(menu).toBeVisible()

    // Click on canvas area (use force to bypass React Flow event handling)
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

    // Click "?" then "Replay Tutorial"
    await page.getByTestId('help-button').click()
    await page.getByTestId('help-replay-tutorial').click()
    await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 2000 })

    // Navigate forward a few steps
    await page.locator('.driver-popover .driver-popover-next-btn').click()
    await page.waitForTimeout(300)

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
