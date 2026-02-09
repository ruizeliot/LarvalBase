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

  await page.getByTestId('add-forced-event').click()
  const row1 = page.locator('[data-testid^="event-row-"]').first()
  await row1.locator('select').first().selectOption({ label: 'River' })
  await row1.locator('select').nth(1).selectOption({ label: 'waterLevel' })
  await row1.locator('input[type="number"]').first().clear()
  await row1.locator('input[type="number"]').first().fill('10')
  await row1.locator('input[type="number"]').nth(1).clear()
  await row1.locator('input[type="number"]').nth(1).fill('3')
}

test.describe('Epic 5 - US-5.3: Adjust Simulation Speed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
    await setupSimulationScenario(page)
  })

  test('TC-5.3.1: Speed slider visible with default 1x', async ({ page }) => {
    await switchTab(page, 'Simulate')

    const slider = page.getByTestId('sim-speed-slider')
    const display = page.getByTestId('sim-speed-display')

    await expect(slider).toBeVisible()
    await expect(display).toContainText('1x')
  })

  test('TC-5.3.2: Speed change during playback takes effect', async ({ page }) => {
    await switchTab(page, 'Simulate')

    // Change speed to 4x before playing
    const slider = page.getByTestId('sim-speed-slider')
    await slider.fill('4')

    // Verify speed display
    await expect(page.getByTestId('sim-speed-display')).toContainText('4x')

    // Play and verify time advances quickly
    await page.getByTestId('sim-play-button').click()
    await expect(async () => {
      const text = await page.getByTestId('sim-time-display').textContent()
      expect(Number(text?.match(/(\d+)/)?.[1] ?? 0)).toBeGreaterThanOrEqual(3)
    }).toPass({ timeout: 3000 })
  })

  test('TC-5.3.3: Min and max speed bounds', async ({ page }) => {
    await switchTab(page, 'Simulate')

    const slider = page.getByTestId('sim-speed-slider')
    const display = page.getByTestId('sim-speed-display')

    // Set to minimum
    await slider.fill('0.5')
    await expect(display).toContainText('0.5x')

    // Set to maximum
    await slider.fill('4')
    await expect(display).toContainText('4x')

    // Verify slider has correct min/max attributes
    await expect(slider).toHaveAttribute('min', '0.5')
    await expect(slider).toHaveAttribute('max', '4')
  })
})
