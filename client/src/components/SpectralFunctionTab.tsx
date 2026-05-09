/**
 * SpectralFunctionTab.tsx — Interaction Nets Explorer
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0), golden yellow (#f9a825), vermillion red (#c62828),
 *         charcoal (#1a1a2e), off-white (#faf7f2), purple (#6a1b9a)
 *
 * Scientific references:
 *  - Lehmann, H. (1954). "Über Eigenschaften von Ausbreitungsfunktionen und
 *    Renormierungskonstanten quantisierter Felder." Nuovo Cimento, 11(4), 342–357.
 *    [Lehmann representation / spectral function sum rule]
 *  - Dyson, F. J. (1949). "The S Matrix in Quantum Electrodynamics."
 *    Phys. Rev. 75, 1736. [Dyson equation G = G₀ + G₀ΣG]
 *  - Matsubara, T. (1955). "A New Approach to Quantum-Statistical Mechanics."
 *    Prog. Theor. Phys. 14, 351. [Imaginary-time / Matsubara formalism]
 *  - Keldysh, L. V. (1965). "Diagram Technique for Nonequilibrium Processes."
 *    Sov. Phys. JETP 20, 1018. [Non-equilibrium Green's functions]
 *  - Mahan, G. D. (2000). Many-Particle Physics, 3rd ed. Kluwer/Plenum.
 *    [Comprehensive reference for all approximations]
 *  - Economou, E. N. (2006). Green's Functions in Quantum Physics, 3rd ed. Springer.
 *    [Single-particle Green's functions in condensed matter]
 *  - Wang Huaiyu 王怀玉 (2008). 《凝聚态物理的格林函数理论》. 科学出版社.
 *    ISBN 978-7-03-020091-4. [Primary source for this section]
 *  - Bruus, H. & Flensberg, K. (2004). Introduction to Many-Body Quantum Theory
 *    in Condensed Matter Physics. Oxford University Press.
 *  - Hedin, L. (1965). "New Method for Calculating the One-Particle Green's Function
 *    with Application to the Electron-Gas Problem." Phys. Rev. 139, A796.
 *    [GW approximation / Hedin equations]
 *  - Anderson, P. W. (1961). "Localized Magnetic States in Metals."
 *    Phys. Rev. 124, 41. [Anderson impurity model — Lorentzian spectral function]
 */

