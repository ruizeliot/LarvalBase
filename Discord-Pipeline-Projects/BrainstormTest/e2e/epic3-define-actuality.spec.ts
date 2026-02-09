import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

async function createComponent(page: Page, type: 'internal' | 'external', name: string, params: { name: string; value: string }[], pos = { x: 400, y: 300 }) {
  await dragPaletteToCanvas(page, type, pos)
  await page.getByTestId('property-name').fill(name)
  for (const p of params) {
    await page.getByTestId('add-parameter').click()
    const rows = page.getByTestId('param-row')
    const lastRow = rows.last()
    await lastRow.locator('input').first().fill(p.name)
    await lastRow.locator('input[type="number"]').fill(p.value)
  }
  await page.locator('.react-flow').click({ position: { x: 50, y: 50 } })
}

async function openChainBuilderAndFillStages12(page: Page, sourceName: string, targetName: string, existence: string, susceptibility: string) {
  const node = page.locator('.react-flow__node').filter({ hasText: sourceName }).first()
  await node.click({ button: 'right' })
  await page.getByTestId('context-menu-new-chain').click()
  await page.getByTestId('chain-name').fill('TestChain')
  await page.getByTestId('chain-type-inflicted').click()
  await page.getByTestId('formula-editor-existence').fill(existence)
  await page.getByTestId('target-selector').selectOption({ label: targetName })
  await page.getByTestId('formula-editor-susceptibility').fill(susceptibility)
}

test.describe('Epic 3 - US-3.5: Define Stage 3 — Actuality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-3.5.1: Complete chain with mixed duration types', async ({ page }) => {
    await createComponent(page, 'internal', 'River', [{ name: 'waterLevel', value: '5' }], { x: 300, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }, { name: 'integrity', value: '100' }], { x: 600, y: 400 })

    await openChainBuilderAndFillStages12(page, 'River', 'Dam', 'River.waterLevel > 8', 'Dam.pressure > 25')

    // Stage 3: triggering formula
    await page.getByTestId('formula-editor-triggering').fill('Dam.integrity < 60')

    // Add consequence 1: Impulse
    await page.getByTestId('add-consequence').click()
    const row1 = page.getByTestId('consequence-row').first()
    await row1.getByTestId('consequence-param').selectOption({ label: 'pressure' })
    await row1.getByTestId('consequence-formula').fill('Dam.pressure + 10')
    // Impulse is default, no need to click

    // Add consequence 2: Persistent
    await page.getByTestId('add-consequence').click()
    const row2 = page.getByTestId('consequence-row').last()
    await row2.getByTestId('consequence-param').selectOption({ label: 'integrity' })
    await row2.getByTestId('consequence-formula').fill('Dam.integrity - 30')
    await row2.getByTestId('duration-persistent').click()

    // Save
    await page.getByTestId('chain-save').click()

    // Assert dialog closes
    await expect(page.getByTestId('chain-builder')).not.toBeVisible()

    // Assert chain is rendered on canvas (edges should appear)
    // In detailed mode, condition junction nodes should be visible
    await expect(page.getByTestId('condition-node')).toHaveCount(3)
  })

  test('TC-3.5.2: Duration-based consequence requires duration value', async ({ page }) => {
    await createComponent(page, 'internal', 'River', [{ name: 'waterLevel', value: '5' }], { x: 300, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'integrity', value: '100' }], { x: 600, y: 400 })

    await openChainBuilderAndFillStages12(page, 'River', 'Dam', 'River.waterLevel > 8', 'Dam.integrity > 50')

    await page.getByTestId('formula-editor-triggering').fill('Dam.integrity < 60')

    // Add consequence with Duration-based
    await page.getByTestId('add-consequence').click()
    const row = page.getByTestId('consequence-row').first()
    await row.getByTestId('consequence-param').selectOption({ label: 'integrity' })
    await row.getByTestId('consequence-formula').fill('Dam.integrity - 5')
    await row.getByTestId('duration-duration').click()

    // Assert duration input appears
    await expect(row.getByTestId('consequence-duration')).toBeVisible()

    // Leave duration empty, attempt to save
    await page.getByTestId('chain-save').click()

    // Assert validation error
    await expect(page.getByTestId('chain-save-error')).toBeVisible()
    await expect(page.getByTestId('chain-save-error')).toContainText('duration value')

    // Enter duration and save successfully
    await row.getByTestId('consequence-duration').fill('10')
    await page.getByTestId('chain-save').click()
    await expect(page.getByTestId('chain-builder')).not.toBeVisible()
  })

  test('TC-3.5.3: No consequences defined shows error', async ({ page }) => {
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }])

    await openChainBuilderAndFillStages12(page, 'Alpha', 'Alpha', 'Alpha.x > 0', 'Alpha.x > 0')
    await page.getByTestId('formula-editor-triggering').fill('Alpha.x > 0')

    // Do NOT add any consequences, try to save
    await page.getByTestId('chain-save').click()

    // Assert validation error
    await expect(page.getByTestId('chain-save-error')).toBeVisible()
    await expect(page.getByTestId('chain-save-error')).toContainText('At least one consequence is required')
  })

  test('TC-3.5.4: Consequence can be removed', async ({ page }) => {
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }, { name: 'y', value: '2' }])

    await openChainBuilderAndFillStages12(page, 'Alpha', 'Alpha', 'Alpha.x > 0', 'Alpha.x > 0')
    await page.getByTestId('formula-editor-triggering').fill('Alpha.x > 0')

    // Add two consequences
    await page.getByTestId('add-consequence').click()
    await page.getByTestId('add-consequence').click()
    await expect(page.getByTestId('consequence-row')).toHaveCount(2)

    // Remove one
    await page.getByTestId('consequence-row').first().getByTestId('remove-consequence').click()
    await expect(page.getByTestId('consequence-row')).toHaveCount(1)
  })
})
