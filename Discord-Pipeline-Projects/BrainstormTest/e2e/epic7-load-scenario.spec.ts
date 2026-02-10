import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

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

test.describe('Epic 7 - US-7.4: Load Pre-Built Scenario', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-7.4.1: Load "Hello Cascade" into empty workspace', async ({ page }) => {
    // Open library panel
    await openLibraryPanel(page)

    // Locate "Hello Cascade" card
    const card = page.getByTestId('scenario-card-hello-cascade')
    await expect(card).toBeVisible()

    // Assert "Load" button is visible on the card
    const loadBtn = card.getByTestId('card-load-button')
    await expect(loadBtn).toBeVisible()

    // Click "Load"
    await loadBtn.click()

    // Assert library panel closes
    await expect(page.getByTestId('library-panel')).not.toBeVisible()

    // Assert canvas shows exactly 2 component nodes
    const componentNodes = page.locator('.react-flow__node-component')
    await expect(componentNodes).toHaveCount(2)

    // Assert at least 1 chain edge is visible on canvas
    const edges = page.locator('.react-flow__edge')
    const edgeCount = await edges.count()
    expect(edgeCount).toBeGreaterThanOrEqual(1)

    // Assert Editor mode is active (editor tab selected)
    await expect(page.getByTestId('tab-editor')).toHaveClass(/bg-\[var\(--color-primary\)\]/)
  })

  test('TC-7.4.2: Loaded scenario includes components, chains, and a scenario with forced events', async ({ page }) => {
    // Load "Hello Cascade" from library
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()

    // Assert 2 components are visible on canvas with proper positioning (not overlapping)
    const componentNodes = page.locator('.react-flow__node-component')
    await expect(componentNodes).toHaveCount(2)

    // Verify components are at different positions (check bounding boxes don't overlap completely)
    const box1 = await componentNodes.nth(0).boundingBox()
    const box2 = await componentNodes.nth(1).boundingBox()
    expect(box1).not.toBeNull()
    expect(box2).not.toBeNull()
    // They should NOT have the same position
    const samePos = Math.abs(box1!.x - box2!.x) < 10 && Math.abs(box1!.y - box2!.y) < 10
    expect(samePos).toBe(false)

    // Select one component — assert properties panel shows parameters
    await componentNodes.first().click()
    // Should see at least one parameter row in properties panel
    await expect(page.locator('[data-testid="left-panel"]')).toBeVisible()

    // Switch to Scenarios tab
    await switchTab(page, 'Scenarios')

    // Assert at least 1 scenario exists in the scenario list
    const scenarioItems = page.locator('[data-testid^="scenario-item-"]')
    await expect(scenarioItems).toHaveCount(1)

    // Select the scenario — assert forced events appear
    await scenarioItems.first().click()
    const eventRows = page.locator('[data-testid^="event-row-"]')
    const eventCount = await eventRows.count()
    expect(eventCount).toBeGreaterThanOrEqual(1)
  })

  test('TC-7.4.3: Confirmation dialog when workspace has existing content', async ({ page }) => {
    // Setup: create component
    await dragPaletteToCanvas(page, 'internal', { x: 400, y: 300 })

    // Assert canvas has 1 component
    await expect(page.locator('.react-flow__node-component')).toHaveCount(1)

    // Open library panel
    await openLibraryPanel(page)

    // Click "Load" on "Branching Paths"
    await page.getByTestId('scenario-card-branching-paths').getByTestId('card-load-button').click()

    // Assert confirmation dialog appears warning about overwriting
    await expect(page.getByTestId('library-confirm-dialog')).toBeVisible()
    await expect(page.getByText(/Replace current model/)).toBeVisible()

    // Click "Cancel"
    await page.getByTestId('library-confirm-cancel').click()

    // Assert library panel is still open
    await expect(page.getByTestId('library-panel')).toBeVisible()

    // Click "Load" again on "Branching Paths"
    await page.getByTestId('scenario-card-branching-paths').getByTestId('card-load-button').click()

    // Click "Confirm" on dialog
    await page.getByTestId('library-confirm-ok').click()

    // Assert library panel closed
    await expect(page.getByTestId('library-panel')).not.toBeVisible()

    // Assert canvas shows 4 components (Branching Paths model)
    await expect(page.locator('.react-flow__node-component')).toHaveCount(4)
  })

  test('TC-7.4.4: Loading a different scenario replaces the previous loaded one', async ({ page }) => {
    // Load "Hello Cascade" — assert 2 nodes
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
    await expect(page.locator('.react-flow__node-component')).toHaveCount(2)

    // Open library panel again
    await openLibraryPanel(page)

    // Click "Load" on "Supply Chain Disruption"
    await page.getByTestId('scenario-card-supply-chain-disruption').getByTestId('card-load-button').click()

    // Confirm overwrite dialog
    await page.getByTestId('library-confirm-ok').click()

    // Assert canvas shows 7 components (not 2 + 7)
    await expect(page.locator('.react-flow__node-component')).toHaveCount(7)
  })

  test('TC-7.4.5: Load scenario, switch tabs, verify state persists', async ({ page }) => {
    // Load "Hello Cascade"
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
    await expect(page.locator('.react-flow__node-component')).toHaveCount(2)

    // Switch to Scenarios tab — the canvas is always mounted
    await switchTab(page, 'Scenarios')
    // Scenario list should show loaded scenario
    await expect(page.locator('[data-testid^="scenario-item-"]')).toHaveCount(1)

    // Switch to Simulate tab
    await switchTab(page, 'Simulate')

    // Switch back to Editor — 2 nodes still present
    await switchTab(page, 'Editor')
    await expect(page.locator('.react-flow__node-component')).toHaveCount(2)
  })
})
