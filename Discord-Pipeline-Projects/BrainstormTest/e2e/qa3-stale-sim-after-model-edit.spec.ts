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

test.describe('QA3: Stale simulation after model edits in editor mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('BUG: Deleting a component in editor mode should invalidate simulation results', async ({ page }) => {
    // Load scenario and run simulation
    await loadScenarioAndRunSimulation(page)

    // Verify simulation results exist
    await expect(page.getByTestId('sim-summary-badge')).toBeVisible()
    await expect(page.getByTestId('sim-results-summary')).toBeVisible()

    // Switch to editor mode
    await page.getByTestId('tab-editor').click()
    await page.waitForTimeout(300)

    // Select and delete a component node
    const componentNodes = page.locator('.react-flow__node-component')
    const initialCount = await componentNodes.count()
    expect(initialCount).toBeGreaterThan(0)

    // Click a component to select it
    await componentNodes.first().click()
    await page.waitForTimeout(200)

    // Delete via keyboard
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)

    // Verify component was deleted
    const afterCount = await componentNodes.count()
    expect(afterCount).toBeLessThan(initialCount)

    // Switch back to simulate mode
    await page.getByTestId('tab-simulate').click()
    await page.waitForTimeout(300)

    // BUG: Simulation results should be cleared after model modification
    // The old results reference components that no longer exist
    await expect(page.getByTestId('sim-results-empty')).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('sim-summary-badge')).not.toBeVisible()
  })

  test('BUG: Adding a component in editor mode should invalidate simulation results', async ({ page }) => {
    // Load scenario and run simulation
    await loadScenarioAndRunSimulation(page)

    // Verify results exist
    await expect(page.getByTestId('sim-summary-badge')).toBeVisible()
    const initialStats = await page.getByTestId('stat-components-affected').textContent()

    // Switch to editor
    await page.getByTestId('tab-editor').click()
    await page.waitForTimeout(300)

    // Add a new component via drag
    const palette = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    await palette.dragTo(canvas, { targetPosition: { x: 600, y: 400 } })
    await page.waitForTimeout(300)

    // Switch back to simulate
    await page.getByTestId('tab-simulate').click()
    await page.waitForTimeout(300)

    // BUG: Simulation results should be cleared because model was modified
    // New component isn't reflected in old simulation results
    await expect(page.getByTestId('sim-results-empty')).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('sim-summary-badge')).not.toBeVisible()
  })

  test('BUG: Editing a parameter value in editor should invalidate simulation results', async ({ page }) => {
    // Load scenario and run simulation
    await loadScenarioAndRunSimulation(page)
    await expect(page.getByTestId('sim-summary-badge')).toBeVisible()

    // Switch to editor
    await page.getByTestId('tab-editor').click()
    await page.waitForTimeout(300)

    // Select a component
    const componentNodes = page.locator('.react-flow__node-component')
    await componentNodes.first().click()
    await page.waitForTimeout(300)

    // Modify a parameter value in the properties panel
    const paramRows = page.locator('[data-testid="param-row"]')
    const paramCount = await paramRows.count()
    if (paramCount > 0) {
      const valueField = paramRows.first().locator('input[type="number"]')
      const oldValue = await valueField.inputValue()
      const newValue = String(Number(oldValue) + 100)
      await valueField.clear()
      await valueField.fill(newValue)
      // Click away to commit
      await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })
      await page.waitForTimeout(300)
    }

    // Switch back to simulate
    await page.getByTestId('tab-simulate').click()
    await page.waitForTimeout(300)

    // Simulation results should be invalidated
    await expect(page.getByTestId('sim-results-empty')).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('sim-summary-badge')).not.toBeVisible()
  })
})
