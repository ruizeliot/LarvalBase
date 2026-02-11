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

test.describe('Epic 10 - US-10.1: Live Cursors', () => {
  test('TC-10.1.1: Remote cursor appears on other user\'s canvas', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // In context A, move mouse to center of canvas area
    const canvasA = pageA.locator('.react-flow')
    const boxA = await canvasA.boundingBox()
    await pageA.mouse.move(boxA!.x + boxA!.width / 2, boxA!.y + boxA!.height / 2)

    // Wait for awareness sync
    await pageA.waitForTimeout(500)

    // Assert context B shows a colored cursor element
    const remoteCursor = pageB.locator('[data-testid="remote-cursor"]')
    await expect(remoteCursor).toBeVisible({ timeout: 5000 })

    // Assert cursor has a name label showing "Alice"
    await expect(remoteCursor).toContainText('Alice')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.1.2: Cursor position updates in real time', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    const canvasA = pageA.locator('.react-flow')
    const boxA = await canvasA.boundingBox()

    // Move mouse to position (200, 200) on canvas
    await pageA.mouse.move(boxA!.x + 200, boxA!.y + 200)
    await pageA.waitForTimeout(500)

    // Record remote cursor position in context B
    const remoteCursor = pageB.locator('[data-testid="remote-cursor"]').first()
    await expect(remoteCursor).toBeVisible({ timeout: 5000 })
    const pos1 = await remoteCursor.boundingBox()

    // Move mouse to position (400, 400) on canvas
    await pageA.mouse.move(boxA!.x + 400, boxA!.y + 400)
    await pageA.waitForTimeout(500)

    // Record new remote cursor position
    const pos2 = await remoteCursor.boundingBox()

    // Assert cursor moved
    expect(pos2!.x).not.toEqual(pos1!.x)
    expect(pos2!.y).not.toEqual(pos1!.y)

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.1.3: Each user gets a unique color', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Move both mice on canvas to generate cursors
    const canvasA = pageA.locator('.react-flow')
    const boxA = await canvasA.boundingBox()
    await pageA.mouse.move(boxA!.x + 200, boxA!.y + 200)

    const canvasB = pageB.locator('.react-flow')
    const boxB = await canvasB.boundingBox()
    await pageB.mouse.move(boxB!.x + 300, boxB!.y + 300)

    await pageA.waitForTimeout(500)

    // Get Alice's cursor color as seen by Bob
    const aliceCursorInB = pageB.locator('[data-testid="remote-cursor"]').first()
    await expect(aliceCursorInB).toBeVisible({ timeout: 5000 })
    const aliceColor = await aliceCursorInB.evaluate((el) => {
      const svg = el.querySelector('svg')
      return svg?.getAttribute('fill') || el.style.color || ''
    })

    // Get Bob's cursor color as seen by Alice
    const bobCursorInA = pageA.locator('[data-testid="remote-cursor"]').first()
    await expect(bobCursorInA).toBeVisible({ timeout: 5000 })
    const bobColor = await bobCursorInA.evaluate((el) => {
      const svg = el.querySelector('svg')
      return svg?.getAttribute('fill') || el.style.color || ''
    })

    // Assert the two colors are different
    expect(aliceColor).not.toEqual(bobColor)

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.1.4: Local user does not see their own remote cursor', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Move Alice's mouse on canvas
    const canvasA = pageA.locator('.react-flow')
    const boxA = await canvasA.boundingBox()
    await pageA.mouse.move(boxA!.x + 200, boxA!.y + 200)
    await pageA.waitForTimeout(500)

    // Assert context A does NOT show a remote cursor for "Alice"
    const aliceCursorsSelf = pageA.locator('[data-testid="remote-cursor"]').filter({ hasText: 'Alice' })
    await expect(aliceCursorsSelf).toHaveCount(0)

    // But context B DOES show Alice's cursor
    const aliceCursorInB = pageB.locator('[data-testid="remote-cursor"]').filter({ hasText: 'Alice' })
    await expect(aliceCursorInB).toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.1.5: Cursor disappears after disconnection', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Move Bob's mouse on canvas
    const canvasB = pageB.locator('.react-flow')
    const boxB = await canvasB.boundingBox()
    await pageB.mouse.move(boxB!.x + 200, boxB!.y + 200)
    await pageA.waitForTimeout(500)

    // Assert context A shows Bob's cursor
    const bobCursor = pageA.locator('[data-testid="remote-cursor"]').filter({ hasText: 'Bob' })
    await expect(bobCursor).toBeVisible({ timeout: 5000 })

    // Close context B (disconnect Bob)
    await contextB.close()

    // Wait up to 5 seconds
    await expect(bobCursor).not.toBeVisible({ timeout: 6000 })

    await contextA.close()
  })

  test('TC-10.1.6: Cursors only shown on canvas, not in panels', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Move Alice's mouse over the left panel (not canvas)
    const leftPanel = pageA.getByTestId('left-panel')
    const panelBox = await leftPanel.boundingBox()
    if (panelBox) {
      await pageA.mouse.move(panelBox.x + panelBox.width / 2, panelBox.y + panelBox.height / 2)
    }
    await pageA.waitForTimeout(500)

    // Context B should NOT show a remote cursor for Alice (mouse not on canvas)
    const aliceCursorInB = pageB.locator('[data-testid="remote-cursor"]').filter({ hasText: 'Alice' })
    // Should either not exist or not be visible
    const cursorCount = await aliceCursorInB.count()
    if (cursorCount > 0) {
      await expect(aliceCursorInB).not.toBeVisible()
    }

    // Move Alice's mouse back to canvas
    const canvasA = pageA.locator('.react-flow')
    const boxA = await canvasA.boundingBox()
    await pageA.mouse.move(boxA!.x + 200, boxA!.y + 200)
    await pageA.waitForTimeout(500)

    // Now context B should show Alice's cursor
    await expect(pageB.locator('[data-testid="remote-cursor"]').filter({ hasText: 'Alice' })).toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })
})
