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
      metadata: { success: executionResult.success, code: newCode.slice(0, 400) }
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
      metadata: { code: newCode.slice(0, 400) }
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
      metadata: { code: newCode.slice(0, 400) }
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
      metadata: { code: newCode.slice(0, 400) }
    };
  }

  // Substantial Code Insertion (> 50 chars diff)
  const charDiff = Math.abs(newCode.length - (previousCode || '').length);
  if (charDiff > 80) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'coding',
      summary: `Candidate made substantial implementation progress (${newCode.split('\n').length} lines total).`,
      competency: 'implementation_progress',
      significance: 'medium',
      metadata: { code: newCode.slice(0, 400) }
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
      significance: 'high'
    };
  }

  // Queue / Kafka
  if (!prevLabels.includes('queue') && !prevLabels.includes('kafka') && (newLabels.includes('queue') || newLabels.includes('kafka') || newLabels.includes('pubsub'))) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: 'Candidate introduced an Asynchronous Message Queue / Event Pipeline (Kafka/RabbitMQ).',
      competency: 'asynchronous_decoupling',
      significance: 'high'
    };
  }

  // API Gateway / Load Balancer
  if (!prevLabels.includes('gateway') && !prevLabels.includes('load balancer') && (newLabels.includes('gateway') || newLabels.includes('load balancer') || newLabels.includes('nginx'))) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: 'Candidate added an API Gateway / Load Balancer entry point.',
      competency: 'ingress_and_routing',
      significance: 'high'
    };
  }

  // Database
  if (!prevLabels.includes('db') && !prevLabels.includes('database') && !prevLabels.includes('postgres') && (newLabels.includes('db') || newLabels.includes('database') || newLabels.includes('postgres') || newLabels.includes('mongo'))) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: 'Candidate designated a Database / Data Store layer.',
      competency: 'database_selection',
      significance: 'high'
    };
  }

  if (Math.abs(newCount - prevCount) >= 2) {
    return {
      type: 'WORK_STATE_UPDATE',
      source: 'excalidraw',
      summary: `Candidate added ${Math.abs(newCount - prevCount)} architectural components to the diagram.`,
      competency: 'system_design_progress',
      significance: 'medium'
    };
  }

  return null;
}

/**
 * Checks for inactivity stuck signals.
 */
export function checkStuckSignal(
  timeSinceLastProgressSeconds: number,
  source: 'coding' | 'excalidraw',
  currentStep: string = 'approach_selection'
): WorkStateEvent | null {
  if (timeSinceLastProgressSeconds >= INACTIVITY_STUCK_THRESHOLD_SECONDS) {
    return {
      type: 'STUCK_SIGNAL',
      source,
      summary: `Candidate paused coding in IDE for ${Math.floor(timeSinceLastProgressSeconds)}s.`,
      competency: 'problem_solving_pacing',
      significance: 'medium',
      confidence: 0.85,
      currentStep,
      timeSinceMeaningfulProgress: Math.floor(timeSinceLastProgressSeconds)
    };
  }
  return null;
}
