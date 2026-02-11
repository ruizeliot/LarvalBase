import { test, expect } from '@playwright/test'

test.describe('QA3: Tutorial dismissal mid-action-step', () => {
  test.use({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:5173',
          localStorage: [
            // Do NOT set cascadesim-tutorial-complete so tutorial shows
          ],
        },
      ],
    },
  })

  test('BUG: Dismissing tutorial mid-action-step removes overlay and restores interactivity', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // WelcomeOverlay should appear (no tutorial-complete in storage)
    const startBtn = page.locator('text=Start Tutorial')
    // If the overlay appears, click Start Tutorial
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click()
    }

    // Wait for guided tour driver overlay to appear
    const driverOverlay = page.locator('.driver-overlay')
    if (await driverOverlay.isVisible({ timeout: 3000 }).catch(() => false)) {
      // We're on step 0 (Welcome). Advance to step 1 (action step).
      const nextBtn = page.locator('.driver-popover-next-btn')
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click()
        await page.waitForTimeout(500)

        // Now on step 1 (action required: drag component)
        // Check that tutorial-action-active class is on body
        const hasActionClass = await page.evaluate(() =>
          document.body.classList.contains('tutorial-action-active')
        )
        // It should be active since this is an action step
        expect(hasActionClass).toBe(true)

        // Dismiss the tour via the close button
        const closeBtn = page.locator('.driver-popover-close-btn')
        if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeBtn.click()
        } else {
          // Press Escape to dismiss
          await page.keyboard.press('Escape')
        }

        await page.waitForTimeout(500)

        // Verify tutorial-action-active class is removed from body
        const hasActionClassAfter = await page.evaluate(() =>
          document.body.classList.contains('tutorial-action-active')
        )
        expect(hasActionClassAfter).toBe(false)

        // Verify no driver overlay remains
        await expect(driverOverlay).not.toBeVisible()

        // Verify app is interactive: can drag component from palette
        const palette = page.getByTestId('component-palette')
        if (await palette.isVisible({ timeout: 2000 }).catch(() => false)) {
          const paletteInternal = page.getByTestId('palette-internal')
          await expect(paletteInternal).toBeVisible()
          // Verify it's clickable (not blocked by overlay)
          const isEnabled = await paletteInternal.isEnabled()
          expect(isEnabled).toBe(true)
        }
      }
    }
  })

  test('BUG: Tutorial state resets after dismissal mid-step', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')

    // Start tutorial if welcome overlay appears
    const startBtn = page.locator('text=Start Tutorial')
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(500)

      // Advance through a few steps
      const nextBtn = page.locator('.driver-popover-next-btn')
      if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nextBtn.click()
        await page.waitForTimeout(500)
      }

      // Dismiss tour
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)

      // Verify localStorage has tutorial-complete set
      const isComplete = await page.evaluate(() =>
        localStorage.getItem('cascadesim-tutorial-complete') === 'true'
      )
      expect(isComplete).toBe(true)

      // Refresh the page — tutorial should NOT re-appear
      await page.goto('/')
      await page.waitForSelector('.react-flow')
      await page.waitForTimeout(1500)

      // Welcome overlay should not appear
      const welcomeAfterRefresh = page.locator('text=Start Tutorial')
      await expect(welcomeAfterRefresh).not.toBeVisible({ timeout: 2000 })
    }
  })
})
