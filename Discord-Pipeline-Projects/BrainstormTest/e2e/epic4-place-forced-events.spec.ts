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

test.describe('Epic 4 - US-4.3: Place Forced Events on Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
    // Setup: Create components with parameters
    await createComponentWithParams(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
    await createComponentWithParams(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }, { name: 'integrity', value: '100' }], { x: 500, y: 200 })
  })

  test('TC-4.3.1: Add forced events at different time steps', async ({ page }) => {
    // Switch to Scenarios, create scenario
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()

    // Add first forced event
    await page.getByTestId('add-forced-event').click()

    // Get the event row
    const eventRows = page.locator('[data-testid^="event-row-"]')
    await expect(eventRows).toHaveCount(1)

    // Select River component in first event
    const row1 = eventRows.first()
    const compSelect1 = row1.locator('select').first()
    // Find the River option by looking at option text content
    await compSelect1.selectOption({ label: 'River' })

    // Select waterLevel parameter
    const paramSelect1 = row1.locator('select').nth(1)
    await paramSelect1.selectOption({ label: 'waterLevel' })

    // Set value to 10
    const valueInput1 = row1.locator('input[type="number"]').first()
    await valueInput1.clear()
    await valueInput1.fill('10')

    // Set time to 3
    const timeInput1 = row1.locator('input[type="number"]').nth(1)
    await timeInput1.clear()
    await timeInput1.fill('3')

    // Add second event
    await page.getByTestId('add-forced-event').click()
    await expect(eventRows).toHaveCount(2)

    // Select Dam.pressure = 30 at t=5
    const row2 = eventRows.nth(1)
    await row2.locator('select').first().selectOption({ label: 'Dam' })
    await row2.locator('select').nth(1).selectOption({ label: 'pressure' })
    const valueInput2 = row2.locator('input[type="number"]').first()
    await valueInput2.clear()
    await valueInput2.fill('30')
    const timeInput2 = row2.locator('input[type="number"]').nth(1)
    await timeInput2.clear()
    await timeInput2.fill('5')

    // Add third event: Dam.integrity = 50 at t=8
    await page.getByTestId('add-forced-event').click()
    await expect(eventRows).toHaveCount(3)

    const row3 = eventRows.nth(2)
    await row3.locator('select').first().selectOption({ label: 'Dam' })
    await row3.locator('select').nth(1).selectOption({ label: 'integrity' })
    const valueInput3 = row3.locator('input[type="number"]').first()
    await valueInput3.clear()
    await valueInput3.fill('50')
    const timeInput3 = row3.locator('input[type="number"]').nth(1)
    await timeInput3.clear()
    await timeInput3.fill('8')

    // Verify all 3 events are displayed
    await expect(eventRows).toHaveCount(3)
  })

  test('TC-4.3.2: Multiple events at the same time step', async ({ page }) => {
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()

    // Add two events at t=5
    await page.getByTestId('add-forced-event').click()
    await page.getByTestId('add-forced-event').click()

    const eventRows = page.locator('[data-testid^="event-row-"]')
    await expect(eventRows).toHaveCount(2)

    // Event 1: River.waterLevel = 10 at t=5
    const row1 = eventRows.first()
    await row1.locator('select').first().selectOption({ label: 'River' })
    await row1.locator('select').nth(1).selectOption({ label: 'waterLevel' })
    const valueInput1 = row1.locator('input[type="number"]').first()
    await valueInput1.clear()
    await valueInput1.fill('10')
    const timeInput1 = row1.locator('input[type="number"]').nth(1)
    await timeInput1.clear()
    await timeInput1.fill('5')

    // Event 2: Dam.pressure = 30 at t=5
    const row2 = eventRows.nth(1)
    await row2.locator('select').first().selectOption({ label: 'Dam' })
    await row2.locator('select').nth(1).selectOption({ label: 'pressure' })
    const valueInput2 = row2.locator('input[type="number"]').first()
    await valueInput2.clear()
    await valueInput2.fill('30')
    const timeInput2 = row2.locator('input[type="number"]').nth(1)
    await timeInput2.clear()
    await timeInput2.fill('5')

    // Both events exist at t=5
    await expect(eventRows).toHaveCount(2)
    // Verify both time inputs show 5
    await expect(row1.locator('input[type="number"]').nth(1)).toHaveValue('5')
    await expect(row2.locator('input[type="number"]').nth(1)).toHaveValue('5')
  })

  test('TC-4.3.3: Parameter dropdown disabled when no component selected', async ({ page }) => {
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()

    // Add event without selecting component
    await page.getByTestId('add-forced-event').click()
    const row = page.locator('[data-testid^="event-row-"]').first()

    // Parameter select should be disabled when no component is selected
    const paramSelect = row.locator('select').nth(1)
    await expect(paramSelect).toBeDisabled()

    // Now select a component
    await row.locator('select').first().selectOption({ label: 'River' })

    // Parameter select should now be enabled
    await expect(paramSelect).not.toBeDisabled()
    // And should have the waterLevel option
    await expect(paramSelect).toContainText('waterLevel')
  })
})
