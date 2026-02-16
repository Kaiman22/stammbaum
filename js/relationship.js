/* ═══════════════════════════════════════════════════════════
   STAMMBAUM – Relationship Calculator
   BFS pathfinding, German relationship terms, DNA estimation
   ═══════════════════════════════════════════════════════════ */

const Relationship = (() => {

  /**
   * Build adjacency structures from members & relationships
   * Returns: { parentOf: Map, childOf: Map, spouseOf: Map }
   */
  function buildGraph(members, relationships) {
    const parentOf = new Map();  // parentId -> [childId, ...]
    const childOf = new Map();   // childId -> [parentId, ...]
    const spouseOf = new Map();  // personId -> [spouseId, ...]
    const siblingOf = new Map(); // personId -> [siblingId, ...]

    for (const m of members) {
      parentOf.set(m.id, []);
      childOf.set(m.id, []);
      spouseOf.set(m.id, []);
      siblingOf.set(m.id, []);
    }

    for (const r of relationships) {
      if (r.type === 'parent_child') {
        // fromId = parent, toId = child
        if (parentOf.has(r.fromId)) parentOf.get(r.fromId).push(r.toId);
        if (childOf.has(r.toId)) childOf.get(r.toId).push(r.fromId);
      } else if (r.type === 'spouse') {
        if (spouseOf.has(r.fromId)) spouseOf.get(r.fromId).push(r.toId);
        if (spouseOf.has(r.toId)) spouseOf.get(r.toId).push(r.fromId);
      } else if (r.type === 'sibling') {
        if (siblingOf.has(r.fromId)) siblingOf.get(r.fromId).push(r.toId);
        if (siblingOf.has(r.toId)) siblingOf.get(r.toId).push(r.fromId);
      }
    }

    return { parentOf, childOf, spouseOf, siblingOf };
  }

  /**
   * Find the path between two people using BFS over family connections.
   * Returns array of { id, edgeType } or null if no path found.
   * edgeType: 'parent', 'child', 'spouse'
   */
  function findPath(fromId, toId, graph) {
    if (fromId === toId) return [{ id: fromId, edgeType: null }];

    const { parentOf, childOf, spouseOf, siblingOf } = graph;
    const visited = new Set();
    // Queue entries: { id, path: [{id, edgeType}] }
    const queue = [{ id: fromId, path: [{ id: fromId, edgeType: null }] }];
    visited.add(fromId);

    while (queue.length > 0) {
      const { id, path } = queue.shift();

      // Get neighbors with edge types
      const neighbors = [];

      // Parents (going up)
      for (const parentId of (childOf.get(id) || [])) {
        neighbors.push({ id: parentId, edgeType: 'parent' });
      }
      // Children (going down)
      for (const childId of (parentOf.get(id) || [])) {
        neighbors.push({ id: childId, edgeType: 'child' });
      }
      // Spouses (lateral)
      for (const spouseId of (spouseOf.get(id) || [])) {
        neighbors.push({ id: spouseId, edgeType: 'spouse' });
      }
      // Siblings (lateral)
      for (const siblingId of (siblingOf.get(id) || [])) {
        neighbors.push({ id: siblingId, edgeType: 'sibling' });
      }

      for (const neighbor of neighbors) {
        if (visited.has(neighbor.id)) continue;
        visited.add(neighbor.id);
        const newPath = [...path, { id: neighbor.id, edgeType: neighbor.edgeType }];

        if (neighbor.id === toId) {
          return newPath;
        }
        queue.push({ id: neighbor.id, path: newPath });
      }
    }

    return null; // No connection found
  }

  /**
   * Find the common ancestor between two people.
   * Returns { ancestor, stepsA, stepsB } or null.
   */
  function findCommonAncestor(fromId, toId, graph) {
    const { childOf } = graph;

    // Get all ancestors of person A with their distance
    function getAncestors(personId) {
      const ancestors = new Map(); // ancestorId -> distance
      const queue = [{ id: personId, dist: 0 }];
      const visited = new Set([personId]);

      while (queue.length > 0) {
        const { id, dist } = queue.shift();
        ancestors.set(id, dist);

        for (const parentId of (childOf.get(id) || [])) {
          if (!visited.has(parentId)) {
            visited.add(parentId);
            queue.push({ id: parentId, dist: dist + 1 });
          }
        }
      }
      return ancestors;
    }

    const ancestorsA = getAncestors(fromId);
    const ancestorsB = getAncestors(toId);

    // Find the common ancestor with minimum total distance
    let bestAncestor = null;
    let bestTotal = Infinity;

    for (const [ancestorId, distA] of ancestorsA) {
      if (ancestorsB.has(ancestorId)) {
        const distB = ancestorsB.get(ancestorId);
        if (distA + distB < bestTotal) {
          bestTotal = distA + distB;
          bestAncestor = { id: ancestorId, stepsA: distA, stepsB: distB };
        }
      }
    }

    return bestAncestor;
  }

  /**
   * Determine the German relationship term between two people.
   * Uses the path and common ancestor analysis.
   */
  function getRelationshipTerm(fromId, toId, graph, membersMap) {
    if (fromId === toId) return { term: 'Ich selbst', degree: 0 };

    const path = findPath(fromId, toId, graph);
    if (!path) return { term: 'Keine Verbindung gefunden', degree: null };

    // Analyze path for edge types
    const edges = path.slice(1).map(p => p.edgeType);

    // Direct spouse
    if (edges.length === 1 && edges[0] === 'spouse') {
      const person = membersMap.get(toId);
      // Could differentiate Ehemann/Ehefrau if gender info available
      return { term: 'Ehepartner', degree: 0, path };
    }

    // Direct sibling edge
    if (edges.length === 1 && edges[0] === 'sibling') {
      return { term: 'Geschwister', degree: 1, path };
    }

    // Count generations up and down (ignoring spouse and sibling edges)
    const bloodEdges = edges.filter(e => e !== 'spouse' && e !== 'sibling');
    const ups = bloodEdges.filter(e => e === 'parent').length;
    const downs = bloodEdges.filter(e => e === 'child').length;
    const hasSpouse = edges.includes('spouse');
    const hasSibling = edges.includes('sibling');

    // Direct line (no spouse in path or spouse at end/start)
    if (downs === 0 && ups > 0) {
      // Going up: parent, grandparent, etc.
      if (hasSpouse) {
        return { term: getAncestorTerm(ups) + ' (angeheiratet)', degree: ups, path };
      }
      return { term: getAncestorTerm(ups), degree: ups, path };
    }

    if (ups === 0 && downs > 0) {
      // Going down: child, grandchild, etc.
      if (hasSpouse) {
        return { term: getDescendantTerm(downs) + ' (angeheiratet)', degree: downs, path };
      }
      return { term: getDescendantTerm(downs), degree: downs, path };
    }

    // Sibling
    if (ups === 1 && downs === 1 && !hasSpouse) {
      return { term: 'Geschwister', degree: 1, path };
    }

    // Use common ancestor approach for cousins, etc.
    const common = findCommonAncestor(fromId, toId, graph);
    if (common) {
      const stepsA = common.stepsA;
      const stepsB = common.stepsB;

      if (stepsA === stepsB) {
        // Same generation
        if (stepsA === 1) return { term: 'Geschwister', degree: 1, path };
        const cousinDegree = stepsA - 1;
        return {
          term: getCousinTerm(cousinDegree),
          degree: cousinDegree,
          path
        };
      } else {
        // Different generations: "removed" cousins
        const minSteps = Math.min(stepsA, stepsB);
        const maxSteps = Math.max(stepsA, stepsB);
        const removed = maxSteps - minSteps;

        if (minSteps === 1) {
          // Aunt/Uncle or Niece/Nephew territory
          if (stepsA < stepsB) {
            // We're going up less, so target is a descendant direction
            return { term: getAuntUncleTerm(removed), degree: removed, path };
          } else {
            return { term: getNieceNephewTerm(removed), degree: removed, path };
          }
        }

        const cousinDegree = minSteps - 1;
        return {
          term: `${getCousinTerm(cousinDegree)} ${removed}x entfernt`,
          degree: cousinDegree,
          path
        };
      }
    }

    // Fallback: describe via path length
    if (hasSpouse) {
      return { term: `Verwandt über ${edges.length} Verbindungen (angeheiratet)`, degree: edges.length, path };
    }
    return { term: `Verwandt über ${edges.length} Verbindungen`, degree: edges.length, path };
  }

  function getAncestorTerm(generations) {
    switch (generations) {
      case 1: return 'Elternteil';
      case 2: return 'Großelternteil';
      case 3: return 'Urgroßelternteil';
      default: return `Ur${'ur'.repeat(generations - 3)}großelternteil`;
    }
  }

  function getDescendantTerm(generations) {
    switch (generations) {
      case 1: return 'Kind';
      case 2: return 'Enkelkind';
      case 3: return 'Urenkelkind';
      default: return `Ur${'ur'.repeat(generations - 3)}enkelkind`;
    }
  }

  function getCousinTerm(degree) {
    switch (degree) {
      case 1: return 'Cousin/Cousine';
      case 2: return 'Cousin/Cousine 2. Grades';
      default: return `Cousin/Cousine ${degree}. Grades`;
    }
  }

  function getAuntUncleTerm(generationsRemoved) {
    switch (generationsRemoved) {
      case 1: return 'Onkel/Tante';
      case 2: return 'Großonkel/Großtante';
      case 3: return 'Urgroßonkel/Urgroßtante';
      default: return `Ur${'ur'.repeat(generationsRemoved - 3)}großonkel/-tante`;
    }
  }

  function getNieceNephewTerm(generationsRemoved) {
    switch (generationsRemoved) {
      case 1: return 'Neffe/Nichte';
      case 2: return 'Großneffe/Großnichte';
      case 3: return 'Urgroßneffe/Urgroßnichte';
      default: return `Ur${'ur'.repeat(generationsRemoved - 3)}großneffe/-nichte`;
    }
  }

  /**
   * Estimate shared DNA percentage based on relationship.
   * Uses common ancestor when available, falls back to path-based estimation.
   *
   * Key rule: If the path between two people includes a spouse edge,
   * they share 0% DNA (they are connected by marriage, not blood).
   * DNA is only shared between blood relatives (parent-child, siblings, cousins).
   */
  function estimateSharedDNA(fromId, toId, graph) {
    if (fromId === toId) return 100;

    // First, check the BFS path to see if it includes any spouse edges.
    // If so, these two people are NOT blood-related → 0% shared DNA.
    const path = findPath(fromId, toId, graph);
    if (!path || path.length < 2) return null;

    const hasSpouseEdge = path.slice(1).some(p => p.edgeType === 'spouse');
    if (hasSpouseEdge) return 0;

    const common = findCommonAncestor(fromId, toId, graph);

    if (common) {
      const stepsA = common.stepsA;
      const stepsB = common.stepsB;

      // Special cases
      if (stepsA === 0 || stepsB === 0) {
        // Direct ancestor/descendant
        const generations = Math.max(stepsA, stepsB);
        return Math.max(0.01, (100 / Math.pow(2, generations))).toFixed(2);
      }

      // For relatives through common ancestor:
      // Shared DNA ≈ (1/2)^(stepsA + stepsB) * 100 * 2
      // The *2 accounts for two paths through both common ancestors (couple)
      const totalSteps = stepsA + stepsB;
      const shared = (1 / Math.pow(2, totalSteps - 1)) * 100;
      return Math.max(0.01, shared).toFixed(2);
    }

    // Fallback: estimate via BFS path length
    // Count only blood-relation edges (parent, child, sibling)
    const bloodSteps = path.slice(1).filter(p =>
      p.edgeType === 'parent' || p.edgeType === 'child' || p.edgeType === 'sibling'
    ).length;

    if (bloodSteps === 0) return null; // only spouse connections

    // Approximate: shared DNA ≈ (1/2)^(bloodSteps-1) * 100
    const shared = (1 / Math.pow(2, bloodSteps - 1)) * 100;
    return Math.max(0.01, shared).toFixed(2);
  }

  /**
   * Get full connection info between two people.
   */
  function getConnection(fromId, toId, members, relationships) {
    const graph = buildGraph(members, relationships);
    const membersMap = new Map(members.map(m => [m.id, m]));

    const relationship = getRelationshipTerm(fromId, toId, graph, membersMap);
    const dna = estimateSharedDNA(fromId, toId, graph);
    const path = relationship.path || findPath(fromId, toId, graph);

    // Find common ancestor for display
    const commonAncestor = findCommonAncestor(fromId, toId, graph);
    let commonAncestorName = null;
    if (commonAncestor && commonAncestor.id) {
      const ancestor = membersMap.get(commonAncestor.id);
      if (ancestor) {
        commonAncestorName = `${ancestor.firstName} ${ancestor.lastName}`;
      }
    }

    return {
      term: relationship.term,
      degree: relationship.degree,
      sharedDNA: dna,
      path: path,
      pathLength: path ? path.length - 1 : null,
      commonAncestor: commonAncestorName,
    };
  }

  /**
   * Get all node IDs on the path between two people (for highlighting).
   */
  function getPathNodeIds(fromId, toId, members, relationships) {
    const graph = buildGraph(members, relationships);
    const path = findPath(fromId, toId, graph);
    if (!path) return [];
    return path.map(p => p.id);
  }

  /**
   * Get all edge IDs on the path between two people (for highlighting).
   * Returns pairs of [fromId, toId].
   */
  function getPathEdgePairs(fromId, toId, members, relationships) {
    const graph = buildGraph(members, relationships);
    const path = findPath(fromId, toId, graph);
    if (!path || path.length < 2) return [];

    const pairs = [];
    for (let i = 0; i < path.length - 1; i++) {
      pairs.push([path[i].id, path[i + 1].id]);
    }
    return pairs;
  }

  return {
    buildGraph,
    findPath,
    findCommonAncestor,
    getRelationshipTerm,
    estimateSharedDNA,
    getConnection,
    getPathNodeIds,
    getPathEdgePairs,
  };
})();
