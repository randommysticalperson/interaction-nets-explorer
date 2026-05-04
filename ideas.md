# Interaction Nets Explorer — Design Brainstorm

## Context
A website combining three interactive demos:
1. Lambda Calculus Interaction Net step-by-step visualizer
2. Chemlambda-style artificial life simulation
3. Graph rewriting engine benchmark

---

<response>
<probability>0.07</probability>
<text>
<idea>
**Design Movement:** Brutalist Scientific Publication — Raw academic rigor meets digital brutalism

**Core Principles:**
- Monochromatic ink-on-paper aesthetic with sharp, deliberate accent colors
- Information density as a design virtue — no decorative whitespace
- Grid systems inspired by typeset academic papers
- Raw, exposed structure — nodes look like circuit diagrams, not glossy UI

**Color Philosophy:**
- Background: near-black (#0d0d0d) like a blackboard
- Primary text: off-white (#f0ede8) like chalk
- Accent 1: electric cyan (#00e5ff) for active/highlighted nodes
- Accent 2: amber (#ffb300) for fanout/duplication nodes
- Accent 3: crimson (#e53935) for lambda nodes
- The colors are drawn directly from the original diagram (blue=syntactic, yellow=fanout, red=lambda)

**Layout Paradigm:**
- Asymmetric two-column: left is a narrow fixed sidebar with controls/legend, right is a full-height canvas
- Header is a single horizontal rule with monospace title
- No cards, no rounded corners, no shadows — only borders and rules

**Signature Elements:**
- Monospace font (JetBrains Mono) for all labels, node names, and code
- Hairline borders (1px) on all panels
- Node shapes rendered as raw geometric primitives (circles, triangles, lines) — not rounded bubbles

**Interaction Philosophy:**
- Keyboard-first: space to step, R to reset, S to speed up
- Hover reveals port labels in monospace tooltip
- No animations except for graph edge drawing (linear, no easing)

**Animation:**
- Graph rewrites: nodes flash briefly (50ms) then instantly rearrange — no smooth transitions
- New nodes appear with a 1-frame blink
- Simulation: nodes move with Verlet integration, no spring smoothing

**Typography System:**
- Display: Space Grotesk Bold 700 for section titles
- Body/Labels: JetBrains Mono 400 for all node labels, code, and data
- No serif fonts
</idea>
</text>
</response>

<response>
<probability>0.06</probability>
<text>
<idea>
**Design Movement:** Organic Computational Biology — Wet lab meets computation

**Core Principles:**
- Nodes feel like biological cells or molecules, not geometric shapes
- Color palette derived from microscopy imaging (fluorescent dyes on dark background)
- Layout feels like a petri dish or microscope slide — circular viewport, dark surround
- Information emerges organically — labels appear on hover, not always visible

**Color Philosophy:**
- Background: deep navy (#050d1a) like a microscope dark field
- Syntactic tree nodes: bioluminescent blue (#4fc3f7)
- Fanout nodes: phosphorescent yellow-green (#c6ff00)
- Lambda nodes: vivid magenta (#e040fb)
- Active pairs (redexes): white glow (#ffffff) with bloom effect
- The palette deliberately mirrors the original diagram's blue/yellow/red scheme but in fluorescent tones

**Layout Paradigm:**
- Full-viewport circular canvas as the hero — the "petri dish"
- Floating control panel (glass morphism) bottom-left
- Tab bar at top is minimal — just text labels, no borders

**Signature Elements:**
- Nodes rendered as soft blobs with SVG filter (feTurbulence + feDisplacementMap) for organic edges
- Wires/edges rendered as bezier curves with slight wobble animation
- Glow effects on active pairs using CSS filter: drop-shadow

**Interaction Philosophy:**
- Click a node to inspect its ports and connections
- Drag nodes to rearrange the graph manually
- Double-click an active pair to manually trigger a rewrite

**Animation:**
- Nodes pulse gently (scale 1.0 → 1.05 → 1.0, 2s loop) when idle
- Rewrite: active pair nodes shrink and dissolve, new nodes grow from the center point
- Simulation: nodes repel each other with a soft-body physics model

**Typography System:**
- Display: Syne ExtraBold 800 for titles
- Body: DM Sans 400/500 for descriptions
- Labels: DM Mono 400 for node identifiers
</idea>
</text>
</response>

<response>
<probability>0.08</probability>
<text>
<idea>
**Design Movement:** Constructivist Data Instrument — Soviet constructivism meets scientific instrument UI

**Core Principles:**
- Strong diagonal composition and asymmetric tension
- Colors as pure information carriers — each node type has an immutable color identity
- Typography as structure — large display numbers and labels act as visual anchors
- The interface feels like a precision scientific instrument, not a consumer app

**Color Philosophy:**
- Background: warm off-white (#faf7f2) — like aged instrument paper
- Primary ink: deep charcoal (#1a1a2e)
- Syntactic tree: cobalt blue (#1565c0) — directly from the diagram
- Fanout tree: golden yellow (#f9a825) — directly from the diagram
- Lambda node: vermillion red (#c62828) — directly from the diagram
- Accent: forest green (#2e7d32) for "normal form reached" / completed states

**Layout Paradigm:**
- Three-panel horizontal layout: left control rail | center canvas | right info panel
- Each panel has a bold header label in ALL CAPS with a thick top border
- Diagonal rule lines as decorative separators (inspired by constructivist posters)

**Signature Elements:**
- Bold thick borders (3-4px) on panel headers
- Step counter displayed as a large typographic number (like a score)
- Node shapes match the original diagram: filled circles for lambda, triangles for constructors/duplicators

**Interaction Philosophy:**
- All controls are exposed — no hidden menus
- Every state change is logged in a side panel (like an instrument readout)
- Speed slider controls reduction rate in simulation mode

**Animation:**
- Rewrite steps: smooth 300ms layout transition using D3 force simulation
- Active pair highlight: thick pulsing border (not glow) — 2px → 4px → 2px
- Tab switching: instant, no transition — instrument-like precision

**Typography System:**
- Display: Bebas Neue for large labels and step counters
- Body: IBM Plex Sans 400/600 for descriptions and controls
- Code/Labels: IBM Plex Mono 400 for node identifiers and lambda terms
</idea>
</text>
</response>

---

## Selected Design: #3 — Constructivist Data Instrument

Chosen for its direct visual connection to the original diagram's color scheme (blue/yellow/red), its clarity as a scientific tool, and its distinctive personality that avoids generic "tech startup" aesthetics. The three-panel layout maps naturally to the three demos.
