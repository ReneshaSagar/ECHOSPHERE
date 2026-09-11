export interface WorkStateEvent {
  type: 'WORK_STATE_UPDATE' | 'STUCK_SIGNAL';
  source: 'coding' | 'excalidraw';
  summary: string;
  competency?: string;
  significance: 'low' | 'medium' | 'high';
  confidence?: number;
  currentStep?: string;
  timeSinceMeaningfulProgress?: number;
  metadata?: Record<string, any>;
}

export const INACTIVITY_STUCK_THRESHOLD_SECONDS = 20;

/**
 * Analyzes code diffs to detect meaningful structural algorithm/data structure changes.
 */
export function interpretCodeStateChange(
  previousCode: string,
  newCode: string,
  language: string,
  executionResult?: { success: boolean; output: string }
): WorkStateEvent | null {
  if (!newCode || newCode.trim().length === 0) {
    return null;
  }

  // 1. Check Execution Result
  if (executionResult) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'coding',
      summary: executionResult.success
        ? `Candidate ran code successfully: ${executionResult.output.slice(0, 100)}`
        : `Candidate encountered code execution error: ${executionResult.output.slice(0, 100)}`,
      competency: 'code_execution_and_debugging',
      significance: executionResult.success ? 'medium' : 'high',
      metadata: { success: executionResult.success, code: newCode.slice(0, 1500), fullCode: newCode }
    };
  }

  const prevLower = (previousCode || '').toLowerCase();
  const newLower = newCode.toLowerCase();

  // 2. Algorithm / Data Structure Change Detection
  const hasHashMapPrev = prevLower.includes('map') || prevLower.includes('dict') || prevLower.includes('hashmap') || prevLower.includes('set');
  const hasHashMapNew = newLower.includes('map') || newLower.includes('dict') || newLower.includes('hashmap') || newLower.includes('set');

  if (!hasHashMapPrev && hasHashMapNew) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'coding',
      summary: 'Candidate introduced a Hash Map / Set lookup structure to optimize lookup efficiency.',
      competency: 'algorithmic_efficiency',
      significance: 'high',
      metadata: { code: newCode.slice(0, 1500), fullCode: newCode }
    };
  }

  // Nested Loop to Linear / Frequency Map
  const prevNestedLoop = (prevLower.match(/for\b/g) || []).length >= 2;
  const newNestedLoop = (newLower.match(/for\b/g) || []).length >= 2;

  if (prevNestedLoop && !newNestedLoop && hasHashMapNew) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'coding',
      summary: 'Candidate replaced nested-loop iteration with a hash map lookup approach.',
      competency: 'algorithmic_efficiency',
      significance: 'high',
      metadata: { code: newCode.slice(0, 1500), fullCode: newCode }
    };
  }

  // Function / Helper Definition Added
  const prevFuncCount = (prevLower.match(/(function|def|const\s+\w+\s*=|\w+\s*\([^)]*\)\s*\{)/g) || []).length;
  const newFuncCount = (newLower.match(/(function|def|const\s+\w+\s*=|\w+\s*\([^)]*\)\s*\{)/g) || []).length;

  if (newFuncCount > prevFuncCount) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'coding',
      summary: 'Candidate defined a new helper function or modular component.',
      competency: 'code_structure',
      significance: 'medium',
      metadata: { code: newCode.slice(0, 1500), fullCode: newCode }
    };
  }

  // Substantial Code Insertion (> 50 chars diff)
  const charDiff = Math.abs(newCode.length - (previousCode || '').length);
  if (charDiff > 50) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'coding',
      summary: `Candidate made implementation progress in editor (${newCode.split('\n').length} lines total).`,
      competency: 'implementation_progress',
      significance: 'medium',
      metadata: { code: newCode.slice(0, 1500), fullCode: newCode }
    };
  }

  // Any other code edit / typing update
  if (previousCode !== newCode) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'coding',
      summary: `Candidate updated code in editor (${newCode.split('\n').length} lines total).`,
      competency: 'implementation_progress',
      significance: 'low',
      metadata: { code: newCode.slice(0, 1500), fullCode: newCode }
    };
  }

  return null;
}

/**
 * Analyzes Excalidraw / Diagram changes to detect architectural additions or restructuring.
 */
