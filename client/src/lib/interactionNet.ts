/**
 * Interaction Net Core Engine
 * Design: Constructivist Data Instrument
 *
 * Implements Symmetric Interaction Combinators (2-SIC):
 *  - Three node types: Eraser (ε), Constructor (γ), Duplicator (δ)
 *  - Six rewrite rules: 3 commutations + 3 annihilations
 *  - Port model: each node has a principal port + auxiliary ports
 *
 * Null-safety: All port accesses are guarded. Deleted nodes are never referenced.
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
  freeWires: Port[];
}

export interface RewriteStep {
  description: string;
  rule: string;
  activePair: [string, string];
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

/** Connect two ports bidirectionally. */
function connectPorts(net: InteractionNet, a: Port, b: Port) {
  const nodeA = net.nodes.get(a.nodeId);
  const nodeB = net.nodes.get(b.nodeId);
  if (nodeA && a.portIndex < nodeA.ports.length) nodeA.ports[a.portIndex] = b;
  if (nodeB && b.portIndex < nodeB.ports.length) nodeB.ports[b.portIndex] = a;
}

/**
 * Reconnect: the node at oldPort now points to newPort,
 * and newPort's node back-references oldPort.
 */
function reconnect(net: InteractionNet, oldPort: Port, newPort: Port) {
  const oldNode = net.nodes.get(oldPort.nodeId);
  if (oldNode && oldPort.portIndex < oldNode.ports.length) {
    oldNode.ports[oldPort.portIndex] = newPort;
  }
  const newNode = net.nodes.get(newPort.nodeId);
  if (newNode && newPort.portIndex < newNode.ports.length) {
    newNode.ports[newPort.portIndex] = oldPort;
  }
}

/** Build edge list from the net, skipping null/dangling ports. */
export function getEdges(net: InteractionNet): NetEdge[] {
  const seen = new Set<string>();
  const edges: NetEdge[] = [];
  for (const node of Array.from(net.nodes.values())) {
    for (let i = 0; i < node.ports.length; i++) {
      const other = node.ports[i];
      // Skip null ports and dangling references to deleted nodes
      if (!other) continue;
      if (!net.nodes.has(other.nodeId)) continue;
      const key = [node.id + ':' + i, other.nodeId + ':' + other.portIndex].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from: { nodeId: node.id, portIndex: i }, to: { nodeId: other.nodeId, portIndex: other.portIndex } });
      }
    }
  }
  return edges;
}

export function serializeNet(net: InteractionNet): SerializedNet {
  return {
    nodes: Array.from(net.nodes.values()).map(n => ({ ...n, ports: n.ports.map(p => p ? { ...p } : null) })),
    edges: getEdges(net),
  };
}

export function cloneNet(net: InteractionNet): InteractionNet {
  const newNet: InteractionNet = { nodes: new Map(), freeWires: [] };
  for (const [id, node] of Array.from(net.nodes.entries())) {
    newNet.nodes.set(id, { ...node, ports: node.ports.map(p => p ? { ...p } : null) });
  }
  newNet.freeWires = net.freeWires.map(p => ({ ...p }));
  return newNet;
}

