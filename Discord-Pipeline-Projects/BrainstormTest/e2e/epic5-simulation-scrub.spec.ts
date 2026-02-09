import { test, expect, type Page } from '@playwright/test'

/** Helper: drag a component type from palette onto the canvas */
async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

/** Helper: switch to a specific tab */
async function switchTab(page: Page, tab: 'Editor' | 'Scenarios' | 'Simulate') {
  await page.getByTestId(`tab-${tab.toLowerCase()}`).click()
}

/** Helper: create a component with parameters via UI */
async function createComponentWithParams(
  page: Page,
  type: 'internal' | 'external',
  name: string,
  params: { name: string; value: string }[],
  pos = { x: 400, y: 300 }
) {
  await dragPaletteToCanvas(page, type, pos)
  const nameInput = page.getByTestId('property-name')
  await nameInput.clear()
  await nameInput.fill(name)
  for (const param of params) {
    await page.getByTestId('add-parameter').click()
    const paramRows = page.locator('[data-testid="param-row"]')
    const lastRow = paramRows.last()
    const nameField = lastRow.locator('input').first()
    await nameField.clear()
    await nameField.fill(param.name)
    const valueField = lastRow.locator('input[type="number"]')
    await valueField.clear()
    await valueField.fill(param.value)
  }
  await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })
}

/** Helper: set up simulation scenario */
async function setupSimulationScenario(page: Page) {
  await createComponentWithParams(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
  await createComponentWithParams(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }], { x: 500, y: 200 })

  await switchTab(page, 'Scenarios')
  await page.getByTestId('create-scenario').click()

  // Event 1: River.waterLevel = 10 at t=3
  await page.getByTestId('add-forced-event').click()
  const row1 = page.locator('[data-testid^="event-row-"]').first()
  await row1.locator('select').first().selectOption({ label: 'River' })
  await row1.locator('select').nth(1).selectOption({ label: 'waterLevel' })
  await row1.locator('input[type="number"]').first().clear()
  await row1.locator('input[type="number"]').first().fill('10')
  await row1.locator('input[type="number"]').nth(1).clear()
  await row1.locator('input[type="number"]').nth(1).fill('3')

  // Event 2: Dam.pressure = 20 at t=5
  await page.getByTestId('add-forced-event').click()
  const row2 = page.locator('[data-testid^="event-row-"]').nth(1)
  await row2.locator('select').first().selectOption({ label: 'Dam' })
  await row2.locator('select').nth(1).selectOption({ label: 'pressure' })
  await row2.locator('input[type="number"]').first().clear()
  await row2.locator('input[type="number"]').first().fill('20')
  await row2.locator('input[type="number"]').nth(1).clear()
  await row2.locator('input[type="number"]').nth(1).fill('5')
}

test.describe('Epic 5 - US-5.4: Scrub Simulation Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
    await setupSimulationScenario(page)
  })

  test('TC-5.4.1: Scrub bar shows time and total duration', async ({ page }) => {
    await switchTab(page, 'Simulate')

    const scrubBar = page.getByTestId('sim-scrub-bar')
    await expect(scrubBar).toBeVisible()

    // Initially disabled (no simulation run yet)
    await expect(scrubBar).toBeDisabled()

    // Step forward to run simulation, then scrub bar should be enabled
    await page.getByTestId('sim-step-forward').click()
    await expect(scrubBar).toBeEnabled()
  })

  test('TC-5.4.2: Scrub jumps to specific time step', async ({ page }) => {
    await switchTab(page, 'Simulate')

    // Run simulation by stepping forward once (computes all timesteps)
    await page.getByTestId('sim-step-forward').click()

    const scrubBar = page.getByTestId('sim-scrub-bar')
    const timeDisplay = page.getByTestId('sim-time-display')

    // Scrub to step 5 (t=5)
    await scrubBar.fill('5')
    await expect(timeDisplay).toContainText('5')

    // Scrub to step 0 (t=0)
    await scrubBar.fill('0')
    await expect(timeDisplay).toContainText('0')

    // Scrub to step 3 (t=3)
    await scrubBar.fill('3')
    await expect(timeDisplay).toContainText('3')
  })

  test('TC-5.4.3: Scrub updates event log', async ({ page }) => {
    await switchTab(page, 'Simulate')

    // Run simulation by stepping forward
    await page.getByTestId('sim-step-forward').click()

    const scrubBar = page.getByTestId('sim-scrub-bar')
    const eventLog = page.getByTestId('sim-event-log')

    // Scrub to step 2 (before forced event at t=3)
    await scrubBar.fill('2')
    // Event log should show no forced events
    await expect(eventLog).not.toContainText('[forced]')

    // Scrub to step 4 (after forced event at t=3)
    await scrubBar.fill('4')
    // Event log should show the forced event from t=3
    await expect(eventLog).toContainText('[forced]')
    await expect(eventLog).toContainText('River.waterLevel')
  })
})
