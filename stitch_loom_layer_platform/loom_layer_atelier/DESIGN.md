---
name: Loom & Layer Atelier
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#4d4540'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ed'
  outline: '#7e7570'
  outline-variant: '#d0c4be'
  surface-tint: '#625d5b'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1e1b19'
  on-primary-container: '#888380'
  inverse-primary: '#ccc5c1'
  secondary: '#ab3333'
  on-secondary: '#ffffff'
  secondary-container: '#ff716c'
  on-secondary-container: '#70040f'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1f1b16'
  on-tertiary-container: '#89837c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9e1dd'
  primary-fixed-dim: '#ccc5c1'
  on-primary-fixed: '#1e1b19'
  on-primary-fixed-variant: '#4a4643'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ae'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#8a1b1e'
  tertiary-fixed: '#eae1d9'
  tertiary-fixed-dim: '#cdc5be'
  on-tertiary-fixed: '#1f1b16'
  on-tertiary-fixed-variant: '#4b4640'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  metric-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
---

## Brand & Style
This design system embodies the intersection of haute couture precision and advanced algorithmic engineering. Designed for high-end fashion patternmakers, apparel CAD/CAM technicians, and material yield directors, the interface projects quiet authority, meticulous craftsmanship, and industrial poise.

The design philosophy combines **Technical Minimalism** with **Tactile Architectural Restraint**:
- **Utilitarian Elegance:** Complex nested cutting markers, grainline alignments, and multi-ply fabric consumption matrices are delivered with clinical clarity.
- **Calm, High-Acuity Atmosphere:** Generous negative space and restrained tonal boundaries relieve eye strain during prolonged technical drafting and marker nesting workflows.
- **Micro-Precision Signals:** Accents are deployed sparingly—only to validate critical yield thresholds, cutting path errors, or primary pipeline commits.

## Colors
The palette is rooted in unbleached organic textile substrates, tailor's charcoal, and precision marking pigment.

- **Primary (`#1A1715` - Atelier Slate):** The dominant structural ink. Used for high-contrast primary metrics, active vector geometry, core navigational frameworks, and primary body copy.
- **Secondary (`#9E2A2B` - Tailor Oxblood):** A controlled, high-value focal point. Reserved strictly for primary action commits, marker boundary warnings, active tool triggers, and algorithmic yield targets. Never used as decorative tinting.
- **Tertiary (`#6E6862` - Raw Flax):** Serves metadata, secondary CAD dimensions, grain markers, and auxiliary technical specifications.
- **Neutral Canvas (`#FAF8F5` - Unbleached Linen):** The warm structural canvas. Ensures lower ocular fatigue than stark `#FFFFFF` during multi-hour CAD marker sessions.
- **Structural Boundary (`#E6E2DC` - Oyster Edge):** The uniform 1px boundary layer used across panels, tabular cells, and layout splits to preserve geometric order without visual bulk.

## Typography
Typographic discipline maintains structural hierarchy across sprawling data tables and vector canvas overlays.

- **Display & Headlines:** Plus Jakarta Sans delivers sculpted modernist geometry with subtle humanist touches, avoiding cold industrial brutality. Headings use tight letter tracking (`-0.03em` to `-0.01em`) and medium/semibold weights.
- **Body & Data:** Inter provides pure typographic neutrality and legible micro-details. For all coordinate readouts, roll lengths, marker nesting yields, and pattern piece coordinates, always activate OpenType features: `font-feature-settings: "tnum" 1, "cv05" 1, "zero" 1` (tabular figures, clean l, slashed zero).
- **Labels & Micro-Technical Overlays:** Rendered in uppercase or deliberate tracking (`+0.04em` to `+0.06em`) using Inter Semibold for pattern piece codes, layer grain markers, and CAM cutter speed readouts.

## Layout & Spacing
The layout operates on a disciplined 4px base module organized into a 12-column architectural grid with adaptive dock panels for CAD workspaces.

- **Workspace Layout (CAD/CAM Core):** Consists of a thin, persistent utility rail (48px fixed), collapsible contextual tooling panels (280px or 340px fixed), and a master vector canvas operating under infinite fluid canvas conventions.
- **Data & Dashboard Modules:** Utilize a standard 12-column fluid grid. Gutters hold strictly at `1rem` on mobile/tablet and expand to `1.5rem` (`gutter-lg`) on monitors above 1280px.
- **Rhythm & Safe Margins:** Component padding follows tight geometric progression (`space-xs` through `space-md` inside dense telemetry headers; `space-lg` to `space-2xl` on executive overview reports and atelier portfolio summaries).
- **Breakpoints:**
  - `sm` (640px): Single-column stacked telemetry; inspector drawers convert to full-bleed modal sheets.
  - `md` (1024px): 8-column layout; tooling panel collapses into a floating command flyout.
  - `lg` (1440px+): Full multi-pane desktop atelier environment with side-by-side pattern nesting viewports and persistent yield logs.

