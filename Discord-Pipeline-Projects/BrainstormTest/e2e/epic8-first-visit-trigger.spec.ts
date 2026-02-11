import { test, expect } from '@playwright/test'

test.describe('Epic 8 - US-8.1: First-Visit Walkthrough Trigger', () => {
  test('TC-8.1.1: Welcome overlay appears on first visit', async ({ page }) => {
    // 1. Clear localStorage
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())

    // 2. Navigate to app
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // 3. Wait up to 2 seconds for overlay
    const overlay = page.getByTestId('welcome-overlay')
    await expect(overlay).toBeVisible({ timeout: 3000 })

    // 4. Assert overlay contains app name
    await expect(overlay).toContainText('CascadeSim')

    // 5. Assert overlay contains brief description text
    const description = overlay.locator('[data-testid="welcome-description"]')
    await expect(description).toBeVisible()
    await expect(description).not.toHaveText('')

    // 6. Assert "Start Tutorial" button is visible
    await expect(overlay.getByTestId('start-tutorial-button')).toBeVisible()

    // 7. Assert "Skip" button is visible
    await expect(overlay.getByTestId('skip-tutorial-button')).toBeVisible()
  })

  test('TC-8.1.2: Clicking "Skip" dismisses overlay and sets localStorage flag', async ({ page }) => {
    // 1. Clear localStorage, navigate to app
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // 2. Wait for welcome overlay
    const overlay = page.getByTestId('welcome-overlay')
    await expect(overlay).toBeVisible({ timeout: 3000 })

    // 3. Click "Skip"
    await page.getByTestId('skip-tutorial-button').click()

    // 4. Assert overlay is dismissed
    await expect(overlay).not.toBeVisible()

    // 5. Assert normal workspace is visible
    await expect(page.locator('.react-flow')).toBeVisible()

    // 6. Assert localStorage contains tutorial progress key with welcomeSeen
    const progress = await page.evaluate(() => {
      const raw = localStorage.getItem('cascadesim-tutorial-progress')
      return raw ? JSON.parse(raw) : null
    })
    expect(progress).not.toBeNull()
    expect(progress.welcomeSeen).toBe(true)
  })

  test('TC-8.1.3: Subsequent visits do not trigger the walkthrough', async ({ page }) => {
    // 1. Clear localStorage, navigate to app
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // 2. Click "Skip" on welcome overlay
    await expect(page.getByTestId('welcome-overlay')).toBeVisible({ timeout: 3000 })
    await page.getByTestId('skip-tutorial-button').click()

    // 3. Reload page
    await page.reload()
    await page.waitForSelector('.react-flow')

    // 4. Wait 2 seconds
    await page.waitForTimeout(2000)

    // 5. Assert welcome overlay does NOT appear
    await expect(page.getByTestId('welcome-overlay')).not.toBeVisible()
  })

  test('TC-8.1.4: Clearing localStorage re-triggers the walkthrough', async ({ page }) => {
    // 1. Set tutorial progress (welcomeSeen), navigate to app — assert no overlay
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('cascadesim-tutorial-progress', JSON.stringify({
        phase1: { status: 'available', stepsCompleted: [] },
        phase2: { status: 'locked', stepsCompleted: [] },
        phase3: { status: 'locked', stepsCompleted: [] },
        phase4: { status: 'locked', stepsCompleted: [] },
        welcomeSeen: true,
      }))
    })
    await page.goto('/')
    await page.waitForSelector('.react-flow')
    await page.waitForTimeout(2000)
    await expect(page.getByTestId('welcome-overlay')).not.toBeVisible()

    // 2. Clear tutorial progress localStorage
    await page.evaluate(() => localStorage.removeItem('cascadesim-tutorial-progress'))

    // 3. Reload page
    await page.reload()
    await page.waitForSelector('.react-flow')

    // 4. Wait up to 2 seconds
    // 5. Assert welcome overlay appears
    await expect(page.getByTestId('welcome-overlay')).toBeVisible({ timeout: 3000 })
  })

  test('TC-8.1.5: Clicking "Start Tutorial" opens tutorial menu', async ({ page }) => {
    // 1. Clear localStorage, navigate to app
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // 2. Wait for welcome overlay
    await expect(page.getByTestId('welcome-overlay')).toBeVisible({ timeout: 3000 })

    // 3. Click "Start Tutorial"
    await page.getByTestId('start-tutorial-button').click()

    // 4. Assert welcome overlay is dismissed
    await expect(page.getByTestId('welcome-overlay')).not.toBeVisible()

    // 5. Assert tutorial menu opens with Phase 1 visible (E11 progressive tutorial)
    await expect(page.locator('[data-testid="tutorial-menu"]')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('[data-testid="tutorial-phase-1"]')).toBeVisible()
  })
})
