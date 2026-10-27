import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  RotateCcw, 
  ArrowRight, 
  BarChart3, 
  TrendingUp, 
  Scissors, 
  Info,
  Sliders,
  Check
} from 'lucide-react';
import { Modal } from '../common/FeedbackAndNavigation';
import { Button } from '../common/Button';
import { 
  solveCutOrderPlan, 
  generateCopMarkerPatterns, 
  COP_SIZES 
} from '../../utils/cutOrderPlanner';
import { useProjects } from '../../context/useProjects';

const DEMAND_PRESETS = [
  {
    name: 'Industrial Run (960 pcs)',
    desc: '1S : 3M : 3L : 1XL ratio',
    maxPlies: 120,
    demand: { XS: 0, S: 120, M: 360, L: 360, XL: 120, XXL: 0 }
  },
  {
    name: 'Boutique Batch (120 pcs)',
    desc: 'Curved curve distribution',
    maxPlies: 60,
    demand: { XS: 10, S: 30, M: 40, L: 30, XL: 10, XXL: 0 }
  },
  {
    name: 'Balanced Order (240 pcs)',
    desc: '1 : 2 : 2 : 1 bell curve',
    maxPlies: 80,
    demand: { XS: 0, S: 40, M: 80, L: 80, XL: 40, XXL: 0 }
  }
];

