import { test, expect, type Page } from '@playwright/test'
import {
  setTutorialPhaseComplete,
  skipWelcomeOverlay,
  startTutorialPhase,
  advanceTutorialStep,
} from './helpers/tutorial-helpers'

/** Advance N tutorial steps. */
async function advanceSteps(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await advanceTutorialStep(page)
  }
}

/** Create a collaboration room via page.evaluate (bypasses Driver.js overlay). */
async function createRoomViaUI(page: Page) {
  // Click Collaborate button
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="collaborate-button"]') as HTMLButtonElement
    if (btn) btn.click()
  })
  await page.waitForTimeout(300)

  // Fill display name (React controlled input)
  await page.evaluate(() => {
    const input = document.querySelector('[data-testid="display-name-input"]') as HTMLInputElement
    if (!input) return
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    nativeSetter?.call(input, 'Tutorial User')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(100)

  // Click Create/Confirm
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="confirm-name-button"]') as HTMLButtonElement
    if (btn) btn.click()
  })
  await page.waitForTimeout(500)
}

/** Click Copy Link button in the room modal. */
async function clickCopyLink(page: Page) {
  await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="copy-link-button"]') as HTMLButtonElement
    if (btn) btn.click()
  })
  await page.waitForTimeout(300)
}

/** Move mouse on the canvas area. */
async function moveCursorOnCanvas(page: Page) {
  await page.evaluate(() => {
    const canvas = document.querySelector('.react-flow') as HTMLElement
    if (canvas) {
      canvas.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true, clientX: 400, clientY: 300,
      }))
    }
  })
  await page.waitForTimeout(300)
}

/** Click a component node on the canvas. */
async function clickCanvasComponent(page: Page) {
  await page.evaluate(() => {
    const node = document.querySelector('.react-flow__node') as HTMLElement
    if (node) node.click()
  })
  await page.waitForTimeout(300)
}

