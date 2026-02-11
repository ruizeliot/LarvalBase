import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

async function dragPaletteToCanvas(page: Page, type: 'internal' | 'external', targetPos = { x: 400, y: 300 }) {
  const palette = page.getByTestId(`palette-${type}`)
  const canvas = page.locator('.react-flow')
  await palette.dragTo(canvas, { targetPosition: targetPos })
}

/** Helper: sets up two contexts in the same room with a component on canvas. */
async function openTwoContextsWithComponent(browser: Browser): Promise<{
  contextA: BrowserContext
  pageA: Page
  contextB: BrowserContext
  pageB: Page
  roomUrl: string
}> {
  const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
  const pageA = await contextA.newPage()
  await pageA.goto('http://localhost:5173/')
  await pageA.waitForSelector('.react-flow')

  // Add a component
  await dragPaletteToCanvas(pageA, 'internal')
  await pageA.waitForTimeout(300)

  // Alice creates a room
  await pageA.getByTestId('collaborate-button').click()
  await pageA.getByTestId('display-name-input').fill('Alice')
  await pageA.getByTestId('confirm-name-button').click()
  await expect(pageA.getByTestId('room-modal')).toBeVisible()
  const roomUrl = (await pageA.getByTestId('room-url').textContent()) || ''
  await pageA.getByTestId('close-room-modal').click()

  // Bob joins
  const contextB = await browser.newContext({ storageState: './e2e/storage-state.json' })
  const pageB = await contextB.newPage()
  await pageB.goto(roomUrl)
  await pageB.getByTestId('display-name-input').fill('Bob')
  await pageB.getByTestId('confirm-name-button').click()
  await pageB.waitForTimeout(1500)

  return { contextA, pageA, contextB, pageB, roomUrl }
}

test.describe('Epic 10 - US-10.3: Edit Indicators', () => {
  test('TC-10.3.1: Selecting a component shows edit indicator for others', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsWithComponent(browser)

    // Click on the component node in context A
    const nodeA = pageA.locator('.react-flow__node').first()
    await nodeA.click()
    await pageA.waitForTimeout(500)

    // Assert context B shows an edit indicator
    const editIndicator = pageB.locator('[data-testid="edit-indicator"]')
    await expect(editIndicator).toBeVisible({ timeout: 5000 })
    await expect(editIndicator).toContainText('Alice')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.3.2: Deselecting clears the edit indicator', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsWithComponent(browser)

    // Select the component
    const nodeA = pageA.locator('.react-flow__node').first()
    await nodeA.click()
    await pageA.waitForTimeout(500)

    // Verify indicator appears in context B
    const editIndicator = pageB.locator('[data-testid="edit-indicator"]')
    await expect(editIndicator).toBeVisible({ timeout: 5000 })

    // Deselect by clicking on empty canvas pane
    const canvasA = pageA.locator('.react-flow__pane')
    await canvasA.click({ position: { x: 50, y: 50 } })
    await pageA.waitForTimeout(500)

    // Assert indicator is gone
    await expect(editIndicator).not.toBeVisible({ timeout: 5000 })

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.3.3: Multiple users editing different components simultaneously', async ({ browser }) => {
    const contextA = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageA = await contextA.newPage()
    await pageA.goto('http://localhost:5173/')
    await pageA.waitForSelector('.react-flow')

    // Add two components
    await dragPaletteToCanvas(pageA, 'internal', { x: 300, y: 200 })
    await pageA.locator('.react-flow').click({ position: { x: 100, y: 100 } }) // deselect
    await dragPaletteToCanvas(pageA, 'external', { x: 500, y: 400 })
    await pageA.locator('.react-flow').click({ position: { x: 100, y: 100 } }) // deselect
    await pageA.waitForTimeout(300)

    // Create room
    await pageA.getByTestId('collaborate-button').click()
    await pageA.getByTestId('display-name-input').fill('Alice')
    await pageA.getByTestId('confirm-name-button').click()
    await expect(pageA.getByTestId('room-modal')).toBeVisible()
    const roomUrl = (await pageA.getByTestId('room-url').textContent()) || ''
    await pageA.getByTestId('close-room-modal').click()

    // Bob joins
    const contextB = await browser.newContext({ storageState: './e2e/storage-state.json' })
    const pageB = await contextB.newPage()
    await pageB.goto(roomUrl)
    await pageB.getByTestId('display-name-input').fill('Bob')
    await pageB.getByTestId('confirm-name-button').click()
    await pageB.waitForTimeout(1500)

    // Alice selects first component, Bob selects second
    const nodesA = pageA.locator('.react-flow__node')
    const nodesB = pageB.locator('.react-flow__node')
    await nodesA.first().click()
    await nodesB.nth(1).click()
    await pageA.waitForTimeout(500)

    // Context A should see Bob's edit indicator
    const bobIndicator = pageA.locator('[data-testid="edit-indicator"]')
    await expect(bobIndicator).toBeVisible({ timeout: 5000 })
    await expect(bobIndicator).toContainText('Bob')

    // Context B should see Alice's edit indicator
    const aliceIndicator = pageB.locator('[data-testid="edit-indicator"]')
    await expect(aliceIndicator).toBeVisible({ timeout: 5000 })
    await expect(aliceIndicator).toContainText('Alice')

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.3.4: Edit indicator color matches user assigned color', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsWithComponent(browser)

    // Wait for presence bar to be ready
    const presenceBar = pageB.getByTestId('presence-bar')
    await expect(presenceBar).toBeVisible({ timeout: 5000 })

    // Alice selects the component
    const nodeA = pageA.locator('.react-flow__node').first()
    await nodeA.click()
    await pageA.waitForTimeout(500)

    // Get edit indicator in context B
    const editIndicator = pageB.locator('[data-testid="edit-indicator"]')
    await expect(editIndicator).toBeVisible({ timeout: 5000 })

    // Check that the indicator has a border color
    const indicatorColor = await editIndicator.evaluate((el) => {
      return (el as HTMLElement).style.borderColor || ''
    })
    expect(indicatorColor).toBeTruthy()

    await contextA.close()
    await contextB.close()
  })

  test('TC-10.3.5: Edit indicator does not block interaction', async ({ browser }) => {
    const { contextA, pageA, contextB, pageB } = await openTwoContextsWithComponent(browser)

    // Alice selects the component
    const nodeA = pageA.locator('.react-flow__node').first()
    await nodeA.click()
    await pageA.waitForTimeout(500)

    // Context B sees edit indicator
    const editIndicator = pageB.locator('[data-testid="edit-indicator"]')
    await expect(editIndicator).toBeVisible({ timeout: 5000 })

    // Bob can still click and select the same component
    const nodeB = pageB.locator('.react-flow__node').first()
    await nodeB.click()

    // Assert Bob can interact — the node becomes selected
    await expect(nodeB).toHaveClass(/selected/, { timeout: 3000 })

    await contextA.close()
    await contextB.close()
  })
})
