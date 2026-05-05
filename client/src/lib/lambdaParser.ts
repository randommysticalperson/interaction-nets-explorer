/**
 * Lambda Term Parser & Interaction Net Compiler
 * Design: Constructivist Data Instrument
 *
 * Supports:
 *   - Variables:       x
 *   - Abstraction:     \x. body   or   λx. body
 *   - Application:     (f a)
 *   - Parentheses for grouping
 *   - Multi-arg shorthand: \x y. body  =>  \x. \y. body
 *
 * Compilation follows the standard encoding of lambda calculus
 * into Symmetric Interaction Combinators:
 *   - Abstraction  → Constructor node (γ)
 *   - Application  → Constructor node (γ) used as application
 *   - Variable occurrence → wire to binding site
 *   - Shared variable (used >1 time) → Duplicator (δ) fanout tree
 *   - Unused variable → Eraser (ε)
 */

import {
  InteractionNet,
  NetNode,
  Port,
  createNode,
} from './interactionNet';

// ─────────────────────────────────────────────────────────────────────────────
// AST
// ─────────────────────────────────────────────────────────────────────────────

export type LambdaTerm =
  | { tag: 'Var'; name: string }
  | { tag: 'Abs'; param: string; body: LambdaTerm }
  | { tag: 'App'; fn: LambdaTerm; arg: LambdaTerm };

// ─────────────────────────────────────────────────────────────────────────────
// Parser
// ─────────────────────────────────────────────────────────────────────────────

class ParseError extends Error {}

class Parser {
  private pos = 0;
  constructor(private src: string) {}

  private peek(): string {
    this.skipWs();
    return this.src[this.pos] ?? '';
  }

  private skipWs() {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos++;
  }

  private consume(ch: string) {
    this.skipWs();
    if (this.src[this.pos] !== ch) {
      throw new ParseError(`Expected '${ch}' at position ${this.pos}, got '${this.src[this.pos] ?? 'EOF'}'`);
    }
    this.pos++;
  }

