import { test, expect } from '@playwright/test'

test.describe('Editor - Component Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the canvas to be ready
    await page.waitForSelector('.react-flow')
  })

  test('app loads with tab bar and empty canvas', async ({ page }) => {
    // Tab bar visible
    await expect(page.getByText('CascadeSim')).toBeVisible()
    await expect(page.getByText('Editor')).toBeVisible()
    await expect(page.getByText('Scenarios')).toBeVisible()
    await expect(page.getByText('Simulate')).toBeVisible()

    // Palette visible
    await expect(page.getByText('Internal Component')).toBeVisible()
    await expect(page.getByText('External Component')).toBeVisible()
  })

  test('drag internal component from palette to canvas creates node', async ({ page }) => {
    const palette = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')

    // Drag from palette to canvas
    await palette.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 },
    })

    // Verify node appears on canvas
    await expect(page.getByText('Component 1')).toBeVisible()
    await expect(page.locator('.react-flow__node').getByText('internal', { exact: true })).toBeVisible()
  })

  test('drag external component from palette to canvas creates orange node', async ({ page }) => {
    const palette = page.getByTestId('palette-external')
    const canvas = page.locator('.react-flow')

    await palette.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 },
    })

    await expect(page.getByText('Component 1')).toBeVisible()
    await expect(page.locator('.react-flow__node').getByText('external', { exact: true })).toBeVisible()
  })

  test('click node opens property editor, edit name updates canvas', async ({ page }) => {
    // First create a node
    const palette = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    await palette.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 },
    })

    // Click the node
    await page.getByText('Component 1').click()

    // Property editor should appear
    await expect(page.getByTestId('property-name')).toBeVisible()

    // Edit name
    await page.getByTestId('property-name').fill('Reactor')

    // Canvas should update
    await expect(page.getByText('Reactor')).toBeVisible()
  })

  test('add parameter to component shows on node', async ({ page }) => {
    const palette = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    await palette.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 },
    })

    await page.getByText('Component 1').click()
    await page.getByTestId('add-parameter').click()

    // Parameter should appear on node
    await expect(page.getByText('param_1')).toBeVisible()
  })

  test('toggle Internal to External hides capacities', async ({ page }) => {
    const palette = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    await palette.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 },
    })

    await page.getByText('Component 1').click()

    // Add a capacity first
    await page.getByTestId('add-capacity').click()
    await expect(page.getByText('capacity_1')).toBeVisible()

    // Toggle to external (confirmation dialog appears because capacities exist)
    await page.getByTestId('type-external').click()
    await page.getByTestId('confirm-ok').click()

    // Capacity section should disappear from property editor
    await expect(page.getByTestId('add-capacity')).not.toBeVisible()
  })
})
