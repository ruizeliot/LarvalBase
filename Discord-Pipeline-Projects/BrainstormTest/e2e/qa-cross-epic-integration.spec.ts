import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

/** Helper: sets up two contexts in the same collaboration room */
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

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

test.describe('QA Cross-Epic Integration', () => {

  // ===================================================================
  // FOCUS 1: Load scenarios from Scenario Library (E7) in collab (E9)
  // ===================================================================
  test.describe('Scenario Library Load in Collab Room', () => {

    test('TC-QA-1.1: Loading a library scenario in collab syncs components to peer', async ({ browser }) => {
      const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

      // Alice opens library and loads "Hello Cascade"
      await openLibraryPanel(pageA)
      await pageA.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
      await expect(pageA.getByTestId('library-panel')).not.toBeVisible()

      // Alice should see 2 components
      await expect(pageA.locator('.react-flow__node-component')).toHaveCount(2)

      // Wait for sync
      await pageA.waitForTimeout(1500)

      // Bob should also see 2 components
      const bobNodes = pageB.locator('.react-flow__node-component')
      await expect(bobNodes).toHaveCount(2, { timeout: 5000 })

      // Verify the component names match (Sensor + Alarm)
      await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Sensor' })).toBeVisible({ timeout: 5000 })
      await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Alarm' })).toBeVisible({ timeout: 5000 })

      await contextA.close()
      await contextB.close()
    })

    test('TC-QA-1.2: Loading a library scenario in collab syncs chains to peer', async ({ browser }) => {
      const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

      // Alice loads "Hello Cascade"
      await openLibraryPanel(pageA)
      await pageA.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
      await expect(pageA.getByTestId('library-panel')).not.toBeVisible()
      await pageA.waitForTimeout(1500)

      // Bob should see chain edges on the canvas
      const bobEdges = pageB.locator('.react-flow__edge')
      const edgeCount = await bobEdges.count()
      expect(edgeCount).toBeGreaterThanOrEqual(1)

      await contextA.close()
      await contextB.close()
    })

    test('TC-QA-1.3: Loading a library scenario in collab syncs scenario data to peer', async ({ browser }) => {
      const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

      // Alice loads "Hello Cascade"
      await openLibraryPanel(pageA)
      await pageA.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
      await expect(pageA.getByTestId('library-panel')).not.toBeVisible()
      await pageA.waitForTimeout(1500)

      // Bob switches to Scenarios tab
      await pageB.getByTestId('tab-scenarios').click()
      await pageB.waitForTimeout(500)

      // Bob should see the loaded scenario in his list
      const scenarioItems = pageB.locator('[data-testid^="scenario-item-"]')
      await expect(scenarioItems).toHaveCount(1, { timeout: 5000 })

      await contextA.close()
      await contextB.close()
    })
  })

  // ===================================================================
  // FOCUS 2: Tutorial (E8) while in collab room (E9) — conflicts
  // ===================================================================
  test.describe('Tutorial in Collab Room', () => {

    test('TC-QA-2.1: Remote model changes do NOT advance local tutorial step', async ({ browser }) => {
      const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

      // Alice starts Phase 1 from the tutorial menu
      await pageA.getByTestId('help-button').click()
      await expect(pageA.getByTestId('tutorial-menu')).toBeVisible()
      await pageA.locator('[data-testid="tutorial-phase-1"]').click()

      // Wait for driver.js to initialize and show popover (step 1 = Drag a Component)
      const driverPopover = pageA.locator('.driver-popover')
      await expect(driverPopover).toBeVisible({ timeout: 3000 })

      // Verify we're on step 1 — the action prompt should be visible
      const actionPrompt = pageA.locator('[data-testid="tutorial-action-prompt"]')
      await expect(actionPrompt).toBeVisible({ timeout: 3000 })

      // Bob creates a component (remote change)
      const canvasB = pageB.locator('.react-flow')
      await pageB.getByTestId('palette-internal').dragTo(canvasB, { targetPosition: { x: 300, y: 200 } })
      await pageB.waitForTimeout(500)

      // Wait for Yjs sync to Alice
      await pageA.waitForTimeout(2000)

      // Alice should see Bob's component on her canvas
      await expect(pageA.locator('.react-flow__node-component')).toHaveCount(1, { timeout: 5000 })

      // BUG CHECK: Alice's tutorial step should NOT have advanced from a remote change
      // The action prompt should still be visible (not replaced by "Action completed!")
      const actionComplete = pageA.locator('[data-testid="tutorial-action-complete"]')
      await expect(actionComplete).not.toBeVisible({ timeout: 2000 })
      // The original action prompt should still be there
      await expect(actionPrompt).toBeVisible()

      await contextA.close()
      await contextB.close()
    })
  })

  // ===================================================================
  // FOCUS 3: ELK auto-layout (E8) in collab (E9)
  // ===================================================================
  test.describe('ELK Re-Layout in Collab Room', () => {

    test('TC-QA-3.1: Re-Layout in tab A updates component positions in tab B', async ({ browser }) => {
      const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

      // Alice creates two components close together
      const canvasA = pageA.locator('.react-flow')
      await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 200, y: 200 } })
      await pageA.getByTestId('property-name').fill('NodeA')
      await canvasA.click({ position: { x: 50, y: 50 } })

      await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 220, y: 210 } })
      await pageA.getByTestId('property-name').fill('NodeB')
      await canvasA.click({ position: { x: 50, y: 50 } })

      // Wait for sync
      await pageA.waitForTimeout(1000)

      // Bob should see both nodes
      await expect(pageB.locator('.react-flow__node').filter({ hasText: 'NodeA' })).toBeVisible({ timeout: 5000 })
      await expect(pageB.locator('.react-flow__node').filter({ hasText: 'NodeB' })).toBeVisible({ timeout: 5000 })

      // Record Bob's node positions before layout
      const nodeABefore = await pageB.locator('.react-flow__node').filter({ hasText: 'NodeA' }).boundingBox()
      const nodeBBefore = await pageB.locator('.react-flow__node').filter({ hasText: 'NodeB' }).boundingBox()

      // Alice clicks Re-Layout dropdown → Left-to-Right
      await pageA.getByTestId('relayout-dropdown-toggle').click()
      await pageA.getByTestId('relayout-option-lr').click()

      // Wait for ELK + sync
      await pageA.waitForTimeout(2000)

      // Bob's node positions should have changed
      const nodeAAfter = await pageB.locator('.react-flow__node').filter({ hasText: 'NodeA' }).boundingBox()
      const nodeBAfter = await pageB.locator('.react-flow__node').filter({ hasText: 'NodeB' }).boundingBox()

      // At least one node should have moved significantly (ELK spreads them apart)
      const nodeAMoved = nodeABefore && nodeAAfter &&
        (Math.abs(nodeABefore.x - nodeAAfter.x) > 20 || Math.abs(nodeABefore.y - nodeAAfter.y) > 20)
      const nodeBMoved = nodeBBefore && nodeBAfter &&
        (Math.abs(nodeBBefore.x - nodeBAfter.x) > 20 || Math.abs(nodeBBefore.y - nodeBAfter.y) > 20)

      expect(nodeAMoved || nodeBMoved).toBe(true)

      await contextA.close()
      await contextB.close()
    })
  })

  // ===================================================================
  // FOCUS 4: Simulation playback (E5/E6) in collab room (E9)
  // ===================================================================
  test.describe('Simulation in Collab Room', () => {

    test('TC-QA-4.1: Simulation results are invalidated when remote user modifies model', async ({ browser }) => {
      const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

      // Alice loads "Hello Cascade" (gives components + chains + scenario)
      await openLibraryPanel(pageA)
      await pageA.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
      await expect(pageA.getByTestId('library-panel')).not.toBeVisible()
      await pageA.waitForTimeout(1000)

      // Alice switches to Simulate tab
      await pageA.getByTestId('tab-simulate').click()
      await pageA.waitForTimeout(300)

      // Alice selects the scenario ("Rising Temperature") from the dropdown
      const scenarioSelect = pageA.getByTestId('sim-scenario-select')
      await scenarioSelect.selectOption({ label: 'Rising Temperature' })
      await pageA.waitForTimeout(200)

      // Alice clicks Run Simulation
      await pageA.getByTestId('sim-run-button').click()
      await pageA.waitForTimeout(500)

      // Verify simulation results are visible (summary badge)
      const summaryBadge = pageA.getByTestId('sim-summary-badge')
      await expect(summaryBadge).toBeVisible({ timeout: 5000 })

      // Bob adds a new component (modifies the model remotely)
      const canvasB = pageB.locator('.react-flow')
      await pageB.getByTestId('palette-internal').dragTo(canvasB, { targetPosition: { x: 400, y: 400 } })
      await pageB.getByTestId('property-name').fill('NewNode')
      await canvasB.click({ position: { x: 50, y: 50 } })

      // Wait for Yjs sync to Alice
      await pageA.waitForTimeout(2000)

      // BUG CHECK: Alice's simulation results should be invalidated
      // The summary badge should no longer be visible (results were cleared)
      await expect(summaryBadge).not.toBeVisible({ timeout: 5000 })

      await contextA.close()
      await contextB.close()
    })
  })

  // ===================================================================
  // FOCUS 5: Side panel (E8) state in collab — independent per user
  // ===================================================================
  test.describe('Side Panel State in Collab Room', () => {

    test('TC-QA-5.1: Results panel collapse/expand is independent per user', async ({ browser }) => {
      const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

      // Both switch to Simulate mode
      await pageA.getByTestId('tab-simulate').click()
      await pageB.getByTestId('tab-simulate').click()
      await pageA.waitForTimeout(300)

      // Both should see results side panel
      const panelA = pageA.getByTestId('results-side-panel')
      const panelB = pageB.getByTestId('results-side-panel')

      // Both panels should be visible initially
      await expect(panelA).toBeVisible()
      await expect(panelB).toBeVisible()

      // Alice collapses her results panel
      await pageA.getByTestId('panel-collapse-toggle').click()
      await pageA.waitForTimeout(500)

      // Alice's panel should be collapsed (narrow, ~40px width)
      const panelABox = await panelA.boundingBox()
      expect(panelABox!.width).toBeLessThan(50)

      // Bob's panel should still be expanded (>100px width)
      const panelBBox = await panelB.boundingBox()
      expect(panelBBox!.width).toBeGreaterThan(100)

      await contextA.close()
      await contextB.close()
    })
  })
})
