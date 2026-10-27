import React from 'react';
import { 
  Sparkles, 
  Compass, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Info, 
  Eye, 
  Check, 
  ArrowRight,
  Layers
} from 'lucide-react';
import { Button } from '../common/Button';

export function FabricAnalysisCard({
  analysis,
  isAnalyzing = false,
  currentGrainDirection = 'Vertical',
  onApplyGrainDirection,
  onReanalyze
}) {
  if (isAnalyzing) {
    return (
      <div className="p-5 rounded-xl border border-cream-300 bg-cream-50/70 space-y-3 animate-pulse">
        <div className="flex items-center gap-2 text-crimson-800 text-xs font-mono font-bold">
          <Sparkles className="w-4 h-4 animate-spin text-crimson-700" />
          <span>Analyzing fabric weave, clarity, and directional grain...</span>
        </div>
        <p className="text-[11px] text-stone-500 leading-relaxed font-sans">
          Running local computer vision edge-gradient histogram analysis to evaluate surface texture, exposure contrast, and yarn alignment.
        </p>
      </div>
    );
  }

  if (!analysis) return null;

  const { clarity, texture, pattern, grain, externalAiStatus, provider } = analysis;
  const isGrainDetected = grain && grain.detectedDirection && grain.detectedDirection !== 'Uncertain';
  const isGrainMatchesCurrent = isGrainDetected && currentGrainDirection === grain.detectedDirection;

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-cream-300 bg-cream-25 space-y-4">
      {/* Header & Service Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-cream-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-crimson-100 text-crimson-800">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-atelier-950 uppercase tracking-wider font-mono">
              Fabric Visual Analysis
            </h4>
            <span className="text-[10px] text-stone-500 font-sans block">
              Automated surface texture, clarity, and directional yarn inspection
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cream-100 text-stone-700 border border-cream-300" title={externalAiStatus}>
            <Eye className="w-3 h-3 text-stone-500" />
            <span>Local CV Engine</span>
          </span>
          {onReanalyze && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReanalyze}
              className="text-[11px] h-7 px-2"
            >
              Re-analyze
            </Button>
          )}
        </div>
      </div>

      {/* 3 Metric Dimension Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Clarity & Exposure */}
        <div className="p-3 rounded-lg bg-white border border-cream-300 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-stone-700">
            <span>Image Clarity</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                clarity.rating === 'Good'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : clarity.rating === 'Marginal'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {clarity.rating}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-stone-900 font-sans">
            {clarity.exposure}
          </div>
          <p className="text-[10px] text-stone-500 leading-tight">
            {clarity.reason}
          </p>
        </div>

        {/* Surface Texture */}
        <div className="p-3 rounded-lg bg-white border border-cream-300 space-y-1.5">
          <div className="text-xs font-mono font-bold text-stone-700">
            Surface Texture
          </div>
          <div className="text-[11px] font-semibold text-stone-900 font-sans">
            {texture?.appearance || 'Standard Weave'}
          </div>
          <p className="text-[10px] text-stone-500 leading-tight">
            {texture?.description || 'Surface variation consistent with woven yardage.'}
          </p>
        </div>

        {/* Pattern / Surface Print */}
        <div className="p-3 rounded-lg bg-white border border-cream-300 space-y-1.5">
          <div className="text-xs font-mono font-bold text-stone-700">
            Surface Pattern
          </div>
          <div className="text-[11px] font-semibold text-stone-900 font-sans">
            {pattern?.type || 'Solid / Uniform Color'}
          </div>
          <p className="text-[10px] text-stone-500 leading-tight">
            {pattern?.description || 'Consistent color tone throughout swatch.'}
          </p>
        </div>
      </div>

      {/* Grain Direction Assistance & Confirmation Section */}
      <div className="p-3.5 rounded-lg bg-white border border-cream-300 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-crimson-700 shrink-0" />
            <div>
              <span className="text-xs font-bold text-stone-900 font-sans">
                Grain Direction Assistance:
              </span>
              <span className="ml-1.5 text-xs font-mono font-bold text-crimson-900">
                {grain?.detectedDirection || 'Uncertain'}
              </span>
              {grain?.confidence && grain.confidence !== 'None' && (
                <span className="ml-1.5 text-[10px] font-mono font-medium text-stone-500">
                  ({grain.confidence} confidence)
                </span>
              )}
            </div>
          </div>

          {/* Grain Confirmation Action */}
          {isGrainDetected && onApplyGrainDirection && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isGrainMatchesCurrent ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Applied to Project</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onApplyGrainDirection(grain.detectedDirection)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-crimson-700 text-white hover:bg-crimson-800 transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <span>Apply Detected ({grain.detectedDirection})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Evidence note */}
        <p className="text-[11px] text-stone-600 leading-relaxed font-sans bg-cream-50 p-2.5 rounded border border-cream-200">
          {grain?.evidenceNote || 'Visual evidence evaluated from directional gradient distributions.'}
        </p>

        {/* Manual Grain Override Buttons if uncertain or user wants to adjust */}
        {onApplyGrainDirection && (
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
              Set Primary Grain:
            </span>
            {['Vertical', 'Horizontal', 'Flexible'].map((dir) => {
              const isSelected = currentGrainDirection === dir;
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onApplyGrainDirection(dir)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-crimson-50 text-crimson-900 border-crimson-700 font-bold ring-1 ring-crimson-700'
                      : 'bg-white text-stone-700 border-cream-300 hover:bg-cream-100'
                  }`}
                >
                  {dir} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Physical Integrity Reminder */}
      <div className="text-[10px] text-stone-500 font-sans flex items-start gap-1.5 leading-relaxed">
        <Info className="w-3 h-3 text-stone-400 shrink-0 mt-0.5" />
        <span>
          <strong>Data Integrity Note:</strong> Fabric analysis provides visual pattern and grain orientation assistance. It does not measure fabric width, roll length, elasticity, or GSM; physical measurements must remain user-confirmed.
        </span>
      </div>
    </div>
  );
}
