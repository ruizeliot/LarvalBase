import { createContext, useContext, useCallback, useRef, useState, type ReactNode } from 'react';
import { type Node, type Edge } from '@xyflow/react';
import type { HITeCNodeData, HITeCEdgeData, CrossViewLink, HITeCNodeType, HITeCEdgeType } from '../types/hitec';
import { NODE_TYPE_META } from '../types/hitec';
import { v4 as uuidv4 } from 'uuid';

interface GraphSnapshot {
  structureNodes: Node<HITeCNodeData>[];
  structureEdges: Edge<HITeCEdgeData>[];
  causalNodes: Node<HITeCNodeData>[];
  causalEdges: Edge<HITeCEdgeData>[];
  crossLinks: CrossViewLink[];
}

interface GraphContextValue {
  structureNodes: Node<HITeCNodeData>[];
  structureEdges: Edge<HITeCEdgeData>[];
  causalNodes: Node<HITeCNodeData>[];
  causalEdges: Edge<HITeCEdgeData>[];
  crossLinks: CrossViewLink[];
  setStructureNodes: (nodes: Node<HITeCNodeData>[] | ((prev: Node<HITeCNodeData>[]) => Node<HITeCNodeData>[])) => void;
  setStructureEdges: (edges: Edge<HITeCEdgeData>[] | ((prev: Edge<HITeCEdgeData>[]) => Edge<HITeCEdgeData>[])) => void;
  setCausalNodes: (nodes: Node<HITeCNodeData>[] | ((prev: Node<HITeCNodeData>[]) => Node<HITeCNodeData>[])) => void;
  setCausalEdges: (edges: Edge<HITeCEdgeData>[] | ((prev: Edge<HITeCEdgeData>[]) => Edge<HITeCEdgeData>[])) => void;
  setCrossLinks: (links: CrossViewLink[]) => void;
  addNode: (view: 'structure' | 'causal', nodeType: HITeCNodeType, position: { x: number; y: number }) => string;
  removeNode: (view: 'structure' | 'causal', nodeId: string) => void;
  updateNodeData: (view: 'structure' | 'causal', nodeId: string, data: Partial<HITeCNodeData>) => void;
  addEdge: (view: 'structure' | 'causal', source: string, target: string, edgeType: HITeCEdgeType) => void;
  removeEdge: (view: 'structure' | 'causal', edgeId: string) => void;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  loadGraph: (snapshot: GraphSnapshot) => void;
  getSnapshot: () => GraphSnapshot;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  selectedView: 'structure' | 'causal' | null;
  setSelection: (nodeId: string | null, edgeId: string | null, view: 'structure' | 'causal' | null) => void;
  highlightedNodeIds: Set<string>;
  setHighlightedNodeIds: (ids: Set<string>) => void;
}

const GraphContext = createContext<GraphContextValue | null>(null);

const MAX_UNDO = 40;

