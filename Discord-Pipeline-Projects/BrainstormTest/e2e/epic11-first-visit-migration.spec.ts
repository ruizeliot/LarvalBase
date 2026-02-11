import { test, expect } from '@playwright/test'

test.describe('E11 US-11.7: First-Visit Auto-Launch & Migration', () => {

  // TC-11.7.1: First visit shows welcome overlay after 1 second
  test('first visit shows welcome overlay after 1 second', async ({ page }) => {
    // Clear all localStorage
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()

    // Assert welcome overlay does NOT appear immediately
    await expect(page.locator('[data-testid="welcome-overlay"]')).not.toBeVisible()

    // Wait for 1-second delay
    await page.waitForSelector('[data-testid="welcome-overlay"]', { timeout: 3000 })
    const overlay = page.locator('[data-testid="welcome-overlay"]')
    await expect(overlay).toBeVisible()

    // Assert overlay shows app name
    await expect(overlay).toContainText('CascadeSim')

    // Assert overlay shows description
    const desc = page.locator('[data-testid="welcome-description"]')
    await expect(desc).toBeVisible()
    await expect(desc).toContainText('cascading effects')

    // Assert both buttons visible
    await expect(page.locator('[data-testid="start-tutorial-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="skip-tutorial-button"]')).toBeVisible()
  })

  // TC-11.7.2: "Start Tutorial" opens tutorial menu at Phase 1
  test('"Start Tutorial" opens tutorial menu at Phase 1', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()

    // Wait for welcome overlay
    await page.waitForSelector('[data-testid="welcome-overlay"]', { timeout: 3000 })

    // Click "Start Tutorial"
    await page.locator('[data-testid="start-tutorial-button"]').click()

    // Assert welcome overlay is dismissed
    await expect(page.locator('[data-testid="welcome-overlay"]')).not.toBeVisible()

    // Assert tutorial menu opens
    await page.waitForSelector('[data-testid="tutorial-menu"]', { timeout: 3000 })
    await expect(page.locator('[data-testid="tutorial-menu"]')).toBeVisible()

    // Phase 1 should be highlighted (ring style)
    const phase1 = page.locator('[data-testid="tutorial-phase-1"]')
    await expect(phase1).toBeVisible()
  })

  // TC-11.7.3: "Skip" dismisses overlay but does not complete any phases
  test('"Skip" dismisses overlay but does not complete any phases', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()

    // Wait for welcome overlay
    await page.waitForSelector('[data-testid="welcome-overlay"]', { timeout: 3000 })

    // Click "Skip"
    await page.locator('[data-testid="skip-tutorial-button"]').click()

    // Assert welcome overlay is dismissed
    await expect(page.locator('[data-testid="welcome-overlay"]')).not.toBeVisible()

    // Read localStorage
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })

    expect(progress.welcomeSeen).toBe(true)
    expect(progress.phase1.status).toBe('available')
    expect(progress.phase2.status).toBe('locked')
    expect(progress.phase3.status).toBe('locked')
    expect(progress.phase4.status).toBe('locked')
  })

  // TC-11.7.4: Subsequent visits do not show welcome overlay
  test('subsequent visits do not show welcome overlay', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()

    // Wait for welcome overlay and skip it
    await page.waitForSelector('[data-testid="welcome-overlay"]', { timeout: 3000 })
    await page.locator('[data-testid="skip-tutorial-button"]').click()
    await page.waitForTimeout(300)

    // Reload page
    await page.reload()

    // Wait 3 seconds — overlay should NOT appear
    await page.waitForTimeout(3000)
    await expect(page.locator('[data-testid="welcome-overlay"]')).not.toBeVisible()
  })

  // TC-11.7.5: Migration — V2 tutorial-complete key auto-completes Phase 1
  test('V2 migration auto-completes Phase 1 and unlocks Phase 2', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('cascadesim-tutorial-complete', 'true')
    })
    await page.reload()
    await page.waitForTimeout(1500)

    // Welcome overlay should NOT appear (V2 user)
    await expect(page.locator('[data-testid="welcome-overlay"]')).not.toBeVisible()

    // Open tutorial menu
    await page.locator('[data-testid="help-button"]').click()
    await page.waitForSelector('[data-testid="tutorial-menu"]', { timeout: 3000 })

    // Phase 1 shows as complete
    await expect(page.locator('[data-testid="phase-1-complete-icon"]')).toBeVisible()

    // Phase 2 is unlocked (available)
    await expect(page.locator('[data-testid="phase-2-lock-icon"]')).not.toBeVisible()
  })

  // TC-11.7.6: Migration removes old V2 localStorage key
  test('migration removes old V2 localStorage key', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('cascadesim-tutorial-complete', 'true')
    })
    await page.reload()
    await page.waitForTimeout(2000)

    // Read localStorage
    const result = await page.evaluate(() => {
      return {
        oldKey: localStorage.getItem('cascadesim-tutorial-complete'),
        newKey: localStorage.getItem('cascadesim-tutorial-progress'),
      }
    })

    // Old key should be removed
    expect(result.oldKey).toBeNull()

    // New key should exist with Phase 1 complete
    expect(result.newKey).not.toBeNull()
    const progress = JSON.parse(result.newKey!)
    expect(progress.phase1.status).toBe('complete')
  })

  // TC-11.7.7: Edge — No localStorage keys at all (truly fresh user)
  test('truly fresh user sees welcome overlay', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
    })
    await page.reload()

    // Wait for welcome overlay
    await page.waitForSelector('[data-testid="welcome-overlay"]', { timeout: 3000 })
    await expect(page.locator('[data-testid="welcome-overlay"]')).toBeVisible()

    // Click "Start Tutorial"
    await page.locator('[data-testid="start-tutorial-button"]').click()
    await page.waitForTimeout(500)

    // Tutorial menu should be open
    await expect(page.locator('[data-testid="tutorial-menu"]')).toBeVisible()

    // localStorage should now have progress
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })
    expect(progress).not.toBeNull()
    expect(progress.welcomeSeen).toBe(true)
  })

  // TC-11.7.8: Edge — Both old and new keys present (migration idempotency)
  test('both old and new keys — preserves new key, removes old', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      // Set old V2 key
      localStorage.setItem('cascadesim-tutorial-complete', 'true')
      // Also set new key with Phase 1 complete and Phase 2 in-progress
      localStorage.setItem('cascadesim-tutorial-progress', JSON.stringify({
        phase1: { status: 'complete', stepsCompleted: [1, 2, 3, 4, 5] },
        phase2: { status: 'in-progress', stepsCompleted: [1, 2] },
        phase3: { status: 'locked', stepsCompleted: [] },
        phase4: { status: 'locked', stepsCompleted: [] },
        welcomeSeen: true,
      }))
    })
    await page.reload()
    await page.waitForTimeout(1500)

    // Open tutorial menu
    await page.locator('[data-testid="help-button"]').click()
    await page.waitForSelector('[data-testid="tutorial-menu"]', { timeout: 3000 })

    // Phase 1 is complete (from new key, not re-migrated)
    await expect(page.locator('[data-testid="phase-1-complete-icon"]')).toBeVisible()

    // Phase 2 shows in-progress (new key preserved, not overwritten by migration)
    const resumeLabel = page.locator('[data-testid="phase-2-resume-label"]')
    await expect(resumeLabel).toBeVisible()
    await expect(resumeLabel).toContainText('Resume')

    // Old key is removed
    const oldKey = await page.evaluate(() => localStorage.getItem('cascadesim-tutorial-complete'))
    expect(oldKey).toBeNull()
  })
})
