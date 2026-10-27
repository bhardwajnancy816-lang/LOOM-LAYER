import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Leaf, 
  Scissors, 
  Cpu, 
  ChevronRight,
  Layers,
  Compass,
  FileCheck2,
  Gauge
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { FabricCanvas } from '../components/fabric/FabricCanvas';
import { useProjects } from '../context/useProjects';

export function LandingPage() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const demoProject = projects[0];

  return (
    <div className="flex flex-col min-h-screen bg-cream-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-16 lg:pb-24 border-b border-cream-300 bg-cream-100/60 fabric-weave-pattern">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Authoritative atelier headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-editorial font-bold text-atelier-950 tracking-tight leading-[1.14]">
                Automated Fabric Nesting & Marker Planning
              </h1>

              <p className="text-base sm:text-lg text-stone-700 font-normal leading-relaxed max-w-xl">
                High-density layout optimization for garment ateliers and industrial cutting rooms. Maximize roll yield, enforce warp and weft grainlines, and eliminate pre-consumer scrap with heuristic 2D bin packing.
              </p>

              {/* CTAs with cloth buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  icon={ArrowRight}
                  iconPosition="right"
                  onClick={() => navigate('/project/new')}
                  className="shadow-sm font-semibold"
                >
                  Create Cutting Project
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate('/dashboard')}
                >
                  Open Dashboard
                </Button>
              </div>

              {/* Technical Benchmarks (Concrete & Attributed) */}
              <div className="pt-6 border-t border-cream-300 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold font-mono text-atelier-950">94.2%</div>
                  <div className="text-xs text-stone-600 font-medium">Peak Marker Yield</div>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">Apparel benchmark</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-crimson-700">65%</div>
                  <div className="text-xs text-stone-600 font-medium">Offcut Scrap Diverted</div>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">vs manual layout</div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-atelier-950">&lt; 2.8s</div>
                  <div className="text-xs text-stone-600 font-medium">Solver Convergence</div>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">Client-side runtime</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Fabric-Cutting Preview */}
            <div className="lg:col-span-6 relative">
              <div className="relative rounded-xl bg-cream-25 border border-cream-300 shadow-md overflow-hidden p-3 sm:p-4 transition-all">
                {/* Visual Header Pill */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-cream-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-crimson-700" />
                    <span className="text-xs font-mono font-bold text-atelier-900 uppercase tracking-wider">
                      Interactive 2D Marker Canvas
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-crimson-900 bg-crimson-50 px-2 py-0.5 rounded border border-crimson-200">
                    94.2% Roll Yield
                  </span>
                </div>

                {/* Interactive Fabric Canvas Preview */}
                <div className="mt-3">
                  <FabricCanvas
                    project={demoProject}
                    compact={true}
                    interactive={false}
                  />
                </div>

                {/* Pattern labels indicator */}
                <div className="mt-3 flex items-center justify-between px-1 text-xs font-medium text-stone-500">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-stone-500">Pieces:</span>
                    <span className="px-1.5 py-0.5 rounded bg-cream-100 text-stone-800 border border-cream-300">FRONT</span>
                    <span className="px-1.5 py-0.5 rounded bg-crimson-50 text-crimson-800 border border-crimson-200">BACK</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">SLEEVE</span>
                    <span className="px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">COLLAR</span>
                  </div>
                  <button
                    onClick={() => navigate(`/project/${demoProject.id}/result`)}
                    className="text-crimson-800 hover:text-crimson-950 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>Inspect Cut Path</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="py-16 sm:py-20 bg-cream-50 border-b border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-800 mb-2">
              Atelier Marker Architecture
            </h2>
            <h3 className="text-3xl sm:text-4xl font-editorial font-bold text-atelier-950 tracking-tight">
              Engineered for Precision Cutting Rooms
            </h3>
            <p className="mt-2 text-sm text-stone-600">
              Deterministic geometry packing algorithms built to reduce raw material expenditure and shorten cutting cycles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card hoverEffect padding="p-6" className="border-cream-300 bg-cream-25 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-crimson-50 border border-crimson-200 flex items-center justify-center text-crimson-800 mb-5">
                  <Cpu className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-editorial font-bold text-atelier-950">
                  Multi-Orientation Heuristic Nesting
                </h4>
                <p className="mt-2.5 text-xs text-stone-600 leading-relaxed">
                  Evaluates candidate placements across allowed rotational increments (0°, 90°, 180°, 270°) to compact irregular garment pieces with millimeter clearance tolerances.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-cream-200 flex items-center gap-1.5 text-xs font-mono font-medium text-crimson-800">
                <Layers className="w-3.5 h-3.5" />
                <span>No-Fit Polygon (NFP) Packing</span>
              </div>
            </Card>

            {/* Card 2 */}
            <Card hoverEffect padding="p-6" className="border-cream-300 bg-cream-25 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-cream-200 border border-cream-300 flex items-center justify-center text-atelier-900 mb-5">
                  <Scissors className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-editorial font-bold text-atelier-950">
                  Warp & Weft Grainline Enforcement
                </h4>
                <p className="mt-2.5 text-xs text-stone-600 leading-relaxed">
                  Preserves textile drape integrity by respecting fabric grain constraints. Configure strict rotational locks for directional weaves, velvet, stripes, and knits.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-cream-200 flex items-center gap-1.5 text-xs font-mono font-medium text-stone-700">
                <Compass className="w-3.5 h-3.5 text-stone-500" />
                <span>Grainline Alignment Verification</span>
              </div>
            </Card>

            {/* Card 3 */}
            <Card hoverEffect padding="p-6" className="border-cream-300 bg-cream-25 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 mb-5">
                  <Leaf className="w-5 h-5" />
                </div>
                <h4 className="text-lg font-editorial font-bold text-atelier-950">
                  Quantitative ESG & Yield Auditing
                </h4>
                <p className="mt-2.5 text-xs text-stone-600 leading-relaxed">
                  Translate cut efficiency directly into sustainability compliance. Generate automated audit reports tracking square meters saved, freshwater conserved, and pre-consumer waste diverted.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-cream-200 flex items-center gap-1.5 text-xs font-mono font-medium text-crimson-800">
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Standard LCA Environmental Ledger</span>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 bg-cream-100/50 border-b border-cream-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-crimson-800 mb-2">
              Atelier Marker Workflow
            </h2>
            <h3 className="text-3xl sm:text-4xl font-editorial font-bold text-atelier-950 tracking-tight">
              From Roll Specifications to CNC Cut Plan
            </h3>
            <p className="mt-2 text-sm text-stone-600">
              Four deterministic steps to prepare, nest, and verify cutting markers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Step 1 */}
            <div className="bg-cream-25 rounded-lg border border-cream-300 p-5 shadow-2xs">
              <div className="w-7 h-7 rounded-md bg-atelier-900 text-cream-50 font-mono font-bold text-xs flex items-center justify-center mb-3">
                01
              </div>
              <h4 className="font-bold text-atelier-950 text-sm">Define Fabric Roll</h4>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Set roll width, total length, selvage offset margins, and material type (Cotton, Denim, Linen, or Synthetic).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-cream-25 rounded-lg border border-cream-300 p-5 shadow-2xs">
              <div className="w-7 h-7 rounded-md bg-atelier-900 text-cream-50 font-mono font-bold text-xs flex items-center justify-center mb-3">
                02
              </div>
              <h4 className="font-bold text-atelier-950 text-sm">Input Garment Pieces</h4>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Specify pattern pieces with target bundle quantities, rotation restrictions, and boundary tolerances.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-cream-25 rounded-lg border border-cream-300 p-5 shadow-2xs">
              <div className="w-7 h-7 rounded-md bg-atelier-900 text-cream-50 font-mono font-bold text-xs flex items-center justify-center mb-3">
                03
              </div>
              <h4 className="font-bold text-atelier-950 text-sm">Run Nesting Solver</h4>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Execute heuristic 2D bin packing to compute collision-free, high-density pattern layouts in seconds.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-cream-25 rounded-lg border border-cream-300 p-5 shadow-2xs">
              <div className="w-7 h-7 rounded-md bg-crimson-800 text-cream-50 font-mono font-bold text-xs flex items-center justify-center mb-3">
                04
              </div>
              <h4 className="font-bold text-atelier-950 text-sm">Verify & Export</h4>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Simulate cutting toolpath sequence, inspect blade clearances, and export marker data and ESG sustainability reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Industrial Atelier CTA Banner */}
      <section className="py-16 sm:py-20 bg-atelier-950 text-cream-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-atelier-900 text-cream-200 border border-atelier-800 text-xs font-mono font-medium">
            <Gauge className="w-3.5 h-3.5 text-crimson-400" /> ATELIER BENCHMARK
          </div>

          <h2 className="text-3xl sm:text-4xl font-editorial font-bold text-cream-25 tracking-tight">
            Ready to optimize your cutting room yield?
          </h2>

          <p className="text-stone-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Create an automated marker project, evaluate pattern layouts, and measure fabric scrap reduction immediately.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={ArrowRight}
              iconPosition="right"
              onClick={() => navigate('/project/new')}
            >
              Start New Project
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/dashboard')}
              className="bg-transparent text-cream-100 border-atelier-700 hover:bg-atelier-900 hover:text-white"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
