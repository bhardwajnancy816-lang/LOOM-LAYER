/**
 * AI Fabric Cutter — Fabric Requirement Planner
 *
 * Provides factory-grade fabric demand estimation before cutting execution:
 * 1. Computes total net pattern area and theoretical geometric floor (100% packing assumption).
 * 2. Runs a fast, bounded multi-heuristic 2D nesting feasibility pass using actual grain, rotation, and clearance constraints.
 * 3. Dynamically adapts when fabric width or roll length changes, avoiding stale outputs.
 * 4. Compares estimated length with validated nesting only when matching the same width, piece counts, and constraints.
 * 5. Evaluates stock sufficiency, surplus continuous length, or exact shortfall.
 * 6. Derives financial fabric order costs in Indian Rupees (₹) exactly once as estimated linear meters × unit price.
 * 7. Supports what-if stock exploration without mutating project specifications.
 * 8. Clearly distinguishes pre-nesting feasibility estimates from validated post-nesting cutting plans.
 */

import { expandPatternPieces, packPiecesWithOrder, buildOrderingStrategies } from './fabricOptimizer.js';

export const ESTIMATE_STATUS = {
  PRELIMINARY: 'PRELIMINARY_ESTIMATE',
  VALIDATED: 'VALIDATED_CUT_PLAN'
};

export const STOCK_STATUS = {
  SUFFICIENT: 'SUFFICIENT_STOCK',
  INSUFFICIENT: 'STOCK_SHORTFALL',
  EXACT: 'EXACT_MATCH'
};

/**
 * Calculates pre-nesting fabric requirement estimates and stock sufficiency.
 *
 * @param {object} inputParams - Project configuration, patterns, dimensions, and settings
 * @param {object} options - Optional execution controls and pricing
 * @returns {object} Comprehensive fabric requirement plan
 */
