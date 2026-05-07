/**
 * TheoryTab.tsx — Interaction Nets Explorer
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0), golden yellow (#f9a825), vermillion red (#c62828), charcoal (#1a1a2e), off-white (#faf7f2)
 *
 * Content sourced from:
 * Rojas, R. (2015). "A Tutorial Introduction to the Lambda Calculus."
 * arXiv:1503.09060 [cs.LO]. Freie Universität Berlin.
 *
 * Features:
 *  - KaTeX math rendering for all λ expressions
 *  - Inline "Try it →" buttons that navigate to Visualizer with pre-loaded term
 */

import { useTab } from '@/contexts/TabContext';
import Math from '@/components/Math';

// ─── Try-it button ────────────────────────────────────────────────────────────
function TryIt({ term, label }: { term: string; label?: string }) {
  const { setActiveTab, setPendingTerm } = useTab();
  return (
    <button
      onClick={() => { setPendingTerm(term); setActiveTab('visualizer'); }}
      title={`Load "${term}" in Visualizer`}
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border-2 border-[#1565c0] text-[#1565c0] bg-white hover:bg-[#1565c0] hover:text-white transition-colors ml-2 align-middle"
      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
    >
      ▶ {label ?? 'TRY IT'}
    </button>
  );
}

// ─── Section data ─────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'lambda',
    label: '§1',
    title: 'The Lambda Calculus',
    color: '#1565c0',
    content: [
      {
        type: 'quote' as const,
        text: 'The λ-calculus can be called the smallest universal programming language in the world.',
        attribution: 'Rojas, 2015 — arXiv:1503.09060',
      },
      {
        type: 'prose' as const,
        text: 'Introduced by Alonzo Church in the 1930s, the λ-calculus formalises the concept of effective computability using only three constructs: names, functions, and applications. Despite its minimalism, it is equivalent in expressive power to Turing machines, yet its emphasis on symbolic transformation rather than machine state makes it the theoretical backbone of every functional programming language.',
      },
      {
        type: 'grammar' as const,
        title: 'Grammar',
        rows: [
          { lhs: '\\langle expression \\rangle', mid: '::=', rhs: '\\langle name \\rangle \\mid \\langle function \\rangle \\mid \\langle application \\rangle' },
          { lhs: '\\langle function \\rangle', mid: '::=', rhs: '\\lambda\\, \\langle name \\rangle\\, .\\, \\langle expression \\rangle' },
          { lhs: '\\langle application \\rangle', mid: '::=', rhs: '\\langle expression \\rangle\\; \\langle expression \\rangle' },
        ],
      },
      {
        type: 'prose' as const,
        text: 'A function is written λx.E, where x is the bound variable (the argument placeholder) and E is the body. Application is left-associative: E₁E₂E₃ means ((E₁E₂)E₃). The only keywords in the language are λ and the dot.',
      },
    ],
  },
  {
    id: 'reduction',
    label: '§2',
    title: 'α and β Reduction',
    color: '#c62828',
    content: [
      {
        type: 'prose' as const,
        text: 'Computation in the λ-calculus proceeds by two reduction rules. α-reduction renames bound variables to avoid name clashes: (λz.z) ≡ (λy.y) ≡ (λt.t). These are all the same function — the argument name is merely a placeholder.',
      },
      {
        type: 'rule' as const,
        title: 'β-Reduction',
        lhsTex: '(\\lambda x.\\, E)\\; y',
        arrow: '\\rightarrow',
        rhsTex: 'E[y/x]',
        note: 'Substitute y for all free occurrences of x in E',
      },
      {
        type: 'example' as const,
        title: 'Identity Function',
        tryTerm: '\\x. x',
        steps: [
          { tex: '(\\lambda x.\\, x)\\; y', label: 'Apply identity to y' },
          { tex: '\\rightarrow\\; y', label: 'Result: y returned unchanged' },
        ],
      },
      {
        type: 'prose' as const,
        text: 'A term that cannot be reduced further is in normal form. Not every term has a normal form — the self-application (λx.xx)(λx.xx) reduces to itself indefinitely, which is the basis of the fixed-point combinator.',
      },
    ],
  },
  {
    id: 'church',
    label: '§3',
    title: 'Church Numerals',
    color: '#f9a825',
    content: [
      {
        type: 'prose' as const,
        text: 'Church numerals encode natural numbers as higher-order functions. The number n is represented as a function that applies its first argument f exactly n times to its second argument x. This encoding makes arithmetic purely a matter of function composition.',
      },
      {
        type: 'table' as const,
        headers: ['Numeral', 'λ-term', 'Meaning'],
        rows: [
          { cells: ['0', '\\lambda f.\\lambda x.\\; x', 'Apply f zero times'], tryTerm: null },
          { cells: ['1', '\\lambda f.\\lambda x.\\; f\\, x', 'Apply f once'], tryTerm: null },
          { cells: ['2', '\\lambda f.\\lambda x.\\; f(f\\, x)', 'Apply f twice'], tryTerm: null },
          { cells: ['n', '\\lambda f.\\lambda x.\\; f^n\\, x', 'Apply f n times'], tryTerm: null },
        ],
        mathCols: [1],
      },
      {
        type: 'table' as const,
        headers: ['Operation', 'λ-term', 'Intuition'],
        rows: [
          { cells: ['Successor', '\\lambda w\\,y\\,x.\\; y(w\\,y\\,x)', 'Add one more application of f'], tryTerm: null },
          { cells: ['Addition', '\\lambda m\\,n\\,s.\\; m\\, S\\, n', 'Apply successor m times to n'], tryTerm: null },
          { cells: ['Multiplication', '\\lambda x\\,y\\,z.\\; x(y\\,z)', 'Compose f application m×n times'], tryTerm: null },
        ],
        mathCols: [1],
      },
    ],
  },
  {
    id: 'booleans',
    label: '§4',
    title: 'Booleans & Logic',
    color: '#1565c0',
    content: [
      {
        type: 'prose' as const,
        text: 'Church also encoded Boolean logic entirely within the λ-calculus. TRUE and FALSE are functions that select one of two arguments — TRUE picks the first, FALSE picks the second. This makes if-then-else simply function application.',
      },
      {
        type: 'table' as const,
        headers: ['Concept', 'λ-term', 'Behaviour'],
        rows: [
          { cells: ['TRUE', '\\lambda x\\,y.\\; x', 'Returns first argument'], tryTerm: '\\x y. x' },
          { cells: ['FALSE', '\\lambda x\\,y.\\; y', 'Returns second argument'], tryTerm: '\\x y. y' },
          { cells: ['AND', '\\lambda x\\,y.\\; x\\,y\\,\\text{FALSE}', 'True only if both true'], tryTerm: null },
          { cells: ['OR', '\\lambda x\\,y.\\; x\\,\\text{TRUE}\\,y', 'True if either true'], tryTerm: null },
          { cells: ['NOT', '\\lambda x.\\; x\\,\\text{FALSE}\\,\\text{TRUE}', 'Inverts the boolean'], tryTerm: null },
          { cells: ['IF p THEN a ELSE b', 'p\\; a\\; b', 'p selects a or b directly'], tryTerm: null },
        ],
        mathCols: [1],
      },
      {
        type: 'prose' as const,
        text: 'Pairs follow the same pattern: PAIR = λxyz.zxy stores two values; FIRST = λp.p TRUE and SECOND = λp.p FALSE retrieve them. Every data structure in the λ-calculus is ultimately a function.',
      },
    ],
  },
  {
    id: 'ycombinator',
    label: '§5',
    title: 'The Y Combinator',
    color: '#c62828',
    content: [
      {
        type: 'quote' as const,
        text: 'Y f = f(Y f) — the fixed point of any function f.',
        attribution: 'The fundamental property of the Y combinator',
      },
      {
        type: 'prose' as const,
        text: 'The central challenge of the λ-calculus is recursion: functions are anonymous and cannot refer to themselves by name. The fixed-point combinator Y solves this elegantly. Given any function f, Y produces a value that is a fixed point of f — meaning f applied to that value returns the same value. This is the mechanism that makes recursive computation possible without named functions.',
      },
      {
        type: 'rule' as const,
        title: 'Y Combinator Definition',
        lhsTex: 'Y',
        arrow: '\\equiv',
        rhsTex: '\\lambda f.\\; (\\lambda x.\\; f(x\\,x))\\,(\\lambda x.\\; f(x\\,x))',
        note: 'Self-application creates the recursive loop',
        tryTerm: '\\f. (\\x. f (x x)) (\\x. f (x x))',
      },
      {
        type: 'example' as const,
        title: 'Proof that Y f = f(Y f)',
        tryTerm: '(\\f. (\\x. f (x x)) (\\x. f (x x))) (\\y. y)',
        steps: [
          { tex: 'Y\\, f', label: 'Start' },
          { tex: '(\\lambda x.\\, f(x\\,x))\\,(\\lambda x.\\, f(x\\,x))\\; f', label: 'Expand Y' },
          { tex: 'f\\,((\\lambda x.\\, f(x\\,x))\\,(\\lambda x.\\, f(x\\,x)))', label: 'β-reduce the self-application' },
          { tex: 'f\\,(Y\\, f)', label: 'Recognise Y again — QED' },
        ],
      },
      {
        type: 'prose' as const,
        text: 'The inner term (λx.f(xx)) is the key: when applied to itself, it produces f applied to the self-application — which is exactly f(Y f). In an interaction net, this self-application maps directly to a Duplicator (δ) node whose principal port feeds back into itself through a Constructor (γ) node, forming the looping structure visible in the diagram at the top of this page.',
      },
    ],
  },
  {
    id: 'combinators',
    label: '§6',
    title: 'SKI Combinators',
    color: '#f9a825',
    content: [
      {
        type: 'prose' as const,
        text: 'Schönfinkel and Curry showed that the entire λ-calculus can be expressed using just three combinators: S, K, and I. This is the SKI combinator calculus — a point-free style of computation with no bound variables at all.',
      },
      {
        type: 'table' as const,
        headers: ['Combinator', 'λ-term', 'Rule', 'Intuition'],
        rows: [
          { cells: ['I (Identity)', '\\lambda x.\\; x', 'I\\, x \\to x', 'Returns argument unchanged'], tryTerm: '\\x. x' },
          { cells: ['K (Constant)', '\\lambda x\\,y.\\; x', 'K\\, x\\, y \\to x', 'Discards second argument'], tryTerm: '\\x y. x' },
          { cells: ['S (Substitution)', '\\lambda x\\,y\\,z.\\; xz(yz)', 'S\\, x\\, y\\, z \\to xz(yz)', 'Distributes z to both x and y'], tryTerm: null },
          { cells: ['B (Compose)', '\\lambda x\\,y\\,z.\\; x(yz)', 'B\\, x\\, y\\, z \\to x(yz)', 'Function composition'], tryTerm: null },
          { cells: ['W (Duplicate)', '\\lambda x\\,y.\\; x\\,y\\,y', 'W\\, x\\, y \\to x\\,y\\,y', 'Duplicates second argument'], tryTerm: '\\x y. x y y' },
        ],
        mathCols: [1, 2],
      },
      {
        type: 'prose' as const,
        text: 'The W combinator (duplication) is particularly significant for interaction nets: it corresponds directly to the Duplicator (δ) node. When a δ node meets a γ node at their principal ports, a commutation rewrite fires — this is the interaction net encoding of W applied to a constructor.',
      },
    ],
  },
  {
    id: 'interaction-nets',
    label: '§7',
    title: 'Interaction Nets',
    color: '#1565c0',
    content: [
      {
        type: 'prose' as const,
        text: 'Interaction nets, introduced by Yves Lafont in 1990, are a graphical model of computation where programs are graphs and execution is graph rewriting. Each node has exactly one principal port and zero or more auxiliary ports. Computation fires when two nodes are connected principal-to-principal — this is called an active pair.',
      },
      {
        type: 'table' as const,
        headers: ['Node', 'Symbol', 'Ports', 'Corresponds to'],
        rows: [
          { cells: ['Constructor γ', '▲ (blue)', 'Principal + 2 aux', 'Lambda abstraction / application'], tryTerm: null },
          { cells: ['Duplicator δ', '◆ (yellow)', 'Principal + 2 aux', 'Variable sharing / duplication (W)'], tryTerm: null },
          { cells: ['Eraser ε', '● (red)', 'Principal only', 'Garbage collection / K combinator'], tryTerm: null },
        ],
        mathCols: [],
      },
      {
        type: 'table' as const,
        headers: ['Rule', 'Active Pair', 'Effect'],
        rows: [
          { cells: ['γ-γ annihilation', '\\gamma \\leftrightarrow \\gamma', 'Two constructors cancel, connecting aux ports directly'], tryTerm: null },
          { cells: ['δ-δ annihilation', '\\delta \\leftrightarrow \\delta', 'Two duplicators cancel, connecting aux ports directly'], tryTerm: null },
          { cells: ['ε-ε annihilation', '\\varepsilon \\leftrightarrow \\varepsilon', 'Two erasers cancel, leaving nothing'], tryTerm: null },
          { cells: ['γ-δ commutation', '\\gamma \\leftrightarrow \\delta', 'Constructor and duplicator swap, creating 4 new nodes'], tryTerm: null },
          { cells: ['γ-ε commutation', '\\gamma \\leftrightarrow \\varepsilon', 'Constructor erased, aux ports connected to new erasers'], tryTerm: null },
          { cells: ['δ-ε commutation', '\\delta \\leftrightarrow \\varepsilon', 'Duplicator erased, aux ports connected to new erasers'], tryTerm: null },
        ],
        mathCols: [1],
      },
      {
        type: 'prose' as const,
        text: 'The key property of interaction nets is strong confluence: any two reduction sequences from the same term always reach the same normal form, and moreover, the number of rewrite steps is the same regardless of order. This makes interaction nets an optimal model of parallel computation — all active pairs can be reduced simultaneously with no conflicts.',
      },
    ],
  },
  {
    id: 'dyson',
    label: '§8',
    title: 'Dyson Equation & Fixed Points',
    color: '#2e7d32',
    content: [
      {
        type: 'quote' as const,
        text: 'The Dyson equation G = G₀ + G₀ΣG is a fixed-point equation: the dressed propagator G appears on both sides, just as Y f = f (Y f) defines recursion in the lambda calculus.',
        attribution: 'Structural analogy — QFT meets computation theory',
      },
      {
        type: 'prose' as const,
        text: 'In quantum field theory, the Dyson equation describes how a bare particle G₀ acquires corrections through interactions with its environment. The self-energy Σ encodes all possible interaction diagrams. The equation G = G₀ + G₀ΣG is self-referential: G appears on both sides. This is precisely the structure of a fixed-point equation.',
      },
      {
        type: 'table' as const,
        headers: ['Quantum Field Theory', 'Lambda Calculus / Interaction Nets'],
        rows: [
          { cells: ['Dressed propagator G', 'Fixed point Y f'], tryTerm: null },
          { cells: ['Bare propagator G₀', 'Identity / base case'], tryTerm: null },
          { cells: ['Self-energy Σ', 'Recursive body f'], tryTerm: null },
          { cells: ['G = G₀ + G₀ΣG', 'Y f = f (Y f)'], tryTerm: null },
          { cells: ['Feynman diagram', 'Interaction net graph'], tryTerm: null },
          { cells: ['Perturbative expansion', 'Sequence of rewrite steps'], tryTerm: null },
          { cells: ['Vertex (interaction point)', 'Active pair (principal-to-principal)'], tryTerm: null },
          { cells: ['Electron propagator line', 'Wire between ports'], tryTerm: null },
          { cells: ['Loop diagram (self-energy)', 'Duplicator δ creating a cycle'], tryTerm: null },
          { cells: ['Renormalisation', 'Normal form (no active pairs remain)'], tryTerm: null },
        ],
        mathCols: [],
      },
      {
        type: 'prose' as const,
        text: 'The perturbative expansion of the Dyson equation generates an infinite series of Feynman diagrams: G = G₀ + G₀ΣG₀ + G₀ΣG₀ΣG₀ + ⋯. Each term adds one more self-energy insertion. In interaction net terms, this is exactly the unfolding of a fixed-point combinator: Y f → f(Y f) → f(f(Y f)) → ⋯, where each step is one β-reduction.',
      },
      {
        type: 'example' as const,
        title: 'Dyson Fixed-Point Unfolding',
        tryTerm: '(\\f. f f) (\\x. x)',
        steps: [
          { tex: 'G = G_0 + G_0 \\Sigma G', label: 'Dyson equation (fixed-point form)' },
          { tex: 'G = G_0 + G_0 \\Sigma (G_0 + G_0 \\Sigma G)', label: 'Substitute G on the right' },
          { tex: 'G = G_0 + G_0 \\Sigma G_0 + G_0 \\Sigma G_0 \\Sigma G_0 + \\cdots', label: 'Perturbative expansion (infinite series)' },
          { tex: 'Y\\,f = f(Y\\,f) = f(f(Y\\,f)) = \\cdots', label: 'Exact same structure in lambda calculus' },
        ],
      },
      {
        type: 'prose' as const,
        text: 'The Fanout Tree in the interaction net diagram of the Y combinator plays the same role as the self-energy loop in a Feynman diagram: it is the structure that enables self-interaction. The blue Syntactic Tree corresponds to the bare propagator G₀, and the red Lambda Node is the vertex where the interaction fires — the active pair that triggers the next rewrite step.',
      },
      {
        type: 'table' as const,
        headers: ['Diagram Element', 'Interaction Net', 'Feynman Diagram'],
        rows: [
          { cells: ['Self-referential structure', 'Fanout Tree (yellow δ nodes)', 'Self-energy loop Σ'], tryTerm: null },
          { cells: ['Base propagation', 'Syntactic Tree (blue γ nodes)', 'Bare propagator G₀'], tryTerm: null },
          { cells: ['Interaction vertex', 'Lambda Node (red ε / active pair)', 'Vertex point •'], tryTerm: null },
          { cells: ['Reduction fires', 'Active pair rewrites', 'Diagram contributes to amplitude'], tryTerm: null },
          { cells: ['Normal form reached', 'No active pairs remain', 'Series converges / renormalised'], tryTerm: null },
        ],
        mathCols: [],
      },
    ],
  },
];

