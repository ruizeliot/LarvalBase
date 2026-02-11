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

test.describe('Epic 10 - US-10.2: Presence Bar', () => {
  test('TC-10.2.1: Presence bar shows connected users', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    // Assert presence bar is visible in context A
    const presenceBarA = pageA.getByTestId('presence-bar')
    await expect(presenceBarA).toBeVisible({ timeout: 5000 })

    // Assert there are 2 avatars
    const avatarsA = presenceBarA.locator('[data-testid="presence-avatar"]')
    await expect(avatarsA).toHaveCount(2, { timeout: 5000 })

    // Assert participant count shows "2"
    const countA = presenceBarA.getByTestId('participant-count')
    await expect(countA).toHaveText('2')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.2.2: Own avatar is shown first with "You" label', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    const presenceBar = pageA.getByTestId('presence-bar')
    await expect(presenceBar).toBeVisible({ timeout: 5000 })

    // First avatar should be Alice's (own)
    const firstAvatar = presenceBar.locator('[data-testid="presence-avatar"]').first()
    await firstAvatar.hover()

    // Tooltip should show "You" or "Alice (You)"
    const tooltip = pageA.getByTestId('presence-tooltip')
    await expect(tooltip).toBeVisible({ timeout: 3000 })
    await expect(tooltip).toContainText('You')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.2.3: Hovering avatar shows display name', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    const presenceBar = pageA.getByTestId('presence-bar')
    await expect(presenceBar).toBeVisible({ timeout: 5000 })

    // Hover over the second avatar (Bob's) in context A
    const secondAvatar = presenceBar.locator('[data-testid="presence-avatar"]').nth(1)
    await secondAvatar.hover()

    const tooltip = pageA.getByTestId('presence-tooltip')
    await expect(tooltip).toBeVisible({ timeout: 3000 })
    await expect(tooltip).toContainText('Bob')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.2.4: User disappears from presence bar on disconnect', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsInRoom(browser)

    const presenceBar = pageA.getByTestId('presence-bar')
    await expect(presenceBar).toBeVisible({ timeout: 5000 })

    // Verify 2 avatars initially
    const avatars = presenceBar.locator('[data-testid="presence-avatar"]')
    await expect(avatars).toHaveCount(2, { timeout: 5000 })

    // Close context B (Bob disconnects)
    await contextB.close()

    // Wait for presence to update — should show 1 avatar
    await expect(avatars).toHaveCount(1, { timeout: 6000 })

    // Participant count should show "1"
    const count = presenceBar.getByTestId('participant-count')
    await expect(count).toHaveText('1')

    await contextA.close()
  })

  test('TC-10.2.5: Presence bar not shown when not in a room', async ({ page }) => {
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('.react-flow')

    // Presence bar should NOT be visible
    const presenceBar = page.getByTestId('presence-bar')
    await expect(presenceBar).not.toBeVisible()
  })

  test('TC-10.2.6: Third user joins', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB, roomUrl } = await openTwoContextsInRoom(browser)

    const presenceBarA = pageA.getByTestId('presence-bar')
    await expect(presenceBarA).toBeVisible({ timeout: 5000 })
    await expect(presenceBarA.locator('[data-testid="presence-avatar"]')).toHaveCount(2, { timeout: 5000 })

    // Third user joins
    const contextC = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageC = await contextC.newPage()
    await pageC.goto(roomUrl)
    await pageC.getByTestId('display-name-input').fill('Charlie')
    await pageC.getByTestId('confirm-name-button').click()
    await pageC.waitForTimeout(1000)

    // All three presence bars should show 3 avatars
    await expect(presenceBarA.locator('[data-testid="presence-avatar"]')).toHaveCount(3, { timeout: 5000 })
    await expect(presenceBarA.getByTestId('participant-count')).toHaveText('3')

    const presenceBarC = pageC.getByTestId('presence-bar')
    await expect(presenceBarC).toBeVisible({ timeout: 5000 })
    await expect(presenceBarC.locator('[data-testid="presence-avatar"]')).toHaveCount(3, { timeout: 5000 })

    await contextA.close()
    await contextB.close()
    await contextC.close()
  })
})
