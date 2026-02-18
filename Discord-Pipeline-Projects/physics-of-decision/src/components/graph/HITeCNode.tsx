import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { HITeCNodeData } from '../../types/hitec';
import { NODE_TYPE_META } from '../../types/hitec';

function HITeCNodeComponent({ data, selected }: NodeProps & { data: HITeCNodeData }) {
  const meta = NODE_TYPE_META[data.nodeType];
  const subtype = data.params.find(p => p.key === 'Nature' || p.key === 'Type');

  return (
    <div
      className={`hitec-node${selected ? ' selected' : ''}`}
      style={{ '--node-color': meta.color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="hitec-port" />
      <div className="hitec-node-header" style={{ background: meta.gradient }}>
        <span className="hitec-node-icon">{meta.icon}</span>
        <span className="hitec-node-type">{meta.label}</span>
        {subtype && <span className="hitec-node-subtype">{subtype.value}</span>}
      </div>
      <div className="hitec-node-body">
        <div className="hitec-node-name">{data.label}</div>
        {data.description && <div className="hitec-node-desc">{data.description}</div>}
        {data.params
          .filter(p => p.key !== 'Nature' && p.key !== 'Type')
          .map((p, i) => (
            <div key={i} className="hitec-node-param">
              <span className="param-key">{p.key}</span>
              <span className="param-val">{p.value}</span>
            </div>
          ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="hitec-port" />
    </div>
  );
}

export default memo(HITeCNodeComponent);