// ─── Content block types ──────────────────────────────────────────────────────
type SectionContent =
  | { type: 'quote'; text: string; attribution: string }
  | { type: 'prose'; text: string }
  | { type: 'grammar'; title: string; rows: { lhs: string; mid: string; rhs: string }[] }
  | { type: 'rule'; title: string; lhsTex: string; arrow: string; rhsTex: string; note: string; tryTerm?: string }
  | { type: 'example'; title: string; tryTerm?: string; steps: { tex: string; label: string }[] }
  | { type: 'table'; headers: string[]; rows: { cells: string[]; tryTerm: string | null }[]; mathCols: number[] };

function SectionBlock({ item }: { item: SectionContent }) {
  if (item.type === 'quote') {
    return (
      <blockquote className="border-l-4 border-[#c62828] pl-4 my-4">
        <p className="text-sm text-[#1a1a2e] italic leading-relaxed">"{item.text}"</p>
        <cite className="text-xs text-[#888] mt-1 block not-italic">— {item.attribution}</cite>
      </blockquote>
    );
  }

  if (item.type === 'prose') {
    return <p className="text-sm text-[#333] leading-relaxed my-3">{item.text}</p>;
  }

  if (item.type === 'grammar') {
    return (
      <div className="my-4">
        <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-2">{item.title}</div>
        <div className="bg-[#1a1a2e] rounded p-3 overflow-x-auto">
          {item.rows.map((row, i) => (
            <div key={i} className="flex gap-3 items-center leading-8 flex-wrap">
              <span className="text-[#f9a825] min-w-[140px]">
                <Math tex={row.lhs} />
              </span>
              <span className="text-[#888] text-sm">{row.mid}</span>
              <span className="text-[#4fc3f7]">
                <Math tex={row.rhs} />
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (item.type === 'rule') {
    return (
      <div className="my-4 bg-[#f0ede8] border-2 border-[#1a1a2e] p-3">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="text-xs font-bold uppercase tracking-widest text-[#888]">{item.title}</div>
          {item.tryTerm && <TryIt term={item.tryTerm} />}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-white px-3 py-1.5 border border-[#1a1a2e]">
            <Math tex={item.lhsTex} />
          </div>
          <div className="text-lg text-[#c62828] font-bold">
            <Math tex={item.arrow} />
          </div>
          <div className="bg-white px-3 py-1.5 border border-[#1a1a2e]">
            <Math tex={item.rhsTex} />
          </div>
        </div>
        <p className="text-xs text-[#666] mt-2">{item.note}</p>
      </div>
    );
  }

  if (item.type === 'example') {
    return (
      <div className="my-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <div className="text-xs font-bold uppercase tracking-widest text-[#888]">{item.title}</div>
          {item.tryTerm && <TryIt term={item.tryTerm} />}
        </div>
        <div className="bg-[#1a1a2e] p-3 rounded overflow-x-auto">
          {item.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-4 mb-1.5 flex-wrap">
              <span className="text-[#4fc3f7] min-w-[200px]">
                <Math tex={step.tex} />
              </span>
              <span className="text-xs text-[#666] italic">{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (item.type === 'table') {
    return (
      <div className="my-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[380px]">
          <thead>
            <tr className="bg-[#1a1a2e] text-white">
              {item.headers.map((h, i) => (
                <th key={i} className="text-left px-3 py-2 font-bold uppercase tracking-wider border border-[#333]">{h}</th>
              ))}
              {/* Extra column header if any row has a tryTerm */}
              {item.rows.some(r => r.tryTerm) && (
                <th className="px-3 py-2 border border-[#333]"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {item.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f5f3ef]'}>
                {row.cells.map((cell, j) => (
                  <td key={j} className={`px-3 py-2 border border-[#e0ddd8] leading-relaxed ${j === 0 ? 'font-bold text-[#1565c0] font-mono' : 'text-[#333]'}`}>
                    {item.mathCols.includes(j) ? <Math tex={cell} /> : cell}
                  </td>
                ))}
                {item.rows.some(r => r.tryTerm) && (
                  <td className="px-2 py-1 border border-[#e0ddd8] text-center">
                    {row.tryTerm && <TryIt term={row.tryTerm} label="TRY" />}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TheoryTab() {
  return (
    <div className="flex h-full bg-[#faf7f2] overflow-hidden" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── Left section nav (desktop) ── */}
      <aside className="hidden md:flex w-48 shrink-0 flex-col border-r-2 border-[#1a1a2e] bg-[#faf7f2] overflow-y-auto">
        <div className="p-4 border-b-2 border-[#1a1a2e]">
          <div className="text-xs font-bold uppercase tracking-widest text-[#888]">CONTENTS</div>
        </div>
        {SECTIONS.map(s => (
          <a
            key={s.id}
            href={`#theory-${s.id}`}
            className="flex items-center gap-3 px-4 py-3 border-b border-[#e0ddd8] hover:bg-[#f0ede8] transition-colors group"
          >
            <span className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.label}</span>
            <span className="text-xs text-[#1a1a2e] leading-tight group-hover:text-[#1565c0] transition-colors">{s.title}</span>
          </a>
        ))}
        <div className="mt-auto p-4 border-t-2 border-[#1a1a2e]">
          <a
            href="https://arxiv.org/abs/1503.09060"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-[#1565c0] hover:underline leading-relaxed"
          >
            ↗ arXiv:1503.09060<br />
            <span className="text-[#888]">Rojas (2015)</span>
          </a>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile section nav */}
        <div className="md:hidden flex overflow-x-auto border-b-2 border-[#1a1a2e] bg-[#faf7f2] sticky top-0 z-10">
          {SECTIONS.map(s => (
            <a
              key={s.id}
              href={`#theory-${s.id}`}
              className="shrink-0 px-4 py-2 text-xs font-bold font-mono border-r border-[#e0ddd8] hover:bg-[#f0ede8] transition-colors"
              style={{ color: s.color }}
            >
              {s.label}
            </a>
          ))}
        </div>

        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 pb-16">

          {/* Paper citation header */}
          <div className="mb-8 p-4 border-2 border-[#1a1a2e] bg-white">
            <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-1">SOURCE PAPER</div>
            <div className="text-sm font-bold text-[#1a1a2e] leading-tight">A Tutorial Introduction to the Lambda Calculus</div>
            <div className="text-xs text-[#555] mt-1">Raul Rojas · Freie Universität Berlin · Version 2.0, 2015</div>
            <a
              href="https://arxiv.org/abs/1503.09060"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-[#1565c0] hover:underline font-mono"
            >
              arXiv:1503.09060 [cs.LO] ↗
            </a>
          </div>

          {/* Sections */}
          {SECTIONS.map(s => (
            <section key={s.id} id={`theory-${s.id}`} className="mb-10 scroll-mt-16">
              <div className="flex items-baseline gap-3 mb-4 border-b-2 pb-2" style={{ borderColor: s.color }}>
                <span className="text-xs font-bold font-mono" style={{ color: s.color }}>{s.label}</span>
                <h2 className="text-base font-bold uppercase tracking-wider text-[#1a1a2e]"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.25rem' }}>
                  {s.title}
                </h2>
              </div>
              {s.content.map((item, i) => (
                <SectionBlock key={i} item={item as SectionContent} />
              ))}
            </section>
          ))}

          {/* Footer note */}
          <div className="border-t-2 border-[#1a1a2e] pt-6 mt-8">
            <p className="text-xs text-[#888] leading-relaxed">
              Content summarised and adapted from Rojas (2015), arXiv:1503.09060.
              The interaction nets formalism (§7) is due to Yves Lafont (1990).
              Click any <span className="text-[#1565c0] font-bold">▶ TRY IT</span> button to load the term into the Lambda Visualizer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
