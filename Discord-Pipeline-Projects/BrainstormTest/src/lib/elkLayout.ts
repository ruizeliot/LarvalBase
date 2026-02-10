import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'

export type LayoutDirection = 'LR' | 'TB' | 'COMPACT'

const elk = new ELK()

const NODE_WIDTH = 220
const NODE_HEIGHT = 140

interface LayoutInput {
  components: { id: string }[]
  chains: { sourceId: string; targetId: string }[]
}

export async function computeElkLayout(
  input: LayoutInput,
  direction: LayoutDirection = 'LR'
): Promise<Record<string, { x: number; y: number }>> {
  const { components, chains } = input

  const isCompact = direction === 'COMPACT'
  const elkDirection = isCompact ? 'RIGHT' : direction === 'TB' ? 'DOWN' : 'RIGHT'
  const nodeSpacing = isCompact ? 20 : 60
  const layerSpacing = isCompact ? 60 : 180

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': elkDirection,
      'elk.spacing.nodeNode': String(nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(layerSpacing),
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    },
    children: components.map((comp) => ({
      id: comp.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: chains
      .filter((c) => c.sourceId !== c.targetId)
      .map((chain, i) => ({
        id: `e${i}`,
        sources: [chain.sourceId],
        targets: [chain.targetId],
      })),
  }

  const layoutResult = await elk.layout(graph)

  const positions: Record<string, { x: number; y: number }> = {}
  for (const child of layoutResult.children ?? []) {
    positions[child.id] = { x: child.x ?? 0, y: child.y ?? 0 }
  }

  return positions
}
