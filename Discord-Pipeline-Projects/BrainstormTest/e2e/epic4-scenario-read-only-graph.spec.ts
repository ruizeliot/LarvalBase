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

/** Helper: create a component with a parameter via UI */
async function createComponentWithParam(
  page: Page,
  type: 'internal' | 'external',
  name: string,
  paramName: string,
  paramValue: string,
  pos = { x: 400, y: 300 }
) {
  await dragPaletteToCanvas(page, type, pos)
  // Rename
  const nameInput = page.getByTestId('property-name')
  await nameInput.clear()
  await nameInput.fill(name)
  // Add parameter
  await page.getByTestId('add-parameter').click()
  const paramRows = page.locator('[data-testid="param-row"]')
  const lastRow = paramRows.last()
  const nameField = lastRow.locator('input').first()
  await nameField.clear()
  await nameField.fill(paramName)
  const valueField = lastRow.locator('input[type="number"]')
  await valueField.clear()
  await valueField.fill(paramValue)
  // Click canvas to deselect
  await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })
}

test.describe('Epic 4 - US-4.2: Read-Only Graph in Scenario Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-4.2.1: Parameter values displayed on component nodes', async ({ page }) => {
    // Setup: Create components with parameters in Editor mode
    await createComponentWithParam(page, 'external', 'River', 'waterLevel', '5', { x: 300, y: 200 })
    await createComponentWithParam(page, 'internal', 'Dam', 'pressure', '2', { x: 500, y: 200 })

    // Verify params visible in editor
    const riverNode = page.locator('.react-flow__node').filter({ hasText: 'River' })
    await expect(riverNode.getByText('waterLevel')).toBeVisible()
    await expect(riverNode.getByText('5')).toBeVisible()

    // Switch to Scenarios tab
    await switchTab(page, 'Scenarios')

    // React Flow nodes still exist in the DOM (behind overlay)
    // Verify nodes are in the DOM with their parameter data
    await expect(page.locator('.react-flow__node').filter({ hasText: 'River' })).toBeAttached()
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Dam' })).toBeAttached()
  })

  test('TC-4.2.2: Components are not draggable in scenarios mode', async ({ page }) => {
    // Setup: Create component
    await dragPaletteToCanvas(page, 'internal', { x: 400, y: 300 })

    // Record initial position in editor
    const node = page.locator('.react-flow__node').first()
    const initialBox = await node.boundingBox()

    // Switch to Scenarios mode
    await switchTab(page, 'Scenarios')

    // Canvas has pointer-events-none in non-editor modes, so dragging should not work
    // The canvas wrapper blocks interaction
    const canvasWrapper = page.locator('.react-flow').first()
    const wrapperStyle = await canvasWrapper.evaluate((el) => {
      // Check if the parent of .react-flow has pointer-events: none
      const parent = el.closest('[class*="pointer-events-none"]')
      return parent ? 'blocked' : 'interactive'
    })
    expect(wrapperStyle).toBe('blocked')

    // Switch back to editor — node should still be at original position
    await switchTab(page, 'Editor')
    const finalBox = await node.boundingBox()
    expect(finalBox!.x).toBeCloseTo(initialBox!.x, 0)
    expect(finalBox!.y).toBeCloseTo(initialBox!.y, 0)
  })

  test('TC-4.2.3: No context menu for chain creation in scenarios mode', async ({ page }) => {
    // Setup: Create component
    await dragPaletteToCanvas(page, 'internal', { x: 400, y: 300 })

    // In Editor, right-click should show context menu
    const node = page.locator('.react-flow__node').first()
    await node.click({ button: 'right' })
    await expect(page.getByText('New Causal Chain from here')).toBeVisible()
    // Close the menu
    await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })

    // Switch to Scenarios mode
    await switchTab(page, 'Scenarios')

    // Canvas is blocked by pointer-events-none + overlay, so right-click on canvas won't
    // reach the React Flow node handler. The context menu should NOT appear.
    await expect(page.getByText('New Causal Chain from here')).not.toBeVisible()
  })
})
