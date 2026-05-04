/**
 * Interaction Net Core Engine
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0) = Constructor, golden yellow (#f9a825) = Duplicator, vermillion red (#c62828) = Eraser
 *
 * Implements Symmetric Interaction Combinators (2-SIC):
 *  - Three node types: Eraser (ε), Constructor (γ), Duplicator (δ)
 *  - Six rewrite rules: 3 commutations + 3 annihilations
 *  - Port model: each node has a principal port + auxiliary ports
 */

export type NodeKind = 'constructor' | 'duplicator' | 'eraser';

export interface Port {
  nodeId: string;
  portIndex: number; // 0 = principal, 1 = left aux, 2 = right aux
}

export interface NetNode {
  id: string;
  kind: NodeKind;
  label?: string;
  // ports[0] = principal, ports[1] = left aux, ports[2] = right aux
  // Each entry is the Port this port is connected to (or null if free)
  ports: (Port | null)[];
  // Layout position for visualization
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

export interface NetEdge {
  from: Port;
  to: Port;
}

export interface InteractionNet {
  nodes: Map<string, NetNode>;
  // Free ports (open wires) — port that has no connection
  freeWires: Port[];
}

export interface RewriteStep {
  description: string;
  rule: string;
  activePair: [string, string]; // node IDs
  netBefore: SerializedNet;
  netAfter: SerializedNet;
}

export interface SerializedNet {
  nodes: NetNode[];
  edges: NetEdge[];
}

let nodeCounter = 0;
function newId(prefix: string = 'n'): string {
  return `${prefix}_${++nodeCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

export function resetCounter() {
  nodeCounter = 0;
}

export function createNode(kind: NodeKind, x = 0, y = 0, label?: string): NetNode {
  const arity = kind === 'eraser' ? 0 : 2;
  const ports: (Port | null)[] = new Array(1 + arity).fill(null);
  return { id: newId(kind[0]), kind, label, ports, x, y };
}

export function connect(net: InteractionNet, a: Port, b: Port) {
  const nodeA = net.nodes.get(a.nodeId)!;
  const nodeB = net.nodes.get(b.nodeId)!;
  nodeA.ports[a.portIndex] = b;
  nodeB.ports[b.portIndex] = a;
}

export function getEdges(net: InteractionNet): NetEdge[] {
  const seen = new Set<string>();
  const edges: NetEdge[] = [];
  for (const node of Array.from(net.nodes.values())) {
    for (let i = 0; i < node.ports.length; i++) {
      const other = node.ports[i];
      if (!other) continue;
      const key = [node.id + i, other.nodeId + other.portIndex].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from: { nodeId: node.id, portIndex: i }, to: other });
      }
    }
  }
  return edges;
}

export function serializeNet(net: InteractionNet): SerializedNet {
  return {
    nodes: Array.from(net.nodes.values()).map(n => ({ ...n, ports: [...n.ports] })),
    edges: getEdges(net),
  };
}

export function cloneNet(net: InteractionNet): InteractionNet {
  const newNet: InteractionNet = { nodes: new Map(), freeWires: [] };
  // Deep clone nodes
  for (const [id, node] of Array.from(net.nodes.entries())) {
    newNet.nodes.set(id, { ...node, ports: [...node.ports] });
  }
  newNet.freeWires = [...net.freeWires];
  return newNet;
}

/**
 * Find all active pairs (principal-principal connections) in the net.
 */
export function findActivePairs(net: InteractionNet): [NetNode, NetNode][] {
  const pairs: [NetNode, NetNode][] = [];
  const seen = new Set<string>();
  for (const node of Array.from(net.nodes.values())) {
    const principalConn = node.ports[0];
    if (!principalConn || principalConn.portIndex !== 0) continue;
    const other = net.nodes.get(principalConn.nodeId);
    if (!other) continue;
    const key = [node.id, other.id].sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push([node, other]);
    }
  }
  return pairs;
}

/**
 * Apply one rewrite step to the net (in-place).
 * Returns a description of the rule applied, or null if no active pairs.
 */
export function applyOneStep(net: InteractionNet): { rule: string; description: string; pair: [string, string] } | null {
  const pairs = findActivePairs(net);
  if (pairs.length === 0) return null;

  // Pick first active pair
  const [a, b] = pairs[0];

  if (a.kind === 'eraser' && b.kind === 'eraser') {
    // Eraser-Eraser annihilation: both vanish
    net.nodes.delete(a.id);
    net.nodes.delete(b.id);
    return { rule: 'ε-ε annihilation', description: 'Two Erasers annihilate each other — both nodes are removed.', pair: [a.id, b.id] };
  }

  if (a.kind === b.kind && a.kind !== 'eraser') {
    // Same-kind annihilation (γ-γ or δ-δ)
    // Connect aux ports cross-wise: a.aux1 ↔ b.aux1, a.aux2 ↔ b.aux2
    const a1 = a.ports[1];
    const a2 = a.ports[2];
    const b1 = b.ports[1];
    const b2 = b.ports[2];
    net.nodes.delete(a.id);
    net.nodes.delete(b.id);
    if (a1 && b1) reconnect(net, a1, b1);
    if (a2 && b2) reconnect(net, a2, b2);
    const kindName = a.kind === 'constructor' ? 'γ' : 'δ';
    return {
      rule: `${kindName}-${kindName} annihilation`,
      description: `Two ${a.kind}s annihilate: their auxiliary ports are connected cross-wise.`,
      pair: [a.id, b.id],
    };
  }

  // Commutation: different kinds (one must be eraser, or constructor vs duplicator)
  if (a.kind === 'eraser' || b.kind === 'eraser') {
    const eraser = a.kind === 'eraser' ? a : b;
    const other = a.kind === 'eraser' ? b : a;
    // Eraser propagates to all aux ports of other
    net.nodes.delete(eraser.id);
    net.nodes.delete(other.id);
    for (let i = 1; i < other.ports.length; i++) {
      const conn = other.ports[i];
      if (conn) {
        const newEraser = createNode('eraser', other.x + (i - 1.5) * 60, other.y + 60);
        net.nodes.set(newEraser.id, newEraser);
        reconnect(net, conn, { nodeId: newEraser.id, portIndex: 0 });
      }
    }
    return {
      rule: `ε-${other.kind[0]} commutation`,
      description: `Eraser propagates into ${other.kind}: a new Eraser is created for each auxiliary port.`,
      pair: [eraser.id, other.id],
    };
  }

  // Constructor-Duplicator commutation (the key rule for sharing)
  const con = a.kind === 'constructor' ? a : b;
  const dup = a.kind === 'constructor' ? b : a;

  // Create 2 new constructors and 2 new duplicators
  const con1 = createNode('constructor', con.x - 40, con.y + 80);
  const con2 = createNode('constructor', con.x + 40, con.y + 80);
  const dup1 = createNode('duplicator', dup.x - 40, dup.y - 80);
  const dup2 = createNode('duplicator', dup.x + 40, dup.y - 80);
  net.nodes.set(con1.id, con1);
  net.nodes.set(con2.id, con2);
  net.nodes.set(dup1.id, dup1);
  net.nodes.set(dup2.id, dup2);

  // Internal wiring: cross connections
  // dup1.aux1 ↔ con1.aux1, dup1.aux2 ↔ con2.aux1
  // dup2.aux1 ↔ con1.aux2, dup2.aux2 ↔ con2.aux2
  connectPorts(net, { nodeId: dup1.id, portIndex: 1 }, { nodeId: con1.id, portIndex: 1 });
  connectPorts(net, { nodeId: dup1.id, portIndex: 2 }, { nodeId: con2.id, portIndex: 1 });
  connectPorts(net, { nodeId: dup2.id, portIndex: 1 }, { nodeId: con1.id, portIndex: 2 });
  connectPorts(net, { nodeId: dup2.id, portIndex: 2 }, { nodeId: con2.id, portIndex: 2 });

  // External wiring: reconnect original aux ports
  const conAux1 = con.ports[1];
  const conAux2 = con.ports[2];
  const dupAux1 = dup.ports[1];
  const dupAux2 = dup.ports[2];

  if (conAux1) reconnect(net, conAux1, { nodeId: dup1.id, portIndex: 0 });
  if (conAux2) reconnect(net, conAux2, { nodeId: dup2.id, portIndex: 0 });
  if (dupAux1) reconnect(net, dupAux1, { nodeId: con1.id, portIndex: 0 });
  if (dupAux2) reconnect(net, dupAux2, { nodeId: con2.id, portIndex: 0 });

  net.nodes.delete(con.id);
  net.nodes.delete(dup.id);

  return {
    rule: 'γ-δ commutation',
    description: 'Constructor and Duplicator commute: 4 new nodes are created, implementing optimal sharing.',
    pair: [con.id, dup.id],
  };
}

function connectPorts(net: InteractionNet, a: Port, b: Port) {
  const nodeA = net.nodes.get(a.nodeId);
  const nodeB = net.nodes.get(b.nodeId);
  if (nodeA) nodeA.ports[a.portIndex] = b;
  if (nodeB) nodeB.ports[b.portIndex] = a;
}

function reconnect(net: InteractionNet, oldPort: Port, newPort: Port) {
  // oldPort.nodeId's port[oldPort.portIndex] now points to newPort
  const oldNode = net.nodes.get(oldPort.nodeId);
  if (oldNode) {
    oldNode.ports[oldPort.portIndex] = newPort;
  }
  const newNode = net.nodes.get(newPort.nodeId);
  if (newNode) {
    newNode.ports[newPort.portIndex] = oldPort;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset nets for demos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the Y combinator (fixed-point) interaction net.
 * Structure: λ node (constructor) with its body duplicated via a duplicator,
 * creating a self-referential loop.
 */
export function buildYCombinatorNet(): InteractionNet {
  resetCounter();
  const net: InteractionNet = { nodes: new Map(), freeWires: [] };

  // Outer lambda (abstraction): constructor node
  const lam = createNode('constructor', 300, 100, 'λ');
  // Duplicator for the variable (fanout tree)
  const dup = createNode('duplicator', 300, 250, 'δ');
  // Application node (constructor)
  const app = createNode('constructor', 200, 400, '@');
  // Inner lambda
  const lam2 = createNode('constructor', 400, 400, 'λ');
  // Eraser for unused port
  const era = createNode('eraser', 150, 550, 'ε');

  net.nodes.set(lam.id, lam);
  net.nodes.set(dup.id, dup);
  net.nodes.set(app.id, app);
  net.nodes.set(lam2.id, lam2);
  net.nodes.set(era.id, era);

  // lam.principal = free output wire (result)
  net.freeWires.push({ nodeId: lam.id, portIndex: 0 });

  // lam.aux1 (bound variable) → dup.principal
  connectPorts(net, { nodeId: lam.id, portIndex: 1 }, { nodeId: dup.id, portIndex: 0 });

  // lam.aux2 (body) → app.principal
  connectPorts(net, { nodeId: lam.id, portIndex: 2 }, { nodeId: app.id, portIndex: 0 });

  // dup.aux1 → app.aux1 (function position)
  connectPorts(net, { nodeId: dup.id, portIndex: 1 }, { nodeId: app.id, portIndex: 1 });

  // dup.aux2 → lam2.aux1 (argument to inner lambda)
  connectPorts(net, { nodeId: dup.id, portIndex: 2 }, { nodeId: lam2.id, portIndex: 1 });

  // app.aux2 → lam2.principal (apply to inner lambda)
  connectPorts(net, { nodeId: app.id, portIndex: 2 }, { nodeId: lam2.id, portIndex: 0 });

  // lam2.aux2 → eraser (unused)
  connectPorts(net, { nodeId: lam2.id, portIndex: 2 }, { nodeId: era.id, portIndex: 0 });

  return net;
}

/**
 * Build a simple identity application: (λx.x) y
 * Should reduce to y in one step.
 */
export function buildIdentityNet(): InteractionNet {
  resetCounter();
  const net: InteractionNet = { nodes: new Map(), freeWires: [] };

  const lam = createNode('constructor', 300, 150, 'λx');
  const app = createNode('constructor', 300, 300, '@');
  const varY = createNode('duplicator', 450, 300, 'y');

  net.nodes.set(lam.id, lam);
  net.nodes.set(app.id, app);
  net.nodes.set(varY.id, varY);

  // app.principal ↔ lam.principal (active pair!)
  connectPorts(net, { nodeId: app.id, portIndex: 0 }, { nodeId: lam.id, portIndex: 0 });

  // app.aux1 = free (function input)
  net.freeWires.push({ nodeId: app.id, portIndex: 1 });

  // app.aux2 ↔ varY.principal (argument)
  connectPorts(net, { nodeId: app.id, portIndex: 2 }, { nodeId: varY.id, portIndex: 0 });

  // lam.aux1 (bound var x) ↔ lam.aux2 (body = x, identity)
  connectPorts(net, { nodeId: lam.id, portIndex: 1 }, { nodeId: lam.id, portIndex: 2 });

  // varY.aux1, varY.aux2 = free
  net.freeWires.push({ nodeId: varY.id, portIndex: 1 });
  net.freeWires.push({ nodeId: varY.id, portIndex: 2 });

  return net;
}

/**
 * Build a self-duplication net: (λx. x x) y
 * Demonstrates the fanout tree in action.
 */
export function buildSelfDupNet(): InteractionNet {
  resetCounter();
  const net: InteractionNet = { nodes: new Map(), freeWires: [] };

  const lam = createNode('constructor', 300, 100, 'λx');
  const dup = createNode('duplicator', 300, 250, 'δ');
  const app = createNode('constructor', 200, 400, '@');
  const app2 = createNode('constructor', 400, 400, '@');
  const outerApp = createNode('constructor', 300, 550, 'main@');
  const argY = createNode('duplicator', 500, 550, 'y');

  net.nodes.set(lam.id, lam);
  net.nodes.set(dup.id, dup);
  net.nodes.set(app.id, app);
  net.nodes.set(app2.id, app2);
  net.nodes.set(outerApp.id, outerApp);
  net.nodes.set(argY.id, argY);

  // outerApp ↔ lam (active pair)
  connectPorts(net, { nodeId: outerApp.id, portIndex: 0 }, { nodeId: lam.id, portIndex: 0 });

  // outerApp.aux2 ↔ argY.principal
  connectPorts(net, { nodeId: outerApp.id, portIndex: 2 }, { nodeId: argY.id, portIndex: 0 });

  // outerApp.aux1 = free (result)
  net.freeWires.push({ nodeId: outerApp.id, portIndex: 1 });

  // lam.aux1 (var x) ↔ dup.principal
  connectPorts(net, { nodeId: lam.id, portIndex: 1 }, { nodeId: dup.id, portIndex: 0 });

  // lam.aux2 (body = x x) ↔ app.principal
  connectPorts(net, { nodeId: lam.id, portIndex: 2 }, { nodeId: app.id, portIndex: 0 });

  // dup.aux1 ↔ app.aux1 (first x)
  connectPorts(net, { nodeId: dup.id, portIndex: 1 }, { nodeId: app.id, portIndex: 1 });

  // dup.aux2 ↔ app2.principal
  connectPorts(net, { nodeId: dup.id, portIndex: 2 }, { nodeId: app2.id, portIndex: 0 });

  // app.aux2 ↔ app2.aux1 (second x)
  connectPorts(net, { nodeId: app.id, portIndex: 2 }, { nodeId: app2.id, portIndex: 1 });

  // app2.aux2 = free
  net.freeWires.push({ nodeId: app2.id, portIndex: 2 });

  // argY.aux1, aux2 = free
  net.freeWires.push({ nodeId: argY.id, portIndex: 1 });
  net.freeWires.push({ nodeId: argY.id, portIndex: 2 });

  return net;
}

export const PRESETS = [
  { id: 'identity', label: '(λx.x) y — Identity', build: buildIdentityNet },
  { id: 'selfdup', label: '(λx. x x) y — Self-Duplication', build: buildSelfDupNet },
  { id: 'ycomb', label: 'Y Combinator Structure', build: buildYCombinatorNet },
];
