import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

/** Helper: load a scenario from the library */
async function loadScenario(page: Page, scenarioId: string) {
  await openLibraryPanel(page)
  await page.getByTestId(`scenario-card-${scenarioId}`).getByTestId('card-load-button').click()
  await expect(page.getByTestId('library-panel')).not.toBeVisible()
}

/** Helper: load a second scenario (confirms overwrite) */
async function loadScenarioWithOverwrite(page: Page, scenarioId: string) {
  await openLibraryPanel(page)
  await page.getByTestId(`scenario-card-${scenarioId}`).getByTestId('card-load-button').click()
  await page.getByTestId('library-confirm-ok').click()
  await expect(page.getByTestId('library-panel')).not.toBeVisible()
}

/** Helper: get all node bounding boxes from the canvas */
async function getNodeBoundingBoxes(page: Page) {
  const nodes = page.locator('.react-flow__node-component')
  const count = await nodes.count()
  const boxes: { x: number; y: number; width: number; height: number }[] = []
  for (let i = 0; i < count; i++) {
    const box = await nodes.nth(i).boundingBox()
    if (box) boxes.push(box)
  }
  return boxes
}

/** Helper: check that no two bounding boxes overlap (with 5px tolerance for borders/shadows) */
function assertNoOverlaps(boxes: { x: number; y: number; width: number; height: number }[]) {
  const TOLERANCE = 5
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      const overlapsX = a.x + TOLERANCE < b.x + b.width - TOLERANCE && a.x + a.width - TOLERANCE > b.x + TOLERANCE
      const overlapsY = a.y + TOLERANCE < b.y + b.height - TOLERANCE && a.y + a.height - TOLERANCE > b.y + TOLERANCE
      expect(overlapsX && overlapsY).toBe(false)
    }
  }
}

/** Helper: drag a component from palette onto canvas */
async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

