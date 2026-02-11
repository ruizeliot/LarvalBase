import { test, expect } from '@playwright/test'
import {
  setTutorialPhaseComplete,
  setPhaseInProgress,
  skipWelcomeOverlay,
  startTutorialPhase,
  skipTutorialStep,
  openTutorialMenu,
} from './helpers/tutorial-helpers'

test.describe('E11 US-11.6: Tutorial State Persistence & Resume', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await skipWelcomeOverlay(page)
  })

  // TC-11.6.1: Mid-phase progress is saved when tutorial is dismissed
  test('mid-phase progress saved on dismiss', async ({ page }) => {
    await startTutorialPhase(page, 1)

    // Skip 3 steps
    for (let i = 0; i < 3; i++) {
      await skipTutorialStep(page)
    }

    // Dismiss tutorial with Esc
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Read localStorage
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })

    expect(progress.phase1.status).toBe('in-progress')
    expect(progress.phase1.stepsCompleted).toEqual([1, 2, 3])
  })

  // TC-11.6.2: Resume button appears for in-progress phase
  test('resume button appears for in-progress phase', async ({ page }) => {
    await setPhaseInProgress(page, 1, [1, 2, 3])

    await openTutorialMenu(page)

    const resumeLabel = page.locator('[data-testid="phase-1-resume-label"]')
    await expect(resumeLabel).toBeVisible()
    await expect(resumeLabel).toContainText('Resume')
    await expect(resumeLabel).toContainText('Step 4 of 5')
  })

  // TC-11.6.3: Clicking Resume starts from next incomplete step
  test('clicking Resume starts from next incomplete step', async ({ page }) => {
    await setPhaseInProgress(page, 1, [1, 2, 3])

    // Click Phase 1 in the menu — calls resumePhase since in-progress
    await startTutorialPhase(page, 1)

    // Step counter shows Step 4 of 5
    const stepCounter = page.locator('[data-testid="step-counter"]')
    await expect(stepCounter).toContainText('Step 4 of 5')

    // First 3 progress dots should be filled (completed)
    const dots = page.locator('[data-testid="progress-dots"] span')
    const count = await dots.count()
    expect(count).toBe(5)
  })

  // TC-11.6.4: Completed phase shows Replay that restarts from step 1
  test('completed phase shows Replay that restarts from step 1', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)

    await openTutorialMenu(page)

    // Phase 1 shows replay icon
    await expect(page.locator('[data-testid="phase-1-replay-icon"]')).toBeVisible()

    // Click Phase 1 (calls replayPhase since complete)
    await page.locator('[data-testid="tutorial-phase-1"]').click()
    await page.waitForSelector('.driver-popover', { timeout: 5000 })

    // Step counter shows Step 1 of 5
    const stepCounter = page.locator('[data-testid="step-counter"]')
    await expect(stepCounter).toContainText('Step 1 of 5')
  })

  // TC-11.6.5: Reset Tutorial clears all progress with confirmation
  test('Reset Tutorial clears all progress with confirmation', async ({ page }) => {
    await setPhaseInProgress(page, 4, [1, 2])

    await openTutorialMenu(page)

    // Reset button visible
    await expect(page.locator('[data-testid="reset-tutorial"]')).toBeVisible()

    // Click Reset — dismiss the confirm dialog (Cancel)
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.dismiss()
    })
    await page.locator('[data-testid="reset-tutorial"]').click()
    await page.waitForTimeout(300)

    // Nothing changed — Phase 1 still complete
    await expect(page.locator('[data-testid="phase-1-complete-icon"]')).toBeVisible()

    // Click Reset again — accept the confirm dialog
    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })
    await page.locator('[data-testid="reset-tutorial"]').click()
    await page.waitForTimeout(300)

    // All phases reset — progress shows 0 of 4
    await expect(page.locator('[data-testid="tutorial-progress-text"]')).toContainText('0 of 4')

    // Phase 1 no longer complete
    await expect(page.locator('[data-testid="phase-1-complete-icon"]')).not.toBeVisible()

    // Phases 2-4 locked
    for (let i = 2; i <= 4; i++) {
      await expect(page.locator(`[data-testid="phase-${i}-lock-icon"]`)).toBeVisible()
    }

    // localStorage cleared
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })
    expect(progress.phase1.status).toBe('available')
    expect(progress.phase2.status).toBe('locked')
  })

  // TC-11.6.6: Progress survives page reload
  test('progress survives page reload', async ({ page }) => {
    await startTutorialPhase(page, 1)

    // Skip 2 steps
    await skipTutorialStep(page)
    await skipTutorialStep(page)

    // Dismiss
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Reload page
    await page.reload()
    await page.waitForTimeout(500)

    // Open tutorial menu
    await openTutorialMenu(page)

    // Phase 1 shows Resume (Step 3 of 5)
    const resumeLabel = page.locator('[data-testid="phase-1-resume-label"]')
    await expect(resumeLabel).toContainText('Resume')
    await expect(resumeLabel).toContainText('Step 3 of 5')
  })

  // TC-11.6.7: Dismiss mid-step — action not completed
  test('dismiss mid-step preserves incomplete step', async ({ page }) => {
    // Set Phase 1 in-progress with step 1 complete
    await setPhaseInProgress(page, 1, [1])

    // Resume Phase 1 — goes to step 2 (0-based: 1)
    await startTutorialPhase(page, 1)

    const stepCounter = page.locator('[data-testid="step-counter"]')
    await expect(stepCounter).toContainText('Step 2 of 5')

    // Don't complete the action — just dismiss
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // Step 2 should NOT be in stepsCompleted
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })

    expect(progress.phase1.stepsCompleted).toEqual([1])
    expect(progress.phase1.stepsCompleted).not.toContain(2)

    // Resume again — should still be at step 2
    await startTutorialPhase(page, 1)
    await expect(stepCounter).toContainText('Step 2 of 5')
  })

  // TC-11.6.8: Browser close and reopen preserves progress
  test('browser close and reopen preserves progress', async ({ page, context }) => {
    // Start Phase 1 and skip 4 steps
    await startTutorialPhase(page, 1)
    await skipTutorialStep(page)
    await skipTutorialStep(page)
    await skipTutorialStep(page)
    await skipTutorialStep(page)

    // Dismiss
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // "Close browser" — close this page, open new one in same context
    const newPage = await context.newPage()
    await page.close()

    // "Reopen browser" — navigate (localStorage is shared within context)
    await newPage.goto('/')
    await newPage.waitForTimeout(500)

    // Open tutorial menu
    await newPage.evaluate(() => {
      const btn = document.querySelector('[data-testid="help-button"]') as HTMLButtonElement
      if (btn) btn.click()
    })
    await newPage.waitForSelector('[data-testid="tutorial-menu"]', { timeout: 3000 })

    // Phase 1 shows Resume (Step 5 of 5)
    const resumeLabel = newPage.locator('[data-testid="phase-1-resume-label"]')
    await expect(resumeLabel).toContainText('Resume')
    await expect(resumeLabel).toContainText('Step 5 of 5')
  })
})
