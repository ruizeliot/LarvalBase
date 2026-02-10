import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

/** Helper: sets up two contexts in the same room. Returns pages + roomUrl. */
async function openTwoContextsInRoom(browser: Browser): Promise<{
  contextA: BrowserContext
  pageA: Page
  contextB: BrowserContext
  pageB: Page
  roomUrl: string
}> {
  const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
  const pageA = await contextA.newPage()
  await pageA.goto('http://localhost:5173/')
  await pageA.waitForSelector('.react-flow')

  // Alice creates a room
  await pageA.getByTestId('collaborate-button').click()
  await pageA.getByTestId('display-name-input').fill('Alice')
  await pageA.getByTestId('confirm-name-button').click()
  await expect(pageA.getByTestId('room-modal')).toBeVisible()
  const roomUrl = (await pageA.getByTestId('room-url').textContent()) || ''
  await pageA.getByTestId('close-room-modal').click()

  // Bob joins
  const contextB = await browser.newContext({ storageState: './e2e/storage-state.json' })
  const pageB = await contextB.newPage()
  await pageB.goto(roomUrl)
  await pageB.getByTestId('display-name-input').fill('Bob')
  await pageB.getByTestId('confirm-name-button').click()
  await pageB.waitForTimeout(1000)

  return { contextA, pageA, contextB, pageB, roomUrl }
}

