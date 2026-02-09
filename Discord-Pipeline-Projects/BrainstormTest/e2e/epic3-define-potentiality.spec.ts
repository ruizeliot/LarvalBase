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

async function openChainBuilderFrom(page: Page, nodeName: string) {
  const node = page.locator('.react-flow__node').filter({ hasText: nodeName }).first()
  await node.click({ button: 'right' })
  await page.getByTestId('context-menu-new-chain').click()
  await page.getByTestId('chain-type-inflicted').click()
}

test.describe('Epic 3 - US-3.4: Define Stage 2 — Potentiality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-3.4.1: Select target and define susceptibility condition', async ({ page }) => {
    await createComponent(page, 'internal', 'Source', [{ name: 'level', value: '5' }], { x: 300, y: 200 })
    await createComponent(page, 'internal', 'Target', [{ name: 'hp', value: '100' }], { x: 600, y: 400 })

    await openChainBuilderFrom(page, 'Source')

    // Define Stage 1 condition first
    await page.getByTestId('formula-editor-existence').fill('Source.level > 3')

    // Stage 2: Open target selector
    const targetSelector = page.getByTestId('target-selector')
    await expect(targetSelector).toBeVisible()

    // Assert only internal components are listed
    const options = targetSelector.locator('option')
    // Should have: "Select target...", "Source", "Target" (all internal)
    const optionTexts = await options.allTextContents()
    expect(optionTexts).toContain('Source')
    expect(optionTexts).toContain('Target')

    // Select Target
    await targetSelector.selectOption({ label: 'Target' })

    // Type susceptibility formula
    await page.getByTestId('formula-editor-susceptibility').fill('Target.hp > 50')

    // Assert formula validates (no error)
    await expect(page.getByTestId('formula-error')).not.toBeVisible()
  })

  test('TC-3.4.2: Self-reference — component can be both source and target', async ({ page }) => {
    await createComponent(page, 'internal', 'Lone', [{ name: 'x', value: '1' }])

    await openChainBuilderFrom(page, 'Lone')
    await page.getByTestId('formula-editor-existence').fill('Lone.x > 0')

    // Target selector should list "Lone"
    const targetSelector = page.getByTestId('target-selector')
    const optionTexts = await targetSelector.locator('option').allTextContents()
    expect(optionTexts).toContain('Lone')

    // Select self
    await targetSelector.selectOption({ label: 'Lone' })

    // Type susceptibility formula
    await page.getByTestId('formula-editor-susceptibility').fill('Lone.x > 0')

    // Should validate
    await expect(page.getByTestId('formula-error')).not.toBeVisible()
  })

  test('TC-3.4.3: External components excluded from target list', async ({ page }) => {
    await createComponent(page, 'internal', 'Server', [{ name: 'load', value: '50' }], { x: 300, y: 200 })
    await createComponent(page, 'external', 'Weather', [{ name: 'temp', value: '30' }], { x: 600, y: 400 })

    await openChainBuilderFrom(page, 'Server')

    const targetSelector = page.getByTestId('target-selector')
    const optionTexts = await targetSelector.locator('option').allTextContents()

    // Server should be listed (internal)
    expect(optionTexts).toContain('Server')

    // Weather should NOT be listed (external)
    expect(optionTexts).not.toContain('Weather')
  })
})
