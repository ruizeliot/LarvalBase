import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

/** Helper: load a scenario and run simulation, returning to simulate mode with results */
async function loadScenarioAndRunSimulation(page: Page, scenarioId = 'hello-cascade') {
  await openLibraryPanel(page)
  await page.getByTestId(`scenario-card-${scenarioId}`).getByTestId('card-load-button').click()
  await expect(page.getByTestId('library-panel')).not.toBeVisible()

  // Switch to Simulate tab
  await page.getByTestId('tab-simulate').click()

  // Select the loaded scenario in the simulation dropdown
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

  // Run simulation
  await page.getByTestId('sim-run-button').click()
  await expect(page.getByTestId('sim-summary-badge')).toBeVisible({ timeout: 5000 })
}

test.describe('QA: Stale simulation state after library scenario load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('BUG: Loading a new library scenario should clear previous simulation results', async ({ page }) => {
    // Step 1: Load "Hello Cascade" and run a simulation
    await loadScenarioAndRunSimulation(page, 'hello-cascade')

    // Verify simulation results exist
    await expect(page.getByTestId('sim-summary-badge')).toBeVisible()
    await expect(page.getByTestId('sim-results-summary')).toBeVisible()

    // Step 2: Go back to editor and load a DIFFERENT scenario
    await page.getByTestId('tab-editor').click()
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-branching-paths').getByTestId('card-load-button').click()
    // Confirm replacement dialog (existing content exists)
    await page.getByTestId('library-confirm-ok').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // Step 3: Switch to Simulate tab — results should be CLEARED
    await page.getByTestId('tab-simulate').click()
    await page.waitForTimeout(300)

    // BUG: The stale simulation result from "Hello Cascade" should NOT persist.
    // The empty state message should be visible instead.
    await expect(page.getByTestId('sim-results-empty')).toBeVisible({ timeout: 3000 })
    // The old summary badge should be gone
    await expect(page.getByTestId('sim-summary-badge')).not.toBeVisible()
  })

  test('BUG: Sequential library loads should not show stale summary stats', async ({ page }) => {
    // Load and simulate first scenario
    await loadScenarioAndRunSimulation(page, 'hello-cascade')

    // Verify results summary is visible
    await expect(page.getByTestId('sim-results-summary')).toBeVisible()

    // Load second scenario (different one)
    await page.getByTestId('tab-editor').click()
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-supply-chain-disruption').getByTestId('card-load-button').click()
    await page.getByTestId('library-confirm-ok').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // Switch to simulate — results summary should be GONE, empty state should show
    await page.getByTestId('tab-simulate').click()
    await page.waitForTimeout(300)

    await expect(page.getByTestId('sim-results-summary')).not.toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('sim-results-empty')).toBeVisible({ timeout: 3000 })
  })
})
