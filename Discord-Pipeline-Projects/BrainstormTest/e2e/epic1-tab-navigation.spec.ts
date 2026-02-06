import { test, expect } from '@playwright/test'

test.describe('Epic 1 - US-1.1: Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="tab-editor"]')
  })

  test('3 tabs visible on load, Editor active by default', async ({ page }) => {
    const editorTab = page.getByTestId('tab-editor')
    const scenariosTab = page.getByTestId('tab-scenarios')
    const simulateTab = page.getByTestId('tab-simulate')

    await expect(editorTab).toBeVisible()
    await expect(scenariosTab).toBeVisible()
    await expect(simulateTab).toBeVisible()

    // Editor tab should have active styling (bg-primary = blue)
    await expect(editorTab).toHaveClass(/bg-\[var\(--color-primary\)\]/)
    // Other tabs should NOT have active styling
    await expect(scenariosTab).not.toHaveClass(/bg-\[var\(--color-primary\)\]/)
    await expect(simulateTab).not.toHaveClass(/bg-\[var\(--color-primary\)\]/)
  })

  test('clicking each tab switches active mode and left panel content', async ({ page }) => {
    // Editor mode: palette visible
    await expect(page.getByText('Internal Component')).toBeVisible()

    // Switch to Scenarios
    await page.getByTestId('tab-scenarios').click()
    await expect(page.getByTestId('tab-scenarios')).toHaveClass(/bg-\[var\(--color-primary\)\]/)
    await expect(page.getByTestId('tab-editor')).not.toHaveClass(/bg-\[var\(--color-primary\)\]/)
    // Scenarios left panel has scenario list content (create button unique to ScenarioList)
    await expect(page.getByTestId('create-scenario')).toBeVisible()

    // Switch to Simulate
    await page.getByTestId('tab-simulate').click()
    await expect(page.getByTestId('tab-simulate')).toHaveClass(/bg-\[var\(--color-primary\)\]/)
    await expect(page.getByTestId('tab-scenarios')).not.toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Switch back to Editor
    await page.getByTestId('tab-editor').click()
    await expect(page.getByTestId('tab-editor')).toHaveClass(/bg-\[var\(--color-primary\)\]/)
    await expect(page.getByText('Internal Component')).toBeVisible()
  })

  test('tab selection persists (round-trip)', async ({ page }) => {
    // Switch to Simulate
    await page.getByTestId('tab-simulate').click()
    await expect(page.getByTestId('tab-simulate')).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    // Switch away and back
    await page.getByTestId('tab-editor').click()
    await expect(page.getByTestId('tab-editor')).toHaveClass(/bg-\[var\(--color-primary\)\]/)

    await page.getByTestId('tab-simulate').click()
    await expect(page.getByTestId('tab-simulate')).toHaveClass(/bg-\[var\(--color-primary\)\]/)
    await expect(page.getByTestId('tab-editor')).not.toHaveClass(/bg-\[var\(--color-primary\)\]/)
  })
})
