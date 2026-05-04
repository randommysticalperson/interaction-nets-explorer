/**
 * Home.tsx — Interaction Nets Explorer
 * Design: Constructivist Data Instrument
 * Colors: cobalt blue (#1565c0), golden yellow (#f9a825), vermillion red (#c62828), charcoal (#1a1a2e), off-white (#faf7f2)
 * Layout: Hero banner | Three-tab instrument panel
 */

import { useState } from 'react';
import LambdaVisualizer from '@/components/LambdaVisualizer';
import ChemSim from '@/components/ChemSim';
import BenchmarkTab from '@/components/BenchmarkTab';

const TABS = [
  {
    id: 'visualizer',
    label: '01 — LAMBDA VISUALIZER',
    shortLabel: 'VISUALIZER',
    description: 'Step through interaction net reductions of lambda terms',
    color: '#1565c0',
  },
  {
    id: 'chemsim',
    label: '02 — CHEMLAMBDA SIM',
    shortLabel: 'CHEM SIM',
    description: 'Watch nodes react like molecules in an artificial chemistry',
    color: '#4fc3f7',
  },
  {
    id: 'benchmark',
    label: '03 — ENGINE BENCHMARK',
    shortLabel: 'BENCHMARK',
    description: 'Compare interaction net reduction against naive evaluation',
    color: '#f9a825',
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('visualizer');

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>

      {/* ── Hero Banner ── */}
      <header className="relative overflow-hidden border-b-4 border-[#1a1a2e]" style={{ minHeight: 220 }}>
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

        <div className="relative z-10 px-8 py-8 flex items-end justify-between h-full">
          <div>
            {/* Overline */}
            <div className="text-xs font-bold uppercase tracking-[0.3em] text-[#c62828] mb-2">
              YVES LAFONT · 1990 · OPTIMAL REDUCTION
            </div>
            {/* Title */}
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}
              className="text-7xl text-[#1a1a2e] leading-none">
              INTERACTION
            </h1>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", lineHeight: 1 }}
              className="text-7xl text-[#1565c0] leading-none">
              NETS EXPLORER
            </h1>
            <p className="mt-3 text-sm text-[#444] max-w-xl leading-relaxed">
              A graphical model of computation where programs are graphs and execution is graph rewriting.
              Explore the fixed-point combinator, optimal lambda reduction, and artificial life simulations.
            </p>
          </div>

          {/* Node type legend — right side */}
          <div className="hidden md:flex flex-col gap-3 text-right">
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

      {/* ── Tab Bar ── */}
      <nav className="border-b-2 border-[#1a1a2e] bg-[#faf7f2] flex">
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-left border-r-2 border-[#1a1a2e] last:border-r-0 transition-colors group ${activeTab === tab.id ? 'bg-[#1a1a2e] text-white' : 'hover:bg-[#f0ede8]'}`}
          >
            <div className={`text-xs font-bold uppercase tracking-widest ${activeTab === tab.id ? 'text-white' : 'text-[#888]'}`}>
              {tab.label}
            </div>
            <div className={`text-xs mt-0.5 hidden md:block ${activeTab === tab.id ? 'text-[#aaa]' : 'text-[#bbb]'}`}>
              {tab.description}
            </div>
            {/* Active indicator bar */}
            <div className="h-0.5 mt-2 transition-all" style={{ background: activeTab === tab.id ? tab.color : 'transparent' }} />
          </button>
        ))}
      </nav>

      {/* ── Tab Content ── */}
      <main className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: 480 }}>
        {activeTab === 'visualizer' && <LambdaVisualizer />}
        {activeTab === 'chemsim' && <ChemSim />}
        {activeTab === 'benchmark' && <BenchmarkTab />}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t-2 border-[#1a1a2e] bg-[#1a1a2e] text-[#888] px-8 py-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest">INTERACTION NETS EXPLORER</div>
        <div className="text-xs">
          Based on Lafont (1990) · Symmetric Interaction Combinators · Fixed-Point Combinators
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-[#1565c0]">γ</span>
          <span className="text-[#f9a825]">δ</span>
          <span className="text-[#c62828]">ε</span>
        </div>
      </footer>
    </div>
  );
}
