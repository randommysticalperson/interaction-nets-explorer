/**
 * Home.tsx — Interaction Nets Explorer
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0), golden yellow (#f9a825), vermillion red (#c62828), charcoal (#1a1a2e), off-white (#faf7f2)
 * Layout: Responsive hero banner | Four-tab instrument panel
 * Mobile: Compact hero, scrollable tab bar, stacked layouts in visualizer
 */

import { useState } from 'react';
import LambdaVisualizer from '@/components/LambdaVisualizer';
import ChemSim from '@/components/ChemSim';
import BenchmarkTab from '@/components/BenchmarkTab';
import TheoryTab from '@/components/TheoryTab';

const TABS = [
  {
    id: 'theory',
    label: '00 — THEORY',
    shortLabel: '00',
    mobileLabel: 'THEORY',
    description: 'Lambda calculus, Y combinator, interaction nets — from the paper',
    color: '#c62828',
  },
  {
    id: 'visualizer',
    label: '01 — VISUALIZER',
    shortLabel: '01',
    mobileLabel: 'VISUALIZE',
    description: 'Step through interaction net reductions of lambda terms',
    color: '#1565c0',
  },
  {
    id: 'chemsim',
    label: '02 — CHEM SIM',
    shortLabel: '02',
    mobileLabel: 'CHEM SIM',
    description: 'Watch nodes react like molecules in an artificial chemistry',
    color: '#4fc3f7',
  },
  {
    id: 'benchmark',
    label: '03 — BENCHMARK',
    shortLabel: '03',
    mobileLabel: 'BENCH',
    description: 'Compare interaction net reduction against naive evaluation',
    color: '#f9a825',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('theory');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── Hero Banner ── */}
      <header className="relative overflow-hidden border-b-4 border-[#1a1a2e]">
        {/* Hero image background */}
        <div className="absolute inset-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663332318761/WM3AwWk69yvSWvA2DNfeA4/hero_bg-VyrxximgZn4AG86fgvrvk3.webp"
            alt="Interaction nets diagram"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#faf7f2]/80" />
        </div>

        {/* Constructivist diagonal accent */}
        <div className="absolute top-0 right-0 w-1 h-full bg-[#c62828]" />
        <div className="absolute top-0 right-4 w-0.5 h-full bg-[#f9a825]" />

        <div className="relative z-10 px-4 md:px-8 py-5 md:py-8 flex items-end justify-between">
          <div>
            {/* Overline */}
            <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[#c62828] mb-1 md:mb-2">
              YVES LAFONT · 1990 · OPTIMAL REDUCTION
            </div>
            {/* Title */}
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}
              className="text-5xl md:text-7xl text-[#1a1a2e] leading-none">
              INTERACTION
            </h1>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}
              className="text-5xl md:text-7xl text-[#1565c0] leading-none">
              NETS EXPLORER
            </h1>
            <p className="mt-2 md:mt-3 text-xs md:text-sm text-[#444] max-w-xs md:max-w-xl leading-relaxed">
              A graphical model of computation where programs are graphs and execution is graph rewriting.
              <span className="hidden md:inline"> Explore the fixed-point combinator, optimal lambda reduction, and artificial life simulations.</span>
            </p>
          </div>

          {/* Node type legend — right side, hidden on small screens */}
          <div className="hidden lg:flex flex-col gap-3 text-right shrink-0 ml-4">
            <div className="flex items-center gap-3 justify-end">
              <span className="text-xs text-[#1a1a2e] uppercase tracking-wider">Constructor γ</span>
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[18px] border-l-transparent border-r-transparent border-b-[#1565c0]" />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <span className="text-xs text-[#1a1a2e] uppercase tracking-wider">Duplicator δ</span>
              <div className="w-4 h-4 rotate-45 bg-[#f9a825]" />
            </div>
            <div className="flex items-center gap-3 justify-end">
              <span className="text-xs text-[#1a1a2e] uppercase tracking-wider">Eraser ε</span>
              <div className="w-4 h-4 rounded-full bg-[#c62828]" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Bar — desktop: full labels, mobile: icon + short label ── */}
      <nav className="border-b-2 border-[#1a1a2e] bg-[#faf7f2]">
        {/* Desktop tab bar */}
        <div className="hidden sm:flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-3 text-left border-r-2 border-[#1a1a2e] last:border-r-0 transition-colors ${activeTab === tab.id ? 'bg-[#1a1a2e] text-white' : 'hover:bg-[#f0ede8]'}`}
            >
              <div className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${activeTab === tab.id ? 'text-white' : 'text-[#888]'}`}>
                {tab.label}
              </div>
              <div className={`text-[10px] mt-0.5 hidden md:block ${activeTab === tab.id ? 'text-[#aaa]' : 'text-[#bbb]'}`}>
                {tab.description}
              </div>
              <div className="h-0.5 mt-1 md:mt-2 transition-all" style={{ background: activeTab === tab.id ? tab.color : 'transparent' }} />
            </button>
          ))}
        </div>

        {/* Mobile tab bar — compact scrollable */}
        <div className="sm:hidden flex overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-3 text-xs font-bold uppercase tracking-widest border-r-2 border-[#1a1a2e] last:border-r-0 transition-colors ${activeTab === tab.id ? 'bg-[#1a1a2e] text-white' : 'text-[#888] hover:bg-[#f0ede8]'}`}
            >
              <div>{tab.mobileLabel}</div>
              <div className="h-0.5 mt-1 transition-all" style={{ background: activeTab === tab.id ? tab.color : 'transparent' }} />
            </button>
          ))}
        </div>
      </nav>

      {/* ── Tab Content ── */}
      <main
        className="flex-1 overflow-hidden"
        style={{ height: 'calc(100dvh - var(--header-h, 220px))', minHeight: 400 }}
      >
        {activeTab === 'theory' && <TheoryTab />}
        {activeTab === 'visualizer' && <LambdaVisualizer />}
        {activeTab === 'chemsim' && <ChemSim />}
        {activeTab === 'benchmark' && <BenchmarkTab />}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t-2 border-[#1a1a2e] bg-[#1a1a2e] text-[#888] px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="text-[10px] md:text-xs uppercase tracking-widest shrink-0">INTERACTION NETS EXPLORER</div>
        <div className="text-[10px] md:text-xs text-center hidden sm:block">
          Lafont (1990) · Rojas (2015) · arXiv:1503.09060
        </div>
        <div className="flex gap-3 md:gap-4 text-xs shrink-0">
          <span className="text-[#1565c0]">γ</span>
          <span className="text-[#f9a825]">δ</span>
          <span className="text-[#c62828]">ε</span>
        </div>
      </footer>
    </div>
  );
}