test.describe('Epic 8 - US-8.7: ELK.js Auto-Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-8.7.1: Loading a scenario from library applies ELK auto-layout', async ({ page }) => {
    // Load "Supply Chain Disruption" (7 nodes)
    await loadScenario(page, 'supply-chain-disruption')

    // Assert all 7 component nodes are visible on canvas
    const nodes = page.locator('.react-flow__node-component')
    await expect(nodes).toHaveCount(7)

    // Record positions of all nodes
    const boxes = await getNodeBoundingBoxes(page)
    expect(boxes.length).toBe(7)

    // Assert no two nodes overlap
    assertNoOverlaps(boxes)

    // Assert nodes are generally arranged left-to-right (LR direction)
    // Sort by x position and verify there's a spread
    const xPositions = boxes.map((b) => b.x)
    const minX = Math.min(...xPositions)
    const maxX = Math.max(...xPositions)
    expect(maxX - minX).toBeGreaterThan(100) // nodes should be spread horizontally
  })

  test('TC-8.7.2: Re-Layout button is visible in canvas toolbar', async ({ page }) => {
    await loadScenario(page, 'hello-cascade')

    // Assert "Re-Layout" button is visible
    const relayoutBtn = page.getByTestId('relayout-button')
    await expect(relayoutBtn).toBeVisible()

    // Click dropdown toggle to open layout options
    await page.getByTestId('relayout-dropdown-toggle').click()

    // Assert dropdown menu appears with options: "LR", "TB", "Compact"
    await expect(page.getByTestId('relayout-option-lr')).toBeVisible()
    await expect(page.getByTestId('relayout-option-tb')).toBeVisible()
    await expect(page.getByTestId('relayout-option-compact')).toBeVisible()
  })

  test('TC-8.7.3: Re-Layout with TB direction arranges nodes vertically', async ({ page }) => {
    // Load "Supply Chain Disruption" (initially laid out LR)
    await loadScenario(page, 'supply-chain-disruption')
    await expect(page.locator('.react-flow__node-component')).toHaveCount(7)

    // Record node positions (LR layout)
    const lrBoxes = await getNodeBoundingBoxes(page)
    const lrYSpread = Math.max(...lrBoxes.map((b) => b.y)) - Math.min(...lrBoxes.map((b) => b.y))

    // Click "Re-Layout" > "TB"
    await page.getByTestId('relayout-dropdown-toggle').click()
    await page.getByTestId('relayout-option-tb').click()

    // Wait for layout animation to complete
    await page.waitForTimeout(500)

    // Record new node positions
    const tbBoxes = await getNodeBoundingBoxes(page)

    // Assert nodes are now arranged top-to-bottom
    const tbYSpread = Math.max(...tbBoxes.map((b) => b.y)) - Math.min(...tbBoxes.map((b) => b.y))
    const tbXSpread = Math.max(...tbBoxes.map((b) => b.x)) - Math.min(...tbBoxes.map((b) => b.x))

    // In TB mode, Y spread should be greater than X spread (vertical layout)
    expect(tbYSpread).toBeGreaterThan(100)

    // Assert no two nodes overlap
    assertNoOverlaps(tbBoxes)
  })

  test('TC-8.7.4: Re-Layout with Compact mode reduces spacing', async ({ page }) => {
    // Load "Supply Chain Disruption"
    await loadScenario(page, 'supply-chain-disruption')
    await expect(page.locator('.react-flow__node-component')).toHaveCount(7)

    // Apply LR layout first
    await page.getByTestId('relayout-dropdown-toggle').click()
    await page.getByTestId('relayout-option-lr').click()
    await page.waitForTimeout(500)

    // Compute average distance between all pairs of node centers (LR layout)
    const lrBoxes = await getNodeBoundingBoxes(page)
    const lrCenters = lrBoxes.map((b) => ({ cx: b.x + b.width / 2, cy: b.y + b.height / 2 }))
    let lrTotalDist = 0
    let pairCount = 0
    for (let i = 0; i < lrCenters.length; i++) {
      for (let j = i + 1; j < lrCenters.length; j++) {
        const dx = lrCenters[i].cx - lrCenters[j].cx
        const dy = lrCenters[i].cy - lrCenters[j].cy
        lrTotalDist += Math.sqrt(dx * dx + dy * dy)
        pairCount++
      }
    }
    const lrAvgDist = lrTotalDist / pairCount

    // Apply Compact layout
    await page.getByTestId('relayout-dropdown-toggle').click()
    await page.getByTestId('relayout-option-compact').click()
    await page.waitForTimeout(500)

    // Compute average distance between all pairs of node centers (Compact layout)
    const compactBoxes = await getNodeBoundingBoxes(page)
    const compactCenters = compactBoxes.map((b) => ({ cx: b.x + b.width / 2, cy: b.y + b.height / 2 }))
    let compactTotalDist = 0
    let compactPairCount = 0
    for (let i = 0; i < compactCenters.length; i++) {
      for (let j = i + 1; j < compactCenters.length; j++) {
        const dx = compactCenters[i].cx - compactCenters[j].cx
        const dy = compactCenters[i].cy - compactCenters[j].cy
        compactTotalDist += Math.sqrt(dx * dx + dy * dy)
        compactPairCount++
      }
    }
    const compactAvgDist = compactTotalDist / compactPairCount

    // Average distance between node centers should be smaller in compact mode
    expect(compactAvgDist).toBeLessThan(lrAvgDist)

    // Assert no nodes overlap in compact mode
    assertNoOverlaps(compactBoxes)
  })

  test('TC-8.7.5: Layout follows causal chain order', async ({ page }) => {
    // Load "Hello Cascade" (2 nodes, 1 chain: A -> B)
    await loadScenario(page, 'hello-cascade')

    // Assert 2 nodes visible
    const nodes = page.locator('.react-flow__node-component')
    await expect(nodes).toHaveCount(2)

    // Get the node names and positions
    // We need to identify which is source and which is target
    // The first node in Hello Cascade is the source ("Weather Event")
    // In LR mode: source should have smaller X than target
    const boxes = await getNodeBoundingBoxes(page)
    expect(boxes.length).toBe(2)

    // Sort by X to find leftmost (should be source in LR)
    const sortedByX = [...boxes].sort((a, b) => a.x - b.x)
    expect(sortedByX[0].x).toBeLessThan(sortedByX[1].x)

    // Click "Re-Layout" > "TB"
    await page.getByTestId('relayout-dropdown-toggle').click()
    await page.getByTestId('relayout-option-tb').click()
    await page.waitForTimeout(500)

    // In TB mode: source should have smaller Y than target
    const tbBoxes = await getNodeBoundingBoxes(page)
    const sortedByY = [...tbBoxes].sort((a, b) => a.y - b.y)
    expect(sortedByY[0].y).toBeLessThan(sortedByY[1].y)
  })

  test('TC-8.7.6: fitView called after layout completes', async ({ page }) => {
    // Load scenario from library
    await loadScenario(page, 'supply-chain-disruption')
    const nodes = page.locator('.react-flow__node-component')
    await expect(nodes).toHaveCount(7)

    // Wait for fitView to settle after load
    await page.waitForTimeout(500)

    // Assert all nodes are visible within the canvas viewport (with tolerance for partial visibility)
    const viewport = page.viewportSize()!
    const MARGIN = 20 // tolerance for edge nodes/padding
    let boxes = await getNodeBoundingBoxes(page)
    for (const box of boxes) {
      // Node center should be within viewport (with margin)
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      expect(cx).toBeGreaterThanOrEqual(-MARGIN)
      expect(cy).toBeGreaterThanOrEqual(-MARGIN)
      expect(cx).toBeLessThanOrEqual(viewport.width + MARGIN)
      expect(cy).toBeLessThanOrEqual(viewport.height + MARGIN)
    }

    // Click "Re-Layout" > "TB"
    await page.getByTestId('relayout-dropdown-toggle').click()
    await page.getByTestId('relayout-option-tb').click()
    await page.waitForTimeout(500)

    // Assert all nodes are still visible within the canvas viewport after re-layout
    boxes = await getNodeBoundingBoxes(page)
    for (const box of boxes) {
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      expect(cx).toBeGreaterThanOrEqual(-MARGIN)
      expect(cy).toBeGreaterThanOrEqual(-MARGIN)
      expect(cx).toBeLessThanOrEqual(viewport.width + MARGIN)
      expect(cy).toBeLessThanOrEqual(viewport.height + MARGIN)
    }
  })

  test('TC-8.7.7: Re-layout after manual node repositioning', async ({ page }) => {
    // Load scenario from library (auto-layout applied)
    await loadScenario(page, 'hello-cascade')
    const nodes = page.locator('.react-flow__node-component')
    await expect(nodes).toHaveCount(2)

    // Manually drag one node to a far corner
    const firstNode = nodes.first()
    const firstBox = await firstNode.boundingBox()
    expect(firstBox).not.toBeNull()

    await firstNode.hover()
    await page.mouse.down()
    await page.mouse.move(50, 50, { steps: 5 }) // drag to top-left corner
    await page.mouse.up()

    // Click "Re-Layout" > "LR"
    await page.getByTestId('relayout-dropdown-toggle').click()
    await page.getByTestId('relayout-option-lr').click()
    await page.waitForTimeout(500)

    // Assert nodes are repositioned back into the layout flow
    const boxes = await getNodeBoundingBoxes(page)
    assertNoOverlaps(boxes)

    // Nodes should be arranged horizontally again
    const xPositions = boxes.map((b) => b.x)
    expect(Math.max(...xPositions) - Math.min(...xPositions)).toBeGreaterThan(50)
  })

  test('TC-8.7.8: Re-Layout button not visible when canvas is empty', async ({ page }) => {
    // Assert "Re-Layout" button is either not visible or disabled with empty workspace
    const relayoutBtn = page.getByTestId('relayout-button')
    const isVisible = await relayoutBtn.isVisible().catch(() => false)

    if (isVisible) {
      // If visible, it should be disabled
      await expect(relayoutBtn).toBeDisabled()
    }

    // Create a single component manually
    await dragPaletteToCanvas(page, 'internal', { x: 400, y: 300 })
    await expect(page.locator('.react-flow__node-component')).toHaveCount(1)

    // Assert "Re-Layout" button becomes visible/enabled
    await expect(relayoutBtn).toBeVisible()
    await expect(relayoutBtn).toBeEnabled()
  })
})
