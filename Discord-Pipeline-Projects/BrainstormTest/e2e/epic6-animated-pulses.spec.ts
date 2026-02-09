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

test.describe('Epic 6 - US-6.1: Animated Pulses on Chain Edges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-6.1.1: Pulse appears when chain stage activates', async ({ page }) => {
    // Build model
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

    // Create scenario with forced event
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'River', 'waterLevel', '10', '1')

    // Switch to simulate and step forward to trigger chain
    await switchTab(page, 'Simulate')
    for (let i = 0; i < 3; i++) {
      await page.getByTestId('sim-step-forward').click()
    }

    // Assert pulse element appears
    const pulses = page.locator('[data-testid="chain-pulse"]')
    await expect(pulses.first()).toBeVisible()
  })

  test('TC-6.1.2: Multiple simultaneous pulses', async ({ page }) => {
    // Build model with 2 chains
    await createComponent(page, 'external', 'Source', [{ name: 'level', value: '0' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Mid', [{ name: 'val', value: '100' }], { x: 500, y: 200 })
    await createComponent(page, 'internal', 'End', [{ name: 'hp', value: '100' }], { x: 500, y: 400 })

    await createChain(page, 'Source', {
      name: 'Chain A',
      type: 'inflicted',
      existence: 'Source.level > 5',
      targetName: 'Mid',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 5',
      consequences: [{ param: 'val', formula: 'Mid.val - 30', durationType: 'impulse' }],
    })

    await createChain(page, 'Source', {
      name: 'Chain B',
      type: 'inflicted',
      existence: 'Source.level > 5',
      targetName: 'End',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 5',
      consequences: [{ param: 'hp', formula: 'End.hp - 20', durationType: 'impulse' }],
    })

    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'Source', 'level', '10', '1')

    await switchTab(page, 'Simulate')

    // Play and wait for pulses to appear (chains activate)
    await page.getByTestId('sim-play-button').click()

    // Wait for at least 2 pulse elements to appear
    const pulses = page.locator('[data-testid="chain-pulse"]')
    await expect(async () => {
      const count = await pulses.count()
      expect(count).toBeGreaterThanOrEqual(2)
    }).toPass({ timeout: 10000 })
  })

  test('TC-6.1.3: Pulse freezes on pause', async ({ page }) => {
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

    // Wait for a pulse to appear
    const pulses = page.locator('[data-testid="chain-pulse"]')
    await expect(pulses.first()).toBeVisible({ timeout: 5000 })

    // Pause
    await page.getByTestId('sim-pause-button').click()

    // Verify pulse still visible and animation paused
    await expect(pulses.first()).toBeVisible()

    // Check animation is paused via CSS
    const animState = await pulses.first().evaluate((el) => {
      return window.getComputedStyle(el).animationPlayState
    })
    expect(animState).toBe('paused')
  })

  test('TC-6.1.4: Pulse at maximum speed (4x)', async ({ page }) => {
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

    // Set speed to 4x
    await page.getByTestId('sim-speed-slider').fill('4')

    // Play simulation
    await page.getByTestId('sim-play-button').click()

    // Wait for pulse to appear (should still be visible at 4x)
    const pulses = page.locator('[data-testid="chain-pulse"]')
    await expect(pulses.first()).toBeVisible({ timeout: 5000 })
  })
})
