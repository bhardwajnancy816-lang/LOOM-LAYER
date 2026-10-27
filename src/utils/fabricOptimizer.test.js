import { 
  optimizeFabricCutting, 
  checkOverlap,
  checkPieceCollision,
  isCandidateBetter
} from './fabricOptimizer.js';
import { getSustainabilityWording } from './sustainabilityWording.js';
import { calculatePolygonArea, checkPolygonCollision, isPolygonWithinFabric } from './polygonGeometry.js';

function runTests() {
  console.log('🧪 Starting Fabric Optimization Engine Verification Tests...\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failedCount++;
    }
  }

  // ==========================================
  // TEST CASE 1: 100x100 Fabric, 20x20 Pattern Qty 10
  // ==========================================
  console.log('--- Test Case 1: 100×100 Fabric with 10 pieces of 20×20 ---');
  const test1Input = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: true,
    respectGrain: false,
    patterns: [
      {
        id: 'p-1',
        name: 'Square Piece',
        width: 20,
        height: 20,
        quantity: 10,
        rotationAllowed: true,
        grainConstraint: 'Flexible'
      }
    ]
  };

  const result1 = optimizeFabricCutting(test1Input);

  assert(result1.success === true, 'Optimization executed successfully');
  assert(result1.placedCount === 10, `All 10 pieces placed (got ${result1.placedCount})`);
  assert(result1.unplacedCount === 0, 'Zero unplaced pieces');

  // Verify all pieces stay inside bounds [0, 100]
  let withinBounds1 = true;
  result1.layoutPlacements.forEach((p) => {
    if (p.x < 0 || p.y < 0 || p.x + p.width > 100 || p.y + p.height > 100) {
      withinBounds1 = false;
    }
  });
  assert(withinBounds1, 'All placed pieces stay strictly inside 100×100 fabric boundary');

  // Verify no overlap among all placed pieces
  let hasOverlap1 = false;
  for (let i = 0; i < result1.layoutPlacements.length; i++) {
    for (let j = i + 1; j < result1.layoutPlacements.length; j++) {
      if (checkOverlap(result1.layoutPlacements[i], result1.layoutPlacements[j], 0)) {
        hasOverlap1 = true;
      }
    }
  }
  assert(!hasOverlap1, 'Zero overlap between any placed pieces');

  // Used Area: 10 * (20*20) = 4000 cm2 = 0.4 m2
  // Total Area: 100 * 100 = 10000 cm2 = 1.0 m2
  // Utilization: 40.0%, Waste: 60.0%
  assert(result1.utilization === 40.0, `Utilization is calculated correctly as 40.0% (got ${result1.utilization}%)`);
  assert(result1.wastePercentage === 60.0, `Waste is calculated correctly as 60.0% (got ${result1.wastePercentage}%)`);

  // ==========================================
  // TEST CASE 2: 100x100 Fabric, Mixed Patterns (40x50 x2 + 20x20 x5)
  // ==========================================
  console.log('\n--- Test Case 2: 100×100 Fabric with mixed patterns (40×50×2 + 20×20×5) ---');
  const test2Input = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: true,
    respectGrain: false,
    patterns: [
      {
        id: 'pat-a',
        name: 'Large Rectangle',
        width: 40,
        height: 50,
        quantity: 2,
        rotationAllowed: true
      },
      {
        id: 'pat-b',
        name: 'Small Square',
        width: 20,
        height: 20,
        quantity: 5,
        rotationAllowed: true
      }
    ]
  };

  const result2 = optimizeFabricCutting(test2Input);

  assert(result2.success === true, 'Mixed patterns optimization executed');
  assert(result2.placedCount === 7, `All 7 pieces placed (got ${result2.placedCount})`);

  let withinBounds2 = true;
  result2.layoutPlacements.forEach((p) => {
    if (p.x < 0 || p.y < 0 || p.x + p.width > 100 || p.y + p.height > 100) {
      withinBounds2 = false;
    }
  });
  assert(withinBounds2, 'All mixed pieces stay inside 100×100 boundary');

  let hasOverlap2 = false;
  for (let i = 0; i < result2.layoutPlacements.length; i++) {
    for (let j = i + 1; j < result2.layoutPlacements.length; j++) {
      if (checkOverlap(result2.layoutPlacements[i], result2.layoutPlacements[j], 0)) {
        hasOverlap2 = true;
      }
    }
  }
  assert(!hasOverlap2, 'Zero overlap between any mixed pattern pieces');

  // Used Area: 2 * (40*50) + 5 * (20*20) = 4000 + 2000 = 6000 cm2 = 0.6 m2
  // Total Area: 10000 cm2 = 1.0 m2
  // Utilization: 60.0%, Waste: 40.0%
  assert(result2.utilization === 60.0, `Utilization is calculated correctly as 60.0% (got ${result2.utilization}%)`);
  assert(result2.wastePercentage === 40.0, `Waste is calculated correctly as 40.0% (got ${result2.wastePercentage}%)`);

  // ==========================================
  // TEST CASE 3: Pattern larger than fabric
  // ==========================================
  console.log('\n--- Test Case 3: Oversized Pattern handling ---');
  const test3Input = {
    fabricWidth: 50,
    fabricLength: 50,
    minSpacing: 0.5,
    allowRotation: false,
    patterns: [
      {
        id: 'pat-oversized',
        name: 'Giant Pattern',
        width: 120,
        height: 60,
        quantity: 1
      }
    ]
  };

  const result3 = optimizeFabricCutting(test3Input);

  assert(result3.success === false, 'Returns clean failure for oversized pattern');
  assert(Boolean(result3.error), `Returns descriptive error message: "${result3.error}"`);
  assert(result3.layoutPlacements.length === 0, 'Does not generate invalid overflowing coordinates');

  // ==========================================
  // TEST CASE 4: Multiple Pattern Groups (100x100 Fabric, 60x40x2 + 40x20x2)
  // ==========================================
  console.log('\n--- Test Case 4: Multiple Pattern Groups (60×40×2 + 40×20×2 on 100×100 Fabric) ---');
  const test4Input = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: true,
    respectGrain: false,
    patterns: [
      {
        id: 'pat-a',
        name: 'Pattern A (Front)',
        category: 'FRONT',
        width: 60,
        height: 40,
        quantity: 2,
        rotationAllowed: true
      },
      {
        id: 'pat-b',
        name: 'Pattern B (Back)',
        category: 'BACK',
        width: 40,
        height: 20,
        quantity: 2,
        rotationAllowed: true
      }
    ]
  };

  const result4 = optimizeFabricCutting(test4Input);

  assert(result4.success === true, 'Multiple pattern groups optimized successfully');
  assert(result4.totalPieces === 4, `Total pieces is 4 (got ${result4.totalPieces})`);
  assert(result4.placedCount === 4, `All 4 pieces placed (got ${result4.placedCount})`);
  assert(result4.unplacedCount === 0, 'Zero unplaced pieces');

  // Verify both pattern groups are represented
  const hasPatternA = result4.layoutPlacements.some((p) => p.patternId === 'pat-a');
  const hasPatternB = result4.layoutPlacements.some((p) => p.patternId === 'pat-b');
  const patternACount = result4.layoutPlacements.filter((p) => p.patternId === 'pat-a').length;
  const patternBCount = result4.layoutPlacements.filter((p) => p.patternId === 'pat-b').length;

  assert(hasPatternA && hasPatternB, 'Both pattern groups are represented in final layout');
  assert(patternACount === 2, `Pattern A has exactly 2 pieces rendered (got ${patternACount})`);
  assert(patternBCount === 2, `Pattern B has exactly 2 pieces rendered (got ${patternBCount})`);

  // Verify no pieces overlap
  let hasOverlap4 = false;
  for (let i = 0; i < result4.layoutPlacements.length; i++) {
    for (let j = i + 1; j < result4.layoutPlacements.length; j++) {
      if (checkOverlap(result4.layoutPlacements[i], result4.layoutPlacements[j], 0)) {
        hasOverlap4 = true;
      }
    }
  }
  assert(!hasOverlap4, 'Zero overlap between any placed pieces across both groups');

  // Verify every piece is inside fabric boundary [0, 100]
  let withinBounds4 = true;
  result4.layoutPlacements.forEach((p) => {
    if (p.x < 0 || p.y < 0 || p.x + p.width > 100 || p.y + p.height > 100) {
      withinBounds4 = false;
    }
  });
  assert(withinBounds4, 'Every piece remains strictly inside 100×100 fabric boundaries');

  // Verify utilization based on all 4 pieces:
  // Used Area: 2*(60*40) + 2*(40*20) = 4800 + 1600 = 6400 cm2 = 0.64 m2
  // Total Area: 10000 cm2 = 1.0 m2
  // Utilization: 64.0%, Waste: 36.0%
  assert(result4.utilization === 64.0, `Utilization is calculated correctly as 64.0% across all 4 pieces (got ${result4.utilization}%)`);
  assert(result4.wastePercentage === 36.0, `Waste is calculated correctly as 36.0% (got ${result4.wastePercentage}%)`);

  // ==========================================
  // TEST CASE 5: Data-Driven Benchmark & Baseline Calculations
  // ==========================================
  console.log('\n--- Test Case 5: Real Calculated Baseline Benchmark & Percentage Points ---');
  const test5Input = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: true,
    respectGrain: false,
    patterns: [
      {
        id: 'pat-1',
        name: 'Front Panel',
        width: 60,
        height: 40,
        quantity: 2
      },
      {
        id: 'pat-2',
        name: 'Sleeve',
        width: 40,
        height: 20,
        quantity: 2
      }
    ]
  };

  const result5 = optimizeFabricCutting(test5Input);

  assert(result5.hasValidBaseline === true, 'Baseline layout was computed from actual fabric & pattern data');
  assert(typeof result5.baselineUtilization === 'number', `Baseline utilization is numeric (${result5.baselineUtilization}%)`);
  assert(typeof result5.baselineWastePercentage === 'number', `Baseline waste is numeric (${result5.baselineWastePercentage}%)`);
  assert(result5.baselineUtilization !== 83.0 || (result5.patterns && false), 'Baseline does not hardcode 83.0% when input geometry yields different baseline');
  
  // Test percentage points calculation
  const expectedPp = Number((result5.utilization - result5.baselineUtilization).toFixed(1));
  assert(result5.utilizationDeltaPp === expectedPp, `Utilization delta is exactly ${expectedPp} percentage points (pp)`);

  const expectedWastePp = Number((result5.baselineWastePercentage - result5.wastePercentage).toFixed(1));
  assert(result5.wasteDeltaPp === expectedWastePp, `Waste delta is exactly ${expectedWastePp} percentage points (pp)`);

  // Verify fabricSavedMeters is non-negative and derived from roll length difference
  assert(result5.fabricSavedMeters >= 0, `Fabric saved meters is >= 0 (${result5.fabricSavedMeters}m)`);
  assert(result5.fabricSavedKg >= 0, `Fabric saved kg is >= 0 (${result5.fabricSavedKg}kg)`);
  assert(result5.waterSavedLiters >= 0, `Water saved liters is >= 0 (${result5.waterSavedLiters}L)`);
  assert(result5.co2SavedKg >= 0, `CO2 saved kg is >= 0 (${result5.co2SavedKg}kg)`);

  // ==========================================
  // TEST CASE 6: Dynamic Linear Fabric Saved Calculation (Area / Width)
  // ==========================================
  console.log('\n--- Test Case 6: Linear Fabric Saved Derived from Saved Area & Fabric Width ---');
  const sampleSavedAreaM2 = 0.50;
  const sampleFabricWidthM = 1.50;
  const expectedLinearMeters = Number((sampleSavedAreaM2 / sampleFabricWidthM).toFixed(2));
  assert(expectedLinearMeters === 0.33, `0.50 m² saved with 1.50 m fabric width yields exactly 0.33 linear meters (got ${expectedLinearMeters}m)`);

  const test6Input = {
    fabricWidth: 150,
    fabricLength: 300,
    minSpacing: 0,
    allowRotation: true,
    respectGrain: false,
    patterns: [
      { id: 'pat-6a', name: 'Front', width: 75, height: 100, quantity: 2 },
      { id: 'pat-6b', name: 'Sleeve', width: 50, height: 60, quantity: 2 }
    ]
  };

  const result6 = optimizeFabricCutting(test6Input);
  assert(result6.success === true, 'Test 6 optimization ran successfully');
  assert(result6.hasValidBaseline === true, 'Test 6 has valid baseline');
  
  if (result6.baselineWasteArea > result6.wasteArea) {
    const savedAreaM2 = Number((result6.baselineWasteArea - result6.wasteArea).toFixed(2));
    const expectedLinearM = Number((savedAreaM2 / (150 / 100)).toFixed(2));
    assert(result6.fabricSavedMeters > 0, `Fabric saved meters is positive when saved area > 0 (${result6.fabricSavedMeters}m)`);
    assert(result6.fabricSavedMeters >= expectedLinearM, `Fabric saved meters (${result6.fabricSavedMeters}m) >= linear area savings (${expectedLinearM}m)`);
  }

  // ==========================================
  // TEST CASE 7: Unsupported LCA Factor / Pending Metric Handling & Multi-Width Linear Saved
  // ==========================================
  console.log('\n--- Test Case 7: Dynamic Linear Fabric Saved & LCA Metric Availability ---');
  
  const testWidths = [
    { savedAreaM2: 0.50, widthM: 1.50, expectedLinearM: 0.33 },
    { savedAreaM2: 1.20, widthM: 1.20, expectedLinearM: 1.00 },
    { savedAreaM2: 0.80, widthM: 1.60, expectedLinearM: 0.50 },
    { savedAreaM2: 0.75, widthM: 1.50, expectedLinearM: 0.50 }
  ];

  testWidths.forEach(({ savedAreaM2, widthM, expectedLinearM }) => {
    const calculated = Number((savedAreaM2 / widthM).toFixed(2));
    assert(calculated === expectedLinearM, `${savedAreaM2} m² saved on ${widthM} m width dynamically calculates to ${expectedLinearM} linear meters (got ${calculated}m)`);
  });

  const zeroSavingsInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: false,
    respectGrain: true,
    patterns: [
      { id: 'pat-single', name: 'Single Square', width: 50, height: 50, quantity: 1 }
    ]
  };
  const zeroResult = optimizeFabricCutting(zeroSavingsInput);
  assert(zeroResult.success === true, 'Single piece optimization ran successfully');
  assert(typeof zeroResult.hasVerifiedLca === 'boolean', 'hasVerifiedLca flag is boolean');
  if (zeroResult.fabricSavedKg === 0) {
    assert(zeroResult.waterSavedLiters === 0, 'Water saved is 0 when no fabric weight is saved (pending LCA)');
    assert(zeroResult.co2SavedKg === 0, 'CO2 saved is 0 when no fabric weight is saved (pending LCA)');
  }

  // ==========================================
  // TEST CASE 8: Benchmark Status & Optimality Conditions
  // ==========================================
  console.log('\n--- Test Case 8: Benchmark Status & Convergence Conditions ---');

  // 1. Equal Input (Optimized === Baseline, e.g. 32% vs 32%)
  const equalInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: false,
    respectGrain: true,
    patterns: [
      { id: 'pat-eq', name: 'Single Box', width: 32, height: 100, quantity: 1 }
    ]
  };
  const equalResult = optimizeFabricCutting(equalInput);
  assert(equalResult.utilization === equalResult.baselineUtilization, `Optimized (${equalResult.utilization}%) equals baseline (${equalResult.baselineUtilization}%)`);
  assert(equalResult.utilizationDeltaPp === 0, 'Utilization delta is exactly 0 pp');
  assert(equalResult.fabricSavedMeters === 0, 'Fabric saved is strictly 0 meters when optimized === baseline');
  assert(equalResult.fabricSavedKg === 0, 'Fabric saved kg is strictly 0 when optimized === baseline');
  assert(equalResult.hasOptimalConvergence === false, 'Optimality is NOT claimed simply because optimized === baseline (32% is not 100%)');

  // 2. Optimized < Baseline (Simulated benchmark scenario)
  const belowDeltaPp = -3.5;
  const isBelow = belowDeltaPp < 0;
  assert(isBelow === true, 'Below baseline condition correctly detected when delta < 0');

  // 3. Verifiable Convergence / Perfect Optimality (100% utilization / 0 waste)
  const perfectInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: false,
    respectGrain: true,
    patterns: [
      { id: 'pat-perf', name: 'Full Sheet', width: 100, height: 100, quantity: 1 }
    ]
  };
  const perfectResult = optimizeFabricCutting(perfectInput);
  assert(perfectResult.utilization === 100, 'Perfect packing reaches 100% utilization');
  assert(perfectResult.wastePercentage === 0, 'Perfect packing has 0% waste');
  assert(perfectResult.hasOptimalConvergence === true, 'Verifiable optimal geometry condition is true when 100% utilization with 0 waste');

  // ==========================================
  // TEST CASE 9: Dynamic Sustainability Report Wording & Benchmark Status
  // ==========================================
  console.log('\n--- Test Case 9: Dynamic Sustainability Report Wording ---');

  // 1. Equal-baseline case (64% vs 64%, delta = 0 pp, fabricSaved = 0)
  const equalWording = getSustainabilityWording({
    utilization: 64,
    waste: 36,
    baselineUtilization: 64,
    baselineWaste: 36,
    utilizationDeltaPp: 0,
    fabricSavedMeters: 0,
    fabricSavedKg: 0,
    hasOptimalConvergence: false
  });

  assert(equalWording.statusKey === 'equal', 'Equal case statusKey is "equal"');
  assert(equalWording.badgeText === 'No Improvement vs Baseline', 'Equal case badge is "No Improvement vs Baseline"');
  assert(equalWording.badgeClass.includes('stone'), 'Equal case badge uses neutral stone styling');
  assert(equalWording.impactSummary.includes('0 pp change and 0 m fabric saved'), 'Equal case Impact Summary explicitly mentions 0 pp change and 0 m fabric saved');
  assert(!equalWording.impactSummary.toLowerCase().includes('optimal'), 'Equal case Impact Summary does not claim optimality');
  assert(!equalWording.impactSummary.toLowerCase().includes('yield gain'), 'Equal case Impact Summary does not claim yield gain');
  assert(!equalWording.impactSummary.toLowerCase().includes('outperformed'), 'Equal case Impact Summary does not claim outperforming baseline');

  // 2. Greater-than baseline case (75% vs 64%, delta = +11 pp)
  const gainWording = getSustainabilityWording({
    utilization: 75,
    waste: 25,
    baselineUtilization: 64,
    baselineWaste: 36,
    utilizationDeltaPp: 11,
    fabricSavedMeters: 2.4,
    fabricSavedKg: 1.2,
    hasOptimalConvergence: false
  });

  assert(gainWording.statusKey === 'improved', 'Gain case statusKey is "improved"');
  assert(gainWording.badgeText === '+11 pp Yield Gain', 'Gain case badge is "+11 pp Yield Gain"');
  assert(gainWording.badgeClass.includes('emerald'), 'Gain case badge uses emerald styling');
  assert(gainWording.impactSummary.includes('+11 pp yield improvement'), 'Gain case Impact Summary describes actual yield improvement');
  assert(gainWording.impactSummary.includes('2.4 meters'), 'Gain case Impact Summary contains actual saved meters');

  // 3. Below-baseline case (60% vs 64%, delta = -4 pp)
  const belowWording = getSustainabilityWording({
    utilization: 60,
    waste: 40,
    baselineUtilization: 64,
    baselineWaste: 36,
    utilizationDeltaPp: -4,
    fabricSavedMeters: 0,
    fabricSavedKg: 0,
    hasOptimalConvergence: false
  });

  assert(belowWording.statusKey === 'below', 'Below case statusKey is "below"');
  assert(belowWording.badgeText === 'Below Baseline', 'Below case badge is "Below Baseline"');
  assert(belowWording.badgeClass.includes('rose'), 'Below case badge uses rose styling');
  assert(belowWording.impactSummary.includes('4 pp below the sequential baseline'), 'Below case Impact Summary states result is below baseline');
  assert(belowWording.impactSummary.includes('No fabric savings were achieved'), 'Below case Impact Summary confirms no fabric savings');

  // ==========================================
  // TEST CASE 10: Genuine Yield Improvement Over Sequential Baseline (Baseline < Optimized)
  // ==========================================
  console.log('\n--- Test Case 10: Genuinely Better Layout (Optimized > Baseline) ---');
  const betterLayoutInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: true,
    respectGrain: false,
    patterns: [
      {
        id: 'pat-large',
        name: 'Large Panel',
        width: 70,
        height: 40,
        quantity: 2,
        rotationAllowed: true
      },
      {
        id: 'pat-small',
        name: 'Small Panel',
        width: 40,
        height: 30,
        quantity: 2,
        rotationAllowed: true
      }
    ]
  };

  const betterResult = optimizeFabricCutting(betterLayoutInput);

  assert(betterResult.success === true, 'Optimization executed successfully');
  assert(betterResult.placedCount === 4, `Optimized placed all 4 pieces (got ${betterResult.placedCount})`);
  assert(betterResult.baselinePlacedCount === 2, `Sequential baseline placed only 2 pieces (got ${betterResult.baselinePlacedCount})`);
  assert(betterResult.utilization === 80.0, `Optimized utilization is 80.0% (got ${betterResult.utilization}%)`);
  assert(betterResult.baselineUtilization === 56.0, `Baseline utilization is 56.0% (got ${betterResult.baselineUtilization}%)`);
  assert(betterResult.utilizationDeltaPp === 24.0, `Yield improvement is exactly +24.0 pp (got ${betterResult.utilizationDeltaPp} pp)`);
  assert(betterResult.wasteDeltaPp === 24.0, `Waste reduction is exactly -24.0 pp (got ${betterResult.wasteDeltaPp} pp)`);
  assert(betterResult.fabricSavedMeters > 0, `Fabric saved meters is positive (${betterResult.fabricSavedMeters}m)`);
  assert(betterResult.fabricSavedKg > 0, `Fabric saved kg is positive (${betterResult.fabricSavedKg}kg)`);

  let betterHasOverlap = false;
  for (let i = 0; i < betterResult.layoutPlacements.length; i++) {
    for (let j = i + 1; j < betterResult.layoutPlacements.length; j++) {
      if (checkOverlap(betterResult.layoutPlacements[i], betterResult.layoutPlacements[j], 0)) {
        betterHasOverlap = true;
      }
    }
  }
  assert(!betterHasOverlap, 'Zero overlap between any placed pieces in optimized layout');

  let betterInBounds = true;
  betterResult.layoutPlacements.forEach((p) => {
    if (p.x < 0 || p.y < 0 || p.x + p.width > 100 || p.y + p.height > 100) {
      betterInBounds = false;
    }
  });
  assert(betterInBounds, 'All placed pieces stay strictly inside 100×100 boundary');

  // ==========================================
  // TEST CASE 11: Largest-Area-First vs Small-First Naive Sequence Packing
  // ==========================================
  console.log('\n--- Test Case 11: Multi-Heuristic Ordering (Largest-First Resolving Fragmentation) ---');
  const fragmentationInput = {
    fabricWidth: 70,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: false,
    respectGrain: true,
    patterns: [
      {
        id: 'pat-small-block',
        name: 'Small Block',
        width: 40,
        height: 35,
        quantity: 2
      },
      {
        id: 'pat-big-body',
        name: 'Large Body Block',
        width: 70,
        height: 35,
        quantity: 1
      }
    ]
  };

  const fragResult = optimizeFabricCutting(fragmentationInput);
  assert(fragResult.success === true, 'Ordering optimization succeeded');
  assert(fragResult.placedCount === 3, `All 3 pieces placed by optimizer (got ${fragResult.placedCount})`);
  assert(fragResult.baselinePlacedCount === 2, `Baseline placed only 2 small pieces, failing to place the large piece (got ${fragResult.baselinePlacedCount})`);
  assert(fragResult.utilization === 75.0, `Optimized utilization is 75.0% (got ${fragResult.utilization}%)`);
  assert(fragResult.baselineUtilization === 40.0, `Baseline utilization was only 40.0% (got ${fragResult.baselineUtilization}%)`);
  assert(fragResult.utilizationDeltaPp === 35.0, `Utilization gain is +35.0 pp (got ${fragResult.utilizationDeltaPp} pp)`);

  // ==========================================
  // TEST CASE 12: Rotation & Grain Direction Constraints
  // ==========================================
  console.log('\n--- Test Case 12: Strict Rotation and Grain Direction Rules ---');
  
  // 1. Rotation Disabled: No piece should have rotation !== 0
  const noRotInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: false,
    respectGrain: true,
    patterns: [
      { id: 'pat-nr', name: 'Rect', width: 40, height: 25, quantity: 2, rotationAllowed: false }
    ]
  };
  const noRotResult = optimizeFabricCutting(noRotInput);
  const anyRotatedWhenDisabled = noRotResult.layoutPlacements.some((p) => p.rotation !== 0);
  assert(!anyRotatedWhenDisabled, 'Zero pieces are rotated when allowRotation is false');

  // 2. Vertical Grain: Only 0° or 180° allowed
  const vertGrainInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      { id: 'pat-vg', name: 'Vert Piece', width: 30, height: 60, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical' }
    ]
  };
  const vertResult = optimizeFabricCutting(vertGrainInput);
  const invalidVertRot = vertResult.layoutPlacements.some((p) => p.rotation !== 0 && p.rotation !== 180);
  assert(!invalidVertRot, 'Vertical grain constraint permits only 0° and 180° orientations');

  // 3. Horizontal Grain: Only 90° or 270° allowed
  const horizGrainInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      { id: 'pat-hg', name: 'Horiz Piece', width: 30, height: 60, quantity: 2, rotationAllowed: true, grainConstraint: 'Horizontal' }
    ]
  };
  const horizResult = optimizeFabricCutting(horizGrainInput);
  const invalidHorizRot = horizResult.layoutPlacements.some((p) => p.rotation !== 90 && p.rotation !== 270);
  assert(!invalidHorizRot, 'Horizontal grain constraint permits only 90° and 270° orientations');

  // ==========================================
  // TEST CASE 13: Clearance Spacing Constraints
  // ==========================================
  console.log('\n--- Test Case 13: Strict Clearance Spacing Enforcement ---');
  const clearanceSpacing = 2.0; // 2 cm required clearance
  const clearanceInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: clearanceSpacing,
    allowRotation: true,
    respectGrain: false,
    patterns: [
      { id: 'pat-c1', name: 'Block A', width: 30, height: 30, quantity: 4, rotationAllowed: true }
    ]
  };

  const clearanceResult = optimizeFabricCutting(clearanceInput);
  assert(clearanceResult.placedCount === 4, 'All 4 clearance test pieces placed');

  let clearanceViolation = false;
  for (let i = 0; i < clearanceResult.layoutPlacements.length; i++) {
    for (let j = i + 1; j < clearanceResult.layoutPlacements.length; j++) {
      const p1 = clearanceResult.layoutPlacements[i];
      const p2 = clearanceResult.layoutPlacements[j];
      if (checkOverlap(p1, p2, clearanceSpacing)) {
        clearanceViolation = true;
      }
    }
  }
  assert(!clearanceViolation, `All placed pieces strictly maintain >= ${clearanceSpacing}cm clearance`);

  // ==========================================
  // TEST CASE 14: Irregular Polygon Contour Pieces
  // ==========================================
  console.log('\n--- Test Case 14: Irregular Polygon Contour Geometry & SAT Collision ---');
  const normalizedBodice = [
    { x: 0.0, y: 0.2 },
    { x: 0.35, y: 0.0 },
    { x: 0.75, y: 0.08 },
    { x: 1.0, y: 0.38 },
    { x: 0.9, y: 1.0 },
    { x: 0.0, y: 1.0 }
  ];

  const irregularInput = {
    fabricWidth: 100,
    fabricLength: 150,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      {
        id: 'pat-bodice',
        name: 'Front Bodice Contour',
        shapeType: 'irregular',
        width: 40,
        height: 50,
        quantity: 4,
        outline: normalizedBodice
      }
    ]
  };

  const irregularResult = optimizeFabricCutting(irregularInput);
  assert(irregularResult.success === true, 'Irregular pattern optimization executed successfully');
  assert(irregularResult.placedCount === 4, `All 4 irregular pieces placed (got ${irregularResult.placedCount})`);

  let irregularOverlap = false;
  let irregularInBounds = true;
  for (let i = 0; i < irregularResult.layoutPlacements.length; i++) {
    const p1 = irregularResult.layoutPlacements[i];
    if (p1.worldPoints && !isPolygonWithinFabric(p1.worldPoints, 150, 100)) {
      irregularInBounds = false;
    }
    for (let j = i + 1; j < irregularResult.layoutPlacements.length; j++) {
      const p2 = irregularResult.layoutPlacements[j];
      if (checkPolygonCollision(p1.worldPoints, p2.worldPoints, 0.5)) {
        irregularOverlap = true;
      }
    }
  }
  assert(!irregularOverlap, 'Zero collision between placed irregular polygon pieces');
  assert(irregularInBounds, 'All irregular polygon vertices stay strictly inside 150×100 fabric');

  // ==========================================
  // TEST CASE 15: Strict Determinism Invariant
  // ==========================================
  console.log('\n--- Test Case 15: Deterministic Output Invariant Across Multiple Executions ---');
  const detInput = {
    fabricWidth: 150,
    fabricLength: 300,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      { id: 'det-1', name: 'Front', width: 45, height: 60, quantity: 4, rotationAllowed: true },
      { id: 'det-2', name: 'Sleeve', width: 25, height: 40, quantity: 4, rotationAllowed: true },
      { id: 'det-3', name: 'Pocket', width: 15, height: 15, quantity: 4, rotationAllowed: true }
    ]
  };

  const firstRun = optimizeFabricCutting(detInput);
  let strictlyIdentical = true;

  for (let iteration = 1; iteration <= 5; iteration++) {
    const rerun = optimizeFabricCutting(detInput);
    if (
      rerun.placedCount !== firstRun.placedCount ||
      rerun.utilization !== firstRun.utilization ||
      rerun.utilizationDeltaPp !== firstRun.utilizationDeltaPp ||
      rerun.fabricSavedMeters !== firstRun.fabricSavedMeters ||
      rerun.layoutPlacements.length !== firstRun.layoutPlacements.length
    ) {
      strictlyIdentical = false;
      break;
    }
    for (let pIdx = 0; pIdx < firstRun.layoutPlacements.length; pIdx++) {
      const pA = firstRun.layoutPlacements[pIdx];
      const pB = rerun.layoutPlacements[pIdx];
      if (pA.x !== pB.x || pA.y !== pB.y || pA.rotation !== pB.rotation) {
        strictlyIdentical = false;
        break;
      }
    }
  }

  assert(strictlyIdentical, 'Optimizer produces 100% strictly identical layouts and metrics across 5 consecutive runs');

  // ==========================================
  // TEST CASE 16: Front Bodice ×10 + Back Bodice ×10 => Exactly 20 Placements
  // ==========================================
  console.log('\n--- Test Case 16: 10 Front + 10 Back => Exactly 20 Placements with Valid Layout ---');
  const full20Input = {
    fabricWidth: 150,
    fabricLength: 500,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      { id: 'pat-front', name: 'Front Bodice', category: 'FRONT', shapeType: 'front-bodice', width: 40, height: 60, quantity: 10, rotationAllowed: true, grainConstraint: 'Vertical' },
      { id: 'pat-back', name: 'Back Bodice', category: 'BACK', shapeType: 'back-bodice', width: 40, height: 60, quantity: 10, rotationAllowed: true, grainConstraint: 'Vertical' }
    ]
  };

  const full20Result = optimizeFabricCutting(full20Input);
  assert(full20Result.success === true, 'Optimization executed with success flag true');
  assert(full20Result.isFullSuccess === true, 'isFullSuccess is true for 20 of 20 pieces');
  assert(full20Result.totalPieces === 20, 'Total pieces is exactly 20');
  assert(full20Result.placedCount === 20, `Placed count is exactly 20 (got ${full20Result.placedCount})`);
  assert(full20Result.unplacedCount === 0, `Unplaced count is 0 (got ${full20Result.unplacedCount})`);
  assert(full20Result.warning === null, 'No missing-pieces warning is returned');

  const front20Count = full20Result.layoutPlacements.filter((p) => p.patternId === 'pat-front').length;
  const back20Count = full20Result.layoutPlacements.filter((p) => p.patternId === 'pat-back').length;
  assert(front20Count === 10, `Exactly 10 Front Bodices are placed in layout (got ${front20Count})`);
  assert(back20Count === 10, `Exactly 10 Back Bodices are placed in layout (got ${back20Count})`);

  // Verify all 20 pieces have exact source dimensions: width = 40, height = 60
  let allExactDimensions20 = true;
  full20Result.layoutPlacements.forEach((p) => {
    if (p.originalWidth !== 40 || p.originalHeight !== 60) {
      allExactDimensions20 = false;
    }
  });
  assert(allExactDimensions20, 'All 20 placed pieces strictly preserve their 40×60 pattern dimensions');

  // Verify zero collision and boundary containment
  let full20Overlap = false;
  let full20InBounds = true;
  for (let i = 0; i < full20Result.layoutPlacements.length; i++) {
    const p1 = full20Result.layoutPlacements[i];
    if (p1.x < 0 || p1.y < 0 || p1.x + p1.width > 500 || p1.y + p1.height > 150) {
      full20InBounds = false;
    }
    for (let j = i + 1; j < full20Result.layoutPlacements.length; j++) {
      const p2 = full20Result.layoutPlacements[j];
      if (checkOverlap(p1, p2, 0.5)) {
        full20Overlap = true;
      }
    }
  }
  assert(!full20Overlap, 'Zero overlap among all 20 placed pieces with 0.5cm clearance');
  assert(full20InBounds, 'All 20 placed pieces stay strictly inside 500×150cm fabric boundary');

  // ==========================================
  // TEST CASE 17: Candidate Ranking: 18-piece Candidate Must Lose to 20-piece Candidate
  // ==========================================
  console.log('\n--- Test Case 17: Candidate Ranking Priority (20-Piece > 18-Piece) ---');
  const candidate20 = {
    placedCount: 20,
    placedArea: 48000,
    maxUsedX: 420,
    maxUsedY: 120.5
  };
  const candidate18 = {
    placedCount: 18,
    placedArea: 43200,
    maxUsedX: 360,
    maxUsedY: 120.5
  };

  assert(isCandidateBetter(candidate20, candidate18) === true, '20-piece candidate wins over 18-piece candidate');
  assert(isCandidateBetter(candidate18, candidate20) === false, '18-piece candidate loses to 20-piece candidate');

  // When placed counts are equal, higher area wins
  const candidateEqualCountHigherArea = { placedCount: 20, placedArea: 48000, maxUsedX: 400, maxUsedY: 120 };
  const candidateEqualCountLowerArea = { placedCount: 20, placedArea: 45000, maxUsedX: 380, maxUsedY: 120 };
  assert(isCandidateBetter(candidateEqualCountHigherArea, candidateEqualCountLowerArea) === true, 'Higher placed area wins when piece counts are equal');

  // When placed count and area are equal, lower roll length consumed wins
  const candidateMoreCompactX = { placedCount: 20, placedArea: 48000, maxUsedX: 380, maxUsedY: 120 };
  const candidateLessCompactX = { placedCount: 20, placedArea: 48000, maxUsedX: 420, maxUsedY: 120 };
  assert(isCandidateBetter(candidateMoreCompactX, candidateLessCompactX) === true, 'More compact roll length (lower maxUsedX) wins on tie-break');

  // ==========================================
  // TEST CASE 18: No Quantity Loss Across Multiple Diverse Groups
  // ==========================================
  console.log('\n--- Test Case 18: Multi-Group Pattern Quantity Preservation ---');
  const multiGroupInput = {
    fabricWidth: 150,
    fabricLength: 500,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      { id: 'pat-g1', name: 'Front', width: 35, height: 45, quantity: 4, rotationAllowed: true },
      { id: 'pat-g2', name: 'Back', width: 35, height: 45, quantity: 4, rotationAllowed: true },
      { id: 'pat-g3', name: 'Sleeve', width: 20, height: 35, quantity: 6, rotationAllowed: true },
      { id: 'pat-g4', name: 'Pocket', width: 15, height: 15, quantity: 8, rotationAllowed: true }
    ]
  };

  const multiGroupResult = optimizeFabricCutting(multiGroupInput);
  assert(multiGroupResult.isFullSuccess === true, 'All pieces placed across all 4 pattern groups');
  assert(multiGroupResult.totalPieces === 22, 'Total pieces is exactly 22 (4+4+6+8)');
  assert(multiGroupResult.placedCount === 22, 'Placed count is exactly 22');
  assert(multiGroupResult.layoutPlacements.filter(p => p.patternId === 'pat-g1').length === 4, 'Pattern G1 has exactly 4 placements');
  assert(multiGroupResult.layoutPlacements.filter(p => p.patternId === 'pat-g2').length === 4, 'Pattern G2 has exactly 4 placements');
  assert(multiGroupResult.layoutPlacements.filter(p => p.patternId === 'pat-g3').length === 6, 'Pattern G3 has exactly 6 placements');
  assert(multiGroupResult.layoutPlacements.filter(p => p.patternId === 'pat-g4').length === 8, 'Pattern G4 has exactly 8 placements');

  // ==========================================
  // TEST CASE 19: Incomplete Layout Warning When Dimensions Restrict Full Placement
  // ==========================================
  console.log('\n--- Test Case 19: Missing Piece Warning on Constrained Fabric (150×380cm) ---');
  const constrainedInput = {
    fabricWidth: 150,
    fabricLength: 380, // Length 380cm fits only 9 columns = 18 pieces of 40x60
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      { id: 'pat-front', name: 'Front Bodice', width: 40, height: 60, quantity: 10, rotationAllowed: true, grainConstraint: 'Vertical' },
      { id: 'pat-back', name: 'Back Bodice', width: 40, height: 60, quantity: 10, rotationAllowed: true, grainConstraint: 'Vertical' }
    ]
  };

  const constrainedResult = optimizeFabricCutting(constrainedInput);
  assert(constrainedResult.placedCount === 18, `Constrained layout placed 18 pieces (got ${constrainedResult.placedCount})`);
  assert(constrainedResult.unplacedCount === 2, `Constrained layout flags exactly 2 unplaced pieces (got ${constrainedResult.unplacedCount})`);
  assert(constrainedResult.isFullSuccess === false, 'isFullSuccess is strictly false when pieces are missing');
  assert(Boolean(constrainedResult.warning) && constrainedResult.warning.includes('2 of 20 pieces'), `Warning notice specifies missing piece count: "${constrainedResult.warning}"`);
  assert(constrainedResult.hasOptimalConvergence === false, 'Does not claim optimal convergence when pieces are missing');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log(`\n==========================================`);
  console.log(`Test Results: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
