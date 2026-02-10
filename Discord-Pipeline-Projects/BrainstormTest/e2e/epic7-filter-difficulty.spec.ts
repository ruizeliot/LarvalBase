import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

test.describe('Epic 7 - US-7.3: Filter Scenarios by Difficulty', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-7.3.1: Filter chips are displayed with "All" selected by default', async ({ page }) => {
    await openLibraryPanel(page)

    // Assert filter chips are visible
    await expect(page.getByTestId('filter-all')).toBeVisible()
    await expect(page.getByTestId('filter-beginner')).toBeVisible()
    await expect(page.getByTestId('filter-intermediate')).toBeVisible()
    await expect(page.getByTestId('filter-advanced')).toBeVisible()
    await expect(page.getByTestId('filter-expert')).toBeVisible()

    // Assert "All" chip is highlighted (active state — has primary bg)
    await expect(page.getByTestId('filter-all')).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Assert 6 scenario cards are visible
    const cards = page.locator('[data-testid^="scenario-card-"]')
    await expect(cards).toHaveCount(6)
  })

  test('TC-7.3.2: Clicking "Beginner" shows only beginner scenarios', async ({ page }) => {
    await openLibraryPanel(page)

    // Click "Beginner" filter chip
    await page.getByTestId('filter-beginner').click()

    // Assert "Beginner" chip is highlighted
    await expect(page.getByTestId('filter-beginner')).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Assert "All" chip is no longer highlighted
    await expect(page.getByTestId('filter-all')).not.toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Assert exactly 2 cards are visible
    const cards = page.locator('[data-testid^="scenario-card-"]')
    await expect(cards).toHaveCount(2)

    // Assert both cards have "Beginner" difficulty badge
    for (let i = 0; i < 2; i++) {
      await expect(cards.nth(i).locator('[data-testid="card-difficulty"]')).toHaveText('Beginner')
    }
  })

  test('TC-7.3.3: Clicking "Expert" shows only expert scenarios', async ({ page }) => {
    await openLibraryPanel(page)

    await page.getByTestId('filter-expert').click()

    // Assert exactly 2 cards are visible
    const cards = page.locator('[data-testid^="scenario-card-"]')
    await expect(cards).toHaveCount(2)

    // Assert both cards have "Expert" difficulty badge
    for (let i = 0; i < 2; i++) {
      await expect(cards.nth(i).locator('[data-testid="card-difficulty"]')).toHaveText('Expert')
    }
  })

  test('TC-7.3.4: Clicking "Intermediate" shows only 1 scenario', async ({ page }) => {
    await openLibraryPanel(page)

    await page.getByTestId('filter-intermediate').click()

    // Assert exactly 1 card is visible
    const cards = page.locator('[data-testid^="scenario-card-"]')
    await expect(cards).toHaveCount(1)

    // Assert card title is "Supply Chain Disruption"
    await expect(cards.first().locator('[data-testid="card-title"]')).toHaveText('Supply Chain Disruption')
  })

  test('TC-7.3.5: Clicking "All" resets the filter', async ({ page }) => {
    await openLibraryPanel(page)

    // Click "Beginner" — assert 2 cards
    await page.getByTestId('filter-beginner').click()
    await expect(page.locator('[data-testid^="scenario-card-"]')).toHaveCount(2)

    // Click "All"
    await page.getByTestId('filter-all').click()

    // Assert "All" chip is highlighted
    await expect(page.getByTestId('filter-all')).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Assert 6 cards are visible
    await expect(page.locator('[data-testid^="scenario-card-"]')).toHaveCount(6)
  })

  test('TC-7.3.6: Rapid filter switching', async ({ page }) => {
    await openLibraryPanel(page)

    // Rapid clicks: Beginner, then Expert, then All
    await page.getByTestId('filter-beginner').click()
    await page.getByTestId('filter-expert').click()
    await page.getByTestId('filter-all').click()

    // Assert final state shows 6 cards with "All" highlighted
    await expect(page.locator('[data-testid^="scenario-card-"]')).toHaveCount(6)
    await expect(page.getByTestId('filter-all')).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Assert no duplicate cards (each unique scenario id)
    const cards = page.locator('[data-testid^="scenario-card-"]')
    const count = await cards.count()
    const ids = new Set<string>()
    for (let i = 0; i < count; i++) {
      const testid = await cards.nth(i).getAttribute('data-testid')
      ids.add(testid!)
    }
    expect(ids.size).toBe(6)
  })
})