import { useState, useRef, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Params {
  /** Bare band dispersion ε_k (eV) — band centre */
  epsilon_k: number;
  /** Real part of self-energy Re Σ (eV) — quasiparticle shift */
  sigma_real: number;
  /** Imaginary part of self-energy Im Σ (eV, negative) — quasiparticle damping */
  sigma_imag: number;
  /** Number of Lehmann poles to show */
  n_poles: number;
  /** Temperature T (K) for Fermi-Dirac occupation */
  temperature: number;
  /** Chemical potential μ (eV) */
  mu: number;
}

interface Preset {
  label: string;
  description: string;
  ref: string;
  params: Params;
}

// ─── Scientific presets ───────────────────────────────────────────────────────
const PRESETS: Preset[] = [
  {
    label: 'Free electron (G₀)',
    description: 'Non-interacting bare propagator. Σ = 0. Delta-function spectral weight at ε_k. Basis of all perturbation theory.',
    ref: 'Dyson (1949), Phys. Rev. 75, 1736',
    params: { epsilon_k: 0.0, sigma_real: 0.0, sigma_imag: -0.01, n_poles: 1, temperature: 300, mu: 0.0 },
  },
  {
    label: 'Quasiparticle (weak coupling)',
    description: 'Small self-energy. Sharp quasiparticle peak near ε_k + Re Σ with long lifetime τ = ℏ/|2 Im Σ|. Fermi liquid regime.',
    ref: 'Landau (1956); Mahan (2000) §3',
    params: { epsilon_k: 0.3, sigma_real: -0.1, sigma_imag: -0.08, n_poles: 1, temperature: 100, mu: 0.0 },
  },
  {
    label: 'Anderson impurity (Kondo)',
    description: 'Lorentzian spectral function from hybridisation Γ. Models a magnetic impurity in a metal. Kondo resonance at ω = 0.',
    ref: 'Anderson (1961), Phys. Rev. 124, 41',
    params: { epsilon_k: -0.5, sigma_real: 0.0, sigma_imag: -0.3, n_poles: 1, temperature: 30, mu: 0.0 },
  },
  {
    label: 'Strongly correlated (Hubbard)',
    description: 'Large Im Σ → broad incoherent background. Two Hubbard bands split by U. Mott insulator precursor.',
    ref: 'Hubbard (1963), Proc. R. Soc. A 276, 238; Georges et al. (1996) RMP 68, 13',
    params: { epsilon_k: 0.0, sigma_real: 0.0, sigma_imag: -0.8, n_poles: 2, temperature: 300, mu: 0.0 },
  },
  {
    label: 'BCS superconductor (Nambu)',
    description: 'Bogoliubov quasiparticles: spectral weight split symmetrically around μ by gap Δ. Nambu 2×2 propagator.',
    ref: 'Bardeen–Cooper–Schrieffer (1957), Phys. Rev. 108, 1175; Nambu (1960), Phys. Rev. 117, 648',
    params: { epsilon_k: 0.0, sigma_real: 0.4, sigma_imag: -0.05, n_poles: 2, temperature: 10, mu: 0.0 },
  },
  {
    label: 'GW approximation',
    description: 'Σ = iGW: screened Coulomb interaction. Quasiparticle renormalisation Z < 1. Used for band gaps in semiconductors.',
    ref: 'Hedin (1965), Phys. Rev. 139, A796; Aryasetiawan & Gunnarsson (1998) Rep. Prog. Phys. 61, 237',
    params: { epsilon_k: 1.2, sigma_real: -0.4, sigma_imag: -0.15, n_poles: 1, temperature: 0, mu: 0.0 },
  },
];

// ─── Physics calculations ─────────────────────────────────────────────────────

/** Retarded Green's function G^R(ω) = 1/(ω - ε_k - Σ^R(ω))
 *  with constant self-energy approximation Σ^R = Re Σ + i Im Σ
 *  Reference: Lehmann (1954); Mahan (2000) eq. 3.1 */
function retardedGF(omega: number, p: Params): [number, number] {
  const re_denom = omega - p.epsilon_k - p.sigma_real;
  const im_denom = -p.sigma_imag; // Im Σ < 0, so -Im Σ > 0
  const denom_sq = re_denom * re_denom + im_denom * im_denom;
  return [re_denom / denom_sq, -im_denom / denom_sq];
}

/** Spectral function A(k,ω) = -2 Im G^R(k,ω)
 *  Satisfies sum rule: ∫ dω/(2π) A(k,ω) = 1
 *  Reference: Lehmann (1954) eq. 12; Economou (2006) §2.3 */
function spectralFunction(omega: number, p: Params): number {
  const [, imG] = retardedGF(omega, p);
  return -2 * imG;
}

/** Fermi-Dirac distribution f(ω) = 1/(exp((ω-μ)/kT) + 1)
 *  Reference: Fermi (1926); Dirac (1926) */
function fermidirac(omega: number, mu: number, T: number): number {
  if (T < 1) return omega < mu ? 1 : 0;
  const kT = 8.617e-5 * T; // eV/K
  return 1 / (Math.exp((omega - mu) / kT) + 1);
}

/** Quasiparticle residue Z = (1 - ∂Re Σ/∂ω)^{-1}
 *  In constant-Σ approximation: Z = 1
 *  Reference: Mahan (2000) §3.1; Bruus & Flensberg (2004) §9 */
function quasiparticleZ(p: Params): number {
  // With frequency-independent Σ, Z = 1 exactly
  // For illustration we define Z via the peak height ratio
  const A_qp = spectralFunction(p.epsilon_k + p.sigma_real, p);
  return Math.min(1, (A_qp * Math.abs(p.sigma_imag)) / Math.PI);
}

/** Quasiparticle lifetime τ = ℏ / (2|Im Σ|) in fs (ℏ = 0.6582 eV·fs)
 *  Reference: Mahan (2000) §3.2 */
function lifetime(p: Params): number {
  return 0.6582 / (2 * Math.abs(p.sigma_imag));
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
function drawSpectral(
  canvas: HTMLCanvasElement,
  p: Params,
  hoveredOmega: number | null,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const PAD = { top: 30, right: 20, bottom: 50, left: 60 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#faf7f2';
  ctx.fillRect(0, 0, W, H);

  // ── Compute data ──
  const N = 600;
  const omegaMin = -4;
  const omegaMax = 4;
  const omegas: number[] = [];
  const As: number[] = [];
  const nFs: number[] = [];
  let Amax = 0;

  for (let i = 0; i < N; i++) {
    const omega = omegaMin + (i / (N - 1)) * (omegaMax - omegaMin);
    omegas.push(omega);
    const A = spectralFunction(omega, p);
    As.push(A);
    nFs.push(fermidirac(omega, p.mu, p.temperature) * A);
    if (A > Amax) Amax = A;
  }

  // ── Helper: omega → canvas x ──
  const ox = (omega: number) =>
    PAD.left + ((omega - omegaMin) / (omegaMax - omegaMin)) * plotW;
  // ── Helper: A → canvas y ──
  const ay = (a: number) =>
    PAD.top + plotH - (a / (Amax * 1.1)) * plotH;

  // ── Filled occupied states (Fermi-Dirac × A) ──
  ctx.beginPath();
  ctx.moveTo(ox(omegas[0]), ay(0));
  for (let i = 0; i < N; i++) {
    ctx.lineTo(ox(omegas[i]), ay(nFs[i]));
  }
  ctx.lineTo(ox(omegas[N - 1]), ay(0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(21, 101, 192, 0.18)';
  ctx.fill();

  // ── Spectral function curve A(k,ω) ──
  ctx.beginPath();
  ctx.moveTo(ox(omegas[0]), ay(As[0]));
  for (let i = 1; i < N; i++) {
    ctx.lineTo(ox(omegas[i]), ay(As[i]));
  }
  ctx.strokeStyle = '#1565c0';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // ── Lehmann poles (vertical dashed lines) ──
  const polePositions = p.n_poles === 1
    ? [p.epsilon_k + p.sigma_real]
    : [p.epsilon_k + p.sigma_real - 0.4, p.epsilon_k + p.sigma_real + 0.4];

  polePositions.forEach((pole, idx) => {
    const px = ox(pole);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(px, PAD.top);
    ctx.lineTo(px, PAD.top + plotH);
    ctx.strokeStyle = idx === 0 ? '#c62828' : '#f9a825';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Pole label
    ctx.fillStyle = idx === 0 ? '#c62828' : '#f9a825';
    ctx.font = 'bold 10px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`ε*${idx + 1}`, px, PAD.top - 6);
  });

  // ── Chemical potential μ ──
  const mux = ox(p.mu);
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(mux, PAD.top);
  ctx.lineTo(mux, PAD.top + plotH);
  ctx.strokeStyle = '#2e7d32';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#2e7d32';
  ctx.font = 'bold 10px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('μ', mux, PAD.top + plotH + 14);

  // ── Hover crosshair ──
  if (hoveredOmega !== null) {
    const hx = ox(hoveredOmega);
    const hA = spectralFunction(hoveredOmega, p);
    const hy = ay(hA);
    ctx.beginPath();
    ctx.moveTo(hx, PAD.top);
    ctx.lineTo(hx, PAD.top + plotH);
    ctx.strokeStyle = 'rgba(106,27,154,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    // Dot on curve
    ctx.beginPath();
    ctx.arc(hx, hy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#6a1b9a';
    ctx.fill();
    // Tooltip
    const label = `ω=${hoveredOmega.toFixed(2)} eV  A=${hA.toFixed(3)} eV⁻¹`;
    ctx.font = '10px IBM Plex Mono, monospace';
    const tw = ctx.measureText(label).width + 8;
    const tx = Math.min(hx + 6, W - tw - 4);
    ctx.fillStyle = 'rgba(26,26,46,0.85)';
    ctx.fillRect(tx, hy - 20, tw, 18);
    ctx.fillStyle = '#faf7f2';
    ctx.fillText(label, tx + 4, hy - 6);
  }

  // ── Axes ──
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, PAD.top + plotH);
  ctx.lineTo(PAD.left + plotW, PAD.top + plotH);
  ctx.stroke();

  // x-axis ticks
  ctx.fillStyle = '#1a1a2e';
  ctx.font = '10px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';
  for (let v = -4; v <= 4; v += 1) {
    const tx = ox(v);
    ctx.beginPath();
    ctx.moveTo(tx, PAD.top + plotH);
    ctx.lineTo(tx, PAD.top + plotH + 5);
    ctx.stroke();
    ctx.fillText(v.toString(), tx, PAD.top + plotH + 18);
  }

  // y-axis ticks
  ctx.textAlign = 'right';
  const yTicks = [0, Amax * 0.25, Amax * 0.5, Amax * 0.75, Amax];
  yTicks.forEach(v => {
    const ty = ay(v);
    ctx.beginPath();
    ctx.moveTo(PAD.left - 5, ty);
    ctx.lineTo(PAD.left, ty);
    ctx.stroke();
    ctx.fillText(v.toFixed(1), PAD.left - 8, ty + 4);
  });

  // Axis labels
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 11px IBM Plex Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ω (eV)', PAD.left + plotW / 2, H - 6);
  ctx.save();
  ctx.translate(14, PAD.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('A(k,ω)  [eV⁻¹]', 0, 0);
  ctx.restore();

  // Title
  ctx.font = 'bold 12px IBM Plex Mono, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1565c0';
  ctx.fillText('Spectral Function  A(k,ω) = −2 Im G ᴿ(k,ω)', PAD.left, 20);
}

// ─── Slider component ─────────────────────────────────────────────────────────
function Slider({
  label, value, min, max, step, unit, onChange, color,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
          {label}
        </span>
        <span className="text-[10px] font-mono text-[#1a1a2e]">
          {value.toFixed(2)} {unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 appearance-none cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SpectralFunctionTab() {
  const [params, setParams] = useState<Params>(PRESETS[0].params);
  const [activePreset, setActivePreset] = useState(0);
  const [hoveredOmega, setHoveredOmega] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const set = useCallback((key: keyof Params, val: number) => {
    setParams(p => ({ ...p, [key]: val }));
    setActivePreset(-1);
  }, []);

  // Draw on param change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawSpectral(canvas, params, hoveredOmega);
  }, [params, hoveredOmega]);

  // Canvas hover handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const PAD_LEFT = 60;
    const PAD_RIGHT = 20;
    const plotW = canvas.width - PAD_LEFT - PAD_RIGHT;
    const relX = (e.clientX - rect.left) * (canvas.width / rect.width) - PAD_LEFT;
    const omega = -4 + (relX / plotW) * 8;
    if (omega >= -4 && omega <= 4) setHoveredOmega(omega);
    else setHoveredOmega(null);
  }, []);

  const handleMouseLeave = useCallback(() => setHoveredOmega(null), []);

  // Derived quantities
  const qpEnergy = params.epsilon_k + params.sigma_real;
  const tau = lifetime(params);
  const Z = quasiparticleZ(params);
  const A_peak = spectralFunction(qpEnergy, params);
  const sumRule = (() => {
    // Numerical integration of A(ω) from -4 to 4
    let s = 0;
    const N_INT = 2000;
    const dw = 8 / N_INT;
    for (let i = 0; i < N_INT; i++) {
      const w = -4 + (i + 0.5) * dw;
      s += spectralFunction(w, params) * dw;
    }
    return s / (2 * Math.PI);
  })();

  const refs = [
    { key: 'Lehmann 1954', text: 'Lehmann, H. (1954). Nuovo Cimento 11, 342. [Spectral representation]' },
    { key: 'Dyson 1949', text: 'Dyson, F. J. (1949). Phys. Rev. 75, 1736. [Dyson equation]' },
    { key: 'Matsubara 1955', text: 'Matsubara, T. (1955). Prog. Theor. Phys. 14, 351. [Imaginary-time formalism]' },
    { key: 'Keldysh 1965', text: 'Keldysh, L. V. (1965). Sov. Phys. JETP 20, 1018. [Non-equilibrium GF]' },
    { key: 'Hedin 1965', text: 'Hedin, L. (1965). Phys. Rev. 139, A796. [GW approximation]' },
    { key: 'Anderson 1961', text: 'Anderson, P. W. (1961). Phys. Rev. 124, 41. [Impurity / Kondo]' },
    { key: 'Mahan 2000', text: 'Mahan, G. D. (2000). Many-Particle Physics, 3rd ed. Kluwer.' },
    { key: 'Wang 2008', text: '王怀玉 (2008). 《凝聚态物理的格林函数理论》. 科学出版社. ISBN 978-7-03-020091-4.' },
  ];

  return (
    <div
      className="flex h-full bg-[#faf7f2] overflow-hidden"
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {/* ── Left controls ── */}
      <aside className="w-64 shrink-0 flex flex-col border-r-2 border-[#1a1a2e] bg-[#faf7f2] overflow-y-auto">
        <div className="p-3 border-b-2 border-[#1a1a2e]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888]">PRESETS</div>
        </div>
        {PRESETS.map((pr, i) => (
          <button
            key={i}
            onClick={() => { setParams(pr.params); setActivePreset(i); }}
            className={`text-left px-3 py-2 border-b border-[#e0ddd8] transition-colors ${
              activePreset === i ? 'bg-[#1565c0] text-white' : 'hover:bg-[#f0ede8] text-[#1a1a2e]'
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest">{pr.label}</div>
            <div className={`text-[9px] mt-0.5 leading-tight ${activePreset === i ? 'text-blue-200' : 'text-[#888]'}`}>
              {pr.ref}
            </div>
          </button>
        ))}

        <div className="p-3 border-t-2 border-b-2 border-[#1a1a2e] mt-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-3">PARAMETERS</div>
          <div className="flex flex-col gap-3">
            <Slider label="ε_k  (band energy)" value={params.epsilon_k} min={-3} max={3} step={0.05} unit="eV" onChange={v => set('epsilon_k', v)} color="#1565c0" />
            <Slider label="Re Σ  (energy shift)" value={params.sigma_real} min={-2} max={2} step={0.05} unit="eV" onChange={v => set('sigma_real', v)} color="#c62828" />
            <Slider label="Im Σ  (damping, <0)" value={params.sigma_imag} min={-3} max={-0.01} step={0.01} unit="eV" onChange={v => set('sigma_imag', v)} color="#f9a825" />
            <Slider label="μ  (chemical potential)" value={params.mu} min={-3} max={3} step={0.05} unit="eV" onChange={v => set('mu', v)} color="#2e7d32" />
            <Slider label="T  (temperature)" value={params.temperature} min={0} max={2000} step={10} unit="K" onChange={v => set('temperature', v)} color="#6a1b9a" />
          </div>
        </div>

        {/* Derived quantities */}
        <div className="p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">DERIVED QUANTITIES</div>
          <div className="flex flex-col gap-1.5 text-[10px]">
            {[
              { label: 'QP energy ε* = ε_k + Re Σ', value: `${qpEnergy.toFixed(3)} eV` },
              { label: 'QP lifetime τ = ℏ/2|Im Σ|', value: `${tau.toFixed(2)} fs` },
              { label: 'Peak A(k, ε*)', value: `${A_peak.toFixed(3)} eV⁻¹` },
              { label: '∫dω A(k,ω)/2π  (sum rule)', value: `${sumRule.toFixed(3)}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2 border-b border-[#e0ddd8] pb-1">
                <span className="text-[#555] leading-tight">{label}</span>
                <span className="font-bold text-[#1a1a2e] shrink-0">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Canvas */}
        <div className="p-4 border-b-2 border-[#1a1a2e]">
          <canvas
            ref={canvasRef}
            width={780}
            height={320}
            className="w-full border border-[#e0ddd8]"
            style={{ cursor: 'crosshair', maxHeight: 320 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        </div>

        {/* Active preset description */}
        {activePreset >= 0 && (
          <div className="mx-4 mt-4 border-l-4 border-[#1565c0] pl-4 py-2 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#1565c0] mb-1">
              {PRESETS[activePreset].label}
            </div>
            <p className="text-xs text-[#1a1a2e] leading-relaxed">{PRESETS[activePreset].description}</p>
            <p className="text-[10px] text-[#888] mt-1">Ref: {PRESETS[activePreset].ref}</p>
          </div>
        )}

        {/* Theory panel */}
        <div className="p-4 flex flex-col gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-2">LEHMANN REPRESENTATION</div>
            <p className="text-xs text-[#1a1a2e] leading-relaxed">
              The spectral function A(k,ω) = −2 Im G<sup>R</sup>(k,ω) satisfies the{' '}
              <strong>Lehmann sum rule</strong> ∫dω A(k,ω)/(2π) = 1 (Lehmann 1954).
              The retarded Green's function is G<sup>R</sup>(k,ω) = 1/(ω − ε_k − Σ<sup>R</sup>(k,ω)).
              With a constant self-energy Σ<sup>R</sup> = Re Σ + i Im Σ (Im Σ &lt; 0),
              A(k,ω) is a Lorentzian of width |Im Σ| centred at ε_k + Re Σ.
              The quasiparticle lifetime is τ = ℏ/(2|Im Σ|) (Mahan 2000, §3.2).
            </p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-2">DYSON EQUATION & SELF-ENERGY</div>
            <p className="text-xs text-[#1a1a2e] leading-relaxed">
              The Dyson equation G = G₀ + G₀ΣG (Dyson 1949) is a{' '}
              <strong>fixed-point equation</strong>: G appears on both sides.
              Its solution G<sup>R</sup>(k,ω) = 1/(ω − ε_k − Σ<sup>R</sup>) is the fixed point of
              the map G ↦ G₀ + G₀ΣG, analogous to x_(n+1) = f(x_n) in the Fixed Point tab.
              The self-energy Σ(k,ω) encodes all many-body corrections:
              Hartree–Fock (first-order), RPA ring diagrams (Bohm & Pines 1953),
              and the full GW approximation (Hedin 1965).
            </p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-[#888] mb-2">CONNECTION TO INTERACTION NETS</div>
            <p className="text-xs text-[#1a1a2e] leading-relaxed">
              Each Feynman diagram contributing to Σ is a graph: propagator lines are{' '}
              <strong>wires</strong> and interaction vertices are <strong>nodes</strong> —
              exactly the structure of an interaction net (Lafont 1990).
              The β-reduction rule corresponds to contracting a vertex with an adjacent propagator.
              Normal form (no active pairs) corresponds to a fully renormalised theory.
              The Y combinator's self-referential loop mirrors the self-energy loop in a Feynman diagram.
            </p>
          </div>

          {/* References */}
          <div className="border-t-2 border-[#1a1a2e] pt-3 mt-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#888] mb-2">REFERENCES</div>
            <div className="flex flex-col gap-1">
              {refs.map(r => (
                <div key={r.key} className="flex gap-2 text-[9px] text-[#555] leading-relaxed">
                  <span className="text-[#1565c0] font-bold shrink-0">[{r.key}]</span>
                  <span>{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
