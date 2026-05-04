/**
 * LambdaVisualizer.tsx
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0) = Constructor, golden yellow (#f9a825) = Duplicator, vermillion red (#c62828) = Eraser
 * Layout: Left control rail | Center SVG canvas | Right info panel
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  InteractionNet, NetNode, NetEdge, SerializedNet,
  applyOneStep, cloneNet, serializeNet, getEdges, findActivePairs,
  PRESETS,
} from '@/lib/interactionNet';

const NODE_COLORS: Record<string, string> = {
  constructor: '#1565c0',
  duplicator: '#f9a825',
  eraser: '#c62828',
};

const NODE_LABELS: Record<string, string> = {
  constructor: 'γ',
  duplicator: 'δ',
  eraser: 'ε',
};

const NODE_RADIUS = 22;

interface LayoutNode extends NetNode {
  displayX: number;
  displayY: number;
}

function useForceLayout(nodes: NetNode[], edges: NetEdge[], width: number, height: number) {
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (nodes.length === 0) { setPositions(new Map()); return; }

    // Initialize positions from node data or spread evenly
    const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(width, height) * 0.3;
      pos.set(n.id, {
        x: n.x || width / 2 + r * Math.cos(angle),
        y: n.y || height / 2 + r * Math.sin(angle),
        vx: 0, vy: 0,
      });
    });

    const REPULSION = 4000;
    const ATTRACTION = 0.04;
    const DAMPING = 0.85;
    const ITERATIONS = 80;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      // Repulsion
      const nodeArr = Array.from(pos.entries());
      for (let i = 0; i < nodeArr.length; i++) {
        for (let j = i + 1; j < nodeArr.length; j++) {
          const [idA, a] = nodeArr[i];
          const [idB, b] = nodeArr[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
          const force = REPULSION / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const a = pos.get(edge.from.nodeId);
        const b = pos.get(edge.to.nodeId);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const idealLen = 120;
        const force = (dist - idealLen) * ATTRACTION;
        a.vx += (dx / dist) * force;
        a.vy += (dy / dist) * force;
        b.vx -= (dx / dist) * force;
        b.vy -= (dy / dist) * force;
      }

      // Center gravity
      for (const [, p] of Array.from(pos.entries())) {
        p.vx += (width / 2 - p.x) * 0.005;
        p.vy += (height / 2 - p.y) * 0.005;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;
        p.x = Math.max(40, Math.min(width - 40, p.x));
        p.y = Math.max(40, Math.min(height - 40, p.y));
      }
    }

    const result = new Map<string, { x: number; y: number }>();
    for (const [id, p] of Array.from(pos.entries())) {
      result.set(id, { x: p.x, y: p.y });
    }
    setPositions(result);
  }, [nodes.map(n => n.id).join(','), edges.length, width, height]);

  return positions;
}

function NodeShape({ node, pos, isActive }: { node: NetNode; pos: { x: number; y: number }; isActive: boolean }) {
  const color = NODE_COLORS[node.kind];
  const label = node.label || NODE_LABELS[node.kind];
  const { x, y } = pos;

  const glowStyle = isActive ? { filter: `drop-shadow(0 0 8px ${color})` } : {};

  if (node.kind === 'eraser') {
    return (
      <g style={glowStyle}>
        <circle cx={x} cy={y} r={NODE_RADIUS} fill={color} stroke="#1a1a2e" strokeWidth={isActive ? 3 : 2} />
        <text x={x} y={y + 5} textAnchor="middle" fill="white" fontSize={14} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">{label}</text>
        {isActive && <circle cx={x} cy={y} r={NODE_RADIUS + 6} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7} />}
      </g>
    );
  }

  if (node.kind === 'constructor') {
    // Triangle pointing up
    const h = NODE_RADIUS * 1.8;
    const w = NODE_RADIUS * 1.8;
    const pts = `${x},${y - h / 2} ${x - w / 2},${y + h / 2} ${x + w / 2},${y + h / 2}`;
    return (
      <g style={glowStyle}>
        <polygon points={pts} fill={color} stroke="#1a1a2e" strokeWidth={isActive ? 3 : 2} />
        <text x={x} y={y + 5} textAnchor="middle" fill="white" fontSize={12} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">{label}</text>
        {isActive && <polygon points={pts} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7}
          transform={`scale(1.3) translate(${x * (1 - 1/1.3)},${y * (1 - 1/1.3)})`} />}
      </g>
    );
  }

  // Duplicator: diamond
  const d = NODE_RADIUS * 1.4;
  const pts = `${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`;
  return (
    <g style={glowStyle}>
      <polygon points={pts} fill={color} stroke="#1a1a2e" strokeWidth={isActive ? 3 : 2} />
      <text x={x} y={y + 5} textAnchor="middle" fill="#1a1a2e" fontSize={12} fontFamily="IBM Plex Mono, monospace" fontWeight="bold">{label}</text>
      {isActive && <polygon points={pts} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7}
        transform={`scale(1.4) translate(${x * (1 - 1/1.4)},${y * (1 - 1/1.4)})`} />}
    </g>
  );
}

export default function LambdaVisualizer() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [net, setNet] = useState<InteractionNet>(() => PRESETS[0].build());
  const [history, setHistory] = useState<SerializedNet[]>([]);
  const [stepCount, setStepCount] = useState(0);
  const [lastRule, setLastRule] = useState<string>('—');
  const [lastDesc, setLastDesc] = useState<string>('Select a preset and press Step to begin reduction.');
  const [isNormalForm, setIsNormalForm] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [speed, setSpeed] = useState(600);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 560, h: 420 });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setSvgSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    if (svgRef.current) obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  const serialized = serializeNet(net);
  const activePairs = findActivePairs(net);
  const activeIds = new Set(activePairs.flatMap(([a, b]) => [a.id, b.id]));

  const positions = useForceLayout(serialized.nodes, serialized.edges, svgSize.w, svgSize.h);

  const doStep = useCallback(() => {
    if (isNormalForm) return;
    const clone = cloneNet(net);
    const result = applyOneStep(clone);
    if (!result) {
      setIsNormalForm(true);
      setLastRule('Normal Form');
      setLastDesc('No more active pairs. The net is in normal form — reduction is complete.');
      setAutoPlay(false);
      return;
    }
    setHistory(h => [...h, serializeNet(net)]);
    setNet(clone);
    setStepCount(s => s + 1);
    setLastRule(result.rule);
    setLastDesc(result.description);
    const newPairs = findActivePairs(clone);
    if (newPairs.length === 0) {
      setIsNormalForm(true);
      setAutoPlay(false);
    }
  }, [net, isNormalForm]);

  const doUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    // Reconstruct net from serialized
    const restored: InteractionNet = { nodes: new Map(), freeWires: [] };
    for (const n of prev.nodes) restored.nodes.set(n.id, { ...n, ports: [...n.ports] });
    setNet(restored);
    setHistory(h => h.slice(0, -1));
    setStepCount(s => Math.max(0, s - 1));
    setIsNormalForm(false);
    setLastRule('—');
    setLastDesc('Stepped back one reduction.');
  };

  const doReset = () => {
    setNet(PRESETS[presetIdx].build());
    setHistory([]);
    setStepCount(0);
    setLastRule('—');
    setLastDesc('Select a preset and press Step to begin reduction.');
    setIsNormalForm(false);
    setAutoPlay(false);
  };

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(doStep, speed);
    return () => clearInterval(id);
  }, [autoPlay, doStep, speed]);

  const loadPreset = (idx: number) => {
    setPresetIdx(idx);
    setNet(PRESETS[idx].build());
    setHistory([]);
    setStepCount(0);
    setLastRule('—');
    setLastDesc('Preset loaded. Press Step to begin reduction.');
    setIsNormalForm(false);
    setAutoPlay(false);
  };

  return (
    <div className="flex h-full gap-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* Left control rail */}
      <div className="w-56 shrink-0 border-r-2 border-[#1a1a2e] bg-[#faf7f2] flex flex-col p-4 gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-3">PRESET</div>
          {PRESETS.map((p, i) => (
            <button
              key={p.id}
              onClick={() => loadPreset(i)}
              className={`w-full text-left text-xs px-2 py-2 mb-1 border transition-colors ${presetIdx === i ? 'bg-[#1565c0] text-white border-[#1565c0]' : 'bg-white text-[#1a1a2e] border-[#1a1a2e] hover:bg-[#e8f0fe]'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-3">CONTROLS</div>
          <button onClick={doStep} disabled={isNormalForm}
            className="w-full text-xs px-3 py-2 mb-2 bg-[#1a1a2e] text-white border-2 border-[#1a1a2e] hover:bg-[#1565c0] disabled:opacity-40 transition-colors font-bold">
            ▶ STEP
          </button>
          <button onClick={() => setAutoPlay(a => !a)} disabled={isNormalForm}
            className={`w-full text-xs px-3 py-2 mb-2 border-2 border-[#1a1a2e] font-bold transition-colors disabled:opacity-40 ${autoPlay ? 'bg-[#c62828] text-white' : 'bg-white text-[#1a1a2e] hover:bg-[#fce8e8]'}`}>
            {autoPlay ? '⏸ PAUSE' : '⏩ AUTO'}
          </button>
          <button onClick={doUndo} disabled={history.length === 0}
            className="w-full text-xs px-3 py-2 mb-2 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] hover:bg-[#f5f5f5] disabled:opacity-40 transition-colors font-bold">
            ↩ UNDO
          </button>
          <button onClick={doReset}
            className="w-full text-xs px-3 py-2 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] hover:bg-[#f5f5f5] transition-colors font-bold">
            ↺ RESET
          </button>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-2">SPEED</div>
          <input type="range" min={100} max={1500} step={100} value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-full accent-[#1565c0]" />
          <div className="text-xs text-center text-[#555] mt-1">{speed}ms / step</div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-2">LEGEND</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full" style={{ background: '#1565c0' }} />
            <span className="text-xs text-[#1a1a2e]">γ Constructor</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rotate-45" style={{ background: '#f9a825' }} />
            <span className="text-xs text-[#1a1a2e]">δ Duplicator</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ background: '#c62828' }} />
            <span className="text-xs text-[#1a1a2e]">ε Eraser</span>
          </div>
        </div>
      </div>

      {/* Center canvas */}
      <div className="flex-1 relative bg-[#faf7f2] overflow-hidden">
        {/* Step counter */}
        <div className="absolute top-3 left-4 z-10" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <span className="text-6xl text-[#1a1a2e] leading-none">{String(stepCount).padStart(3, '0')}</span>
          <span className="text-xs text-[#888] ml-2 font-mono uppercase tracking-wider">STEPS</span>
        </div>
        {isNormalForm && (
          <div className="absolute top-3 right-4 z-10 bg-[#2e7d32] text-white text-xs px-3 py-1 font-bold uppercase tracking-widest">
            NORMAL FORM
          </div>
        )}
        {activePairs.length > 0 && !isNormalForm && (
          <div className="absolute top-3 right-4 z-10 bg-[#c62828] text-white text-xs px-3 py-1 font-bold uppercase tracking-widest animate-pulse">
            {activePairs.length} ACTIVE PAIR{activePairs.length > 1 ? 'S' : ''}
          </div>
        )}

        <svg ref={svgRef} width="100%" height="100%" className="absolute inset-0">
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#1a1a2e" opacity="0.6" />
            </marker>
            <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#c62828" />
            </marker>
          </defs>

          {/* Diagonal decorative lines (constructivist) */}
          <line x1="0" y1={svgSize.h * 0.15} x2={svgSize.w * 0.08} y2="0" stroke="#e0ddd8" strokeWidth="1" />
          <line x1={svgSize.w * 0.92} y1={svgSize.h} x2={svgSize.w} y2={svgSize.h * 0.85} stroke="#e0ddd8" strokeWidth="1" />

          {/* Edges */}
          {serialized.edges.map((edge, i) => {
            const from = positions.get(edge.from.nodeId);
            const to = positions.get(edge.to.nodeId);
            if (!from || !to) return null;
            const isActivePairEdge = edge.from.portIndex === 0 && edge.to.portIndex === 0;
            const color = isActivePairEdge ? '#c62828' : '#1a1a2e';
            const opacity = isActivePairEdge ? 1 : 0.5;
            const sw = isActivePairEdge ? 2.5 : 1.5;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2 - 20;
            return (
              <path
                key={i}
                d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`}
                stroke={color}
                strokeWidth={sw}
                fill="none"
                opacity={opacity}
                markerEnd={isActivePairEdge ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                strokeDasharray={isActivePairEdge ? '6 3' : undefined}
              />
            );
          })}

          {/* Nodes */}
          {serialized.nodes.map(node => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            return (
              <NodeShape key={node.id} node={node} pos={pos} isActive={activeIds.has(node.id)} />
            );
          })}

          {/* Node count */}
          <text x={svgSize.w - 10} y={svgSize.h - 10} textAnchor="end" fontSize={10}
            fill="#aaa" fontFamily="IBM Plex Mono, monospace">
            {serialized.nodes.length} nodes · {serialized.edges.length} edges
          </text>
        </svg>
      </div>

      {/* Right info panel */}
      <div className="w-52 shrink-0 border-l-2 border-[#1a1a2e] bg-[#faf7f2] flex flex-col p-4 gap-4 overflow-y-auto">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-3">LAST RULE</div>
          <div className="text-sm font-bold text-[#1565c0] mb-2">{lastRule}</div>
          <div className="text-xs text-[#444] leading-relaxed">{lastDesc}</div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-3">REWRITE RULES</div>
          <div className="text-xs text-[#444] leading-relaxed space-y-2">
            <div><span className="font-bold text-[#1565c0]">γ-γ annihilation:</span> Two constructors cancel, connecting aux ports.</div>
            <div><span className="font-bold text-[#f9a825]">δ-δ annihilation:</span> Two duplicators cancel similarly.</div>
            <div><span className="font-bold text-[#c62828]">ε-ε annihilation:</span> Two erasers vanish.</div>
            <div><span className="font-bold text-[#888]">γ-δ commutation:</span> Constructor and duplicator swap, creating 4 new nodes — this is optimal sharing.</div>
            <div><span className="font-bold text-[#888]">ε-γ/δ commutation:</span> Eraser propagates into all auxiliary ports.</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-3">ABOUT</div>
          <div className="text-xs text-[#444] leading-relaxed">
            Interaction Nets were introduced by Yves Lafont (1990). The Y combinator in this model creates a self-referential loop via a Fanout (δ) tree — exactly the structure in the original diagram.
          </div>
        </div>
      </div>
    </div>
  );
}
