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
  // Deselect
  await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })
}

/** Helper: create a scenario with forced events */
async function setupScenarioWithEvents(page: Page) {
  await switchTab(page, 'Scenarios')
  await page.getByTestId('create-scenario').click()

  // Add 2 events
  await page.getByTestId('add-forced-event').click()
  await page.getByTestId('add-forced-event').click()

  const eventRows = page.locator('[data-testid^="event-row-"]')

  // Event 1: River.waterLevel = 10 at t=3
  const row1 = eventRows.first()
  await row1.locator('select').first().selectOption({ label: 'River' })
  await row1.locator('select').nth(1).selectOption({ label: 'waterLevel' })
  const valueInput1 = row1.locator('input[type="number"]').first()
  await valueInput1.clear()
  await valueInput1.fill('10')
  const timeInput1 = row1.locator('input[type="number"]').nth(1)
  await timeInput1.clear()
  await timeInput1.fill('3')

  // Event 2: Dam.pressure = 30 at t=7
  const row2 = eventRows.nth(1)
  await row2.locator('select').first().selectOption({ label: 'Dam' })
  await row2.locator('select').nth(1).selectOption({ label: 'pressure' })
  const valueInput2 = row2.locator('input[type="number"]').first()
  await valueInput2.clear()
  await valueInput2.fill('30')
  const timeInput2 = row2.locator('input[type="number"]').nth(1)
  await timeInput2.clear()
  await timeInput2.fill('7')
}

test.describe('Epic 4 - US-4.4: Edit and Remove Forced Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
    // Setup: Create components
    await createComponentWithParams(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
    await createComponentWithParams(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }, { name: 'integrity', value: '100' }], { x: 500, y: 200 })
  })

  test('TC-4.4.1: Edit event value and time', async ({ page }) => {
    await setupScenarioWithEvents(page)

    const eventRows = page.locator('[data-testid^="event-row-"]')
    const row1 = eventRows.first()

    // Verify initial values
    await expect(row1.locator('input[type="number"]').first()).toHaveValue('10')
    await expect(row1.locator('input[type="number"]').nth(1)).toHaveValue('3')

    // Edit value from 10 to 15
    const valueInput = row1.locator('input[type="number"]').first()
    await valueInput.clear()
    await valueInput.fill('15')
    await expect(valueInput).toHaveValue('15')

    // Edit time from 3 to 4
    const timeInput = row1.locator('input[type="number"]').nth(1)
    await timeInput.clear()
    await timeInput.fill('4')
    await expect(timeInput).toHaveValue('4')

    // Event count unchanged
    await expect(eventRows).toHaveCount(2)
  })

  test('TC-4.4.2: Delete an event', async ({ page }) => {
    await setupScenarioWithEvents(page)

    const eventRows = page.locator('[data-testid^="event-row-"]')
    await expect(eventRows).toHaveCount(2)

    // Delete first event using the remove button
    const removeBtn = page.locator('[data-testid^="remove-event-"]').first()
    await removeBtn.click()

    // Only 1 event should remain
    await expect(eventRows).toHaveCount(1)

    // The remaining event should be the Dam.pressure one (second one)
    const remainingRow = eventRows.first()
    await expect(remainingRow.locator('input[type="number"]').first()).toHaveValue('30')
    await expect(remainingRow.locator('input[type="number"]').nth(1)).toHaveValue('7')
  })

  test('TC-4.4.3: Edit event to same time as another event', async ({ page }) => {
    await setupScenarioWithEvents(page)

    const eventRows = page.locator('[data-testid^="event-row-"]')

    // Event 2 is at t=7, change to t=3 (same as event 1)
    const row2 = eventRows.nth(1)
    const timeInput = row2.locator('input[type="number"]').nth(1)
    await timeInput.clear()
    await timeInput.fill('3')

    // Both events should exist
    await expect(eventRows).toHaveCount(2)
    // Both at t=3
    await expect(eventRows.first().locator('input[type="number"]').nth(1)).toHaveValue('3')
    await expect(eventRows.nth(1).locator('input[type="number"]').nth(1)).toHaveValue('3')
  })

  test('TC-4.4.4: Change event component clears parameter selection', async ({ page }) => {
    await setupScenarioWithEvents(page)

    const eventRows = page.locator('[data-testid^="event-row-"]')
    const row1 = eventRows.first()

    // Event 1 has River + waterLevel selected
    // Change component from River to Dam
    await row1.locator('select').first().selectOption({ label: 'Dam' })

    // Parameter should be cleared (reset to placeholder)
    const paramSelect = row1.locator('select').nth(1)
    await expect(paramSelect).toHaveValue('')

    // Parameter dropdown should now show Dam's parameters
    await expect(paramSelect).toContainText('pressure')
    await expect(paramSelect).toContainText('integrity')
  })

  test('TC-4.4.5: Delete all events shows empty state', async ({ page }) => {
    await setupScenarioWithEvents(page)

    const eventRows = page.locator('[data-testid^="event-row-"]')
    await expect(eventRows).toHaveCount(2)

    // Delete both events
    await page.locator('[data-testid^="remove-event-"]').first().click()
    await expect(eventRows).toHaveCount(1)
    await page.locator('[data-testid^="remove-event-"]').first().click()
    await expect(eventRows).toHaveCount(0)

    // Empty state message should appear
    await expect(page.getByTestId('no-events-message')).toBeVisible()
  })
})
