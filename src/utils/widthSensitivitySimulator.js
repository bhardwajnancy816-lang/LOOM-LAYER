/**
 * AI Fabric Cutter — 1-Click Roll Width Sensitivity Simulator
 *
 * Evaluates how different commercial fabric roll widths (e.g., 140cm / 55", 150cm / 59", 160cm / 63")
 * impact 2D pattern nesting efficiency, linear roll consumption, scrap rates, and material costs.
 *
 * Provides factory buyers and atelier production managers with clear financial & yield guidance
 * answering the core question: "Which roll width should I buy for this production order?"
 */

import { optimizeFabricCutting } from './fabricOptimizer.js';

/**
 * Standard commercial apparel fabric widths (cm)
 */
export const STANDARD_COMMERCIAL_WIDTHS = [
  { width: 140, label: '140 cm (55" Narrow)' },
  { width: 150, label: '150 cm (59" Standard)' },
  { width: 160, label: '160 cm (63" Wide)' }
];

/**
 * Simulates nesting outcomes across multiple candidate roll widths
 *
 * @param {object} params - Project & order parameters
 * @returns {object} Comparative simulation report with recommended best-buy width
 */
export function simulateWidthSensitivity(params = {}) {
  const {
    patterns = [],
    fabricLength = 500,
    currentWidth = 150,
    candidateWidths = null,
    minSpacing = 0.5,
    allowRotation = true,
    respectGrain = true,
    fabricPricePerMeter = 200,
    defects = []
  } = params;

  if (!Array.isArray(patterns) || patterns.length === 0) {
    return {
      isValid: false,
      error: 'At least one pattern piece is required for width sensitivity simulation.',
      options: [],
      recommendedWidth: currentWidth
    };
  }

  // Derive candidate widths to compare: custom array or standard range around currentWidth
  let widths = candidateWidths;
  if (!Array.isArray(widths) || widths.length < 2) {
    const baseW = Number(currentWidth) || 150;
    const step = baseW <= 80 ? 10 : 10;
    const narrow = Math.max(30, baseW - step);
    const wide = baseW + step;
    widths = [narrow, baseW, wide];
  }

  // Remove duplicate widths and sort ascending
  widths = Array.from(new Set(widths.map((w) => Number(w)))).sort((a, b) => a - b);

  const evaluations = widths.map((w) => {
    try {
      const res = optimizeFabricCutting(
        {
          fabricWidth: w,
          fabricLength: Number(fabricLength) || 500,
          patterns,
          minSpacing: Number(minSpacing) || 0.5,
          allowRotation: Boolean(allowRotation),
          respectGrain: Boolean(respectGrain),
          defects: Array.isArray(defects) ? defects : []
        },
        {
          maxEvaluations: 12,
          maxTimeMs: 1500
        }
      );

      const placedCount = res.placedCount || 0;
      const totalPieces = res.totalPieces || patterns.reduce((s, p) => s + (p.quantity || 1), 0);
      const isComplete = placedCount === totalPieces;
      const utilization = res.markerUtilization || res.utilization || 0;
      const wastePercentage = res.markerWastePercentage || res.wastePercentage || (100 - utilization);
      const linearUsedM = res.actualLengthUsedM !== undefined && res.actualLengthUsedM > 0
        ? Number(res.actualLengthUsedM)
        : Number(((res.actualLengthUsedCm || fabricLength) / 100).toFixed(2));
      const materialCost = Number((linearUsedM * fabricPricePerMeter).toFixed(2));

      return {
        width: w,
        label: `${w} cm (${(w / 2.54).toFixed(0)}")`,
        isCurrent: w === currentWidth,
        success: res.success,
        isComplete,
        placedCount,
        totalPieces,
        utilization,
        wastePercentage,
        linearUsedM,
        materialCost,
        layoutPlacements: res.layoutPlacements || []
      };
    } catch (err) {
      return {
        width: w,
        label: `${w} cm`,
        isCurrent: w === currentWidth,
        success: false,
        isComplete: false,
        placedCount: 0,
        totalPieces: 0,
        utilization: 0,
        wastePercentage: 100,
        linearUsedM: 0,
        materialCost: 0,
        layoutPlacements: [],
        error: err.message
      };
    }
  });

  // Determine optimal purchase recommendation:
  // 1. Highest placed pieces (must satisfy order)
  // 2. Highest utilization percentage
  // 3. Lowest material cost
  let best = evaluations[0];
  for (let i = 1; i < evaluations.length; i++) {
    const cand = evaluations[i];
    if (cand.placedCount > best.placedCount) {
      best = cand;
    } else if (cand.placedCount === best.placedCount) {
      if (cand.utilization > best.utilization + 1.0) {
        best = cand;
      } else if (Math.abs(cand.utilization - best.utilization) <= 1.0 && cand.materialCost < best.materialCost) {
        best = cand;
      }
    }
  }

  // Calculate savings vs worst candidate
  const worstCost = Math.max(...evaluations.map((e) => e.materialCost));
  const minCost = Math.min(...evaluations.map((e) => e.materialCost));
  const maxSavings = Number((worstCost - minCost).toFixed(2));

  const enrichedEvaluations = evaluations.map((e) => {
    const isRecommended = e.width === best.width;
    const costDelta = Number((e.materialCost - best.materialCost).toFixed(2));
    const yieldDelta = Number((e.utilization - best.utilization).toFixed(1));

    return {
      ...e,
      isRecommended,
      costDelta,
      yieldDelta
    };
  });

  const currentOption = evaluations.find((e) => e.width === currentWidth) || evaluations[0];
  const yieldGainVsCurrent = Number((best.utilization - (currentOption?.utilization || 0)).toFixed(1));
  const costSavingsVsCurrent = Number(Math.max(0, (currentOption?.materialCost || 0) - best.materialCost).toFixed(2));
  const effectiveSavings = costSavingsVsCurrent > 0 ? costSavingsVsCurrent : maxSavings;

  let recommendationSummary = '';
  if (best.isComplete) {
    if (best.isCurrent) {
      recommendationSummary = `Your current ${best.width} cm roll is optimal (${best.utilization}% yield). Purchasing narrower or wider alternatives increases offcut scrap.`;
    } else {
      const gainText = yieldGainVsCurrent > 0 ? ` (+${yieldGainVsCurrent}pp)` : '';
      recommendationSummary = `Switching to a ${best.width} cm roll increases marker efficiency to ${best.utilization}%${gainText} and saves ₹${Math.round(effectiveSavings)} per production lay.`;
    }
  } else {
    recommendationSummary = `${best.width} cm accommodates the most pattern pieces (${best.placedCount}/${best.totalPieces}) within roll boundaries.`;
  }

  return {
    isValid: true,
    currentWidth,
    recommendedWidth: best.width,
    bestOption: best,
    maxSavings,
    recommendationSummary,
    options: enrichedEvaluations
  };
}