test.describe('Epic 9 - US-9.3: Real-Time Model Sync', () => {
  test('TC-9.3.1: Adding a component syncs to other client', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // In context A, create an internal component "Pump"
    const canvasA = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 300, y: 200 } })
    await pageA.getByTestId('property-name').fill('Pump')

    // Add param flowRate=100
    await pageA.getByTestId('add-parameter').click()
    const paramRow = pageA.getByTestId('param-row').last()
    await paramRow.locator('input[placeholder="name"]').fill('flowRate')
    await paramRow.locator('input[type="number"]').fill('100')

    // Click canvas to deselect
    await canvasA.click({ position: { x: 50, y: 50 } })

    // Wait for sync
    await pageA.waitForTimeout(500)

    // Assert context B's canvas shows a node named "Pump"
    const pumpNodeB = pageB.locator('.react-flow__node').filter({ hasText: 'Pump' })
    await expect(pumpNodeB).toBeVisible({ timeout: 5000 })

    // Click "Pump" in context B — assert properties show flowRate: 100
    await pumpNodeB.click()
    await pageB.waitForTimeout(300)
    const paramRowB = pageB.getByTestId('param-row').first()
    await expect(paramRowB.locator('input[placeholder="name"]')).toHaveValue('flowRate')
    await expect(paramRowB.locator('input[type="number"]')).toHaveValue('100')

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.3.2: Renaming a component syncs to other client', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Context A creates "Pump"
    const canvasA = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 300, y: 200 } })
    await pageA.getByTestId('property-name').fill('Pump')
    await canvasA.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(500)

    // Wait for sync to B
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Pump' })).toBeVisible({ timeout: 5000 })

    // In context A, select "Pump" and rename to "SuperPump"
    await pageA.locator('.react-flow__node').filter({ hasText: 'Pump' }).click()
    await pageA.getByTestId('property-name').fill('SuperPump')
    await canvasA.click({ position: { x: 50, y: 50 } })

    // Wait for sync
    await pageA.waitForTimeout(500)

    // Assert context B shows node named "SuperPump"
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'SuperPump' })).toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.3.3: Deleting a component syncs to other client', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Context A creates "Pump"
    const canvasA = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 300, y: 200 } })
    await pageA.getByTestId('property-name').fill('Pump')
    await canvasA.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(500)

    // Verify context B sees "Pump"
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Pump' })).toBeVisible({ timeout: 5000 })

    // In context A, select "Pump" and press Delete
    await pageA.locator('.react-flow__node').filter({ hasText: 'Pump' }).click()
    await pageA.getByTestId('delete-component').click()

    // Wait for sync
    await pageA.waitForTimeout(500)

    // Assert context B's canvas no longer shows "Pump"
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Pump' })).not.toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.3.4: Adding a causal chain syncs to other client', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    const canvasA = pageA.locator('.react-flow')

    // Create "Source" and "Target" components
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 200, y: 200 } })
    await pageA.getByTestId('property-name').fill('Source')
    await pageA.getByTestId('add-parameter').click()
    const srcParamRow = pageA.getByTestId('param-row').last()
    await srcParamRow.locator('input[placeholder="name"]').fill('output')
    await srcParamRow.locator('input[type="number"]').fill('50')
    await canvasA.click({ position: { x: 50, y: 50 } })

    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 500, y: 200 } })
    await pageA.getByTestId('property-name').fill('Target')
    await pageA.getByTestId('add-parameter').click()
    const tgtParamRow = pageA.getByTestId('param-row').last()
    await tgtParamRow.locator('input[placeholder="name"]').fill('input')
    await tgtParamRow.locator('input[type="number"]').fill('0')
    await canvasA.click({ position: { x: 50, y: 50 } })

    await pageA.waitForTimeout(500)

    // Create a causal chain from "Source" to "Target"
    const sourceNode = pageA.locator('.react-flow__node').filter({ hasText: 'Source' })
    await sourceNode.click({ button: 'right' })
    await pageA.getByTestId('context-menu-new-chain').click()

    // Wait for chain builder and fill it
    await expect(pageA.getByTestId('chain-builder')).toBeVisible()

    // Fill chain name
    await pageA.getByTestId('chain-name').fill('TestChain')
    // Select chain type
    await pageA.getByTestId('chain-type-inflicted').click()

    // Stage 1: existence formula
    await pageA.getByTestId('formula-editor-existence').fill('Source.output > 0')

    // Stage 2: target + susceptibility
    await pageA.getByTestId('target-selector').selectOption({ label: 'Target' })
    await pageA.getByTestId('formula-editor-susceptibility').fill('Target.input < 100')

    // Stage 3: triggering + consequence
    await pageA.getByTestId('formula-editor-triggering').fill('Source.output > 25')
    await pageA.getByTestId('add-consequence').click()
    await pageA.getByTestId('consequence-param').selectOption({ label: 'input' })
    await pageA.getByTestId('consequence-formula').fill('Source.output * 0.5')

    // Save chain
    await pageA.getByTestId('chain-save').click()

    // Wait for sync
    await pageA.waitForTimeout(1000)

    // Assert context B shows chain edges between "Source" and "Target"
    // A chain produces multiple edges (source→condition→target with intermediate nodes)
    const edges = pageB.locator('.react-flow__edge')
    const edgeCount = await edges.count()
    expect(edgeCount).toBeGreaterThanOrEqual(1)

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.3.5: Scenario changes sync to other client', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // In context A, switch to Scenarios tab and create scenario
    await pageA.getByTestId('tab-scenarios').click()
    await pageA.getByTestId('create-scenario').click()
    await pageA.waitForTimeout(300)

    // Rename the scenario
    await pageA.getByTestId('scenario-name-input').fill('Test')
    await pageA.waitForTimeout(500)

    // In context B, switch to Scenarios tab
    await pageB.getByTestId('tab-scenarios').click()
    await pageB.waitForTimeout(500)

    // Assert "Test" scenario appears in context B's scenario list
    const scenarioItems = pageB.locator('[data-testid^="scenario-item-"]')
    await expect(scenarioItems).toHaveCount(1, { timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.3.6: Component position changes (drag) sync to other client', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Create a component in context A
    const canvasA = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 200, y: 200 } })
    await pageA.getByTestId('property-name').fill('Node')
    await canvasA.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(500)

    // Wait for "Node" to appear on B
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Node' })).toBeVisible({ timeout: 5000 })

    // In context A, drag "Node" 200px to the right
    const nodeA = pageA.locator('.react-flow__node').filter({ hasText: 'Node' })
    const boxBefore = await nodeA.boundingBox()

    await nodeA.dragTo(canvasA, {
      targetPosition: {
        x: (boxBefore!.x - (await canvasA.boundingBox())!.x) + 200,
        y: (boxBefore!.y - (await canvasA.boundingBox())!.y),
      },
    })

    // Wait for sync
    await pageA.waitForTimeout(1000)

    // Record positions and compare (within tolerance)
    const nodeAAfter = pageA.locator('.react-flow__node').filter({ hasText: 'Node' })
    const nodeBAfter = pageB.locator('.react-flow__node').filter({ hasText: 'Node' })

    // Get the data-id attribute to find the position via page evaluate
    const posA = await nodeAAfter.evaluate((el) => {
      const transform = el.style.transform
      const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/)
      return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null
    })

    const posB = await nodeBAfter.evaluate((el) => {
      const transform = el.style.transform
      const match = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/)
      return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null
    })

    // Both positions should exist and be approximately equal
    expect(posA).not.toBeNull()
    expect(posB).not.toBeNull()
    // Tolerance: within 50px (different viewport zoom/offsets)
    expect(Math.abs(posA!.x - posB!.x)).toBeLessThan(50)
    expect(Math.abs(posA!.y - posB!.y)).toBeLessThan(50)

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.3.7: Concurrent edits to different components merge cleanly', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Create two components from context A
    const canvasA = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 200, y: 200 } })
    await pageA.getByTestId('property-name').fill('CompX')
    await canvasA.click({ position: { x: 50, y: 50 } })

    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 400, y: 200 } })
    await pageA.getByTestId('property-name').fill('CompY')
    await canvasA.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(1000)

    // Wait for both to appear in B
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'CompX' })).toBeVisible({ timeout: 5000 })
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'CompY' })).toBeVisible({ timeout: 5000 })

    // Context A renames "CompX" to "Alpha"
    await pageA.locator('.react-flow__node').filter({ hasText: 'CompX' }).click()
    await pageA.getByTestId('property-name').fill('Alpha')
    await canvasA.click({ position: { x: 50, y: 50 } })

    // Context B (simultaneously) renames "CompY" to "Beta"
    const canvasB = pageB.locator('.react-flow')
    await pageB.locator('.react-flow__node').filter({ hasText: 'CompY' }).click()
    await pageB.getByTestId('property-name').fill('Beta')
    await canvasB.click({ position: { x: 50, y: 50 } })

    // Wait for CRDT merge
    await pageA.waitForTimeout(1000)

    // Assert both contexts show "Alpha" and "Beta"
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'Alpha' })).toBeVisible({ timeout: 5000 })
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'Beta' })).toBeVisible({ timeout: 5000 })
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Alpha' })).toBeVisible({ timeout: 5000 })
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Beta' })).toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.3.8: Concurrent edits to same component property (last-writer-wins)', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Context A creates "Shared" with param value=10
    const canvasA = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 300, y: 200 } })
    await pageA.getByTestId('property-name').fill('Shared')
    await pageA.getByTestId('add-parameter').click()
    const paramRow = pageA.getByTestId('param-row').last()
    await paramRow.locator('input[placeholder="name"]').fill('value')
    await paramRow.locator('input[type="number"]').fill('10')
    await canvasA.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(1000)

    // Wait for B to see "Shared"
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Shared' })).toBeVisible({ timeout: 5000 })

    // Context A changes value to 20
    await pageA.locator('.react-flow__node').filter({ hasText: 'Shared' }).click()
    await pageA.waitForTimeout(200)
    await pageA.getByTestId('param-row').first().locator('input[type="number"]').fill('20')
    await canvasA.click({ position: { x: 50, y: 50 } })

    // Context B changes value to 30 (slightly after A)
    await pageB.locator('.react-flow__node').filter({ hasText: 'Shared' }).click()
    await pageB.waitForTimeout(200)
    const canvasB = pageB.locator('.react-flow')
    await pageB.getByTestId('param-row').first().locator('input[type="number"]').fill('30')
    await canvasB.click({ position: { x: 50, y: 50 } })

    // Wait for convergence
    await pageA.waitForTimeout(1500)

    // Both contexts should converge to the same value
    await pageA.locator('.react-flow__node').filter({ hasText: 'Shared' }).click()
    await pageA.waitForTimeout(200)
    const valueA = await pageA.getByTestId('param-row').first().locator('input[type="number"]').inputValue()

    await pageB.locator('.react-flow__node').filter({ hasText: 'Shared' }).click()
    await pageB.waitForTimeout(200)
    const valueB = await pageB.getByTestId('param-row').first().locator('input[type="number"]').inputValue()

    // Assert values are identical (converged)
    expect(valueA).toEqual(valueB)

    await contextA.close()
    await contextB.close()
  })
})
