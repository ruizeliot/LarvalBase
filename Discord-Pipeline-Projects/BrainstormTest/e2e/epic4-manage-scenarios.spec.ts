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

test.describe('Epic 4 - US-4.1: Create and Manage Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-4.1.1: Create a new scenario', async ({ page }) => {
    // 1. Switch to Scenarios tab
    await switchTab(page, 'Scenarios')

    // 2. Assert scenario list in left panel shows empty state
    await expect(page.getByText(/No scenarios yet/)).toBeVisible()

    // 3. Click "New Scenario" button
    await page.getByTestId('create-scenario').click()

    // 4. Assert scenario appears in list with auto-generated name
    await expect(page.getByText('Scenario 1')).toBeVisible()

    // 5. Assert it is selected (active/highlighted — has primary color border)
    const scenarioItem = page.locator('[data-testid^="scenario-item-"]').first()
    await expect(scenarioItem).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // 6. Assert scenario name input is visible in editor area
    await expect(page.getByTestId('scenario-name-input')).toHaveValue('Scenario 1')
  })

  test('TC-4.1.2: Duplicate a scenario with forced events', async ({ page }) => {
    // Setup: Switch to Scenarios, create scenario, add events
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await expect(page.getByText('Scenario 1')).toBeVisible()

    // Add 2 forced events
    await page.getByTestId('add-forced-event').click()
    await page.getByTestId('add-forced-event').click()

    // Verify 2 events exist (event rows)
    await expect(page.locator('[data-testid^="event-row-"]')).toHaveCount(2)

    // Click duplicate button
    const duplicateBtn = page.locator('[data-testid^="duplicate-scenario-"]').first()
    await duplicateBtn.click()

    // Assert new scenario appears with "(copy)" suffix
    await expect(page.getByText('Scenario 1 (copy)')).toBeVisible()

    // Assert the duplicate is selected (its name appears in the editor)
    await expect(page.getByTestId('scenario-name-input')).toHaveValue('Scenario 1 (copy)')

    // Assert duplicate has same number of events
    await expect(page.locator('[data-testid^="event-row-"]')).toHaveCount(2)
  })

  test('TC-4.1.3: Delete a scenario with confirmation', async ({ page }) => {
    // Setup: create scenario
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await expect(page.getByText('Scenario 1')).toBeVisible()

    // Click delete button
    const deleteBtn = page.locator('[data-testid^="delete-scenario-"]').first()
    await deleteBtn.click()

    // Assert confirmation dialog appears
    await expect(page.getByTestId('scenario-delete-confirm')).toBeVisible()
    await expect(page.getByText(/Delete scenario/)).toBeVisible()

    // Click Cancel — scenario still exists
    await page.getByTestId('scenario-delete-cancel').click()
    await expect(page.getByText('Scenario 1')).toBeVisible()

    // Delete again, this time confirm
    await deleteBtn.click()
    await page.getByTestId('scenario-delete-ok').click()

    // Assert scenario is removed
    await expect(page.getByText('Scenario 1')).not.toBeVisible()
    await expect(page.getByText(/No scenarios yet/)).toBeVisible()
  })

  test('TC-4.1.4: Select between multiple scenarios', async ({ page }) => {
    // Setup: Create 2 scenarios with different events
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()

    // Rename first to "Scenario A"
    const nameInput = page.getByTestId('scenario-name-input')
    await nameInput.clear()
    await nameInput.fill('Scenario A')

    // Add 1 event to Scenario A
    await page.getByTestId('add-forced-event').click()
    await expect(page.locator('[data-testid^="event-row-"]')).toHaveCount(1)

    // Create second scenario
    await page.getByTestId('create-scenario').click()
    await expect(page.getByTestId('scenario-name-input')).toHaveValue('Scenario 2')

    // Rename to "Scenario B"
    await nameInput.clear()
    await nameInput.fill('Scenario B')

    // Add 3 events to Scenario B
    await page.getByTestId('add-forced-event').click()
    await page.getByTestId('add-forced-event').click()
    await page.getByTestId('add-forced-event').click()
    await expect(page.locator('[data-testid^="event-row-"]')).toHaveCount(3)

    // Select Scenario A — assert 1 event
    await page.getByText('Scenario A').click()
    await expect(page.getByTestId('scenario-name-input')).toHaveValue('Scenario A')
    await expect(page.locator('[data-testid^="event-row-"]')).toHaveCount(1)

    // Select Scenario B — assert 3 events
    await page.getByText('Scenario B').click()
    await expect(page.getByTestId('scenario-name-input')).toHaveValue('Scenario B')
    await expect(page.locator('[data-testid^="event-row-"]')).toHaveCount(3)
  })
})
