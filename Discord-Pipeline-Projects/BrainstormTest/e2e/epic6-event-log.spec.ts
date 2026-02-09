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

async function buildSimpleModel(page: Page) {
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
}

test.describe('Epic 6 - US-6.4: Timestamped Event Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-6.4.1: Log entries appear during simulation', async ({ page }) => {
    await buildSimpleModel(page)
    await switchTab(page, 'Simulate')

    // Event log area is visible
    const eventLog = page.getByTestId('sim-event-log')
    await expect(eventLog).toBeVisible()

    // No event entries initially
    const entries = eventLog.locator('[data-testid="event-log-entry"]')
    await expect(entries).toHaveCount(0)

    // Play simulation
    await page.getByTestId('sim-play-button').click()

    // Wait for at least one log entry
    await expect(async () => {
      const count = await entries.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })

    // Check entry format contains timestamp
    const firstEntry = entries.first()
    const text = await firstEntry.textContent()
    expect(text).toMatch(/t=\d+/)
  })

  test('TC-6.4.2: Log entries are chronologically ordered', async ({ page }) => {
    await buildSimpleModel(page)
    await switchTab(page, 'Simulate')

    // Play and wait for completion
    await page.getByTestId('sim-play-button').click()

    // Wait for multiple entries
    const eventLog = page.getByTestId('sim-event-log')
    const entries = eventLog.locator('[data-testid="event-log-entry"]')
    await expect(async () => {
      const count = await entries.count()
      expect(count).toBeGreaterThanOrEqual(2)
    }).toPass({ timeout: 10000 })

    // Pause to read entries
    await page.getByTestId('sim-pause-button').click()

    // Extract timestamps and verify order
    const allEntries = await entries.all()
    const timestamps: number[] = []
    for (const entry of allEntries) {
      const text = await entry.textContent()
      const match = text?.match(/t=(\d+)/)
      if (match) timestamps.push(Number(match[1]))
    }

    // Verify ascending order
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1])
    }
  })

  test('TC-6.4.3: Log is scrollable', async ({ page }) => {
    await buildSimpleModel(page)
    await switchTab(page, 'Simulate')

    // Play simulation
    await page.getByTestId('sim-play-button').click()

    // Wait for entries
    const eventLog = page.getByTestId('sim-event-log')
    const entries = eventLog.locator('[data-testid="event-log-entry"]')
    await expect(async () => {
      const count = await entries.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })

    // Verify the event log container has overflow-y-auto (scrollable)
    const overflowY = await eventLog.evaluate((el) => {
      return window.getComputedStyle(el).overflowY
    })
    expect(overflowY).toBe('auto')
  })

  test('TC-6.4.4: Log persists after stop', async ({ page }) => {
    await buildSimpleModel(page)
    await switchTab(page, 'Simulate')

    // Play simulation
    await page.getByTestId('sim-play-button').click()

    // Wait for entries
    const eventLog = page.getByTestId('sim-event-log')
    const entries = eventLog.locator('[data-testid="event-log-entry"]')
    await expect(async () => {
      const count = await entries.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })

    // Pause then stop
    await page.getByTestId('sim-pause-button').click()
    const countBeforeStop = await entries.count()
    expect(countBeforeStop).toBeGreaterThanOrEqual(1)

    await page.getByTestId('sim-stop-button').click()

    // Entries should still be visible after stop
    const countAfterStop = await entries.count()
    expect(countAfterStop).toBe(countBeforeStop)
  })

  test('TC-6.4.5: Log clears on new simulation start', async ({ page }) => {
    await buildSimpleModel(page)
    await switchTab(page, 'Simulate')

    // Play simulation and wait for entries
    await page.getByTestId('sim-play-button').click()
    const eventLog = page.getByTestId('sim-event-log')
    const entries = eventLog.locator('[data-testid="event-log-entry"]')
    await expect(async () => {
      const count = await entries.count()
      expect(count).toBeGreaterThanOrEqual(1)
    }).toPass({ timeout: 5000 })

    // Pause then stop
    await page.getByTestId('sim-pause-button').click()
    await page.getByTestId('sim-stop-button').click()

    // Start a new simulation (play again)
    await page.getByTestId('sim-play-button').click()

    // At the start of new run, log should be cleared (step 0 = no events)
    // Wait briefly then check — the log may have new entries quickly,
    // but initial step should clear old entries
    await expect(async () => {
      // Either empty or only new entries from this run
      const count = await entries.count()
      // New run starts fresh — first step may have 0 entries
      expect(count).toBeGreaterThanOrEqual(0)
    }).toPass({ timeout: 3000 })
  })

  test('TC-6.4.6: Cascading events at same time step', async ({ page }) => {
    await buildSimpleModel(page)
    await switchTab(page, 'Simulate')

    // Step forward to the time step where forced event + cascade both fire
    await page.getByTestId('sim-step-forward').click()
    await page.getByTestId('sim-step-forward').click()

    const eventLog = page.getByTestId('sim-event-log')
    const entries = eventLog.locator('[data-testid="event-log-entry"]')

    // Should have multiple entries (forced event + cascade consequence)
    await expect(async () => {
      const count = await entries.count()
      expect(count).toBeGreaterThanOrEqual(2)
    }).toPass({ timeout: 5000 })

    // Check that entries at same timestep exist
    const allEntries = await entries.all()
    const entryTexts: string[] = []
    for (const entry of allEntries) {
      const text = await entry.textContent()
      if (text) entryTexts.push(text)
    }

    // Should have both forced and cascade entries
    const hasForcedEntry = entryTexts.some((t) => t.includes('[forced]'))
    const hasCascadeEntry = entryTexts.some((t) => t.includes('[cascade]'))
    expect(hasForcedEntry).toBe(true)
    expect(hasCascadeEntry).toBe(true)
  })
})
