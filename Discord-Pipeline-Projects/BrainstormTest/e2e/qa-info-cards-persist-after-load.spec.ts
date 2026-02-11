import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

test.describe('QA: Dismissed info cards persist between library loads', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('BUG: Dismissed info cards should be restored when loading a new scenario', async ({ page }) => {
    // Step 1: Load "Hello Cascade" (has info cards hc-info-1, hc-info-2)
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // Verify info cards are visible
    await expect(page.getByTestId('info-card-hc-info-1')).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('info-card-hc-info-2')).toBeVisible({ timeout: 3000 })

    // Step 2: Dismiss one info card
    await page.getByTestId('info-card-hc-info-1').getByTestId('info-dismiss').click()
    await expect(page.getByTestId('info-card-hc-info-1')).not.toBeVisible()

    // Step 3: Load "Branching Paths" (has info cards bp-info-1, bp-info-2)
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-branching-paths').getByTestId('card-load-button').click()
    await page.getByTestId('library-confirm-ok').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // BUG: The new scenario's info cards should ALL be visible (dismissed set should be cleared)
    await expect(page.getByTestId('info-card-bp-info-1')).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('info-card-bp-info-2')).toBeVisible({ timeout: 3000 })

    // Step 4: Go back and load Hello Cascade again — its cards should all be visible too
    await openLibraryPanel(page)
    await page.getByTestId('scenario-card-hello-cascade').getByTestId('card-load-button').click()
    await page.getByTestId('library-confirm-ok').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()
    await page.waitForTimeout(500)

    // Both cards should be visible again (dismissed set was cleared)
    await expect(page.getByTestId('info-card-hc-info-1')).toBeVisible({ timeout: 3000 })
    await expect(page.getByTestId('info-card-hc-info-2')).toBeVisible({ timeout: 3000 })
  })
})
