/**
 * Excalidraw Element Skeleton Builders
 *
 * Factory functions that produce simplified skeleton objects for Excalidraw.
 * These skeletons can be passed to Excalidraw's `convertToExcalidrawElements`
 * on the client side to produce full ExcalidrawElement objects.
 *
 * Why skeletons? Excalidraw elements have 20+ properties with complex
 * interdependencies. The skeleton API lets us specify only what matters
 * and lets Excalidraw fill in sensible defaults.
 *
 * Reference: https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/excalidraw-element-skeleton
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Base skeleton properties shared by all element types
 */
export interface BaseSkeletonOptions {
  id: string;
  x: number;
  y: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  strokeWidth?: number;
  roughness?: number; // 0 = architect, 1 = artist, 2 = cartoonist
  opacity?: number; // 0-100
}

/**
 * Options for rectangle skeleton
 */
export interface RectangleSkeletonOptions extends BaseSkeletonOptions {
  width: number;
  height: number;
  label?: string;
  roundness?: { type: number; value?: number } | null;
}

/**
 * Options for ellipse skeleton
 */
export interface EllipseSkeletonOptions extends BaseSkeletonOptions {
  width: number;
  height: number;
  label?: string;
}

/**
 * Binding specification for arrow endpoints
 */
export interface ArrowBinding {
  elementId: string;
  focus?: number; // -1 to 1, where on the element edge to bind
  gap?: number; // Space between arrow and element
}

/**
 * Options for arrow skeleton
 */
export interface ArrowSkeletonOptions extends BaseSkeletonOptions {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startBinding?: ArrowBinding;
  endBinding?: ArrowBinding;
  strokeStyle?: "solid" | "dashed" | "dotted";
  startArrowhead?: "arrow" | "bar" | "dot" | "triangle" | null;
  endArrowhead?: "arrow" | "bar" | "dot" | "triangle" | null;
}

/**
 * Options for text skeleton
 */
export interface TextSkeletonOptions extends BaseSkeletonOptions {
  text: string;
  fontSize?: number;
  fontFamily?: number; // 1 = Virgil, 2 = Helvetica, 3 = Cascadia
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
}

/**
 * Rectangle element skeleton
 */
export interface RectangleSkeleton {
  type: "rectangle";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  roundness?: { type: number; value?: number } | null;
  label?: {
    text: string;
  };
}

/**
 * Ellipse element skeleton
 */
export interface EllipseSkeleton {
  type: "ellipse";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  label?: {
    text: string;
  };
}

/**
 * Arrow element skeleton
 */
export interface ArrowSkeleton {
  type: "arrow";
  id: string;
  x: number;
  y: number;
  points: [number, number][];
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: "solid" | "dashed" | "dotted";
  roughness?: number;
  opacity?: number;
  startArrowhead?: "arrow" | "bar" | "dot" | "triangle" | null;
  endArrowhead?: "arrow" | "bar" | "dot" | "triangle" | null;
  startBinding?: {
    elementId: string;
    focus: number;
    gap: number;
  } | null;
  endBinding?: {
    elementId: string;
    focus: number;
    gap: number;
  } | null;
}

/**
 * Text element skeleton
 */
export interface TextSkeleton {
  type: "text";
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  fontFamily?: number;
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  strokeColor?: string;
  opacity?: number;
}

/**
 * Union of all skeleton types for convenience
 */
export type ExcalidrawElementSkeleton =
  | RectangleSkeleton
  | EllipseSkeleton
  | ArrowSkeleton
  | TextSkeleton;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a rectangle skeleton with optional label
 *
 * @example
 * const rect = createRectangleSkeleton({
 *   id: "node-1",
 *   x: 100,
 *   y: 100,
 *   width: 200,
 *   height: 80,
 *   label: "Central Topic",
 *   backgroundColor: "#a5d8ff"
 * });
 */
export function createRectangleSkeleton(
  opts: RectangleSkeletonOptions
): RectangleSkeleton {
  const skeleton: RectangleSkeleton = {
    type: "rectangle",
    id: opts.id,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
  };

  // Optional styling
  if (opts.strokeColor !== undefined) skeleton.strokeColor = opts.strokeColor;
  if (opts.backgroundColor !== undefined)
    skeleton.backgroundColor = opts.backgroundColor;
  if (opts.fillStyle !== undefined) skeleton.fillStyle = opts.fillStyle;
  if (opts.strokeWidth !== undefined) skeleton.strokeWidth = opts.strokeWidth;
  if (opts.roughness !== undefined) skeleton.roughness = opts.roughness;
  if (opts.opacity !== undefined) skeleton.opacity = opts.opacity;
  if (opts.roundness !== undefined) skeleton.roundness = opts.roundness;

  // Label (Excalidraw auto-centers text in container)
  if (opts.label) {
    skeleton.label = { text: opts.label };
  }

  return skeleton;
}