export function interpretDiagramStateChange(
  previousElements: any[],
  newElements: any[]
): WorkStateEvent | null {
  if (!newElements || newElements.length === 0) return null;

  const prevCount = (previousElements || []).length;
  const newCount = newElements.length;

  if (newCount <= prevCount && Math.abs(newCount - prevCount) < 2) {
    return null; // Minor movement or edit
  }

  // Extract labels / text in diagram
  const getLabels = (els: any[]) =>
    els
      .map(e => e.text || e.label || '')
      .join(' ')
      .toLowerCase();

  const prevLabels = getLabels(previousElements || []);
  const newLabels = getLabels(newElements);

  // Redis / Cache
  if (!prevLabels.includes('redis') && !prevLabels.includes('cache') && (newLabels.includes('redis') || newLabels.includes('cache'))) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: 'Candidate added a Caching Layer (Redis / Memcached) to the architecture.',
      competency: 'caching_strategy',
      significance: 'high',
      metadata: { elements: newElements }
    };
  }

  // Queue / Kafka
  if (!prevLabels.includes('queue') && !prevLabels.includes('kafka') && (newLabels.includes('queue') || newLabels.includes('kafka') || newLabels.includes('pubsub'))) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: 'Candidate introduced an Asynchronous Message Queue / Event Pipeline (Kafka/RabbitMQ).',
      competency: 'asynchronous_decoupling',
      significance: 'high',
      metadata: { elements: newElements }
    };
  }

  // API Gateway / Load Balancer
  if (!prevLabels.includes('gateway') && !prevLabels.includes('load balancer') && (newLabels.includes('gateway') || newLabels.includes('load balancer') || newLabels.includes('nginx'))) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: 'Candidate added an API Gateway / Load Balancer entry point.',
      competency: 'ingress_and_routing',
      significance: 'high',
      metadata: { elements: newElements }
    };
  }

  // Database
  if (!prevLabels.includes('db') && !prevLabels.includes('database') && !prevLabels.includes('postgres') && (newLabels.includes('db') || newLabels.includes('database') || newLabels.includes('postgres') || newLabels.includes('mongo'))) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: 'Candidate designated a Database / Data Store layer.',
      competency: 'database_selection',
      significance: 'high',
      metadata: { elements: newElements }
    };
  }

  if (Math.abs(newCount - prevCount) >= 2) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: `Candidate added ${Math.abs(newCount - prevCount)} architectural components to the diagram.`,
      competency: 'system_design_progress',
      significance: 'medium',
      metadata: { elements: newElements }
    };
  }

  return null;
}

/**
 * Serializes Excalidraw diagram elements into a rich, structured spatial graph
 * with topology, arrow bindings, node containment, layout tiers, and geometric features.
 */
