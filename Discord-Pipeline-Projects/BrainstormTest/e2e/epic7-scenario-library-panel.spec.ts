import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

test.describe('Epic 7 - US-7.1: Scenario Library Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-7.1.1: Library button is accessible and opens the library panel', async ({ page }) => {
    // 1. Assert a "Library" button is visible in the toolbar
    const libraryBtn = page.getByTestId('library-button')
    await expect(libraryBtn).toBeVisible()

    // 2. Click "Library" button
    await libraryBtn.click()

    // 3. Assert library panel/modal appears
    await expect(page.getByTestId('library-panel')).toBeVisible()

    // 4. Assert panel contains a grid of scenario cards
    const cards = page.locator('[data-testid^="scenario-card-"]')
    await expect(cards.first()).toBeVisible()
  })

  test('TC-7.1.2: Library contains exactly 6 pre-built scenarios', async ({ page }) => {
    // 1. Open library panel
    await openLibraryPanel(page)

    // 2. Assert exactly 6 scenario cards are visible
    const cards = page.locator('[data-testid^="scenario-card-"]')
    await expect(cards).toHaveCount(6)

    // 3. Assert each card has a visible title text
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i)
      await expect(card.locator('[data-testid="card-title"]')).toBeVisible()
    }

    // 4. Assert each card has a visible description text
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i)
      await expect(card.locator('[data-testid="card-description"]')).toBeVisible()
    }

    // 5. Assert each card has a node count indicator
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i)
      await expect(card.locator('[data-testid="card-node-count"]')).toBeVisible()
    }

    // 6. Assert each card has a difficulty badge
    for (let i = 0; i < 6; i++) {
      const card = cards.nth(i)
      await expect(card.locator('[data-testid="card-difficulty"]')).toBeVisible()
    }
  })

  test('TC-7.1.3: Scenario card details match expected data', async ({ page }) => {
    // 1. Open library panel
    await openLibraryPanel(page)

    // 2. Locate card with title "Hello Cascade"
    const helloCard = page.getByTestId('scenario-card-hello-cascade')
    await expect(helloCard).toBeVisible()

    // 3. Assert description is non-empty
    const helloDesc = helloCard.locator('[data-testid="card-description"]')
    await expect(helloDesc).not.toHaveText('')

    // 4. Assert node count shows "2"
    await expect(helloCard.locator('[data-testid="card-node-count"]')).toContainText('2')

    // 5. Assert difficulty badge shows "Beginner"
    await expect(helloCard.locator('[data-testid="card-difficulty"]')).toHaveText('Beginner')

    // 6. Locate card with title "Pandemic Stress Test"
    const pandemicCard = page.getByTestId('scenario-card-pandemic-stress-test')
    await expect(pandemicCard).toBeVisible()

    // 7. Assert node count shows "17"
    await expect(pandemicCard.locator('[data-testid="card-node-count"]')).toContainText('17')

    // 8. Assert difficulty badge shows "Expert"
    await expect(pandemicCard.locator('[data-testid="card-difficulty"]')).toHaveText('Expert')
  })

  test('TC-7.1.4: Library panel can be closed', async ({ page }) => {
    // 1. Open library panel
    await openLibraryPanel(page)

    // 2. Assert panel is visible
    await expect(page.getByTestId('library-panel')).toBeVisible()

    // 3. Close the panel (click close button)
    await page.getByTestId('library-close').click()

    // 4. Assert panel is no longer visible
    await expect(page.getByTestId('library-panel')).not.toBeVisible()

    // 5. Assert normal workspace is restored (canvas visible)
    await expect(page.locator('.react-flow')).toBeVisible()
  })

  test('TC-7.1.5: Open library panel, close, reopen', async ({ page }) => {
    // 1. Open library panel
    await openLibraryPanel(page)

    // 2. Close panel
    await page.getByTestId('library-close').click()
    await expect(page.getByTestId('library-panel')).not.toBeVisible()

    // 3. Reopen library panel
    await openLibraryPanel(page)

    // 4. Assert all 6 cards are still visible (state not corrupted)
    const cards = page.locator('[data-testid^="scenario-card-"]')
    await expect(cards).toHaveCount(6)
  })
})
