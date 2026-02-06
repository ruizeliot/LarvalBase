import { test, expect } from '@playwright/test'

test.describe('Epic 1 - US-1.4: Context-Aware Bottom Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="tab-editor"]')
  })

  test('Editor mode: bottom panel shows property details placeholder', async ({ page }) => {
    await expect(page.getByTestId('bottom-panel')).toBeVisible()
    await expect(page.getByTestId('bottom-panel-editor')).toBeVisible()
    await expect(page.getByText('Property Details')).toBeVisible()
  })

  test('Scenarios mode: bottom panel shows timeline placeholder', async ({ page }) => {
    await page.getByTestId('tab-scenarios').click()

    await expect(page.getByTestId('bottom-panel')).toBeVisible()
    await expect(page.getByTestId('bottom-panel-scenarios')).toBeVisible()
    await expect(page.getByText('Timeline', { exact: true })).toBeVisible()
  })

  test('Simulate mode: bottom panel shows playback controls and event log placeholders', async ({ page }) => {
    await page.getByTestId('tab-simulate').click()

    await expect(page.getByTestId('bottom-panel')).toBeVisible()
    await expect(page.getByTestId('bottom-panel-simulate')).toBeVisible()
    await expect(page.getByText('Playback Controls', { exact: true })).toBeVisible()
    await expect(page.getByText('Event Log', { exact: true })).toBeVisible()
  })
})
