import React, { useState, useEffect } from 'react';
import { Check, Scissors, Cpu } from 'lucide-react';

const OPTIMIZATION_STEPS = [
  { id: 1, label: 'Analyzing fabric dimensions & grain alignment', threshold: 15 },
  { id: 2, label: 'Processing 2D pattern polygon contours', threshold: 38 },
  { id: 3, label: 'Applying cutting clearance & rotation constraints', threshold: 62 },
  { id: 4, label: 'Generating multi-angle packing layouts', threshold: 85 },
  { id: 5, label: 'Comparing global arrangements & maximizing yield', threshold: 98 },
];

export function OptimizationProgressBar({
  onComplete,
  duration = 3500, // 3.5 seconds fallback
  progress: externalProgress,
  statusText: externalStatusText,
  onCancel,
}) {
  const [internalProgress, setInternalProgress] = useState(12);
  const [internalStatus, setInternalStatus] = useState('Analyzing fabric dimensions & weave structure...');

  const isControlled = externalProgress !== undefined;
  const progress = isControlled 
    ? Math.min(100, Math.max(0, Math.round(externalProgress))) 
    : internalProgress;
  const currentStatusText = externalStatusText !== undefined 
    ? externalStatusText 
    : internalStatus;

  useEffect(() => {
    // If progress is controlled by the real solver, do not run artificial timer
    if (isControlled) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Cap at 92% in fallback mode: 100% must never appear before optimization genuinely completes!
      const pct = Math.min(Math.round((elapsed / duration) * 92), 92);
      setInternalProgress(pct);

      if (pct < 25) {
        setInternalStatus('Analyzing fabric dimensions & weave structure...');
      } else if (pct < 50) {
        setInternalStatus('Processing pattern piece contours...');
      } else if (pct < 75) {
        setInternalStatus('Applying spacing & grain direction constraints...');
      } else {
        setInternalStatus('Calculating optimal pattern arrangement...');
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isControlled, duration]);

  return (
    <div className="max-w-xl mx-auto bg-cream-25 rounded-2xl border border-cream-300 shadow-xl p-6 sm:p-8 text-center my-8 animate-in fade-in zoom-in-95">
      {/* Pulse Badge */}
      <div className="mx-auto w-16 h-16 rounded-2xl bg-crimson-50 border border-crimson-200 flex items-center justify-center text-crimson-800 mb-4 shadow-sm relative">
        <Cpu className="w-8 h-8 animate-pulse" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-crimson-600"></span>
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-atelier-950 tracking-tight">
        Optimizing Your Fabric Marker
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        {currentStatusText}
      </p>

      {/* Progress Bar & Percentage */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs font-mono font-bold mb-1.5">
          <span className="text-crimson-900 flex items-center gap-1">
            <Scissors className="w-3.5 h-3.5 text-crimson-700" /> Heuristic Marker Solver
          </span>
          <span className="text-stone-800 text-sm">{progress}%</span>
        </div>
        <div className="w-full h-3 bg-cream-200 rounded-full overflow-hidden p-0.5 border border-cream-300">
          <div
            className="h-full bg-gradient-to-r from-crimson-700 to-amber-700 rounded-full transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Animated Step List */}
      <div className="mt-8 text-left space-y-3 bg-cream-100/70 p-4 sm:p-5 rounded-xl border border-cream-300">
        {OPTIMIZATION_STEPS.map((step) => {
          const isDone = progress >= step.threshold;
          const isCurrent = !isDone && progress >= step.threshold - 25;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 text-xs transition-colors duration-200 ${
                isDone
                  ? 'text-stone-900 font-medium'
                  : isCurrent
                  ? 'text-crimson-800 font-semibold'
                  : 'text-stone-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-all duration-200 ${
                  isDone
                    ? 'bg-crimson-700 text-white shadow-2xs'
                    : isCurrent
                    ? 'bg-crimson-100 text-crimson-800 ring-2 ring-crimson-400 animate-pulse'
                    : 'bg-cream-200 text-stone-400'
                }`}
              >
                {isDone ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
              </div>
              <span className="flex-1">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Optional Cancel Action */}
      {onCancel && (
        <div className="mt-6 pt-4 border-t border-cream-300">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-stone-500 hover:text-crimson-800 transition-colors px-4 py-1.5 rounded-lg border border-cream-300 hover:border-crimson-300 bg-cream-50"
          >
            Cancel Optimization
          </button>
        </div>
      )}
    </div>
  );
}
