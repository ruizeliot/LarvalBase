import { test, expect, type Browser } from '@playwright/test'

test.describe('QA: Welcome overlay blocks collaboration join prompt', () => {
  test('BUG: First-time user joining via room URL should see name prompt, not welcome overlay', async ({ browser }) => {
    // Step 1: Alice creates a room (uses storage state to skip tutorial)
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    await pageA.goto('http://localhost:5173/')
    await pageA.waitForSelector('.react-flow')

    // Alice creates a collaboration room
    await pageA.getByTestId('collaborate-button').click()
    await pageA.getByTestId('display-name-input').fill('Alice')
    await pageA.getByTestId('confirm-name-button').click()
    await expect(pageA.getByTestId('room-modal')).toBeVisible()
    const roomUrl = (await pageA.getByTestId('room-url').textContent()) || ''
    await pageA.getByTestId('close-room-modal').click()

    // Step 2: Bob is a FIRST-TIME user (no storage state = tutorial not completed)
    const contextB = await browser.newContext() // No storage state!
    const pageB = await contextB.newPage()
    await pageB.goto(roomUrl)
    await pageB.waitForSelector('.react-flow')

    // Wait for initial load + WelcomeOverlay timer (1000ms delay)
    await pageB.waitForTimeout(1500)

    // BUG: The DisplayNamePrompt should be accessible/visible for Bob to type into.
    // Without the fix, WelcomeOverlay (z-100) would cover DisplayNamePrompt (z-50),
    // making the name input impossible to interact with.
    const namePrompt = pageB.getByTestId('display-name-prompt')
    const nameInput = pageB.getByTestId('display-name-input')

    // The name prompt should be visible (not hidden behind welcome overlay)
    await expect(namePrompt).toBeVisible({ timeout: 3000 })

    // The welcome overlay should NOT be visible when joining via room URL
    await expect(pageB.getByTestId('welcome-overlay')).not.toBeVisible()

    // Bob should be able to type and submit
    await nameInput.fill('Bob')
    await pageB.getByTestId('confirm-name-button').click()

    // Wait for join to complete
    await pageB.waitForTimeout(1000)

    // Verify Bob is connected (presence bar shows)
    await expect(pageB.getByTestId('presence-bar')).toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })
})
