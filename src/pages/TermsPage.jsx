import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, ArrowLeft, Scissors, AlertTriangle, Layers, FileCheck } from 'lucide-react';

export function TermsPage() {
  const lastUpdated = 'October 21, 2026';

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto bg-cream-50 min-h-screen">
      {/* Breadcrumb Navigation */}
      <div className="mb-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-crimson-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-cream-300 pb-8 mb-10">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-cream-100 border border-cream-300 text-stone-800 text-xs font-mono font-medium mb-4">
          <Scale className="w-3.5 h-3.5 text-crimson-700" />
          <span>LEGAL TERMS & OPERATIONAL CONDITIONS</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-atelier-950 tracking-tight">
          Terms & Conditions of Service
        </h1>
        <p className="mt-3 text-sm text-stone-500 font-mono">
          Last updated: {lastUpdated} • Version 2.1
        </p>
      </div>

      {/* Key Operational Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="p-4 rounded-lg bg-cream-25 border border-cream-300">
          <div className="w-8 h-8 rounded-md bg-crimson-50 border border-crimson-200 flex items-center justify-center text-crimson-800 mb-3">
            <Scissors className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-atelier-950 text-sm font-mono">Industrial Manufacturing</h2>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed">
            Governs automated nesting, marker creation, and cut-path generation for textile cutting.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-cream-25 border border-cream-300">
          <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-3">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-atelier-950 text-sm font-mono">Machine Operator Safety</h2>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed">
            Cutting machine operators must verify blade clearances and material tolerances before live cutting.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-cream-25 border border-cream-300">
          <div className="w-8 h-8 rounded-md bg-cream-100 border border-cream-300 flex items-center justify-center text-crimson-800 mb-3">
            <FileCheck className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-atelier-950 text-sm font-mono">Pattern IP Ownership</h2>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed">
            Users retain 100% intellectual property ownership of all uploaded patterns and generated layouts.
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="space-y-10 text-stone-700 text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-crimson-700" />
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using the Loom & Layer platform, software tools, marker generation algorithms, and export utilities, you agree to be legally bound by these Terms and Conditions. If you are entering into this agreement on behalf of a garment manufacturer, textile facility, or apparel brand, you represent that you possess the authority to bind such entity.
          </p>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            2. Software Capabilities and Use
          </h2>
          <p>
            Loom & Layer provides 2D pattern nesting, marker making, material yield optimization, and pre-consumer textile waste metrics. The software is provided to assist production planning, pattern digitization, and cutting room workflow optimization.
          </p>
          <ul className="mt-3 space-y-2 list-disc list-inside text-stone-600">
            <li>Users may generate layout markers for single-ply or multi-ply cutting tables.</li>
            <li>Users are responsible for ensuring correct fabric roll width, selvage borders, and usable fabric parameters.</li>
            <li>Warp, weft, and bias grainline constraints configured by the user must be inspected prior to final physical cutting.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            3. Machine Operator Pre-Cut Verification
          </h2>
          <p>
            <strong>Important Safety Notice:</strong> While Loom & Layer computes minimum blade clearances and collision-free piece placements using multi-orientation geometric heuristics, physical cutting machinery (including CNC reciprocating knives, laser cutting tables, and ultrasonic cutters) carries inherent mechanical hazards:
          </p>
          <p className="mt-2 text-stone-600">
            Operators must perform dry-run head simulations and confirm physical toolhead offsets, vacuum suction pressure, and ply-holddown parameters prior to engaging live blades or laser beams. Loom & Layer shall not be held liable for fabric damage, mechanical collisions, or blade wear resulting from improper machine calibration.
          </p>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            4. Intellectual Property & License Rights
          </h2>
          <p>
            You retain all rights, title, and interest in and to any pattern files, SVG contours, DXF geometry, or garment design specifications you input into the system. Loom & Layer grants you a non-exclusive, worldwide license to use, download, modify, and physically cut all markers and nesting outputs produced through your authorized sessions.
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            5. Environmental Metrics & Disclaimers
          </h2>
          <p>
            Environmental savings indicators (such as water volume conserved, CO₂ offset equivalents, and pre-consumer textile waste averted) are calculated based on recognized standard lifecycle assessment (LCA) benchmarks for cotton, denim, linen, polyester, and wool fabrics. While computed with high fidelity, these figures serve as engineering estimates and do not constitute certified statutory audit statements without independent third-party verification.
          </p>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            6. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, Loom & Layer and its developers shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use the optimization solver, including raw fabric waste, manufacturing delays, or tool downtime.
          </p>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            7. Contact Information
          </h2>
          <p>
            For legal inquiries, enterprise service agreements, or on-premises licensing requests, please reach our legal and operations team at <span className="font-mono text-stone-900">legal@loomandlayer.com</span>.
          </p>
        </section>

      </div>
    </div>
  );
}
