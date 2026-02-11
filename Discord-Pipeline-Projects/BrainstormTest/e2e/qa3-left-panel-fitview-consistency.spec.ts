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

test.describe('QA3: Left panel toggle fitView consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('BUG: Left panel toggle should call fitView like results panel does', async ({ page }) => {
    // Load a complex scenario so nodes span the visible area
    await loadScenarioAndRunSimulation(page, 'supply-chain-disruption')

    // Get the ReactFlow viewport transform before toggling left panel
    const getViewportTransform = async () => {
      return await page.evaluate(() => {
        const viewport = document.querySelector('.react-flow__viewport')
        return viewport ? viewport.getAttribute('style') : null
      })
    }

    // Record viewport transform with panel open
    const transformOpen = await getViewportTransform()

    // Collapse left panel
    await page.getByTestId('toggle-left-panel').click()
    await expect(page.getByTestId('left-panel')).not.toBeVisible()

    // Wait for fitView animation (if implemented)
    await page.waitForTimeout(500)

    // Get viewport transform with panel collapsed
    const transformCollapsed = await getViewportTransform()

    // BUG: The viewport transform SHOULD change after panel toggle
    // because fitView should adjust to the new available space.
    // If it stays the same, fitView wasn't called (inconsistent with results panel).
    expect(transformCollapsed).not.toBe(transformOpen)
  })
})
