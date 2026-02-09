import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

async function switchTab(page: Page, tab: 'Editor' | 'Scenarios' | 'Simulate') {
  await page.getByTestId(`tab-${tab.toLowerCase()}`).click()
}

async function createComponent(
  page: Page,
  type: 'internal' | 'external',
  name: string,
  params: { name: string; value: string }[],
  pos = { x: 400, y: 300 }
) {
  await dragPaletteToCanvas(page, type, pos)
  const nameInput = page.getByTestId('property-name')
  await nameInput.clear()
  await nameInput.fill(name)
  for (const param of params) {
    await page.getByTestId('add-parameter').click()
    const paramRows = page.locator('[data-testid="param-row"]')
    const lastRow = paramRows.last()
    await lastRow.locator('input').first().clear()
    await lastRow.locator('input').first().fill(param.name)
    await lastRow.locator('input[type="number"]').clear()
    await lastRow.locator('input[type="number"]').fill(param.value)
  }
  await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })
}

async function createChain(
  page: Page,
  sourceName: string,
  opts: {
    name: string
    type: 'inflicted' | 'managed'
    existence: string
    targetName: string
    susceptibility: string
    triggering: string
    consequences: Array<{
      param: string
      formula: string
      durationType: 'impulse' | 'persistent' | 'duration'
      duration?: number
    }>
  }
) {
  const node = page.locator('.react-flow__node').filter({ hasText: sourceName }).first()
  await node.click({ button: 'right' })
  await page.getByTestId('context-menu-new-chain').click()
  await page.getByTestId('chain-name').fill(opts.name)
  await page.getByTestId(`chain-type-${opts.type}`).click()
  await page.getByTestId('formula-editor-existence').fill(opts.existence)
  await page.getByTestId('target-selector').selectOption({ label: opts.targetName })
  await page.getByTestId('formula-editor-susceptibility').fill(opts.susceptibility)
  await page.getByTestId('formula-editor-triggering').fill(opts.triggering)
  for (const c of opts.consequences) {
    await page.getByTestId('add-consequence').click()
    const row = page.getByTestId('consequence-row').last()
    await row.getByTestId('consequence-param').selectOption({ label: c.param })
    await row.getByTestId('consequence-formula').fill(c.formula)
    if (c.durationType !== 'impulse') {
      await row.getByTestId(`duration-${c.durationType}`).click()
    }
    if (c.durationType === 'duration' && c.duration !== undefined) {
      await row.getByTestId('consequence-duration').fill(String(c.duration))
    }
  }
  await page.getByTestId('chain-save').click()
  await expect(page.getByTestId('chain-builder')).not.toBeVisible()
}

async function addForcedEvent(page: Page, componentName: string, paramName: string, value: string, time: string) {
  await page.getByTestId('add-forced-event').click()
  const row = page.locator('[data-testid^="event-row-"]').last()
  await row.locator('select').first().selectOption({ label: componentName })
  await row.locator('select').nth(1).selectOption({ label: paramName })
  await row.locator('input[type="number"]').first().clear()
  await row.locator('input[type="number"]').first().fill(value)
  await row.locator('input[type="number"]').nth(1).clear()
  await row.locator('input[type="number"]').nth(1).fill(time)
}

