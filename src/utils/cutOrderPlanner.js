/**
 * AI Fabric Cutter — Stage 1 AI: Cut-Order Planning (COP) Engine
 *
 * Implements industrial Cut-Order Planning for apparel manufacturing:
 * 1. Multi-Size Order Demand Decomposition (XS, S, M, L, XL, XXL)
 * 2. Fabric Layer Stacking (Ply Height Optimization subject to max table spread)
 * 3. Multi-Size Ratio Grouping (e.g., 1S : 3M : 3L : 1XL = 8 garments/marker)
 * 4. Interlocking Concavity Yield Bonus Calculation (small size pieces nesting into large size voids)
 * 5. Automatic Pattern Bundle Multiplier Generation for Stage 2 2D Nesting
 */

/**
 * Standard apparel size designations
 */
export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const COP_SIZES = STANDARD_SIZES;

/**
 * Standard size scale factors relative to Medium (M = 1.0)
 * Controls dimension grading for multi-size markers
 */
export const SIZE_GRADE_FACTORS = {
  XS: 0.90,
  S: 0.95,
  M: 1.00,
  L: 1.06,
  XL: 1.12,
  XXL: 1.18
};

/**
 * Calculates greatest common divisor of an array of positive integers
 */
export function calculateArrayGCD(numbers) {
  const valid = numbers.filter((n) => typeof n === 'number' && n > 0 && Number.isInteger(n));
  if (valid.length === 0) return 1;

  const gcd = (a, b) => (!b ? a : gcd(b, a % b));
  return valid.reduce((acc, curr) => gcd(acc, curr));
}

/**
 * Solves the Cut-Order Planning problem to determine optimal marker size ratios and ply spreads
 *
 * @param {object} options
 * @param {object} options.demands - Object mapping size to quantity (e.g. { S: 120, M: 360, L: 360, XL: 120 })
 * @param {number} options.maxPlies - Maximum fabric plies that can be spread on the table (default 100)
 * @param {number} options.maxGarmentsPerMarker - Maximum garments that fit on the cutting table marker (default 8)
 * @param {number} options.minPlies - Minimum economical ply spread (default 10)
 * @returns {object} Solved Cut-Order Plan with lay schedule and marker bundle ratios
 */
