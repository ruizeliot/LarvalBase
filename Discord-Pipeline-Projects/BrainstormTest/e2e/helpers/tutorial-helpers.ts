import { type Page } from '@playwright/test'

const TUTORIAL_PROGRESS_KEY = 'cascadesim-tutorial-progress'
const OLD_TUTORIAL_KEY = 'cascadesim-tutorial-complete'

/**
 * Clear all tutorial-related localStorage and reload.
 */
export async function clearTutorialProgress(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('cascadesim-tutorial-progress')
    localStorage.removeItem('cascadesim-tutorial-complete')
  })
  await page.reload()
  await page.waitForTimeout(500)
}

/**
 * Set specific phases as complete in localStorage, then reload.
 */
export async function setTutorialPhaseComplete(page: Page, ...phases: number[]) {
  await page.evaluate((phases) => {
    const STEP_COUNTS: Record<number, number> = { 1: 5, 2: 4, 3: 4, 4: 5 }
    const raw = localStorage.getItem('cascadesim-tutorial-progress')
    const progress = raw ? JSON.parse(raw) : {
      phase1: { status: 'available', stepsCompleted: [] },
      phase2: { status: 'locked', stepsCompleted: [] },
      phase3: { status: 'locked', stepsCompleted: [] },
      phase4: { status: 'locked', stepsCompleted: [] },
      welcomeSeen: true,
    }

    for (const phase of phases) {
      const key = `phase${phase}`
      const stepCount = STEP_COUNTS[phase] ?? 5
      progress[key] = {
        status: 'complete',
        stepsCompleted: Array.from({ length: stepCount }, (_, i) => i + 1),
      }
    }

    // Unlock next phases
    for (let i = 2; i <= 4; i++) {
      const prevKey = `phase${i - 1}`
      const currKey = `phase${i}`
      if (progress[prevKey].status === 'complete' && progress[currKey].status === 'locked') {
        progress[currKey].status = 'available'
      }
    }

    progress.welcomeSeen = true
    localStorage.setItem('cascadesim-tutorial-progress', JSON.stringify(progress))
  }, phases)
  await page.reload()
  await page.waitForTimeout(500)
}

/**
 * Set all 4 phases as complete.
 */
export async function setAllPhasesComplete(page: Page) {
  await setTutorialPhaseComplete(page, 1, 2, 3, 4)
}

/**
 * Set a phase as in-progress with specific steps completed.
 */
export async function setPhaseInProgress(page: Page, phase: number, stepsCompleted: number[]) {
  await page.evaluate(({ phase, stepsCompleted }) => {
    const raw = localStorage.getItem('cascadesim-tutorial-progress')
    const progress = raw ? JSON.parse(raw) : {
      phase1: { status: 'available', stepsCompleted: [] },
      phase2: { status: 'locked', stepsCompleted: [] },
      phase3: { status: 'locked', stepsCompleted: [] },
      phase4: { status: 'locked', stepsCompleted: [] },
      welcomeSeen: true,
    }

    const key = `phase${phase}`
    progress[key] = { status: 'in-progress', stepsCompleted }

    // Mark previous phases as complete if needed
    for (let i = 1; i < phase; i++) {
      const prevKey = `phase${i}`
      const STEP_COUNTS: Record<number, number> = { 1: 5, 2: 4, 3: 4, 4: 5 }
      if (progress[prevKey].status !== 'complete') {
        const stepCount = STEP_COUNTS[i] ?? 5
        progress[prevKey] = {
          status: 'complete',
          stepsCompleted: Array.from({ length: stepCount }, (_, j) => j + 1),
        }
      }
    }

    // Unlock this phase if locked
    if (progress[key].status === 'locked') {
      progress[key].status = 'in-progress'
    }

    progress.welcomeSeen = true
    localStorage.setItem('cascadesim-tutorial-progress', JSON.stringify(progress))
  }, { phase, stepsCompleted })
  await page.reload()
  await page.waitForTimeout(500)
}

/**
 * Open the tutorial menu by clicking the "?" help button.
 */
export async function openTutorialMenu(page: Page) {
  await page.locator('[data-testid="help-button"]').click()
  await page.waitForSelector('[data-testid="tutorial-menu"]', { timeout: 3000 })
}

/**
 * Start a specific tutorial phase from the menu.
 */
export async function startTutorialPhase(page: Page, phaseNumber: number) {
  await openTutorialMenu(page)
  await page.locator(`[data-testid="tutorial-phase-${phaseNumber}"]`).click()
  await page.waitForSelector('.driver-popover', { timeout: 5000 })
}

/**
 * Skip the current tutorial step via the "Skip Step" link.
 */
export async function skipTutorialStep(page: Page) {
  await page.locator('[data-testid="tutorial-skip-action"]').click()
  await page.waitForTimeout(300)
}

/**
 * Dismiss the tutorial by pressing Escape.
 */
export async function dismissTutorial(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
}

/**
 * Dismiss the welcome overlay if it appears.
 * Sets welcomeSeen to skip it, then reloads.
 */
export async function skipWelcomeOverlay(page: Page) {
  await page.evaluate(() => {
    const raw = localStorage.getItem('cascadesim-tutorial-progress')
    const progress = raw ? JSON.parse(raw) : {
      phase1: { status: 'available', stepsCompleted: [] },
      phase2: { status: 'locked', stepsCompleted: [] },
      phase3: { status: 'locked', stepsCompleted: [] },
      phase4: { status: 'locked', stepsCompleted: [] },
      welcomeSeen: false,
    }
    progress.welcomeSeen = true
    localStorage.setItem('cascadesim-tutorial-progress', JSON.stringify(progress))
  })
  await page.reload()
  await page.waitForTimeout(500)
}
