import { useState, useCallback } from 'react';
import { useGraph } from '../../context/GraphContext';
import { NODE_TYPE_META, EDGE_TYPE_META, type HITeCNodeType, type HITeCEdgeType } from '../../types/hitec';

export default function PropertyPanel() {
  const graph = useGraph();
  const [collapsed, setCollapsed] = useState(false);

  const selectedNode = graph.selectedNodeId
    ? [...graph.structureNodes, ...graph.causalNodes].find(n => n.id === graph.selectedNodeId)
    : null;

  const selectedEdge = graph.selectedEdgeId
    ? [...graph.structureEdges, ...graph.causalEdges].find(e => e.id === graph.selectedEdgeId)
    : null;

  const handleNodeUpdate = useCallback((field: string, value: string) => {
    if (!selectedNode || !graph.selectedView) return;
    graph.pushUndo();
    if (field === 'label') {
      graph.updateNodeData(graph.selectedView, selectedNode.id, { label: value });
    } else if (field === 'description') {
      graph.updateNodeData(graph.selectedView, selectedNode.id, { description: value });
    } else if (field === 'nodeType') {
      graph.updateNodeData(graph.selectedView, selectedNode.id, { nodeType: value as HITeCNodeType });
    }
  }, [selectedNode, graph]);

  const handleParamUpdate = useCallback((index: number, field: 'key' | 'value', val: string) => {
    if (!selectedNode || !graph.selectedView) return;
    graph.pushUndo();
    const params = [...selectedNode.data.params];
    params[index] = { ...params[index], [field]: val };
    graph.updateNodeData(graph.selectedView, selectedNode.id, { params });
  }, [selectedNode, graph]);

  const handleAddParam = useCallback(() => {
    if (!selectedNode || !graph.selectedView) return;
    graph.pushUndo();
    const params = [...selectedNode.data.params, { key: 'Nouveau', value: '' }];
    graph.updateNodeData(graph.selectedView, selectedNode.id, { params });
  }, [selectedNode, graph]);

  const handleRemoveParam = useCallback((index: number) => {
    if (!selectedNode || !graph.selectedView) return;
    graph.pushUndo();
    const params = selectedNode.data.params.filter((_, i) => i !== index);
    graph.updateNodeData(graph.selectedView, selectedNode.id, { params });
  }, [selectedNode, graph]);

  const handleEdgeTypeUpdate = useCallback((edgeType: string) => {
    if (!selectedEdge || !graph.selectedView) return;
    graph.pushUndo();
    const setter = graph.selectedView === 'structure' ? graph.setStructureEdges : graph.setCausalEdges;
    setter(prev => prev.map(e =>
      e.id === selectedEdge.id
        ? { ...e, data: { ...e.data!, edgeType: edgeType as HITeCEdgeType } }
        : e
    ));
  }, [selectedEdge, graph]);

  const handleEdgeValueUpdate = useCallback((value: string) => {
    if (!selectedEdge || !graph.selectedView) return;
    graph.pushUndo();
    const setter = graph.selectedView === 'structure' ? graph.setStructureEdges : graph.setCausalEdges;
    setter(prev => prev.map(e =>
      e.id === selectedEdge.id
        ? { ...e, data: { ...e.data!, value: value || undefined } }
        : e
    ));
  }, [selectedEdge, graph]);

  // Cross-links for selected node
  const linkedNames = selectedNode
    ? graph.crossLinks
        .filter(l => l.elementaryId === selectedNode.id || l.componentId === selectedNode.id)
        .map(l => {
          const targetId = l.elementaryId === selectedNode.id ? l.componentId : l.elementaryId;
          const node = [...graph.structureNodes, ...graph.causalNodes].find(n => n.id === targetId);
          return node?.data.label || '?';
        })
        .join(', ')
    : '';

  let title = 'Aucune selection';
  let body = null;

  if (selectedNode) {
    const meta = NODE_TYPE_META[selectedNode.data.nodeType];
    title = `${meta.icon} ${meta.label} \u2014 ${selectedNode.data.label}`;
    body = (
      <div className="prop-panel-body">
        <div className="prop-field">
          <label>Nom</label>
          <input
            value={selectedNode.data.label}
            onChange={e => handleNodeUpdate('label', e.target.value)}
          />
        </div>
        <div className="prop-field">
          <label>Type</label>
          <select
            value={selectedNode.data.nodeType}
            onChange={e => handleNodeUpdate('nodeType', e.target.value)}
          >
            {Object.entries(NODE_TYPE_META).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="prop-field">
          <label>X</label>
          <input type="number" value={Math.round(selectedNode.position.x)} readOnly style={{ background: '#f1f5f9' }} />
        </div>
        <div className="prop-field">
          <label>Y</label>
          <input type="number" value={Math.round(selectedNode.position.y)} readOnly style={{ background: '#f1f5f9' }} />
        </div>
        <div className="prop-field" style={{ gridColumn: '1 / -1' }}>
          <label>Description</label>
          <input
            value={selectedNode.data.description || ''}
            onChange={e => handleNodeUpdate('description', e.target.value)}
            placeholder="Description optionnelle..."
          />
        </div>
        {selectedNode.data.params.map((p, i) => (
          <div key={i} className="prop-field prop-param-field">
            <label>{p.key}</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                value={p.value}
                onChange={e => handleParamUpdate(i, 'value', e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="prop-remove-btn" onClick={() => handleRemoveParam(i)} title="Supprimer">\u00D7</button>
            </div>
          </div>
        ))}
        <div className="prop-field">
          <button className="prop-add-btn" onClick={handleAddParam}>+ Parametre</button>
        </div>
        {linkedNames && (
          <div className="prop-field" style={{ gridColumn: '1 / -1' }}>
            <label>Liens croises</label>
            <input value={linkedNames} disabled style={{ background: '#fffbeb', borderColor: '#fbbf24' }} />
          </div>
        )}
      </div>
    );
  } else if (selectedEdge) {
    const edgeType = selectedEdge.data?.edgeType || 'containment';
    const meta = EDGE_TYPE_META[edgeType];
    const sourceNode = [...graph.structureNodes, ...graph.causalNodes].find(n => n.id === selectedEdge.source);
    const targetNode = [...graph.structureNodes, ...graph.causalNodes].find(n => n.id === selectedEdge.target);
    title = `🔗 ${meta.label} \u2014 ${sourceNode?.data.label || '?'} \u2192 ${targetNode?.data.label || '?'}`;
    body = (
      <div className="prop-panel-body">
        <div className="prop-field">
          <label>Type</label>
          <select value={edgeType} onChange={e => handleEdgeTypeUpdate(e.target.value)}>
            {Object.entries(EDGE_TYPE_META).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>
        </div>
        <div className="prop-field">
          <label>Valeur</label>
          <input
            value={selectedEdge.data?.value || ''}
            onChange={e => handleEdgeValueUpdate(e.target.value)}
            placeholder="Optionnel"
          />
        </div>
        <div className="prop-field">
          <label>De</label>
          <input value={sourceNode?.data.label || ''} disabled style={{ background: '#f1f5f9' }} />
        </div>
        <div className="prop-field">
          <label>Vers</label>
          <input value={targetNode?.data.label || ''} disabled style={{ background: '#f1f5f9' }} />
        </div>
      </div>
    );
  } else {
    body = (
      <div className="prop-panel-body">
        <div className="prop-field" style={{ gridColumn: '1 / -1' }}>
          <label>Cliquez sur un noeud ou un lien pour voir ses proprietes</label>
        </div>
      </div>
    );
  }

  return (
    <div className={`prop-panel${collapsed ? ' collapsed' : ''}`} style={{ height: collapsed ? 28 : 160 }}>
      <div className="prop-panel-header" onClick={() => setCollapsed(!collapsed)}>
        <h3>{title}</h3>
        <span className={`chevron${collapsed ? ' rotated' : ''}`}>\u25BC</span>
      </div>
      {!collapsed && body}
    </div>
  );
}