## Elevation & Depth
This design system avoids theatrical drop shadows and hyper-saturated blurs, relying instead on **Tonal Layering** and **Architectural Ghost Borders**.

- **Canvas Foundation:** `#FAF8F5` (Base substrate).
- **Level 1 (Panels, Sidebars, Workbenches):** `#FFFFFF` surface bounded by a crisp 1px stroke of `#E6E2DC`.
- **Level 2 (Active Toolbars, Floating Inspectors):** `#FFFFFF` with a refined dual-line perimeter: `border: 1px solid #E6E2DC` accompanied by a micro ambient boundary shadow `0 2px 8px -2px rgba(26, 23, 21, 0.04), 0 1px 2px 0 rgba(26, 23, 21, 0.02)`.
- **Level 3 (Modal Dialogs, Marker Conflict Sheets):** `#FFFFFF` surface, `border: 1px solid #1A1715`, backed by a crisp, subdued atmospheric veil `0 16px 36px -12px rgba(26, 23, 21, 0.12)`.
- **Interactive Focus & Active Vectors:** High-contrast selection bounds use a razor-sharp 1px or 1.5px continuous solid line of Tailor Oxblood (`#9E2A2B`) without glow.

## Shapes
Shapes are crisp, refined, and architecturally grounded. 

- **Corner Radius Scale:**
  - Base UI components (inputs, segment controls, list rows): `0.25rem` (4px).
  - Floating panels, metric summary tiles, and modal structures: `0.5rem` (`rounded-lg` / 8px).
  - Outer viewport framing cards: `0.75rem` (`rounded-xl` / 12px).
  - Badges and marker piece reference pills: Fully rounded only when displaying status indicators or standalone tabular IDs (`9999px`).
- **Geometric Rigor:** Buttons and input fields prioritize perpendicular discipline over rounded softness to harmonize with CAD crosshairs, straight grainlines, and geometric grading rules.

## Components

### Buttons
- **Primary:** Background `#1A1715`, text `#FAF8F5`, border 1px solid `#1A1715`, radius `0.25rem`. Hover state transitions to `#2D2926`. Active state scales down to `0.99`.
- **Accent (Commit / Run Nesting):** Background `#9E2A2B`, text `#FAF8F5`, border 1px solid `#9E2A2B`. Hover state shifts to `#852223`.
- **Secondary / Outline:** Background `#FFFFFF`, text `#1A1715`, border 1px solid `#E6E2DC`. Hover state changes background to `#FAF8F5` and border to `#D5CFC7`.
- **Ghost Tool Item:** Background transparent, text `#6E6862`, 0px border. Hover transitions to background `#FAF8F5` and text `#1A1715`.

### Chips & Yield Metric Badges
- **Status Badges:** Minimalist, tabular badges with a height of 20px, uppercase `label-sm` font. Border 1px solid `#E6E2DC`, background `#FAF8F5`, text `#1A1715`.
- **Efficiency Metric Badges:** When fabric yield achieves $\ge 88\%$, display background `#FAF8F5`, border 1px solid `#1A1715`, text `#1A1715`. When algorithmic marker errors occur, display background `#FAF8F5`, border 1px solid `#9E2A2B`, text `#9E2A2B`.

### Form Fields & Numeric Inputs
- **Input Containers:** Height 36px (dense) or 42px (standard). Background `#FFFFFF`, border 1px solid `#E6E2DC`, radius `0.25rem`, text `#1A1715`.
- **Focus State:** 1px solid `#1A1715` with an offset outline of 1px `#FAF8F5`. No diffuse blue rings.
- **Dimension Inputs:** Contain a trailing monospaced unit indicator (e.g., `mm`, `in`, `yd`) in `#6E6862` using `metric-mono`.

### Checkboxes & Segment Controls
- **Checkboxes:** 16x16px square, radius `2px`. Unchecked state: border 1px solid `#D5CFC7`, background `#FFFFFF`. Checked state: background `#1A1715`, border 1px solid `#1A1715`, crisp geometric checkmark in `#FAF8F5`.
- **Segmented Segment Controls:** Contained inside an oyster border (`#E6E2DC`) frame with `#FAF8F5` backing. The active segment is an elevated `#FFFFFF` card with a subtle 1px border `#E6E2DC` and bold weight label.

### Cards & Telemetry Tiles
- **Standard Card:** Background `#FFFFFF`, border 1px solid `#E6E2DC`, radius `0.5rem`, padding `space-md` or `space-lg`.
- **Pattern Piece Card:** Features an architectural preview grid of 8px millimeter dots in `#E6E2DC` behind the CAD vector silhouette, anchored with `metric-mono` area calculations along the lower border.

### Atelier CAD Canvas Elements
- **Grainline Vectors:** Thin, 1px continuous vector in `#1A1715` terminated by directional arrows.
- **Fabric Defect Zones:** Translucent hatched pattern (`#9E2A2B` at 10% opacity) bounded by a 1px dashed `#9E2A2B` stroke.