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

/** Helper: set up a basic scenario with forced events for simulation */
async function setupSimulationScenario(page: Page) {
  // Create components
  await createComponentWithParams(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
  await createComponentWithParams(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }], { x: 500, y: 200 })

  // Create scenario with forced events
  await switchTab(page, 'Scenarios')
  await page.getByTestId('create-scenario').click()

  // Add event: River.waterLevel = 10 at t=3
  await page.getByTestId('add-forced-event').click()
  const row1 = page.locator('[data-testid^="event-row-"]').first()
  await row1.locator('select').first().selectOption({ label: 'River' })
  await row1.locator('select').nth(1).selectOption({ label: 'waterLevel' })
  const val1 = row1.locator('input[type="number"]').first()
  await val1.clear()
  await val1.fill('10')
  const time1 = row1.locator('input[type="number"]').nth(1)
  await time1.clear()
  await time1.fill('3')

  // Add event: Dam.pressure = 20 at t=5
  await page.getByTestId('add-forced-event').click()
  const row2 = page.locator('[data-testid^="event-row-"]').nth(1)
  await row2.locator('select').first().selectOption({ label: 'Dam' })
  await row2.locator('select').nth(1).selectOption({ label: 'pressure' })
  const val2 = row2.locator('input[type="number"]').first()
  await val2.clear()
  await val2.fill('20')
  const time2 = row2.locator('input[type="number"]').nth(1)
  await time2.clear()
  await time2.fill('5')
}

test.describe('Epic 5 - US-5.1: Start, Pause, and Stop Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
    await setupSimulationScenario(page)
  })

  test('TC-5.1.1: Play starts simulation from t=0', async ({ page }) => {
    await switchTab(page, 'Simulate')

    // Time display should show t=0
    const timeDisplay = page.getByTestId('sim-time-display')
    await expect(timeDisplay).toContainText('0')

    // Click Play
    await page.getByTestId('sim-play-button').click()

    // Wait for time to advance past 0
    await expect(async () => {
      const text = await timeDisplay.textContent()
      const match = text?.match(/(\d+)/)
      expect(Number(match?.[1] ?? 0)).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })
  })

  test('TC-5.1.2: Pause freezes at current time', async ({ page }) => {
    await switchTab(page, 'Simulate')
    await page.getByTestId('sim-play-button').click()

    // Wait for time to advance to at least 2
    const timeDisplay = page.getByTestId('sim-time-display')
    await expect(async () => {
      const text = await timeDisplay.textContent()
      const match = text?.match(/(\d+)/)
      expect(Number(match?.[1] ?? 0)).toBeGreaterThanOrEqual(2)
    }).toPass({ timeout: 10000 })

    // Pause
    await page.getByTestId('sim-pause-button').click()
    const pausedText = await timeDisplay.textContent()

    // Wait and verify time didn't change
    await page.waitForTimeout(1500)
    await expect(timeDisplay).toHaveText(pausedText!)
  })

  test('TC-5.1.3: Resume from pause continues', async ({ page }) => {
    await switchTab(page, 'Simulate')
    await page.getByTestId('sim-play-button').click()

    // Wait for time to advance
    const timeDisplay = page.getByTestId('sim-time-display')
    await expect(async () => {
      const text = await timeDisplay.textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })

    // Pause
    await page.getByTestId('sim-pause-button').click()
    const pausedText = await timeDisplay.textContent()
    const pausedTime = Number(pausedText?.match(/(\d+)/)?.[1] ?? 0)

    // Resume
    await page.getByTestId('sim-play-button').click()

    // Wait for time to advance beyond paused time
    await expect(async () => {
      const text = await timeDisplay.textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThan(pausedTime)
    }).toPass({ timeout: 5000 })
  })

  test('TC-5.1.4: Stop resets to t=0', async ({ page }) => {
    await switchTab(page, 'Simulate')
    await page.getByTestId('sim-play-button').click()

    // Wait for time to advance
    const timeDisplay = page.getByTestId('sim-time-display')
    await expect(async () => {
      const text = await timeDisplay.textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThan(0)
    }).toPass({ timeout: 5000 })

    // Stop
    await page.getByTestId('sim-stop-button').click()

    // Time should reset to 0
    await expect(timeDisplay).toContainText('0')
  })

  test('TC-5.1.5: Button states are correct per playback state', async ({ page }) => {
    await switchTab(page, 'Simulate')

    const playBtn = page.getByTestId('sim-play-button')
    const pauseBtn = page.getByTestId('sim-pause-button')
    const stopBtn = page.getByTestId('sim-stop-button')

    // Stopped state: Play enabled, Pause disabled, Stop disabled
    await expect(playBtn).toBeEnabled()
    await expect(pauseBtn).toBeDisabled()
    await expect(stopBtn).toBeDisabled()

    // Playing state: Play disabled, Pause enabled, Stop enabled
    await playBtn.click()
    await expect(playBtn).toBeDisabled()
    await expect(pauseBtn).toBeEnabled()
    await expect(stopBtn).toBeEnabled()

    // Paused state: Play enabled (resume), Pause disabled, Stop enabled
    await pauseBtn.click()
    await expect(playBtn).toBeEnabled()
    await expect(pauseBtn).toBeDisabled()
    await expect(stopBtn).toBeEnabled()

    // Back to stopped
    await stopBtn.click()
    await expect(playBtn).toBeEnabled()
    await expect(pauseBtn).toBeDisabled()
    await expect(stopBtn).toBeDisabled()
  })
})
