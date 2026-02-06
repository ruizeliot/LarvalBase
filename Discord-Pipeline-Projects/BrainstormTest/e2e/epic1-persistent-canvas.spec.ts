import { test, expect } from '@playwright/test'

test.describe('Epic 1 - US-1.3: Persistent Graph Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="tab-editor"]')
  })

  test('canvas is visible in all 3 tabs', async ({ page }) => {
    // Editor: canvas visible
    await expect(page.locator('.react-flow')).toBeVisible()

    // Scenarios: canvas still in DOM
    await page.getByTestId('tab-scenarios').click()
    await expect(page.locator('.react-flow')).toBeAttached()

    // Simulate: canvas still in DOM
    await page.getByTestId('tab-simulate').click()
    await expect(page.locator('.react-flow')).toBeAttached()

    // Back to Editor: canvas visible and interactive
    await page.getByTestId('tab-editor').click()
    await expect(page.locator('.react-flow')).toBeVisible()
  })

  test('node positions persist across tab switches', async ({ page }) => {
    // Create a node via drag
    const palette = page.getByTestId('palette-internal')
    const canvas = page.locator('.react-flow')
    await palette.dragTo(canvas, {
      targetPosition: { x: 400, y: 300 },
    })

    // Verify node exists
    await expect(page.getByText('Component 1')).toBeVisible()

    // Get node position
    const nodeBeforeSwitch = page.locator('.react-flow__node').first()
    const posBefore = await nodeBeforeSwitch.boundingBox()

    // Switch to Scenarios and back
    await page.getByTestId('tab-scenarios').click()
    await page.getByTestId('tab-editor').click()

    // Node should still be at same position
    await expect(page.getByText('Component 1')).toBeVisible()
    const nodeAfterSwitch = page.locator('.react-flow__node').first()
    const posAfter = await nodeAfterSwitch.boundingBox()

    expect(posAfter!.x).toBeCloseTo(posBefore!.x, 0)
    expect(posAfter!.y).toBeCloseTo(posBefore!.y, 0)
  })

  test('pan/zoom state persists across tab switches', async ({ page }) => {
    // Get initial viewport transform
    const getViewport = () =>
      page.locator('.react-flow__viewport').evaluate((el) => {
        const style = window.getComputedStyle(el)
        return style.transform
      })

    const initialTransform = await getViewport()

    // Zoom in using controls
    await page.locator('.react-flow__controls-zoomin').click()
    const zoomedTransform = await getViewport()
    expect(zoomedTransform).not.toBe(initialTransform)

    // Switch tab and back
    await page.getByTestId('tab-simulate').click()
    await page.getByTestId('tab-editor').click()

    // Viewport should retain zoomed state
    const afterSwitchTransform = await getViewport()
    expect(afterSwitchTransform).toBe(zoomedTransform)
  })
})
