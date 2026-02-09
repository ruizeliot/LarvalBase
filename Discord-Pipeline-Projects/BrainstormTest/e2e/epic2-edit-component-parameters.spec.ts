import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

async function createInternalComponent(page: Page, name: string, params: { name: string; value: number }[] = []) {
  await dragPaletteToCanvas(page, 'internal')
  // Node is auto-selected after drag
  const nameInput = page.getByTestId('property-name')
  await nameInput.fill(name)
  for (const p of params) {
    await page.getByTestId('add-parameter').click()
    // Get the last parameter row
    const paramRows = page.locator('[data-testid="param-row"]')
    const lastRow = paramRows.last()
    await lastRow.locator('input[placeholder="name"]').fill(p.name)
    await lastRow.locator('input[placeholder="name"]').press('Tab')
    await lastRow.locator('input[type="number"]').fill(String(p.value))
    await lastRow.locator('input[type="number"]').press('Tab')
  }
}

test.describe('Epic 2 - US-2.3: Edit Component Parameters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-2.3.1: Add parameters to a component', async ({ page }) => {
    // Setup: create component "Pump" with no params
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Pump')

    // Click "Add Parameter" and enter name/value
    await page.getByTestId('add-parameter').click()
    const paramRows = page.locator('[data-testid="param-row"]')
    const firstRow = paramRows.first()
    await firstRow.locator('input[placeholder="name"]').fill('flowRate')
    await firstRow.locator('input[type="number"]').fill('100')

    // Add second parameter
    await page.getByTestId('add-parameter').click()
    const secondRow = paramRows.last()
    await secondRow.locator('input[placeholder="name"]').fill('temperature')
    await secondRow.locator('input[type="number"]').fill('25')

    // Assert properties panel lists both parameters
    await expect(paramRows).toHaveCount(2)

    // Assert canvas node displays parameter values
    const node = page.locator('.react-flow__node').first()
    await expect(node.getByText('flowRate')).toBeVisible()
    await expect(node.getByText('100')).toBeVisible()
    await expect(node.getByText('temperature')).toBeVisible()
    await expect(node.getByText('25')).toBeVisible()
  })

  test('TC-2.3.2: Edit an existing parameter', async ({ page }) => {
    // Setup: create component with a parameter
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Pump')
    await page.getByTestId('add-parameter').click()
    const paramRows = page.locator('[data-testid="param-row"]')
    const row = paramRows.first()
    await row.locator('input[placeholder="name"]').fill('flowRate')
    await row.locator('input[type="number"]').fill('100')

    // Edit the name
    await row.locator('input[placeholder="name"]').fill('flow')
    // Edit the value
    await row.locator('input[type="number"]').fill('200')

    // Assert canvas node reflects updated name and value
    const node = page.locator('.react-flow__node').first()
    await expect(node.getByText('flow')).toBeVisible()
    await expect(node.getByText('200')).toBeVisible()
  })

  test('TC-2.3.3: Remove a parameter', async ({ page }) => {
    // Setup: create component with 2 parameters
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Pump')
    await page.getByTestId('add-parameter').click()
    await page.getByTestId('add-parameter').click()

    const paramRows = page.locator('[data-testid="param-row"]')
    await expect(paramRows).toHaveCount(2)

    // Name the params
    const firstRow = paramRows.first()
    await firstRow.locator('input[placeholder="name"]').fill('flowRate')
    await firstRow.locator('input[type="number"]').fill('100')
    const secondRow = paramRows.last()
    await secondRow.locator('input[placeholder="name"]').fill('temp')
    await secondRow.locator('input[type="number"]').fill('25')

    // Remove first parameter
    await firstRow.getByTestId('remove-parameter').click()

    // Assert "flowRate" is no longer in the properties panel
    await expect(paramRows).toHaveCount(1)
    await expect(paramRows.first().locator('input[placeholder="name"]')).toHaveValue('temp')

    // Assert canvas node no longer shows "flowRate"
    const node = page.locator('.react-flow__node').first()
    await expect(node.getByText('flowRate')).not.toBeVisible()
    await expect(node.getByText('temp')).toBeVisible()
  })

  test('TC-2.3.4: Empty parameter name shows validation error', async ({ page }) => {
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Pump')

    // Add parameter but leave name empty
    await page.getByTestId('add-parameter').click()
    const paramRows = page.locator('[data-testid="param-row"]')
    const row = paramRows.first()

    // Leave name empty, set value
    await row.locator('input[placeholder="name"]').fill('')
    await row.locator('input[type="number"]').fill('50')
    // Trigger validation by blurring
    await row.locator('input[placeholder="name"]').focus()
    await row.locator('input[placeholder="name"]').blur()

    // Assert validation error (param-error is a sibling of param-row, look on page)
    await expect(page.getByTestId('param-error')).toBeVisible()
  })

  test('TC-2.3.5: Duplicate parameter name shows validation error', async ({ page }) => {
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Pump')

    // Add first param "flow"
    await page.getByTestId('add-parameter').click()
    const paramRows = page.locator('[data-testid="param-row"]')
    await paramRows.first().locator('input[placeholder="name"]').fill('flow')
    await paramRows.first().locator('input[type="number"]').fill('100')

    // Add second param with same name "flow"
    await page.getByTestId('add-parameter').click()
    await paramRows.last().locator('input[placeholder="name"]').fill('flow')
    await paramRows.last().locator('input[type="number"]').fill('200')
    await paramRows.last().locator('input[placeholder="name"]').blur()

    // Assert validation error on the duplicate
    await expect(page.getByTestId('param-error').last()).toBeVisible()
  })

  test('TC-2.3.6: Non-numeric parameter value shows validation error', async ({ page }) => {
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Pump')

    await page.getByTestId('add-parameter').click()
    const paramRows = page.locator('[data-testid="param-row"]')
    const row = paramRows.first()
    await row.locator('input[placeholder="name"]').fill('rate')

    // Type non-numeric into the number field — HTML number inputs reject non-numeric
    // So the value will be empty/NaN
    const numInput = row.locator('input[type="number"]')
    await numInput.fill('')
    await numInput.blur()

    // Assert validation error
    await expect(page.getByTestId('param-error')).toBeVisible()
  })
})
