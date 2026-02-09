import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

test.describe('Epic 2 - US-2.4: Define Capacities on Internal Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-2.4.1: Add capacity to internal component', async ({ page }) => {
    // Setup: create internal component "Dam"
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Dam')

    // Assert "Capacities" section is visible
    await expect(page.getByTestId('add-capacity')).toBeVisible()

    // Click "Add Capacity"
    await page.getByTestId('add-capacity').click()
    const capRows = page.locator('[data-testid="capacity-row"]')
    await expect(capRows).toHaveCount(1)

    // Enter name, min, max
    const row = capRows.first()
    await row.locator('input[placeholder="name"]').fill('maxPressure')
    await row.locator('input[placeholder="min"]').fill('0')
    await row.locator('input[placeholder="max"]').fill('50')

    // Assert capacity appears on the canvas node
    const node = page.locator('.react-flow__node').first()
    await expect(node.getByText('maxPressure')).toBeVisible()
    await expect(node.getByText('[0, 50]')).toBeVisible()
  })

  test('TC-2.4.2: Edit and remove capacity', async ({ page }) => {
    // Setup: create internal component with a capacity
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Dam')
    await page.getByTestId('add-capacity').click()

    const capRows = page.locator('[data-testid="capacity-row"]')
    const row = capRows.first()
    await row.locator('input[placeholder="name"]').fill('maxPressure')
    await row.locator('input[placeholder="min"]').fill('0')
    await row.locator('input[placeholder="max"]').fill('50')

    // Edit: change max to 80
    await row.locator('input[placeholder="max"]').fill('80')

    // Assert capacity shows range [0, 80] on canvas
    const node = page.locator('.react-flow__node').first()
    await expect(node.getByText('[0, 80]')).toBeVisible()

    // Remove the capacity
    await row.getByTestId('remove-capacity').click()

    // Assert capacities list is empty
    await expect(capRows).toHaveCount(0)
  })

  test('TC-2.4.3: External components have no capacities section', async ({ page }) => {
    // Setup: create external component
    await dragPaletteToCanvas(page, 'external')

    // Assert properties panel shows "Parameters" section (add-parameter visible)
    await expect(page.getByTestId('add-parameter')).toBeVisible()

    // Assert properties panel does NOT contain "Capacities" section
    await expect(page.getByTestId('add-capacity')).not.toBeVisible()
  })

  test('TC-2.4.4: Capacity min greater than max shows validation error', async ({ page }) => {
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Dam')
    await page.getByTestId('add-capacity').click()

    const capRows = page.locator('[data-testid="capacity-row"]')
    const row = capRows.first()
    await row.locator('input[placeholder="name"]').fill('pressure')
    await row.locator('input[placeholder="min"]').fill('100')
    await row.locator('input[placeholder="max"]').fill('50')
    await row.locator('input[placeholder="max"]').blur()

    // Assert validation error
    await expect(page.getByTestId('capacity-error')).toBeVisible()
  })

  test('TC-2.4.5: Duplicate capacity name shows validation error', async ({ page }) => {
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Dam')

    // Add first capacity
    await page.getByTestId('add-capacity').click()
    const capRows = page.locator('[data-testid="capacity-row"]')
    await capRows.first().locator('input[placeholder="name"]').fill('maxPressure')
    await capRows.first().locator('input[placeholder="min"]').fill('0')
    await capRows.first().locator('input[placeholder="max"]').fill('50')

    // Add second capacity with same name
    await page.getByTestId('add-capacity').click()
    await capRows.last().locator('input[placeholder="name"]').fill('maxPressure')
    await capRows.last().locator('input[placeholder="min"]').fill('0')
    await capRows.last().locator('input[placeholder="max"]').fill('100')
    await capRows.last().locator('input[placeholder="name"]').blur()

    // Assert validation error
    await expect(page.getByTestId('capacity-error').last()).toBeVisible()
  })
})