test.describe('E11 US-11.5: Phase 4 — Collaboration', () => {

  test.beforeEach(async ({ page, context }) => {
    // Grant clipboard permissions for Copy Link tests
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/')
    await skipWelcomeOverlay(page)
  })

  // TC-11.5.1: Phase 4 starts by spotlighting the Collaborate button
  test('Phase 4 starts by spotlighting the Collaborate button', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Assert Driver.js popover appears for step 1
    const popover = page.locator('.driver-popover')
    await expect(popover).toBeVisible()
    await expect(popover.locator('.driver-popover-title')).toContainText('Room')

    // Assert action prompt instructs user
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()
  })

  // TC-11.5.2: Step 1 — Create a collaboration room
  test('step 1 — create a collaboration room', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Create room via UI
    await createRoomViaUI(page)

    // Room modal should appear
    await expect(page.locator('[data-testid="room-modal"]')).toBeVisible({ timeout: 3000 })

    // Action complete should appear
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.5.3: Step 2 — Click "Copy Link" in share modal
  test('step 2 — click Copy Link in share modal', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Complete step 1 — create room
    await createRoomViaUI(page)
    await advanceTutorialStep(page) // advance to step 2

    // Now on step 2 — Share a Link
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Link')
    await expect(page.locator('[data-testid="tutorial-action-prompt"]')).toBeVisible()

    // Click Copy Link button
    await clickCopyLink(page)

    // Action complete
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.5.4: Step 3 — Simulated ghost cursor appears
  test('step 3 — simulated ghost cursor appears', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Complete steps 1-2
    await createRoomViaUI(page)
    await advanceTutorialStep(page)
    await clickCopyLink(page)
    await advanceTutorialStep(page) // advance to step 3

    // Now on step 3 — Live Cursors
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Cursor')

    // Ghost cursor should appear with name label
    await expect(page.locator('[data-testid="tutorial-ghost-cursor"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[data-testid="tutorial-ghost-cursor"]')).toContainText('Demo User')

    // Move cursor on canvas
    await moveCursorOnCanvas(page)

    // Action complete
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.5.5: Step 4 — Simulated second avatar in presence bar
  test('step 4 — simulated second avatar in presence bar', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Complete steps 1-3
    await createRoomViaUI(page)
    await advanceTutorialStep(page)
    await clickCopyLink(page)
    await advanceTutorialStep(page)
    await moveCursorOnCanvas(page)
    await advanceTutorialStep(page) // advance to step 4

    // Now on step 4 — Presence Bar
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Presence')

    // User's own avatar visible in presence bar
    await expect(page.locator('[data-testid="presence-avatar"]').first()).toBeVisible({ timeout: 3000 })

    // Simulated second avatar appears
    await expect(page.locator('[data-testid="simulated-presence-avatar"]')).toBeVisible({ timeout: 3000 })

    // Auto-completes after observation
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 5000 })
  })

  // TC-11.5.6: Step 5 — Select a component to see edit indicator
  test('step 5 — select component to see edit indicator', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Complete steps 1-4 (step 4 auto-completes)
    await createRoomViaUI(page)
    await advanceTutorialStep(page)
    await clickCopyLink(page)
    await advanceTutorialStep(page)
    await moveCursorOnCanvas(page)
    await advanceTutorialStep(page)
    // Step 4 auto-completes after delay
    await page.waitForTimeout(3000)
    await advanceTutorialStep(page) // advance to step 5

    // Now on step 5 — Co-Editing
    const title = page.locator('.driver-popover-title')
    await expect(title).toContainText('Co-Editing')

    // Simulated edit indicator visible on a component
    await expect(page.locator('[data-testid="tutorial-edit-indicator"]')).toBeVisible({ timeout: 3000 })

    // Click a component on the canvas
    await clickCanvasComponent(page)

    // Action complete should appear
    await expect(page.locator('[data-testid="tutorial-action-complete"]')).toBeVisible({ timeout: 3000 })
  })

  // TC-11.5.7: Final completion overlay shows "Tutorial Complete!" with confetti
  test('final completion overlay shows Tutorial Complete with confetti', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Complete all 5 steps
    await createRoomViaUI(page)
    await advanceTutorialStep(page)
    await clickCopyLink(page)
    await advanceTutorialStep(page)
    await moveCursorOnCanvas(page)
    await advanceTutorialStep(page)
    await page.waitForTimeout(3000) // step 4 auto-completes
    await advanceTutorialStep(page)
    await clickCanvasComponent(page)
    await advanceTutorialStep(page) // completes Phase 4

    // Completion overlay
    await expect(page.locator('[data-testid="completion-overlay"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[data-testid="completion-title"]')).toContainText('Tutorial Complete')
    await expect(page.locator('[data-testid="confetti-animation"]')).toBeVisible()
    await expect(page.locator('[data-testid="completion-description"]')).toContainText('mastered CascadeSim')

    // localStorage reflects all phases complete
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })
    expect(progress.phase4.status).toBe('complete')
  })

  // TC-11.5.8: Help menu shows all phases complete with "Replay any phase"
  test('help menu shows all phases complete with replay option', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3, 4)

    // Open help menu
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="help-button"]') as HTMLButtonElement
      if (btn) btn.click()
    })
    await page.waitForTimeout(300)

    // Tutorial menu visible
    await expect(page.locator('[data-testid="tutorial-menu"]')).toBeVisible()

    // All 4 phases show complete checkmarks
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator(`[data-testid="phase-${i}-complete-icon"]`)).toBeVisible()
    }

    // All 4 phases have replay icons
    for (let i = 1; i <= 4; i++) {
      await expect(page.locator(`[data-testid="phase-${i}-replay-icon"]`)).toBeVisible()
    }

    // Progress text shows 4 of 4 complete
    await expect(page.locator('[data-testid="tutorial-progress-text"]')).toContainText('4 of 4')
  })

  // TC-11.5.9: Phase 4 creates a real room with room URL
  test('Phase 4 creates a real room with room URL in modal', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Create room
    await createRoomViaUI(page)

    // Room URL displayed in modal contains room= parameter
    const roomUrl = await page.locator('[data-testid="room-url"]').textContent()
    expect(roomUrl).toBeTruthy()
    expect(roomUrl).toContain('room=')
  })

  // TC-11.5.10: Simulated cursors/avatars disappear after Phase 4 ends
  test('simulated cursors and avatars disappear after Phase 4 ends', async ({ page }) => {
    await setTutorialPhaseComplete(page, 1, 2, 3)
    await startTutorialPhase(page, 4)
    await page.waitForTimeout(500)

    // Complete all 5 steps
    await createRoomViaUI(page)
    await advanceTutorialStep(page)
    await clickCopyLink(page)
    await advanceTutorialStep(page)
    await moveCursorOnCanvas(page)
    await advanceTutorialStep(page)
    await page.waitForTimeout(3000)
    await advanceTutorialStep(page)
    await clickCanvasComponent(page)
    await advanceTutorialStep(page) // completes Phase 4

    // Dismiss the completion overlay
    await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="completion-dismiss"]') as HTMLButtonElement
      if (btn) btn.click()
    })
    await page.waitForTimeout(500)

    // No ghost cursor
    await expect(page.locator('[data-testid="tutorial-ghost-cursor"]')).not.toBeVisible()

    // No simulated presence avatar
    await expect(page.locator('[data-testid="simulated-presence-avatar"]')).not.toBeVisible()

    // No tutorial edit indicator
    await expect(page.locator('[data-testid="tutorial-edit-indicator"]')).not.toBeVisible()
  })
})
