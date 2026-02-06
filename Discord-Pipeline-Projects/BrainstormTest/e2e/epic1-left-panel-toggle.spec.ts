import { test, expect } from '@playwright/test'

test.describe('Epic 1 - US-1.2: Collapsible Left Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="tab-editor"]')
  })

  test('toggle button collapses and expands left panel', async ({ page }) => {
    // Left panel should be visible by default
    await expect(page.getByTestId('left-panel')).toBeVisible()

    // Click toggle to collapse
    await page.getByTestId('toggle-left-panel').click()
    await expect(page.getByTestId('left-panel')).not.toBeVisible()

    // Click toggle to expand
    await page.getByTestId('toggle-left-panel').click()
    await expect(page.getByTestId('left-panel')).toBeVisible()
  })

  test('canvas area expands when panel is collapsed', async ({ page }) => {
    // Get main area width with panel open
    const mainArea = page.locator('[data-testid="toggle-left-panel"]').locator('..')
    const widthOpen = await mainArea.evaluate((el) => el.getBoundingClientRect().width)

    // Collapse panel
    await page.getByTestId('toggle-left-panel').click()
    await expect(page.getByTestId('left-panel')).not.toBeVisible()

    // Main area should be wider now
    const widthClosed = await mainArea.evaluate((el) => el.getBoundingClientRect().width)
    expect(widthClosed).toBeGreaterThan(widthOpen)
  })

  test('panel content adapts per tab', async ({ page }) => {
    // Editor mode: palette visible in left panel
    await expect(page.getByTestId('palette-internal')).toBeVisible()

    // Switch to Scenarios: scenario list in left panel
    await page.getByTestId('tab-scenarios').click()
    await expect(page.getByTestId('create-scenario')).toBeVisible()

    // Switch to Simulate: simulation controls in left panel
    await page.getByTestId('tab-simulate').click()
    // SimulationControls has a "Run Simulation" button
    await expect(page.getByText('Run Simulation')).toBeVisible()
  })

  test('collapse state persists across tab switches', async ({ page }) => {
    // Collapse the panel
    await page.getByTestId('toggle-left-panel').click()
    await expect(page.getByTestId('left-panel')).not.toBeVisible()

    // Switch to Scenarios and back to Editor
    await page.getByTestId('tab-scenarios').click()
    await page.getByTestId('tab-editor').click()

    // Panel should still be collapsed
    await expect(page.getByTestId('left-panel')).not.toBeVisible()

    // Expand again
    await page.getByTestId('toggle-left-panel').click()
    await expect(page.getByTestId('left-panel')).toBeVisible()
  })
})
