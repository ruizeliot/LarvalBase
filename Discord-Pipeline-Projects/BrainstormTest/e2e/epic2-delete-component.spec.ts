import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

test.describe('Epic 2 - US-2.6: Delete Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-2.6.1: Delete a standalone component via Delete key', async ({ page }) => {
    // Setup: create internal component
    await dragPaletteToCanvas(page, 'internal')
    await expect(page.getByText('Component 1')).toBeVisible()

    // Select it by clicking
    await page.getByText('Component 1').click()
    await expect(page.getByTestId('property-name')).toBeVisible()

    // Press Delete key
    await page.keyboard.press('Delete')

    // Assert node is removed from canvas
    await expect(page.locator('.react-flow__node')).toHaveCount(0)

    // Assert properties panel is cleared
    await expect(page.getByTestId('property-name')).not.toBeVisible()
  })

  test('TC-2.6.2: Delete via the delete button in properties panel', async ({ page }) => {
    // Create a component
    await dragPaletteToCanvas(page, 'internal')
    await page.getByText('Component 1').click()

    // Click delete button
    await page.getByTestId('delete-component').click()

    // Assert node is removed
    await expect(page.locator('.react-flow__node')).toHaveCount(0)

    // Assert properties panel is cleared
    await expect(page.getByTestId('property-name')).not.toBeVisible()
  })

  test('TC-2.6.4: Delete with nothing selected does nothing', async ({ page }) => {
    // Click on empty canvas area
    await page.locator('.react-flow').click({ position: { x: 400, y: 300 } })

    // Press Delete key
    await page.keyboard.press('Delete')

    // Assert no error — app still works
    await expect(page.getByTestId('palette-internal')).toBeVisible()
  })

  test('TC-2.6.5: Delete all components leaves empty canvas', async ({ page }) => {
    // Create 2 components
    await dragPaletteToCanvas(page, 'internal', { x: 300, y: 200 })
    await page.locator('.react-flow').click({ position: { x: 100, y: 100 } })
    await dragPaletteToCanvas(page, 'internal', { x: 500, y: 400 })
    await expect(page.locator('.react-flow__node')).toHaveCount(2)

    // Delete first
    await page.getByText('Component 1').click()
    await page.getByTestId('delete-component').click()
    await expect(page.locator('.react-flow__node')).toHaveCount(1)

    // Delete second
    await page.getByText('Component 2').click()
    await page.getByTestId('delete-component').click()
    await expect(page.locator('.react-flow__node')).toHaveCount(0)

    // App still functional — can create new components
    await dragPaletteToCanvas(page, 'internal')
    await expect(page.locator('.react-flow__node')).toHaveCount(1)
    await expect(page.getByText('Component 3')).toBeVisible()
  })
})
