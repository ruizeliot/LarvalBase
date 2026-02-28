/**
 * Taxonomy tree builder service.
 *
 * Builds the Order > Family > Genus > Species hierarchy using O(n) object reference pattern.
 * No recursion needed - Map lookups and in-place mutation provide linear time complexity.
 */
import type { TaxonomyNode, TaxonomyNodeJSON } from '@/lib/types/taxonomy.types';
import type { Species } from '@/lib/types/species.types';

/**
 * Build a taxonomy tree from a list of species.
 *
 * Algorithm: O(n) single pass using object references
 * - For each species, get-or-create nodes at each level
 * - Increment counts up the tree via direct object mutation
 * - No copying, no recursion
 *
 * @param species - Array of Species objects
 * @returns Root TaxonomyNode with full tree structure
 */
export function buildTaxonomyTree(species: Species[]): TaxonomyNode {
  const root: TaxonomyNode = {
    name: 'All Species',
    level: 'root',
    children: new Map(),
    speciesCount: 0,
  };

  for (const s of species) {
    // Families directly under root (no order level)
    if (!root.children.has(s.family)) {
      root.children.set(s.family, {
        name: s.family,
        level: 'family',
        children: new Map(),
        speciesCount: 0,
      });
    }
    const familyNode = root.children.get(s.family)!;

    // Get or create genus node under family
    if (!familyNode.children.has(s.genus)) {
      familyNode.children.set(s.genus, {
        name: s.genus,
        level: 'genus',
        children: new Map(),
        speciesCount: 0,
      });
    }
    const genusNode = familyNode.children.get(s.genus)!;

    // Add species as leaf (use validName as key)
    // Only add if not already present (deduplication)
    if (!genusNode.children.has(s.validName)) {
      genusNode.children.set(s.validName, {
        name: s.validName,
        level: 'species',
        children: new Map(),
        speciesCount: 1,
      });

      // Update counts up the tree (object references!)
      genusNode.speciesCount++;
      familyNode.speciesCount++;
      root.speciesCount++;
    }
  }

  return root;
}

/**
 * Convert TaxonomyNode (with Maps) to JSON-serializable format.
 * Recursively converts children Maps to sorted arrays.
 *
 * @param node - TaxonomyNode with Map children
 * @returns TaxonomyNodeJSON with array children
 */
export function taxonomyToJSON(node: TaxonomyNode): TaxonomyNodeJSON {
  const children = Array.from(node.children.values())
    .map(taxonomyToJSON)
    .sort((a, b) => {
      // Families sorted by decreasing species count, then alphabetically
      if (a.level === 'family' && b.level === 'family') {
        const diff = b.speciesCount - a.speciesCount;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

  return {
    name: node.name,
    level: node.level,
    speciesCount: node.speciesCount,
    children,
  };
}

/**
 * Find a node in the taxonomy tree by path.
 *
 * @param root - Root of taxonomy tree
 * @param path - Array of names from root to target (e.g., ["Perciformes", "Acanthuridae"])
 * @returns TaxonomyNode or null if not found
 */
export function findTaxonomyNode(
  root: TaxonomyNode,
  path: string[]
): TaxonomyNode | null {
  let current: TaxonomyNode | undefined = root;

  for (const name of path) {
    current = current.children.get(name);
    if (!current) return null;
  }

  return current;
}

/**
 * Get all species names under a taxonomy node.
 *
 * @param node - TaxonomyNode to search under
 * @returns Array of species validNames
 */
export function getSpeciesUnderNode(node: TaxonomyNode): string[] {
  const species: string[] = [];

  function collect(n: TaxonomyNode) {
    if (n.level === 'species') {
      species.push(n.name);
    } else {
      for (const child of n.children.values()) {
        collect(child);
      }
    }
  }

  collect(node);
  return species;
}

/**
 * Get counts at each taxonomy level.
 *
 * @param root - Root of taxonomy tree
 * @returns Object with orderCount, familyCount, genusCount, speciesCount
 */
export function getTaxonomyCounts(root: TaxonomyNode): {
  orderCount: number;
  familyCount: number;
  genusCount: number;
  speciesCount: number;
} {
  let familyCount = 0;
  let genusCount = 0;

  // Families are now directly under root (no order level)
  for (const familyNode of root.children.values()) {
    familyCount++;
    genusCount += familyNode.children.size;
  }

  return {
    orderCount: 0,
    familyCount,
    genusCount,
    speciesCount: root.speciesCount,
  };
}