export function solveCutOrderPlan(demandOrOptions = {}, maybeOptions = {}) {
  // Support both solveCutOrderPlan(demands, options) and solveCutOrderPlan({ demands, maxPlies })
  let demands = { S: 120, M: 360, L: 360, XL: 120 };
  let options = {};

  if (demandOrOptions && (demandOrOptions.demands || demandOrOptions.demand)) {
    demands = demandOrOptions.demands || demandOrOptions.demand;
    options = demandOrOptions;
  } else if (demandOrOptions && typeof demandOrOptions === 'object') {
    const hasSizeKeys = Object.keys(demandOrOptions).some((k) => STANDARD_SIZES.includes(k));
    if (hasSizeKeys) {
      demands = demandOrOptions;
      options = maybeOptions || {};
    } else {
      options = demandOrOptions;
    }
  }

  const {
    maxPlies = 120,
    maxGarmentsPerMarker = 8,
    minPlies = 10,
    baseYieldEstimate = 81.5
  } = options;

  // Filter sizes with positive demand
  const activeSizes = Object.entries(demands)
    .filter(([_, qty]) => Number(qty) > 0)
    .map(([size, qty]) => ({ size, quantity: Math.round(Number(qty)) }));

  if (activeSizes.length === 0) {
    return {
      isValid: false,
      error: 'At least one garment size with quantity > 0 is required.',
      totalDemand: 0,
      lays: []
    };
  }

  const totalDemand = activeSizes.reduce((sum, item) => sum + item.quantity, 0);
  const quantities = activeSizes.map((item) => item.quantity);
  const demandGCD = calculateArrayGCD(quantities);

  // 1. Initial base integer ratio from GCD
  let baseRatio = {};
  let totalGarmentsInBaseRatio = 0;
  activeSizes.forEach((item) => {
    const r = item.quantity / demandGCD;
    baseRatio[item.size] = r;
    totalGarmentsInBaseRatio += r;
  });

  // 2. Adjust ratio if it exceeds maxGarmentsPerMarker
  // (Scale up or down to find the closest high-density multi-size lay)
  let markerRatio = { ...baseRatio };
  let garmentsPerMarker = totalGarmentsInBaseRatio;

  if (garmentsPerMarker > maxGarmentsPerMarker) {
    // If base ratio has too many garments for one marker, partition demands
    const scaleFactor = Math.floor(garmentsPerMarker / maxGarmentsPerMarker);
    garmentsPerMarker = 0;
    activeSizes.forEach((item) => {
      const r = Math.max(1, Math.round(baseRatio[item.size] / (scaleFactor + 1)));
      markerRatio[item.size] = r;
      garmentsPerMarker += r;
    });
  } else if (garmentsPerMarker * 2 <= maxGarmentsPerMarker && demandGCD % 2 === 0) {
    // If we have table room and can double the ratio for tighter multi-size nesting:
    garmentsPerMarker = 0;
    activeSizes.forEach((item) => {
      const r = baseRatio[item.size] * 2;
      markerRatio[item.size] = r;
      garmentsPerMarker += r;
    });
  }

  // 3. Calculate ply height required for the primary lay
  // Ideal plies = demand / ratio
  const sampleSize = activeSizes[0].size;
  const targetPlies = Math.ceil(demands[sampleSize] / (markerRatio[sampleSize] || 1));
  const primaryPlies = Math.min(maxPlies, Math.max(minPlies, targetPlies));

  // Compute primary lay output
  const primaryLayCut = {};
  let primaryTotalCut = 0;
  activeSizes.forEach((item) => {
    const cut = (markerRatio[item.size] || 0) * primaryPlies;
    primaryLayCut[item.size] = cut;
    primaryTotalCut += cut;
  });

  const lays = [
    {
      layNumber: 1,
      name: 'Primary Multi-Size Lay',
      ratio: { ...markerRatio },
      garmentsPerMarker,
      plies: primaryPlies,
      totalGarmentsCut: primaryTotalCut,
      sizeBreakdown: { ...primaryLayCut },
      isPrimary: true
    }
  ];

  // 4. Check remaining unmet demand for secondary lay
  const remainingDemand = {};
  let hasRemaining = false;
  activeSizes.forEach((item) => {
    const unmet = Math.max(0, item.quantity - primaryLayCut[item.size]);
    if (unmet > 0) {
      remainingDemand[item.size] = unmet;
      hasRemaining = true;
    }
  });

  if (hasRemaining) {
    const remActive = Object.entries(remainingDemand);
    const remQuantities = remActive.map(([_, q]) => q);
    const remGCD = calculateArrayGCD(remQuantities);
    const remRatio = {};
    let remGarmentsPerMarker = 0;

    remActive.forEach(([sz, q]) => {
      const r = Math.max(1, Math.round(q / remGCD));
      remRatio[sz] = r;
      remGarmentsPerMarker += r;
    });

    const remPlies = Math.min(maxPlies, Math.max(1, Math.ceil(remActive[0][1] / (remRatio[remActive[0][0]] || 1))));
    const remCut = {};
    let remTotalCut = 0;
    remActive.forEach(([sz, _]) => {
      const cut = remRatio[sz] * remPlies;
      remCut[sz] = cut;
      remTotalCut += cut;
    });

    lays.push({
      layNumber: 2,
      name: 'Secondary Balance Lay',
      ratio: remRatio,
      garmentsPerMarker: remGarmentsPerMarker,
      plies: remPlies,
      totalGarmentsCut: remTotalCut,
      sizeBreakdown: remCut,
      isPrimary: false
    });
  }

  // Total production across all lays
  const totalCut = lays.reduce((sum, lay) => sum + lay.totalGarmentsCut, 0);
  const fulfillmentPercentage = Number(((totalCut / totalDemand) * 100).toFixed(1));

  // Calculate small-to-large piece nesting interlocking ratio
  const smallCount = (markerRatio['XS'] || 0) + (markerRatio['S'] || 0) + (markerRatio['M'] || 0);
  const largeCount = (markerRatio['L'] || 0) + (markerRatio['XL'] || 0) + (markerRatio['XXL'] || 0);
  const interlockingRatio = largeCount > 0 ? Number((smallCount / largeCount).toFixed(2)) : 1.0;

  // Interlocking yield benefit description
  const estimatedInterlockingYieldBoost = interlockingRatio >= 0.8 && interlockingRatio <= 2.0
    ? '+5.8% (Optimal Small/Large Interlocking)'
    : '+3.4% (Multi-Size Packing)';

  const interlockingYieldBoostPp = interlockingRatio >= 0.8 && interlockingRatio <= 2.0 ? 4.8 : 3.2;
  const predictedMultiSizeYield = Number((baseYieldEstimate + interlockingYieldBoostPp).toFixed(1));
  const isFullySatisfied = fulfillmentPercentage >= 99.9;

  const bundleRatioSummary = Object.entries(markerRatio)
    .filter(([_, q]) => q > 0)
    .map(([s, q]) => `${q}${s}`)
    .join(' : ') + ` (${garmentsPerMarker} garments per ply)`;

  const enrichedLays = lays.map((lay) => ({
    ...lay,
    plyCount: lay.plies,
    bundleRatio: lay.ratio,
    bundleSizeTotal: lay.garmentsPerMarker,
    garmentsProduced: lay.totalGarmentsCut
  }));

  return {
    isValid: true,
    totalDemand,
    totalCut,
    totalGarmentsDemand: totalDemand,
    totalGarmentsScheduled: totalCut,
    fulfillmentPercentage,
    isFullySatisfied,
    totalLays: enrichedLays.length,
    primaryRatio: markerRatio,
    bundleRatio: markerRatio,
    bundleRatioSummary,
    garmentsPerMarker,
    interlockingRatio,
    interlockingYieldBoostPp,
    estimatedInterlockingYieldBoost,
    predictedMultiSizeYield,
    lays: enrichedLays
  };
}

