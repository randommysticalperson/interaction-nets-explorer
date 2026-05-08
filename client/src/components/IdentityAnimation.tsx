/**
 * IdentityAnimation.tsx
 * Design: Constructivist Data Instrument
 * A self-contained animated panel showing:
 *   1. f(x) = x  as a y=x curve with a moving point
 *   2. The interaction net for (λx.x) y reducing step by step
 *
 * Used in the Visualizer right panel when the identity preset is active.
 */

import { useEffect, useRef, useState } from 'react';

// ─── y = x curve animation ─────────────────────────────────────────────────────
function YEqualsXCurve() {
  const [t, setT] = useState(0); // 0..1 along the line

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const PERIOD = 2400; // ms for one full pass
    function tick(ts: number) {
      if (start === null) start = ts;
      const elapsed = (ts - start) % PERIOD;
      setT(elapsed / PERIOD);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const W = 120, H = 120;
  const PAD = 16;
  const x0 = PAD, y0 = H - PAD, x1 = W - PAD, y1 = PAD; // line from bottom-left to top-right

  // Point along the line
  const px = x0 + (x1 - x0) * t;
  const py = y0 + (y1 - y0) * t;

  // Dashed projections
  const projX = x0; // left axis
  const projY = H - PAD; // bottom axis

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', margin: '0 auto' }}>
      {/* Axes */}
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#1a1a2e" strokeWidth={1.5} />
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#1a1a2e" strokeWidth={1.5} />
      {/* Axis labels */}
      <text x={PAD - 8} y={PAD + 4} fill="#888" fontSize={8} fontFamily="IBM Plex Mono, monospace">y</text>
      <text x={W - PAD + 2} y={H - PAD + 4} fill="#888" fontSize={8} fontFamily="IBM Plex Mono, monospace">x</text>
      {/* y = x line */}
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#1565c0" strokeWidth={2} />
      {/* Label */}
      <text x={x1 - 18} y={y1 - 4} fill="#1565c0" fontSize={8} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">f(x)=x</text>
      {/* Dashed projections */}
      <line x1={px} y1={py} x2={px} y2={projY} stroke="#c62828" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />
      <line x1={px} y1={py} x2={projX} y2={py} stroke="#c62828" strokeWidth={1} strokeDasharray="3 2" opacity={0.7} />
      {/* Moving point */}
      <circle cx={px} cy={py} r={4} fill="#c62828" />
      <circle cx={px} cy={py} r={7} fill="none" stroke="#c62828" strokeWidth={1} opacity={0.4} />
      {/* Axis ticks for the point */}
      <circle cx={px} cy={projY} r={2.5} fill="#f9a825" />
      <circle cx={projX} cy={py} r={2.5} fill="#f9a825" />
    </svg>
  );
}

// ─── Interaction net step animation ───────────────────────────────────────────
// We hard-code the 3 stages of (λx.x) y reduction:
//   Stage 0: Initial net — @(app) connected to λx(lam), x(var), y(arg)
//   Stage 1: After β-step — lam and app annihilate, x connects to y
//   Stage 2: Normal form — single wire x→y (or just y node)

interface Stage {
  label: string;
  rule: string;
  nodes: Array<{ id: string; kind: 'constructor' | 'duplicator' | 'eraser' | 'wire'; label: string; x: number; y: number }>;
  edges: Array<{ from: string; to: string; active?: boolean }>;
}

const W_NET = 180, H_NET = 130;

const STAGES: Stage[] = [
  {
    label: 'Initial',
    rule: '(λx.x) y',
    nodes: [
      { id: 'app', kind: 'constructor', label: '@', x: 90, y: 30 },
      { id: 'lam', kind: 'constructor', label: 'λx', x: 90, y: 80 },
      { id: 'varx', kind: 'duplicator', label: 'x', x: 55, y: 115 },
      { id: 'vary', kind: 'duplicator', label: 'y', x: 130, y: 30 },
    ],
    edges: [
      { from: 'app', to: 'lam', active: true },
      { from: 'lam', to: 'varx' },
      { from: 'app', to: 'vary' },
    ],
  },
  {
    label: 'β-step',
    rule: 'γ-γ annihilation',
    nodes: [
      { id: 'varx', kind: 'duplicator', label: 'x', x: 70, y: 65 },
      { id: 'vary', kind: 'duplicator', label: 'y', x: 120, y: 65 },
    ],
    edges: [
      { from: 'varx', to: 'vary', active: true },
    ],
  },
  {
    label: 'Normal Form',
    rule: 'x ≡ y  (identity)',
    nodes: [
      { id: 'result', kind: 'wire', label: 'y', x: 90, y: 65 },
    ],
    edges: [],
  },
];

