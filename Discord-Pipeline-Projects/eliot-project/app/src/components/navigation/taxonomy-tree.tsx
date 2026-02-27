"use client";

import { Tree, NodeRendererProps } from "react-arborist";
import { ChevronRight, ChevronDown, Fish, Globe, Layers, Users, Tag } from "lucide-react";
import type { TaxonomyNodeJSON } from "@/lib/types/taxonomy.types";

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
  children?: ArboristNode[];
}

/**
 * Transform TaxonomyNodeJSON to react-arborist format.
 * Recursively converts children array.
 */
function transformToArboristData(node: TaxonomyNodeJSON): ArboristNode {
  return {
    id: `${node.level}-${node.name}`,
    name: node.name,
    level: node.level,
    speciesCount: node.speciesCount,
    children:
      node.children.length > 0
        ? node.children.map(transformToArboristData)
        : undefined,
  };
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

      {/* Taxonomic level icon */}
      {data.level === 'species' ? (
        <Fish className="h-4 w-4 shrink-0 text-blue-400" />
      ) : data.level === 'genus' ? (
        <Tag className="h-4 w-4 shrink-0 text-emerald-400" />
      ) : data.level === 'family' ? (
        <Users className="h-4 w-4 shrink-0 text-amber-400" />
      ) : data.level === 'order' ? (
        <Layers className="h-4 w-4 shrink-0 text-purple-400" />
      ) : (
        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}

      {/* Name */}
      <span className={`truncate flex-1 ${isLeaf ? "italic" : ""}`}>
        {data.name}
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
