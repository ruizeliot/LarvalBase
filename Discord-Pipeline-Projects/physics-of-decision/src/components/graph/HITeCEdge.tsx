import { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import type { HITeCEdgeData } from '../../types/hitec';
import { EDGE_TYPE_META } from '../../types/hitec';

function HITeCEdgeComponent({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data,
  selected,
}: EdgeProps & { data?: HITeCEdgeData }) {
  const edgeType = data?.edgeType || 'containment';
  const meta = EDGE_TYPE_META[edgeType];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition, targetPosition,
  });

  const labelText = data?.value ? `${meta.label}: ${data.value}` : meta.label;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        stroke={meta.color}
        strokeWidth={selected ? meta.strokeWidth + 1.5 : meta.strokeWidth}
        strokeDasharray={meta.strokeDasharray}
        fill="none"
        markerEnd={`url(#arrow-${edgeType})`}
      />
      <EdgeLabelRenderer>
        <div
          className="hitec-edge-label"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            color: data?.value ? meta.color : '#64748b',
            fontWeight: data?.value ? 600 : 400,
            opacity: selected ? 1 : 0,
            pointerEvents: selected ? 'all' : 'none',
          }}
        >
          {labelText}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(HITeCEdgeComponent);