export function GraphProvider({ children }: { children: ReactNode }) {
  const [structureNodes, setStructureNodes] = useState<Node<HITeCNodeData>[]>([]);
  const [structureEdges, setStructureEdges] = useState<Edge<HITeCEdgeData>[]>([]);
  const [causalNodes, setCausalNodes] = useState<Node<HITeCNodeData>[]>([]);
  const [causalEdges, setCausalEdges] = useState<Edge<HITeCEdgeData>[]>([]);
  const [crossLinks, setCrossLinks] = useState<CrossViewLink[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'structure' | 'causal' | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());

  const undoStackRef = useRef<GraphSnapshot[]>([]);
  const redoStackRef = useRef<GraphSnapshot[]>([]);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);

  const getSnapshot = useCallback((): GraphSnapshot => ({
    structureNodes: structureNodes.map(n => ({ ...n, data: { ...n.data } })),
    structureEdges: structureEdges.map(e => ({ ...e, data: e.data ? { ...e.data } : e.data })),
    causalNodes: causalNodes.map(n => ({ ...n, data: { ...n.data } })),
    causalEdges: causalEdges.map(e => ({ ...e, data: e.data ? { ...e.data } : e.data })),
    crossLinks: [...crossLinks],
  }), [structureNodes, structureEdges, causalNodes, causalEdges, crossLinks]);

  const pushUndo = useCallback(() => {
    const snap = getSnapshot();
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
    redoStackRef.current = [];
    setUndoLen(undoStackRef.current.length);
    setRedoLen(0);
  }, [getSnapshot]);

  const loadGraph = useCallback((snap: GraphSnapshot) => {
    setStructureNodes(snap.structureNodes);
    setStructureEdges(snap.structureEdges);
    setCausalNodes(snap.causalNodes);
    setCausalEdges(snap.causalEdges);
    setCrossLinks(snap.crossLinks);
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const current = getSnapshot();
    redoStackRef.current.push(current);
    const prev = undoStackRef.current.pop()!;
    loadGraph(prev);
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);
  }, [getSnapshot, loadGraph]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const current = getSnapshot();
    undoStackRef.current.push(current);
    const next = redoStackRef.current.pop()!;
    loadGraph(next);
    setUndoLen(undoStackRef.current.length);
    setRedoLen(redoStackRef.current.length);
  }, [getSnapshot, loadGraph]);

  const addNode = useCallback((view: 'structure' | 'causal', nodeType: HITeCNodeType, position: { x: number; y: number }) => {
    const id = uuidv4();
    const meta = NODE_TYPE_META[nodeType];
    const newNode: Node<HITeCNodeData> = {
      id,
      type: 'hitecNode',
      position,
      data: {
        label: `${meta.label} ${Date.now().toString(36).slice(-4)}`,
        nodeType,
        params: [],
      },
    };
    if (view === 'structure') {
      setStructureNodes(prev => [...prev, newNode]);
    } else {
      setCausalNodes(prev => [...prev, newNode]);
    }
    return id;
  }, []);

  const removeNode = useCallback((view: 'structure' | 'causal', nodeId: string) => {
    if (view === 'structure') {
      setStructureNodes(prev => prev.filter(n => n.id !== nodeId));
      setStructureEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    } else {
      setCausalNodes(prev => prev.filter(n => n.id !== nodeId));
      setCausalEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    }
    setCrossLinks(prev => prev.filter(l => l.elementaryId !== nodeId && l.componentId !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setSelectedView(null);
    }
  }, [selectedNodeId]);

  const updateNodeData = useCallback((view: 'structure' | 'causal', nodeId: string, data: Partial<HITeCNodeData>) => {
    const setter = view === 'structure' ? setStructureNodes : setCausalNodes;
    setter(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
  }, []);

  const addEdge = useCallback((view: 'structure' | 'causal', source: string, target: string, edgeType: HITeCEdgeType) => {
    const id = uuidv4();
    const newEdge: Edge<HITeCEdgeData> = {
      id,
      source,
      target,
      type: 'hitecEdge',
      data: { edgeType },
    };
    if (view === 'structure') {
      setStructureEdges(prev => [...prev, newEdge]);
    } else {
      setCausalEdges(prev => [...prev, newEdge]);
    }
  }, []);

  const removeEdge = useCallback((view: 'structure' | 'causal', edgeId: string) => {
    if (view === 'structure') {
      setStructureEdges(prev => prev.filter(e => e.id !== edgeId));
    } else {
      setCausalEdges(prev => prev.filter(e => e.id !== edgeId));
    }
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
      setSelectedView(null);
    }
  }, [selectedEdgeId]);

  const setSelection = useCallback((nodeId: string | null, edgeId: string | null, view: 'structure' | 'causal' | null) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(edgeId);
    setSelectedView(view);
    // Highlight cross-linked nodes
    if (nodeId) {
      const linked = new Set<string>();
      crossLinks.forEach(l => {
        if (l.elementaryId === nodeId) linked.add(l.componentId);
        if (l.componentId === nodeId) linked.add(l.elementaryId);
      });
      setHighlightedNodeIds(linked);
    } else {
      setHighlightedNodeIds(new Set());
    }
  }, [crossLinks]);

  return (
    <GraphContext.Provider value={{
      structureNodes, structureEdges, causalNodes, causalEdges, crossLinks,
      setStructureNodes, setStructureEdges, setCausalNodes, setCausalEdges, setCrossLinks,
      addNode, removeNode, updateNodeData, addEdge, removeEdge,
      pushUndo, undo, redo,
      canUndo: undoLen > 0,
      canRedo: redoLen > 0,
      loadGraph, getSnapshot,
      selectedNodeId, selectedEdgeId, selectedView, setSelection,
      highlightedNodeIds, setHighlightedNodeIds,
    }}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const ctx = useContext(GraphContext);
  if (!ctx) throw new Error('useGraph must be used within GraphProvider');
  return ctx;
}
