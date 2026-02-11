import { test, expect, type Page } from '@playwright/test'
import {
  setTutorialPhaseComplete,
  skipWelcomeOverlay,
  startTutorialPhase,
  advanceTutorialStep,
  openTutorialMenu,
  clearTutorialProgress,
} from './helpers/tutorial-helpers'

/** Drag an Internal component from the palette onto the canvas. */
async function dragComponentToCanvas(page: Page, pos = { x: 400, y: 300 }) {
  const palette = page.getByTestId('palette-internal')
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: pos })
}

/** Set up a model with 2 components (needed for Phase 2 tests). */
async function setupTwoComponentModel(page: Page) {
  await dragComponentToCanvas(page, { x: 200, y: 250 })
  await page.waitForTimeout(300)
  await dragComponentToCanvas(page, { x: 500, y: 250 })
  await page.waitForTimeout(300)
}

/** Advance N tutorial steps. */
async function advanceSteps(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await advanceTutorialStep(page)
  }
}

test.describe('E11 US-11.3: Phase 2 — Advanced Modeling', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await skipWelcomeOverlay(page)
  })

  // TC-11.3.1: Phase 2 requires Phase 1 to be complete
  test('Phase 2 requires Phase 1 to be complete', async ({ page }) => {
    await clearTutorialProgress(page)
    await skipWelcomeOverlay(page)
    await openTutorialMenu(page)

    // Phase 2 should be locked
    await expect(page.locator('[data-testid="tutorial-phase-2"]')).toHaveAttribute('data-phase-status', 'locked')

    // Set Phase 1 complete
    await page.keyboard.press('Escape')
    await setTutorialPhaseComplete(page, 1)
    await openTutorialMenu(page)

    // Phase 2 should now be available
    await expect(page.locator('[data-testid="tutorial-phase-2"]')).toHaveAttribute('data-phase-status', 'available')
  })

  // TC-11.3.2: Phase 2 starts — Driver.js popover appears for step 1
  test('Phase 2 starts with Driver.js popover for branching chains', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)
    await setupTwoComponentModel(page)

    await startTutorialPhase(page, 2)

    const popover = page.locator('.driver-popover')
    await expect(popover).toBeVisible()
    await expect(popover.locator('.driver-popover-title')).toContainText('Branching')
    await expect(popover.locator('[data-testid="step-counter"]')).toContainText('Step 1 of 4')
  })

  // TC-11.3.3: Step 1 — Create a branching chain from same source
  test('step 1 — branching chain detects new chain', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)
    await setupTwoComponentModel(page)

    await startTutorialPhase(page, 2)

    // Action prompt visible
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Right-click first component to open context menu
    // Use evaluate to dispatch contextmenu on the node (bypasses Driver.js overlay)
    const node = page.locator('.react-flow__node').first()
    const box = await node.boundingBox()
    if (!box) throw new Error('Node bounding box not found')

    // Dispatch contextmenu event on the ReactFlow pane at the node's coordinates
    // ReactFlow intercepts contextmenu on its pane and delegates to onNodeContextMenu
    await page.evaluate(({ x, y }) => {
      // Find the actual node element under the overlay
      const nodeEl = document.querySelector('.react-flow__node')
      if (nodeEl) {
        nodeEl.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true, cancelable: true, clientX: x, clientY: y,
        }))
      }
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
    await page.waitForTimeout(500)

    // If context menu didn't appear via dispatchEvent, try force right-click
    const menuVisible = await page.getByTestId('context-menu-new-chain').isVisible().catch(() => false)
    if (!menuVisible) {
      await node.click({ button: 'right', force: true })
      await page.waitForTimeout(500)
    }

    await page.getByTestId('context-menu-new-chain').click()
    await expect(page.getByTestId('chain-builder')).toBeVisible({ timeout: 3000 })

    // Chain builder opening — close builder
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  })

  // TC-11.3.4: Step 2 — Edit parameters on a component
  test('step 2 — edit params detects parameter change', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)
    await setupTwoComponentModel(page)

    await startTutorialPhase(page, 2)
    await advanceTutorialStep(page) // Skip step 1

    // Now on step 2 — Edit Parameters
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Parameters')
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Select a component and add a parameter
    await page.locator('.react-flow__node').first().click({ force: true })
    await page.waitForTimeout(200)
    await page.getByTestId('add-parameter').click()
    const paramRow = page.locator('[data-testid="param-row"]').first()
    await paramRow.locator('input[placeholder="name"]').fill('temperature')
    await paramRow.locator('input[type="number"]').fill('42')

    // Action complete should appear
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.3.5: Step 3 — Click Re-Layout button triggers ELK layout
  test('step 3 — re-layout button triggers auto-layout', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)
    await setupTwoComponentModel(page)

    await startTutorialPhase(page, 2)
    await advanceSteps(page, 2) // Skip steps 1-2

    // Now on step 3 — Auto-Layout
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Auto-Layout')
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Click Re-Layout button — use evaluate to bypass overlay event capture
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="relayout-button"]') as HTMLButtonElement
      if (btn) btn.click()
    })

    // Action complete should appear (event dispatched before ELK async finishes)
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 5000 })
  })

  // TC-11.3.6: Step 4 — Open layout dropdown and select different direction
  test('step 4 — layout dropdown direction change detected', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)
    await setupTwoComponentModel(page)

    await startTutorialPhase(page, 2)
    await advanceSteps(page, 3) // Skip steps 1-3

    // Now on step 4 — Re-Layout Options
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Re-Layout Options')
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Open dropdown and select TB — use evaluate to bypass overlay
    await page.evaluate(() => {
      const toggle = document.querySelector('[data-testid="relayout-dropdown-toggle"]') as HTMLButtonElement
      if (toggle) toggle.click()
    })
    await page.waitForTimeout(300)
    await page.evaluate(() => {
      const option = document.querySelector('[data-testid="relayout-option-tb"]') as HTMLButtonElement
      if (option) option.click()
    })
    await page.waitForTimeout(500)

    // Action complete should appear
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.3.7: Phase 2 completion shows overlay and unlocks Phase 3
  test('Phase 2 completion shows overlay and unlocks Phase 3', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)

    await startTutorialPhase(page, 2)
    await advanceSteps(page, 4) // Skip all 4 steps

    // Completion overlay
    await expect(page.locator('[data-testid="completion-overlay"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[data-testid="completion-title"]')).toContainText('Phase 2 Complete')
    await expect(page.locator('[data-testid="completion-continue"]')).toContainText('Phase 3')

    // Check localStorage
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })
    expect(progress.phase2.status).toBe('complete')
    expect(progress.phase3.status).toBe('available')
  })

  // TC-11.3.8: Edge — Re-Layout handles single-node canvas
  test('re-layout handles single-node canvas without crash', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1)
    // Only one component
    await dragComponentToCanvas(page)
    await page.waitForTimeout(300)

    await startTutorialPhase(page, 2)
    await advanceSteps(page, 2) // Skip to step 3

    // Click Re-Layout — should not crash — use evaluate to bypass overlay
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="relayout-button"]') as HTMLButtonElement
      if (btn) btn.click()
    })

    // No error, canvas still functional
    await expect(page.locator('.react-flow')).toBeVisible()
    // Action should still complete (event dispatched before async ELK layout)
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 5000 })
  })
})
