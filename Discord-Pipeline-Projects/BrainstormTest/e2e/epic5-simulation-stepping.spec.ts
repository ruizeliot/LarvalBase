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

test.describe('Epic 5 - US-5.2: Step Forward and Backward', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
    await setupSimulationScenario(page)
  })

  test('TC-5.2.1: Step forward advances one time step', async ({ page }) => {
    await switchTab(page, 'Simulate')

    const timeDisplay = page.getByTestId('sim-time-display')
    await expect(timeDisplay).toContainText('0')

    // Step forward 3 times
    await page.getByTestId('sim-step-forward').click()
    await expect(timeDisplay).toContainText('1')

    await page.getByTestId('sim-step-forward').click()
    await expect(timeDisplay).toContainText('2')

    await page.getByTestId('sim-step-forward').click()
    await expect(timeDisplay).toContainText('3')
  })

  test('TC-5.2.2: Step backward reverses one time step', async ({ page }) => {
    await switchTab(page, 'Simulate')

    const timeDisplay = page.getByTestId('sim-time-display')

    // Step forward to t=5
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('sim-step-forward').click()
    }
    await expect(timeDisplay).toContainText('5')

    // Step backward
    await page.getByTestId('sim-step-backward').click()
    await expect(timeDisplay).toContainText('4')
  })

  test('TC-5.2.3: Step backward at t=0 does nothing', async ({ page }) => {
    await switchTab(page, 'Simulate')

    const timeDisplay = page.getByTestId('sim-time-display')
    await expect(timeDisplay).toContainText('0')

    // Step backward at t=0
    await page.getByTestId('sim-step-backward').click()
    await expect(timeDisplay).toContainText('0')
  })

  test('TC-5.2.4: Stepping available when paused', async ({ page }) => {
    await switchTab(page, 'Simulate')

    // Play and then pause
    await page.getByTestId('sim-play-button').click()
    await expect(async () => {
      const text = await page.getByTestId('sim-time-display').textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })

    await page.getByTestId('sim-pause-button').click()
    const pausedText = await page.getByTestId('sim-time-display').textContent()
    const pausedTime = Number(pausedText?.match(/(\d+)/)?.[1] ?? 0)

    // Step forward and backward should work when paused
    await page.getByTestId('sim-step-forward').click()
    const afterStep = await page.getByTestId('sim-time-display').textContent()
    expect(Number(afterStep?.match(/(\d+)/)?.[1] ?? 0)).toBe(pausedTime + 1)
  })
})
