import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

/** Helper: load a scenario and run simulation */
async function loadScenarioAndRunSimulation(page: Page, scenarioId = 'hello-cascade') {
  await openLibraryPanel(page)
  await page.getByTestId(`scenario-card-${scenarioId}`).getByTestId('card-load-button').click()
  await expect(page.getByTestId('library-panel')).not.toBeVisible()

  await page.getByTestId('tab-simulate').click()

  const scenarioSelect = page.getByTestId('sim-scenario-select')
  await scenarioSelect.waitFor({ state: 'visible' })
  const options = scenarioSelect.locator('option')
  const optionCount = await options.count()
  for (let i = 0; i < optionCount; i++) {
    const val = await options.nth(i).getAttribute('value')
    if (val && val !== '') {
      await scenarioSelect.selectOption(val)
      break
    }
  }

  await page.getByTestId('sim-run-button').click()
  await expect(page.getByTestId('sim-summary-badge')).toBeVisible({ timeout: 5000 })
}

test.describe('QA3: Left panel collapse/expand during simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('BUG: Collapsing left panel during simulation should keep nodes visible (fitView)', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    // Verify nodes are visible with left panel open
    const componentNodes = page.locator('.react-flow__node-component')
    await expect(componentNodes.first()).toBeVisible()

    // Get viewport before collapse
    const viewportBefore = page.viewportSize()!

    // Collapse left panel
    await page.getByTestId('toggle-left-panel').click()

    // Verify left panel is closed
    await expect(page.getByTestId('left-panel')).not.toBeVisible()

    // Wait for fitView animation to settle
    await page.waitForTimeout(500)

    // All component nodes should still be within the visible viewport
    const nodeCount = await componentNodes.count()
    expect(nodeCount).toBeGreaterThan(0)

    for (let i = 0; i < nodeCount; i++) {
      const box = await componentNodes.nth(i).boundingBox()
      expect(box).not.toBeNull()
      // Node should be within the viewport bounds (with tolerance)
      expect(box!.x).toBeGreaterThanOrEqual(-50)
      expect(box!.y).toBeGreaterThanOrEqual(-50)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewportBefore.width + 50)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewportBefore.height + 50)
    }
  })

  test('BUG: Expanding left panel during playback should keep nodes visible (fitView)', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    // Collapse left panel first
    await page.getByTestId('toggle-left-panel').click()
    await expect(page.getByTestId('left-panel')).not.toBeVisible()
    await page.waitForTimeout(300)

    // Start playback
    await page.getByTestId('sim-play-button').click()
    const timeDisplay = page.getByTestId('sim-time-display')

    // Wait for playback to advance
    await expect(async () => {
      const text = await timeDisplay.textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })

    // Expand left panel while playing
    await page.getByTestId('toggle-left-panel').click()
    await expect(page.getByTestId('left-panel')).toBeVisible()

    // Wait for fitView animation
    await page.waitForTimeout(500)

    // Verify playback continues
    const beforeText = await timeDisplay.textContent()
    const beforeTime = Number(beforeText?.match(/(\d+)/)?.[1] ?? 0)
    await page.waitForTimeout(1000)
    const afterText = await timeDisplay.textContent()
    const afterTime = Number(afterText?.match(/(\d+)/)?.[1] ?? 0)
    expect(afterTime).toBeGreaterThan(beforeTime)

    // All nodes should be within viewport
    const componentNodes = page.locator('.react-flow__node-component')
    const nodeCount = await componentNodes.count()
    const viewport = page.viewportSize()!

    for (let i = 0; i < nodeCount; i++) {
      const box = await componentNodes.nth(i).boundingBox()
      expect(box).not.toBeNull()
      expect(box!.x).toBeGreaterThanOrEqual(-50)
      expect(box!.y).toBeGreaterThanOrEqual(-50)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 50)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 50)
    }
  })
})
