import { test, expect, type Page } from '@playwright/test'

/** Navigate to app with tutorial dismissed and first-use hints suppressed */
async function skipTutorial(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('cascadesim-tutorial-complete', 'true')
    localStorage.setItem('cascadesim-first-use-chain-builder', 'true')
  })
  await page.goto('/')
  await page.waitForSelector('.react-flow')
}

/** Create a component on the canvas */
async function createComponent(page: Page) {
  const palette = page.getByTestId('palette-internal')
  const canvas = page.locator('.react-flow')
  const canvasBox = await canvas.boundingBox()
  if (!canvasBox) throw new Error('Canvas not found')
  await palette.dragTo(canvas, {
    targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 },
  })
  await page.waitForTimeout(500)
}

/** Open chain builder via right-click context menu */
async function openChainBuilder(page: Page) {
  const node = page.locator('.react-flow__node').first()
  await node.click({ button: 'right' })
  await page.waitForTimeout(300)
  await page.getByTestId('context-menu-new-chain').click()
  await page.waitForTimeout(300)
}

test.describe('Epic 8 - US-8.5: Contextual Hints on Complex Elements', () => {
  test('TC-8.5.1: "?" icon on chain builder modal', async ({ page }) => {
    await skipTutorial(page)
    await createComponent(page)
    await openChainBuilder(page)

    // Assert chain builder is open
    await expect(page.getByTestId('chain-builder')).toBeVisible()

    // Assert "?" hint icon near the header
    const hintIcon = page.getByTestId('hint-chain-builder')
    await expect(hintIcon).toBeVisible()

    // Click the hint icon
    await hintIcon.click()

    // Assert tooltip appears with explanation text
    const tooltip = page.getByTestId('hint-tooltip')
    await expect(tooltip).toBeVisible()
    const text = await tooltip.textContent()
    expect(text!.length).toBeGreaterThan(10)

    // Assert dark theme styling (check background color)
    await expect(tooltip).toHaveCSS('background-color', 'rgb(18, 18, 26)')
  })

  test('TC-8.5.2: Tooltip dismisses on click outside or Esc', async ({ page }) => {
    await skipTutorial(page)
    await createComponent(page)
    await openChainBuilder(page)

    const hintIcon = page.getByTestId('hint-chain-builder')
    await hintIcon.click()

    // Assert tooltip is visible
    const tooltip = page.getByTestId('hint-tooltip')
    await expect(tooltip).toBeVisible()

    // Click outside the tooltip (on the chain builder backdrop)
    await page.getByTestId('chain-builder').click({ position: { x: 10, y: 10 } })
    await page.waitForTimeout(200)

    // Assert tooltip dismissed
    await expect(tooltip).not.toBeVisible()

    // Click hint again
    await hintIcon.click()
    await expect(tooltip).toBeVisible()

    // Press Esc
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // Assert tooltip dismissed
    await expect(tooltip).not.toBeVisible()
  })

  test('TC-8.5.3: First-time chain builder hint auto-appears', async ({ page }) => {
    // Clear all cascadesim first-use keys
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('cascadesim-tutorial-complete', 'true')
      // Remove all first-use keys
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('cascadesim-first-use-')) {
          localStorage.removeItem(key)
        }
      }
    })
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    await createComponent(page)
    await openChainBuilder(page)

    // Assert contextual hint auto-appears
    const tooltip = page.getByTestId('hint-tooltip')
    await expect(tooltip).toBeVisible({ timeout: 2000 })

    // Dismiss the hint
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await expect(tooltip).not.toBeVisible()

    // Close chain builder
    await page.getByTestId('chain-builder').locator('button:has-text("Cancel")').click()
    await page.waitForTimeout(300)

    // Open chain builder again
    await openChainBuilder(page)
    await expect(page.getByTestId('chain-builder')).toBeVisible()

    // Assert contextual hint does NOT auto-appear
    await page.waitForTimeout(500)
    await expect(tooltip).not.toBeVisible()
  })

  test('TC-8.5.4: Hint icons on other complex elements', async ({ page }) => {
    await skipTutorial(page)

    // Switch to Simulate tab
    await page.getByTestId('tab-simulate').click()
    await page.waitForTimeout(300)

    // Assert "?" hint icon near the time step control
    const hintIcon = page.getByTestId('hint-sim-timestep')
    await expect(hintIcon).toBeVisible()

    // Click it
    await hintIcon.click()

    // Assert tooltip appears
    const tooltip = page.getByTestId('hint-tooltip')
    await expect(tooltip).toBeVisible()
    const text = await tooltip.textContent()
    expect(text!.length).toBeGreaterThan(10)
  })
})
