import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

async function createRoomAsAlice(browser: Browser): Promise<{
  contextA: BrowserContext
  pageA: Page
  roomUrl: string
}> {
  const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
  const pageA = await contextA.newPage()
  await pageA.goto('http://localhost:5173/')
  await pageA.waitForSelector('.react-flow')

  await pageA.getByTestId('collaborate-button').click()
  await pageA.getByTestId('display-name-input').fill('Alice')
  await pageA.getByTestId('confirm-name-button').click()
  await expect(pageA.getByTestId('room-modal')).toBeVisible()
  const roomUrl = (await pageA.getByTestId('room-url').textContent()) || ''
  await pageA.getByTestId('close-room-modal').click()

  return { contextA, pageA, roomUrl }
}

async function joinRoom(browser: Browser, roomUrl: string, name: string): Promise<{
  context: BrowserContext
  page: Page
}> {
  const context = await browser.newContext({ storageState: './e2e/storage-state.json' })
  const page = await context.newPage()
  await page.goto(roomUrl)
  await page.getByTestId('display-name-input').fill(name)
  await page.getByTestId('confirm-name-button').click()
  await page.waitForTimeout(1500)
  return { context, page }
}

test.describe('Epic 10 - US-10.5: Activity Bar', () => {
  test('TC-10.5.1: Activity bar appears in collaboration room', async ({ browser }) => {
    const { contextA, pageA } = await createRoomAsAlice(browser)

    const activityBar = pageA.getByTestId('activity-bar')
    await expect(activityBar).toBeVisible({ timeout: 3000 })

    await contextA.close()
  })

  test('TC-10.5.2: Component add activity logged', async ({ browser }) => {
    const { contextA, pageA, roomUrl } = await createRoomAsAlice(browser)
    const { context: contextB, page: pageB } = await joinRoom(browser, roomUrl, 'Bob')

    // Alice adds a component
    await dragPaletteToCanvas(pageA, 'internal')
    await pageA.waitForTimeout(1000)

    // Bob's activity bar should show the add activity
    const activityEntry = pageB.getByTestId('activity-entry').first()
    await expect(activityEntry).toBeVisible({ timeout: 5000 })
    await expect(activityEntry).toContainText('Alice')
    await expect(activityEntry).toContainText('added')

    // Entry should have a color dot
    const colorDot = activityEntry.locator('[data-testid="activity-color-dot"]')
    await expect(colorDot).toBeVisible()

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.5.3: Component edit activity logged', async ({ browser }) => {
    const { contextA, pageA, roomUrl } = await createRoomAsAlice(browser)

    // Alice adds a component first
    await dragPaletteToCanvas(pageA, 'internal')
    await pageA.waitForTimeout(500)

    const { context: contextB, page: pageB } = await joinRoom(browser, roomUrl, 'Bob')

    // Bob selects the node and renames it in PropertyEditor
    const nodeB = pageB.locator('.react-flow__node').first()
    await nodeB.click()
    await pageB.waitForTimeout(300)

    const nameInput = pageB.getByTestId('property-name')
    await nameInput.clear()
    await nameInput.fill('SuperPump')
    await pageB.waitForTimeout(1000)

    // Alice's activity bar should show edit activity
    const entries = pageA.getByTestId('activity-entry')
    const editEntry = entries.filter({ hasText: 'edited' })
    await expect(editEntry.first()).toBeVisible({ timeout: 5000 })
    await expect(editEntry.first()).toContainText('Bob')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.5.4: Component delete activity logged', async ({ browser }) => {
    const { contextA, pageA, roomUrl } = await createRoomAsAlice(browser)

    // Alice adds a component
    await dragPaletteToCanvas(pageA, 'internal')
    await pageA.waitForTimeout(500)

    const { context: contextB, page: pageB } = await joinRoom(browser, roomUrl, 'Bob')

    // Alice selects the node and deletes it
    const nodeA = pageA.locator('.react-flow__node').first()
    await nodeA.click()
    await pageA.keyboard.press('Delete')
    await pageA.waitForTimeout(1000)

    // Bob's activity bar should show delete activity
    const entries = pageB.getByTestId('activity-entry')
    const deleteEntry = entries.filter({ hasText: 'deleted' })
    await expect(deleteEntry.first()).toBeVisible({ timeout: 5000 })
    await expect(deleteEntry.first()).toContainText('Alice')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.5.5: Multiple action types tracked', async ({ browser }) => {
    const { contextA, pageA, roomUrl } = await createRoomAsAlice(browser)
    const { context: contextB, page: pageB } = await joinRoom(browser, roomUrl, 'Bob')

    // Alice adds two components
    await dragPaletteToCanvas(pageA, 'internal', { x: 300, y: 200 })
    await pageA.waitForTimeout(500)
    await dragPaletteToCanvas(pageA, 'external', { x: 500, y: 300 })
    await pageA.waitForTimeout(1000)

    // Bob should see multiple "added" activities from Alice
    const entries = pageB.getByTestId('activity-entry')
    const addEntries = entries.filter({ hasText: 'added' })
    await expect(addEntries).toHaveCount(2, { timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.5.6: Activity bar shows max 20 entries', async ({ browser }) => {
    const { contextA, pageA } = await createRoomAsAlice(browser)

    // Rapidly create 25 components (keep positions in upper canvas area to avoid activity bar overlap)
    for (let i = 0; i < 25; i++) {
      const x = 100 + (i % 8) * 80
      const y = 80 + Math.floor(i / 8) * 60
      await dragPaletteToCanvas(pageA, 'internal', { x, y })
      await pageA.waitForTimeout(150)
    }
    await pageA.waitForTimeout(1000)

    // Should see at most 20 entries
    const entries = pageA.getByTestId('activity-entry')
    const count = await entries.count()
    expect(count).toBeLessThanOrEqual(20)
    expect(count).toBeGreaterThan(0)

    await contextA.close()
  })

  test('TC-10.5.7: Activity bar collapse/expand toggle', async ({ browser }) => {
    const { contextA, pageA } = await createRoomAsAlice(browser)

    // Add components to generate activities
    await dragPaletteToCanvas(pageA, 'internal', { x: 300, y: 200 })
    await pageA.waitForTimeout(300)
    await dragPaletteToCanvas(pageA, 'external', { x: 500, y: 300 })
    await pageA.waitForTimeout(500)

    const activityBar = pageA.getByTestId('activity-bar')
    await expect(activityBar).toBeVisible()

    // Activity list should be visible (expanded state)
    const activityList = pageA.getByTestId('activity-list')
    await expect(activityList).toBeVisible({ timeout: 3000 })

    // Click collapse toggle
    const toggle = pageA.getByTestId('activity-toggle')
    await toggle.click()

    // Activity list should be hidden (collapsed)
    await expect(activityList).not.toBeVisible()

    // Click expand toggle
    await toggle.click()

    // Activity list should be visible again
    await expect(activityList).toBeVisible()

    await contextA.close()
  })

  test('TC-10.5.8: Activity bar not shown when not in a room', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    const activityBar = page.getByTestId('activity-bar')
    await expect(activityBar).not.toBeVisible()
  })
})
