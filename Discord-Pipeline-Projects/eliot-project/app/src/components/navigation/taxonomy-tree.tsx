"use client";

import { useState } from "react";
import { Tree, NodeRendererProps } from "react-arborist";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { TaxonomyNodeJSON } from "@/lib/types/taxonomy.types";
import { cleanOrderName } from "@/lib/utils/clean-order-name";
import { TaxonomyLevelIcon } from "./taxonomy-level-icon";

interface TaxonomyTreeProps {
  data: TaxonomyNodeJSON | null;
  onSelectSpecies: (speciesName: string) => void;
  height?: number;
}

interface ArboristNode {
  id: string;
  name: string;
  level: string;
  speciesCount: number;
  familyName?: string;
  children?: ArboristNode[];
}

/**
 * Transform TaxonomyNodeJSON to react-arborist format.
 * Recursively converts children array, propagating familyName down.
 */
function transformToArboristData(node: TaxonomyNodeJSON, parentFamilyName?: string): ArboristNode {
  const familyName = node.level === 'family' ? node.name : parentFamilyName;
  return {
    id: `${node.level}-${node.name}`,
    name: node.name,
    level: node.level,
    speciesCount: node.speciesCount,
    familyName,
    children:
      node.children.length > 0
        ? node.children.map((child) => transformToArboristData(child, familyName))
        : undefined,
  };
}

/**
 * Tiny family silhouette icon for the sidebar tree.
 * Falls back to a colored dot if the SVG fails to load.
 */
function FamilySilhouette({ family, className = '' }: { family: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return <span className={`inline-block w-4 h-4 rounded-full bg-amber-400/40 shrink-0 ${className}`} />;
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`/family-icons/${family}.svg`}
      alt=""
      width={16}
      height={16}
      className={`shrink-0 object-contain ${className}`}
      style={{ filter: 'brightness(0) invert(1)' }}
      onError={() => setErr(true)}
    />
  );
}

/**
 * Custom node renderer for taxonomy tree.
 * Shows expand/collapse chevron, icon, name, and species count badge.
 */
function TaxonomyNode({
  node,
  style,
  dragHandle,
}: NodeRendererProps<ArboristNode>) {
  const isLeaf = node.isLeaf;
  const isSelected = node.isSelected;
  const data = node.data;

  // Get indent level for styling
  const levelColors: Record<string, string> = {
    root: "text-foreground",
    order: "text-foreground",
    family: "text-muted-foreground",
    genus: "text-muted-foreground",
    species: "text-foreground",
  };

  return (
    <div
      ref={dragHandle}
      style={style}
      className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-sm
        ${isSelected ? "bg-accent" : "hover:bg-accent/50"}
        ${levelColors[data.level] || "text-foreground"}
      `}
      onClick={() => {
        if (node.isInternal) {
          node.toggle();
        }
      }}
    >
      {/* Expand/collapse chevron */}
      {node.isInternal ? (
        node.isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )
      ) : (
        <span className="w-4" />
      )}

      {/* Family silhouette SVG for family/genus/species nodes, Lucide icons for root/order */}
      {data.level === 'family' ? (
        <FamilySilhouette family={data.name} />
      ) : (data.level === 'genus' || data.level === 'species') && data.familyName ? (
        <FamilySilhouette family={data.familyName} className={data.level === 'species' ? 'opacity-70' : ''} />
      ) : (
        <TaxonomyLevelIcon
          level={data.level as 'root' | 'order' | 'family' | 'genus' | 'species'}
          familyName={data.familyName}
        />
      )}

      {/* Name */}
      <span className={`truncate flex-1 ${isLeaf ? "italic" : ""}`}>
        {data.level === 'order' ? cleanOrderName(data.name) : data.name}
      </span>

      {/* Species count badge (for non-leaf nodes) */}
      {!isLeaf && data.speciesCount > 0 && (
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {data.speciesCount}
        </span>
      )}
    </div>
  );
}

/**
 * Virtualized taxonomy tree using react-arborist.
 * Displays Order > Family > Genus > Species hierarchy.
 * Species names shown in italic.
 */
export function TaxonomyTree({
  data,
  onSelectSpecies,
  height = 300,
}: TaxonomyTreeProps) {
  if (!data) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Loading taxonomy...
      </div>
    );
  }

  // Transform data for react-arborist
  const arboristData = [transformToArboristData(data)];

  return (
    <div className="taxonomy-tree">
      <Tree<ArboristNode>
        data={arboristData}
        openByDefault={false}
        width="100%"
        height={height}
        rowHeight={32}
        indent={16}
        overscanCount={5}
        onSelect={(nodes) => {
          const selected = nodes[0];
          if (selected?.isLeaf && selected.data.level === "species") {
            onSelectSpecies(selected.data.name);
          }
        }}
      >
        {TaxonomyNode}
      </Tree>
    </div>
  );
}
