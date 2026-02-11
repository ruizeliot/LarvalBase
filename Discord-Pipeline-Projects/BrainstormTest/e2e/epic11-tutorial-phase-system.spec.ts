import { test, expect } from '@playwright/test'
import {
  clearTutorialProgress,
  setTutorialPhaseComplete,
  setAllPhasesComplete,
  setPhaseInProgress,
  openTutorialMenu,
  skipWelcomeOverlay,
} from './helpers/tutorial-helpers'

test.describe('E11 US-11.1: Tutorial Phase System & Progress UI', () => {

  test.beforeEach(async ({ page }) => {
    // Set welcomeSeen to skip auto-open overlay
    await page.goto('/')
    await skipWelcomeOverlay(page)
  })

  // TC-11.1.1: Help button opens tutorial menu with 4 phases
  test('help button opens tutorial menu with 4 phases', async ({ page }) => {
    await expect(page.locator('[data-testid="help-button"]')).toBeVisible()
    await openTutorialMenu(page)
    const menu = page.locator('[data-testid="tutorial-menu"]')
    await expect(menu).toBeVisible()

    // 4 phase cards
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator(`[data-testid="tutorial-phase-${i}"]`)).toBeVisible()
    }

    // Card titles
    await expect(page.locator('[data-testid="phase-1-title"]')).toHaveText('Solo Basics')
    await expect(page.locator('[data-testid="phase-2-title"]')).toHaveText('Advanced Modeling')
    await expect(page.locator('[data-testid="phase-3-title"]')).toHaveText('Reading Results')
    await expect(page.locator('[data-testid="phase-4-title"]')).toHaveText('Collaboration')
  })

  // TC-11.1.2: Phase 1 is unlocked by default, Phases 2-4 are locked
  test('Phase 1 is unlocked, Phases 2-4 are locked by default', async ({ page }) => {
    await clearTutorialProgress(page)
    await skipWelcomeOverlay(page)
    await openTutorialMenu(page)

    // Phase 1 available
    const phase1 = page.locator('[data-testid="tutorial-phase-1"]')
    await expect(phase1).toHaveAttribute('data-phase-status', 'available')
    await expect(page.locator('[data-testid="phase-1-lock-icon"]')).not.toBeVisible()

    // Phases 2-4 locked
    for (let i = 2; i <= 4; i++) {
      const phase = page.locator(`[data-testid="tutorial-phase-${i}"]`)
      await expect(phase).toHaveAttribute('data-phase-status', 'locked')
      await expect(page.locator(`[data-testid="phase-${i}-lock-icon"]`)).toBeVisible()
    }

    // Click Phase 2 — should be disabled/non-clickable
    await page.locator('[data-testid="tutorial-phase-2"]').click({ force: true })
    await expect(page.locator('.driver-popover')).not.toBeVisible()

    // Click Phase 1 — should start the tutorial
    await page.locator('[data-testid="tutorial-phase-1"]').click()
    await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.1.3: Completing Phase 1 unlocks Phase 2
  test('completing Phase 1 unlocks Phase 2', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)
    await openTutorialMenu(page)

    await expect(page.locator('[data-testid="tutorial-phase-1"]')).toHaveAttribute('data-phase-status', 'complete')
    await expect(page.locator('[data-testid="phase-1-complete-icon"]')).toBeVisible()

    await expect(page.locator('[data-testid="tutorial-phase-2"]')).toHaveAttribute('data-phase-status', 'available')
    await expect(page.locator('[data-testid="phase-2-lock-icon"]')).not.toBeVisible()

    // Phase 3 and 4 still locked
    await expect(page.locator('[data-testid="tutorial-phase-3"]')).toHaveAttribute('data-phase-status', 'locked')
    await expect(page.locator('[data-testid="tutorial-phase-4"]')).toHaveAttribute('data-phase-status', 'locked')
  })

  // TC-11.1.4: Sequential unlocking — Phase N requires Phase N-1 complete
  test('sequential unlocking — Phase N requires Phase N-1 complete', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2)
    await openTutorialMenu(page)

    await expect(page.locator('[data-testid="tutorial-phase-1"]')).toHaveAttribute('data-phase-status', 'complete')
    await expect(page.locator('[data-testid="tutorial-phase-2"]')).toHaveAttribute('data-phase-status', 'complete')
    await expect(page.locator('[data-testid="tutorial-phase-3"]')).toHaveAttribute('data-phase-status', 'available')
    await expect(page.locator('[data-testid="tutorial-phase-4"]')).toHaveAttribute('data-phase-status', 'locked')

    // Close menu, set Phase 3 complete, reopen
    await page.keyboard.press('Escape')
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await openTutorialMenu(page)

    await expect(page.locator('[data-testid="tutorial-phase-4"]')).toHaveAttribute('data-phase-status', 'available')
  })

  // TC-11.1.5: Progress bar shows overall completion
  test('progress bar shows overall completion', async ({ page }) => {
    await clearTutorialProgress(page)
    await skipWelcomeOverlay(page)
    await openTutorialMenu(page)

    await expect(page.locator('[data-testid="tutorial-progress-text"]')).toContainText('0 of 4 phases complete')

    // Close, set 1 complete, reopen
    await page.keyboard.press('Escape')
    await setTutorialPhaseComplete(page, 1)
    await openTutorialMenu(page)
    await expect(page.locator('[data-testid="tutorial-progress-text"]')).toContainText('1 of 4 phases complete')

    // Set 1-3 complete
    await page.keyboard.press('Escape')
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await openTutorialMenu(page)
    await expect(page.locator('[data-testid="tutorial-progress-text"]')).toContainText('3 of 4 phases complete')

    // All 4 complete
    await page.keyboard.press('Escape')
    await setAllPhasesComplete(page)
    await openTutorialMenu(page)
    await expect(page.locator('[data-testid="tutorial-progress-text"]')).toContainText('4 of 4 phases complete')
  })

  // TC-11.1.6: Completed phases show checkmark and can be replayed
  test('completed phases show checkmark and replay button', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)
    await openTutorialMenu(page)

    // Phase 1 has checkmark
    await expect(page.locator('[data-testid="phase-1-complete-icon"]')).toBeVisible()
    // Phase 1 has replay icon
    await expect(page.locator('[data-testid="phase-1-replay-icon"]')).toBeVisible()

    // Click Phase 1 to replay — should start Driver.js tour
    await page.locator('[data-testid="tutorial-phase-1"]').click()
    await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.1.7: Progress persists in localStorage
  test('progress persists in localStorage after reload', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)

    // Reload the page
    await page.reload()
    await page.waitForTimeout(500)

    await openTutorialMenu(page)
    await expect(page.locator('[data-testid="tutorial-phase-1"]')).toHaveAttribute('data-phase-status', 'complete')
    await expect(page.locator('[data-testid="tutorial-phase-2"]')).toHaveAttribute('data-phase-status', 'available')

    // Verify localStorage key exists
    const hasKey = await page.evaluate(() => {
      return localStorage.getItem('cascadesim-tutorial-progress') !== null
    })
    expect(hasKey).toBe(true)
  })

  // TC-11.1.8: First visit auto-opens tutorial menu with Phase 1 highlighted
  test('first visit shows welcome overlay leading to tutorial', async ({ page }) => {
    await clearTutorialProgress(page)
    await page.goto('/')

    // Wait for welcome overlay
    await expect(page.locator('[data-testid="welcome-overlay"]')).toBeVisible({ timeout: 3000 })

    // Click "Start Tutorial"
    await page.locator('[data-testid="start-tutorial-button"]').click()
    await expect(page.locator('[data-testid="welcome-overlay"]')).not.toBeVisible()

    // Driver.js popover should appear (Phase 1 starts)
    await expect(page.locator('.driver-popover')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.1.9: Close and reopen tutorial menu preserves state
  test('close and reopen tutorial menu preserves state', async ({ page }) => {
    await setPhaseInProgress(page, 1, [1, 2])
    await openTutorialMenu(page)

    // Phase 1 should show in-progress
    await expect(page.locator('[data-testid="tutorial-phase-1"]')).toHaveAttribute('data-phase-status', 'in-progress')

    // Close menu
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="tutorial-menu"]')).not.toBeVisible()

    // Reopen
    await openTutorialMenu(page)
    await expect(page.locator('[data-testid="tutorial-phase-1"]')).toHaveAttribute('data-phase-status', 'in-progress')
  })

  // TC-11.1.10: Step count displayed correctly per phase
  test('step count displayed correctly per phase', async ({ page }) => {
    await openTutorialMenu(page)

    // Each phase card should show step count
    const phase1Text = await page.locator('[data-testid="tutorial-phase-1"]').textContent()
    const phase2Text = await page.locator('[data-testid="tutorial-phase-2"]').textContent()
    const phase3Text = await page.locator('[data-testid="tutorial-phase-3"]').textContent()
    const phase4Text = await page.locator('[data-testid="tutorial-phase-4"]').textContent()

    expect(phase1Text).toContain('5 steps')
    expect(phase2Text).toContain('4 steps')
    expect(phase3Text).toContain('4 steps')
    expect(phase4Text).toContain('5 steps')
  })
})
