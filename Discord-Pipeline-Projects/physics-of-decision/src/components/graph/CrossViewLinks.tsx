import { useEffect, useState, type RefObject } from 'react';
import { useGraph } from '../../context/GraphContext';

interface Props {
  splitRef: RefObject<HTMLDivElement | null>;
}

export default function CrossViewLinks({ splitRef }: Props) {
  const { crossLinks, highlightedNodeIds, structureNodes, causalNodes } = useGraph();
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

  useEffect(() => {
    if (highlightedNodeIds.size === 0) {
      setLines([]);
      return;
    }

    const updateLines = () => {
      if (!splitRef.current) return;
      const splitRect = splitRef.current.getBoundingClientRect();
      const newLines: typeof lines = [];

      crossLinks.forEach(link => {
        const elemNode = structureNodes.find(n => n.id === link.elementaryId);
        const compNode = causalNodes.find(n => n.id === link.componentId);
        if (!elemNode || !compNode) return;
        if (!highlightedNodeIds.has(elemNode.id) && !highlightedNodeIds.has(compNode.id)) return;

        // Find DOM elements for these nodes
        const elemEl = splitRef.current!.querySelector(`[data-id="${link.elementaryId}"]`);
        const compEl = splitRef.current!.querySelector(`[data-id="${link.componentId}"]`);
        if (!elemEl || !compEl) return;

        const eRect = elemEl.getBoundingClientRect();
        const cRect = compEl.getBoundingClientRect();

        newLines.push({
          x1: eRect.right - splitRect.left,
          y1: eRect.top + eRect.height / 2 - splitRect.top,
          x2: cRect.left - splitRect.left,
          y2: cRect.top + cRect.height / 2 - splitRect.top,
        });
      });

      setLines(newLines);
    };

    updateLines();
    const interval = setInterval(updateLines, 200);
    return () => clearInterval(interval);
  }, [highlightedNodeIds, crossLinks, structureNodes, causalNodes, splitRef]);

  if (lines.length === 0) return null;

  return (
    <svg className="cross-link-overlay">
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1}
          x2={l.x2} y2={l.y2}
          stroke="#fbbf24"
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.7"
        >
          <animate
            attributeName="opacity"
            values="0.4;0.8;0.4"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </line>
      ))}
    </svg>
  );
}
