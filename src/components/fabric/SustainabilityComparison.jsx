import React, { useMemo } from 'react';
import { 
  Leaf, 
  Droplets, 
  Wind, 
  TrendingDown, 
  Scissors, 
  ShieldCheck, 
  Info,
  Scale
} from 'lucide-react';
import { Card } from '../common/Card';
import { MetricCard } from '../common/MetricCard';
import { getSustainabilityWording } from '../../utils/sustainabilityWording.js';
import { optimizeFabricCutting } from '../../utils/fabricOptimizer.js';

export { getSustainabilityWording };

export function SustainabilityComparison({ project }) {
  const currentVariant = typeof project?.selectedLayoutIndex === 'number'
    ? project.selectedLayoutIndex
    : (typeof project?.layoutVariant === 'number' ? project.layoutVariant : 0);
  const totalVariants = project?.candidateLayoutsCount || 1;

  // Safely evaluate best candidate (variant 0) in-memory if project has an alternative candidate currently active
  const bestCandidate = useMemo(() => {
    if (!project || !Array.isArray(project.patterns) || project.patterns.length === 0 || currentVariant === 0) {
      return null;
    }
    try {
      return optimizeFabricCutting({
        fabricWidth: Number(project.fabricWidth) || 150,
        fabricLength: Number(project.fabricLength) || 500,
        patterns: project.patterns,
        extractedShape: project.extractedShape,
        minSpacing: project.minSpacing !== undefined ? Number(project.minSpacing) : 0.5,
        allowRotation: project.allowRotation !== undefined ? Boolean(project.allowRotation) : true,
        respectGrain: project.respectGrain !== undefined ? Boolean(project.respectGrain) : true,
        optimizationPriority: project.optimizationPriority || 'Minimum Fabric Waste',
        layoutVariant: 0,
        useParametricContour: Boolean(project.useParametricContour)
      }, {
        maxEvaluations: 30,
        maxTimeMs: 4000
      });
    } catch (err) {
      console.warn('Could not derive candidate 0 for sustainability comparison:', err);
      return null;
    }
  }, [project?.id, project?.patterns, project?.fabricWidth, project?.fabricLength, currentVariant]);

  // Use bestCandidate when available, otherwise the project's current layout
  const activeLayout = bestCandidate || project;
  const isUsingBestCandidate = Boolean(bestCandidate);

  // Dimensions & Areas
  const fabricWidthCm = Number(project?.fabricWidth) || 150;
  const fabricWidthM = fabricWidthCm / 100;
  const fabricLengthCm = Number(project?.fabricLength) || 500;
  const fabricLengthM = fabricLengthCm / 100;
  const totalRollAreaM2 = Number(((fabricWidthCm * fabricLengthCm) / 10000).toFixed(3));

  // Placed pattern area (in cm² and m²)
  const placedPatternAreaCm2 = activeLayout?.placedPatternAreaCm2 !== undefined
    ? Number(activeLayout.placedPatternAreaCm2)
    : (activeLayout?.placedPatternAreaM2 !== undefined
      ? Number(activeLayout.placedPatternAreaM2) * 10000
      : (activeLayout?.usedArea !== undefined
        ? Number(activeLayout.usedArea) * 10000
        : (Array.isArray(activeLayout?.layoutPlacements) && activeLayout.layoutPlacements.length > 0
          ? activeLayout.layoutPlacements.reduce((sum, p) => sum + (p.polygonArea !== undefined ? p.polygonArea : (p.width * p.height)), 0)
          : 0)));

  // Actual cut length (cm and m)
  const actualCutLengthCm = activeLayout?.actualLengthUsedCm !== undefined && Number(activeLayout.actualLengthUsedCm) > 0
    ? Number(activeLayout.actualLengthUsedCm)
    : (activeLayout?.actualLengthUsedM !== undefined && Number(activeLayout.actualLengthUsedM) > 0
      ? Number(activeLayout.actualLengthUsedM) * 100
      : (Array.isArray(activeLayout?.layoutPlacements) && activeLayout.layoutPlacements.length > 0
        ? Math.max(...activeLayout.layoutPlacements.map(p => p.x + p.width))
        : fabricLengthCm));
  const actualCutLengthM = Number((actualCutLengthCm / 100).toFixed(2));

  // Baseline validation & length
  const hasBaseline = Boolean(project?.hasValidBaseline || activeLayout?.hasValidBaseline);
  const baselineCutLengthCm = hasBaseline && (activeLayout?.baselineLengthUsedCm !== undefined || project?.baselineLengthUsedCm !== undefined)
    ? Number(activeLayout?.baselineLengthUsedCm !== undefined ? activeLayout.baselineLengthUsedCm : project.baselineLengthUsedCm)
    : (hasBaseline && (activeLayout?.baselineLengthUsedM !== undefined || project?.baselineLengthUsedM !== undefined)
      ? Number(activeLayout?.baselineLengthUsedM !== undefined ? activeLayout.baselineLengthUsedM : project.baselineLengthUsedM) * 100
      : null);
  const baselineCutLengthM = baselineCutLengthCm !== null ? Number((baselineCutLengthCm / 100).toFixed(2)) : null;

  // Active Marker Efficiency: placedPatternArea / (fabricWidth * actualCutLength) * 100
  const activeMarkerAreaCm2 = actualCutLengthCm > 0 && fabricWidthCm > 0 ? actualCutLengthCm * fabricWidthCm : 0;
  const markerEfficiency = activeLayout?.markerUtilization !== undefined
    ? Number(activeLayout.markerUtilization)
    : (activeMarkerAreaCm2 > 0 && placedPatternAreaCm2 > 0
      ? Number(((placedPatternAreaCm2 / activeMarkerAreaCm2) * 100).toFixed(1))
      : (activeLayout?.utilization !== undefined ? Number(activeLayout.utilization) : 0));
  const markerWaste = Number((100 - markerEfficiency).toFixed(1));

  // Baseline Marker Efficiency
  const baselineMarkerAreaCm2 = baselineCutLengthCm !== null && baselineCutLengthCm > 0 && fabricWidthCm > 0
    ? baselineCutLengthCm * fabricWidthCm
    : 0;
  const baselineMarkerEfficiency = hasBaseline
    ? (activeLayout?.baselineMarkerUtilization !== undefined
      ? Number(activeLayout.baselineMarkerUtilization)
      : (project?.baselineMarkerUtilization !== undefined
        ? Number(project.baselineMarkerUtilization)
        : (baselineMarkerAreaCm2 > 0 && placedPatternAreaCm2 > 0
          ? Number(((placedPatternAreaCm2 / baselineMarkerAreaCm2) * 100).toFixed(1))
          : (project?.baselineUtilization !== undefined ? Number(project.baselineUtilization) : null))))
    : null;
  const baselineMarkerWaste = baselineMarkerEfficiency !== null
    ? Number((100 - baselineMarkerEfficiency).toFixed(1))
    : null;

  // Percentage Point Deltas
  const markerDeltaPp = hasBaseline && baselineMarkerEfficiency !== null
    ? Number((markerEfficiency - baselineMarkerEfficiency).toFixed(1))
    : null;
  const markerWasteDeltaPp = hasBaseline && baselineMarkerWaste !== null
    ? Number((baselineMarkerWaste - markerWaste).toFixed(1))
    : null;

  // Fabric Length Saved (cm and m)
  const fabricSavedCm = (hasBaseline && baselineCutLengthCm !== null && baselineCutLengthCm > actualCutLengthCm)
    ? Number((baselineCutLengthCm - actualCutLengthCm).toFixed(1))
    : 0;
  const fabricSavedM = fabricSavedCm > 0
    ? Number((fabricSavedCm / 100).toFixed(2))
    : (hasBaseline && project?.fabricSavedMeters !== undefined && project.fabricSavedMeters > 0 && (markerDeltaPp === null || markerDeltaPp > 0)
      ? Number(project.fabricSavedMeters)
      : 0);

  // Full-Roll Utilization (Kept as separate metric)
  const rollUtilization = activeLayout?.utilization !== undefined
    ? Number(activeLayout.utilization)
    : (project?.utilization !== undefined ? Number(project.utilization) : 0);
  const rollWaste = Number((100 - rollUtilization).toFixed(1));
  const baselineRollUtilization = hasBaseline && (activeLayout?.baselineUtilization !== undefined || project?.baselineUtilization !== undefined)
    ? Number(activeLayout?.baselineUtilization !== undefined ? activeLayout.baselineUtilization : project.baselineUtilization)
    : null;
  const baselineRollWaste = baselineRollUtilization !== null
    ? Number((100 - baselineRollUtilization).toFixed(1))
    : null;
  const rollDeltaPp = baselineRollUtilization !== null
    ? Number((rollUtilization - baselineRollUtilization).toFixed(1))
    : null;

  // Saved area & weight
  // Note: Fabric weight is an estimated indicator derived from saved fabric area using an
  // assumed generic textile fabric density of 280 g/m² (0.28 kg/m²). This is a provisional
  // rule of thumb, not a physically weighed measurement or certified material-specific value.
  const netSavedAreaM2 = (hasBaseline && fabricSavedM > 0 && fabricWidthM > 0)
    ? Number((fabricSavedM * fabricWidthM).toFixed(2))
    : 0;

  const fabricSavedKg = (!hasBaseline || (markerDeltaPp !== null && markerDeltaPp <= 0) || fabricSavedM <= 0)
    ? 0
    : Number((netSavedAreaM2 * 0.28).toFixed(2));

  // LCA metrics: Provisional indicators based on generic industry proxy assumptions:
  // - Fabric density: 280 g/m²
  // - Freshwater proxy: 1,400 L/kg textile
  // - Emissions proxy: 6.8 kg CO₂e/kg textile
  // These are generic provisional assumptions, not verified material-specific LCA factors.
  const hasLcaFactor = hasBaseline && fabricSavedKg > 0;
  const waterSavedL = hasLcaFactor ? Math.round(fabricSavedKg * 1400) : 0;
  const estimatedWaterL = waterSavedL >= 20 ? Math.round(waterSavedL / 10) * 10 : waterSavedL;
  const co2Saved = hasLcaFactor ? Number((fabricSavedKg * 6.8).toFixed(1)) : 0;

  const hasOptimalConvergence = hasBaseline && (activeLayout?.hasOptimalConvergence === true || activeLayout?.isOptimalGeometry === true) && (markerDeltaPp !== null && markerDeltaPp > 0);

  const wording = getSustainabilityWording({
    utilization: rollUtilization,
    waste: rollWaste,
    baselineUtilization: baselineRollUtilization,
    baselineWaste: baselineRollWaste,
    utilizationDeltaPp: rollDeltaPp,
    markerEfficiency,
    baselineMarkerEfficiency,
    markerDeltaPp,
    fabricSavedMeters: fabricSavedM,
    fabricSavedCm,
    fabricSavedKg,
    actualCutLengthM,
    baselineCutLengthM,
    hasOptimalConvergence
  });

  const candidateLabel = isUsingBestCandidate
    ? "Best Validated Candidate (#1)"
    : (totalVariants > 1 ? `Candidate #${currentVariant + 1} of ${totalVariants}` : null);

  const totalPieces = project?.totalPieces || (Array.isArray(project?.patterns) ? project.patterns.reduce((sum, p) => sum + (Number(p.quantity) || 1), 0) : 0);

  return (
    <div className="space-y-8">
      {/* Top 4 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Marker Efficiency"
          value={`${markerEfficiency}%`}
          unit=""
          subtitle={`Active cut section (${actualCutLengthM}m marker)`}
          icon={Scissors}
          variant="crimson"
          trend={markerDeltaPp !== null ? (markerDeltaPp > 0 ? `+${markerDeltaPp} pp` : `${markerDeltaPp} pp`) : undefined}
          trendLabel={markerDeltaPp !== null ? "vs baseline marker" : undefined}
          trendDirection={markerDeltaPp !== null ? (markerDeltaPp > 0 ? "up" : markerDeltaPp < 0 ? "down" : undefined) : undefined}
        />

        <MetricCard
          title="Fabric Waste"
          value={`${markerWaste}%`}
          unit=""
          subtitle="Offcut within active marker"
          icon={TrendingDown}
          variant="default"
          trend={markerWasteDeltaPp !== null ? (markerWasteDeltaPp > 0 ? `-${markerWasteDeltaPp} pp` : markerWasteDeltaPp === 0 ? `0 pp` : `+${Math.abs(markerWasteDeltaPp)} pp`) : undefined}
          trendLabel={markerWasteDeltaPp !== null ? "vs baseline marker" : undefined}
          trendDirection={markerWasteDeltaPp !== null ? (markerWasteDeltaPp > 0 ? "down" : markerWasteDeltaPp < 0 ? "up" : undefined) : undefined}
        />

        <MetricCard
          title="Fabric Saved"
          value={fabricSavedCm > 0 ? `${fabricSavedCm} cm` : (fabricSavedM > 0 ? `${fabricSavedM} m` : "0 meters")}
          unit={fabricSavedCm > 0 ? "cut reduction" : (fabricSavedM > 0 ? "meters" : "")}
          subtitle={fabricSavedKg > 0 ? `~${fabricSavedKg} kg textile (${fabricSavedM}m roll preserved)` : "0 kg textile saved"}
          icon={Leaf}
          variant="bordeaux"
        />

        <MetricCard
          title="Yield Improvement"
          value={markerDeltaPp !== null ? `${markerDeltaPp > 0 ? '+' : ''}${markerDeltaPp} pp` : "Baseline N/A"}
          unit={markerDeltaPp !== null ? "percentage points" : ""}
          subtitle={
            markerDeltaPp !== null
              ? (markerDeltaPp > 0
                  ? `Vs baseline marker (${baselineMarkerEfficiency}%)`
                  : markerDeltaPp === 0
                  ? "Equal to sequential baseline"
                  : "Below sequential baseline")
              : "No baseline available"
          }
          icon={Scale}
          variant={markerDeltaPp !== null && markerDeltaPp < 0 ? "default" : "crimson"}
        />
      </div>

      {/* Visual Comparison: Baseline vs Optimized */}
      <Card padding="p-6 sm:p-8" className="border-cream-300 bg-cream-25">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-cream-200">
          <div>
            <h3 className="text-lg font-bold text-atelier-950 flex items-center gap-2">
              <Scale className="w-5 h-5 text-crimson-700" />
              Fabric Yield Benchmark Comparison
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Comparing standard sequential baseline placement against nested layout yield metrics.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            {candidateLabel && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold text-stone-600 bg-cream-100 border border-cream-300">
                {candidateLabel}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border ${wording.badgeClass}`}>
              <Scissors className="w-3.5 h-3.5" />
              {wording.badgeText}
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {/* Baseline / Unoptimized Cutting Bar */}
          {hasBaseline && baselineMarkerEfficiency !== null ? (
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-stone-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                  Sequential Baseline Marker
                </span>
                <span className="text-stone-600 font-mono">
                  {baselineMarkerEfficiency}% Efficiency • {baselineCutLengthM} m cut • <span className="text-crimson-700 font-bold">{baselineMarkerWaste}% Waste</span>
                </span>
              </div>
              <div className="h-6 w-full rounded-lg bg-cream-200 overflow-hidden flex border border-cream-300">
                <div
                  className="h-full bg-stone-400 text-[10px] text-white font-bold flex items-center justify-center transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, baselineMarkerEfficiency))}%` }}
                >
                  {baselineMarkerEfficiency > 0 ? `${baselineMarkerEfficiency}% Fabric Cut` : ''}
                </div>
                <div
                  className="h-full bg-rose-400/80 text-[10px] text-white font-bold flex items-center justify-center stripe-pattern transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, baselineMarkerWaste))}%` }}
                >
                  {baselineMarkerWaste > 0 ? `${baselineMarkerWaste}% Waste` : ''}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-cream-100 border border-cream-300 text-stone-500 text-xs text-center">
              Comparative savings analysis requires baseline marker input. No baseline layout recorded for this project.
            </div>
          )}

          {/* Optimized Cutting Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-atelier-950 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-crimson-700" />
                Loom & Layer (Optimized Marker)
              </span>
              <span className="text-crimson-800 font-mono">
                {markerEfficiency}% Efficiency • {actualCutLengthM} m cut • <span className="text-stone-600 font-bold">{markerWaste}% Waste</span>
              </span>
            </div>
            <div className="h-6 w-full rounded-lg bg-cream-100 overflow-hidden flex border border-crimson-300 ring-2 ring-crimson-100">
              <div
                className="h-full bg-crimson-700 text-[10px] text-white font-bold flex items-center justify-center transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, markerEfficiency))}%` }}
              >
                {markerEfficiency > 0 ? `${markerEfficiency}% Usable Garment Patterns` : ''}
              </div>
              <div
                className="h-full bg-cream-200 text-[10px] text-stone-700 font-bold flex items-center justify-center transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, markerWaste))}%` }}
              >
                {markerWaste > 0 ? `${markerWaste}%` : ''}
              </div>
            </div>
          </div>

          {/* Full-Roll Inventory Allocation Subsection */}
          {hasBaseline && baselineRollUtilization !== null && (
            <div className="pt-4 border-t border-cream-200/80 text-xs text-stone-600">
              <div className="flex items-center justify-between font-mono font-semibold mb-1 text-[11px] text-stone-500 uppercase tracking-wider">
                <span>Full-Roll Stock Allocation ({fabricLengthM}m × {fabricWidthM}m Roll • {totalRollAreaM2} m²)</span>
                <span>{rollDeltaPp !== null ? (rollDeltaPp > 0 ? `+${rollDeltaPp} pp Roll Gain` : `0 pp Delta`) : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 rounded-lg bg-cream-100 border border-cream-300 flex justify-between">
                  <span className="text-stone-600 font-sans">Sequential Baseline:</span>
                  <span className="font-bold text-stone-800">{baselineRollUtilization}% Roll Stock • {baselineRollWaste}% Offcut</span>
                </div>
                <div className="p-2.5 rounded-lg bg-cream-100 border border-cream-300 flex justify-between">
                  <span className="text-stone-600 font-sans">Loom & Layer Optimized:</span>
                  <span className="font-bold text-crimson-800">{rollUtilization}% Roll Stock • {rollWaste}% Offcut</span>
                </div>
              </div>
              {rollDeltaPp === 0 && fabricSavedCm > 0 && (
                <p className="mt-2 text-[11px] text-stone-500 leading-relaxed font-sans">
                  * Full-roll utilization equals {rollUtilization}% for both markers because all {totalPieces > 0 ? `${totalPieces} ` : ''}requested pieces fit within the {fabricLengthM}m bolt. Real efficiency gain (+{markerDeltaPp} pp) is achieved via linear marker compression: <strong>{fabricSavedCm} cm</strong> ({fabricSavedM} m) of usable fabric preserved on the continuous roll.
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Environmental Equivalencies (Water, CO2, Scrap) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-cream-25 rounded-xl border border-cream-300 p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 shrink-0">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              Freshwater Conserved
            </h4>
            <div className="mt-1 text-2xl font-bold font-mono text-stone-900">
              {waterSavedL > 0 ? (
                <>
                  ~{estimatedWaterL.toLocaleString()} <span className="text-sm font-medium text-stone-500">liters</span>
                </>
              ) : (
                <span className="text-base text-stone-400 font-sans font-normal">0 liters</span>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              {waterSavedL > 0 
                ? 'Estimated industrial freshwater indicator based on an assumed proxy factor of 1,400 L/kg textile.'
                : 'Estimated industrial freshwater indicator based on an assumed proxy factor of 1,400 L/kg textile.'}
            </p>
          </div>
        </div>

        <div className="bg-cream-25 rounded-xl border border-cream-300 p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-crimson-50 border border-crimson-200 text-crimson-700 shrink-0">
            <Wind className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              CO₂ Emissions Prevented
            </h4>
            <div className="mt-1 text-2xl font-bold font-mono text-stone-900">
              {co2Saved > 0 ? (
                <>
                  ~{co2Saved} <span className="text-sm font-medium text-stone-500">kg CO₂e</span>
                </>
              ) : (
                <span className="text-base text-stone-400 font-sans font-normal">0 kg CO₂e</span>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              {co2Saved > 0
                ? 'Estimated upstream emissions indicator based on an assumed proxy factor of 6.8 kg CO₂e per kg textile.'
                : 'Estimated upstream emissions indicator based on an assumed proxy factor of 6.8 kg CO₂e per kg textile.'}
            </p>
          </div>
        </div>

        <div className="bg-cream-25 rounded-xl border border-cream-300 p-6 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              Fabric Scrap Reduction
            </h4>
            <div className="mt-1 text-2xl font-bold font-mono text-stone-900">
              {fabricSavedKg > 0 ? `~${fabricSavedKg} kg` : '0 kg'} <span className="text-sm font-medium text-stone-500">scrap</span>
            </div>
            <p className="mt-1 text-xs text-stone-500 leading-relaxed">
              {fabricSavedKg > 0
                ? 'Estimated pre-consumer scrap reduction based on saved fabric area and assumed fabric density (280 g/m²).'
                : 'Estimated pre-consumer scrap reduction based on saved fabric area and assumed fabric density (280 g/m²).'}
            </p>
          </div>
        </div>
      </div>

      {/* Impact Summary Card */}
      <Card padding="p-6 sm:p-7" className="bg-atelier-950 text-cream-50 border-atelier-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-crimson-900/60 text-crimson-300 border border-crimson-700/50 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-cream-25">
                Impact Summary & Material Efficiency
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-stone-300 leading-relaxed max-w-2xl">
                {wording.impactSummary}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-atelier-800 flex items-center gap-2 text-[11px] text-stone-400">
          <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>Calculations based on geometric material layout and configurable textile parameters.</span>
        </div>
      </Card>
    </div>
  );
}
