import { test, expect, type Browser } from '@playwright/test'

test.describe('Epic 9 - US-9.1: Create Collaboration Room', () => {
  test('TC-9.1.1: "Collaborate" button creates a room with shareable URL', async ({ page }) => {
    // 1. Navigate to app
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // 2. Assert "Collaborate" button is visible in the toolbar
    const collaborateBtn = page.getByTestId('collaborate-button')
    await expect(collaborateBtn).toBeVisible()

    // 3. Click "Collaborate"
    await collaborateBtn.click()

    // 4. Assert display name prompt appears
    const namePrompt = page.getByTestId('display-name-prompt')
    await expect(namePrompt).toBeVisible()

    // 5. Enter name: "Alice"
    await page.getByTestId('display-name-input').fill('Alice')

    // 6. Confirm
    await page.getByTestId('confirm-name-button').click()

    // 7. Assert room modal appears
    const roomModal = page.getByTestId('room-modal')
    await expect(roomModal).toBeVisible()

    // 8. Assert modal contains a URL with a ?room= parameter
    const roomUrl = page.getByTestId('room-url')
    await expect(roomUrl).toBeVisible()
    const urlText = await roomUrl.textContent()
    expect(urlText).toContain('?room=')

    // 9. Assert "Copy Link" button is visible
    await expect(page.getByTestId('copy-link-button')).toBeVisible()

    // 10. Assert the user "Alice" appears as a connected participant
    const participantList = page.getByTestId('participant-list')
    await expect(participantList).toContainText('Alice')
  })

  test('TC-9.1.2: "Copy Link" copies URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // Create a room as "Alice"
    await page.getByTestId('collaborate-button').click()
    await page.getByTestId('display-name-input').fill('Alice')
    await page.getByTestId('confirm-name-button').click()
    await expect(page.getByTestId('room-modal')).toBeVisible()

    // Click "Copy Link"
    await page.getByTestId('copy-link-button').click()

    // Read clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())

    // Assert clipboard contains a URL with ?room= parameter
    expect(clipboardText).toContain('?room=')
  })

  test('TC-9.1.3: Room ID is unique per creation', async ({ browser }) => {
    // Create room in context A
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    await pageA.goto('http://localhost:5173/')
    await pageA.waitForSelector('.react-flow')
    await pageA.getByTestId('collaborate-button').click()
    await pageA.getByTestId('display-name-input').fill('Alice')
    await pageA.getByTestId('confirm-name-button').click()
    await expect(pageA.getByTestId('room-modal')).toBeVisible()
    const urlA = await pageA.getByTestId('room-url').textContent()

    // Close modal
    await pageA.getByTestId('close-room-modal').click()

    // Create room in context B
    const contextB = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageB = await contextB.newPage()
    await pageB.goto('http://localhost:5173/')
    await pageB.waitForSelector('.react-flow')
    await pageB.getByTestId('collaborate-button').click()
    await pageB.getByTestId('display-name-input').fill('Bob')
    await pageB.getByTestId('confirm-name-button').click()
    await expect(pageB.getByTestId('room-modal')).toBeVisible()
    const urlB = await pageB.getByTestId('room-url').textContent()

    // Assert URLs are different (unique room IDs)
    expect(urlA).not.toEqual(urlB)

    await contextA.close()
    await contextB.close()
  })

  test('TC-9.1.4: Empty display name rejected', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // Click "Collaborate"
    await page.getByTestId('collaborate-button').click()
    await expect(page.getByTestId('display-name-prompt')).toBeVisible()

    // Leave display name empty and attempt to confirm
    await page.getByTestId('confirm-name-button').click()

    // Assert validation error
    await expect(page.getByTestId('name-validation-error')).toBeVisible()
    await expect(page.getByTestId('name-validation-error')).toContainText('required')

    // Assert room is NOT created (no room modal)
    await expect(page.getByTestId('room-modal')).not.toBeVisible()
  })
})
