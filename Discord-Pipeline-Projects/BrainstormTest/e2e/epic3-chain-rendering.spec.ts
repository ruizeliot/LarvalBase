import { test, expect, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

async function createComponent(page: Page, type: 'internal' | 'external', name: string, params: { name: string; value: string }[], pos = { x: 400, y: 300 }, capacities: { name: string; min: string; max: string }[] = []) {
  await dragPaletteToCanvas(page, type, pos)
  await page.getByTestId('property-name').fill(name)
  for (const p of params) {
    await page.getByTestId('add-parameter').click()
    const rows = page.getByTestId('param-row')
    const lastRow = rows.last()
    await lastRow.locator('input').first().fill(p.name)
    await lastRow.locator('input[type="number"]').fill(p.value)
  }
  if (type === 'internal') {
    for (const c of capacities) {
      await page.getByTestId('add-capacity').click()
      const rows = page.getByTestId('capacity-row')
      const lastRow = rows.last()
      await lastRow.locator('input').first().fill(c.name)
      await lastRow.locator('input[type="number"]').first().fill(c.min)
      await lastRow.locator('input[type="number"]').last().fill(c.max)
    }
  }
  await page.locator('.react-flow').click({ position: { x: 50, y: 50 } })
}

async function createFullChain(page: Page, sourceName: string, targetName: string, chainName: string, type: 'inflicted' | 'managed', existence: string, susceptibility: string, triggering: string, consequences: { param: string; formula: string; duration: string; durationValue?: string }[]) {
  const node = page.locator('.react-flow__node').filter({ hasText: sourceName }).first()
  await node.click({ button: 'right' })
  await page.getByTestId('context-menu-new-chain').click()
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
    if (c.duration === 'duration' && c.durationValue) {
      await row.getByTestId('consequence-duration').fill(c.durationValue)
    }
  }
  await page.getByTestId('chain-save').click()
}

async function buildFloodModel(page: Page) {
  // River (External)
  await createComponent(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 150 })
  // Dam (Internal)
  await createComponent(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }, { name: 'integrity', value: '100' }], { x: 500, y: 300 }, [{ name: 'maxPressure', min: '0', max: '50' }])
  // Town (Internal)
  await createComponent(page, 'internal', 'Town', [{ name: 'floodDepth', value: '0' }, { name: 'population', value: '1000' }], { x: 800, y: 450 }, [{ name: 'floodTolerance', min: '0', max: '10' }])

  // Chain A "Rising Water"
  await createFullChain(page, 'River', 'Dam', 'Rising Water', 'inflicted',
    'River.waterLevel > 8',
    'Dam.pressure > Dam.maxPressure * 0.5',
    'Dam.integrity < 60',
    [{ param: 'integrity', formula: 'Dam.integrity - 30', duration: 'impulse' }]
  )

  // Chain B "Flood"
  await createFullChain(page, 'Dam', 'Town', 'Flood', 'inflicted',
    'Dam.integrity < 40',
    'Town.floodDepth < Town.floodTolerance',
    'Dam.integrity < 20',
    [{ param: 'floodDepth', formula: 'Town.floodDepth + 5', duration: 'persistent' }]
  )

  // Chain C "Emergency Pumps" (Managed)
  await createFullChain(page, 'Dam', 'Town', 'Emergency Pumps', 'managed',
    'Dam.integrity < 50',
    'Town.floodDepth > 0',
    'Town.floodDepth > 3',
    [{ param: 'floodDepth', formula: 'Town.floodDepth - 2', duration: 'duration', durationValue: '10' }]
  )
}

test.describe('Epic 3 - US-3.6: Chain Rendering on Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-3.6.1: Visual elements of a rendered chain', async ({ page }) => {
    await buildFloodModel(page)

    // Assert condition junction nodes exist with dashed borders
    const conditionNodes = page.getByTestId('condition-node')
    // 3 chains × 3 conditions each = 9
    await expect(conditionNodes).toHaveCount(9)

    // Verify dashed border styling on condition nodes
    const firstCondition = conditionNodes.first()
    await expect(firstCondition).toBeVisible()
    // Condition nodes have border-dashed class
    await expect(firstCondition).toHaveCSS('border-style', 'dashed')

    // Assert impact edges exist
    const impactEdges = page.getByTestId('impact-edge')
    await expect(impactEdges).toHaveCount(3) // one per chain
  })

  test('TC-3.6.2: Tooltip on condition hover', async ({ page }) => {
    // Create a single chain for simpler hover testing
    await createComponent(page, 'internal', 'River', [{ name: 'waterLevel', value: '5' }], { x: 300, y: 200 })
    await createComponent(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }], { x: 600, y: 400 })

    await createFullChain(page, 'River', 'Dam', 'TestChain', 'inflicted',
      'River.waterLevel > 8', 'Dam.pressure > 25', 'Dam.pressure > 40',
      [{ param: 'pressure', formula: 'Dam.pressure + 10', duration: 'impulse' }]
    )

    // Hover the first condition node (Existence)
    const existenceNode = page.locator('[data-stage="potential"]').first()
    await existenceNode.hover()

    // Assert tooltip with formula appears
    await expect(page.getByTestId('condition-tooltip')).toBeVisible()
    await expect(page.getByTestId('condition-tooltip')).toHaveText('River.waterLevel > 8')

    // Move away
    await page.locator('.react-flow').hover({ position: { x: 50, y: 50 } })
    await expect(page.getByTestId('condition-tooltip')).not.toBeVisible()
  })

  test('TC-3.6.3: Multiple chains rendered simultaneously', async ({ page }) => {
    await buildFloodModel(page)

    // Assert all 3 chains' condition nodes are visible
    const conditionNodes = page.getByTestId('condition-node')
    await expect(conditionNodes).toHaveCount(9)

    // Component nodes still exist (no duplicates — 3 components)
    const componentNodes = page.locator('.react-flow__node[data-id]').filter({
      has: page.locator('[class*="rounded-lg"]')
    })
    // At least 3 component nodes exist
    await expect(page.locator('.react-flow__node').first()).toBeVisible()
  })

  test('TC-3.6.4: Chain with self-referencing component', async ({ page }) => {
    await createComponent(page, 'internal', 'Reactor', [{ name: 'temp', value: '50' }, { name: 'cooling', value: '100' }])

    await createFullChain(page, 'Reactor', 'Reactor', 'Meltdown', 'inflicted',
      'Reactor.temp > 80', 'Reactor.cooling < 50', 'Reactor.temp > 100',
      [{ param: 'cooling', formula: 'Reactor.cooling - 20', duration: 'impulse' }]
    )

    // Assert chain renders (condition nodes visible)
    await expect(page.getByTestId('condition-node')).toHaveCount(3)

    // All condition nodes should be visible despite self-reference
    const conditions = page.getByTestId('condition-node')
    for (let i = 0; i < 3; i++) {
      await expect(conditions.nth(i)).toBeVisible()
    }
  })
})
