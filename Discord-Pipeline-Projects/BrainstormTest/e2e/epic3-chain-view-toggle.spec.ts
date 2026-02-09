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
  await createComponent(page, 'external', 'River', [{ name: 'waterLevel', value: '5' }], { x: 200, y: 150 })
  await createComponent(page, 'internal', 'Dam', [{ name: 'pressure', value: '2' }, { name: 'integrity', value: '100' }], { x: 500, y: 300 }, [{ name: 'maxPressure', min: '0', max: '50' }])
  await createComponent(page, 'internal', 'Town', [{ name: 'floodDepth', value: '0' }, { name: 'population', value: '1000' }], { x: 800, y: 450 }, [{ name: 'floodTolerance', min: '0', max: '10' }])

  await createFullChain(page, 'River', 'Dam', 'Rising Water', 'inflicted',
    'River.waterLevel > 8', 'Dam.pressure > Dam.maxPressure * 0.5', 'Dam.integrity < 60',
    [{ param: 'integrity', formula: 'Dam.integrity - 30', duration: 'impulse' }]
  )

  await createFullChain(page, 'Dam', 'Town', 'Flood', 'inflicted',
    'Dam.integrity < 40', 'Town.floodDepth < Town.floodTolerance', 'Dam.integrity < 20',
    [{ param: 'floodDepth', formula: 'Town.floodDepth + 5', duration: 'persistent' }]
  )

  await createFullChain(page, 'Dam', 'Town', 'Emergency Pumps', 'managed',
    'Dam.integrity < 50', 'Town.floodDepth > 0', 'Town.floodDepth > 3',
    [{ param: 'floodDepth', formula: 'Town.floodDepth - 2', duration: 'duration', durationValue: '10' }]
  )
}

test.describe('Epic 3 - US-3.7: Toggle Detailed / Compact Chain View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.react-flow')
  })

  test('TC-3.7.1: Switch from detailed to compact view', async ({ page }) => {
    await buildFloodModel(page)

    // Assert default view is detailed (junction nodes visible)
    const conditionNodes = page.getByTestId('condition-node')
    await expect(conditionNodes).toHaveCount(9)

    // Click the view toggle button
    const toggle = page.getByTestId('chain-view-toggle')
    await expect(toggle).toBeVisible()
    await expect(toggle).toContainText('Compact')
    await toggle.click()

    // Assert compact view: junction condition nodes are hidden
    await expect(conditionNodes).toHaveCount(0)

    // Assert component nodes are still visible
    await expect(page.locator('.react-flow__node').first()).toBeVisible()

    // Assert toggle now shows "Detailed"
    await expect(toggle).toContainText('Detailed')
  })

  test('TC-3.7.2: Switch back from compact to detailed view', async ({ page }) => {
    await buildFloodModel(page)

    // Switch to compact
    const toggle = page.getByTestId('chain-view-toggle')
    await toggle.click()
    await expect(page.getByTestId('condition-node')).toHaveCount(0)

    // Switch back to detailed
    await toggle.click()

    // Assert detailed view restores junction nodes
    await expect(page.getByTestId('condition-node')).toHaveCount(9)

    // Assert impact edges are back
    const impactEdges = page.getByTestId('impact-edge')
    await expect(impactEdges).toHaveCount(3)

    // Toggle button shows "Compact" again
    await expect(toggle).toContainText('Compact')
  })

  test('TC-3.7.3: Toggle applies to all chains simultaneously', async ({ page }) => {
    await buildFloodModel(page)

    // In detailed view: 9 junction nodes (3 chains × 3 conditions)
    await expect(page.getByTestId('condition-node')).toHaveCount(9)

    // Switch to compact
    await page.getByTestId('chain-view-toggle').click()

    // ALL junction nodes hidden
    await expect(page.getByTestId('condition-node')).toHaveCount(0)

    // All 3 chains show compact representation (3 compact edges)
    const edges = page.locator('.react-flow__edge')
    await expect(edges).toHaveCount(3)
  })

  test('TC-3.7.4: Toggle with no chains on canvas', async ({ page }) => {
    await createComponent(page, 'internal', 'Lone', [{ name: 'x', value: '1' }])

    // Click toggle — should not error
    const toggle = page.getByTestId('chain-view-toggle')
    await expect(toggle).toBeVisible()
    await toggle.click()

    // Toggle state changes (button text updates)
    await expect(toggle).toContainText('Detailed')

    // Component still visible
    const nodes = page.locator('.react-flow__node')
    await expect(nodes.first()).toBeVisible()

    // Click again to toggle back
    await toggle.click()
    await expect(toggle).toContainText('Compact')
  })
})
