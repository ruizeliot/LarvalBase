/**
 * Cluster Layout Algorithm for Affinity Diagrams
 *
 * A pure function module that positions elements in clustered groups,
 * suitable for affinity diagrams, grouping visualizations, and card sorting.
 *
 * Clusters are arranged in rows with configurable max per row.
 * Items within each cluster are stacked vertically with a label at top.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * A cluster (group) containing related items
 */
export interface Cluster {
  id: string;
  label: string;
  items: string[];
}

/**
 * A positioned element in the cluster layout
 */
export interface PositionedClusterElement {
  id: string;
  type: 'cluster-box' | 'cluster-label' | 'item';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  clusterId?: string;
}

/**
 * Result of cluster layout calculation
 */
export interface ClusterLayoutResult {
  elements: PositionedClusterElement[];
  bounds: { width: number; height: number };
}

/**
 * Configuration options for cluster layout
 */
export interface ClusterLayoutOptions {
  startX?: number;          // Default 100
  startY?: number;          // Default 100
  clusterPadding?: number;  // Internal padding within cluster, default 20
  clusterGap?: number;      // Gap between clusters, default 40
  itemHeight?: number;      // Height of each item, default 35
  itemWidth?: number;       // Width of items, default 180
  itemGap?: number;         // Gap between items within cluster, default 8
  maxClustersPerRow?: number; // Maximum clusters per row before wrap, default 3
  labelHeight?: number;     // Height of cluster label, default 40
}

// =============================================================================
// Layout Algorithm
// =============================================================================

/**
 * Calculate the layout for a cluster/affinity diagram structure
 *
 * Algorithm:
 * 1. Calculate each cluster's dimensions based on items count
 * 2. Arrange clusters in rows (max N per row, then wrap)
 * 3. Each cluster contains a label at top and items stacked below
 * 4. Return all positioned elements
 *
 * @param clusters - Array of clusters with their items
 * @param options - Layout configuration
 * @returns Positioned elements and total bounds
 *
 * @example
 * const result = layoutClusters([
 *   { id: "frontend", label: "Frontend", items: ["React", "CSS", "HTML"] },
 *   { id: "backend", label: "Backend", items: ["Node", "SQL"] },
 *   { id: "devops", label: "DevOps", items: ["Docker", "K8s", "CI/CD"] },
 *   { id: "testing", label: "Testing", items: ["Jest", "Cypress"] }
 * ]);
 * // Result: 2 rows of 3 and 1 cluster (with default maxClustersPerRow=3)
 */
export function layoutClusters(
  clusters: Cluster[],
  options: ClusterLayoutOptions = {}
): ClusterLayoutResult {
  // Apply defaults
  const config = {
    startX: options.startX ?? 100,
    startY: options.startY ?? 100,
    clusterPadding: options.clusterPadding ?? 20,
    clusterGap: options.clusterGap ?? 40,
    itemHeight: options.itemHeight ?? 35,
    itemWidth: options.itemWidth ?? 180,
    itemGap: options.itemGap ?? 8,
    maxClustersPerRow: options.maxClustersPerRow ?? 3,
    labelHeight: options.labelHeight ?? 40,
  };

  const elements: PositionedClusterElement[] = [];
  let elementIdCounter = 0;

  // Calculate cluster dimensions
  const clusterDimensions: Array<{ cluster: Cluster; width: number; height: number }> = [];

  for (const cluster of clusters) {
    // Cluster width: item width + padding on both sides
    const clusterWidth = config.itemWidth + 2 * config.clusterPadding;

    // Cluster height: label + items + padding
    const itemsHeight = cluster.items.length * config.itemHeight +
      Math.max(0, cluster.items.length - 1) * config.itemGap;
    const clusterHeight = config.labelHeight + itemsHeight + 2 * config.clusterPadding;

    clusterDimensions.push({ cluster, width: clusterWidth, height: clusterHeight });
  }

  // Arrange clusters in rows
  let currentX = config.startX;
  let currentY = config.startY;
  let rowHeight = 0;
  let clustersInCurrentRow = 0;
  let maxRowWidth = 0;

  for (const { cluster, width, height } of clusterDimensions) {
    // Check if we need to wrap to next row
    if (clustersInCurrentRow >= config.maxClustersPerRow) {
      // Move to next row
      currentY += rowHeight + config.clusterGap;
      currentX = config.startX;
      rowHeight = 0;
      clustersInCurrentRow = 0;
    }

    // Position this cluster
    const clusterX = currentX;
    const clusterY = currentY;

    // Create cluster box (rounded rectangle)
    elements.push({
      id: `cluster-box-${elementIdCounter++}`,
      type: 'cluster-box',
      x: clusterX,
      y: clusterY,
      width,
      height,
      clusterId: cluster.id,
    });

    // Create cluster label
    elements.push({
      id: `cluster-label-${elementIdCounter++}`,
      type: 'cluster-label',
      x: clusterX + config.clusterPadding,
      y: clusterY + config.clusterPadding,
      width: config.itemWidth,
      height: config.labelHeight,
      text: cluster.label,
      clusterId: cluster.id,
    });

    // Position items within cluster
    let itemY = clusterY + config.clusterPadding + config.labelHeight;

    for (const itemText of cluster.items) {
      elements.push({
        id: `item-${elementIdCounter++}`,
        type: 'item',
        x: clusterX + config.clusterPadding,
        y: itemY,
        width: config.itemWidth,
        height: config.itemHeight,
        text: itemText,
        clusterId: cluster.id,
      });

      itemY += config.itemHeight + config.itemGap;
    }

    // Update tracking variables
    rowHeight = Math.max(rowHeight, height);
    currentX += width + config.clusterGap;
    clustersInCurrentRow++;

    // Track max row width
    maxRowWidth = Math.max(maxRowWidth, currentX - config.startX - config.clusterGap);
  }

  // Calculate total bounds
  const totalWidth = maxRowWidth;
  const totalHeight = (currentY - config.startY) + rowHeight;

  return {
    elements,
    bounds: {
      width: totalWidth,
      height: totalHeight,
    },
  };
}

/**
 * Utility: Group items by a property (for creating clusters from flat data)
 *
 * @param items - Array of items with a category/group property
 * @param getCategory - Function to extract category from item
 * @returns Array of Cluster objects
 *
 * @example
 * const items = [
 *   { name: "React", category: "Frontend" },
 *   { name: "Node", category: "Backend" },
 *   { name: "CSS", category: "Frontend" }
 * ];
 * const clusters = groupItemsIntoClusters(items, item => item.category, item => item.name);
 * // Result: [{ id: "Frontend", label: "Frontend", items: ["React", "CSS"] }, ...]
 */
export function groupItemsIntoClusters<T>(
  items: T[],
  getCategory: (item: T) => string,
  getLabel: (item: T) => string
): Cluster[] {
  const groupMap = new Map<string, string[]>();

  for (const item of items) {
    const category = getCategory(item);
    const label = getLabel(item);

    if (!groupMap.has(category)) {
      groupMap.set(category, []);
    }
    groupMap.get(category)!.push(label);
  }

  return Array.from(groupMap.entries()).map(([category, labels]) => ({
    id: category.toLowerCase().replace(/\s+/g, '-'),
    label: category,
    items: labels,
  }));
}
