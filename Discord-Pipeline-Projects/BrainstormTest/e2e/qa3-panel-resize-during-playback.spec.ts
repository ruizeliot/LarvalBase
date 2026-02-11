import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

/** Helper: load a scenario and switch to simulate mode with results */
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

test.describe('QA3: Panel resize during active simulation playback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('BUG: Results panel resize during playback does not interrupt simulation', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    // Start playback
    await page.getByTestId('sim-play-button').click()
    const timeDisplay = page.getByTestId('sim-time-display')

    // Wait for time to advance past 0
    await expect(async () => {
      const text = await timeDisplay.textContent()
      const match = text?.match(/(\d+)/)
      expect(Number(match?.[1] ?? 0)).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })

    // Get time before resize
    const beforeResize = await timeDisplay.textContent()
    const beforeTime = Number(beforeResize?.match(/(\d+)/)?.[1] ?? 0)

    // Resize the results panel while playing
    const divider = page.getByTestId('panel-resize-divider')
    const dividerBox = await divider.boundingBox()
    expect(dividerBox).not.toBeNull()
    const cx = dividerBox!.x + dividerBox!.width / 2
    const cy = dividerBox!.y + dividerBox!.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx - 80, cy, { steps: 10 })
    await page.mouse.up()

    // Wait a moment and verify time keeps advancing
    await page.waitForTimeout(1000)
    const afterResize = await timeDisplay.textContent()
    const afterTime = Number(afterResize?.match(/(\d+)/)?.[1] ?? 0)
    expect(afterTime).toBeGreaterThan(beforeTime)

    // Verify panel width is valid
    const panel = page.getByTestId('results-side-panel')
    const panelBox = await panel.boundingBox()
    expect(panelBox).not.toBeNull()
    expect(panelBox!.width).toBeGreaterThanOrEqual(248)
    expect(panelBox!.width).toBeLessThanOrEqual(502)
  })

  test('BUG: Results panel collapse during playback preserves playback state', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    // Start playback
    await page.getByTestId('sim-play-button').click()
    const timeDisplay = page.getByTestId('sim-time-display')

    // Wait for playback to advance
    await expect(async () => {
      const text = await timeDisplay.textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(2)
    }).toPass({ timeout: 10000 })

    // Collapse the results panel
    await page.getByTestId('panel-collapse-toggle').click()

    // Verify the panel is collapsed
    const panel = page.getByTestId('results-side-panel')
    const collapsedBox = await panel.boundingBox()
    expect(collapsedBox!.width).toBeLessThan(60)

    // Wait and check time still advances (playback in bottom panel)
    const beforeCollapse = await timeDisplay.textContent()
    const beforeTime = Number(beforeCollapse?.match(/(\d+)/)?.[1] ?? 0)
    await page.waitForTimeout(1500)
    const afterCollapse = await timeDisplay.textContent()
    const afterTime = Number(afterCollapse?.match(/(\d+)/)?.[1] ?? 0)
    expect(afterTime).toBeGreaterThan(beforeTime)

    // Re-expand panel
    await page.getByTestId('panel-collapse-toggle').click()
    const expandedBox = await panel.boundingBox()
    expect(expandedBox!.width).toBeGreaterThanOrEqual(248)
  })
})
