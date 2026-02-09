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
  // Deselect
  await page.locator('.react-flow').click({ position: { x: 50, y: 50 } })
}

async function openChainBuilderFrom(page: Page, nodeName: string) {
  const node = page.locator('.react-flow__node').filter({ hasText: nodeName }).first()
  await node.click({ button: 'right' })
  await page.getByTestId('context-menu-new-chain').click()
}

async function createFullChain(page: Page, sourceName: string, targetName: string, chainName: string, type: 'inflicted' | 'managed', existence: string, susceptibility: string, triggering: string, consequences: { param: string; formula: string; duration: string }[]) {
  await openChainBuilderFrom(page, sourceName)
  await page.getByTestId('chain-name').fill(chainName)
  await page.getByTestId(`chain-type-${type}`).click()
  await page.getByTestId('formula-editor-existence').fill(existence)
  await page.getByTestId('target-selector').selectOption({ label: targetName })
  await page.getByTestId('formula-editor-susceptibility').fill(susceptibility)
  await page.getByTestId('formula-editor-triggering').fill(triggering)
  for (const c of consequences) {
    await page.getByTestId('add-consequence').click()
    const row = page.getByTestId('consequence-row').last()
    await row.getByTestId('consequence-param').selectOption({ label: c.param })
    await row.getByTestId('consequence-formula').fill(c.formula)
    if (c.duration !== 'impulse') {
      await row.getByTestId(`duration-${c.duration}`).click()
    }
  }
  await page.getByTestId('chain-save').click()
}

test.describe('Epic 3 - US-3.2: Select Chain Type', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-3.2.1: Inflicted type proceeds directly to Stage 1', async ({ page }) => {
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }])
    await openChainBuilderFrom(page, 'Alpha')

    // Select Inflicted
    await page.getByTestId('chain-type-inflicted').click()

    // Assert no Mitigates dropdown
    await expect(page.getByTestId('chain-mitigates-section')).not.toBeVisible()

    // Assert Stage 1 fields are visible
    await expect(page.getByTestId('stage-1-section')).toBeVisible()
    await expect(page.getByTestId('formula-editor-existence')).toBeVisible()
  })

  test('TC-3.2.2: Managed type shows mitigates dropdown with existing chains', async ({ page }) => {
    // Create two components
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }], { x: 300, y: 200 })
    await createComponent(page, 'internal', 'Beta', [{ name: 'hp', value: '100' }], { x: 600, y: 400 })

    // Create an existing inflicted chain
    await createFullChain(page, 'Alpha', 'Beta', 'TestChain', 'inflicted', 'Alpha.x > 0', 'Beta.hp > 50', 'Beta.hp < 80', [{ param: 'hp', formula: 'Beta.hp - 10', duration: 'impulse' }])

    // Now open chain builder for a Managed chain from Alpha
    await openChainBuilderFrom(page, 'Alpha')

    // Select Managed
    await page.getByTestId('chain-type-managed').click()

    // Assert Mitigates dropdown appears
    await expect(page.getByTestId('chain-mitigates-section')).toBeVisible()
    await expect(page.getByTestId('chain-mitigates-select')).toBeVisible()

    // Assert dropdown lists the existing chain
    const options = page.getByTestId('chain-mitigates-select').locator('option')
    await expect(options).toHaveCount(2) // "Select chain..." + "TestChain"

    // Assert Stage 1 fields are visible
    await expect(page.getByTestId('formula-editor-existence')).toBeVisible()
  })

  test('TC-3.2.3: Managed with no existing chains to mitigate', async ({ page }) => {
    await createComponent(page, 'internal', 'Alpha', [{ name: 'x', value: '1' }])
    await openChainBuilderFrom(page, 'Alpha')

    // Select Managed
    await page.getByTestId('chain-type-managed').click()

    // Assert Mitigates dropdown appears but shows "No chains available"
    await expect(page.getByTestId('chain-mitigates-section')).toBeVisible()
    const select = page.getByTestId('chain-mitigates-select')
    await expect(select).toBeVisible()
    await expect(select.locator('option').first()).toHaveText('No chains available')
  })
})