/**
 * Generates an expanded pattern pieces list with quantities scaled by the COP marker ratio
 *
 * @param {Array} basePatterns - Standard garment pattern pieces (bodice, sleeve, collar...)
 * @param {object} markerRatio - Solved size ratio (e.g. { S: 1, M: 3, L: 3, XL: 1 })
 * @returns {Array} Multi-size pattern pieces array ready for Stage 2 nesting optimizer
 */
export function generateCopMarkerPatterns(basePatterns = [], markerRatio = { M: 1 }) {
  if (!Array.isArray(basePatterns) || basePatterns.length === 0) return [];

  const copPatterns = [];

  Object.entries(markerRatio).forEach(([size, garmentCount]) => {
    const scaleFactor = SIZE_GRADE_FACTORS[size] || 1.0;
    const count = Number(garmentCount) || 0;
    if (count <= 0) return;

    basePatterns.forEach((pat) => {
      const baseQty = Number(pat.quantity) || 1;
      const gradedWidth = Math.round((Number(pat.width) || 20) * scaleFactor);
      const gradedHeight = Math.round((Number(pat.height) || 20) * scaleFactor);

      copPatterns.push({
        ...pat,
        id: `${pat.id || 'pat'}-${size}`,
        name: `${pat.name} (${size})`,
        size,
        scaleFactor,
        width: gradedWidth,
        height: gradedHeight,
        quantity: baseQty * count,
        copGarmentMultiplier: count
      });
    });
  });

  return copPatterns;
}
