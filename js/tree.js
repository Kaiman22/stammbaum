/* ═══════════════════════════════════════════════════════════
   STAMMBAUM – Tree Visualization (Cytoscape.js)
   Couple-centered layout: spouses side-by-side with shared
   descent line from the midpoint of the couple connector.
   PCB / Circuit Board aesthetic
   ═══════════════════════════════════════════════════════════ */

const Tree = (() => {
  let cy = null;
  let members = [];
  let relationships = [];
  let highlightedPath = [];
  let onNodeTapCallback = null;
  let currentUserId = null;

  const COLORS = {
    trace: '#1a1a1a',
    traceFaint: '#d0d0d0',
    red: '#e63946',
    redGlow: 'rgba(230, 57, 70, 0.3)',
    blue: '#457b9d',
    bg: '#ffffff',
    bgSecondary: '#f8f9fa',
    textSecondary: '#6b7280',
    textMuted: '#9ca3af',
    spouseLine: '#457b9d',
  };

  // Layout constants
  const NODE_W = 170;
  const NODE_H = 62;
  const SPOUSE_GAP = 30;     // gap between spouse nodes
  const SIBLING_GAP = 50;    // gap between sibling nodes
  const GEN_GAP = 140;       // vertical gap between generations
  const COUPLE_NODE_SIZE = 1; // invisible midpoint node

  function init(containerId) {
    cy = cytoscape({
      container: document.getElementById(containerId),
      style: getCytoscapeStyle(),
      layout: { name: 'preset' },
      minZoom: 0.1,
      maxZoom: 3,
      wheelSensitivity: 0.3,
      boxSelectionEnabled: false,
      selectionType: 'single',
      autoungrabify: true,  // disable node dragging
    });

    // Tap on node
    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id();
      if (nodeId.startsWith('couple-')) return; // Skip couple midpoint nodes
      if (onNodeTapCallback) onNodeTapCallback(nodeId);
    });

    // Tap on background to deselect
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        clearHighlight();
      }
    });
  }

  function onNodeTap(callback) {
    onNodeTapCallback = callback;
  }

  function setCurrentUser(memberId) {
    currentUserId = memberId;
  }

  /**
   * Load data and render the tree with couple-centered layout.
   */
  function render(memberData, relationshipData) {
    members = memberData;
    relationships = relationshipData;

    const { elements, positions } = buildCoupleLayout(members, relationships);

    cy.elements().remove();
    cy.add(elements);

    // Apply positions
    for (const [id, pos] of Object.entries(positions)) {
      const node = cy.getElementById(id);
      if (node.length) {
        node.position(pos);
      }
    }

    // Mark current user's node
    if (currentUserId) {
      const node = cy.getElementById(currentUserId);
      if (node.length) {
        node.addClass('current-user');
      }
    }

    // Fit view
    cy.fit(undefined, 60);

    // Short animation: fade in
    cy.style().update();
  }

  /**
   * Build the couple-centered layout.
   *
   * Strategy:
   * 1. Identify "couples" (pairs connected by spouse edge) and singletons
   * 2. Build a generation tree: each couple/singleton → their children
   * 3. Assign generations (BFS from roots)
   * 4. Position: couples side-by-side, children centered below couple midpoint
   * 5. Add invisible "couple midpoint" nodes for edge routing
   */
  function buildCoupleLayout(members, relationships) {
    const elements = [];
    const positions = {};
    const memberMap = new Map(members.map(m => [m.id, m]));

    // ─── Build adjacency structures ───
    const spouseEdges = [];   // {from, to, id}
    const parentChildEdges = []; // {parent, child, id}
    const siblingEdges = [];  // {from, to, id}
    const spouseOf = new Map();  // personId -> [spouseId]
    const childrenOf = new Map(); // parentId -> [childId]
    const parentsOf = new Map();  // childId -> [parentId]

    for (const m of members) {
      spouseOf.set(m.id, []);
      childrenOf.set(m.id, []);
      parentsOf.set(m.id, []);
    }

    for (const r of relationships) {
      if (r.type === 'spouse') {
        spouseEdges.push({ from: r.fromId, to: r.toId, id: r.id });
        if (spouseOf.has(r.fromId)) spouseOf.get(r.fromId).push(r.toId);
        if (spouseOf.has(r.toId)) spouseOf.get(r.toId).push(r.fromId);
      } else if (r.type === 'parent_child') {
        parentChildEdges.push({ parent: r.fromId, child: r.toId, id: r.id });
        if (childrenOf.has(r.fromId)) childrenOf.get(r.fromId).push(r.toId);
        if (parentsOf.has(r.toId)) parentsOf.get(r.toId).push(r.fromId);
      } else if (r.type === 'sibling') {
        siblingEdges.push({ from: r.fromId, to: r.toId, id: r.id });
      }
    }

    // ─── Identify couples ───
    // A couple is a pair connected by a spouse edge.
    // One person can only be in one couple for layout purposes.
    const inCouple = new Map(); // personId -> coupleId
    const couples = []; // [{id, a, b}]

    for (const se of spouseEdges) {
      if (!inCouple.has(se.from) && !inCouple.has(se.to)) {
        const coupleId = `couple-${se.from}-${se.to}`;
        couples.push({ id: coupleId, a: se.from, b: se.to });
        inCouple.set(se.from, coupleId);
        inCouple.set(se.to, coupleId);
      }
    }

    // ─── Build "family units" ───
    // A family unit is a couple (or singleton parent) and their children.
    // Children of a couple = intersection of children of both partners,
    // OR children of either partner if only one parent_child edge exists.
    const coupleMap = new Map(couples.map(c => [c.id, c]));

    function getCoupleChildren(couple) {
      const childrenA = new Set(childrenOf.get(couple.a) || []);
      const childrenB = new Set(childrenOf.get(couple.b) || []);
      // Union of children from both partners
      const allChildren = new Set([...childrenA, ...childrenB]);
      return [...allChildren];
    }

    // ─── Assign generations ───
    // Phase 1: Use ONLY parent-child edges to assign generations via BFS.
    //          This avoids the problem where a spouse link (Beate→Stephan)
    //          pulls a person to the wrong generation before the parent-child
    //          link (Werner→Stephan) is processed.
    // Phase 2: Align spouses to the same generation (take the max gen).
    const generation = new Map(); // personId -> gen number

    // Find true roots: people with no parents in parent_child edges
    const roots = members.filter(m => {
      const parents = parentsOf.get(m.id) || [];
      return parents.length === 0;
    });

    // Phase 1: BFS using ONLY parent→child edges (no spouse traversal)
    const queue = [];
    for (const root of roots) {
      if (!generation.has(root.id)) {
        generation.set(root.id, 0);
        queue.push(root.id);
      }
    }

    if (queue.length === 0 && members.length > 0) {
      generation.set(members[0].id, 0);
      queue.push(members[0].id);
    }

    while (queue.length > 0) {
      const personId = queue.shift();
      const gen = generation.get(personId);

      // Children are next generation
      for (const childId of (childrenOf.get(personId) || [])) {
        if (!generation.has(childId)) {
          generation.set(childId, gen + 1);
          queue.push(childId);
        }
      }

      // Parents are previous generation (for people reached via other paths)
      for (const parentId of (parentsOf.get(personId) || [])) {
        if (!generation.has(parentId)) {
          generation.set(parentId, gen - 1);
          queue.push(parentId);
        }
      }
    }

    // Phase 2: Align spouses — each spouse gets the same generation
    // as their partner (use the generation of whichever was already assigned
    // via parent-child). If a spouse has no gen yet, inherit from partner.
    for (const se of spouseEdges) {
      const genA = generation.get(se.from);
      const genB = generation.get(se.to);
      if (genA !== undefined && genB === undefined) {
        generation.set(se.to, genA);
      } else if (genB !== undefined && genA === undefined) {
        generation.set(se.from, genB);
      } else if (genA !== undefined && genB !== undefined && genA !== genB) {
        // Both assigned but different — align to the one with parent-child links
        // The one who is a child of someone takes priority
        const aHasParents = (parentsOf.get(se.from) || []).length > 0;
        const bHasParents = (parentsOf.get(se.to) || []).length > 0;
        if (aHasParents && !bHasParents) {
          generation.set(se.to, genA);
        } else if (bHasParents && !aHasParents) {
          generation.set(se.from, genB);
        }
        // If both or neither have parents, keep whichever is larger (deeper)
        else {
          const maxGen = Math.max(genA, genB);
          generation.set(se.from, maxGen);
          generation.set(se.to, maxGen);
        }
      }
    }

    // Handle any remaining disconnected members
    for (const m of members) {
      if (!generation.has(m.id)) {
        generation.set(m.id, 0);
      }
    }

    // Normalize generations so minimum is 0
    const minGen = Math.min(...generation.values());
    if (minGen < 0) {
      for (const [id, gen] of generation) {
        generation.set(id, gen - minGen);
      }
    }

    // ─── Build layout tree (couples and their children) ───
    // Group by generation for layout
    const maxGen = Math.max(...generation.values(), 0);
    const genGroups = []; // genGroups[gen] = [{type:'couple'|'single', ...}]
    for (let g = 0; g <= maxGen; g++) genGroups.push([]);

    const placed = new Set(); // track placed members

    // Place couples first
    for (const couple of couples) {
      const gen = generation.get(couple.a) || 0;
      genGroups[gen].push({
        type: 'couple',
        id: couple.id,
        a: couple.a,
        b: couple.b,
        children: getCoupleChildren(couple),
      });
      placed.add(couple.a);
      placed.add(couple.b);
    }

    // Place singles (not in a couple)
    for (const m of members) {
      if (!placed.has(m.id)) {
        const gen = generation.get(m.id) || 0;
        const children = childrenOf.get(m.id) || [];
        genGroups[gen].push({
          type: 'single',
          id: m.id,
          children: children,
        });
        placed.add(m.id);
      }
    }

    // ─── Recursive positioning ───
    // We position top-down. Each unit (couple or single) gets a width,
    // and children are placed centered below.

    // Calculate subtree widths
    const unitWidth = new Map(); // unitKey -> width
    const childPlaced = new Set(); // children that have been assigned to a parent unit

    // Map each person to their "unit" for child attribution
    function getUnitForPerson(personId) {
      if (inCouple.has(personId)) return inCouple.get(personId);
      return personId;
    }

    // Build parent-unit → children mapping
    // Children belong to the couple their parent is in
    const unitChildren = new Map(); // unitId -> [childId, ...]

    for (const couple of couples) {
      const children = getCoupleChildren(couple);
      unitChildren.set(couple.id, children);
      for (const c of children) childPlaced.add(c);
    }

    // Singles with children
    for (const m of members) {
      if (!inCouple.has(m.id)) {
        const children = (childrenOf.get(m.id) || []).filter(c => !childPlaced.has(c));
        if (children.length > 0) {
          unitChildren.set(m.id, children);
          for (const c of children) childPlaced.add(c);
        }
      }
    }

    // Calculate the width needed for each unit, recursively
    function calcWidth(unitId) {
      if (unitWidth.has(unitId)) return unitWidth.get(unitId);

      const children = unitChildren.get(unitId) || [];

      // Base width of this unit
      let selfWidth;
      if (coupleMap.has(unitId)) {
        selfWidth = NODE_W * 2 + SPOUSE_GAP;
      } else {
        selfWidth = NODE_W;
      }

      if (children.length === 0) {
        unitWidth.set(unitId, selfWidth);
        return selfWidth;
      }

      // Width = sum of children subtree widths + gaps
      let childrenTotalWidth = 0;
      for (const childId of children) {
        const childUnit = getUnitForPerson(childId);
        // Only count each unit once
        const w = calcWidth(childUnit);
        childrenTotalWidth += w;
      }
      // Add gaps between children
      const uniqueChildUnits = [...new Set(children.map(c => getUnitForPerson(c)))];
      childrenTotalWidth = 0;
      for (const cu of uniqueChildUnits) {
        childrenTotalWidth += calcWidth(cu);
      }
      childrenTotalWidth += (uniqueChildUnits.length - 1) * SIBLING_GAP;

      const totalWidth = Math.max(selfWidth, childrenTotalWidth);
      unitWidth.set(unitId, totalWidth);
      return totalWidth;
    }

    // Calculate all widths
    for (const couple of couples) calcWidth(couple.id);
    for (const m of members) {
      if (!inCouple.has(m.id)) calcWidth(m.id);
    }

    // ─── Position units ───
    // Find root units (units in generation 0, or units with no parents)
    const rootUnits = [];
    for (const group of genGroups[0]) {
      rootUnits.push(group);
    }

    // If there are orphan units in other generations, add them
    const allUnitsPlaced = new Set();

    function positionUnit(unit, centerX, y) {
      if (allUnitsPlaced.has(unit.id || unit.a || unit)) return;
      allUnitsPlaced.add(unit.id || unit.a || unit);

      if (unit.type === 'couple') {
        const couple = coupleMap.get(unit.id);
        // Place A to the left, B to the right of center
        const ax = centerX - (SPOUSE_GAP / 2) - (NODE_W / 2);
        const bx = centerX + (SPOUSE_GAP / 2) + (NODE_W / 2);

        positions[couple.a] = { x: ax, y: y };
        positions[couple.b] = { x: bx, y: y };

        // Couple midpoint node
        positions[unit.id] = { x: centerX, y: y };

      } else {
        // Single person
        positions[unit.id] = { x: centerX, y: y };
      }

      // Position children
      const children = unit.children || [];
      if (children.length === 0) return;

      const childY = y + GEN_GAP;

      // Get unique child units
      const childUnitIds = [];
      const seen = new Set();
      for (const childId of children) {
        const cu = getUnitForPerson(childId);
        if (!seen.has(cu)) {
          seen.add(cu);
          childUnitIds.push(cu);
        }
      }

      // Calculate total children width
      let totalChildWidth = 0;
      for (const cuId of childUnitIds) {
        totalChildWidth += (unitWidth.get(cuId) || NODE_W);
      }
      totalChildWidth += (childUnitIds.length - 1) * SIBLING_GAP;

      // Start from left
      let childX = centerX - totalChildWidth / 2;

      for (const cuId of childUnitIds) {
        const w = unitWidth.get(cuId) || NODE_W;
        const childCenterX = childX + w / 2;

        // Find the unit info
        const coupleInfo = coupleMap.get(cuId);
        if (coupleInfo) {
          // This child is part of a couple
          const gen = generation.get(coupleInfo.a) || 0;
          const unitInfo = {
            type: 'couple',
            id: cuId,
            a: coupleInfo.a,
            b: coupleInfo.b,
            children: unitChildren.get(cuId) || [],
          };
          positionUnit(unitInfo, childCenterX, childY);
        } else {
          // Single child
          const unitInfo = {
            type: 'single',
            id: cuId,
            children: unitChildren.get(cuId) || [],
          };
          positionUnit(unitInfo, childCenterX, childY);
        }

        childX += w + SIBLING_GAP;
      }
    }

    // Position all root units side by side
    let totalRootWidth = 0;
    for (const ru of rootUnits) {
      const uid = ru.type === 'couple' ? ru.id : ru.id;
      totalRootWidth += (unitWidth.get(uid) || NODE_W);
    }
    totalRootWidth += (rootUnits.length - 1) * SIBLING_GAP * 2;

    let rootX = -totalRootWidth / 2;
    for (const ru of rootUnits) {
      const uid = ru.type === 'couple' ? ru.id : ru.id;
      const w = unitWidth.get(uid) || NODE_W;
      const cx = rootX + w / 2;
      positionUnit(ru, cx, 0);
      rootX += w + SIBLING_GAP * 2;
    }

    // Position any remaining unpositioned units (disconnected subtrees)
    for (let g = 0; g <= maxGen; g++) {
      for (const unit of genGroups[g]) {
        const uid = unit.type === 'couple' ? unit.id : unit.id;
        if (!allUnitsPlaced.has(uid)) {
          rootX += SIBLING_GAP * 2;
          const w = unitWidth.get(uid) || NODE_W;
          positionUnit(unit, rootX + w / 2, g * GEN_GAP);
          rootX += w;
        }
      }
    }

    // ─── Build Cytoscape elements ───

    // Person nodes
    for (const m of members) {
      const displayName = `${m.firstName} ${m.lastName}`;
      const subLabel = m.birthName || '';
      const yearLabel = getYearLabel(m.birthDate, m.deathDate);

      elements.push({
        group: 'nodes',
        data: {
          id: m.id,
          label: displayName,
          initials: getInitials(m.firstName, m.lastName),
          subLabel: subLabel,
          yearLabel: yearLabel,
          isDeceased: m.isDeceased || false,
          isPlaceholder: m.isPlaceholder || false,
        },
        classes: [
          m.isDeceased ? 'deceased' : 'alive',
          m.isPlaceholder ? 'placeholder' : 'claimed',
          m.id === currentUserId ? 'current-user' : '',
        ].filter(Boolean).join(' '),
      });
    }

    // Couple midpoint nodes (invisible, for edge routing)
    for (const couple of couples) {
      elements.push({
        group: 'nodes',
        data: {
          id: couple.id,
          label: '',
          coupleNode: true,
        },
        classes: 'couple-midpoint',
      });
    }

    // Spouse edges (between partners)
    for (const se of spouseEdges) {
      elements.push({
        group: 'edges',
        data: {
          id: `e-${se.id}`,
          source: se.from,
          target: se.to,
          relType: 'spouse',
        },
        classes: 'spouse-edge',
      });
    }

    // Parent-child edges: route through couple midpoint
    // If the parent is in a couple, the edge goes from the couple midpoint to the child
    // Otherwise from the parent directly to the child
    for (const pc of parentChildEdges) {
      const parentCoupleId = inCouple.get(pc.parent);

      if (parentCoupleId) {
        // Check if we already have an edge from this couple midpoint to this child
        const edgeId = `e-family-${parentCoupleId}-${pc.child}`;
        const existing = elements.find(e => e.data?.id === edgeId);
        if (!existing) {
          elements.push({
            group: 'edges',
            data: {
              id: edgeId,
              source: parentCoupleId,
              target: pc.child,
              relType: 'parent_child',
            },
            classes: 'parent-child-edge',
          });
        }
      } else {
        elements.push({
          group: 'edges',
          data: {
            id: `e-${pc.id}`,
            source: pc.parent,
            target: pc.child,
            relType: 'parent_child',
          },
          classes: 'parent-child-edge',
        });
      }
    }

    // Sibling edges (for display if explicit sibling relationships exist
    // that aren't already implied by shared parents)
    for (const se of siblingEdges) {
      elements.push({
        group: 'edges',
        data: {
          id: `e-${se.id}`,
          source: se.from,
          target: se.to,
          relType: 'sibling',
        },
        classes: 'sibling-edge',
      });
    }

    return { elements, positions };
  }

  /**
   * Get Cytoscape stylesheet (PCB aesthetic).
   */
  function getCytoscapeStyle() {
    return [
      // ─── Default Node (IC Chip style) ───
      {
        selector: 'node',
        style: {
          'shape': 'round-rectangle',
          'width': NODE_W,
          'height': NODE_H,
          'background-color': COLORS.bg,
          'border-width': 2,
          'border-color': COLORS.trace,
          'border-style': 'solid',
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'font-family': '"IBM Plex Mono", monospace',
          'font-size': 11,
          'font-weight': 500,
          'color': COLORS.trace,
          'text-wrap': 'ellipsis',
          'text-max-width': NODE_W - 20,
          'text-margin-y': -4,
          'transition-property': 'background-color, border-color, opacity, border-width',
          'transition-duration': '300ms',
          'transition-timing-function': 'ease-out',
          'z-index': 10,
        },
      },

      // Year label / birth name below the name
      {
        selector: 'node[yearLabel]',
        style: {
          'text-wrap': 'wrap',
          'label': (ele) => {
            if (ele.data('coupleNode')) return '';
            const name = ele.data('label');
            const year = ele.data('yearLabel');
            const sub = ele.data('subLabel');
            let text = name;
            if (sub) text += `\n${sub}`;
            if (year) text += `\n${year}`;
            return text;
          },
          'font-size': 10,
          'line-height': 1.4,
          'text-max-width': NODE_W - 20,
          'height': (ele) => {
            if (ele.data('coupleNode')) return COUPLE_NODE_SIZE;
            const sub = ele.data('subLabel');
            const year = ele.data('yearLabel');
            let h = 48;
            if (sub) h += 14;
            if (year) h += 14;
            return h;
          },
        },
      },

      // ─── Couple Midpoint (invisible node) ───
      {
        selector: 'node.couple-midpoint',
        style: {
          'width': COUPLE_NODE_SIZE,
          'height': COUPLE_NODE_SIZE,
          'background-opacity': 0,
          'border-width': 0,
          'label': '',
          'events': 'no',
          'z-index': 1,
        },
      },

      // ─── Deceased Node ───
      {
        selector: 'node.deceased',
        style: {
          'border-style': 'dashed',
          'border-color': COLORS.textMuted,
          'color': COLORS.textMuted,
          'background-color': COLORS.bgSecondary,
        },
      },

      // ─── Placeholder (not claimed) ───
      {
        selector: 'node.placeholder',
        style: {
          'border-style': 'dotted',
        },
      },

      // ─── Current User ───
      {
        selector: 'node.current-user',
        style: {
          'border-color': COLORS.red,
          'border-width': 3,
          'background-color': '#fff5f5',
        },
      },

      // ─── Highlighted Node (on path) ───
      {
        selector: 'node.highlighted',
        style: {
          'border-color': COLORS.red,
          'border-width': 3,
          'background-color': '#fff5f5',
          'z-index': 100,
        },
      },

      // ─── Dimmed Node (not on path) ───
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.15,
        },
      },

      // ─── Selected Node ───
      {
        selector: 'node:selected',
        style: {
          'border-color': COLORS.red,
          'border-width': 3,
        },
      },

      // ─── Parent-Child Edge (PCB trace) ───
      {
        selector: 'edge.parent-child-edge',
        style: {
          'width': 2,
          'line-color': COLORS.trace,
          'target-arrow-shape': 'none',
          'curve-style': 'taxi',
          'taxi-direction': 'downward',
          'taxi-turn': 40,
          'taxi-turn-min-distance': 20,
          'transition-property': 'line-color, width, opacity',
          'transition-duration': '300ms',
          'z-index': 5,
        },
      },

      // ─── Spouse Edge (solid, blue) ───
      {
        selector: 'edge.spouse-edge',
        style: {
          'width': 2,
          'line-color': COLORS.spouseLine,
          'line-style': 'solid',
          'target-arrow-shape': 'none',
          'curve-style': 'straight',
          'transition-property': 'line-color, width, opacity',
          'transition-duration': '300ms',
          'z-index': 5,
        },
      },

      // ─── Sibling Edge (dotted, green) ───
      {
        selector: 'edge.sibling-edge',
        style: {
          'width': 2,
          'line-color': '#6b9e78',
          'line-style': 'dotted',
          'line-dash-pattern': [4, 4],
          'target-arrow-shape': 'none',
          'curve-style': 'straight',
          'transition-property': 'line-color, width, opacity',
          'transition-duration': '300ms',
          'z-index': 5,
        },
      },

      // ─── Highlighted Edge (red) ───
      {
        selector: 'edge.highlighted',
        style: {
          'line-color': COLORS.red,
          'width': 4,
          'z-index': 100,
          'line-style': 'solid',
        },
      },

      // ─── Dimmed Edge ───
      {
        selector: 'edge.dimmed',
        style: {
          'opacity': 0.1,
        },
      },
    ];
  }

  /**
   * Highlight the path between two members.
   *
   * Edge routing: parent→child edges go through invisible couple-midpoint
   * nodes.  The BFS path (from Relationship module) returns person IDs only,
   * so a pair like [Stephan, Thomas] won't match any Cytoscape edge directly
   * because the real edge is  couple-<StephanId>-<...> → Thomas.
   *
   * Strategy:
   *   1. Build a lookup of which couple-midpoint each person belongs to.
   *   2. For each pair [A, B] on the path, first try a direct edge.
   *   3. If none found, try edges that go through a couple midpoint that
   *      contains A (source side) or B (target side).
   *   4. If pair is parent→child routed through midpoint, also highlight
   *      the spouse edge between the parent and their partner AND the
   *      midpoint→child edge (two hops in Cytoscape for one hop in BFS).
   */
  function highlightConnection(fromId, toId) {
    clearHighlight();

    const pathNodeIds = Relationship.getPathNodeIds(fromId, toId, members, relationships);
    const pathEdgePairs = Relationship.getPathEdgePairs(fromId, toId, members, relationships);

    if (pathNodeIds.length === 0) return;

    highlightedPath = pathNodeIds;

    // Build a lookup: personId → coupleNodeId  (from the couples built in layout)
    const personToCouple = new Map();
    cy.nodes('.couple-midpoint').forEach(cpNode => {
      const cpId = cpNode.id(); // "couple-<uuidA>-<uuidB>"
      // Extract the two member UUIDs from the couple ID
      // Format: "couple-" + uuidA + "-" + uuidB   (UUIDs are 36 chars with dashes)
      const inner = cpId.substring('couple-'.length);
      // UUIDs are 36 characters each, joined by a "-"
      if (inner.length >= 73) { // 36 + 1 + 36
        const memberA = inner.substring(0, 36);
        const memberB = inner.substring(37);
        personToCouple.set(memberA, cpId);
        personToCouple.set(memberB, cpId);
      }
    });

    // Dim everything
    cy.elements().addClass('dimmed');

    // Highlight path nodes
    for (const nodeId of pathNodeIds) {
      const node = cy.getElementById(nodeId);
      if (node.length) {
        node.removeClass('dimmed').addClass('highlighted');
      }
    }

    // Helper: highlight an edge + un-dim any couple midpoint it touches
    function highlightEdge(edge) {
      edge.removeClass('dimmed').addClass('highlighted');
      // Un-dim couple midpoint nodes that this edge touches
      const s = edge.data('source');
      const t = edge.data('target');
      if (s.startsWith('couple-')) cy.getElementById(s).removeClass('dimmed');
      if (t.startsWith('couple-')) cy.getElementById(t).removeClass('dimmed');
    }

    // Highlight path edges
    for (const [from, to] of pathEdgePairs) {
      // 1) Try direct edge between from↔to
      const directEdges = cy.edges().filter(e => {
        const s = e.data('source');
        const t = e.data('target');
        return (s === from && t === to) || (s === to && t === from);
      });

      if (directEdges.length > 0) {
        directEdges.forEach(e => highlightEdge(e));
        continue;
      }

      // 2) No direct edge → check if edges are routed through a couple midpoint.
      //    Case A: parent→child edge. The BFS says [Parent, Child] but Cytoscape has
      //            coupleNode→Child.  We need to highlight:
      //            - spouse edge: Parent ↔ Partner
      //            - midpoint→child edge: coupleNode → Child
      //    Case B: child→parent edge going up. BFS says [Child, Parent] but Cytoscape
      //            has coupleNode→Child (reverse direction). Same treatment.
      let found = false;

      const coupleOfFrom = personToCouple.get(from);
      const coupleOfTo = personToCouple.get(to);

      // Try: coupleOfFrom → to  (parent going down to child)
      if (coupleOfFrom) {
        const midEdges = cy.edges().filter(e => {
          const s = e.data('source');
          const t = e.data('target');
          return (s === coupleOfFrom && t === to) || (s === to && t === coupleOfFrom);
        });
        if (midEdges.length > 0) {
          midEdges.forEach(e => highlightEdge(e));
          found = true;
        }
      }

      // Try: coupleOfTo → from  (child going up to parent)
      if (!found && coupleOfTo) {
        const midEdges = cy.edges().filter(e => {
          const s = e.data('source');
          const t = e.data('target');
          return (s === coupleOfTo && t === from) || (s === from && t === coupleOfTo);
        });
        if (midEdges.length > 0) {
          midEdges.forEach(e => highlightEdge(e));
          found = true;
        }
      }
    }

    // Fit to highlighted path with padding
    const pathNodes = cy.nodes().filter(n => pathNodeIds.includes(n.id()));
    if (pathNodes.length > 0) {
      cy.animate({
        fit: { eles: pathNodes, padding: 100 },
        duration: 600,
        easing: 'ease-out',
      });
    }
  }

  /**
   * Clear all highlights.
   */
  function clearHighlight() {
    highlightedPath = [];
    cy.elements().removeClass('dimmed highlighted');
  }

  /**
   * Center on a specific member.
   */
  function centerOn(memberId, zoom = 1.5) {
    const node = cy.getElementById(memberId);
    if (node.length) {
      cy.animate({
        center: { eles: node },
        zoom: zoom,
        duration: 500,
        easing: 'ease-out',
      });
    }
  }

  /**
   * Fit the entire tree in view.
   */
  function fitAll() {
    cy.animate({
      fit: { padding: 60 },
      duration: 500,
      easing: 'ease-out',
    });
  }

  /**
   * Get node position for external use.
   */
  function getNodePosition(memberId) {
    const node = cy.getElementById(memberId);
    if (node.length) {
      return node.position();
    }
    return null;
  }

  /**
   * Get the Cytoscape instance.
   */
  function getCy() {
    return cy;
  }

  // ─── Helpers ───

  function getInitials(firstName, lastName) {
    return `${(firstName || '?')[0]}${(lastName || '?')[0]}`.toUpperCase();
  }

  function getYearLabel(birthDate, deathDate) {
    const birth = birthDate ? birthDate.substring(0, 4) : '?';
    if (deathDate) {
      const death = deathDate.substring(0, 4);
      return `* ${birth}  † ${death}`;
    }
    if (birthDate) {
      return `* ${birth}`;
    }
    return '';
  }

  return {
    init,
    onNodeTap,
    setCurrentUser,
    render,
    highlightConnection,
    clearHighlight,
    centerOn,
    fitAll,
    getNodePosition,
    getCy,
  };
})();
