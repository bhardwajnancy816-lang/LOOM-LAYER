import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  Scissors, 
  RotateCcw,
  Ruler
} from 'lucide-react';
import { Button } from '../common/Button';
import { simulateWidthSensitivity } from '../../utils/widthSensitivitySimulator';

export function WidthSensitivitySimulatorCard({
  project,
  settings = {},
  onApplyWidth,
  className = ''
}) {
  const [lastAppliedWidth, setLastAppliedWidth] = useState(null);

  const patterns = project?.patterns || [];
  const currentWidth = Number(project?.fabricWidth) || 150;
  const fabricLength = Number(project?.fabricLength) || 500;
  const defects = project?.defects || [];

  // Simulate across candidate widths
  const simulation = useMemo(() => {
    if (!patterns || patterns.length === 0) return null;

    return simulateWidthSensitivity({
      patterns,
      fabricLength,
      currentWidth,
      minSpacing: settings.minSpacing !== undefined ? settings.minSpacing : (project?.minSpacing || 0.5),
      allowRotation: settings.allowRotation !== undefined ? settings.allowRotation : (project?.allowRotation ?? true),
      respectGrain: settings.respectGrain !== undefined ? settings.respectGrain : (project?.respectGrain ?? true),
      fabricPricePerMeter: 200,
      defects
    });
  }, [patterns, fabricLength, currentWidth, settings, defects, project]);

  if (!simulation || !simulation.isValid || !simulation.options || simulation.options.length === 0) {
    return null;
  }

  const handleApply = (targetWidth) => {
    setLastAppliedWidth(targetWidth);
    if (onApplyWidth) {
      onApplyWidth(targetWidth);
    }
    setTimeout(() => setLastAppliedWidth(null), 3000);
  };

  return (
    <div className={`p-5 rounded-2xl border border-cream-300 bg-white shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-cream-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-crimson-50 text-crimson-800 border border-crimson-200">
            <Ruler className="w-5 h-5 text-crimson-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-editorial font-bold text-atelier-950">
                1-Click Roll Width Sensitivity Simulator
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-200">
                Procurement AI
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Evaluates nesting efficiency across commercial roll widths to determine optimal fabric stock purchasing.
            </p>
          </div>
        </div>

        {simulation.recommendedWidth && (
          <div className="text-right shrink-0">
            <span className="text-[11px] font-mono text-stone-500 block">Recommended Purchase:</span>
            <span className="text-xs font-bold text-emerald-700 font-mono flex items-center gap-1 justify-end">
              <CheckCircle2 className="w-3.5 h-3.5" /> {simulation.recommendedWidth} cm Roll
            </span>
          </div>
        )}
      </div>

      {/* 3-Column Comparative Width Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {simulation.options.map((opt) => {
          const isCurrent = opt.width === currentWidth;
          const isRec = opt.isRecommended;
          const isJustApplied = lastAppliedWidth === opt.width;

          return (
            <div
              key={opt.width}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative ${
                isRec
                  ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-500 shadow-xs'
                  : isCurrent
                  ? 'border-crimson-800 bg-crimson-50/30'
                  : 'border-cream-300 bg-cream-50/50 hover:border-cream-400'
              }`}
            >
              {/* Card Badges */}
              <div className="flex items-center justify-between gap-1 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold font-mono text-stone-900">
                    {opt.width} cm
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    ({(opt.width / 2.54).toFixed(0)}")
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {isRec && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      ★ Best Buy
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                      Current
                    </span>
                  )}
                </div>
              </div>

              {/* Main Metrics */}
              <div className="space-y-2 py-2 border-y border-cream-200/80 my-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Marker Yield:</span>
                  <span className={`font-mono font-bold ${isRec ? 'text-emerald-700' : 'text-stone-900'}`}>
                    {opt.utilization}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Linear Roll Cut:</span>
                  <span className="font-mono text-stone-800 font-semibold">
                    {opt.linearUsedM} m
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Offcut Scrap:</span>
                  <span className="font-mono text-stone-600">
                    {opt.wastePercentage}%
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Fabric Cost:</span>
                  <span className="font-mono font-bold text-stone-900">
                    ₹{opt.materialCost.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {isCurrent ? (
                  <div className="w-full py-1.5 px-3 rounded-lg bg-stone-100 text-stone-600 text-center font-mono text-xs font-semibold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active Roll Width
                  </div>
                ) : (
                  <Button
                    variant={isRec ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handleApply(opt.width)}
                    className="w-full font-mono text-xs"
                    disabled={isJustApplied}
                  >
                    {isJustApplied ? 'Applied!' : `Apply ${opt.width} cm Roll`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Plain Language Executive Summary */}
      {simulation.recommendationSummary && (
        <div className="p-3.5 rounded-xl bg-cream-100/80 border border-cream-300 flex items-start gap-2.5 text-xs text-stone-700 leading-relaxed">
          <Sparkles className="w-4 h-4 text-crimson-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-stone-900">Procurement Intelligence: </strong>
            {simulation.recommendationSummary}
          </div>
        </div>
      )}
    </div>
  );
}
