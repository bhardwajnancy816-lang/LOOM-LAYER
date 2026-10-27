---
name: Loom & Layer
colors:
  surface: '#fff8f6'
  surface-dim: '#e8d6d0'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ec'
  surface-container: '#fdeae3'
  surface-container-high: '#f7e4de'
  surface-container-highest: '#f1dfd8'
  on-surface: '#231916'
  on-surface-variant: '#58413f'
  inverse-surface: '#392e2a'
  inverse-on-surface: '#ffede7'
  outline: '#8b716f'
  outline-variant: '#dfbfbc'
  surface-tint: '#ab3333'
  primary: '#7d1017'
  on-primary: '#ffffff'
  primary-container: '#9e2a2b'
  on-primary-container: '#ffb9b4'
  inverse-primary: '#ffb3ae'
  secondary: '#805600'
  on-secondary: '#ffffff'
  secondary-container: '#fdc268'
  on-secondary-container: '#764e00'
  tertiary: '#70250d'
  on-tertiary: '#ffffff'
  tertiary-container: '#8e3c22'
  on-tertiary-container: '#ffbaa6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3ae'
  on-primary-fixed: '#410004'
  on-primary-fixed-variant: '#8a1b1e'
  secondary-fixed: '#ffddb0'
  secondary-fixed-dim: '#f6bc63'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#614000'
  tertiary-fixed: '#ffdbd1'
  tertiary-fixed-dim: '#ffb59f'
  on-tertiary-fixed: '#3a0a00'
  on-tertiary-fixed-variant: '#7b2e15'
  background: '#fff8f6'
  on-background: '#231916'
  surface-variant: '#f1dfd8'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: 4rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  tech-data-lg:
    fontFamily: JetBrains Mono
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  tech-data-md:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.25rem
  tech-data-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
  space-2xl: 3rem
---

## Brand & Style

This design system embodies the union of Savile Row sartorial craftsmanship and algorithmic CAD/CAM computational precision. It bridges the tactile, measured heritage of bespoke patternmaking—muslin toiles, tailor's shears, chalk markings, and oak cutting tables—with high-efficiency vector nesting engines, automated CNC knife paths, and zero-waste material science.

The visual style is **Tactile Technical Atelier**. It avoids sterile flat vector graphics and synthetic cyber aesthetics in favor of unbleached natural textures, structural linen weaves, physical textile depth, and mechanical clarity. Physical design metaphors translate directly into system interactions: plies of fabric stack with soft tactile dispersion, nested piece boundaries exhibit subtle tailor chalk offsets, cut paths present laser precision, and basting stitches serve as dynamic guides and perimeter indicators.

The target audience consists of technical apparel directors, bespoke patternmakers, computational fashion engineers, and industrial CAM machine operators. The experience must evoke patient artisanal mastery, surgical cutting precision, and immediate confidence in fabric yield optimization.

## Colors

The palette grounds high-throughput manufacturing inside an organic, tactile material environment.

