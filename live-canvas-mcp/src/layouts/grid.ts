/**
 * Grid Layout Algorithm for Matrices
 *
 * A pure function module that positions elements in a 2D grid structure
 * suitable for matrices, priority grids, and quadrant diagrams.
 *
 * Supports NxM grids with labels on top and left axes.
 * Items are placed within cells and stacked vertically.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Cell in the grid containing items
 */
export interface MatrixCell {
  row: number;      // 0-indexed
  col: number;      // 0-indexed
  items: string[];  // Items to place in this cell
}

/**
 * Label for an axis
 */
export interface GridLabel {
  axis: 'top' | 'left';
  index: number;    // 0 = first column/row
  text: string;
}

/**
 * A positioned element in the matrix layout
 */
export interface PositionedMatrixElement {
  id: string;
  type: 'cell' | 'label' | 'item' | 'axis-line';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  row?: number;
  col?: number;
}

/**
 * Result of grid layout calculation
 */
export interface GridLayoutResult {
  elements: PositionedMatrixElement[];
  bounds: { width: number; height: number };
}

/**
 * Configuration options for grid layout
 */
export interface GridLayoutOptions {
  startX?: number;       // Default 100
  startY?: number;       // Default 100
  cellWidth?: number;    // Default 250
  cellHeight?: number;   // Default 200
  labelHeight?: number;  // Default 40 (for top labels)
  labelWidth?: number;   // Default 80 (for left labels)
  itemHeight?: number;   // Default 30
  itemPadding?: number;  // Default 10
}

// =============================================================================
// Layout Algorithm
// =============================================================================

/**
 * Calculate the layout for a grid/matrix structure
 *
 * Algorithm:
 * 1. Determine grid dimensions from labels (rows from left labels, cols from top labels)
 * 2. Position top labels centered above each column
 * 3. Position left labels centered beside each row
 * 4. Create axis lines between labels and grid
 * 5. For each cell: create bounding rectangle
 * 6. Stack items vertically inside their cells with padding
 *
 * @param cells - Array of cells with their row/col positions and items
 * @param labels - Object with 'top' array for column labels and 'left' array for row labels
 * @param options - Layout configuration
 * @returns Positioned elements and total bounds
 *
 * @example
 * const result = layoutGrid(
 *   [
 *     { row: 0, col: 0, items: ["Urgent task 1"] },
 *     { row: 1, col: 1, items: ["Low priority"] }
 *   ],
 *   {
 *     top: ["High", "Low"],  // Column labels (X axis values)
 *     left: ["High", "Low"]  // Row labels (Y axis values)
 *   }
 * );
 */
export function layoutGrid(
  cells: MatrixCell[],
  labels: { top: string[]; left: string[] },
  options: GridLayoutOptions = {}
): GridLayoutResult {
  // Apply defaults
  const config = {
    startX: options.startX ?? 100,
    startY: options.startY ?? 100,
    cellWidth: options.cellWidth ?? 250,
    cellHeight: options.cellHeight ?? 200,
    labelHeight: options.labelHeight ?? 40,
    labelWidth: options.labelWidth ?? 80,
    itemHeight: options.itemHeight ?? 30,
    itemPadding: options.itemPadding ?? 10,
  };

  const elements: PositionedMatrixElement[] = [];
  let idCounter = 0;

  const numCols = labels.top.length;
  const numRows = labels.left.length;

  // Grid content starts after labels
  const gridStartX = config.startX + config.labelWidth;
  const gridStartY = config.startY + config.labelHeight;

  // Total grid dimensions
  const gridWidth = numCols * config.cellWidth;
  const gridHeight = numRows * config.cellHeight;

  // 1. Create vertical axis line (between left labels and grid)
  elements.push({
    id: `axis-v-${idCounter++}`,
    type: 'axis-line',
    x: gridStartX,
    y: config.startY,
    width: 2,
    height: gridHeight + config.labelHeight,
  });

  // 2. Create horizontal axis line (between top labels and grid)
  elements.push({
    id: `axis-h-${idCounter++}`,
    type: 'axis-line',
    x: config.startX,
    y: gridStartY,
    width: gridWidth + config.labelWidth,
    height: 2,
  });

  // 3. Position top labels (column headers)
  for (let col = 0; col < numCols; col++) {
    const labelX = gridStartX + col * config.cellWidth;
    const labelY = config.startY;

    elements.push({
      id: `label-top-${idCounter++}`,
      type: 'label',
      x: labelX,
      y: labelY,
      width: config.cellWidth,
      height: config.labelHeight,
      text: labels.top[col],
      col,
    });
  }

  // 4. Position left labels (row headers)
  for (let row = 0; row < numRows; row++) {
    const labelX = config.startX;
    const labelY = gridStartY + row * config.cellHeight;

    elements.push({
      id: `label-left-${idCounter++}`,
      type: 'label',
      x: labelX,
      y: labelY,
      width: config.labelWidth,
      height: config.cellHeight,
      text: labels.left[row],
      row,
    });
  }

  // 5. Create cell boxes and position items
  // First, create a map of cells by row,col for quick lookup
  const cellMap = new Map<string, MatrixCell>();
  for (const cell of cells) {
    cellMap.set(`${cell.row},${cell.col}`, cell);
  }

  // Create all cells (even empty ones)
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const cellX = gridStartX + col * config.cellWidth;
      const cellY = gridStartY + row * config.cellHeight;

      // Cell bounding box
      elements.push({
        id: `cell-${row}-${col}-${idCounter++}`,
        type: 'cell',
        x: cellX,
        y: cellY,
        width: config.cellWidth,
        height: config.cellHeight,
        row,
        col,
      });

      // Add items in this cell
      const cell = cellMap.get(`${row},${col}`);
      if (cell && cell.items.length > 0) {
        let itemY = cellY + config.itemPadding;

        for (const itemText of cell.items) {
          elements.push({
            id: `item-${row}-${col}-${idCounter++}`,
            type: 'item',
            x: cellX + config.itemPadding,
            y: itemY,
            width: config.cellWidth - 2 * config.itemPadding,
            height: config.itemHeight,
            text: itemText,
            row,
            col,
          });

          itemY += config.itemHeight + config.itemPadding / 2;
        }
      }
    }
  }

  // Calculate total bounds
  const totalWidth = config.labelWidth + gridWidth;
  const totalHeight = config.labelHeight + gridHeight;

  return {
    elements,
    bounds: {
      width: totalWidth,
      height: totalHeight,
    },
  };
}

/**
 * Utility: Map quadrant string to row/col indices
 *
 * Quadrant format: "{yAxis}-{xAxis}" where each is "high" or "low"
 * - high-high: row 0, col 0 (top-left)
 * - high-low: row 0, col 1 (top-right)
 * - low-high: row 1, col 0 (bottom-left)
 * - low-low: row 1, col 1 (bottom-right)
 *
 * @param quadrant - String like "high-high", "high-low", "low-high", "low-low"
 * @returns Object with row and col (0-indexed)
 */
export function quadrantToRowCol(quadrant: string): { row: number; col: number } {
  const [yAxis, xAxis] = quadrant.toLowerCase().split('-');

  return {
    row: yAxis === 'high' ? 0 : 1,
    col: xAxis === 'high' ? 0 : 1,
  };
}
