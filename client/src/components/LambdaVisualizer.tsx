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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  InteractionNet, NetNode, NetEdge, SerializedNet,
  applyOneStep, applyAllParallelSteps, cloneNet, serializeNet, findActivePairs,
  PRESETS,
} from '@/lib/interactionNet';
import { parseLambda, compileLambda } from '@/lib/lambdaParser';
import { useTab } from '@/contexts/TabContext';
import IdentityAnimation from './IdentityAnimation';

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

  const REPULSION = 6000;
  const ATTRACTION = 0.04;
  const DAMPING = 0.85;
  const ITERATIONS = 120;
  const MIN_DIST = NODE_RADIUS * 2 + 20;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const nodeArr = Array.from(pos.entries());
    for (let i = 0; i < nodeArr.length; i++) {
      for (let j = i + 1; j < nodeArr.length; j++) {
        const [, a] = nodeArr[i];
        const [, b] = nodeArr[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        if (dist < MIN_DIST) {
          const overlap = (MIN_DIST - dist) * 0.5;
          const nx = dx / dist; const ny = dy / dist;
          a.x += nx * overlap; a.y += ny * overlap;
          b.x -= nx * overlap; b.y -= ny * overlap;
        }
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
  const { pendingTerm, setPendingTerm } = useTab();
  const [presetIdx, setPresetIdx] = useState(0);
  const [net, setNet] = useState<InteractionNet>(() => PRESETS[0].build());
  const [history, setHistory] = useState<InteractionNet[]>([]);
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
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState({ w: 560, h: 420 });

  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  // Always-current refs so drag handlers never capture stale closures
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const svgSizeRef = useRef({ w: 560, h: 420 });
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { svgSizeRef.current = svgSize; }, [svgSize]);

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
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) {
          setSvgSize({ w: width, h: height });
        }
      }
    });
    if (canvasContainerRef.current) obs.observe(canvasContainerRef.current);
    return () => obs.disconnect();
  }, []);

  const serialized = useMemo(() => { try { return serializeNet(net); } catch { return { nodes: [], edges: [] }; } }, [net]);
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

    // Always compute layout — new nodes need positions too
    const newPositions = computeForceLayout(
      serialized.nodes,
      serialized.edges,
      svgSize.w,
      svgSize.h,
      positions
    );
    setPositions(newPositions);

    // Clear new node animation markers after transition completes
    if (newIds.size > 0) {
      const t = setTimeout(() => setNewNodeIds(new Set()), 400);
      return () => clearTimeout(t);
    }
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
    // Always read from ref — never stale regardless of render cycle
    const nodePos = positionsRef.current.get(nodeId);
    if (!nodePos) return;
    dragRef.current = { nodeId, startMouseX: pt.x, startMouseY: pt.y, startNodeX: nodePos.x, startNodeY: nodePos.y };
    setDraggingId(nodeId);
  }, [getSvgPoint]);

  const handleNodeTouchStart = useCallback((e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const pt = getSvgPoint(touch.clientX, touch.clientY);
    const nodePos = positionsRef.current.get(nodeId);
    if (!nodePos) return;
    dragRef.current = { nodeId, startMouseX: pt.x, startMouseY: pt.y, startNodeX: nodePos.x, startNodeY: nodePos.y };
    setDraggingId(nodeId);
  }, [getSvgPoint]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pt = getSvgPoint(e.clientX, e.clientY);
    const dx = pt.x - drag.startMouseX;
    const dy = pt.y - drag.startMouseY;
    // Use svgSizeRef so bounds are always current without re-registering the listener
    const { w, h } = svgSizeRef.current;
    const newX = Math.max(30, Math.min(w - 30, drag.startNodeX + dx));
    const newY = Math.max(30, Math.min(h - 30, drag.startNodeY + dy));
    // Snapshot nodeId before async state update to prevent null dereference
    const nodeId = drag.nodeId;
    setPositions(prev => {
      const next = new Map(prev);
      next.set(nodeId, { x: newX, y: newY });
      return next;
    });
  }, [getSvgPoint]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    const touch = e.touches[0];
    const pt = getSvgPoint(touch.clientX, touch.clientY);
    const dx = pt.x - drag.startMouseX;
    const dy = pt.y - drag.startMouseY;
    const { w, h } = svgSizeRef.current;
    const newX = Math.max(30, Math.min(w - 30, drag.startNodeX + dx));
    const newY = Math.max(30, Math.min(h - 30, drag.startNodeY + dy));
    const nodeId = drag.nodeId;
    setPositions(prev => {
      const next = new Map(prev);
      next.set(nodeId, { x: newX, y: newY });
      return next;
    });
  }, [getSvgPoint]);

  const handleDragEnd = useCallback(() => {
    // Snapshot nodeId BEFORE clearing ref to prevent race with async updater
    const droppedId = dragRef.current ? dragRef.current.nodeId : null;
    dragRef.current = null;
    setDraggingId(null);
    if (!droppedId) return;
    // After drop: resolve any overlaps by nudging the dropped node away from others
    setPositions(prev => {
      const next = new Map(prev);
      const dropped = next.get(droppedId);
      if (!dropped) return prev;
      const MIN = NODE_RADIUS * 2 + 16;
      let changed = false;
      for (const [otherId, other] of Array.from(next.entries())) {
        if (otherId === droppedId) continue;
        const dx = dropped.x - other.x;
        const dy = dropped.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        if (dist < MIN) {
          const push = (MIN - dist) + 4;
          const nx = dist < 1 ? 1 : dx / dist;
          const ny = dist < 1 ? 0 : dy / dist;
          next.set(droppedId, { x: dropped.x + nx * push, y: dropped.y + ny * push });
          changed = true;
          break;
        }
      }
      return changed ? next : prev;
    });
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
    setHistory(h => [...h, cloneNet(net)]);
    setNet(clone);
    setStepCount(s => s + 1);
    setLastRule(result.rule);
    setLastDesc(result.description);
    if (findActivePairs(clone).length === 0) {
      setIsNormalForm(true);
      setAutoPlay(false);
    }
  }, [net, isNormalForm]);
  const doParallelStep = useCallback(() => {
    if (isNormalForm) return;
    const clone = cloneNet(net);
    const result = applyAllParallelSteps(clone);
    if (result.count === 0) {
      setIsNormalForm(true);
      setLastRule('Normal Form');
      setLastDesc('No more active pairs. The net is in normal form — reduction is complete.');
      setAutoPlay(false);
      return;
    }
    setHistory(h => [...h, cloneNet(net)]);
    setNet(clone);
    setStepCount(s => s + result.count);
    setLastRule(`∥ ${result.count} pair${result.count > 1 ? 's' : ''}`);
    setLastDesc(result.description);
    if (findActivePairs(clone).length === 0) {
      setIsNormalForm(true);
      setAutoPlay(false);
    }
  }, [net, isNormalForm]);
  const doUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    // Restore from a full InteractionNet clone — preserves freeWires and port back-references
    setNet(cloneNet(prev));
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

  // ── Consume pendingTerm from Theory tab Try-it buttons ─────────────────────
  useEffect(() => {
    if (!pendingTerm) return;
    try {
      const term = parseLambda(pendingTerm);
      const { net: compiled } = compileLambda(term);
      setNet(compiled);
      setPositions(new Map());
      prevNetKeyRef.current = '';
      setHistory([]);
      setStepCount(0);
      setLastRule('—');
      setLastDesc(`Loaded from Theory: ${pendingTerm}`);
      setIsNormalForm(false);
      setAutoPlay(false);
      setParseError(null);
      setCustomInput(pendingTerm);
      setShowCustom(true);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
      setShowCustom(true);
    }
    setPendingTerm(null);
  }, [pendingTerm, setPendingTerm]);

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

  const [showControls, setShowControls] = useState(false);
  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden flex items-center justify-between px-3 py-2 border-b-2 border-[#1a1a2e] bg-[#faf7f2] shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[#1a1a2e]" style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18 }}>{String(stepCount).padStart(3, '0')} STEPS</span>
          {activePairs.length > 0 && !isNormalForm && <span className="text-[10px] bg-[#c62828] text-white px-2 py-0.5 font-bold animate-pulse">{activePairs.length} ACTIVE</span>}
          {isNormalForm && <span className="text-[10px] bg-[#2e7d32] text-white px-2 py-0.5 font-bold">NORMAL FORM</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={doStep} disabled={isNormalForm} className="text-[10px] px-2 py-1 bg-[#1a1a2e] text-white font-bold disabled:opacity-40">▶ STEP</button>
          <button onClick={doParallelStep} disabled={isNormalForm} className="text-[10px] px-2 py-1 bg-[#6a1b9a] text-white font-bold disabled:opacity-40" title="Apply all disjoint active pairs simultaneously">∥ PAR</button>
          <button onClick={() => setAutoPlay(a => !a)} disabled={isNormalForm} className={`text-[10px] px-2 py-1 font-bold disabled:opacity-40 ${autoPlay ? 'bg-[#c62828] text-white' : 'bg-white text-[#1a1a2e] border border-[#1a1a2e]'}`}>{autoPlay ? '⏸' : '⏩'}</button>
          <button onClick={doUndo} disabled={history.length === 0} className="text-[10px] px-2 py-1 bg-white text-[#1a1a2e] border border-[#1a1a2e] font-bold disabled:opacity-40">↩</button>
          <button onClick={doReset} className="text-[10px] px-2 py-1 bg-white text-[#1a1a2e] border border-[#1a1a2e] font-bold">↺</button>
          <button onClick={() => setShowControls(v => !v)} className="text-[10px] px-2 py-1 bg-[#f0ede8] text-[#1a1a2e] border border-[#1a1a2e] font-bold">{showControls ? '▲' : '▼ MORE'}</button>
        </div>
      </div>

      {/* ── Mobile expanded controls drawer ── */}
      {showControls && (
        <div className="md:hidden bg-[#faf7f2] border-b-2 border-[#1a1a2e] px-3 py-3 shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888] border-b border-[#e0ddd8] pb-1 mb-2">PRESET</div>
          <div className="grid grid-cols-1 gap-1 mb-2">
            {PRESETS.map((p, i) => (
              <button key={p.id} onClick={() => { loadPreset(i); setShowControls(false); }}
                className={`text-[10px] px-2 py-1.5 border text-left transition-colors ${presetIdx === i && !showCustom ? 'bg-[#1565c0] text-white border-[#1565c0]' : 'bg-white text-[#1a1a2e] border-[#1a1a2e]'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCustom(v => !v)}
            className={`w-full text-[10px] px-2 py-1.5 border-2 font-bold mb-1 transition-colors ${showCustom ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-[#1a1a2e] border-[#1a1a2e]'}`}>
            {showCustom ? '▲ CUSTOM TERM' : '▼ CUSTOM TERM'}
          </button>
          {showCustom && (
            <div className="mb-2">
              <textarea
                value={customInput}
                onChange={e => { setCustomInput(e.target.value); setParseError(null); }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { compileCustom(); setShowControls(false); } }}
                placeholder={"e.g.  (\\x. x x) y"}
                rows={2}
                className="w-full text-[10px] border-2 border-[#1a1a2e] p-2 bg-white text-[#1a1a2e] resize-none outline-none"
                style={{ fontFamily: 'IBM Plex Mono, monospace' }}
              />
              {parseError && <div className="text-[10px] text-[#c62828] mt-1">{parseError}</div>}
              <button onClick={() => { compileCustom(); setShowControls(false); }}
                className="w-full text-[10px] mt-1 px-2 py-1.5 bg-[#1565c0] text-white font-bold">⚙ COMPILE</button>
            </div>
          )}
          <div className="flex gap-1">
            <button onClick={exportPng} className="flex-1 text-[10px] px-2 py-1.5 bg-[#2e7d32] text-white font-bold">↓ PNG</button>
            <div className="flex-1">
              <input type="range" min={100} max={1500} step={100} value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full accent-[#1565c0]" />
              <div className="text-[10px] text-center text-[#555]">{speed}ms</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main area: sidebar + canvas (always rendered) ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left control rail (desktop only) ── */}
        <div className="hidden md:flex w-56 shrink-0 border-r-2 border-[#1a1a2e] bg-[#faf7f2] flex-col p-4 gap-4 overflow-y-auto">
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
          {/* Step controls */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1">CONTROLS</div>
            <button onClick={doStep} disabled={isNormalForm}
              className="w-full text-xs px-2 py-2 bg-[#1a1a2e] text-white font-bold disabled:opacity-40 hover:bg-[#333] transition-colors">
              ▶ STEP
            </button>
            <button onClick={doParallelStep} disabled={isNormalForm}
              className="w-full text-xs px-2 py-2 bg-[#6a1b9a] text-white font-bold disabled:opacity-40 hover:bg-[#7b1fa2] transition-colors"
              title="Apply all disjoint active pairs simultaneously (parallel reduction)">
              ∥ PARALLEL STEP
            </button>
            <button onClick={() => setAutoPlay(a => !a)} disabled={isNormalForm}
              className={`w-full text-xs px-2 py-2 font-bold disabled:opacity-40 transition-colors ${autoPlay ? 'bg-[#c62828] text-white' : 'bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] hover:bg-[#f0ede8]'}`}>
              {autoPlay ? '⏸ PAUSE' : '⏩ AUTO'}
            </button>
            <div className="flex gap-1">
              <button onClick={doUndo} disabled={history.length === 0}
                className="flex-1 text-xs px-2 py-2 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] font-bold disabled:opacity-40 hover:bg-[#f0ede8] transition-colors">
                ↩ UNDO
              </button>
              <button onClick={doReset}
                className="flex-1 text-xs px-2 py-2 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] font-bold hover:bg-[#f0ede8] transition-colors">
                ↺ RESET
              </button>
            </div>
            <button onClick={exportPng}
              className="w-full text-xs px-2 py-2 bg-[#2e7d32] text-white font-bold hover:bg-[#1b5e20] transition-colors">
              ↓ EXPORT PNG
            </button>
          </div>
          {/* Speed */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-2">SPEED</div>
            <input type="range" min={100} max={1500} step={100} value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="w-full accent-[#1565c0]" />
            <div className="text-xs text-center text-[#555] mt-1">{speed}ms / step</div>
          </div>
          {/* Legend */}
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

        {/* ── Center canvas (ALWAYS rendered, single ref) ── */}
        <div ref={canvasContainerRef} className="flex-1 relative bg-[#faf7f2] overflow-hidden select-none">
          {/* Desktop step counter */}
          <div className="hidden md:block absolute top-3 left-4 z-10 pointer-events-none" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            <span className="text-6xl text-[#1a1a2e] leading-none">{String(stepCount).padStart(3, '0')}</span>
            <span className="text-xs text-[#888] ml-2 font-mono uppercase tracking-wider">STEPS</span>
          </div>
          {/* Mobile node count */}
          <div className="md:hidden absolute top-2 left-3 z-10 pointer-events-none">
            <span className="text-xs text-[#888] uppercase tracking-wider">{serialized.nodes.length} nodes · {serialized.edges.length} edges</span>
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
            <div className="hidden md:block absolute top-3 right-4 z-10 bg-[#c62828] text-white text-xs px-3 py-1 font-bold uppercase tracking-widest animate-pulse">
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
          </svg>
        </div>

        {/* ── Right info panel (desktop only) ── */}
        <div className="hidden md:flex w-64 shrink-0 border-l-2 border-[#1a1a2e] bg-[#faf7f2] flex-col p-4 gap-4 overflow-y-auto">
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
          {/* Identity animation — always visible in the right panel */}
          <div className="border-t-2 border-[#1a1a2e] pt-3">
            <IdentityAnimation />
          </div>
        </div>

      </div>{/* end main area */}

      {/* ── Mobile last rule info ── */}
      {lastRule !== '—' && (
        <div className="md:hidden border-t-2 border-[#1a1a2e] bg-[#faf7f2] px-3 py-2 shrink-0">
          <span className="text-[10px] font-bold text-[#1565c0] uppercase tracking-wider">{lastRule}: </span>
          <span className="text-[10px] text-[#444]">{lastDesc}</span>
        </div>
      )}
    </div>
  );
}
