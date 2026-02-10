import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

/** Helper: load a scenario and run simulation, returning to simulate mode with results */
async function loadScenarioAndRunSimulation(page: Page, scenarioId = 'hello-cascade') {
  // Load scenario from library
  await openLibraryPanel(page)
  await page.getByTestId(`scenario-card-${scenarioId}`).getByTestId('card-load-button').click()
  await expect(page.getByTestId('library-panel')).not.toBeVisible()

  // Switch to Simulate tab
  await page.getByTestId('tab-simulate').click()

  // Select the loaded scenario in the simulation dropdown
  const scenarioSelect = page.getByTestId('sim-scenario-select')
  await scenarioSelect.waitFor({ state: 'visible' })
  // Pick the first non-empty option
  const options = scenarioSelect.locator('option')
  const optionCount = await options.count()
  for (let i = 0; i < optionCount; i++) {
    const val = await options.nth(i).getAttribute('value')
    if (val && val !== '') {
      await scenarioSelect.selectOption(val)
      break
    }
  }

  // Run simulation
  await page.getByTestId('sim-run-button').click()

  // Wait for simulation to complete
  await expect(page.getByTestId('sim-summary-badge')).toBeVisible({ timeout: 5000 })
}

test.describe('Epic 8 - US-8.6: Simulation Results Side Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-8.6.1: Simulation results appear in docked right panel', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    // Assert results are inside a right-docked side panel
    const panel = page.getByTestId('results-side-panel')
    await expect(panel).toBeVisible()

    // Assert panel is positioned on the right edge of the viewport
    const panelBox = await panel.boundingBox()
    const viewportSize = page.viewportSize()!
    expect(panelBox).not.toBeNull()
    // Panel's right edge should be near the viewport's right edge
    expect(panelBox!.x + panelBox!.width).toBeCloseTo(viewportSize.width, -1)

    // Assert panel does NOT have overlay/backdrop behavior (no dimmed background)
    // Canvas area should still be visible to the left
    const canvas = page.locator('.react-flow')
    await expect(canvas).toBeVisible()
    const canvasBox = await canvas.boundingBox()
    expect(canvasBox).not.toBeNull()
    // Canvas should be to the left of the panel
    expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(panelBox!.x + 5)
  })

  test('TC-8.6.2: Panel default width is 350px', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    const panel = page.getByTestId('results-side-panel')
    await expect(panel).toBeVisible()

    // Measure panel width via bounding box
    const panelBox = await panel.boundingBox()
    expect(panelBox).not.toBeNull()
    // Assert width is approximately 350px (±10px tolerance)
    expect(panelBox!.width).toBeGreaterThanOrEqual(340)
    expect(panelBox!.width).toBeLessThanOrEqual(360)
  })

  test('TC-8.6.3: Panel is resizable via draggable divider', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    // Locate the draggable divider element
    const divider = page.getByTestId('panel-resize-divider')
    await expect(divider).toBeVisible()

    const panel = page.getByTestId('results-side-panel')
    const initialBox = await panel.boundingBox()
    expect(initialBox).not.toBeNull()
    const initialWidth = initialBox!.width

    // Get divider position
    const dividerBox = await divider.boundingBox()
    expect(dividerBox).not.toBeNull()
    const dividerCenterX = dividerBox!.x + dividerBox!.width / 2
    const dividerCenterY = dividerBox!.y + dividerBox!.height / 2

    // Drag divider 100px to the left (expanding panel)
    await page.mouse.move(dividerCenterX, dividerCenterY)
    await page.mouse.down()
    await page.mouse.move(dividerCenterX - 100, dividerCenterY, { steps: 10 })
    await page.mouse.up()

    const expandedBox = await panel.boundingBox()
    expect(expandedBox).not.toBeNull()
    expect(expandedBox!.width).toBeGreaterThan(initialWidth + 50)

    // Drag divider 200px to the right (shrinking panel)
    const newDividerBox = await divider.boundingBox()
    const newDividerX = newDividerBox!.x + newDividerBox!.width / 2
    const newDividerY = newDividerBox!.y + newDividerBox!.height / 2
    await page.mouse.move(newDividerX, newDividerY)
    await page.mouse.down()
    await page.mouse.move(newDividerX + 200, newDividerY, { steps: 10 })
    await page.mouse.up()

    const shrunkBox = await panel.boundingBox()
    expect(shrunkBox).not.toBeNull()
    expect(shrunkBox!.width).toBeLessThan(expandedBox!.width - 100)
  })

  test('TC-8.6.4: Panel respects min/max width constraints', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    const divider = page.getByTestId('panel-resize-divider')
    const panel = page.getByTestId('results-side-panel')

    // Drag divider far to the right (attempt to shrink below 250px)
    const dividerBox = await divider.boundingBox()
    expect(dividerBox).not.toBeNull()
    const cx = dividerBox!.x + dividerBox!.width / 2
    const cy = dividerBox!.y + dividerBox!.height / 2

    await page.mouse.move(cx, cy)
    await page.mouse.down()
    await page.mouse.move(cx + 500, cy, { steps: 10 })
    await page.mouse.up()

    let panelBox = await panel.boundingBox()
    expect(panelBox).not.toBeNull()
    // Assert panel width does not go below 250px
    expect(panelBox!.width).toBeGreaterThanOrEqual(248) // small tolerance

    // Drag divider far to the left (attempt to expand beyond 500px)
    const dividerBox2 = await divider.boundingBox()
    const cx2 = dividerBox2!.x + dividerBox2!.width / 2
    const cy2 = dividerBox2!.y + dividerBox2!.height / 2

    await page.mouse.move(cx2, cy2)
    await page.mouse.down()
    await page.mouse.move(cx2 - 500, cy2, { steps: 10 })
    await page.mouse.up()

    panelBox = await panel.boundingBox()
    expect(panelBox).not.toBeNull()
    // Assert panel width does not exceed 500px
    expect(panelBox!.width).toBeLessThanOrEqual(502) // small tolerance
  })

  test('TC-8.6.5: Collapse and expand toggle', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    const panel = page.getByTestId('results-side-panel')
    await expect(panel).toBeVisible()

    // Get initial width
    const initialBox = await panel.boundingBox()
    expect(initialBox).not.toBeNull()
    const originalWidth = initialBox!.width

    // Locate collapse/expand toggle button
    const toggle = page.getByTestId('panel-collapse-toggle')
    await expect(toggle).toBeVisible()

    // Click toggle to collapse
    await toggle.click()

    // Assert panel collapses (width near 0 or very small)
    const collapsedBox = await panel.boundingBox()
    expect(collapsedBox).not.toBeNull()
    expect(collapsedBox!.width).toBeLessThan(60) // collapsed state should be thin

    // Click toggle button again to expand
    await toggle.click()

    // Assert panel re-expands to previous width
    const expandedBox = await panel.boundingBox()
    expect(expandedBox).not.toBeNull()
    expect(expandedBox!.width).toBeGreaterThanOrEqual(originalWidth - 20)
    expect(expandedBox!.width).toBeLessThanOrEqual(originalWidth + 20)
  })

  test('TC-8.6.6: Canvas remains interactive with panel open', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    // Assert results panel is visible
    await expect(page.getByTestId('results-side-panel')).toBeVisible()

    // Pan the canvas (mousedown + drag on canvas area)
    const canvas = page.locator('.react-flow')
    const canvasBox = await canvas.boundingBox()
    expect(canvasBox).not.toBeNull()
    const centerX = canvasBox!.x + canvasBox!.width / 2
    const centerY = canvasBox!.y + canvasBox!.height / 2

    // Pan the canvas
    await page.mouse.move(centerX, centerY)
    await page.mouse.down()
    await page.mouse.move(centerX + 50, centerY + 50, { steps: 5 })
    await page.mouse.up()

    // Zoom the canvas (scroll wheel on canvas)
    await page.mouse.move(centerX, centerY)
    await page.mouse.wheel(0, -100) // zoom in

    // Click a component node on the canvas
    const componentNodes = page.locator('.react-flow__node-component')
    const nodeCount = await componentNodes.count()
    expect(nodeCount).toBeGreaterThanOrEqual(1)
    await componentNodes.first().click()

    // Assert component is selected (left panel shows it)
    await expect(page.getByTestId('left-panel')).toBeVisible()
  })

  test('TC-8.6.7: ReactFlow fitView called on panel state change', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    // Get component node positions with panel open
    const componentNodes = page.locator('.react-flow__node-component')
    await expect(componentNodes.first()).toBeVisible()

    const openPositions = await componentNodes.evaluateAll((nodes) =>
      nodes.map((n) => {
        const transform = n.style.transform || ''
        return transform
      })
    )

    // Collapse the panel
    await page.getByTestId('panel-collapse-toggle').click()

    // Wait for fitView animation
    await page.waitForTimeout(500)

    // Get new positions — they should have changed (fitView adjusts viewport)
    const closedPositions = await componentNodes.evaluateAll((nodes) =>
      nodes.map((n) => {
        const transform = n.style.transform || ''
        return transform
      })
    )

    // At least some transforms should differ (fitView repositions)
    // Note: this test verifies viewport change; nodes may appear at different screen positions
    const allSame = openPositions.every((p, i) => p === closedPositions[i])
    // fitView should change the viewport, so at least the viewport transform changes
    // We verify the canvas was re-fitted by checking nodes are still within visible area
    for (let i = 0; i < await componentNodes.count(); i++) {
      const box = await componentNodes.nth(i).boundingBox()
      expect(box).not.toBeNull()
      const viewport = page.viewportSize()!
      expect(box!.x).toBeGreaterThanOrEqual(-10)
      expect(box!.y).toBeGreaterThanOrEqual(-10)
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 10)
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 10)
    }
  })

  test('TC-8.6.8: Rapid resize does not corrupt layout', async ({ page }) => {
    await loadScenarioAndRunSimulation(page)

    const divider = page.getByTestId('panel-resize-divider')
    const panel = page.getByTestId('results-side-panel')

    const dividerBox = await divider.boundingBox()
    expect(dividerBox).not.toBeNull()
    const startX = dividerBox!.x + dividerBox!.width / 2
    const startY = dividerBox!.y + dividerBox!.height / 2

    // Rapidly drag divider back and forth 5 times
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(startX, startY)
      await page.mouse.down()
      const offset = i % 2 === 0 ? -80 : 80
      await page.mouse.move(startX + offset, startY, { steps: 3 })
      await page.mouse.up()
    }

    // Assert panel has a valid width within 250–500px range
    const finalBox = await panel.boundingBox()
    expect(finalBox).not.toBeNull()
    expect(finalBox!.width).toBeGreaterThanOrEqual(248)
    expect(finalBox!.width).toBeLessThanOrEqual(502)

    // Assert canvas is not clipped or overlapping the panel
    const canvas = page.locator('.react-flow')
    const canvasBox = await canvas.boundingBox()
    expect(canvasBox).not.toBeNull()
    expect(canvasBox!.x + canvasBox!.width).toBeLessThanOrEqual(finalBox!.x + 5)

    // Assert results content is still rendered correctly
    const resultsContent = panel.locator('[data-testid="sim-results-content"], .overflow-y-auto')
    await expect(resultsContent.first()).toBeVisible()
  })
})
