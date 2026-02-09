import { test, expect, type Page } from '@playwright/test'

/** Helper: drag a component type from palette onto the canvas */
async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

/** Helper: switch to a specific tab */
async function switchTab(page: Page, tab: 'Editor' | 'Scenarios' | 'Simulate') {
  await page.getByTestId(`tab-${tab.toLowerCase()}`).click()
}

/** Helper: create a component with parameters via UI */
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
    const nameField = lastRow.locator('input').first()
    await nameField.clear()
    await nameField.fill(param.name)
    const valueField = lastRow.locator('input[type="number"]')
    await valueField.clear()
    await valueField.fill(param.value)
  }
  await page.locator('.react-flow__pane').click({ position: { x: 50, y: 50 } })
}

/** Helper: create a causal chain via the chain builder UI */
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

/** Helper: add a forced event to the current scenario */
async function addForcedEvent(
  page: Page,
  componentName: string,
  paramName: string,
  value: string,
  time: string
) {
  await page.getByTestId('add-forced-event').click()
  const row = page.locator('[data-testid^="event-row-"]').last()
  await row.locator('select').first().selectOption({ label: componentName })
  await row.locator('select').nth(1).selectOption({ label: paramName })
  await row.locator('input[type="number"]').first().clear()
  await row.locator('input[type="number"]').first().fill(value)
  await row.locator('input[type="number"]').nth(1).clear()
  await row.locator('input[type="number"]').nth(1).fill(time)
}

test.describe('Epic 5 - US-5.5: Cascading Effect Propagation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-5.5.1: Chain A triggers Chain B via parameter modification', async ({ page }) => {
    // Create components
    await createComponent(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'integrity', value: '100' }], { x: 500, y: 200 })
    await createComponent(page, 'internal', 'Town', [{ name: 'floodDepth', value: '0' }], { x: 500, y: 400 })

    // Chain A: River → Dam (when waterLevel > 8, reduce integrity)
    await createChain(page, 'River', {
      name: 'Rising Water',
      type: 'inflicted',
      existence: 'River.waterLevel > 8',
      targetName: 'Dam',
      susceptibility: '1 > 0',
      triggering: 'River.waterLevel > 8',
      consequences: [{ param: 'integrity', formula: 'Dam.integrity - 30', durationType: 'impulse' }],
    })

    // Chain B: Dam → Town (when integrity < 80, increase floodDepth)
    await createChain(page, 'Dam', {
      name: 'Flood',
      type: 'inflicted',
      existence: 'Dam.integrity < 80',
      targetName: 'Town',
      susceptibility: '1 > 0',
      triggering: 'Dam.integrity < 80',
      consequences: [{ param: 'floodDepth', formula: 'Town.floodDepth + 5', durationType: 'persistent' }],
    })

    // Create scenario: River.waterLevel = 10 at t=1
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'River', 'waterLevel', '10', '1')

    // Run simulation by stepping forward
    await switchTab(page, 'Simulate')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('sim-step-forward').click()
    }

    // Event log should show cascade events for both chains
    const eventLog = page.getByTestId('sim-event-log')
    await expect(eventLog).toContainText('[cascade]')
    await expect(eventLog).toContainText('Dam.integrity')
    await expect(eventLog).toContainText('Town.floodDepth')
  })

  test('TC-5.5.3: Impulse consequence fires once', async ({ page }) => {
    // Create components
    await createComponent(page, 'external', 'Source', [{ name: 'level', value: '0' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Target', [{ name: 'health', value: '100' }], { x: 500, y: 200 })

    // Chain: Source → Target (level > 5 → health decreases by 20, impulse)
    await createChain(page, 'Source', {
      name: 'Damage',
      type: 'inflicted',
      existence: 'Source.level > 5',
      targetName: 'Target',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 5',
      consequences: [{ param: 'health', formula: 'Target.health - 20', durationType: 'impulse' }],
    })

    // Create scenario: Source.level = 10 at t=1
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'Source', 'level', '10', '1')

    // Run simulation and step to t=5
    await switchTab(page, 'Simulate')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('sim-step-forward').click()
    }

    // Count cascade events for Target.health — impulse should fire exactly once
    const cascadeEntries = page.getByTestId('sim-event-log')
      .locator('div')
      .filter({ hasText: '[cascade]' })
      .filter({ hasText: 'Target.health' })
    const count = await cascadeEntries.count()
    expect(count).toBe(1)
  })

  test('TC-5.5.6: Cascading stops when no new conditions trigger', async ({ page }) => {
    // Create components where Chain B's conditions are never met
    await createComponent(page, 'external', 'Source', [{ name: 'level', value: '0' }], { x: 200, y: 200 })
    await createComponent(page, 'internal', 'Mid', [{ name: 'val', value: '50' }], { x: 500, y: 200 })
    await createComponent(page, 'internal', 'End', [{ name: 'result', value: '0' }], { x: 500, y: 400 })

    // Chain A: Source → Mid (level > 5 → val increases by 10)
    await createChain(page, 'Source', {
      name: 'Bump',
      type: 'inflicted',
      existence: 'Source.level > 5',
      targetName: 'Mid',
      susceptibility: '1 > 0',
      triggering: 'Source.level > 5',
      consequences: [{ param: 'val', formula: 'Mid.val + 10', durationType: 'impulse' }],
    })

    // Chain B: Mid → End (val < 20 → result = 1) — never triggers because val starts at 50 and goes up
    await createChain(page, 'Mid', {
      name: 'Never',
      type: 'inflicted',
      existence: 'Mid.val < 20',
      targetName: 'End',
      susceptibility: '1 > 0',
      triggering: 'Mid.val < 20',
      consequences: [{ param: 'result', formula: '1', durationType: 'persistent' }],
    })

    // Create scenario: Source.level = 10 at t=1
    await switchTab(page, 'Scenarios')
    await page.getByTestId('create-scenario').click()
    await addForcedEvent(page, 'Source', 'level', '10', '1')

    // Run simulation
    await switchTab(page, 'Simulate')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('sim-step-forward').click()
    }

    // Event log should have Chain A cascade but NOT Chain B
    const eventLog = page.getByTestId('sim-event-log')
    await expect(eventLog).toContainText('[cascade]')
    await expect(eventLog).toContainText('Mid.val')
    await expect(eventLog).not.toContainText('End.result')
  })
})
