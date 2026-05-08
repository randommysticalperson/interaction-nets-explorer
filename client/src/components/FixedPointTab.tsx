/**
 * FixedPointTab.tsx — Fixed-Point Iteration Explorer
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0), golden yellow (#f9a825), vermillion red (#c62828), charcoal (#1a1a2e), off-white (#faf7f2)
 *
 * Visualises x_{n+1} = f(x_n) as an animated cobweb diagram:
 *   1. Plot y = f(x) and y = x on the same axes
 *   2. From x_0, draw a vertical line to f(x_0) = x_1
 *   3. Draw a horizontal line to y = x, giving the point (x_1, x_1)
 *   4. Repeat — the cobweb converges to (or diverges from) the fixed point
 *
 * Presets: identity f(x)=x, cos(x), x/2, sqrt(x), logistic r·x·(1-x)
 * Interactive: user can type any f(x) expression and set x_0, speed, iterations
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Safe expression evaluator ────────────────────────────────────────────────
function makeF(expr: string): ((x: number) => number) | null {
  try {
    // Replace common math notation
    const safe = expr
      .replace(/\^/g, '**')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bexp\b/g, 'Math.exp')
      .replace(/\blog\b/g, 'Math.log')
      .replace(/\bln\b/g, 'Math.log')
      .replace(/\bpi\b/g, 'Math.PI')
      .replace(/\be\b/g, 'Math.E');
    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `"use strict"; return (${safe});`) as (x: number) => number;
    // Test it
    const v = fn(1);
    if (typeof v !== 'number' || !isFinite(v)) return null;
    return fn;
  } catch {
    return null;
  }
}

// ─── Preset definitions ───────────────────────────────────────────────────────
interface Preset {
  id: string;
  label: string;
  expr: string;
  x0: number;
  xMin: number;
  xMax: number;
  description: string;
  fixedPoint: string;
  color: string;
}

const PRESETS: Preset[] = [
  {
    id: 'identity',
    label: 'f(x) = x',
    expr: 'x',
    x0: 0.3,
    xMin: -0.5,
    xMax: 1.5,
    description: 'Every point is a fixed point. The cobweb stays at x₀ forever — no convergence, no divergence.',
    fixedPoint: 'Every x',
    color: '#1565c0',
  },
  {
    id: 'cos',
    label: 'f(x) = cos(x)',
    expr: 'cos(x)',
    x0: 0.5,
    xMin: -0.5,
    xMax: 2,
    description: 'Converges to the Dottie number ≈ 0.7391 — the unique fixed point of cosine. The cobweb spirals inward.',
    fixedPoint: '≈ 0.7391 (Dottie number)',
    color: '#c62828',
  },
  {
    id: 'half',
    label: 'f(x) = x / 2',
    expr: 'x / 2',
    x0: 1.0,
    xMin: -0.2,
    xMax: 1.2,
    description: 'Converges to 0. Each step halves the distance to the fixed point — geometric convergence.',
    fixedPoint: '0',
    color: '#2e7d32',
  },
  {
    id: 'sqrt',
    label: 'f(x) = √x',
    expr: 'sqrt(x)',
    x0: 0.1,
    xMin: -0.1,
    xMax: 1.5,
    description: 'Converges to 1. The cobweb staircase climbs toward the intersection of y=√x and y=x.',
    fixedPoint: '1',
    color: '#f9a825',
  },
  {
    id: 'logistic',
    label: 'f(x) = 3.5x(1−x)',
    expr: '3.5 * x * (1 - x)',
    x0: 0.4,
    xMin: -0.05,
    xMax: 1.05,
    description: 'Logistic map at r=3.5 — period-4 cycle. The cobweb bounces between 4 values, never settling.',
    fixedPoint: 'Period-4 cycle',
    color: '#6a1b9a',
  },
  {
    id: 'chaos',
    label: 'f(x) = 3.9x(1−x)',
    expr: '3.9 * x * (1 - x)',
    x0: 0.4,
    xMin: -0.05,
    xMax: 1.05,
    description: 'Logistic map at r=3.9 — chaotic regime. The cobweb fills the space unpredictably.',
    fixedPoint: 'Chaotic (no stable fixed point)',
    color: '#c62828',
  },
];

// ─── Canvas dimensions ────────────────────────────────────────────────────────
const PAD = 48;

interface CobwebState {
  points: number[];   // [x0, x1, x2, ...] — the iteration sequence
  step: number;       // how many steps have been drawn
}

// ─── Map math coords to canvas pixels ─────────────────────────────────────────
function toCanvas(
  val: number, min: number, max: number, canvasSize: number, pad: number, invert = false
): number {
  const t = (val - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, t));
  if (invert) return pad + (1 - clamped) * (canvasSize - 2 * pad);
  return pad + clamped * (canvasSize - 2 * pad);
}

export default function FixedPointTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [presetId, setPresetId] = useState<string>('cos');
  const [customExpr, setCustomExpr] = useState('');
  const [customX0, setCustomX0] = useState('0.5');
  const [customXMin, setCustomXMin] = useState('-1');
  const [customXMax, setCustomXMax] = useState('2');
  const [isCustom, setIsCustom] = useState(false);
  const [exprError, setExprError] = useState('');

  const [speed, setSpeed] = useState(400); // ms per step
  const [maxSteps, setMaxSteps] = useState(40);
  const [running, setRunning] = useState(false);
  const [cobweb, setCobweb] = useState<CobwebState>({ points: [], step: 0 });
  const [canvasSize, setCanvasSize] = useState(400);

  // Active config
  const activePreset = useMemo(() => PRESETS.find(p => p.id === presetId) ?? PRESETS[0], [presetId]);

  const activeConfig = useMemo(() => {
    if (!isCustom) return activePreset;
    return {
      ...activePreset,
      id: 'custom',
      label: `f(x) = ${customExpr || '?'}`,
      expr: customExpr,
      x0: parseFloat(customX0) || 0.5,
      xMin: parseFloat(customXMin) || -1,
      xMax: parseFloat(customXMax) || 2,
      fixedPoint: '?',
      color: '#1565c0',
    };
  }, [isCustom, activePreset, customExpr, customX0, customXMin, customXMax]);

  const f = useMemo(() => makeF(activeConfig.expr), [activeConfig.expr]);

  // Compute full iteration sequence
  const sequence = useMemo(() => {
    if (!f) return [];
    const pts: number[] = [activeConfig.x0];
    let x = activeConfig.x0;
    for (let i = 0; i < maxSteps; i++) {
      try {
        const nx = f(x);
        if (!isFinite(nx) || isNaN(nx)) break;
        pts.push(nx);
        x = nx;
      } catch { break; }
    }
    return pts;
  }, [f, activeConfig.x0, maxSteps]);

  // ─── Canvas drawing ──────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !f) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvasSize, H = canvasSize;
    const { xMin, xMax, color } = activeConfig;
    const yMin = xMin, yMax = xMax; // square axes

    const cx = (v: number) => toCanvas(v, xMin, xMax, W, PAD);
    const cy = (v: number) => toCanvas(v, yMin, yMax, H, PAD, true);

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#faf7f2';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = '#e0ddd8';
    ctx.lineWidth = 1;
    const gridStep = (xMax - xMin) / 6;
    for (let v = Math.ceil(xMin / gridStep) * gridStep; v <= xMax + 1e-9; v += gridStep) {
      const px = cx(v), py = cy(v);
      ctx.beginPath(); ctx.moveTo(px, PAD); ctx.lineTo(px, H - PAD); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, py); ctx.lineTo(W - PAD, py); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    // x-axis
    const yZero = cy(0);
    if (yZero >= PAD && yZero <= H - PAD) {
      ctx.beginPath(); ctx.moveTo(PAD, yZero); ctx.lineTo(W - PAD, yZero); ctx.stroke();
    }
    // y-axis
    const xZero = cx(0);
    if (xZero >= PAD && xZero <= W - PAD) {
      ctx.beginPath(); ctx.moveTo(xZero, PAD); ctx.lineTo(xZero, H - PAD); ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = '#888';
    ctx.font = '10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    for (let v = Math.ceil(xMin / gridStep) * gridStep; v <= xMax + 1e-9; v += gridStep) {
      const px = cx(v);
      if (Math.abs(v) > 0.001) {
        ctx.fillText(v.toFixed(1), px, H - PAD + 14);
      }
    }
    ctx.textAlign = 'right';
    for (let v = Math.ceil(yMin / gridStep) * gridStep; v <= yMax + 1e-9; v += gridStep) {
      const py = cy(v);
      if (Math.abs(v) > 0.001) {
        ctx.fillText(v.toFixed(1), PAD - 6, py + 3);
      }
    }

    // y = x diagonal (identity line)
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(cx(xMin), cy(xMin));
    ctx.lineTo(cx(xMax), cy(xMax));
    ctx.stroke();
    ctx.setLineDash([]);

    // y = f(x) curve
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    const STEPS = 400;
    for (let i = 0; i <= STEPS; i++) {
      const x = xMin + (xMax - xMin) * (i / STEPS);
      try {
        const y = f(x);
        if (!isFinite(y) || isNaN(y)) { started = false; continue; }
        const px = cx(x), py = cy(y);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      } catch { started = false; }
    }
    ctx.stroke();

    // Cobweb lines
    const drawn = cobweb.step;
    if (drawn > 0 && sequence.length > 1) {
      ctx.strokeStyle = '#c62828';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      // Start at (x0, x0) on the diagonal
      let x = sequence[0];
      ctx.moveTo(cx(x), cy(x));

      for (let i = 0; i < Math.min(drawn, sequence.length - 1); i++) {
        const xn = sequence[i];
        const xn1 = sequence[i + 1];
        // Vertical: (xn, xn) → (xn, f(xn)) = (xn, xn1)
        ctx.lineTo(cx(xn), cy(xn1));
        // Horizontal: (xn, xn1) → (xn1, xn1)
        ctx.lineTo(cx(xn1), cy(xn1));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Draw dots for each iteration point
      for (let i = 0; i <= Math.min(drawn, sequence.length - 1); i++) {
        const xn = sequence[i];
        const alpha = Math.max(0.2, 1 - i * 0.04);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = i === 0 ? '#f9a825' : '#c62828';
        ctx.beginPath();
        ctx.arc(cx(xn), cy(xn), i === 0 ? 6 : 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Labels
    ctx.font = 'bold 11px IBM Plex Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(`y = f(x)`, W - PAD - 70, PAD + 16);
    ctx.fillStyle = '#1a1a2e';
    ctx.setLineDash([4, 3]);
    ctx.fillText('y = x', PAD + 8, PAD + 14);
    ctx.setLineDash([]);

    // Border
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(PAD, PAD, W - 2 * PAD, H - 2 * PAD);

  }, [f, activeConfig, cobweb, sequence, canvasSize]);

  // Redraw whenever state changes
  useEffect(() => { draw(); }, [draw]);

  // Responsive canvas size
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCanvasSize(w < 640 ? Math.min(w - 32, 340) : Math.min(w * 0.45, 520));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ─── Animation loop ──────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (animRef.current) clearTimeout(animRef.current);
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    setCobweb({ points: [], step: 0 });
  }, [stop]);

  const start = useCallback(() => {
    reset();
    setRunning(true);
    let step = 0;
    const tick = () => {
      step++;
      setCobweb(prev => ({ ...prev, step }));
      if (step < Math.min(maxSteps, sequence.length - 1)) {
        animRef.current = setTimeout(tick, speed);
      } else {
        setRunning(false);
      }
    };
    animRef.current = setTimeout(tick, speed * 0.5);
  }, [reset, maxSteps, sequence.length, speed]);

  // Auto-start when preset changes
  useEffect(() => {
    reset();
    // Small delay so sequence is computed first
    const t = setTimeout(() => start(), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId, isCustom, activeConfig.expr, activeConfig.x0]);

  // Cleanup
  useEffect(() => () => { if (animRef.current) clearTimeout(animRef.current); }, []);

  // ─── Convergence info ────────────────────────────────────────────────────
  const lastX = sequence[sequence.length - 1];
  const prevX = sequence[sequence.length - 2];
  const converged = sequence.length > 5 && Math.abs(lastX - (prevX ?? 0)) < 1e-6;
  const diverged = sequence.length > 2 && !isFinite(lastX);

  // ─── Custom expression validation ────────────────────────────────────────
  const handleCustomExpr = (v: string) => {
    setCustomExpr(v);
    if (!v) { setExprError(''); return; }
    const fn = makeF(v);
    setExprError(fn ? '' : 'Invalid expression');
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-[#faf7f2] overflow-y-auto md:overflow-hidden"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── Left panel ── */}
      <div className="w-full md:w-72 md:shrink-0 md:border-r-2 border-b-2 md:border-b-0 border-[#1a1a2e] flex flex-col p-4 gap-4 md:overflow-y-auto">

        {/* Title */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-2">
            FIXED-POINT ITERATION
          </div>
          <div className="text-[10px] text-[#888] leading-relaxed">
            x<sub>n+1</sub> = f(x<sub>n</sub>) — iterate f starting from x₀.
            The cobweb diagram shows convergence to a fixed point where f(x*) = x*.
          </div>
        </div>

        {/* Presets */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a2e] border-b border-[#1a1a2e] pb-1 mb-2">PRESETS</div>
          <div className="flex flex-col gap-1">
            {PRESETS.map(p => (
              <button key={p.id}
                onClick={() => { setPresetId(p.id); setIsCustom(false); }}
                className={`text-left text-[10px] px-2 py-1.5 border transition-colors ${!isCustom && presetId === p.id ? 'text-white border-transparent' : 'bg-white text-[#1a1a2e] border-[#1a1a2e] hover:bg-[#e8f0fe]'}`}
                style={{ background: !isCustom && presetId === p.id ? p.color : undefined }}>
                <span className="font-bold">{p.label}</span>
                <span className="ml-2 opacity-70">x₀={p.x0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a2e] border-b border-[#1a1a2e] pb-1 mb-2">CUSTOM</div>
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-0.5">f(x) =</label>
              <input
                value={customExpr}
                onChange={e => handleCustomExpr(e.target.value)}
                placeholder="e.g. cos(x)"
                className={`w-full text-xs px-2 py-1.5 border-2 bg-white outline-none ${exprError ? 'border-[#c62828]' : 'border-[#1a1a2e]'} focus:border-[#1565c0]`}
              />
              {exprError && <div className="text-[9px] text-[#c62828] mt-0.5">{exprError}</div>}
            </div>
            <div className="grid grid-cols-3 gap-1">
              <div>
                <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-0.5">x₀</label>
                <input value={customX0} onChange={e => setCustomX0(e.target.value)}
                  className="w-full text-xs px-1.5 py-1 border-2 border-[#1a1a2e] bg-white outline-none focus:border-[#1565c0]" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-0.5">x min</label>
                <input value={customXMin} onChange={e => setCustomXMin(e.target.value)}
                  className="w-full text-xs px-1.5 py-1 border-2 border-[#1a1a2e] bg-white outline-none focus:border-[#1565c0]" />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-0.5">x max</label>
                <input value={customXMax} onChange={e => setCustomXMax(e.target.value)}
                  className="w-full text-xs px-1.5 py-1 border-2 border-[#1a1a2e] bg-white outline-none focus:border-[#1565c0]" />
              </div>
            </div>
            <button
              onClick={() => { if (!exprError && customExpr) setIsCustom(true); }}
              disabled={!!exprError || !customExpr}
              className="text-xs px-3 py-2 bg-[#1a1a2e] text-white border-2 border-[#1a1a2e] hover:bg-[#1565c0] disabled:opacity-40 transition-colors font-bold uppercase tracking-widest">
              APPLY CUSTOM
            </button>
          </div>
        </div>

        {/* Controls */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a2e] border-b border-[#1a1a2e] pb-1 mb-2">CONTROLS</div>
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-0.5">
                Speed: {speed}ms/step
              </label>
              <input type="range" min={50} max={1200} step={50} value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                className="w-full accent-[#1565c0]" />
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-wider text-[#888] block mb-0.5">
                Max steps: {maxSteps}
              </label>
              <input type="range" min={5} max={80} step={5} value={maxSteps}
                onChange={e => setMaxSteps(Number(e.target.value))}
                className="w-full accent-[#1565c0]" />
            </div>
            <div className="flex gap-2">
              <button onClick={start} disabled={running || !f}
                className="flex-1 text-xs px-2 py-2 bg-[#1565c0] text-white border-2 border-[#1565c0] hover:bg-[#0d47a1] disabled:opacity-40 transition-colors font-bold uppercase tracking-widest">
                ▶ PLAY
              </button>
              <button onClick={stop} disabled={!running}
                className="flex-1 text-xs px-2 py-2 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] hover:bg-[#f0ede8] disabled:opacity-40 transition-colors font-bold uppercase tracking-widest">
                ■ STOP
              </button>
              <button onClick={reset}
                className="flex-1 text-xs px-2 py-2 bg-white text-[#1a1a2e] border-2 border-[#1a1a2e] hover:bg-[#f0ede8] transition-colors font-bold uppercase tracking-widest">
                ↺ RESET
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a2e] border-b border-[#1a1a2e] pb-1 mb-2">INFO</div>
          <div className="text-[10px] text-[#444] leading-relaxed">
            {activeConfig.description}
          </div>
          <div className="mt-2 text-[10px]">
            <span className="text-[#888]">Fixed point: </span>
            <span className="font-bold text-[#1565c0]">{activeConfig.fixedPoint}</span>
          </div>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col md:overflow-hidden">

        {/* Canvas area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 md:overflow-auto">
          <div className="w-full max-w-2xl">
            <div className="flex items-center justify-between border-b-2 border-[#1a1a2e] pb-1 mb-3">
              <div className="text-xs font-bold uppercase tracking-widest text-[#1a1a2e]">
                COBWEB DIAGRAM — {activeConfig.label}
              </div>
              <div className="text-[10px] text-[#888]">
                step {cobweb.step} / {Math.min(maxSteps, sequence.length - 1)}
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              className="border-2 border-[#1a1a2e] block mx-auto"
              style={{ maxWidth: '100%', height: 'auto' }}
            />

            {/* Status bar */}
            <div className="flex items-center gap-4 mt-2 text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#f9a825]" />
                <span>x₀ = {activeConfig.x0}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#c62828]" />
                <span>cobweb</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-[#1a1a2e] opacity-50" style={{ borderTop: '1px dashed' }} />
                <span>y = x</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: activeConfig.color }}>
                <div className="w-3 h-0.5" style={{ background: activeConfig.color }} />
                <span>y = f(x)</span>
              </div>
            </div>
          </div>

          {/* Convergence status */}
          {cobweb.step > 0 && (
            <div className="w-full max-w-2xl">
              <div className={`text-xs px-3 py-2 border-2 font-bold ${converged ? 'border-[#2e7d32] text-[#2e7d32] bg-[#e8f5e9]' : diverged ? 'border-[#c62828] text-[#c62828] bg-[#ffebee]' : 'border-[#f9a825] text-[#f9a825] bg-[#fffde7]'}`}>
                {converged
                  ? `✓ CONVERGED — fixed point x* ≈ ${lastX.toFixed(6)}`
                  : diverged
                    ? '✗ DIVERGED — sequence left the domain'
                    : `⟳ ITERATING — x${cobweb.step} ≈ ${isFinite(lastX) ? lastX.toFixed(6) : '∞'}`}
              </div>
            </div>
          )}

          {/* Sequence table */}
          {sequence.length > 1 && cobweb.step > 0 && (
            <div className="w-full max-w-2xl">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a2e] border-b-2 border-[#1a1a2e] pb-1 mb-2">
                ITERATION SEQUENCE
              </div>
              <div className="overflow-x-auto">
                <table className="text-[10px] w-full" style={{ fontFamily: 'IBM Plex Mono' }}>
                  <thead>
                    <tr className="border-b border-[#1a1a2e]">
                      <th className="text-left py-1 pr-4 text-[#888] font-bold">n</th>
                      <th className="text-right py-1 pr-4 text-[#1565c0] font-bold">xₙ</th>
                      <th className="text-right py-1 text-[#c62828] font-bold">|xₙ − xₙ₋₁|</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sequence.slice(0, cobweb.step + 1).map((x, i) => (
                      <tr key={i} className="border-b border-[#e0ddd8]"
                        style={{ opacity: Math.max(0.3, 1 - (cobweb.step - i) * 0.05) }}>
                        <td className="py-0.5 pr-4 text-[#888]">{i}</td>
                        <td className="text-right py-0.5 pr-4 text-[#1565c0] font-bold">
                          {isFinite(x) ? x.toFixed(8) : '∞'}
                        </td>
                        <td className="text-right py-0.5 text-[#c62828]">
                          {i === 0 ? '—' : isFinite(x) && isFinite(sequence[i - 1])
                            ? Math.abs(x - sequence[i - 1]).toExponential(3)
                            : '∞'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
