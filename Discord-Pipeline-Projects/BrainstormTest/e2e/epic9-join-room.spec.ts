import { test, expect } from '@playwright/test'

/** Helper: create a room in a given page and return the share URL */
async function createRoom(page: import('@playwright/test').Page, displayName: string) {
  await page.goto('http://localhost:5173/')
  await page.waitForSelector('.react-flow')
  await page.getByTestId('collaborate-button').click()
  await page.getByTestId('display-name-input').fill(displayName)
  await page.getByTestId('confirm-name-button').click()
  await expect(page.getByTestId('room-modal')).toBeVisible()
  const roomUrl = (await page.getByTestId('room-url').textContent()) || ''
  await page.getByTestId('close-room-modal').click()
  return roomUrl
}

test.describe('Epic 9 - US-9.2: Join Room via Shared Link', () => {
  test('TC-9.2.1: Opening URL with room parameter joins the room', async ({ browser }) => {
    // Context A: create a room and add a component "Server"
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    const roomUrl = await createRoom(pageA, 'Alice')

    // Add a component "Server" in context A
    const canvas = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvas, { targetPosition: { x: 300, y: 200 } })
    await pageA.getByTestId('property-name').fill('Server')
    // Click canvas to deselect
    await canvas.click({ position: { x: 50, y: 50 } })

    // Wait a moment for sync to propagate
    await pageA.waitForTimeout(500)

    // Context B: navigate to the room URL
    const contextB = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageB = await contextB.newPage()
    await pageB.goto(roomUrl)

    // Assert display name prompt appears
    await expect(pageB.getByTestId('display-name-prompt')).toBeVisible()

    // Enter name and confirm
    await pageB.getByTestId('display-name-input').fill('Bob')
    await pageB.getByTestId('confirm-name-button').click()

    // Wait for sync
    await pageB.waitForTimeout(1000)

    // Assert context B's canvas shows the "Server" component
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Server' })).toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.2.2: Late joiner sees complete current state', async ({ browser }) => {
    // Context A: create room and build a model
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    const roomUrl = await createRoom(pageA, 'Alice')

    const canvas = pageA.locator('.react-flow')

    // Add 3 components
    await pageA.getByTestId('palette-internal').dragTo(canvas, { targetPosition: { x: 200, y: 150 } })
    await pageA.getByTestId('property-name').fill('Comp1')
    await canvas.click({ position: { x: 50, y: 50 } })

    await pageA.getByTestId('palette-internal').dragTo(canvas, { targetPosition: { x: 400, y: 150 } })
    await pageA.getByTestId('property-name').fill('Comp2')
    await canvas.click({ position: { x: 50, y: 50 } })

    await pageA.getByTestId('palette-external').dragTo(canvas, { targetPosition: { x: 300, y: 300 } })
    await pageA.getByTestId('property-name').fill('Comp3')
    await canvas.click({ position: { x: 50, y: 50 } })

    // Create a scenario
    await pageA.getByTestId('tab-scenarios').click()
    await pageA.getByTestId('create-scenario').click()
    await pageA.waitForTimeout(300)

    // Wait 2 seconds for state to stabilize
    await pageA.waitForTimeout(2000)

    // Context B joins the room late
    const contextB = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageB = await contextB.newPage()
    await pageB.goto(roomUrl)
    await pageB.getByTestId('display-name-input').fill('Bob')
    await pageB.getByTestId('confirm-name-button').click()
    await pageB.waitForTimeout(1500)

    // Assert context B sees all 3 components on canvas
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Comp1' })).toBeVisible({ timeout: 5000 })
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Comp2' })).toBeVisible({ timeout: 5000 })
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Comp3' })).toBeVisible({ timeout: 5000 })

    // Switch to Scenarios tab in context B — assert scenario exists
    await pageB.getByTestId('tab-scenarios').click()
    await pageB.waitForTimeout(500)
    const scenarioItems = pageB.locator('[data-testid^="scenario-item-"]')
    await expect(scenarioItems).toHaveCount(1, { timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.2.3: Error state for non-existent or unreachable room', async ({ page }) => {
    // Navigate to a room that doesn't exist
    await page.goto('/?room=nonexistent-room-12345')
    await page.waitForSelector('.react-flow')

    // Assert display name prompt appears
    await expect(page.getByTestId('display-name-prompt')).toBeVisible()

    // Enter display name
    await page.getByTestId('display-name-input').fill('Alice')
    await page.getByTestId('confirm-name-button').click()

    // Assert error message appears (wait for timeout)
    await expect(page.getByTestId('connection-error')).toBeVisible({ timeout: 10000 })

    // Assert "Work Offline" fallback button is visible
    await expect(page.getByTestId('work-offline-button')).toBeVisible()

    // Click "Work Offline"
    await page.getByTestId('work-offline-button').click()

    // Assert app loads normally without collaboration
    await expect(page.locator('.react-flow')).toBeVisible()
    await expect(page.getByTestId('connection-error')).not.toBeVisible()
  })

  test('TC-9.2.4: Edge — Join room with existing local model', async ({ browser }) => {
    // Context A: create room with component "Remote"
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    const roomUrl = await createRoom(pageA, 'Alice')

    const canvasA = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 300, y: 200 } })
    await pageA.getByTestId('property-name').fill('Remote')
    await canvasA.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(500)

    // Context B: create a local component "Local" before joining
    const contextB = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageB = await contextB.newPage()
    await pageB.goto('http://localhost:5173/')
    await pageB.waitForSelector('.react-flow')

    const canvasB = pageB.locator('.react-flow')
    await pageB.getByTestId('palette-internal').dragTo(canvasB, { targetPosition: { x: 300, y: 200 } })
    await pageB.getByTestId('property-name').fill('Local')
    await canvasB.click({ position: { x: 50, y: 50 } })

    // Verify "Local" exists
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Local' })).toBeVisible()

    // Navigate to the room URL
    await pageB.goto(roomUrl)
    await pageB.getByTestId('display-name-input').fill('Bob')
    await pageB.getByTestId('confirm-name-button').click()
    await pageB.waitForTimeout(1500)

    // Assert local model is replaced by room state
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Remote' })).toBeVisible({ timeout: 5000 })
    // "Local" should no longer be visible (replaced by room state)
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'Local' })).not.toBeVisible()

    await contextA.close()
    await contextB.close()
  })
})
