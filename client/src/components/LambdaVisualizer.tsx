/**
 * LambdaVisualizer.tsx
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0) = Constructor, golden yellow (#f9a825) = Duplicator, vermillion red (#c62828) = Eraser
 * Layout: Left control rail | Center SVG canvas (drag-and-drop nodes) | Right info panel
 *
 * Features:
 *  - Custom lambda term input with parser + compiler
 *  - Animated node transitions (CSS transitions on SVG positions)
 *  - PNG export of the current canvas
 *  - Drag-and-drop node repositioning
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  InteractionNet, NetNode, NetEdge, SerializedNet,
  applyOneStep, cloneNet, serializeNet, findActivePairs,
  PRESETS,
} from '@/lib/interactionNet';
import { parseLambda, compileLambda } from '@/lib/lambdaParser';

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

// ─── Force layout ─────────────────────────────────────────────────────────────
function computeForceLayout(
  nodes: NetNode[],
  edges: NetEdge[],
  width: number,
  height: number,
  existingPositions: Map<string, { x: number; y: number }>
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const pos = new Map<string, { x: number; y: number; vx: number; vy: number }>();
  nodes.forEach((n, i) => {
    const existing = existingPositions.get(n.id);
    if (existing) {
      pos.set(n.id, { x: existing.x, y: existing.y, vx: 0, vy: 0 });
    } else {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(width, height) * 0.3;
      pos.set(n.id, {
        x: n.x || width / 2 + r * Math.cos(angle),
        y: n.y || height / 2 + r * Math.sin(angle),
        vx: 0, vy: 0,
      });
    }
  });

  const REPULSION = 4000;
  const ATTRACTION = 0.04;
  const DAMPING = 0.85;
  const ITERATIONS = 80;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const nodeArr = Array.from(pos.entries());
    for (let i = 0; i < nodeArr.length; i++) {
      for (let j = i + 1; j < nodeArr.length; j++) {
        const [, a] = nodeArr[i];
        const [, b] = nodeArr[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = REPULSION / (dist * dist);
        a.vx += (dx / dist) * force; a.vy += (dy / dist) * force;
        b.vx -= (dx / dist) * force; b.vy -= (dy / dist) * force;
      }
    }
    for (const edge of edges) {
      const a = pos.get(edge.from.nodeId);
      const b = pos.get(edge.to.nodeId);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const force = (dist - 120) * ATTRACTION;
      a.vx += (dx / dist) * force; a.vy += (dy / dist) * force;
      b.vx -= (dx / dist) * force; b.vy -= (dy / dist) * force;
    }
    for (const [, p] of Array.from(pos.entries())) {
      p.vx += (width / 2 - p.x) * 0.005;
      p.vy += (height / 2 - p.y) * 0.005;
      p.vx *= DAMPING; p.vy *= DAMPING;
      p.x += p.vx; p.y += p.vy;
      p.x = Math.max(40, Math.min(width - 40, p.x));
      p.y = Math.max(40, Math.min(height - 40, p.y));
    }
  }

  const result = new Map<string, { x: number; y: number }>();
  for (const [id, p] of Array.from(pos.entries())) result.set(id, { x: p.x, y: p.y });
  return result;
}

// ─── Animated node shape ──────────────────────────────────────────────────────
function NodeShape({
  node, pos, isActive, isDragging, isNew,
  onMouseDown, onTouchStart,
}: {
  node: NetNode;
  pos: { x: number; y: number };
  isActive: boolean;
  isDragging: boolean;
  isNew: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onTouchStart: (e: React.TouchEvent, id: string) => void;
}) {
  const color = NODE_COLORS[node.kind];
  const label = node.label || NODE_LABELS[node.kind];
  const { x, y } = pos;

  // Animate scale-in for new nodes
  const [scale, setScale] = useState(isNew ? 0.1 : 1);
  const [opacity, setOpacity] = useState(isNew ? 0 : 1);
  useEffect(() => {
    if (isNew) {
      const t = requestAnimationFrame(() => {
        setScale(1);
        setOpacity(1);
      });
      return () => cancelAnimationFrame(t);
    }
  }, [isNew]);

  const glowStyle: React.CSSProperties = {
    filter: isDragging
      ? `drop-shadow(0 0 12px ${color})`
      : isActive
      ? `drop-shadow(0 0 8px ${color})`
      : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
    transform: `scale(${scale})`,
    transformOrigin: `${x}px ${y}px`,
    opacity,
    transition: isNew ? 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease' : undefined,
  };

  const handlers = {
    onMouseDown: (e: React.MouseEvent) => onMouseDown(e, node.id),
    onTouchStart: (e: React.TouchEvent) => onTouchStart(e, node.id),
  };

  if (node.kind === 'eraser') {
    return (
      <g style={glowStyle} {...handlers}>
        <circle cx={x} cy={y} r={NODE_RADIUS + 6} fill="transparent" />
        <circle cx={x} cy={y} r={NODE_RADIUS} fill={color} stroke="#1a1a2e" strokeWidth={isDragging ? 3 : isActive ? 3 : 2} />
        <text x={x} y={y + 5} textAnchor="middle" fill="white" fontSize={14} fontFamily="IBM Plex Mono, monospace" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{label}</text>
        {isActive && <circle cx={x} cy={y} r={NODE_RADIUS + 6} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7} />}
      </g>
    );
  }

  if (node.kind === 'constructor') {
    const h = NODE_RADIUS * 1.8;
    const w = NODE_RADIUS * 1.8;
    const pts = `${x},${y - h / 2} ${x - w / 2},${y + h / 2} ${x + w / 2},${y + h / 2}`;
    return (
      <g style={glowStyle} {...handlers}>
        <circle cx={x} cy={y} r={NODE_RADIUS + 8} fill="transparent" />
        <polygon points={pts} fill={color} stroke="#1a1a2e" strokeWidth={isDragging ? 3 : isActive ? 3 : 2} />
        <text x={x} y={y + 5} textAnchor="middle" fill="white" fontSize={12} fontFamily="IBM Plex Mono, monospace" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{label}</text>
        {isActive && <polygon points={pts} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7}
          transform={`scale(1.3) translate(${x * (1 - 1 / 1.3)},${y * (1 - 1 / 1.3)})`} />}
      </g>
    );
  }

  // Duplicator: diamond
  const d = NODE_RADIUS * 1.4;
  const pts = `${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`;
  return (
    <g style={glowStyle} {...handlers}>
      <circle cx={x} cy={y} r={NODE_RADIUS + 8} fill="transparent" />
      <polygon points={pts} fill={color} stroke="#1a1a2e" strokeWidth={isDragging ? 3 : isActive ? 3 : 2} />
      <text x={x} y={y + 5} textAnchor="middle" fill="#1a1a2e" fontSize={12} fontFamily="IBM Plex Mono, monospace" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{label}</text>
      {isActive && <polygon points={pts} fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 3" opacity={0.7}
        transform={`scale(1.4) translate(${x * (1 - 1 / 1.4)},${y * (1 - 1 / 1.4)})`} />}
    </g>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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

  // Custom lambda input
  const [customInput, setCustomInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 560, h: 420 });

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Track new node IDs for entrance animation
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());
  const prevNodeIdsRef = useRef<Set<string>>(new Set());

  const dragRef = useRef<{
    nodeId: string;
    startMouseX: number;
    startMouseY: number;
    startNodeX: number;
    startNodeY: number;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const prevNetKeyRef = useRef('');

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
  const netKey = serialized.nodes.map(n => n.id).join(',');

  useEffect(() => {
    if (netKey === prevNetKeyRef.current) return;
    prevNetKeyRef.current = netKey;

    // Detect new nodes for entrance animation
    const currentIds = new Set(serialized.nodes.map(n => n.id));
    const newIds = new Set<string>();
    currentIds.forEach(id => {
      if (!prevNodeIdsRef.current.has(id)) newIds.add(id);
    });
    prevNodeIdsRef.current = currentIds;
    setNewNodeIds(newIds);

    // Clear new node markers after animation completes
    if (newIds.size > 0) {
      const t = setTimeout(() => setNewNodeIds(new Set()), 400);
      return () => clearTimeout(t);
    }

    const newPositions = computeForceLayout(
      serialized.nodes,
      serialized.edges,
      svgSize.w,
      svgSize.h,
      positions
    );
    setPositions(newPositions);
  }, [netKey, svgSize.w, svgSize.h]);

  // Recompute layout when net or size changes
  useEffect(() => {
    const newPositions = computeForceLayout(
      serialized.nodes,
      serialized.edges,
      svgSize.w,
      svgSize.h,
      positions
    );
    setPositions(newPositions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netKey, svgSize.w, svgSize.h]);

  const activePairs = findActivePairs(net);
  const activeIds = new Set(activePairs.flatMap(([a, b]) => [a.id, b.id]));

  // ── Drag handlers ─────────────────────────────────────────────────────────────
  const getSvgPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: clientX, y: clientY };
    const rect = svg.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const pt = getSvgPoint(e.clientX, e.clientY);
    const nodePos = positions.get(nodeId);
    if (!nodePos) return;
    dragRef.current = { nodeId, startMouseX: pt.x, startMouseY: pt.y, startNodeX: nodePos.x, startNodeY: nodePos.y };
    setDraggingId(nodeId);
  }, [positions, getSvgPoint]);

  const handleNodeTouchStart = useCallback((e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const pt = getSvgPoint(touch.clientX, touch.clientY);
    const nodePos = positions.get(nodeId);
    if (!nodePos) return;
    dragRef.current = { nodeId, startMouseX: pt.x, startMouseY: pt.y, startNodeX: nodePos.x, startNodeY: nodePos.y };
    setDraggingId(nodeId);
  }, [positions, getSvgPoint]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    const dx = pt.x - dragRef.current.startMouseX;
    const dy = pt.y - dragRef.current.startMouseY;
    const newX = Math.max(30, Math.min(svgSize.w - 30, dragRef.current.startNodeX + dx));
    const newY = Math.max(30, Math.min(svgSize.h - 30, dragRef.current.startNodeY + dy));
    setPositions(prev => {
      const next = new Map(prev);
      next.set(dragRef.current!.nodeId, { x: newX, y: newY });
      return next;
    });
  }, [getSvgPoint, svgSize]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const pt = getSvgPoint(touch.clientX, touch.clientY);
    const dx = pt.x - dragRef.current.startMouseX;
    const dy = pt.y - dragRef.current.startMouseY;
    const newX = Math.max(30, Math.min(svgSize.w - 30, dragRef.current.startNodeX + dx));
    const newY = Math.max(30, Math.min(svgSize.h - 30, dragRef.current.startNodeY + dy));
    setPositions(prev => {
      const next = new Map(prev);
      next.set(dragRef.current!.nodeId, { x: newX, y: newY });
      return next;
    });
  }, [getSvgPoint, svgSize]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
    setDraggingId(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [handleMouseMove, handleTouchMove, handleDragEnd]);

  // ── Reduction controls ────────────────────────────────────────────────────────
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
    if (findActivePairs(clone).length === 0) {
      setIsNormalForm(true);
      setAutoPlay(false);
    }
  }, [net, isNormalForm]);

  const doUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
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
    setPositions(new Map());
    prevNetKeyRef.current = '';
    setHistory([]);
    setStepCount(0);
    setLastRule('—');
    setLastDesc('Select a preset and press Step to begin reduction.');
    setIsNormalForm(false);
    setAutoPlay(false);
    setCustomInput('');
    setParseError(null);
  };

  useEffect(() => {
    if (!autoPlay) return;
    const id = setInterval(doStep, speed);
    return () => clearInterval(id);
  }, [autoPlay, doStep, speed]);

  const loadPreset = (idx: number) => {
    setPresetIdx(idx);
    setNet(PRESETS[idx].build());
    setPositions(new Map());
    prevNetKeyRef.current = '';
    setHistory([]);
    setStepCount(0);
    setLastRule('—');
    setLastDesc('Preset loaded. Press Step to begin reduction.');
    setIsNormalForm(false);
    setAutoPlay(false);
    setCustomInput('');
    setParseError(null);
    setShowCustom(false);
  };

  // ── Custom lambda input ───────────────────────────────────────────────────────
  const compileCustom = () => {
    const src = customInput.trim();
    if (!src) return;
    try {
      const term = parseLambda(src);
      const { net: compiled } = compileLambda(term);
      setNet(compiled);
      setPositions(new Map());
      prevNetKeyRef.current = '';
      setHistory([]);
      setStepCount(0);
      setLastRule('—');
      setLastDesc(`Compiled: ${src}`);
      setIsNormalForm(false);
      setAutoPlay(false);
      setParseError(null);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  };

  // ── PNG Export ────────────────────────────────────────────────────────────────
  const exportPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2; // retina
      canvas.width = svgSize.w * scale;
      canvas.height = svgSize.h * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#faf7f2';
      ctx.fillRect(0, 0, svgSize.w, svgSize.h);
      ctx.drawImage(img, 0, 0, svgSize.w, svgSize.h);
      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `interaction-net-step-${String(stepCount).padStart(3, '0')}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };
    img.src = url;
  }, [svgSize, stepCount]);

  return (
    <div className="flex h-full gap-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      {/* ── Left control rail ── */}
      <div className="w-56 shrink-0 border-r-2 border-[#1a1a2e] bg-[#faf7f2] flex flex-col p-4 gap-4 overflow-y-auto">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-3">PRESET</div>
          {PRESETS.map((p, i) => (
            <button key={p.id} onClick={() => loadPreset(i)}
              className={`w-full text-left text-xs px-2 py-2 mb-1 border transition-colors ${presetIdx === i && !showCustom ? 'bg-[#1565c0] text-white border-[#1565c0]' : 'bg-white text-[#1a1a2e] border-[#1a1a2e] hover:bg-[#e8f0fe]'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom lambda input */}
        <div>
          <button
            onClick={() => setShowCustom(v => !v)}
            className={`w-full text-xs px-2 py-2 border-2 font-bold transition-colors ${showCustom ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-[#1a1a2e] border-[#1a1a2e] hover:bg-[#e8f0fe]'}`}>
            {showCustom ? '▲ CUSTOM TERM' : '▼ CUSTOM TERM'}
          </button>
          {showCustom && (
            <div className="mt-2">
              <textarea
                value={customInput}
                onChange={e => { setCustomInput(e.target.value); setParseError(null); }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) compileCustom(); }}
                placeholder={"e.g.  (\\x. x x) y\nor  \\f. f f"}
                rows={3}
                className="w-full text-xs border-2 border-[#1a1a2e] p-2 bg-white text-[#1a1a2e] resize-none outline-none focus:border-[#1565c0]"
                style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              />
              {parseError && (
                <div className="text-xs text-[#c62828] mt-1 leading-tight">{parseError}</div>
              )}
              <button onClick={compileCustom}
                className="w-full text-xs mt-1 px-2 py-2 bg-[#1565c0] text-white border-2 border-[#1565c0] hover:bg-[#0d47a1] font-bold transition-colors">
                ⚙ COMPILE
              </button>
              <div className="text-xs text-[#888] mt-1 leading-tight">
                Use <code>\x.</code> or <code>λx.</code> for lambda. Ctrl+Enter to compile.
              </div>
            </div>
          )}
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
            className="w-full text-xs px-3 py-2 mb-2 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] hover:bg-[#f5f5f5] transition-colors font-bold">
            ↺ RESET
          </button>
          <button onClick={exportPng}
            className="w-full text-xs px-3 py-2 bg-[#2e7d32] text-white border-2 border-[#2e7d32] hover:bg-[#1b5e20] transition-colors font-bold">
            ↓ EXPORT PNG
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
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-full" style={{ background: '#c62828' }} />
            <span className="text-xs text-[#1a1a2e]">ε Eraser</span>
          </div>
          <div className="text-xs text-[#888] leading-relaxed border-t border-[#e0ddd8] pt-2">
            <span className="font-bold text-[#1a1a2e]">Drag</span> any node to reposition it.
          </div>
        </div>
      </div>

      {/* ── Center canvas ── */}
      <div className="flex-1 relative bg-[#faf7f2] overflow-hidden select-none">
        <div className="absolute top-3 left-4 z-10 pointer-events-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <span className="text-6xl text-[#1a1a2e] leading-none">{String(stepCount).padStart(3, '0')}</span>
          <span className="text-xs text-[#888] ml-2 font-mono uppercase tracking-wider">STEPS</span>
        </div>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <span className="text-xs text-[#bbb] uppercase tracking-widest" style={{ fontFamily: 'IBM Plex Mono' }}>
            {draggingId ? '⠿ DRAGGING' : '⠿ DRAG NODES TO REARRANGE'}
          </span>
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

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          className="absolute inset-0"
          style={{ cursor: draggingId ? 'grabbing' : 'default' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#1a1a2e" opacity="0.6" />
            </marker>
            <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#c62828" />
            </marker>
          </defs>

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
                style={{ pointerEvents: 'none', transition: 'all 0.3s ease' }}
              />
            );
          })}

          {/* Nodes */}
          {serialized.nodes.map(node => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            return (
              <NodeShape
                key={node.id}
                node={node}
                pos={pos}
                isActive={activeIds.has(node.id)}
                isDragging={draggingId === node.id}
                isNew={newNodeIds.has(node.id)}
                onMouseDown={handleNodeMouseDown}
                onTouchStart={handleNodeTouchStart}
              />
            );
          })}

          <text x={svgSize.w - 10} y={svgSize.h - 10} textAnchor="end" fontSize={10}
            fill="#aaa" fontFamily="IBM Plex Mono, monospace" style={{ pointerEvents: 'none' }}>
            {serialized.nodes.length} nodes · {serialized.edges.length} edges
          </text>
        </svg>
      </div>

      {/* ── Right info panel ── */}
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
            <div><span className="font-bold text-[#888]">γ-δ commutation:</span> Constructor and duplicator swap, creating 4 new nodes — optimal sharing.</div>
            <div><span className="font-bold text-[#888]">ε-γ/δ commutation:</span> Eraser propagates into all auxiliary ports.</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-3">SYNTAX GUIDE</div>
          <div className="text-xs text-[#444] leading-relaxed space-y-1">
            <div><code className="bg-[#eee] px-1">\x. body</code> — abstraction</div>
            <div><code className="bg-[#eee] px-1">f a</code> — application</div>
            <div><code className="bg-[#eee] px-1">(f a) b</code> — grouping</div>
            <div><code className="bg-[#eee] px-1">\x y. x</code> — multi-arg</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-3">ABOUT</div>
          <div className="text-xs text-[#444] leading-relaxed">
            Interaction Nets were introduced by Yves Lafont (1990). The Y combinator creates a self-referential loop via a Fanout (δ) tree — exactly the structure in the original diagram.
          </div>
        </div>
      </div>
    </div>
  );
}