  private readName(): string {
    this.skipWs();
    let name = '';
    while (this.pos < this.src.length && /[a-zA-Z0-9_']/.test(this.src[this.pos])) {
      name += this.src[this.pos++];
    }
    if (!name) throw new ParseError(`Expected name at position ${this.pos}`);
    return name;
  }

  /** Parse a full term (application is left-associative). */
  parseTerm(): LambdaTerm {
    return this.parseApp();
  }

  private parseApp(): LambdaTerm {
    let t = this.parseAtom();
    while (true) {
      const ch = this.peek();
      if (!ch || ch === ')' || ch === '.') break;
      const arg = this.parseAtom();
      t = { tag: 'App', fn: t, arg };
    }
    return t;
  }

  private parseAtom(): LambdaTerm {
    this.skipWs();
    const ch = this.src[this.pos];
    if (!ch) throw new ParseError('Unexpected end of input');

    if (ch === '(' ) {
      this.pos++;
      const t = this.parseTerm();
      this.consume(')');
      return t;
    }

    if (ch === '\\' || ch === 'λ') {
      this.pos++;
      // Collect one or more parameter names
      const params: string[] = [];
      while (true) {
        this.skipWs();
        const c = this.src[this.pos];
        if (!c || c === '.') break;
        params.push(this.readName());
      }
      if (params.length === 0) throw new ParseError('Lambda with no parameters');
      this.consume('.');
      let body = this.parseTerm();
      // Desugar multi-arg: \x y. body => \x. \y. body
      for (let i = params.length - 1; i >= 1; i--) {
        body = { tag: 'Abs', param: params[i], body };
      }
      return { tag: 'Abs', param: params[0], body };
    }

    if (/[a-zA-Z_]/.test(ch)) {
      return { tag: 'Var', name: this.readName() };
    }

    throw new ParseError(`Unexpected character '${ch}' at position ${this.pos}`);
  }

  isDone(): boolean {
    this.skipWs();
    return this.pos >= this.src.length;
  }
}

export function parseLambda(src: string): LambdaTerm {
  const p = new Parser(src.trim());
  const t = p.parseTerm();
  if (!p.isDone()) throw new ParseError('Unexpected trailing input');
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compiler: Lambda Term → Interaction Net
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compilation result: a "wire" is represented as a pair of ports
 * (the two ends of an open wire). We use a simple port-pair model.
 */
interface Wire {
  left: Port;   // the "input" end
  right: Port;  // the "output" end
}

type Env = Map<string, Port[]>; // variable name → list of free ports waiting for the binding

let layoutX = 0;
let layoutY = 0;

function nextPos(depth: number): { x: number; y: number } {
  layoutX += 80;
  if (layoutX > 700) { layoutX = 80; layoutY += 100; }
  return { x: 100 + layoutX * 0.5 + depth * 20, y: 80 + depth * 90 };
}

function addNode(net: InteractionNet, node: NetNode) {
  net.nodes.set(node.id, node);
}

function link(net: InteractionNet, a: Port, b: Port) {
  const na = net.nodes.get(a.nodeId);
  const nb = net.nodes.get(b.nodeId);
  if (na && a.portIndex < na.ports.length) na.ports[a.portIndex] = b;
  if (nb && b.portIndex < nb.ports.length) nb.ports[b.portIndex] = a;
}

/**
 * Compile a lambda term into an interaction net.
 * Returns the net and the principal output port (the "result wire").
 */
export function compileLambda(term: LambdaTerm): { net: InteractionNet; outputPort: Port } {
  layoutX = 0;
  layoutY = 0;
  const net: InteractionNet = { nodes: new Map(), freeWires: [] };
  const env: Env = new Map();

  const outputPort = compile(net, term, env, 0);
  net.freeWires.push(outputPort);

  // Any remaining free variable ports become free wires
  for (const ports of Array.from(env.values())) {
    for (const p of ports) {
      net.freeWires.push(p);
    }
  }

  return { net, outputPort };
}

/**
 * Recursively compile a term.
 * Returns the port that represents the "output" of this term.
 */
function compile(net: InteractionNet, term: LambdaTerm, env: Env, depth: number): Port {
  const pos = nextPos(depth);

  if (term.tag === 'Var') {
    // A variable occurrence: look up in env
    const existing = env.get(term.name);
    if (existing && existing.length > 0) {
      // Return the first waiting port
      return existing.shift()!;
    }
    // Free variable: create a duplicator node as a placeholder
    const node = createNode('duplicator', pos.x, pos.y, term.name);
    addNode(net, node);
    // The principal port is the "output" for this occurrence
    return { nodeId: node.id, portIndex: 0 };
  }

  if (term.tag === 'Abs') {
    // λx. body
    // Create a constructor node: principal = output, aux1 = variable port, aux2 = body port
    const lam = createNode('constructor', pos.x, pos.y, 'λ' + term.param);
    addNode(net, lam);

    // Collect variable occurrences in body
    const varPorts: Port[] = [];
    const savedEnv = env.get(term.param) ?? [];
    env.set(term.param, varPorts);

    const bodyPort = compile(net, term.body, env, depth + 1);

    // Restore env
    env.set(term.param, savedEnv);

    // Connect body to lam.aux2
    link(net, { nodeId: lam.id, portIndex: 2 }, bodyPort);

    // Handle variable usage
    if (varPorts.length === 0) {
      // Variable never used → eraser
      const era = createNode('eraser', lam.x - 60, lam.y + 80);
      addNode(net, era);
      link(net, { nodeId: lam.id, portIndex: 1 }, { nodeId: era.id, portIndex: 0 });
    } else if (varPorts.length === 1) {
      // Used exactly once → direct wire
      link(net, { nodeId: lam.id, portIndex: 1 }, varPorts[0]);
    } else {
      // Used multiple times → build fanout (duplicator) tree
      const fanout = buildFanout(net, varPorts, lam.x - 40, lam.y + 80);
      link(net, { nodeId: lam.id, portIndex: 1 }, fanout);
    }

    // Output is the principal port of lam
    return { nodeId: lam.id, portIndex: 0 };
  }

  if (term.tag === 'App') {
    // (fn arg)
    // Application node: constructor used as @
    // principal = result, aux1 = function, aux2 = argument
    const app = createNode('constructor', pos.x, pos.y, '@');
    addNode(net, app);

    const fnPort = compile(net, term.fn, env, depth + 1);
    const argPort = compile(net, term.arg, env, depth + 1);

    link(net, { nodeId: app.id, portIndex: 1 }, fnPort);
    link(net, { nodeId: app.id, portIndex: 2 }, argPort);

    return { nodeId: app.id, portIndex: 0 };
  }

  throw new Error('Unknown term tag');
}

/**
 * Build a binary fanout tree of duplicators for multiple variable occurrences.
 * Returns the principal port of the root duplicator.
 */
function buildFanout(net: InteractionNet, ports: Port[], x: number, y: number): Port {
  if (ports.length === 2) {
    const dup = createNode('duplicator', x, y, 'δ');
    addNode(net, dup);
    link(net, { nodeId: dup.id, portIndex: 1 }, ports[0]);
    link(net, { nodeId: dup.id, portIndex: 2 }, ports[1]);
    return { nodeId: dup.id, portIndex: 0 };
  }
  // Split into two halves
  const mid = Math.ceil(ports.length / 2);
  const left = buildFanout(net, ports.slice(0, mid), x - 60, y + 80);
  const right = buildFanout(net, ports.slice(mid), x + 60, y + 80);
  const dup = createNode('duplicator', x, y, 'δ');
  addNode(net, dup);
  link(net, { nodeId: dup.id, portIndex: 1 }, left);
  link(net, { nodeId: dup.id, portIndex: 2 }, right);
  return { nodeId: dup.id, portIndex: 0 };
}

/**
 * Collect all variable occurrences in a term (for pre-analysis).
 */
export function freeVars(term: LambdaTerm, bound: Set<string> = new Set()): Set<string> {
  if (term.tag === 'Var') return bound.has(term.name) ? new Set() : new Set([term.name]);
  if (term.tag === 'Abs') {
    const b2 = new Set(bound); b2.add(term.param);
    return freeVars(term.body, b2);
  }
  const fv = freeVars(term.fn, bound);
  Array.from(freeVars(term.arg, bound)).forEach(v => fv.add(v));
  return fv;
}

export function prettyPrint(term: LambdaTerm): string {
  if (term.tag === 'Var') return term.name;
  if (term.tag === 'Abs') return `λ${term.param}. ${prettyPrint(term.body)}`;
  const fn = term.fn.tag === 'Abs' ? `(${prettyPrint(term.fn)})` : prettyPrint(term.fn);
  const arg = term.arg.tag === 'Var' ? prettyPrint(term.arg) : `(${prettyPrint(term.arg)})`;
  return `${fn} ${arg}`;
}
