import { test, expect, type Page } from '@playwright/test'

/** Helper: open the scenario library panel */
async function openLibraryPanel(page: Page) {
  await page.getByTestId('library-button').click()
  await expect(page.getByTestId('library-panel')).toBeVisible()
}

const SCENARIO_DIFFICULTIES: Record<string, string> = {
  'hello-cascade': 'Beginner',
  'branching-paths': 'Beginner',
  'supply-chain-disruption': 'Intermediate',
  'global-manufacturing-network': 'Advanced',
  'pandemic-stress-test': 'Expert',
  'feedback-loop-chaos': 'Expert',
}

const DIFFICULTY_DATA_ATTR: Record<string, string> = {
  'hello-cascade': 'beginner',
  'supply-chain-disruption': 'intermediate',
  'global-manufacturing-network': 'advanced',
  'pandemic-stress-test': 'expert',
}

test.describe('Epic 7 - US-7.2: Difficulty Badges & Color Coding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-7.2.1: Each scenario has the correct difficulty text', async ({ page }) => {
    await openLibraryPanel(page)

    for (const [id, difficulty] of Object.entries(SCENARIO_DIFFICULTIES)) {
      const card = page.getByTestId(`scenario-card-${id}`)
      await expect(card).toBeVisible()
      const badge = card.locator('[data-testid="card-difficulty"]')
      await expect(badge).toHaveText(difficulty)
    }
  })

  test('TC-7.2.2: Badges are color-coded correctly', async ({ page }) => {
    await openLibraryPanel(page)

    // Beginner (green) — Hello Cascade
    const helloBadge = page.getByTestId('scenario-card-hello-cascade').locator('[data-testid="card-difficulty"]')
    await expect(helloBadge).toHaveAttribute('data-difficulty', 'beginner')
    // Check for green color class
    await expect(helloBadge).toHaveClass(/text-green-400/)

    // Intermediate (blue) — Supply Chain Disruption
    const supplyBadge = page.getByTestId('scenario-card-supply-chain-disruption').locator('[data-testid="card-difficulty"]')
    await expect(supplyBadge).toHaveAttribute('data-difficulty', 'intermediate')
    await expect(supplyBadge).toHaveClass(/text-blue-400/)

    // Advanced (orange) — Global Manufacturing Network
    const globalBadge = page.getByTestId('scenario-card-global-manufacturing-network').locator('[data-testid="card-difficulty"]')
    await expect(globalBadge).toHaveAttribute('data-difficulty', 'advanced')
    await expect(globalBadge).toHaveClass(/text-orange-400/)

    // Expert (red) — Pandemic Stress Test
    const pandemicBadge = page.getByTestId('scenario-card-pandemic-stress-test').locator('[data-testid="card-difficulty"]')
    await expect(pandemicBadge).toHaveAttribute('data-difficulty', 'expert')
    await expect(pandemicBadge).toHaveClass(/text-red-400/)
  })

  test('TC-7.2.3: Difficulty distribution is correct', async ({ page }) => {
    await openLibraryPanel(page)

    // Count badges by text
    const beginnerBadges = page.locator('[data-testid="card-difficulty"]:text("Beginner")')
    await expect(beginnerBadges).toHaveCount(2)

    const intermediateBadges = page.locator('[data-testid="card-difficulty"]:text("Intermediate")')
    await expect(intermediateBadges).toHaveCount(1)

    const advancedBadges = page.locator('[data-testid="card-difficulty"]:text("Advanced")')
    await expect(advancedBadges).toHaveCount(1)

    const expertBadges = page.locator('[data-testid="card-difficulty"]:text("Expert")')
    await expect(expertBadges).toHaveCount(2)
  })
})