export function serializeDiagramElements(elements: any[]): string {
  if (!elements || elements.length === 0) {
    return 'The whiteboard canvas is currently blank / initialized with no elements.';
  }

  const active = elements.filter(e => !e.isDeleted);
  if (active.length === 0) {
    return 'The whiteboard canvas is currently empty.';
  }

  // 1. Index elements
  const elemMap = new Map<string, any>();
  const textElements: any[] = [];
  const shapeElements: any[] = [];
  const connectionElements: any[] = [];
  const freehandElements: any[] = [];

  active.forEach(el => {
    elemMap.set(el.id, el);
    if (el.type === 'text' && el.text?.trim()) {
      textElements.push(el);
    } else if (['rectangle', 'ellipse', 'diamond', 'cylinder'].includes(el.type)) {
      shapeElements.push(el);
    } else if (el.type === 'arrow' || el.type === 'line') {
      connectionElements.push(el);
    } else if (el.type === 'freedraw') {
      freehandElements.push(el);
    }
  });

  // 2. Resolve Labels for Shapes (Bound text containers or geometric enclosure)
  interface ResolvedNode {
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    boundTextId?: string;
  }

  const resolvedNodes: ResolvedNode[] = [];
  const usedTextIds = new Set<string>();

  shapeElements.forEach(shape => {
    const sX = shape.x || 0;
    const sY = shape.y || 0;
    const sW = shape.width || 0;
    const sH = shape.height || 0;
    const sCenterX = sX + sW / 2;
    const sCenterY = sY + sH / 2;

    let matchedLabel = '';
    let matchedTextId = '';

    // Direct containerId binding
    const boundText = textElements.find(t => t.containerId === shape.id);
    if (boundText) {
      matchedLabel = boundText.text.trim();
      matchedTextId = boundText.id;
    } else {
      // Geometric center containment
      const overlappingText = textElements.find(t => {
        if (usedTextIds.has(t.id)) return false;
        const tCenterX = (t.x || 0) + (t.width || 0) / 2;
        const tCenterY = (t.y || 0) + (t.height || 0) / 2;
        return tCenterX >= sX && tCenterX <= sX + sW && tCenterY >= sY && tCenterY <= sY + sH;
      });
      if (overlappingText) {
        matchedLabel = overlappingText.text.trim();
        matchedTextId = overlappingText.id;
      }
    }

    if (matchedTextId) {
      usedTextIds.add(matchedTextId);
    }

    resolvedNodes.push({
      id: shape.id,
      type: shape.type,
      label: matchedLabel || `[Unnamed ${shape.type}]`,
      x: Math.round(sX),
      y: Math.round(sY),
      width: Math.round(sW),
      height: Math.round(sH),
      centerX: Math.round(sCenterX),
      centerY: Math.round(sCenterY),
      boundTextId: matchedTextId || undefined
    });
  });

  // Add freestanding text as standalone nodes
  textElements.forEach(t => {
    if (!usedTextIds.has(t.id)) {
      resolvedNodes.push({
        id: t.id,
        type: 'text_block',
        label: t.text.trim(),
        x: Math.round(t.x || 0),
        y: Math.round(t.y || 0),
        width: Math.round(t.width || 0),
        height: Math.round(t.height || 0),
        centerX: Math.round((t.x || 0) + (t.width || 0) / 2),
        centerY: Math.round((t.y || 0) + (t.height || 0) / 2)
      });
    }
  });

  // Helper to get friendly node name by id
  const getNodeName = (id: string | null | undefined): string => {
    if (!id) return 'Unknown';
    const found = resolvedNodes.find(n => n.id === id || n.boundTextId === id);
    if (found) return found.label;
    const elem = elemMap.get(id);
    if (elem) return elem.text || `[${elem.type}]`;
    return 'Component';
  };

  // 3. Resolve Topological Connections & Arrows
  interface ResolvedConnection {
    type: 'arrow' | 'line';
    from: string;
    to: string;
    label?: string;
  }

  const resolvedConnections: ResolvedConnection[] = [];

  connectionElements.forEach(conn => {
    let fromLabel = '';
    let toLabel = '';

    // Direct binding
    if (conn.startBinding?.elementId) {
      fromLabel = getNodeName(conn.startBinding.elementId);
    }
    if (conn.endBinding?.elementId) {
      toLabel = getNodeName(conn.endBinding.elementId);
    }

    // Proximity fallback if unbound
    if (!fromLabel || !toLabel) {
      const startX = (conn.x || 0) + (conn.points?.[0]?.[0] || 0);
      const startY = (conn.y || 0) + (conn.points?.[0]?.[1] || 0);
      const lastPoint = conn.points?.[conn.points.length - 1] || [0, 0];
      const endX = (conn.x || 0) + lastPoint[0];
      const endY = (conn.y || 0) + lastPoint[1];

      if (!fromLabel) {
        let minDist = Infinity;
        resolvedNodes.forEach(node => {
          const dist = Math.hypot(node.centerX - startX, node.centerY - startY);
          if (dist < minDist && dist < 180) {
            minDist = dist;
            fromLabel = node.label;
          }
        });
      }

      if (!toLabel) {
        let minDist = Infinity;
        resolvedNodes.forEach(node => {
          const dist = Math.hypot(node.centerX - endX, node.centerY - endY);
          if (dist < minDist && dist < 180) {
            minDist = dist;
            toLabel = node.label;
          }
        });
      }
    }

    const boundText = textElements.find(t => t.containerId === conn.id);
    const connLabel = boundText ? boundText.text.trim() : (conn.text || undefined);

    if (fromLabel || toLabel) {
      resolvedConnections.push({
        type: conn.type,
        from: fromLabel || 'Client / External Source',
        to: toLabel || 'Downstream Target',
        label: connLabel
      });
    }
  });

  // 4. Containment / Nesting Detection (e.g. Cluster / VPC or outer circle containing inner features)
  const containments: string[] = [];
  resolvedNodes.forEach(outer => {
    const enclosed: string[] = [];
    resolvedNodes.forEach(inner => {
      if (outer.id === inner.id) return;
      if (
        inner.x >= outer.x &&
        inner.y >= outer.y &&
        inner.x + inner.width <= outer.x + outer.width &&
        inner.y + inner.height <= outer.y + outer.height
      ) {
        enclosed.push(inner.label);
      }
    });
    if (enclosed.length > 0) {
      containments.push(`${outer.label} contains: [${enclosed.join(', ')}]`);
    }
  });

  // 5. Spatial Tiers (Sort nodes vertically into Ingress / Services / Data layers)
  const namedNodes = resolvedNodes.filter(n => !n.label.startsWith('[Unnamed'));
  const sortedByY = [...namedNodes].sort((a, b) => a.y - b.y);

  const tiers: { tier: string; nodes: string[] }[] = [];
  if (sortedByY.length > 0) {
    const minY = sortedByY[0].y;
    const maxY = sortedByY[sortedByY.length - 1].y;
    const range = maxY - minY;

    if (range > 150) {
      const topNodes = sortedByY.filter(n => n.y <= minY + range * 0.33).map(n => n.label);
      const midNodes = sortedByY.filter(n => n.y > minY + range * 0.33 && n.y < minY + range * 0.66).map(n => n.label);
      const botNodes = sortedByY.filter(n => n.y >= minY + range * 0.66).map(n => n.label);

      if (topNodes.length) tiers.push({ tier: 'Top Layer (Ingress / Entry)', nodes: topNodes });
      if (midNodes.length) tiers.push({ tier: 'Middle Layer (Processing / Services)', nodes: midNodes });
      if (botNodes.length) tiers.push({ tier: 'Bottom Layer (Storage / Persistence)', nodes: botNodes });
    }
  }

  // 6. Geometric / Freeform Pattern Detection (e.g., Facial Features / Smiley detection)
  let geometricSummary = '';
  const unnamedEllipses = resolvedNodes.filter(n => n.type === 'ellipse' && n.label.startsWith('[Unnamed'));
  if (unnamedEllipses.length >= 3) {
    const sortedBySize = [...unnamedEllipses].sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const largest = sortedBySize[0];
    const innerEllipses = sortedBySize.slice(1).filter(e => 
      e.centerX > largest.x && e.centerX < largest.x + largest.width &&
      e.centerY > largest.y && e.centerY < largest.y + largest.height
    );
    const curvedLinesInside = connectionElements.filter(c => {
      const cX = c.x || 0;
      const cY = c.y || 0;
      return cX >= largest.x && cX <= largest.x + largest.width && cY >= largest.y && cY <= largest.y + largest.height;
    });

    if (innerEllipses.length === 2 && curvedLinesInside.length >= 1) {
      geometricSummary = 'Geometric Shape Pattern: 1 outer circle enclosing 2 smaller top circles and 1 bottom curved arc (forming a smiley / face drawing).';
    } else if (innerEllipses.length >= 2) {
      geometricSummary = `Geometric Shape Pattern: 1 outer enclosing ellipse containing ${innerEllipses.length} smaller inner circles/ellipses.`;
    }
  }

  // 7. Compose Comprehensive LLM-Readable Output
  let output = `================================================================================\n`;
  output += `WHITEBOARD SPATIAL GRAPH & ARCHITECTURE TOPOLOGY (${active.length} total elements)\n`;
  output += `================================================================================\n\n`;

  // Nodes & Components
  const distinctLabels = Array.from(new Set(namedNodes.map(n => n.label)));
  if (distinctLabels.length > 0) {
    output += `[NAMED ARCHITECTURE COMPONENTS & NODES]:\n`;
    distinctLabels.forEach(label => {
      output += `  • "${label}"\n`;
    });
    output += `\n`;
  }

  // Connections & Data Flow
  if (resolvedConnections.length > 0) {
    output += `[DATA FLOW & TOPOLOGICAL CONNECTIONS]:\n`;
    resolvedConnections.forEach(conn => {
      const symbol = conn.type === 'arrow' ? '──>' : '───';
      const labelPart = conn.label ? ` (${conn.label}) ` : ' ';
      output += `  • ${conn.from} ${symbol}${labelPart}${conn.to}\n`;
    });
    output += `\n`;
  }

  // Spatial Tiers
  if (tiers.length > 0) {
    output += `[SPATIAL ARCHITECTURE TIERS]:\n`;
    tiers.forEach(t => {
      output += `  • ${t.tier}: ${t.nodes.join(', ')}\n`;
    });
    output += `\n`;
  }

  // Containment & Grouping
  if (containments.length > 0) {
    output += `[BOUNDING GROUPS & CONTAINMENT]:\n`;
    containments.forEach(c => {
      output += `  • ${c}\n`;
    });
    output += `\n`;
  }

  // Geometric layout if present
  if (geometricSummary) {
    output += `[GEOMETRIC / VISUAL SKETCH ANALYSIS]:\n  • ${geometricSummary}\n\n`;
  }

  output += `[TOTAL STATS]: ${resolvedNodes.length} component block(s), ${resolvedConnections.length} connection(s), ${freehandElements.length} freehand stroke(s).\n`;
  output += `================================================================================`;

  return output;
}

/**
 * Detects prolonged inactivity and generates a stuck signal event for candidate assistance.
 */
export function checkStuckSignal(
  timeSinceProgressSec: number,
  mode: 'coding' | 'excalidraw',
  competency: string = 'problem_solving'
): WorkStateEvent | null {
  if (timeSinceProgressSec < INACTIVITY_STUCK_THRESHOLD_SECONDS) {
    return null;
  }

  const roundedTime = Math.round(timeSinceProgressSec);
  const modeLabel = mode === 'coding' ? 'code editor' : 'whiteboard canvas';

  return {
    type: 'STUCK_SIGNAL',
    source: mode,
    summary: `Candidate has been inactive on the ${modeLabel} for ${roundedTime} seconds. Potential stuck state detected.`,
    competency,
    significance: 'medium',
    timeSinceMeaningfulProgress: roundedTime
  };
}