- **Primary (`#9e2a2b` Crimson / Shears & Tailor's Chalk):** The operational core. Directs focus toward active CAM execution, cutting heads, primary nesting triggers, and critical vector endpoints. Supported by `#fdf3f3` for selected pattern fills and light alerts.
- **Secondary (`#c28e3a` Basting Gold):** Dedicated to technical measurement, grainlines, nesting efficiency percentages, optical alignment targets, and digital ruler indices.
- **Tertiary (`#d47153` Terracotta):** Represents material tension warnings, cut-buffer collisions, grain bias deviations, and salvage limit alerts.
- **Neutral (`#2c221e` Atelier Slate & Dark Oak):** Evokes dark-stained cutting tables, iron weights, and tailored suiting wool. Provides deep, structural framing for toolbars, docking panels, and high-contrast vector lines against the canvas.
- **Parchment Canvas Spectrum:** Base environments rely on `#fffdf9` (raw muslin canvas surface), `#fcf8f1` (nested cutting table grid), and `#f4ece1` / `#e8dac8` (docked sidebars, parameter panels, and layered plies).

## Typography

The typography implements a dual-register layout:
1. **Atelier Interface Register (Plus Jakarta Sans):** Governs structural UI, workspace panels, dialogs, operational controls, and navigational context. Its rounded contemporary geometry softens technical density without sacrificing clarity.
2. **Computational CAD Register (JetBrains Mono):** Drives numeric coordinates ($X, Y, Z$), nesting efficiency rates ($94.8\%$), cutting blade velocity ($\text{mm/s}$), ply counts, grain angle deflections, and machine toolcodes.

### Hierarchy & Usage
- Use `tech-data-*` strictly for real-time telemetry, geometric metrics, and coordinate tables.
- Use `label-caps` for uppercase engineering metadata, parameter headers, and CAD tool states.
- Numeric metrics must consistently display tabular figures (`tnum`) to eliminate spatial jitter during iterative nesting cycles and CAM coordinate streaming.

## Layout & Spacing

The architecture operates on an engineering-grade layout with a pinned dynamic CAM viewport surrounded by collapsible studio sidebars.

### Layout Model
- **Viewport Canvas:** A flexible viewport anchored between precision tool docks. The interactive cutting marker occupies the primary canvas, backed by a dynamic millimeter ruler matrix.
- **Docked Panels:** Fixed-width utility panels (320px left pattern library, 380px right nesting telemetry) collapse smoothly into slim tool strips on constrained viewports.
- **Rhythm:** Spacing derives from a base 4px metric. Canvas margins follow `margin` tokens to prevent interference with physical machine hardware bounds and tablet perimeter bezels.

### Breakpoints & Adaptive Reflow
- **Mobile (< 768px):** Dedicated to machine floor monitoring and alert triage. Nesting tables collapse into vertical card summaries; the CAM cutting preview locks to a read-only stream. Viewport margins are fixed at `margin` (1rem).
- **Tablet (768px - 1199px):** Inspector panels transform into overlay slide-over drawers with touch-friendly scrub targets. Canvas margins adjust to `margin-tablet` (1.5rem).
- **Desktop (≥ 1200px):** Full studio workbench with dual docked panels, high-density coordinate grids, and an active multi-ply nesting canvas.

## Elevation & Depth

Visual hierarchy leverages physical textile mechanics—specifically, layered plies of heavy tailoring cloth, pinned paper patterns, and solid oak workbench substructures.

### Surface Elevation Levels
- **Level 0 (The Cutting Table):** Sub-canvas surface tinted with `#fcf8f1`, displaying woven coordinate tick lines with minimal depth.
- **Level 1 (Nested Fabric Plies):** Pattern shapes sit with soft tactile contact shadows: `0 1px 3px rgba(44, 34, 30, 0.08), 0 4px 12px rgba(44, 34, 30, 0.04)`. Outer borders feature an inner unbleached edge offset.
- **Level 2 (Active Placed Piece & Work Panels):** Lifted inspector palettes and selected pattern pieces hover above the nest with stacked ply depth: `0 8px 24px rgba(44, 34, 30, 0.10), 0 2px 6px rgba(44, 34, 30, 0.06)`.
- **Level 3 (CAM Floating Toolheads & Modals):** Cutting tool status indicators and high-priority machine overrides carry sharp, decisive shadows: `0 16px 40px rgba(27, 20, 17, 0.16), 0 4px 12px rgba(27, 20, 17, 0.08)`.

### Physical Seamlines & Delimiters
Replaced generic drop shadows with **basting stitch rules**: 1px dashed separators (`dasharray: 4 4`) in `#d5bfab` across canvas tool docks, or `#c28e3a` across active nested seam tolerances.

## Shapes

The geometric framework uses a calibrated, firm curvature profile (`roundedness: 1`). It reflects bespoke pattern card stock cut by shears: crisp, structured corners with micro-radii that preserve technical rigor without aggressive sharpness.

### Shape Tokens in Practice
- **Standard Controls & Chips (`rounded` - 0.25rem / 4px):** Applied to numeric parameter inputs, tool toggle buttons, CAD coordinates, and data table rows.
- **Panels, Flyouts & Cards (`rounded-lg` - 0.5rem / 8px):** Applied to floating toolheads, docked configuration panels, pattern detail modals, and fabric waste visualizers.
- **Specialized Overlays (`rounded-xl` - 0.75rem / 12px):** Applied exclusively to floating machine status badges and CAM cutting head diagnostics.
- **Pattern Pieces:** Bound entirely by user vector data; outer buffer boundaries render with a 1px offset running stitch.

## Components

### Buttons
- **Primary Action (Run Nesting / Start CAM Cut):** Background in `#9e2a2b` (Crimson), text in `#fffdf9`. Inset border of 1px `#b93232` with an internal 1px stitched basting inset (`dasharray: 2 2`). Hover deepens the fill to `#862324`.
- **Secondary (Fabric Analysis / Manual Rotate):** Background in `#f4ece1`, border 1px solid `#d5bfab`, text `#2c221e`. Hover shifts background to `#e8dac8`.
- **Destructive / Abort CAM:** Background `#fdf3f3`, border 1px solid `#d47153`, text `#9e2a2b`.

### Chips & Material Badges
- **Yield / Waste Indicator:** JetBrains Mono typography, pill geometry, filled with `#fcf8f1`, bordered by 1px basting gold (`#c28e3a`). Displays yield percentages (`92.4% YIELD`) alongside dynamic square-centimeter waste calculations.
- **Fabric Type Chips:** Unbleached muslin base (`#f4ece1`) featuring a subtle warp-and-weft CSS mask, labeled with weight, roll width, and stretch coefficient.

### Inputs & Engineering Scrubbers
- Structured with `#fffdf9` ground, `#e8dac8` borders, and `#2c221e` text.
- Focus state applies a 1px solid `#9e2a2b` outline paired with a 2px `#fdf3f3` halo.
- Numeric scrubber fields feature a right-aligned monospaced unit indicator (`mm`, `deg`, `%`) in `#c28e3a`.

### Cards & Placed Marker Components
- **Pattern Nesting Cards:** Bound by `#e8dac8` containing miniature vector previews, grainline directional indicators, seam allowances, and piece quantities. Hover activates a faint `#9e2a2b` perimeter guide.
- **CAM Telemetry Stream Card:** Dark atelier backing (`#1b1411`) with high-contrast JetBrains Mono outputs in `#fcf8f1` and basting gold accents, detailing feed rates, knife oscillations, and remaining cut times.

### Checkboxes & Segmented Selectors
- Custom square toggles (16x16px) with 2px corners (`#e8dac8` stroke).
- Checked state fills with `#9e2a2b` featuring an unbleached thread cross-stitch mark (`×`) in `#fffdf9`.