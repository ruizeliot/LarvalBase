import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

test.describe('Epic 2 - US-2.2: Create External Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-2.2.1: Drag external component from palette to canvas', async ({ page }) => {
    // 1. Drag "External" from palette onto canvas
    await dragPaletteToCanvas(page, 'external')

    // 2. Assert new node appears with styling visually distinct from internal nodes
    const node = page.locator('.react-flow__node').first()
    await expect(node).toBeVisible()
    // External nodes use orange border colors (--color-node-external-border)
    await expect(node.locator('div').first()).toHaveClass(/border-\[var\(--color-node-external-border\)\]/)

    // 3. Assert properties panel shows type = "External"
    await expect(page.getByTestId('type-external')).toBeVisible()

    // 4. Assert properties panel shows "Parameters" section
    await expect(page.getByTestId('add-parameter')).toBeVisible()

    // 5. Assert properties panel does NOT show "Capacities" section
    await expect(page.getByTestId('add-capacity')).not.toBeVisible()
  })

  test('TC-2.2.2: Visual distinction between internal and external nodes', async ({ page }) => {
    // Setup: create both types
    await dragPaletteToCanvas(page, 'internal', { x: 300, y: 200 })
    // Deselect by clicking pane
    await page.locator('.react-flow').click({ position: { x: 100, y: 100 } })
    await dragPaletteToCanvas(page, 'external', { x: 500, y: 400 })

    const nodes = page.locator('.react-flow__node')
    await expect(nodes).toHaveCount(2)

    // Locate "Component 1" node (internal) — has internal border class
    const internalNode = nodes.filter({ hasText: 'Component 1' }).first()
    await expect(internalNode.locator('div').first()).toHaveClass(/border-\[var\(--color-node-internal-border\)\]/)

    // Locate "Component 2" node (external) — has external border class
    const externalNode = nodes.filter({ hasText: 'Component 2' }).first()
    await expect(externalNode.locator('div').first()).toHaveClass(/border-\[var\(--color-node-external-border\)\]/)
  })
})
