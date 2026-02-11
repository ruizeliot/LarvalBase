import { test, expect, type Browser } from '@playwright/test'

test.describe('QA: activeScenarioId not synced in collaboration', () => {
  test('BUG: Active scenario should sync to joining collaborator', async ({ browser }) => {
    // Alice creates a room with tutorial complete
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

    // Alice navigates to Scenarios tab and creates a scenario
    await pageA.getByTestId('tab-scenarios').click()
    await pageA.getByTestId('create-scenario').click()
    await pageA.waitForTimeout(500)

    // Verify Alice has an active scenario with name input visible
    await expect(pageA.getByTestId('scenario-name-input')).toBeVisible()

    // Bob joins the room
    const contextB = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageB = await contextB.newPage()
    await pageB.goto(roomUrl)
    await pageB.getByTestId('display-name-input').fill('Bob')
    await pageB.getByTestId('confirm-name-button').click()
    await pageB.waitForTimeout(1500) // wait for Yjs sync

    // Bob navigates to Scenarios tab
    await pageB.getByTestId('tab-scenarios').click()
    await pageB.waitForTimeout(500)

    // BUG: Bob should see the same active scenario (not "no-scenario-message")
    // Without the fix, activeScenarioId would be null on Bob's side.
    await expect(pageB.getByTestId('scenario-name-input')).toBeVisible({ timeout: 3000 })
    await expect(pageB.getByTestId('no-scenario-message')).not.toBeVisible()

    await contextA.close()
    await contextB.close()
  })
})
