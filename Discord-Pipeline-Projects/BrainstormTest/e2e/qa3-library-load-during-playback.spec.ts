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

test.describe('QA3: Library scenario load during active simulation playback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('BUG: Loading a library scenario during active playback should stop simulation', async ({ page }) => {
    // Step 1: Load and run simulation
    await loadScenarioAndRunSimulation(page, 'hello-cascade')

    // Step 2: Start playback
    await page.getByTestId('sim-play-button').click()
    const timeDisplay = page.getByTestId('sim-time-display')

    // Wait for playback to advance
    await expect(async () => {
      const text = await timeDisplay.textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })

    // Step 3: Switch to editor and load a different scenario while playback is active
    await page.getByTestId('tab-editor').click()
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-branching-paths').getByTestId('card-load-button').click()
    // Confirm replacement
    await page.getByTestId('library-confirm-ok').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // Step 4: Switch to simulate tab - simulation should be fully reset
    await page.getByTestId('tab-simulate').click()
    await page.waitForTimeout(300)

    // Playback should be stopped (time display at 0)
    await expect(timeDisplay).toContainText('0')

    // Results should be cleared
    await expect(page.getByTestId('sim-results-empty')).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('sim-summary-badge')).not.toBeVisible()

    // Play button should be enabled, pause/stop disabled
    await expect(page.getByTestId('sim-play-button')).toBeEnabled()
    await expect(page.getByTestId('sim-pause-button')).toBeDisabled()
    await expect(page.getByTestId('sim-stop-button')).toBeDisabled()
  })

  test('BUG: Loading library scenario during paused playback should reset simulation', async ({ page }) => {
    // Load and run simulation
    await loadScenarioAndRunSimulation(page, 'hello-cascade')

    // Start and pause playback
    await page.getByTestId('sim-play-button').click()
    await expect(async () => {
      const text = await page.getByTestId('sim-time-display').textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(2)
    }).toPass({ timeout: 10000 })
    await page.getByTestId('sim-pause-button').click()

    // Load different scenario
    await page.getByTestId('tab-editor').click()
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-supply-chain-disruption').getByTestId('card-load-button').click()
    await page.getByTestId('library-confirm-ok').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // Switch to simulate
    await page.getByTestId('tab-simulate').click()
    await page.waitForTimeout(300)

    // Should be fully reset
    await expect(page.getByTestId('sim-time-display')).toContainText('0')
    await expect(page.getByTestId('sim-results-empty')).toBeVisible({ timeout: 3000 })
  })
})
