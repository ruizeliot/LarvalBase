import { test, expect, type Page } from '@playwright/test'

/** Helper: drag a component type from palette onto the canvas center */
async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

test.describe('Epic 2 - US-2.1: Create Internal Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-2.1.1: Drag internal component from palette to canvas', async ({ page }) => {
    // 1. Locate "Internal" element in the palette
    const palette = page.getByTestId('palette-internal')
    await expect(palette).toBeVisible()

    // 2. Drag it onto the canvas center
    await dragPaletteToCanvas(page, 'internal')

    // 3. Assert a new node appears on the canvas with solid border styling
    const node = page.locator('.react-flow__node').first()
    await expect(node).toBeVisible()

    // 4. Assert the node is selected (has selection indicator — ring class)
    await expect(node.locator('div').first()).toHaveClass(/ring-2/)

    // 5. Assert properties panel is open and shows type = "Internal"
    await expect(page.getByTestId('property-name')).toBeVisible()
    await expect(page.getByTestId('type-internal')).toBeVisible()

    // 6. Assert node has a default name
    await expect(node.getByText('Component 1')).toBeVisible()
    // Assert type badge shows "internal"
    await expect(node.getByText('internal')).toBeVisible()
  })

  test('TC-2.1.2: Multiple internal components get unique names', async ({ page }) => {
    // 1. Drag "Internal" onto canvas → node "Component 1" appears
    await dragPaletteToCanvas(page, 'internal', { x: 300, y: 200 })
    await expect(page.getByText('Component 1')).toBeVisible()

    // 2. Drag "Internal" onto canvas again → node "Component 2" appears
    await dragPaletteToCanvas(page, 'internal', { x: 500, y: 400 })
    await expect(page.getByText('Component 2')).toBeVisible()

    // 3. Assert both nodes exist on canvas with distinct names
    const nodes = page.locator('.react-flow__node')
    await expect(nodes).toHaveCount(2)

    // 4. Assert both are selectable independently
    await page.getByText('Component 1').click()
    const nameInput = page.getByTestId('property-name')
    await expect(nameInput).toHaveValue('Component 1')

    await page.getByText('Component 2').click()
    await expect(nameInput).toHaveValue('Component 2')
  })

  test('TC-2.1.3: Drop outside canvas area creates no node', async ({ page }) => {
    // Drag "Internal" from palette and release over the left panel (not canvas)
    const palette = page.getByTestId('palette-internal')
    const leftPanel = page.getByTestId('left-panel')
    await palette.dragTo(leftPanel)

    // Assert no new node is created on canvas
    const nodes = page.locator('.react-flow__node')
    await expect(nodes).toHaveCount(0)
  })

  test('TC-2.1.4: Drop on top of existing component creates a new separate node', async ({ page }) => {
    // Setup: Create one component
    await dragPaletteToCanvas(page, 'internal', { x: 400, y: 300 })
    await expect(page.getByText('Component 1')).toBeVisible()

    // Drop another directly on top
    await dragPaletteToCanvas(page, 'internal', { x: 400, y: 300 })

    // Assert both nodes exist (2 separate nodes, not merged)
    const nodes = page.locator('.react-flow__node')
    await expect(nodes).toHaveCount(2)
    await expect(page.getByText('Component 1')).toBeVisible()
    await expect(page.getByText('Component 2')).toBeVisible()
  })
})
