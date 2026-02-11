import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

test.describe('QA3: Canvas zoom/pan state persistence across scenario loads', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('Canvas viewport resets to fit content after loading a library scenario', async ({ page }) => {
    // Load first scenario
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // Zoom in significantly using scroll wheel
    const canvas = page.locator('.react-flow')
    const canvasBox = await canvas.boundingBox()
    expect(canvasBox).not.toBeNull()
    const centerX = canvasBox!.x + canvasBox!.width / 2
    const centerY = canvasBox!.y + canvasBox!.height / 2

    await page.mouse.move(centerX, centerY)
    // Zoom in a lot
    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, -200)
      await page.waitForTimeout(100)
    }

    // Pan the canvas far to the right
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX - 300, centerY - 200, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(500)

    // Some nodes may now be off-screen due to zoom+pan
    // Record positions before loading new scenario
    const componentNodes = page.locator('.react-flow__node-component')
    const countBefore = await componentNodes.count()
    expect(countBefore).toBeGreaterThan(0)

    // Load a different scenario from library
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-branching-paths').getByTestId('card-load-button').click()
    // Confirm replacement
    await page.getByTestId('library-confirm-ok').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()

    // Wait for fitView animation to complete
    await page.waitForTimeout(800)

    // All nodes from the NEW scenario should be within the viewport
    const viewport = page.viewportSize()!
    const newNodes = page.locator('.react-flow__node-component')
    const newNodeCount = await newNodes.count()
    expect(newNodeCount).toBeGreaterThan(0)

    for (let i = 0; i < newNodeCount; i++) {
      const box = await newNodes.nth(i).boundingBox()
      expect(box).not.toBeNull()
      // Node should be within viewport bounds (generous tolerance for edge nodes)
      expect(box!.x + box!.width).toBeGreaterThan(0)
      expect(box!.y + box!.height).toBeGreaterThan(0)
      expect(box!.x).toBeLessThan(viewport.width + 50)
      expect(box!.y).toBeLessThan(viewport.height + 50)
    }
  })

  test('Canvas viewport persists across tab switches within same session', async ({ page }) => {
    // Load a scenario
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // Record initial node positions
    const componentNodes = page.locator('.react-flow__node-component')
    await expect(componentNodes.first()).toBeVisible()
    const initialPositions = await componentNodes.evaluateAll((nodes) =>
      nodes.map((n) => {
        const rect = n.getBoundingClientRect()
        return { x: Math.round(rect.x), y: Math.round(rect.y) }
      })
    )

    // Switch to Scenarios tab
    await page.getByTestId('tab-scenarios').click()
    await page.waitForTimeout(300)

    // Switch back to Editor tab
    await page.getByTestId('tab-editor').click()
    await page.waitForTimeout(300)

    // Node positions should be the same (canvas persists across tabs)
    const afterPositions = await componentNodes.evaluateAll((nodes) =>
      nodes.map((n) => {
        const rect = n.getBoundingClientRect()
        return { x: Math.round(rect.x), y: Math.round(rect.y) }
      })
    )

    // Positions should match (±5px tolerance for rendering)
    expect(initialPositions.length).toBe(afterPositions.length)
    for (let i = 0; i < initialPositions.length; i++) {
      expect(Math.abs(initialPositions[i].x - afterPositions[i].x)).toBeLessThanOrEqual(5)
      expect(Math.abs(initialPositions[i].y - afterPositions[i].y)).toBeLessThanOrEqual(5)
    }
  })
})
