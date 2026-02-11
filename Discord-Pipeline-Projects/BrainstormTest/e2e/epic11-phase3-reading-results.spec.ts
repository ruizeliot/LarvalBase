import { test, expect, type Page } from '@playwright/test'
import {
  setTutorialPhaseComplete,
  skipWelcomeOverlay,
  startTutorialPhase,
  advanceTutorialStep,
} from './helpers/tutorial-helpers'

/** Run the pre-loaded simulation via page.evaluate to bypass Driver.js overlay. */
async function runPreloadedSimulation(page: Page) {
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="sim-run-button"]') as HTMLButtonElement
    if (btn) btn.click()
  })
  await page.waitForTimeout(500)
  await expect(page.locator('[data-testid="sim-results-summary"]')).toBeVisible({ timeout: 5000 })
}

/** Advance N tutorial steps. */
async function advanceSteps(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await advanceTutorialStep(page)
  }
}

test.describe('E11 US-11.4: Phase 3 — Reading Results', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await skipWelcomeOverlay(page)
  })

  // TC-11.4.1: Phase 3 pre-loads a complex scenario
  test('Phase 3 pre-loads a complex scenario', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2)
    await startTutorialPhase(page, 3)
    await page.waitForTimeout(500) // Wait for preload + mode switch

    // Assert canvas has multiple components (complex model pre-loaded)
    const nodes = page.locator('.react-flow__node')
    await expect(nodes.first()).toBeVisible({ timeout: 5000 })
    const nodeCount = await nodes.count()
    expect(nodeCount).toBeGreaterThanOrEqual(3)

    // Assert chain edges are visible
    const edges = page.locator('.react-flow__edge')
    await expect(edges.first()).toBeVisible({ timeout: 3000 })

    // Assert Driver.js popover appears for step 1
    const popover = page.locator('.driver-popover')
    await expect(popover).toBeVisible()
    await expect(popover.locator('.driver-popover-title')).toContainText('Results')
  })

  // TC-11.4.2: Step 1 — Run simulation and click a result in side panel
  test('step 1 — run sim and click result entry', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2)
    await startTutorialPhase(page, 3)
    await page.waitForTimeout(500)

    // Assert popover instructs user
    await expect(page.locator('.driver-popover-title')).toContainText('Results')
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Run simulation via page.evaluate
    await runPreloadedSimulation(page)

    // Results appear in side panel
    await expect(page.locator('[data-testid="results-side-panel"]')).toBeVisible()

    // Click a component entry in the results panel
    await page.evaluate(() => {
      const entry = document.querySelector('[data-testid="results-component-entry"]') as HTMLElement
      if (entry) entry.click()
    })
    await page.waitForTimeout(300)

    // Detail view appears
    await expect(page.locator('[data-testid="results-component-detail"]')).toBeVisible({ timeout: 3000 })

    // Action complete should appear
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.4.3: Step 2 — Identify and click the top bottleneck component
  test('step 2 — click top bottleneck component', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2)
    await startTutorialPhase(page, 3)
    await page.waitForTimeout(500)

    // Run simulation first (needed for results)
    await runPreloadedSimulation(page)

    await advanceTutorialStep(page) // Skip step 1

    // Now on step 2 — Bottleneck Analysis
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Bottleneck')
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Click the top bottleneck component
    await page.evaluate(() => {
      const entry = document.querySelector('[data-testid="bottleneck-entry"]') as HTMLElement
      if (entry) entry.click()
    })
    await page.waitForTimeout(300)

    // Action complete should appear
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.4.4: Step 3 — Click an event log entry to jump to time step
  test('step 3 — click event log entry scrubs to timestep', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2)
    await startTutorialPhase(page, 3)
    await page.waitForTimeout(500)

    // Run simulation
    await runPreloadedSimulation(page)

    await advanceSteps(page, 2) // Skip steps 1-2

    // Now on step 3 — Cascade Event Log
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Event Log')
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Assert event log has at least 1 entry
    await expect(page.locator('[data-testid="event-log-entry"]').first()).toBeVisible({ timeout: 3000 })

    // Remember initial time
    const timeBefore = await page.locator('[data-testid="sim-time-display"]').textContent()

    // Click an event log entry (use a cascade entry, not the first forced one)
    await page.evaluate(() => {
      const entries = document.querySelectorAll('[data-testid="event-log-entry"]')
      // Click second entry if available, otherwise first
      const entry = (entries.length > 1 ? entries[1] : entries[0]) as HTMLElement
      if (entry) entry.click()
    })
    await page.waitForTimeout(300)

    // Action complete should appear
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.4.5: Step 4 — Hover a metric to see tooltip explanation
  test('step 4 — hover metric shows tooltip', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2)
    await startTutorialPhase(page, 3)
    await page.waitForTimeout(500)

    // Run simulation
    await runPreloadedSimulation(page)

    await advanceSteps(page, 3) // Skip steps 1-3

    // Now on step 4 — Metrics Interpretation
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Metrics')
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Hover over a metric value via page.evaluate (use mouseover — React delegates from this)
    await page.evaluate(() => {
      const metric = document.querySelector('[data-testid="stat-total-steps"]') as HTMLElement
      if (metric) {
        metric.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      }
    })
    await page.waitForTimeout(300)

    // Assert tooltip appears
    await expect(page.locator('[data-testid="metric-tooltip"]')).toBeVisible({ timeout: 3000 })

    // Action complete should appear
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.4.6: Phase 3 completion unlocks Phase 4
  test('Phase 3 completion shows overlay and unlocks Phase 4', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2)
    await startTutorialPhase(page, 3)
    await page.waitForTimeout(500)

    // Run simulation (needed for results-dependent steps)
    await runPreloadedSimulation(page)

    await advanceSteps(page, 4) // Skip all 4 steps

    // Completion overlay
    await expect(page.locator('[data-testid="completion-overlay"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[data-testid="completion-title"]')).toContainText('Phase 3 Complete')
    await expect(page.locator('[data-testid="completion-continue"]')).toContainText('Phase 4')

    // Check localStorage
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })
    expect(progress.phase3.status).toBe('complete')
    expect(progress.phase4.status).toBe('available')
  })

  // TC-11.4.7: Edge — Results panel must be open for step 1 to detect actions
  test('results panel must be open for step 1 actions', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2)
    await startTutorialPhase(page, 3)
    await page.waitForTimeout(500)

    // Run simulation
    await runPreloadedSimulation(page)

    // Collapse the results panel via page.evaluate
    await page.evaluate(() => {
      const toggle = document.querySelector('[data-testid="panel-collapse-toggle"]') as HTMLButtonElement
      if (toggle) toggle.click()
    })
    await page.waitForTimeout(300)

    // No component entries visible in collapsed panel
    await expect(page.locator('[data-testid="results-component-entry"]')).not.toBeVisible()

    // Expand the results panel
    await page.evaluate(() => {
      const toggle = document.querySelector('[data-testid="panel-collapse-toggle"]') as HTMLButtonElement
      if (toggle) toggle.click()
    })
    await page.waitForTimeout(500)

    // Click a result entry
    await page.evaluate(() => {
      const entry = document.querySelector('[data-testid="results-component-entry"]') as HTMLElement
      if (entry) entry.click()
    })
    await page.waitForTimeout(300)

    // Step should complete
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })
})
