import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

/** Helper: creates a room as "Alice" and returns page + context + roomUrl. */
async function createRoomAsAlice(browser: Browser): Promise<{
  context: BrowserContext
  page: Page
  roomUrl: string
}> {
  const context = await browser.newContext({ storageState: './e2e/storage-state.json' })
  const page = await context.newPage()
  await page.goto('http://localhost:5173/')
  await page.waitForSelector('.react-flow')

  await page.getByTestId('collaborate-button').click()
  await page.getByTestId('display-name-input').fill('Alice')
  await page.getByTestId('confirm-name-button').click()
  await expect(page.getByTestId('room-modal')).toBeVisible()
  const roomUrl = (await page.getByTestId('room-url').textContent()) || ''
  return { context, page, roomUrl }
}

/** Helper: joins a room as the given user. */
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

test.describe('Epic 10 - US-10.4: Share Room Modal', () => {
  test('TC-10.4.1: "Share" button opens modal with room link and user list', async ({ browser }) => {
    const { context, page, roomUrl } = await createRoomAsAlice(browser)

    // Modal is already visible from room creation
    const roomModal = page.getByTestId('room-modal')
    await expect(roomModal).toBeVisible()

    // Assert modal contains a room link with ?room= parameter
    const roomUrlEl = page.getByTestId('room-url')
    await expect(roomUrlEl).toBeVisible()
    const urlText = await roomUrlEl.textContent()
    expect(urlText).toContain('?room=')

    // Assert "Copy Link" button is visible
    await expect(page.getByTestId('copy-link-button')).toBeVisible()

    // Assert connected user count is shown
    const participantLabel = roomModal.locator('text=Connected')
    await expect(participantLabel).toBeVisible()

    // Assert user list shows "Alice"
    const participantList = page.getByTestId('participant-list')
    await expect(participantList).toContainText('Alice')

    // Close modal, then re-open via "Share" button
    await page.getByTestId('close-room-modal').click()
    await expect(roomModal).not.toBeVisible()

    // The button should now say "Share" (since we're connected)
    const shareBtn = page.getByTestId('collaborate-button')
    await expect(shareBtn).toContainText('Share')

    // Click "Share" to re-open
    await shareBtn.click()
    await expect(roomModal).toBeVisible()

    await context.close()
  })

  test('TC-10.4.2: "Copy Link" copies URL to clipboard with confirmation', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: './e2e/storage-state.json',
      permissions: ['clipboard-read', 'clipboard-write'],
    })
    const page = await context.newPage()
    await page.goto('http://localhost:5173/')
    await page.waitForSelector('.react-flow')

    // Create room
    await page.getByTestId('collaborate-button').click()
    await page.getByTestId('display-name-input').fill('Alice')
    await page.getByTestId('confirm-name-button').click()
    await expect(page.getByTestId('room-modal')).toBeVisible()

    // Click "Copy Link"
    const copyBtn = page.getByTestId('copy-link-button')
    await copyBtn.click()

    // Assert "Copied!" confirmation text appears
    await expect(copyBtn).toContainText('Copied!')

    // Read clipboard — assert it contains the room URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain('?room=')

    await context.close()
  })

  test('TC-10.4.3: User list updates when new user joins', async ({ browser }) => {
    const { context: contextA, page: pageA, roomUrl } = await createRoomAsAlice(browser)

    // Modal is open — shows 1 user
    const participantList = pageA.getByTestId('participant-list')
    const participantItems = pageA.getByTestId('participant-item')
    await expect(participantItems).toHaveCount(1)

    // Bob joins the room
    const { context: contextB } = await joinRoom(browser, roomUrl, 'Bob')

    // Assert Share modal in context A now shows 2 users
    await expect(participantItems).toHaveCount(2, { timeout: 5000 })

    // Assert "Bob" appears in the user list
    await expect(participantList).toContainText('Bob')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.4.4: Modal dismisses on click outside or Esc', async ({ browser }) => {
    const { context, page } = await createRoomAsAlice(browser)

    const roomModal = page.getByTestId('room-modal')
    await expect(roomModal).toBeVisible()

    // Press Escape — modal dismissed
    await page.keyboard.press('Escape')
    await expect(roomModal).not.toBeVisible()

    // Click "Share" again — modal visible
    await page.getByTestId('collaborate-button').click()
    await expect(roomModal).toBeVisible()

    // Click outside the modal (on the backdrop)
    await roomModal.click({ position: { x: 5, y: 5 } })
    await expect(roomModal).not.toBeVisible()

    await context.close()
  })

  test('TC-10.4.5: "Share" acts as "Collaborate" when not in a room', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // Assert toolbar shows "Collaborate" button (not connected)
    const btn = page.getByTestId('collaborate-button')
    await expect(btn).toContainText('Collaborate')

    // Click it
    await btn.click()

    // Assert display name prompt appears
    await expect(page.getByTestId('display-name-prompt')).toBeVisible()
  })

  test('TC-10.4.6: Share modal reflects correct connected user count', async ({ browser }) => {
    const { context: contextA, page: pageA, roomUrl } = await createRoomAsAlice(browser)

    // Close modal first so we can test re-opening
    await pageA.getByTestId('close-room-modal').click()

    // Bob joins
    const { context: contextB } = await joinRoom(browser, roomUrl, 'Bob')

    // Charlie joins
    const { context: contextC } = await joinRoom(browser, roomUrl, 'Charlie')

    // Alice opens Share modal
    await pageA.getByTestId('collaborate-button').click()
    const roomModal = pageA.getByTestId('room-modal')
    await expect(roomModal).toBeVisible()

    // Assert count shows 3
    await expect(pageA.getByTestId('participant-item')).toHaveCount(3, { timeout: 5000 })
    await expect(roomModal).toContainText('Connected (3)')

    // Bob disconnects
    await contextB.close()

    // Assert count updates to 2 (heartbeat-based stale detection ~4s)
    await expect(pageA.getByTestId('participant-item')).toHaveCount(2, { timeout: 8000 })
    await expect(roomModal).toContainText('Connected (2)')

    await contextA.close()
    await contextC.close()
  })
})
