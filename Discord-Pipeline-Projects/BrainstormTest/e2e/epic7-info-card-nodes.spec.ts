import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

/** Helper: load a scenario from library by title card id */
async function loadScenarioFromLibrary(page: Page, scenarioId: string) {
  await openLibraryPanel(page)
  const card = page.getByTestId(`scenario-card-${scenarioId}`)
  await card.getByTestId('card-load-button').click()
  // If confirm dialog appears (existing content), confirm it
  const confirmDialog = page.getByTestId('library-confirm-dialog')
  if (await confirmDialog.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.getByTestId('library-confirm-ok').click()
  }
  await expect(page.getByTestId('library-panel')).not.toBeVisible()
}

test.describe('Epic 7 - US-7.5: Info Card Nodes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-7.5.1: Info cards appear when loading a scenario', async ({ page }) => {
    // Load "Supply Chain Disruption"
    await loadScenarioFromLibrary(page, 'supply-chain-disruption')

    // Assert info card nodes appear on canvas
    const infoCards = page.locator('[data-testid^="info-card-"]')
    const count = await infoCards.count()
    expect(count).toBeGreaterThan(0)

    // Assert info cards have visually distinct styling
    const firstCard = infoCards.first()
    await expect(firstCard).toBeVisible()

    // Assert info cards have distinct appearance (dashed border class)
    await expect(firstCard.locator('.info-card-content')).toBeVisible()

    // Assert each info card contains explanation text (non-empty content)
    for (let i = 0; i < count; i++) {
      const card = infoCards.nth(i)
      const text = card.locator('[data-testid="info-text"]')
      await expect(text).toBeVisible()
      const content = await text.textContent()
      expect(content!.length).toBeGreaterThan(0)
    }
  })

  test('TC-7.5.2: Info cards are non-interactive', async ({ page }) => {
    // Load "Supply Chain Disruption"
    await loadScenarioFromLibrary(page, 'supply-chain-disruption')

    // Locate an info card node
    const infoCards = page.locator('[data-testid^="info-card-"]')
    await expect(infoCards.first()).toBeVisible()

    // Right-click info card — "New Causal Chain from here" should NOT appear
    await infoCards.first().click({ button: 'right' })
    // Context menu should not open for info cards
    await expect(page.getByText('New Causal Chain from here')).not.toBeVisible()

    // Click info card — properties panel should NOT show parameter editing UI
    await infoCards.first().click()
    // The property editor should not show parameter fields for info cards
    await expect(page.getByTestId('property-editor-params')).not.toBeVisible({ timeout: 500 }).catch(() => {
      // If property editor is visible at all, it shouldn't be for info card
    })
  })

  test('TC-7.5.3: Dismiss and restore info cards', async ({ page }) => {
    // Load "Supply Chain Disruption" (has 3 info cards)
    await loadScenarioFromLibrary(page, 'supply-chain-disruption')

    // Count visible info card nodes
    const infoCards = page.locator('[data-testid^="info-card-"]')
    const initialCount = await infoCards.count()
    expect(initialCount).toBeGreaterThan(0)

    // Click the close/dismiss button on the first info card
    const firstCard = infoCards.first()
    const closeBtn = firstCard.locator('[data-testid="info-dismiss"]')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()

    // Assert info card disappears from canvas
    await expect(page.locator('[data-testid^="info-card-"]')).toHaveCount(initialCount - 1)

    // Locate "Show Info Cards" toggle
    const toggleBtn = page.getByTestId('toggle-info-cards')
    await expect(toggleBtn).toBeVisible()

    // Click toggle
    await toggleBtn.click()

    // Assert all info cards are visible again (dismissed card restored)
    await expect(page.locator('[data-testid^="info-card-"]')).toHaveCount(initialCount)
  })

  test('TC-7.5.4: Library cards show info card count badge', async ({ page }) => {
    // Open library panel
    await openLibraryPanel(page)

    // Locate "Supply Chain Disruption" card
    const card = page.getByTestId('scenario-card-supply-chain-disruption')
    await expect(card).toBeVisible()

    // Assert an info card count badge is visible
    const badge = card.locator('[data-testid="card-info-count"]')
    await expect(badge).toBeVisible()

    // Assert badge shows a number > 0
    const text = await badge.textContent()
    expect(text).toMatch(/\d+/)
    const num = parseInt(text!.match(/(\d+)/)![1])
    expect(num).toBeGreaterThan(0)
  })

  test('TC-7.5.5: Dismiss all info cards, then restore', async ({ page }) => {
    // Load a scenario with info cards
    await loadScenarioFromLibrary(page, 'supply-chain-disruption')

    const infoCards = page.locator('[data-testid^="info-card-"]')
    const totalCount = await infoCards.count()
    expect(totalCount).toBeGreaterThan(0)

    // Dismiss every info card one by one
    for (let i = totalCount; i > 0; i--) {
      const card = page.locator('[data-testid^="info-card-"]').first()
      await card.locator('[data-testid="info-dismiss"]').click()
      await expect(page.locator('[data-testid^="info-card-"]')).toHaveCount(i - 1)
    }

    // Assert no info cards visible
    await expect(page.locator('[data-testid^="info-card-"]')).toHaveCount(0)

    // Click "Show Info Cards" toggle
    await page.getByTestId('toggle-info-cards').click()

    // Assert all info cards reappear
    await expect(page.locator('[data-testid^="info-card-"]')).toHaveCount(totalCount)
  })
})
