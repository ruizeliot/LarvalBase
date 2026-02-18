import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  Panel,
  useReactFlow,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  BackgroundVariant,
  ReactFlowProvider,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useGraph } from '../context/GraphContext';
import { useUser } from '../context/UserContext';
import { useSocket } from '../hooks/useSocket';
import HITeCNode from '../components/graph/HITeCNode';
import HITeCEdge from '../components/graph/HITeCEdge';
import PropertyPanel from '../components/graph/PropertyPanel';
import CrossViewLinks from '../components/graph/CrossViewLinks';
import ContextMenu from '../components/graph/ContextMenu';
import { PRESETS } from '../data/presets';
import { NODE_TYPE_META, EDGE_TYPE_META, type HITeCNodeData, type HITeCEdgeData, type HITeCNodeType, type HITeCEdgeType } from '../types/hitec';

const nodeTypes = { hitecNode: HITeCNode };
const edgeTypes = { hitecEdge: HITeCEdge };

// SVG marker defs for edges
function EdgeMarkers() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {Object.entries(EDGE_TYPE_META).map(([key, meta]) => (
          <marker
            key={key}
            id={`arrow-${key}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill={meta.color} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}

// Auto-layout using dagre
function applyDagreLayout(nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB'): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep: 100, nodesep: 60, marginx: 20, marginy: 20 });

  nodes.forEach(n => g.setNode(n.id, { width: 180, height: 80 }));
  edges.forEach(e => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map(n => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 90, y: pos.y - 40 } };
  });
}

function applyRadialLayout(nodes: Node[]): Node[] {
  if (nodes.length === 0) return nodes;
  const cx = 400, cy = 350;
  return nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    const r = 200 + (i % 2) * 60;
    return { ...n, position: { x: cx + Math.cos(angle) * r - 90, y: cy + Math.sin(angle) * r - 40 } };
  });
}

function applyForceLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;
  const positions = nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    return { x: 400 + Math.cos(angle) * 250, y: 350 + Math.sin(angle) * 250 };
  });

  for (let iter = 0; iter < 60; iter++) {
    // Repulsion
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 180) {
          const f = (180 - d) * 0.04;
          positions[i].x -= (dx / d) * f;
          positions[i].y -= (dy / d) * f;
          positions[j].x += (dx / d) * f;
          positions[j].y += (dy / d) * f;
        }
      }
    }
    // Attraction via edges
    edges.forEach(e => {
      const si = nodes.findIndex(n => n.id === e.source);
      const ti = nodes.findIndex(n => n.id === e.target);
      if (si >= 0 && ti >= 0) {
        const dx = positions[ti].x - positions[si].x;
        const dy = positions[ti].y - positions[si].y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 200) {
          const f = (d - 200) * 0.02;
          positions[si].x += (dx / d) * f;
          positions[si].y += (dy / d) * f;
          positions[ti].x -= (dx / d) * f;
          positions[ti].y -= (dy / d) * f;
        }
      }
    });
  }

  return nodes.map((n, i) => ({ ...n, position: { x: positions[i].x - 90, y: positions[i].y - 40 } }));
}

// The actual view component (needs to be inside ReactFlowProvider)
function FlowView({
  view,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  onContextMenu,
}: {
  view: 'structure' | 'causal';
  nodes: Node<HITeCNodeData>[];
  edges: Edge<HITeCEdgeData>[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeClick: NodeMouseHandler;
  onEdgeClick: EdgeMouseHandler;
  onPaneClick: () => void;
  onContextMenu: (e: React.MouseEvent, view: 'structure' | 'causal') => void;
}) {
  const { highlightedNodeIds } = useGraph();

  const styledNodes = useMemo(() =>
    nodes.map(n => ({
      ...n,
      className: highlightedNodeIds.has(n.id) ? 'highlighted' : undefined,
    })),
    [nodes, highlightedNodeIds]
  );

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, view); }}
      fitView
      deleteKeyCode="Delete"
      multiSelectionKeyCode="Shift"
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#e8ecf1" />
      <MiniMap
        style={{ bottom: 8, right: 8, width: 120, height: 70 }}
        nodeColor={(n) => {
          const data = n.data as HITeCNodeData;
          return NODE_TYPE_META[data.nodeType]?.color || '#94a3b8';
        }}
        maskColor="rgba(255,255,255,0.8)"
        pannable
        zoomable
      />
      <Controls position="bottom-left" showInteractive={false} />
      <Panel position="top-left">
        <div className="view-label">
          {view === 'structure' ? '📊 Structure' : '⚡ Causal'}
        </div>
      </Panel>
      <Panel position="top-right">
        <span className="view-badge" style={{
          background: view === 'structure' ? '#ede9fe' : '#fef3c7',
          color: view === 'structure' ? '#6366f1' : '#d97706',
        }}>
          {view === 'structure' ? 'Complex \u2192 Elementary' : 'Component \u2192 Actuality'}
        </span>
      </Panel>
    </ReactFlow>
  );
}

function StructureFlowWrapper(props: Parameters<typeof FlowView>[0]) {
  return (
    <ReactFlowProvider>
      <FlowView {...props} />
    </ReactFlowProvider>
  );
}

function CausalFlowWrapper(props: Parameters<typeof FlowView>[0]) {
  return (
    <ReactFlowProvider>
      <FlowView {...props} />
    </ReactFlowProvider>
  );
}

export default function PodDefinitionPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const socket = useSocket();
  const graph = useGraph();

  const [splitPercent, setSplitPercent] = useState(50);
  const [isDividerDragging, setIsDividerDragging] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; view: 'structure' | 'causal'; nodeId?: string; edgeId?: string } | null>(null);

  // Room info
  const [roomName, setRoomName] = useState('');
  const [peers, setPeers] = useState<{ username: string; color: string; avatar: string }[]>([]);

  // Load room info
  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/rooms/${roomId}`)
      .then(r => r.json())
      .then(data => {
        setRoomName(data.name || '');
        setPeers(data.users || []);
      })
      .catch(() => {});

    // Join room via socket
    socket.emit('room:join', { roomId });

    // Graph sync listeners
    const handleGraphImport = ({ graph: g }: { graph: any }) => {
      if (g) {
        graph.loadGraph(g);
      }
    };
    socket.on('graph:import', handleGraphImport);
    socket.on('graph:full-state', handleGraphImport);

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('graph:import', handleGraphImport);
      socket.off('graph:full-state', handleGraphImport);
    };
  }, [roomId, socket]);

  // Load default preset on mount if graph is empty
  useEffect(() => {
    if (graph.structureNodes.length === 0 && graph.causalNodes.length === 0) {
      const preset = PRESETS.hitec;
      graph.loadGraph({
        structureNodes: preset.structureNodes,
        structureEdges: preset.structureEdges,
        causalNodes: preset.causalNodes,
        causalEdges: preset.causalEdges,
        crossLinks: preset.crossLinks,
      });
    }
  }, []);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        graph.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        graph.redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [graph.undo, graph.redo]);

  // Divider drag
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDividerDragging(true);
  }, []);

  useEffect(() => {
    if (!isDividerDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(20, Math.min(80, pct)));
    };
    const handleUp = () => setIsDividerDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDividerDragging]);

  // Node changes
  const onStructureNodesChange: OnNodesChange = useCallback((changes) => {
    graph.setStructureNodes(prev => applyNodeChanges(changes, prev) as Node<HITeCNodeData>[]);
  }, [graph.setStructureNodes]);

  const onCausalNodesChange: OnNodesChange = useCallback((changes) => {
    graph.setCausalNodes(prev => applyNodeChanges(changes, prev) as Node<HITeCNodeData>[]);
  }, [graph.setCausalNodes]);

  const onStructureEdgesChange: OnEdgesChange = useCallback((changes) => {
    graph.setStructureEdges(prev => applyEdgeChanges(changes, prev) as Edge<HITeCEdgeData>[]);
  }, [graph.setStructureEdges]);

  const onCausalEdgesChange: OnEdgesChange = useCallback((changes) => {
    graph.setCausalEdges(prev => applyEdgeChanges(changes, prev) as Edge<HITeCEdgeData>[]);
  }, [graph.setCausalEdges]);

  // Connect
  const onStructureConnect: OnConnect = useCallback((params) => {
    graph.pushUndo();
    graph.addEdge('structure', params.source!, params.target!, 'containment');
  }, [graph.pushUndo, graph.addEdge]);

  const onCausalConnect: OnConnect = useCallback((params) => {
    graph.pushUndo();
    graph.addEdge('causal', params.source!, params.target!, 'generation');
  }, [graph.pushUndo, graph.addEdge]);

  // Selection
  const handleNodeClick = useCallback((view: 'structure' | 'causal') => (_: React.MouseEvent, node: Node) => {
    graph.setSelection(node.id, null, view);
  }, [graph.setSelection]);

  const handleEdgeClick = useCallback((view: 'structure' | 'causal') => (_: React.MouseEvent, edge: Edge) => {
    graph.setSelection(null, edge.id, view);
  }, [graph.setSelection]);

  const handlePaneClick = useCallback(() => {
    graph.setSelection(null, null, null);
    setCtxMenu(null);
  }, [graph.setSelection]);

  // Context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, view: 'structure' | 'causal') => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, view });
  }, []);

  // Toolbar: add node
  const handleAddNode = useCallback((view: 'structure' | 'causal', nodeType: HITeCNodeType) => {
    graph.pushUndo();
    graph.addNode(view, nodeType, {
      x: 200 + Math.random() * 100,
      y: 200 + Math.random() * 100,
    });
  }, [graph.pushUndo, graph.addNode]);

  // Toolbar: layout
  const handleLayout = useCallback((layoutType: 'hierarchical' | 'radial' | 'force') => {
    const totalNodes = graph.structureNodes.length + graph.causalNodes.length;
    if (totalNodes > 10 && !confirm(`Appliquer l'auto-layout sur ${totalNodes} noeuds ?`)) return;

    graph.pushUndo();

    const applyLayout = (nodes: Node[], edges: Edge[]) => {
      switch (layoutType) {
        case 'hierarchical': return applyDagreLayout(nodes, edges);
        case 'radial': return applyRadialLayout(nodes);
        case 'force': return applyForceLayout(nodes, edges);
        default: return nodes;
      }
    };

    graph.setStructureNodes(applyLayout(graph.structureNodes, graph.structureEdges));
    graph.setCausalNodes(applyLayout(graph.causalNodes, graph.causalEdges));
  }, [graph]);

  // Toolbar: preset
  const handlePreset = useCallback((presetKey: string) => {
    if (!presetKey) return;
    const preset = PRESETS[presetKey];
    if (!preset) return;
    if (graph.structureNodes.length > 0 || graph.causalNodes.length > 0) {
      if (!confirm('Remplacer le graphe actuel par le preset ?')) return;
    }
    graph.pushUndo();
    graph.loadGraph({
      structureNodes: preset.structureNodes,
      structureEdges: preset.structureEdges,
      causalNodes: preset.causalNodes,
      causalEdges: preset.causalEdges,
      crossLinks: preset.crossLinks,
    });
  }, [graph]);

  // Import/Export
  const handleExport = useCallback(() => {
    const snap = graph.getSnapshot();
    const data = JSON.stringify(snap, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `pod-${roomName || 'export'}-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [graph.getSnapshot, roomName]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          // Validate basic structure
          if (!data.structureNodes && !data.causalNodes && !data.nodes) {
            alert('Format JSON invalide : structure de graphe HITeC attendue.');
            return;
          }
          graph.pushUndo();
          // Support both old format (nodes/edges/links) and new snapshot format
          if (data.structureNodes) {
            graph.loadGraph(data);
          } else if (data.nodes) {
            // Legacy format conversion
            const sNodes = data.nodes.filter((n: any) => ['complex', 'elementary'].includes(n.type)).map((n: any) => ({
              id: String(n.id),
              type: 'hitecNode',
              position: { x: n.x || 0, y: n.y || 0 },
              data: { label: n.name, nodeType: n.type, params: n.params?.map((p: any) => ({ key: p.k, value: p.v })) || [] },
            }));
            const cNodes = data.nodes.filter((n: any) => ['component', 'potential', 'potentiality', 'actuality'].includes(n.type)).map((n: any) => ({
              id: String(n.id),
              type: 'hitecNode',
              position: { x: n.x || 0, y: n.y || 0 },
              data: { label: n.name, nodeType: n.type, params: n.params?.map((p: any) => ({ key: p.k, value: p.v })) || [] },
            }));
            const sEdges = (data.edges || []).filter((e: any) => e.type === 'containment').map((e: any, i: number) => ({
              id: `imp-se-${i}`,
              source: String(e.from),
              target: String(e.to),
              type: 'hitecEdge',
              data: { edgeType: e.type, value: e.value },
            }));
            const cEdges = (data.edges || []).filter((e: any) => e.type !== 'containment').map((e: any, i: number) => ({
              id: `imp-ce-${i}`,
              source: String(e.from),
              target: String(e.to),
              type: 'hitecEdge',
              data: { edgeType: e.type, value: e.value },
            }));
            const links = (data.links || []).map((l: any) => ({ elementaryId: String(l.elem), componentId: String(l.comp) }));
            graph.loadGraph({
              structureNodes: sNodes,
              structureEdges: sEdges,
              causalNodes: cNodes,
              causalEdges: cEdges,
              crossLinks: links,
            });
          }
        } catch {
          alert('Erreur de parsing JSON.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [graph]);

  // Context menu actions
  const handleCtxAdd = useCallback((nodeType: HITeCNodeType) => {
    if (!ctxMenu) return;
    graph.pushUndo();
    graph.addNode(ctxMenu.view, nodeType, { x: ctxMenu.x, y: ctxMenu.y });
    setCtxMenu(null);
  }, [ctxMenu, graph]);

  const handleCtxDelete = useCallback(() => {
    if (!ctxMenu) return;
    graph.pushUndo();
    if (graph.selectedNodeId) {
      graph.removeNode(ctxMenu.view, graph.selectedNodeId);
    } else if (graph.selectedEdgeId) {
      graph.removeEdge(ctxMenu.view, graph.selectedEdgeId);
    }
    setCtxMenu(null);
  }, [ctxMenu, graph]);

  const handleCtxLayout = useCallback((layoutType: 'hierarchical' | 'radial' | 'force') => {
    handleLayout(layoutType);
    setCtxMenu(null);
  }, [handleLayout]);

  // Dropdowns
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const toggleDropdown = useCallback((id: string) => {
    setOpenDropdown(prev => prev === id ? null : id);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => { setOpenDropdown(null); setCtxMenu(null); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  if (!user) {
    navigate('/');
    return null;
  }

  const minPx = 300;

  return (
    <div className="pod-definition">
      <EdgeMarkers />

      {/* TOOLBAR */}
      <div className="pod-toolbar">
        <span className="pod-toolbar-title">{'📐'} Pod Definition</span>

        <div className="toolbar-group">
          <select
            className="preset-select"
            defaultValue=""
            onChange={e => { handlePreset(e.target.value); e.target.value = ''; }}
          >
            <option value="">\u2014 Exemples \u2014</option>
            {Object.entries(PRESETS).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="toolbar-group">
          <div className="dropdown" onClick={e => e.stopPropagation()}>
            <button className="tb-btn" onClick={() => toggleDropdown('struct')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              Structure
            </button>
            {openDropdown === 'struct' && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => { handleAddNode('structure', 'complex'); setOpenDropdown(null); }}>🔷 Complex</div>
                <div className="dropdown-item" onClick={() => { handleAddNode('structure', 'elementary'); setOpenDropdown(null); }}>🟢 Elementary</div>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-group">
          <div className="dropdown" onClick={e => e.stopPropagation()}>
            <button className="tb-btn" onClick={() => toggleDropdown('causal')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              Causal
            </button>
            {openDropdown === 'causal' && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => { handleAddNode('causal', 'component'); setOpenDropdown(null); }}>⚙️ Component</div>
                <div className="dropdown-item" onClick={() => { handleAddNode('causal', 'potential'); setOpenDropdown(null); }}>⚡ Potential</div>
                <div className="dropdown-item" onClick={() => { handleAddNode('causal', 'potentiality'); setOpenDropdown(null); }}>💎 Potentiality</div>
                <div className="dropdown-item" onClick={() => { handleAddNode('causal', 'actuality'); setOpenDropdown(null); }}>🔴 Actuality</div>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-group">
          <button className="tb-btn" onClick={() => graph.undo()} disabled={!graph.canUndo} title="Undo (Ctrl+Z)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"/></svg>
          </button>
          <button className="tb-btn" onClick={() => graph.redo()} disabled={!graph.canRedo} title="Redo (Ctrl+Y)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4"/></svg>
          </button>
        </div>

        <div className="toolbar-group">
          <div className="dropdown" onClick={e => e.stopPropagation()}>
            <button className="tb-btn" onClick={() => toggleDropdown('layout')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="8" y="14" width="7" height="7" rx="1"/></svg>
              Layout
            </button>
            {openDropdown === 'layout' && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => { handleLayout('hierarchical'); setOpenDropdown(null); }}>🔽 Hierarchique</div>
                <div className="dropdown-item" onClick={() => { handleLayout('radial'); setOpenDropdown(null); }}>🔘 Radial</div>
                <div className="dropdown-item" onClick={() => { handleLayout('force'); setOpenDropdown(null); }}>💫 Force-directed</div>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-group">
          <button className="tb-btn" onClick={handleImport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Import
          </button>
          <button className="tb-btn" onClick={handleExport}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Export
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <button className="tb-btn" onClick={() => navigate('/lobby')} title="Retour au lobby">
          \u2190 Lobby
        </button>

        <div className="collab-bar">
          <span className="collab-label">Room: {roomName}</span>
          {user && (
            <div className="collab-avatar" style={{ background: user.color }} title={user.username}>
              {user.avatar}
            </div>
          )}
          {peers.filter(p => p.username !== user?.username).slice(0, 3).map((p, i) => (
            <div key={i} className="collab-avatar" style={{ background: p.color, marginLeft: -5 }} title={p.username}>
              {p.avatar}
            </div>
          ))}
        </div>
      </div>

      {/* SPLIT VIEWS */}
      <div className="split-container" ref={splitRef}>
        {/* Structure View */}
        <div className="view-pane" style={{ flex: `0 0 ${splitPercent}%`, minWidth: minPx }}>
          <StructureFlowWrapper
            view="structure"
            nodes={graph.structureNodes}
            edges={graph.structureEdges}
            onNodesChange={onStructureNodesChange}
            onEdgesChange={onStructureEdgesChange}
            onConnect={onStructureConnect}
            onNodeClick={handleNodeClick('structure')}
            onEdgeClick={handleEdgeClick('structure')}
            onPaneClick={handlePaneClick}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* Divider */}
        <div
          className={`split-divider${isDividerDragging ? ' active' : ''}`}
          onMouseDown={handleDividerMouseDown}
        />

        {/* Cross-view links overlay */}
        <CrossViewLinks splitRef={splitRef} />

        {/* Causal View */}
        <div className="view-pane" style={{ flex: `0 0 ${100 - splitPercent}%`, minWidth: minPx }}>
          <CausalFlowWrapper
            view="causal"
            nodes={graph.causalNodes}
            edges={graph.causalEdges}
            onNodesChange={onCausalNodesChange}
            onEdgesChange={onCausalEdgesChange}
            onConnect={onCausalConnect}
            onNodeClick={handleNodeClick('causal')}
            onEdgeClick={handleEdgeClick('causal')}
            onPaneClick={handlePaneClick}
            onContextMenu={handleContextMenu}
          />
        </div>
      </div>

      {/* Property Panel */}
      <PropertyPanel />

      {/* Context Menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          view={ctxMenu.view}
          hasSelection={!!(graph.selectedNodeId || graph.selectedEdgeId)}
          onAddNode={handleCtxAdd}
          onDelete={handleCtxDelete}
          onLayout={handleCtxLayout}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
