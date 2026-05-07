/**
 * TheoryTab.tsx — Interaction Nets Explorer
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0), golden yellow (#f9a825), vermillion red (#c62828), charcoal (#1a1a2e), off-white (#faf7f2)
 *
 * Content sourced from:
 * Rojas, R. (2015). "A Tutorial Introduction to the Lambda Calculus."
 * arXiv:1503.09060 [cs.LO]. Freie Universität Berlin.
 */

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
          ['⟨expression⟩', '::=', '⟨name⟩ | ⟨function⟩ | ⟨application⟩'],
          ['⟨function⟩', '::=', 'λ ⟨name⟩ . ⟨expression⟩'],
          ['⟨application⟩', '::=', '⟨expression⟩ ⟨expression⟩'],
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
        text: 'Computation in the λ-calculus proceeds by two reduction rules. α-reduction (alpha) renames bound variables to avoid name clashes: (λz.z) ≡ (λy.y) ≡ (λt.t). These are all the same function — the argument name is merely a placeholder.',
      },
      {
        type: 'rule' as const,
        title: 'β-Reduction',
        lhs: '(λx.E) y',
        arrow: '→',
        rhs: 'E[y/x]',
        note: 'Substitute y for all free occurrences of x in E',
      },
      {
        type: 'example' as const,
        title: 'Identity Function',
        steps: [
          { expr: '(λx.x) y', label: 'Apply identity to y' },
          { expr: '→  y', label: 'Result: y returned unchanged' },
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
          ['0', 'λf.λx. x', 'Apply f zero times'],
          ['1', 'λf.λx. f x', 'Apply f once'],
          ['2', 'λf.λx. f(f x)', 'Apply f twice'],
          ['n', 'λf.λx. fⁿ x', 'Apply f n times'],
        ],
      },
      {
        type: 'table' as const,
        headers: ['Operation', 'λ-term', 'Intuition'],
        rows: [
          ['Successor', 'λwyx. y(wyx)', 'Add one more application of f'],
          ['Addition', 'λmns. m S n', 'Apply successor m times to n'],
          ['Multiplication', 'λxyz. x(yz)', 'Compose f application m×n times'],
        ],
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
          ['TRUE', 'λxy. x', 'Returns first argument'],
          ['FALSE', 'λxy. y', 'Returns second argument'],
          ['AND', 'λxy. xy FALSE', 'True only if both true'],
          ['OR', 'λxy. x TRUE y', 'True if either true'],
          ['NOT', 'λx. x FALSE TRUE', 'Inverts the boolean'],
          ['IF p THEN a ELSE b', 'p a b', 'p selects a or b directly'],
        ],
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
        lhs: 'Y',
        arrow: '≡',
        rhs: 'λf. (λx. f(xx))(λx. f(xx))',
        note: 'Self-application creates the recursive loop',
      },
      {
        type: 'example' as const,
        title: 'Proof that Y f = f(Y f)',
        steps: [
          { expr: 'Y f', label: 'Start' },
          { expr: '(λx. f(xx))(λx. f(xx)) f', label: 'Expand Y' },
          { expr: 'f((λx. f(xx))(λx. f(xx)))', label: 'β-reduce the self-application' },
          { expr: 'f(Y f)', label: 'Recognise Y again — QED' },
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
        headers: ['Combinator', 'λ-term', 'Reduction rule', 'Intuition'],
        rows: [
          ['I (Identity)', 'λx. x', 'I x → x', 'Returns argument unchanged'],
          ['K (Constant)', 'λxy. x', 'K x y → x', 'Discards second argument'],
          ['S (Substitution)', 'λxyz. xz(yz)', 'S x y z → xz(yz)', 'Distributes argument z to both x and y'],
          ['B (Compose)', 'λxyz. x(yz)', 'B x y z → x(yz)', 'Function composition'],
          ['C (Flip)', 'λxyz. xzy', 'C x y z → xzy', 'Swaps argument order'],
          ['W (Duplicate)', 'λxy. xyy', 'W x y → xyy', 'Duplicates second argument'],
        ],
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
          ['Constructor γ', '▲ (blue)', 'Principal + 2 aux', 'Lambda abstraction / application'],
          ['Duplicator δ', '◆ (yellow)', 'Principal + 2 aux', 'Variable sharing / duplication (W)'],
          ['Eraser ε', '● (red)', 'Principal only', 'Garbage collection / K combinator'],
        ],
      },
      {
        type: 'table' as const,
        headers: ['Rule', 'Active Pair', 'Effect'],
        rows: [
          ['γ-γ annihilation', 'γ ↔ γ', 'Two constructors cancel, connecting aux ports directly'],
          ['δ-δ annihilation', 'δ ↔ δ', 'Two duplicators cancel, connecting aux ports directly'],
          ['ε-ε annihilation', 'ε ↔ ε', 'Two erasers cancel, leaving nothing'],
          ['γ-δ commutation', 'γ ↔ δ', 'Constructor and duplicator swap, creating 4 new nodes'],
          ['γ-ε commutation', 'γ ↔ ε', 'Constructor erased, aux ports connected to new erasers'],
          ['δ-ε commutation', 'δ ↔ ε', 'Duplicator erased, aux ports connected to new erasers'],
        ],
      },
      {
        type: 'prose' as const,
        text: 'The key property of interaction nets is strong confluence: any two reduction sequences from the same term always reach the same normal form, and moreover, the number of rewrite steps is the same regardless of order. This makes interaction nets an optimal model of parallel computation — all active pairs can be reduced simultaneously with no conflicts.',
      },
    ],
  },
];