/**
 * Create an ellipse skeleton with optional label
 *
 * @example
 * const ellipse = createEllipseSkeleton({
 *   id: "center",
 *   x: 300,
 *   y: 200,
 *   width: 180,
 *   height: 100,
 *   label: "Main Idea",
 *   backgroundColor: "#d0bfff"
 * });
 */
export function createEllipseSkeleton(
  opts: EllipseSkeletonOptions
): EllipseSkeleton {
  const skeleton: EllipseSkeleton = {
    type: "ellipse",
    id: opts.id,
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
  };

  // Optional styling
  if (opts.strokeColor !== undefined) skeleton.strokeColor = opts.strokeColor;
  if (opts.backgroundColor !== undefined)
    skeleton.backgroundColor = opts.backgroundColor;
  if (opts.fillStyle !== undefined) skeleton.fillStyle = opts.fillStyle;
  if (opts.strokeWidth !== undefined) skeleton.strokeWidth = opts.strokeWidth;
  if (opts.roughness !== undefined) skeleton.roughness = opts.roughness;
  if (opts.opacity !== undefined) skeleton.opacity = opts.opacity;

  // Label
  if (opts.label) {
    skeleton.label = { text: opts.label };
  }

  return skeleton;
}

/**
 * Create an arrow skeleton with optional bindings to other elements
 *
 * Arrows in Excalidraw use relative points. The `x` and `y` define the
 * start position, and `points` array contains [dx, dy] offsets from that start.
 *
 * @example
 * // Unbound arrow from (100, 100) to (300, 200)
 * const arrow1 = createArrowSkeleton({
 *   id: "arr-1",
 *   startX: 100,
 *   startY: 100,
 *   endX: 300,
 *   endY: 200
 * });
 *
 * // Arrow bound to elements (Excalidraw will route automatically)
 * const arrow2 = createArrowSkeleton({
 *   id: "arr-2",
 *   startX: 0,
 *   startY: 0,
 *   endX: 200,
 *   endY: 100,
 *   startBinding: { elementId: "node-1" },
 *   endBinding: { elementId: "node-2" }
 * });
 */
export function createArrowSkeleton(opts: ArrowSkeletonOptions): ArrowSkeleton {
  // Calculate relative end point
  const endDx = opts.endX - opts.startX;
  const endDy = opts.endY - opts.startY;

  const skeleton: ArrowSkeleton = {
    type: "arrow",
    id: opts.id,
    x: opts.startX,
    y: opts.startY,
    points: [
      [0, 0],
      [endDx, endDy],
    ],
  };

  // Optional styling
  if (opts.strokeColor !== undefined) skeleton.strokeColor = opts.strokeColor;
  if (opts.strokeWidth !== undefined) skeleton.strokeWidth = opts.strokeWidth;
  if (opts.strokeStyle !== undefined) skeleton.strokeStyle = opts.strokeStyle;
  if (opts.roughness !== undefined) skeleton.roughness = opts.roughness;
  if (opts.opacity !== undefined) skeleton.opacity = opts.opacity;

  // Arrowheads (default to arrow on end, nothing on start)
  skeleton.startArrowhead = opts.startArrowhead ?? null;
  skeleton.endArrowhead = opts.endArrowhead ?? "arrow";

  // Bindings to other elements
  if (opts.startBinding) {
    skeleton.startBinding = {
      elementId: opts.startBinding.elementId,
      focus: opts.startBinding.focus ?? 0,
      gap: opts.startBinding.gap ?? 5,
    };
  } else {
    skeleton.startBinding = null;
  }

  if (opts.endBinding) {
    skeleton.endBinding = {
      elementId: opts.endBinding.elementId,
      focus: opts.endBinding.focus ?? 0,
      gap: opts.endBinding.gap ?? 5,
    };
  } else {
    skeleton.endBinding = null;
  }

  return skeleton;
}

/**
 * Create a standalone text skeleton
 *
 * For text inside shapes, use the `label` property on rectangles/ellipses.
 * This function is for standalone text labels.
 *
 * @example
 * const text = createTextSkeleton({
 *   id: "title",
 *   x: 400,
 *   y: 50,
 *   text: "Project Brainstorm",
 *   fontSize: 28
 * });
 */
export function createTextSkeleton(opts: TextSkeletonOptions): TextSkeleton {
  const skeleton: TextSkeleton = {
    type: "text",
    id: opts.id,
    x: opts.x,
    y: opts.y,
    text: opts.text,
  };

  // Optional styling
  if (opts.fontSize !== undefined) skeleton.fontSize = opts.fontSize;
  if (opts.fontFamily !== undefined) skeleton.fontFamily = opts.fontFamily;
  if (opts.textAlign !== undefined) skeleton.textAlign = opts.textAlign;
  if (opts.verticalAlign !== undefined)
    skeleton.verticalAlign = opts.verticalAlign;
  if (opts.strokeColor !== undefined) skeleton.strokeColor = opts.strokeColor;
  if (opts.opacity !== undefined) skeleton.opacity = opts.opacity;

  return skeleton;
}