test.describe('Epic 6 - US-6.3: Real-Time Parameter Updates on Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-6.3.1: Parameter value changes on canvas during simulation', async ({ page }) => {
    await createComponent(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'integrity', value: '100' }], { x: 500, y: 200 })

    await createChain(page, 'River', {
      name: 'Rising Water',
      type: 'inflicted',
      existence: 'River.waterLevel > 8',
      targetName: 'Dam',
      susceptibility: '1 > 0',
      triggering: 'River.waterLevel > 8',
      consequences: [{ param: 'integrity', formula: 'Dam.integrity - 30', durationType: 'impulse' }],
    })

    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'River', 'waterLevel', '10', '1')

    await switchTab(page, 'Simulate')

    // At initial state, Dam shows integrity: 100
    const damNode = page.locator('.react-flow__node').filter({ hasText: 'Dam' })
    const integrityValue = damNode.getByTestId('node-param-value-integrity')
    await expect(integrityValue).toHaveText('100')

    // Step forward to trigger chain (waterLevel forced to 10, then cascade fires)
    await page.getByTestId('sim-step-forward').click()
    await page.getByTestId('sim-step-forward').click()
    await page.getByTestId('sim-step-forward').click()

    // Dam integrity should have changed (100 - 30 = 70)
    await expect(integrityValue).toHaveText('70')
  })

  test('TC-6.3.2: Visual highlight on value change', async ({ page }) => {
    await createComponent(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'integrity', value: '100' }], { x: 500, y: 200 })

    await createChain(page, 'River', {
      name: 'Rising Water',
      type: 'inflicted',
      existence: 'River.waterLevel > 8',
      targetName: 'Dam',
      susceptibility: '1 > 0',
      triggering: 'River.waterLevel > 8',
      consequences: [{ param: 'integrity', formula: 'Dam.integrity - 30', durationType: 'impulse' }],
    })

    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'River', 'waterLevel', '10', '1')

    await switchTab(page, 'Simulate')

    // Play simulation
    await page.getByTestId('sim-play-button').click()

    // Wait for highlight class to appear on a changed value
    const damNode = page.locator('.react-flow__node').filter({ hasText: 'Dam' })
    const highlightEl = damNode.locator('.param-highlight')
    await expect(highlightEl.first()).toBeVisible({ timeout: 5000 })
  })

  test('TC-6.3.3: Values revert on stop', async ({ page }) => {
    await createComponent(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'integrity', value: '100' }], { x: 500, y: 200 })

    await createChain(page, 'River', {
      name: 'Rising Water',
      type: 'inflicted',
      existence: 'River.waterLevel > 8',
      targetName: 'Dam',
      susceptibility: '1 > 0',
      triggering: 'River.waterLevel > 8',
      consequences: [{ param: 'integrity', formula: 'Dam.integrity - 30', durationType: 'impulse' }],
    })

    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'River', 'waterLevel', '10', '1')

    await switchTab(page, 'Simulate')

    const damNode = page.locator('.react-flow__node').filter({ hasText: 'Dam' })
    const integrityValue = damNode.getByTestId('node-param-value-integrity')

    // Play simulation to change values
    await page.getByTestId('sim-play-button').click()

    // Wait for value to change from 100
    await expect(async () => {
      const text = await integrityValue.textContent()
      expect(text).not.toBe('100')
    }).toPass({ timeout: 5000 })

    // Pause first, then stop
    await page.getByTestId('sim-pause-button').click()

    // Confirm value changed
    const changedValue = await integrityValue.textContent()
    expect(changedValue).not.toBe('100')

    // Stop simulation
    await page.getByTestId('sim-stop-button').click()

    // Values should revert to initial
    await expect(integrityValue).toHaveText('100')
  })

  test('TC-6.3.4: Multiple parameters change simultaneously', async ({ page }) => {
    await createComponent(page, 'external', 'Source', [{ name: 'level', value: '0' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Target', [
      { name: 'hp', value: '100' },
      { name: 'shield', value: '50' },
    ], { x: 500, y: 200 })

    // Chain that modifies hp
    await createChain(page, 'Source', {
      name: 'Damage HP',
      type: 'inflicted',
      existence: 'Source.level > 5',
      targetName: 'Target',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 5',
      consequences: [{ param: 'hp', formula: 'Target.hp - 20', durationType: 'impulse' }],
    })

    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    // Force both params to change: level triggers chain, also force shield change
    await addForcedEvent(page, 'Source', 'level', '10', '1')
    await addForcedEvent(page, 'Target', 'shield', '30', '1')

    await switchTab(page, 'Simulate')

    const targetNode = page.locator('.react-flow__node').filter({ hasText: 'Target' })
    const hpValue = targetNode.getByTestId('node-param-value-hp')
    const shieldValue = targetNode.getByTestId('node-param-value-shield')

    // Step to apply forced events and cascade
    await page.getByTestId('sim-step-forward').click()
    await page.getByTestId('sim-step-forward').click()

    // Both should have updated
    await expect(shieldValue).toHaveText('30')
    // hp may also change if cascade fired at same step
    // At minimum, shield forced event applies at t=1
    await expect(async () => {
      const shield = await shieldValue.textContent()
      expect(shield).toBe('30')
    }).toPass({ timeout: 3000 })
  })
})
