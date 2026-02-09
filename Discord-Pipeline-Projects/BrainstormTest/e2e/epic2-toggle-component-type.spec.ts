import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

test.describe('Epic 2 - US-2.5: Toggle Component Type', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-2.5.1: Toggle internal to external', async ({ page }) => {
    // Setup: create internal component with a parameter
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Node')
    await page.getByTestId('add-parameter').click()
    const paramRow = page.locator('[data-testid="param-row"]').first()
    await paramRow.locator('input[placeholder="name"]').fill('val')
    await paramRow.locator('input[type="number"]').fill('10')

    // Assert type toggle shows "Internal"
    const internalBtn = page.getByTestId('type-internal')
    await expect(internalBtn).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Click toggle to switch to "External"
    await page.getByTestId('type-external').click()

    // Assert type toggle shows "External"
    const externalBtn = page.getByTestId('type-external')
    await expect(externalBtn).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Assert "Capacities" section disappears from properties
    await expect(page.getByTestId('add-capacity')).not.toBeVisible()

    // Assert canvas node styling changes to external appearance
    const node = page.locator('.react-flow__node').first()
    await expect(node.locator('div').first()).toHaveClass(/border-\[var\(--color-node-external-border\)\]/)

    // Assert parameters are preserved ("val: 10" still shown)
    await expect(node.getByText('val')).toBeVisible()
    await expect(node.getByText('10')).toBeVisible()
  })

  test('TC-2.5.2: Toggle external to internal', async ({ page }) => {
    // Setup: create external component with a parameter
    await dragPaletteToCanvas(page, 'external')
    await page.getByTestId('property-name').fill('Env')
    await page.getByTestId('add-parameter').click()
    const paramRow = page.locator('[data-testid="param-row"]').first()
    await paramRow.locator('input[placeholder="name"]').fill('temp')
    await paramRow.locator('input[type="number"]').fill('30')

    // Click toggle to switch to "Internal"
    await page.getByTestId('type-internal').click()

    // Assert "Capacities" section appears
    await expect(page.getByTestId('add-capacity')).toBeVisible()

    // Assert canvas node styling changes to internal appearance
    const node = page.locator('.react-flow__node').first()
    await expect(node.locator('div').first()).toHaveClass(/border-\[var\(--color-node-internal-border\)\]/)

    // Assert parameters are preserved
    await expect(node.getByText('temp')).toBeVisible()
    await expect(node.getByText('30')).toBeVisible()
  })

  test('TC-2.5.3: Confirmation when capacities would be lost', async ({ page }) => {
    // Setup: create internal component with a capacity
    await dragPaletteToCanvas(page, 'internal')
    await page.getByTestId('property-name').fill('Dam')
    await page.getByTestId('add-capacity').click()
    const capRow = page.locator('[data-testid="capacity-row"]').first()
    await capRow.locator('input[placeholder="name"]').fill('maxP')
    await capRow.locator('input[placeholder="min"]').fill('0')
    await capRow.locator('input[placeholder="max"]').fill('100')

    // Click toggle to switch to "External"
    await page.getByTestId('type-external').click()

    // Assert confirmation dialog appears
    const dialog = page.getByTestId('confirm-dialog')
    await expect(dialog).toBeVisible()
    // Assert dialog lists "maxP" as an affected capacity
    await expect(dialog.getByText('maxP')).toBeVisible()

    // Click "Cancel" — type should still be Internal
    await dialog.getByTestId('confirm-cancel').click()
    await expect(page.getByTestId('type-internal')).toHaveClass(/bg-\[var\(--color-primary\)\]/)
    // Capacity still there
    await expect(page.locator('[data-testid="capacity-row"]')).toHaveCount(1)

    // Click toggle again, this time confirm
    await page.getByTestId('type-external').click()
    await expect(dialog).toBeVisible()
    await dialog.getByTestId('confirm-ok').click()

    // Assert type is now "External" and capacities are gone
    await expect(page.getByTestId('type-external')).toHaveClass(/bg-\[var\(--color-primary\)\]/)
    await expect(page.getByTestId('add-capacity')).not.toBeVisible()
  })
})
