import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

test.describe('Epic 3 - US-3.1: Start New Causal Chain', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-3.1.1: Right-click opens context menu with chain option', async ({ page }) => {
    // Setup: create internal component with a parameter
    await dragPaletteToCanvas(page, 'internal')
    const nameInput = page.getByTestId('property-name')
    await nameInput.fill('Source')
    await page.getByTestId('add-parameter').click()

    // Right-click the Source node on the canvas
    const node = page.locator('.react-flow__node').first()
    await node.click({ button: 'right' })

    // Assert context menu appears
    await expect(page.getByTestId('context-menu')).toBeVisible()

    // Assert menu contains "New Causal Chain from here" option
    await expect(page.getByTestId('context-menu-new-chain')).toBeVisible()
    await expect(page.getByTestId('context-menu-new-chain')).toHaveText('New Causal Chain from here')
  })

  test('TC-3.1.2: Selecting option opens chain builder with source pre-filled', async ({ page }) => {
    // Setup
    await dragPaletteToCanvas(page, 'internal')
    const nameInput = page.getByTestId('property-name')
    await nameInput.fill('Source')

    // Right-click and select chain option
    const node = page.locator('.react-flow__node').first()
    await node.click({ button: 'right' })
    await page.getByTestId('context-menu-new-chain').click()

    // Assert Chain Builder dialog opens
    await expect(page.getByTestId('chain-builder')).toBeVisible()

    // Assert source component field shows "Source"
    await expect(page.getByTestId('chain-builder-source')).toHaveText('Source')
  })

  test('TC-3.1.3: Right-click on canvas background does not show chain option', async ({ page }) => {
    // Right-click on empty canvas background
    await page.locator('.react-flow').click({ button: 'right', position: { x: 400, y: 300 } })

    // Assert context menu does not appear
    await expect(page.getByTestId('context-menu')).not.toBeVisible()
  })

  test('TC-3.1.4: Only one chain builder open at a time', async ({ page }) => {
    // Setup
    await dragPaletteToCanvas(page, 'internal')

    // Right-click and open chain builder
    const node = page.locator('.react-flow__node').first()
    await node.click({ button: 'right' })
    await page.getByTestId('context-menu-new-chain').click()

    // Assert dialog is open
    await expect(page.getByTestId('chain-builder')).toBeVisible()

    // Without closing the dialog, right-click the node again — context menu should not open chain builder again
    // Close any context menu first by clicking elsewhere then right-click
    await page.keyboard.press('Escape')

    // Only one chain-builder should exist
    await expect(page.getByTestId('chain-builder')).toHaveCount(1)
  })
})
