/**
 * ChemSim.tsx — Chemlambda-style Artificial Life Simulation
 * Design: Dark bioluminescent field on navy background
 * Nodes as glowing molecules, graph rewrites as chemical reactions
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  InteractionNet, NetNode, createNode, findActivePairs, applyOneStep, cloneNet,
  buildYCombinatorNet, buildSelfDupNet, buildIdentityNet,
} from '@/lib/interactionNet';

const GLOW_COLORS: Record<string, string> = {
  constructor: '#4fc3f7',
  duplicator: '#c6ff00',
  eraser: '#e040fb',
};

const DARK_COLORS: Record<string, string> = {
  constructor: '#0d47a1',
  duplicator: '#827717',
  eraser: '#6a1b9a',
};

interface SimNode {
  id: string;
  kind: string;
  label?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number; // for fade-in
  flash: number; // 0-1, for rewrite flash
}

interface SimEdge {
  fromId: string;
  toId: string;
  fromPort: number;
  toPort: number;
}

function netToSim(net: InteractionNet, w: number, h: number): { simNodes: SimNode[]; simEdges: SimEdge[] } {
  const simNodes: SimNode[] = [];
  const simEdges: SimEdge[] = [];
  const seen = new Set<string>();

  for (const node of Array.from(net.nodes.values())) {
    simNodes.push({
      id: node.id,
      kind: node.kind,
      label: node.label,
      x: node.x || w / 2 + (Math.random() - 0.5) * w * 0.6,
      y: node.y || h / 2 + (Math.random() - 0.5) * h * 0.6,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      age: 0,
      flash: 0,
    });

    for (let i = 0; i < node.ports.length; i++) {
      const conn = node.ports[i];
      if (!conn) continue;
      const key = [node.id + i, conn.nodeId + conn.portIndex].sort().join('|');
      if (!seen.has(key)) {
        seen.add(key);
        simEdges.push({ fromId: node.id, toId: conn.nodeId, fromPort: i, toPort: conn.portIndex });
      }
    }
  }

  return { simNodes, simEdges };
}

const PRESETS_SIM = [
  { id: 'ycomb', label: 'Y Combinator', build: buildYCombinatorNet },
  { id: 'selfdup', label: 'Self-Duplication', build: buildSelfDupNet },
  { id: 'identity', label: 'Identity', build: buildIdentityNet },
  { id: 'random', label: 'Random Net', build: () => buildRandomNet() },
];

function buildRandomNet(): InteractionNet {
  const net: InteractionNet = { nodes: new Map(), freeWires: [] };
  const kinds: Array<'constructor' | 'duplicator' | 'eraser'> = ['constructor', 'duplicator', 'eraser'];
  const nodes: NetNode[] = [];
  for (let i = 0; i < 8; i++) {
    const kind = kinds[Math.floor(Math.random() * 3)];
    const n = createNode(kind, 200 + Math.random() * 400, 150 + Math.random() * 300);
    net.nodes.set(n.id, n);
    nodes.push(n);
  }
  // Randomly connect principal ports of first 4 nodes
  for (let i = 0; i < Math.min(4, nodes.length - 1); i += 2) {
    const a = nodes[i];
    const b = nodes[i + 1];
    a.ports[0] = { nodeId: b.id, portIndex: 0 };
    b.ports[0] = { nodeId: a.id, portIndex: 0 };
  }
  return net;
}

export default function ChemSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ nodes: SimNode[]; edges: SimEdge[]; net: InteractionNet } | null>(null);
  const animRef = useRef<number>(0);
  const [running, setRunning] = useState(false);
  const [rewriteCount, setRewriteCount] = useState(0);
  const [nodeCount, setNodeCount] = useState(0);
  const [presetIdx, setPresetIdx] = useState(0);
  const [rewriteRate, setRewriteRate] = useState(800);
  const lastRewriteRef = useRef(0);
  const rewriteCountRef = useRef(0);

  const initSim = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const net = PRESETS_SIM[idx].build();
    const { simNodes, simEdges } = netToSim(net, canvas.width, canvas.height);
    stateRef.current = { nodes: simNodes, edges: simEdges, net };
    rewriteCountRef.current = 0;
    setRewriteCount(0);
    setNodeCount(simNodes.length);
  }, []);

  useEffect(() => {
    initSim(presetIdx);
  }, [presetIdx, initSim]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (timestamp: number) => {
      const state = stateRef.current;
      if (!state) { animRef.current = requestAnimationFrame(draw); return; }
      const { nodes, edges } = state;
      const W = canvas.width;
      const H = canvas.height;

      // Background
      ctx.fillStyle = '#050d1a';
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      const posMap = new Map(nodes.map(n => [n.id, n]));

      // Physics
      const REPULSION = 3000;
      const ATTRACTION = 0.02;
      const DAMPING = 0.92;
      const IDEAL = 100;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const f = REPULSION / (dist * dist);
          a.vx += (dx / dist) * f; a.vy += (dy / dist) * f;
          b.vx -= (dx / dist) * f; b.vy -= (dy / dist) * f;
        }
      }

      for (const edge of edges) {
        const a = posMap.get(edge.fromId), b = posMap.get(edge.toId);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const f = (dist - IDEAL) * ATTRACTION;
        a.vx += (dx / dist) * f; a.vy += (dy / dist) * f;
        b.vx -= (dx / dist) * f; b.vy -= (dy / dist) * f;
      }

      // Center gravity
      for (const n of nodes) {
        n.vx += (W / 2 - n.x) * 0.003;
        n.vy += (H / 2 - n.y) * 0.003;
        n.vx *= DAMPING; n.vy *= DAMPING;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(30, Math.min(W - 30, n.x));
        n.y = Math.max(30, Math.min(H - 30, n.y));
        n.age = Math.min(1, n.age + 0.05);
        n.flash = Math.max(0, n.flash - 0.05);
      }

      // Draw edges
      for (const edge of edges) {
        const a = posMap.get(edge.fromId), b = posMap.get(edge.toId);
        if (!a || !b) continue;
        const isPrincipal = edge.fromPort === 0 && edge.toPort === 0;
        const alpha = Math.min(a.age, b.age) * (isPrincipal ? 0.9 : 0.4);
        const color = isPrincipal ? '#ff4444' : '#4fc3f7';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 5;
        const my = (a.y + b.y) / 2 - 15;
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.strokeStyle = `rgba(${hexToRgb(color)},${alpha})`;
        ctx.lineWidth = isPrincipal ? 2 : 1;
        ctx.stroke();
      }

      // Draw nodes
      for (const n of nodes) {
        const color = GLOW_COLORS[n.kind] || '#ffffff';
        const darkColor = DARK_COLORS[n.kind] || '#111';
        const alpha = n.age;
        const r = 14 + n.flash * 8;

        // Outer glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3);
        grad.addColorStop(0, `rgba(${hexToRgb(color)},${0.3 * alpha})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node body
        ctx.beginPath();
        if (n.kind === 'constructor') {
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        } else if (n.kind === 'duplicator') {
          ctx.moveTo(n.x, n.y - r);
          ctx.lineTo(n.x + r, n.y);
          ctx.lineTo(n.x, n.y + r);
          ctx.lineTo(n.x - r, n.y);
          ctx.closePath();
        } else {
          ctx.arc(n.x, n.y, r * 0.7, 0, Math.PI * 2);
        }
        ctx.fillStyle = `rgba(${hexToRgb(darkColor)},${alpha})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${hexToRgb(color)},${alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = `rgba(${hexToRgb(color)},${alpha})`;
        ctx.font = `bold 10px 'IBM Plex Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.label || n.kind[0].toUpperCase(), n.x, n.y);
      }

      // Auto-rewrite
      if (running && timestamp - lastRewriteRef.current > rewriteRate) {
        lastRewriteRef.current = timestamp;
        const activePairs = findActivePairs(state.net);
        if (activePairs.length > 0) {
          // Flash active pair nodes
          const [a, b] = activePairs[0];
          const simA = nodes.find(n => n.id === a.id);
          const simB = nodes.find(n => n.id === b.id);
          if (simA) simA.flash = 1;
          if (simB) simB.flash = 1;

          const newNet = cloneNet(state.net);
          applyOneStep(newNet);
          const { simNodes: newNodes, simEdges: newEdges } = netToSim(newNet, W, H);

          // Preserve positions for existing nodes
          const oldPosMap = new Map(nodes.map(n => [n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }]));
          for (const nn of newNodes) {
            const old = oldPosMap.get(nn.id);
            if (old) { nn.x = old.x; nn.y = old.y; nn.vx = old.vx; nn.vy = old.vy; nn.age = 1; }
          }

          stateRef.current = { nodes: newNodes, edges: newEdges, net: newNet };
          rewriteCountRef.current += 1;
          setRewriteCount(rewriteCountRef.current);
          setNodeCount(newNodes.length);
        } else {
          setRunning(false);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [running, rewriteRate]);

  return (
    <div className="flex flex-col h-full bg-[#050d1a]">
      {/* Top bar — two rows on mobile, one row on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 sm:px-4 py-2 border-b border-[#1a2a4a] bg-[#080f1e]">
        {/* Row 1: title + run/reset/speed */}
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="text-[#4fc3f7] text-xl sm:text-2xl tracking-widest shrink-0">CHEM SIM</div>
          <div className="ml-auto sm:ml-0 flex items-center gap-2">
            <button onClick={() => setRunning(r => !r)}
              className={`text-xs px-3 py-1 border font-bold transition-colors ${running ? 'border-[#c6ff00] text-[#c6ff00] bg-[#1a2a00]' : 'border-[#4fc3f7] text-[#4fc3f7] bg-[#0d1f3a] hover:bg-[#0d2a3a]'}`}
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              {running ? '⏸ PAUSE' : '▶ RUN'}
            </button>
            <button onClick={() => { initSim(presetIdx); setRunning(false); }}
              className="text-xs px-2 py-1 border border-[#e040fb] text-[#e040fb] hover:bg-[#1a0a2a] transition-colors"
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              ↺
            </button>
            <input type="range" min={100} max={2000} step={100} value={rewriteRate}
              onChange={e => setRewriteRate(Number(e.target.value))}
              className="w-16 sm:w-20 accent-[#4fc3f7]" />
          </div>
        </div>
        {/* Row 2: presets */}
        <div className="flex gap-1 sm:gap-2 sm:ml-4 overflow-x-auto pb-0.5">
          {PRESETS_SIM.map((p, i) => (
            <button key={p.id} onClick={() => { setPresetIdx(i); setRunning(false); }}
              className={`shrink-0 text-[10px] sm:text-xs px-2 sm:px-3 py-1 border transition-colors ${presetIdx === i ? 'border-[#4fc3f7] text-[#4fc3f7] bg-[#0d1f3a]' : 'border-[#1a2a4a] text-[#4a7a9b] hover:border-[#4fc3f7] hover:text-[#4fc3f7]'}`}
              style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Overlay stats */}
        <div className="absolute bottom-4 left-4 flex gap-6" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          <div>
            <div className="text-[#4a7a9b] text-xs uppercase tracking-widest">REWRITES</div>
            <div className="text-[#4fc3f7] text-3xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{rewriteCount}</div>
          </div>
          <div>
            <div className="text-[#4a7a9b] text-xs uppercase tracking-widest">NODES</div>
            <div className="text-[#c6ff00] text-3xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{nodeCount}</div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#4fc3f7', boxShadow: '0 0 6px #4fc3f7' }} />
            <span className="text-xs text-[#4fc3f7]">γ Constructor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rotate-45" style={{ background: '#c6ff00', boxShadow: '0 0 6px #c6ff00' }} />
            <span className="text-xs text-[#c6ff00]">δ Duplicator</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: '#e040fb', boxShadow: '0 0 6px #e040fb' }} />
            <span className="text-xs text-[#e040fb]">ε Eraser</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5" style={{ background: '#ff4444' }} />
            <span className="text-xs text-[#ff4444]">Active pair</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
