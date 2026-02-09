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

test.describe('Epic 6 - US-6.2: Live Chain Status Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-6.2.1: All chains listed in left panel during simulation', async ({ page }) => {
    // Build model with 2 chains
    await createComponent(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'integrity', value: '100' }], { x: 500, y: 200 })
    await createComponent(page, 'internal', 'Town', [{ name: 'safety', value: '100' }], { x: 500, y: 400 })

    await createChain(page, 'River', {
      name: 'Rising Water',
      type: 'inflicted',
      existence: 'River.waterLevel > 8',
      targetName: 'Dam',
      susceptibility: '1 > 0',
      triggering: 'River.waterLevel > 8',
      consequences: [{ param: 'integrity', formula: 'Dam.integrity - 30', durationType: 'impulse' }],
    })

    await createChain(page, 'River', {
      name: 'Flood Risk',
      type: 'inflicted',
      existence: 'River.waterLevel > 10',
      targetName: 'Town',
      susceptibility: '1 > 0',
      triggering: 'River.waterLevel > 10',
      consequences: [{ param: 'safety', formula: 'Town.safety - 20', durationType: 'impulse' }],
    })

    // Create scenario
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'River', 'waterLevel', '5', '1')

    // Switch to simulate
    await switchTab(page, 'Simulate')

    // Assert chain status panel lists all chains
    const chainStatusPanel = page.getByTestId('chain-status-panel')
    await expect(chainStatusPanel).toBeVisible()

    const chainItems = chainStatusPanel.locator('[data-testid^="chain-status-"]')
    await expect(chainItems).toHaveCount(2)

    // Assert chain names visible
    await expect(page.getByText('Rising Water')).toBeVisible()
    await expect(page.getByText('Flood Risk')).toBeVisible()

    // Assert indicators show ○○○ at initial state (no simulation run yet)
    const risingWaterIndicators = page.getByTestId('chain-status-Rising Water').locator('[data-testid="stage-indicator"]')
    await expect(risingWaterIndicators).toHaveCount(3)
  })

  test('TC-6.2.2: Indicators transition through stages', async ({ page }) => {
    // Build model — chain with conditions that activate at different levels
    await createComponent(page, 'external', 'Source', [{ name: 'level', value: '0' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Target', [{ name: 'hp', value: '100' }], { x: 500, y: 200 })

    await createChain(page, 'Source', {
      name: 'TestChain',
      type: 'inflicted',
      existence: 'Source.level > 5',
      targetName: 'Target',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 5',
      consequences: [{ param: 'hp', formula: 'Target.hp - 10', durationType: 'impulse' }],
    })

    // Create scenario with forced event that triggers the chain
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'Source', 'level', '10', '1')

    await switchTab(page, 'Simulate')

    // Step forward to trigger chain
    await page.getByTestId('sim-step-forward').click()
    await page.getByTestId('sim-step-forward').click()

    // After chain activates, check that at least one filled indicator exists
    const chainItem = page.getByTestId('chain-status-TestChain')
    await expect(chainItem).toBeVisible()

    // Check for filled indicator (actuality stage reached since all conditions are true)
    const filledIndicators = chainItem.locator('[data-testid="stage-indicator-filled"]')
    await expect(async () => {
      const count = await filledIndicators.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })
  })

  test('TC-6.2.3: Multiple chains at different stages simultaneously', async ({ page }) => {
    // Chain A activates at level > 5, Chain B activates at level > 20
    await createComponent(page, 'external', 'Source', [{ name: 'level', value: '0' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'TargetA', [{ name: 'hp', value: '100' }], { x: 500, y: 200 })
    await createComponent(page, 'internal', 'TargetB', [{ name: 'hp', value: '100' }], { x: 500, y: 400 })

    await createChain(page, 'Source', {
      name: 'Chain A',
      type: 'inflicted',
      existence: 'Source.level > 5',
      targetName: 'TargetA',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 5',
      consequences: [{ param: 'hp', formula: 'TargetA.hp - 10', durationType: 'impulse' }],
    })

    await createChain(page, 'Source', {
      name: 'Chain B',
      type: 'inflicted',
      existence: 'Source.level > 20',
      targetName: 'TargetB',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 20',
      consequences: [{ param: 'hp', formula: 'TargetB.hp - 10', durationType: 'impulse' }],
    })

    // Forced event sets level to 10 — activates Chain A but not Chain B
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'Source', 'level', '10', '1')

    await switchTab(page, 'Simulate')

    // Step to trigger
    await page.getByTestId('sim-step-forward').click()
    await page.getByTestId('sim-step-forward').click()

    // Chain A should have filled indicators (active)
    const chainA = page.getByTestId('chain-status-Chain A')
    await expect(chainA).toBeVisible()
    const chainAFilled = chainA.locator('[data-testid="stage-indicator-filled"]')
    await expect(async () => {
      const count = await chainAFilled.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })

    // Chain B should have all empty indicators (not active, level=10 < 20)
    const chainB = page.getByTestId('chain-status-Chain B')
    await expect(chainB).toBeVisible()
    const chainBFilled = chainB.locator('[data-testid="stage-indicator-filled"]')
    const chainBFilledCount = await chainBFilled.count()
    expect(chainBFilledCount).toBe(0)
  })

  test('TC-6.2.4: Indicators reset on stop', async ({ page }) => {
    await createComponent(page, 'external', 'Source', [{ name: 'level', value: '0' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Target', [{ name: 'hp', value: '100' }], { x: 500, y: 200 })

    await createChain(page, 'Source', {
      name: 'TestChain',
      type: 'inflicted',
      existence: 'Source.level > 5',
      targetName: 'Target',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 5',
      consequences: [{ param: 'hp', formula: 'Target.hp - 10', durationType: 'impulse' }],
    })

    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'Source', 'level', '10', '1')

    await switchTab(page, 'Simulate')

    // Play to activate chain
    await page.getByTestId('sim-play-button').click()

    // Wait for filled indicator
    const chainItem = page.getByTestId('chain-status-TestChain')
    await expect(chainItem).toBeVisible()
    const filledIndicators = chainItem.locator('[data-testid="stage-indicator-filled"]')
    await expect(async () => {
      const count = await filledIndicators.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })

    // Stop simulation
    await page.getByTestId('sim-stop-button').click()

    // After stop, all indicators should be empty (reset to ○○○)
    await expect(async () => {
      const count = await filledIndicators.count()
      expect(count).toBe(0)
    }).toPass({ timeout: 3000 })
  })
})