export function calculateFabricRequirement(inputParams, options = {}) {
  if (!inputParams) {
    return {
      isValid: false,
      error: 'Invalid parameters: input parameters object is required.'
    };
  }

  const patterns = Array.isArray(inputParams.patterns) ? inputParams.patterns : [];
  const fabricWidth = Math.max(1, Number(inputParams.fabricWidth) || 150);
  const availableRollLengthCm = Math.max(1, Number(inputParams.fabricLength) || 500);
  const availableRollLengthM = Number((availableRollLengthCm / 100).toFixed(2));

  const minSpacing = typeof inputParams.minSpacing === 'number'
    ? inputParams.minSpacing
    : (typeof options.minSpacing === 'number' ? options.minSpacing : 0.5);

  const allowRotation = inputParams.allowRotation !== undefined
    ? Boolean(inputParams.allowRotation)
    : (options.allowRotation !== undefined ? Boolean(options.allowRotation) : true);

  const respectGrain = inputParams.respectGrain !== undefined
    ? Boolean(inputParams.respectGrain)
    : (options.respectGrain !== undefined ? Boolean(options.respectGrain) : true);

  const fabricPricePerMeter = Number(
    inputParams.fabricPricePerMeter !== undefined
      ? inputParams.fabricPricePerMeter
      : (inputParams.fabricPrice !== undefined
        ? inputParams.fabricPrice
        : (options.fabricPricePerMeter !== undefined ? options.fabricPricePerMeter : 200.0))
  );

  const useParametricContour = Boolean(inputParams.useParametricContour || options.useParametricContour);
  const extractedShape = inputParams.extractedShape || options.extractedShape || null;

  // 1. Expand pattern templates into individual cut pieces
  const allPieces = expandPatternPieces(
    patterns,
    allowRotation,
    respectGrain,
    extractedShape,
    { useParametricContour }
  );

  const totalRequestedPieces = allPieces.length;

  if (totalRequestedPieces === 0) {
    return {
      isValid: false,
      error: 'No pattern pieces requested. Please add patterns to evaluate fabric requirements.',
      totalRequestedPieces: 0,
      totalPatternAreaCm2: 0,
      totalPatternAreaM2: 0,
      theoreticalMinLengthCm: 0,
      theoreticalMinLengthM: 0,
      estimatedRequiredLengthCm: 0,
      estimatedRequiredLengthM: 0,
      availableRollLengthCm,
      availableRollLengthM,
      stockStatus: STOCK_STATUS.INSUFFICIENT,
      isSufficient: false,
      shortfallCm: 0,
      shortfallM: 0,
      surplusCm: 0,
      surplusM: 0,
      estimatedFabricCost: 0,
      isPreliminaryEstimate: true,
      hasValidatedResult: false,
      isValidatedComparable: false
    };
  }

  // 2. Compute net pattern area across all requested pieces
  const totalPatternAreaCm2 = allPieces.reduce(
    (sum, p) => sum + (p.polygonArea !== undefined ? p.polygonArea : (p.width * p.height)),
    0
  );
  const totalPatternAreaM2 = Number((totalPatternAreaCm2 / 10000).toFixed(3));

  // 3. Theoretical Geometric Lower Bound (Zero-Waste Area Floor)
  // Physical lower bound: patternArea (cm2) / fabricWidth (cm) = length in cm
  // Represents an unachievable 100% solid packing assumption (0% scrap).
  const theoreticalMinLengthCm = Number((totalPatternAreaCm2 / fabricWidth).toFixed(1));
  const theoreticalMinLengthM = Number((theoreticalMinLengthCm / 100).toFixed(2));

  // 4. Bounded 2D Nesting Feasibility Estimation
  // Evaluates a fast, bounded set of ordering strategies and complementary placement rules:
  // - BL_X (Length-minimization priority)
  // - BSSF (Best Short Side Fit: natively fills transverse column width as roll width expands)
  const virtualRollLength = Math.max(availableRollLengthCm * 2, theoreticalMinLengthCm * 2.5, 2500);
  const candidateStrategies = buildOrderingStrategies(allPieces).slice(0, 3);
  const candidateRules = ['BL_X', 'BSSF'];

  let bestFeasibilityResult = null;
  let bestFeasibilityLengthCm = Infinity;

  for (const rule of candidateRules) {
    for (let s = 0; s < candidateStrategies.length; s++) {
      const res = packPiecesWithOrder(
        candidateStrategies[s],
        virtualRollLength,
        fabricWidth,
        minSpacing,
        rule
      );
      if (res.placedPieces.length > 0) {
        const len = Math.max(...res.placedPieces.map((p) => p.x + p.width));
        if (
          !bestFeasibilityResult ||
          res.placedPieces.length > bestFeasibilityResult.placedPieces.length ||
          (res.placedPieces.length === bestFeasibilityResult.placedPieces.length && len < bestFeasibilityLengthCm)
        ) {
          bestFeasibilityResult = res;
          bestFeasibilityLengthCm = len;
        }
      }
    }
  }

  // If some pieces couldn't fit even in virtual length (e.g. piece larger than width), extrapolate safely
  let estimatedRequiredLengthCm = bestFeasibilityLengthCm;
  if (bestFeasibilityResult && bestFeasibilityResult.placedPieces.length < totalRequestedPieces) {
    const unplacedAreaCm2 = bestFeasibilityResult.unplacedPieces.reduce(
      (sum, p) => sum + (p.polygonArea !== undefined ? p.polygonArea : (p.width * p.height)),
      0
    );
    const extraLengthNeeded = (unplacedAreaCm2 / fabricWidth) / 0.75;
    estimatedRequiredLengthCm = Math.ceil(bestFeasibilityLengthCm + extraLengthNeeded);
  }

  // Round estimated length to 0.5cm resolution
  estimatedRequiredLengthCm = Math.round(estimatedRequiredLengthCm * 2) / 2;
  const estimatedRequiredLengthM = Number((estimatedRequiredLengthCm / 100).toFixed(2));

  // 5. Compare with available stock
  const differenceCm = Number((availableRollLengthCm - estimatedRequiredLengthCm).toFixed(1));
  const isSufficient = differenceCm >= 0;
  
  let stockStatus;
  let shortfallCm = 0;
  let shortfallM = 0;
  let surplusCm = 0;
  let surplusM = 0;

  if (differenceCm > 0.5) {
    stockStatus = STOCK_STATUS.SUFFICIENT;
    surplusCm = differenceCm;
    surplusM = Number((surplusCm / 100).toFixed(2));
  } else if (Math.abs(differenceCm) <= 0.5) {
    stockStatus = STOCK_STATUS.EXACT;
  } else {
    stockStatus = STOCK_STATUS.INSUFFICIENT;
    shortfallCm = Math.abs(differenceCm);
    shortfallM = Number((shortfallCm / 100).toFixed(2));
  }

  // 6. Financial Fabric Cost Estimation in Indian Rupees (₹)
  // Calculated exactly once as estimated linear meters × configured INR price per meter
  const estimatedFabricCost = Number((estimatedRequiredLengthM * fabricPricePerMeter).toFixed(2));
  const availableStockCost = Number((availableRollLengthM * fabricPricePerMeter).toFixed(2));
  const shortfallCost = Number((shortfallM * fabricPricePerMeter).toFixed(2));
  const surplusStockValue = Number((surplusM * fabricPricePerMeter).toFixed(2));

  // Estimated utilization within the needed length
  const estimatedMarkerAreaM2 = Number(((estimatedRequiredLengthCm * fabricWidth) / 10000).toFixed(3));
  const estimatedUtilization = estimatedMarkerAreaM2 > 0
    ? Number(((totalPatternAreaM2 / estimatedMarkerAreaM2) * 100).toFixed(1))
    : 0;

  // 7. Post-Nesting Validation Comparison (Strictly when referring to same project, quantities, width, & constraints)
  const hasValidatedPlacements = Array.isArray(inputParams.layoutPlacements) && inputParams.layoutPlacements.length > 0;
  
  // Verify matching fabric width
  const validatedFabricWidth = inputParams.validatedFabricWidth !== undefined
    ? Number(inputParams.validatedFabricWidth)
    : (inputParams.originalFabricWidth !== undefined
      ? Number(inputParams.originalFabricWidth)
      : Number(inputParams.fabricWidth));

  const piecesExceedWidth = hasValidatedPlacements && inputParams.layoutPlacements.some((p) => (p.y + (p.height || 0)) > (fabricWidth + 0.5));
  const isWidthMatching = Math.abs(validatedFabricWidth - fabricWidth) <= 0.1 && !piecesExceedWidth;

  // Verify matching pattern piece count
  let validatedTotalPieces;
  if (inputParams.totalPieces !== undefined) {
    validatedTotalPieces = Number(inputParams.totalPieces);
  } else if (inputParams.unplacedCount !== undefined) {
    validatedTotalPieces = (inputParams.placedCount !== undefined ? Number(inputParams.placedCount) : (inputParams.layoutPlacements?.length || 0)) + Number(inputParams.unplacedCount);
  } else if (inputParams.layoutPlacements && inputParams.layoutPlacements.length > totalRequestedPieces) {
    validatedTotalPieces = inputParams.layoutPlacements.length;
  } else {
    validatedTotalPieces = totalRequestedPieces;
  }
  const isPiecesMatching = validatedTotalPieces === totalRequestedPieces;

  // Verify matching constraints
  const isSpacingMatching = inputParams.validatedMinSpacing === undefined ||
    Math.abs(Number(inputParams.validatedMinSpacing) - minSpacing) <= 0.05;
  const isRotationMatching = inputParams.validatedAllowRotation === undefined ||
    Boolean(inputParams.validatedAllowRotation) === allowRotation;
  const isGrainMatching = inputParams.validatedRespectGrain === undefined ||
    Boolean(inputParams.validatedRespectGrain) === respectGrain;

  const isValidatedComparable = hasValidatedPlacements && isWidthMatching && isPiecesMatching && isSpacingMatching && isRotationMatching && isGrainMatching;

  let validatedCutLengthCm = null;
  let validatedCutLengthM = null;
  let validatedPlacedCount = 0;
  let validatedUnplacedCount = 0;
  let isOrderFullyPlaced = false;
  let validatedComparisonNotice = null;

  if (isValidatedComparable) {
    validatedCutLengthCm = inputParams.actualLengthUsedCm !== undefined
      ? Number(inputParams.actualLengthUsedCm)
      : Math.max(...inputParams.layoutPlacements.map((p) => p.x + p.width));
    validatedCutLengthM = Number((validatedCutLengthCm / 100).toFixed(2));
    validatedPlacedCount = inputParams.placedCount !== undefined
      ? Number(inputParams.placedCount)
      : inputParams.layoutPlacements.length;
    validatedUnplacedCount = inputParams.unplacedCount !== undefined
      ? Number(inputParams.unplacedCount)
      : Math.max(0, totalRequestedPieces - validatedPlacedCount);
    isOrderFullyPlaced = validatedUnplacedCount === 0;
  } else if (hasValidatedPlacements) {
    if (!isWidthMatching) {
      validatedComparisonNotice = `Previous nesting was executed at ${validatedFabricWidth}cm width (${((inputParams.actualLengthUsedCm || 0) / 100).toFixed(2)}m cut). Re-run Execute Marker Nesting at ${fabricWidth}cm to validate this width.`;
    } else if (!isPiecesMatching) {
      validatedComparisonNotice = 'Pattern piece quantities have changed since last nesting run. Re-run Execute Marker Nesting to update the validated marker.';
    } else {
      validatedComparisonNotice = 'Cutting constraints have changed since last nesting run. Re-run Execute Marker Nesting to update the validated marker.';
    }
  }

  return {
    isValid: true,
    totalRequestedPieces,
    patternsCount: patterns.length,
    fabricWidth,
    availableRollLengthCm,
    availableRollLengthM,
    totalPatternAreaCm2,
    totalPatternAreaM2,
    theoreticalMinLengthCm,
    theoreticalMinLengthM,
    estimatedRequiredLengthCm,
    estimatedRequiredLengthM,
    estimatedUtilization,
    stockStatus,
    isSufficient,
    shortfallCm,
    shortfallM,
    surplusCm,
    surplusM,
    fabricPricePerMeter,
    estimatedFabricCost,
    availableStockCost,
    shortfallCost,
    surplusStockValue,
    minSpacing,
    allowRotation,
    respectGrain,
    // Clear separation between estimate and validated result
    isPreliminaryEstimate: true,
    hasValidatedResult: isValidatedComparable,
    isValidatedComparable,
    validatedComparisonNotice,
    validatedCutLengthCm,
    validatedCutLengthM,
    validatedPlacedCount,
    validatedUnplacedCount,
    isOrderFullyPlaced,
    advice: isSufficient
      ? `Stock appears sufficient. Estimated requirement is ${estimatedRequiredLengthM}m, leaving ${surplusM}m of uncut roll.`
      : `Stock shortfall detected. Estimated requirement is ${estimatedRequiredLengthM}m. You need approximately ${shortfallM}m more fabric to complete this order.`
  };
}

/**
 * Evaluates an exploratory "what-if" fabric stock scenario without modifying project data.
 *
 * @param {object} baseParams - Current project parameters
 * @param {object} scenario - Explored candidate dimensions { fabricLength, fabricWidth }
 * @returns {object} Recomputed requirement and feasibility under explored dimensions
 */
export function exploreFabricRequirement(baseParams, scenario = {}) {
  const exploredLength = Math.max(50, Number(scenario.fabricLength) || Number(baseParams.fabricLength) || 500);
  const exploredWidth = Math.max(20, Number(scenario.fabricWidth) || Number(baseParams.fabricWidth) || 150);

  const exploredParams = {
    ...baseParams,
    fabricLength: exploredLength,
    fabricWidth: exploredWidth,
    originalFabricLength: Number(baseParams.fabricLength) || 500,
    originalFabricWidth: Number(baseParams.fabricWidth) || 150
  };

  const plan = calculateFabricRequirement(exploredParams);

  return {
    ...plan,
    isExploration: true,
    exploredLength,
    exploredWidth,
    originalLength: Number(baseParams.fabricLength) || 500,
    originalWidth: Number(baseParams.fabricWidth) || 150
  };
}
