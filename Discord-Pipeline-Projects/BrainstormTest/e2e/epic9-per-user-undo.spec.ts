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

test.describe('Epic 9 - US-9.4: Per-User Undo/Redo', () => {
  test('TC-9.4.1: Ctrl+Z undoes only the current user\'s action', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    const canvasA = pageA.locator('.react-flow')
    const canvasB = pageB.locator('.react-flow')

    // In context A, create component "FromA"
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 300, y: 200 } })
    await pageA.getByTestId('property-name').fill('FromA')
    await canvasA.click({ position: { x: 50, y: 50 } })

    // Wait for sync — both contexts see "FromA"
    await pageA.waitForTimeout(500)
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'FromA' })).toBeVisible({ timeout: 5000 })

    // In context B, create component "FromB"
    await pageB.getByTestId('palette-internal').dragTo(canvasB, { targetPosition: { x: 300, y: 300 } })
    await pageB.getByTestId('property-name').fill('FromB')
    await canvasB.click({ position: { x: 50, y: 50 } })

    // Wait for sync — both contexts see "FromA" and "FromB"
    await pageB.waitForTimeout(500)
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'FromB' })).toBeVisible({ timeout: 5000 })
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'FromA' })).toBeVisible()

    // In context A, press Ctrl+Z
    await pageA.keyboard.press('Control+z')
    await pageA.waitForTimeout(500)

    // Assert context A's canvas does NOT show "FromA" (undone)
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'FromA' })).not.toBeVisible({ timeout: 5000 })
    // Assert context A's canvas STILL shows "FromB" (not affected)
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'FromB' })).toBeVisible()

    // Assert context B shows "FromB" but not "FromA"
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'FromB' })).toBeVisible({ timeout: 5000 })
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'FromA' })).not.toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.4.2: Ctrl+Y redoes the current user\'s last undone action', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    const canvasA = pageA.locator('.react-flow')
    const canvasB = pageB.locator('.react-flow')

    // Context A creates "FromA"
    await pageA.getByTestId('palette-internal').dragTo(canvasA, { targetPosition: { x: 300, y: 200 } })
    await pageA.getByTestId('property-name').fill('FromA')
    await canvasA.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(500)

    // Context B creates "FromB"
    await pageB.getByTestId('palette-internal').dragTo(canvasB, { targetPosition: { x: 300, y: 300 } })
    await pageB.getByTestId('property-name').fill('FromB')
    await canvasB.click({ position: { x: 50, y: 50 } })
    await pageB.waitForTimeout(500)

    // Wait for sync
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'FromB' })).toBeVisible({ timeout: 5000 })

    // Context A undoes "FromA"
    await pageA.keyboard.press('Control+z')
    await pageA.waitForTimeout(500)
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'FromA' })).not.toBeVisible({ timeout: 5000 })

    // Context A presses Ctrl+Y to redo
    await pageA.keyboard.press('Control+y')
    await pageA.waitForTimeout(500)

    // Assert "FromA" reappears on both contexts
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'FromA' })).toBeVisible({ timeout: 5000 })
    await expect(pageB.locator('.react-flow__node').filter({ hasText: 'FromA' })).toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.4.3: Undo/redo buttons in toolbar with correct disabled states', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    await pageA.goto('http://localhost:5173/')
    await pageA.waitForSelector('.react-flow')

    // Create a room
    await pageA.getByTestId('collaborate-button').click()
    await pageA.getByTestId('display-name-input').fill('Alice')
    await pageA.getByTestId('confirm-name-button').click()
    await expect(pageA.getByTestId('room-modal')).toBeVisible()
    await pageA.getByTestId('close-room-modal').click()

    // Assert Undo button is visible and disabled (no actions yet)
    const undoBtn = pageA.getByTestId('undo-button')
    const redoBtn = pageA.getByTestId('redo-button')
    await expect(undoBtn).toBeVisible()
    await expect(undoBtn).toBeDisabled()
    await expect(redoBtn).toBeVisible()
    await expect(redoBtn).toBeDisabled()

    // Create a component
    const canvas = pageA.locator('.react-flow')
    await pageA.getByTestId('palette-internal').dragTo(canvas, { targetPosition: { x: 300, y: 200 } })
    await canvas.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(600) // awareness polling interval

    // Assert Undo button becomes enabled
    await expect(undoBtn).toBeEnabled({ timeout: 5000 })
    // Assert Redo button remains disabled
    await expect(redoBtn).toBeDisabled()

    // Click Undo — assert Redo button becomes enabled
    await undoBtn.click()
    await pageA.waitForTimeout(600)
    await expect(redoBtn).toBeEnabled({ timeout: 5000 })

    // Click Redo — assert Redo button becomes disabled again
    await redoBtn.click()
    await pageA.waitForTimeout(600)
    await expect(redoBtn).toBeDisabled({ timeout: 5000 })

    await contextA.close()
  })

  test('TC-9.4.4: Edge — Undo at empty stack does nothing', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    await pageA.goto('http://localhost:5173/')
    await pageA.waitForSelector('.react-flow')

    // Create a room (no components added)
    await pageA.getByTestId('collaborate-button').click()
    await pageA.getByTestId('display-name-input').fill('Alice')
    await pageA.getByTestId('confirm-name-button').click()
    await expect(pageA.getByTestId('room-modal')).toBeVisible()
    await pageA.getByTestId('close-room-modal').click()

    // Count nodes before undo
    const nodesBefore = await pageA.locator('.react-flow__node').count()

    // Press Ctrl+Z — should do nothing, no error
    await pageA.keyboard.press('Control+z')
    await pageA.waitForTimeout(300)

    // Assert canvas unchanged
    const nodesAfter = await pageA.locator('.react-flow__node').count()
    expect(nodesAfter).toEqual(nodesBefore)

    await contextA.close()
  })

  test('TC-9.4.5: Edge — Undo survives brief disconnection', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    await pageA.goto('http://localhost:5173/')
    await pageA.waitForSelector('.react-flow')

    // Create a room
    await pageA.getByTestId('collaborate-button').click()
    await pageA.getByTestId('display-name-input').fill('Alice')
    await pageA.getByTestId('confirm-name-button').click()
    await expect(pageA.getByTestId('room-modal')).toBeVisible()
    await pageA.getByTestId('close-room-modal').click()

    const canvas = pageA.locator('.react-flow')

    // Add a component before disconnect
    await pageA.getByTestId('palette-internal').dragTo(canvas, { targetPosition: { x: 200, y: 200 } })
    await pageA.getByTestId('property-name').fill('Existing')
    await canvas.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(500)

    // Simulate brief disconnect by going offline and reconnecting
    await pageA.context().setOffline(true)
    await pageA.waitForTimeout(500)
    await pageA.context().setOffline(false)
    await pageA.waitForTimeout(1500)

    // Add a new component AFTER reconnection
    await pageA.getByTestId('palette-internal').dragTo(canvas, { targetPosition: { x: 400, y: 200 } })
    await pageA.getByTestId('property-name').fill('AfterReconnect')
    await canvas.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(500)

    // Verify both components exist
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'Existing' })).toBeVisible()
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'AfterReconnect' })).toBeVisible()

    // Press Ctrl+Z — the post-reconnection component should be removed
    await pageA.keyboard.press('Control+z')
    await pageA.waitForTimeout(500)

    // Assert "AfterReconnect" is removed (undo still works after reconnection)
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'AfterReconnect' })).not.toBeVisible({ timeout: 5000 })
    // "Existing" should still be there
    await expect(pageA.locator('.react-flow__node').filter({ hasText: 'Existing' })).toBeVisible()

    await contextA.close()
  })
})