export function CutOrderPlanningModal({
  isOpen,
  onClose,
  project,
  onSuccess
}) {
  const { updateProject } = useProjects();

  const [demand, setDemand] = useState({
    XS: 0,
    S: 120,
    M: 360,
    L: 360,
    XL: 120,
    XXL: 0
  });

  const [maxPlies, setMaxPlies] = useState(120);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Compute live COP solution
  const plan = useMemo(() => {
    return solveCutOrderPlan(demand, {
      maxPlies: Number(maxPlies) || 100,
      allowMultiLay: true,
      baseYieldEstimate: project?.utilization || 82.0
    });
  }, [demand, maxPlies, project?.utilization]);

  const handleApplyPreset = (preset) => {
    setDemand({ ...preset.demand });
    setMaxPlies(preset.maxPlies);
  };

  const handleSizeChange = (size, value) => {
    const qty = Math.max(0, parseInt(value, 10) || 0);
    setDemand((prev) => ({ ...prev, [size]: qty }));
  };

  const handleGenerateGradedPieces = () => {
    if (!project?.id || !plan?.isValid || plan.lays.length === 0) return;

    const basePatterns = project.patterns || [];
    if (basePatterns.length === 0) {
      alert('Please have at least one base garment template in your project before generating graded pieces.');
      return;
    }

    // Use primary lay ratio to grade pieces for Stage 2 Nesting
    const primaryLay = plan.lays[0];
    const gradedPieces = generateCopMarkerPatterns(basePatterns, primaryLay.bundleRatio);

    const totalPieces = gradedPieces.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

    updateProject(project.id, {
      patterns: gradedPieces,
      totalPieces,
      copPlan: {
        totalGarmentsDemand: plan.totalGarmentsDemand,
        bundleRatioSummary: plan.bundleRatioSummary,
        interlockingYieldBoostPp: plan.interlockingYieldBoostPp,
        lays: plan.lays
      }
    });

    setAppliedSuccess(true);
    setTimeout(() => {
      setAppliedSuccess(false);
      onClose();
      if (onSuccess) onSuccess();
    }, 1200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stage 1 AI: Cut-Order Planning (COP) Multi-Ply Matrix"
      subtitle="Optimize cutting table spread plies, bundle ratios, and interlocking multi-size yield boost"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 text-stone-800">
        {/* Preset Selector */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono mb-2">
            Quick Production Presets:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {DEMAND_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="p-2.5 rounded-xl border border-cream-300 hover:border-crimson-700 bg-white hover:bg-crimson-50/40 text-left transition-all cursor-pointer text-xs"
              >
                <div className="font-bold text-stone-900">{preset.name}</div>
                <div className="text-[11px] text-stone-500 font-mono">{preset.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Customer Demand Matrix Inputs */}
        <div className="p-4 rounded-xl border border-cream-300 bg-cream-50/60 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider font-mono text-stone-700">
              Customer Size Demand Quantities (Garments):
            </span>
            <span className="text-xs font-mono font-bold text-crimson-900 bg-crimson-100/70 px-2 py-0.5 rounded">
              Total: {plan.totalGarmentsDemand} Garments
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
            {COP_SIZES.map((size) => (
              <div key={size} className="p-2.5 rounded-lg bg-white border border-cream-300 text-center shadow-2xs">
                <label className="block text-xs font-bold font-mono text-stone-700 mb-1">
                  Size {size}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={demand[size] || 0}
                  onChange={(e) => handleSizeChange(size, e.target.value)}
                  className="w-full px-2 py-1 text-center font-mono font-bold text-stone-900 bg-cream-50 border border-cream-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-crimson-700"
                />
              </div>
            ))}
          </div>

          {/* Max Plies (Spread Height) */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-cream-200">
            <div>
              <span className="text-xs font-semibold text-stone-800 font-mono">
                Fabric Table Max Plies (Spread Stack Height):
              </span>
              <p className="text-[11px] text-stone-500">
                Maximum fabric layers blade knife can cut cleanly in single traverse
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="20"
                max="150"
                step="10"
                value={maxPlies}
                onChange={(e) => setMaxPlies(Number(e.target.value))}
                className="w-28 accent-crimson-800 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white border border-cream-300 rounded text-stone-900 w-16 text-center">
                {maxPlies} plies
              </span>
            </div>
          </div>
        </div>

        {/* Live COP Optimization Results Strip */}
        {plan.isValid && (
          <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    Optimal Multi-Ply Lay Schedule
                  </h4>
                  <p className="text-xs text-stone-600 font-mono">
                    {plan.bundleRatioSummary}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-800 block">
                  Interlocking Yield Boost:
                </span>
                <span className="text-xs font-bold font-mono text-emerald-700 flex items-center gap-1 justify-end">
                  <TrendingUp className="w-3.5 h-3.5" /> +{plan.interlockingYieldBoostPp}% Boost
                </span>
              </div>
            </div>

            {/* Lay breakdown cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {plan.lays.map((lay) => (
                <div key={lay.layNumber} className="p-3 rounded-lg bg-white border border-cream-300 text-xs space-y-1.5">
                  <div className="flex justify-between items-center font-bold text-stone-900">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-crimson-700" /> Lay #{lay.layNumber}
                    </span>
                    <span className="font-mono text-emerald-700">
                      {lay.plyCount} Plies ({lay.garmentsProduced} garments)
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-stone-600">
                    Bundle: {Object.entries(lay.bundleRatio).filter(([, q]) => q > 0).map(([s, q]) => `${q}${s}`).join(' : ')} ({lay.bundleSizeTotal} garments / ply)
                  </div>
                </div>
              ))}
            </div>

            {/* AI Interlocking Explanation */}
            <div className="text-[11px] text-stone-600 leading-relaxed pt-1 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>
                <strong>Stage 1 Advantage:</strong> Nesting small (S/XS) pieces inside large (L/XL) hollow silhouettes (e.g. armholes, crotches) achieves +{plan.interlockingYieldBoostPp}% higher yield than single-size spreads, predicting <strong>{plan.predictedMultiSizeYield}%</strong> final marker efficiency.
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-between border-t border-cream-300">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleGenerateGradedPieces}
            disabled={!plan.isValid || appliedSuccess}
            className="font-bold shadow-md"
            icon={appliedSuccess ? Check : Scissors}
          >
            {appliedSuccess ? 'Graded Pieces Applied!' : 'Apply Multi-Size Bundle to Marker (Stage 2)'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