const NODE_R = 18;
const KIND_COLORS: Record<string, string> = {
  constructor: '#1565c0',
  duplicator: '#f9a825',
  eraser: '#c62828',
  wire: '#2e7d32',
};

function NetStage({ stage, entering }: { stage: Stage; entering: boolean }) {
  return (
    <svg
      width={W_NET}
      height={H_NET}
      viewBox={`0 0 ${W_NET} ${H_NET}`}
      style={{
        display: 'block',
        margin: '0 auto',
        opacity: entering ? 0 : 1,
        transform: entering ? 'scale(0.85)' : 'scale(1)',
        transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Edges */}
      {stage.edges.map((e, i) => {
        const from = stage.nodes.find(n => n.id === e.from);
        const to = stage.nodes.find(n => n.id === e.to);
        if (!from || !to) return null;
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2 - 12;
        return (
          <path
            key={i}
            d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
            stroke={e.active ? '#c62828' : '#1a1a2e'}
            strokeWidth={e.active ? 2 : 1.5}
            fill="none"
            opacity={e.active ? 1 : 0.5}
            strokeDasharray={e.active ? '5 3' : undefined}
          />
        );
      })}
      {/* Nodes */}
      {stage.nodes.map(node => {
        const color = KIND_COLORS[node.kind];
        if (node.kind === 'constructor') {
          const h = NODE_R * 1.6, w = NODE_R * 1.6;
          const pts = `${node.x},${node.y - h / 2} ${node.x - w / 2},${node.y + h / 2} ${node.x + w / 2},${node.y + h / 2}`;
          return (
            <g key={node.id}>
              <polygon points={pts} fill={color} stroke="#1a1a2e" strokeWidth={1.5} />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" fontSize={9} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">{node.label}</text>
            </g>
          );
        }
        if (node.kind === 'duplicator') {
          const d = NODE_R * 1.2;
          const pts = `${node.x},${node.y - d} ${node.x + d},${node.y} ${node.x},${node.y + d} ${node.x - d},${node.y}`;
          return (
            <g key={node.id}>
              <polygon points={pts} fill={color} stroke="#1a1a2e" strokeWidth={1.5} />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#1a1a2e" fontSize={9} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">{node.label}</text>
            </g>
          );
        }
        if (node.kind === 'wire') {
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={NODE_R} fill={color} opacity={0.15} />
              <circle cx={node.x} cy={node.y} r={NODE_R * 0.6} fill={color} />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" fontSize={10} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">{node.label}</text>
            </g>
          );
        }
        return (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={NODE_R} fill={color} stroke="#1a1a2e" strokeWidth={1.5} />
            <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" fontSize={9} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">{node.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function IdentityAnimation() {
  const [stageIdx, setStageIdx] = useState(0);
  const [entering, setEntering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance through stages
  useEffect(() => {
    const DELAYS = [2200, 1800, 2000]; // ms per stage before advancing
    timerRef.current = setTimeout(() => {
      setEntering(true);
      setTimeout(() => {
        setStageIdx(i => (i + 1) % STAGES.length);
        setEntering(false);
      }, 350);
    }, DELAYS[stageIdx]);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [stageIdx]);

  const stage = STAGES[stageIdx];

  return (
    <div className="flex flex-col gap-3">
      {/* Title */}
      <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1">
        f(x) = x
      </div>

      {/* y = x curve */}
      <div>
        <div className="text-[10px] text-[#888] uppercase tracking-wider mb-1">Mathematical</div>
        <YEqualsXCurve />
        <div className="text-[10px] text-center text-[#888] mt-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          output = input
        </div>
      </div>

      {/* Net reduction */}
      <div>
        <div className="text-[10px] text-[#888] uppercase tracking-wider mb-1">As Interaction Net</div>
        <div className="relative" style={{ height: H_NET }}>
          <NetStage stage={stage} entering={entering} />
        </div>
        <div className="text-center mt-1">
          <div className="text-[10px] font-bold text-[#1565c0]" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
            {stage.label}
          </div>
          <div className="text-[10px] text-[#888]" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
            {stage.rule}
          </div>
        </div>
        {/* Stage dots */}
        <div className="flex justify-center gap-1.5 mt-2">
          {STAGES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setEntering(true); setTimeout(() => { setStageIdx(i); setEntering(false); }, 200); }}
              className="w-2 h-2 rounded-full transition-colors"
              style={{ background: i === stageIdx ? '#1565c0' : '#ccc' }}
              aria-label={`Stage ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