type SectionContent =
  | { type: 'quote'; text: string; attribution: string }
  | { type: 'prose'; text: string }
  | { type: 'grammar'; title: string; rows: string[][] }
  | { type: 'rule'; title: string; lhs: string; arrow: string; rhs: string; note: string }
  | { type: 'example'; title: string; steps: { expr: string; label: string }[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

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
            <div key={i} className="flex gap-3 text-xs font-mono leading-6 flex-wrap">
              <span className="text-[#f9a825] min-w-[120px]">{row[0]}</span>
              <span className="text-[#888]">{row[1]}</span>
              <span className="text-[#4fc3f7]">{row[2]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (item.type === 'rule') {
    return (
      <div className="my-4 bg-[#f0ede8] border-2 border-[#1a1a2e] p-3">
        <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-2">{item.title}</div>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="text-sm font-mono text-[#1565c0] bg-white px-2 py-1 border border-[#1a1a2e]">{item.lhs}</code>
          <span className="text-lg text-[#c62828] font-bold">{item.arrow}</span>
          <code className="text-sm font-mono text-[#c62828] bg-white px-2 py-1 border border-[#1a1a2e]">{item.rhs}</code>
        </div>
        <p className="text-xs text-[#666] mt-2">{item.note}</p>
      </div>
    );
  }
  if (item.type === 'example') {
    return (
      <div className="my-4">
        <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-2">{item.title}</div>
        <div className="bg-[#1a1a2e] p-3 rounded overflow-x-auto">
          {item.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 mb-1 flex-wrap">
              <code className="text-sm font-mono text-[#4fc3f7] min-w-[180px]">{step.expr}</code>
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
        <table className="w-full text-xs border-collapse min-w-[400px]">
          <thead>
            <tr className="bg-[#1a1a2e] text-white">
              {item.headers.map((h, i) => (
                <th key={i} className="text-left px-3 py-2 font-bold uppercase tracking-wider border border-[#333]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {item.rows.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f5f3ef]'}>
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2 border border-[#e0ddd8] leading-relaxed ${j === 0 ? 'font-bold text-[#1565c0] font-mono' : 'text-[#333]'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default function TheoryTab() {
  return (
    <div className="flex h-full bg-[#faf7f2] overflow-hidden" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── Left section nav (hidden on mobile, shown as sticky top bar on mobile) ── */}
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
              Use the Lambda Visualizer tab to explore these concepts interactively.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