/** Find all active pairs (principal↔principal connections). */
export function findActivePairs(net: InteractionNet): [NetNode, NetNode][] {
  const pairs: [NetNode, NetNode][] = [];
  const seen = new Set<string>();
  for (const node of Array.from(net.nodes.values())) {
    const principalConn = node.ports[0];
    if (!principalConn) continue;
    if (principalConn.portIndex !== 0) continue;
    if (!net.nodes.has(principalConn.nodeId)) continue;
    const other = net.nodes.get(principalConn.nodeId)!;
    // Verify back-reference is consistent
    const backRef = other.ports[0];
    if (!backRef || backRef.nodeId !== node.id) continue;
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

  const [a, b] = pairs[0];

  // ── ε-ε annihilation ──────────────────────────────────────────────────────
  if (a.kind === 'eraser' && b.kind === 'eraser') {
    net.nodes.delete(a.id);
    net.nodes.delete(b.id);
    return {
      rule: 'ε-ε annihilation',
      description: 'Two Erasers annihilate each other — both nodes are removed.',
      pair: [a.id, b.id],
    };
  }

  // ── Same-kind annihilation (γ-γ or δ-δ) ──────────────────────────────────
  if (a.kind === b.kind && a.kind !== 'eraser') {
    const a1 = a.ports[1] ? { ...a.ports[1]! } : null;
    const a2 = a.ports[2] ? { ...a.ports[2]! } : null;
    const b1 = b.ports[1] ? { ...b.ports[1]! } : null;
    const b2 = b.ports[2] ? { ...b.ports[2]! } : null;
    net.nodes.delete(a.id);
    net.nodes.delete(b.id);
    if (a1 && b1) reconnect(net, a1, b1);
    if (a2 && b2) reconnect(net, a2, b2);
    // Handle dangling aux ports — erase them
    if (a1 && !b1) erasePort(net, a1);
    if (a2 && !b2) erasePort(net, a2);
    if (b1 && !a1) erasePort(net, b1);
    if (b2 && !a2) erasePort(net, b2);
    const kindName = a.kind === 'constructor' ? 'γ' : 'δ';
    return {
      rule: `${kindName}-${kindName} annihilation`,
      description: `Two ${a.kind}s annihilate: their auxiliary ports are connected cross-wise.`,
      pair: [a.id, b.id],
    };
  }

  // ── Eraser commutation ────────────────────────────────────────────────────
  if (a.kind === 'eraser' || b.kind === 'eraser') {
    const eraser = a.kind === 'eraser' ? a : b;
    const other = a.kind === 'eraser' ? b : a;
    net.nodes.delete(eraser.id);
    net.nodes.delete(other.id);
    for (let i = 1; i < other.ports.length; i++) {
      const conn = other.ports[i];
      if (conn && net.nodes.has(conn.nodeId)) {
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

  // ── γ-δ commutation (optimal sharing) ────────────────────────────────────
  const con = a.kind === 'constructor' ? a : b;
  const dup = a.kind === 'constructor' ? b : a;

  // Snapshot aux ports before deletion
  const conAux1 = con.ports[1] ? { ...con.ports[1]! } : null;
  const conAux2 = con.ports[2] ? { ...con.ports[2]! } : null;
  const dupAux1 = dup.ports[1] ? { ...dup.ports[1]! } : null;
  const dupAux2 = dup.ports[2] ? { ...dup.ports[2]! } : null;

  // Create 4 new nodes
  const con1 = createNode('constructor', con.x - 50, con.y + 80);
  const con2 = createNode('constructor', con.x + 50, con.y + 80);
  const dup1 = createNode('duplicator', dup.x - 50, dup.y - 80);
  const dup2 = createNode('duplicator', dup.x + 50, dup.y - 80);
  net.nodes.set(con1.id, con1);
  net.nodes.set(con2.id, con2);
  net.nodes.set(dup1.id, dup1);
  net.nodes.set(dup2.id, dup2);

  // Internal cross-wiring
  connectPorts(net, { nodeId: dup1.id, portIndex: 1 }, { nodeId: con1.id, portIndex: 1 });
  connectPorts(net, { nodeId: dup1.id, portIndex: 2 }, { nodeId: con2.id, portIndex: 1 });
  connectPorts(net, { nodeId: dup2.id, portIndex: 1 }, { nodeId: con1.id, portIndex: 2 });
  connectPorts(net, { nodeId: dup2.id, portIndex: 2 }, { nodeId: con2.id, portIndex: 2 });

  // Delete original nodes BEFORE reconnecting so stale refs are gone
  net.nodes.delete(con.id);
  net.nodes.delete(dup.id);

  // Reconnect external aux ports to new nodes
  if (conAux1 && net.nodes.has(conAux1.nodeId)) reconnect(net, conAux1, { nodeId: dup1.id, portIndex: 0 });
  if (conAux2 && net.nodes.has(conAux2.nodeId)) reconnect(net, conAux2, { nodeId: dup2.id, portIndex: 0 });
  if (dupAux1 && net.nodes.has(dupAux1.nodeId)) reconnect(net, dupAux1, { nodeId: con1.id, portIndex: 0 });
  if (dupAux2 && net.nodes.has(dupAux2.nodeId)) reconnect(net, dupAux2, { nodeId: con2.id, portIndex: 0 });

  return {
    rule: 'γ-δ commutation',
    description: 'Constructor and Duplicator commute: 4 new nodes are created, implementing optimal sharing.',
    pair: [con.id, dup.id],
  };
}

/** Attach a new eraser to a dangling port. */
function erasePort(net: InteractionNet, port: Port) {
  const node = net.nodes.get(port.nodeId);
  if (!node) return;
  const era = createNode('eraser', node.x, node.y + 40);
  net.nodes.set(era.id, era);
  connectPorts(net, port, { nodeId: era.id, portIndex: 0 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Preset nets for demos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * (λx.x) y — Identity application.
 * One γ-γ annihilation step reduces it to y.
 */
export function buildIdentityNet(): InteractionNet {
  const net: InteractionNet = { nodes: new Map(), freeWires: [] };

  const lam = createNode('constructor', 300, 150, 'λx');
  const app = createNode('constructor', 300, 350, '@');
  const varX = createNode('duplicator', 150, 250, 'x');
  const varY = createNode('duplicator', 450, 350, 'y');

  net.nodes.set(lam.id, lam);
  net.nodes.set(app.id, app);
  net.nodes.set(varX.id, varX);
  net.nodes.set(varY.id, varY);

  // app.principal ↔ lam.principal (active pair)
  connectPorts(net, { nodeId: app.id, portIndex: 0 }, { nodeId: lam.id, portIndex: 0 });

  // lam.aux1 (bound var x) ↔ varX.principal
  connectPorts(net, { nodeId: lam.id, portIndex: 1 }, { nodeId: varX.id, portIndex: 0 });

  // lam.aux2 (body) ↔ varX.aux1 (identity: body = x)
  connectPorts(net, { nodeId: lam.id, portIndex: 2 }, { nodeId: varX.id, portIndex: 1 });

  // app.aux1 = free (result wire)
  net.freeWires.push({ nodeId: app.id, portIndex: 1 });

  // app.aux2 ↔ varY.principal (argument)
  connectPorts(net, { nodeId: app.id, portIndex: 2 }, { nodeId: varY.id, portIndex: 0 });

  // varX.aux2, varY.aux1, varY.aux2 = free
  net.freeWires.push({ nodeId: varX.id, portIndex: 2 });
  net.freeWires.push({ nodeId: varY.id, portIndex: 1 });
  net.freeWires.push({ nodeId: varY.id, portIndex: 2 });

  return net;
}

/**
 * (λx. x x) y — Self-duplication.
 * Demonstrates the fanout (δ) tree in action.
 */
export function buildSelfDupNet(): InteractionNet {
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

  // outerApp.aux1 = free (result)
  net.freeWires.push({ nodeId: outerApp.id, portIndex: 1 });

  // outerApp.aux2 ↔ argY.principal
  connectPorts(net, { nodeId: outerApp.id, portIndex: 2 }, { nodeId: argY.id, portIndex: 0 });

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

/**
 * Y Combinator structure.
 * λf. (λx. f (x x)) (λx. f (x x))
 * Encoded as a constructor (λ) with a duplicator (fanout) creating the self-referential loop.
 */
export function buildYCombinatorNet(): InteractionNet {
  const net: InteractionNet = { nodes: new Map(), freeWires: [] };

  const lam = createNode('constructor', 300, 100, 'λ');
  const dup = createNode('duplicator', 300, 250, 'δ');
  const app = createNode('constructor', 200, 400, '@');
  const lam2 = createNode('constructor', 400, 400, 'λ');
  const era = createNode('eraser', 150, 550, 'ε');

  net.nodes.set(lam.id, lam);
  net.nodes.set(dup.id, dup);
  net.nodes.set(app.id, app);
  net.nodes.set(lam2.id, lam2);
  net.nodes.set(era.id, era);

  // lam.principal = free output wire (result)
  net.freeWires.push({ nodeId: lam.id, portIndex: 0 });

  // lam.aux1 (bound variable) ↔ dup.principal
  connectPorts(net, { nodeId: lam.id, portIndex: 1 }, { nodeId: dup.id, portIndex: 0 });

  // lam.aux2 (body) ↔ app.principal
  connectPorts(net, { nodeId: lam.id, portIndex: 2 }, { nodeId: app.id, portIndex: 0 });

  // dup.aux1 ↔ app.aux1 (function position)
  connectPorts(net, { nodeId: dup.id, portIndex: 1 }, { nodeId: app.id, portIndex: 1 });

  // dup.aux2 ↔ lam2.aux1 (argument to inner lambda)
  connectPorts(net, { nodeId: dup.id, portIndex: 2 }, { nodeId: lam2.id, portIndex: 1 });

  // app.aux2 ↔ lam2.principal (apply to inner lambda — active pair!)
  connectPorts(net, { nodeId: app.id, portIndex: 2 }, { nodeId: lam2.id, portIndex: 0 });

  // lam2.aux2 ↔ eraser (unused port)
  connectPorts(net, { nodeId: lam2.id, portIndex: 2 }, { nodeId: era.id, portIndex: 0 });

  return net;
}

export const PRESETS = [
  { id: 'identity', label: '(λx.x) y — Identity', build: buildIdentityNet },
  { id: 'selfdup', label: '(λx. x x) y — Self-Duplication', build: buildSelfDupNet },
  { id: 'ycomb', label: 'Y Combinator Structure', build: buildYCombinatorNet },
];
