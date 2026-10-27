import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Lock, Database, EyeOff, FileText, CheckCircle2 } from 'lucide-react';

export function PrivacyPolicyPage() {
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
          <ShieldCheck className="w-3.5 h-3.5 text-crimson-700" />
          <span>LEGAL COMPLIANCE & DATA INTEGRITY</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-atelier-950 tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-stone-500 font-mono">
          Last updated: {lastUpdated} • Version 2.1
        </p>
      </div>

      {/* Key Guarantees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="p-4 rounded-lg bg-cream-25 border border-cream-300">
          <div className="w-8 h-8 rounded-md bg-crimson-50 border border-crimson-200 flex items-center justify-center text-crimson-800 mb-3">
            <Lock className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-atelier-950 text-sm font-mono">Client-Side Processing</h2>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed">
            Garment geometry and nesting computations execute in your local browser sandbox.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-cream-25 border border-cream-300">
          <div className="w-8 h-8 rounded-md bg-cream-200 border border-cream-300 flex items-center justify-center text-atelier-900 mb-3">
            <EyeOff className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-atelier-950 text-sm font-mono">Zero IP Harvesting</h2>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed">
            Your proprietary apparel patterns and cutting templates are never retained or transferred.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-cream-25 border border-cream-300">
          <div className="w-8 h-8 rounded-md bg-cream-100 border border-cream-300 flex items-center justify-center text-crimson-800 mb-3">
            <Database className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-atelier-950 text-sm font-mono">Local Storage Control</h2>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed">
            All cutting project states, roll dimensions, and yield logs reside in your device storage.
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="space-y-10 text-stone-700 text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-crimson-700" />
            1. Scope and Architecture
          </h2>
          <p>
            Loom & Layer is committed to protecting the proprietary intellectual property and operational data of apparel designers, pattern makers, and industrial textile manufacturers. This policy details how pattern files, dimensions, and operational data are handled during your use of our software suite.
          </p>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            2. Pattern Geometry & Intellectual Property
          </h2>
          <p>
            We recognize that garment pattern specifications (including DXF, AAMA, ASTM, SVG, and raster templates) represent trade secrets and critical intellectual property:
          </p>
          <ul className="mt-3 space-y-2 list-disc list-inside text-stone-600">
            <li>
              <strong>Local Computation:</strong> All 2D polygon parsing, bounding box calculation, convex hull computations, and heuristic nesting are performed entirely within your client runtime environment.
            </li>
            <li>
              <strong>No Cloud Storage of CAD Assets:</strong> We do not upload your raw garment geometry or graded pattern contours to external servers without your explicit permission.
            </li>
            <li>
              <strong>Ownership:</strong> You retain complete, unencumbered ownership of all markers, layouts, DXF exports, and cut sequences generated by the platform.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            3. Project Data Storage & State
          </h2>
          <p>
            Project configurations (such as roll width, length, fabric composition, blade tolerances, and pattern quantities) are saved directly in your browser's local application storage (`localStorage` / `IndexedDB`). You have complete authority to delete or clear project data at any time via the project settings or by clearing your browser cache.
          </p>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            4. Environmental & ESG Analytics
          </h2>
          <p>
            Material utilization figures, fabric scrap estimations, and environmental footprint calculations (water volume and carbon offset factors) are generated deterministically based on standard textile industry conversion coefficients. These metrics are compiled locally for your internal reporting and export.
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            5. Cookies and Web Storage
          </h2>
          <p>
            Loom & Layer does not employ intrusive third-party cross-site advertising trackers or sell operational behavioral data to third-party data brokers. Essential local storage keys are utilized strictly to maintain application state, theme preference (Dark/Light mode), and project sessions.
          </p>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-lg font-bold text-atelier-950 mb-3">
            6. Inquiries and Compliance
          </h2>
          <p>
            If you have questions regarding our data architecture or wish to request specific enterprise privacy configurations for on-premise deployments, contact our engineering team at <span className="font-mono text-stone-900">privacy@loomandlayer.com</span>.
          </p>
        </section>

      </div>

      {/* Footer Assurance Banner */}
      <div className="mt-12 p-4 rounded-lg bg-crimson-50/70 border border-crimson-200 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-crimson-700 shrink-0 mt-0.5" />
        <div className="text-xs text-crimson-950">
          <p className="font-bold">Enterprise Privacy Standard</p>
          <p className="mt-0.5 text-crimson-800">
            Designed to meet strict manufacturing data confidentiality and intellectual property non-disclosure standards for global textile supply chains.
          </p>
        </div>
      </div>
    </div>
  );
}
