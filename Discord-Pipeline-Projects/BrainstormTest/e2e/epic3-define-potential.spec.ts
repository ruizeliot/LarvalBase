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

test.describe('Epic 3 - US-3.3: Define Stage 1 — Potential', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-3.3.1: Formula editor with autocomplete', async ({ page }) => {
    await createComponent(page, 'internal', 'River', [{ name: 'waterLevel', value: '5' }], { x: 300, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }], { x: 600, y: 400 })
    await openChainBuilderFrom(page, 'River')

    // Type partial text to trigger autocomplete
    const formulaInput = page.getByTestId('formula-editor-existence')
    await formulaInput.click()
    await formulaInput.fill('Riv')

    // Assert autocomplete dropdown appears
    await expect(page.getByTestId('autocomplete-dropdown')).toBeVisible()

    // Assert it suggests River.waterLevel
    const suggestions = page.getByTestId('autocomplete-suggestion')
    await expect(suggestions.first()).toContainText('River.waterLevel')

    // Select the suggestion
    await suggestions.first().click()

    // Complete the formula
    const currentVal = await formulaInput.inputValue()
    await formulaInput.fill(currentVal + ' > 8')

    // Verify formula content
    await expect(formulaInput).toHaveValue('River.waterLevel > 8')
  })

  test('TC-3.3.2: Compound condition with logical operators', async ({ page }) => {
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }, { name: 'y', value: '2' }])
    await openChainBuilderFrom(page, 'Alpha')

    // Type compound formula
    const formulaInput = page.getByTestId('formula-editor-existence')
    await formulaInput.fill('Alpha.x > 0 AND Alpha.y < 10')

    // Try to save (partially fill other fields to trigger validation)
    // The formula should validate (no reference errors)
    await page.getByTestId('chain-save').click()

    // The error should NOT be about the formula referencing invalid components
    // (it may error about missing target/consequences, which is expected)
    const formulaError = page.getByTestId('formula-error')
    // If formula error exists, it shouldn't be about invalid references
    const formulaErrors = await formulaError.count()
    if (formulaErrors > 0) {
      const text = await formulaError.first().textContent()
      expect(text).not.toContain('not found')
    }
  })

  test('TC-3.3.3: Time expression in condition', async ({ page }) => {
    await createComponent(page, 'internal', 'Sensor', [{ name: 'temp', value: '30' }])
    await openChainBuilderFrom(page, 'Sensor')

    const formulaInput = page.getByTestId('formula-editor-existence')
    await formulaInput.fill('DURATION(Sensor.temp > 40) > 5s')

    // Try save to trigger validation
    await page.getByTestId('chain-save').click()

    // No reference error should appear for DURATION or Sensor.temp
    const formulaErrors = page.getByTestId('formula-error')
    const count = await formulaErrors.count()
    if (count > 0) {
      const text = await formulaErrors.first().textContent()
      expect(text).not.toContain('not found')
    }
  })

  test('TC-3.3.4: Formula references non-existent component', async ({ page }) => {
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }])
    await openChainBuilderFrom(page, 'Alpha')

    // Fill Stage 1 with bad reference
    await page.getByTestId('formula-editor-existence').fill('NonExistent.param > 5')

    // Fill minimum required fields and try to save
    await page.getByTestId('chain-name').fill('TestChain')
    await page.getByTestId('target-selector').selectOption({ label: 'Alpha' })
    await page.getByTestId('formula-editor-susceptibility').fill('Alpha.x > 0')
    await page.getByTestId('formula-editor-triggering').fill('Alpha.x > 0')
    await page.getByTestId('add-consequence').click()
    await page.getByTestId('consequence-row').last().getByTestId('consequence-param').selectOption({ label: 'x' })
    await page.getByTestId('consequence-row').last().getByTestId('consequence-formula').fill('Alpha.x - 1')
    await page.getByTestId('chain-save').click()

    // Assert validation error about non-existent component
    await expect(page.getByTestId('formula-error').first()).toBeVisible()
    await expect(page.getByTestId('formula-error').first()).toContainText('"NonExistent" not found')
  })

  test('TC-3.3.5: Formula references non-existent parameter', async ({ page }) => {
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }])
    await openChainBuilderFrom(page, 'Alpha')

    await page.getByTestId('formula-editor-existence').fill('Alpha.nonExistent > 5')

    // Fill minimum required fields and try to save
    await page.getByTestId('chain-name').fill('TestChain')
    await page.getByTestId('target-selector').selectOption({ label: 'Alpha' })
    await page.getByTestId('formula-editor-susceptibility').fill('Alpha.x > 0')
    await page.getByTestId('formula-editor-triggering').fill('Alpha.x > 0')
    await page.getByTestId('add-consequence').click()
    await page.getByTestId('consequence-row').last().getByTestId('consequence-param').selectOption({ label: 'x' })
    await page.getByTestId('consequence-row').last().getByTestId('consequence-formula').fill('Alpha.x - 1')
    await page.getByTestId('chain-save').click()

    // Assert validation error about non-existent parameter
    await expect(page.getByTestId('formula-error').first()).toBeVisible()
    await expect(page.getByTestId('formula-error').first()).toContainText('not found on component')
  })

  test('TC-3.3.6: Empty formula shows error', async ({ page }) => {
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }])
    await openChainBuilderFrom(page, 'Alpha')

    // Leave formula empty, try to save
    await page.getByTestId('chain-name').fill('TestChain')
    await page.getByTestId('chain-save').click()

    // Assert validation error: condition is required
    await expect(page.getByTestId('formula-error').first()).toBeVisible()
    await expect(page.getByTestId('formula-error').first()).toContainText('Condition is required')
  })
})
