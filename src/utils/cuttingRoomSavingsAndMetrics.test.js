import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeFabricCutting } from './fabricOptimizer.js';
import { generateCuttingPlan, calculateEstimatedCuttingTime } from './cuttingPlanGenerator.js';
import { getSustainabilityWording } from './sustainabilityWording.js';
import { calculatePolygonArea } from './polygonGeometry.js';

test('Cutting Room Management: Comprehensive Metrics, Counts & Savings Audit', async (t) => {
  // =========================================================================
  // TEST 1: Count Integrity (placed + unplaced === requested)
  // =========================================================================
  await t.test('1. Count Integrity: placed + unplaced strictly equals requested pieces', () => {
    // A. Full Placement Scenario
    const fullNestInput = {
      fabricWidth: 150,
      fabricLength: 300,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: false,
      patterns: [
        { id: 'p1', name: 'Front Bodice', width: 30, height: 40, quantity: 4 },
        { id: 'p2', name: 'Sleeve', width: 20, height: 30, quantity: 4 }
      ]
    };
    const fullResult = optimizeFabricCutting(fullNestInput);
    assert.strictEqual(fullResult.totalPieces, 8, 'Total requested pieces is 8');
    assert.strictEqual(fullResult.placedCount, 8, 'All 8 pieces successfully placed');
    assert.strictEqual(fullResult.unplacedCount, 0, 'Zero unplaced pieces');
    assert.strictEqual(fullResult.placedCount + fullResult.unplacedCount, fullResult.totalPieces, 'Conservation: placed + unplaced === totalPieces');
    assert.strictEqual(fullResult.isFullSuccess, true, 'isFullSuccess flag is true');

    // B. Partially Unplaced Layout Scenario (Roll length too short)
    const partialInput = {
      fabricWidth: 100,
      fabricLength: 70, // Can only fit a few 40x40 pieces
      minSpacing: 0.5,
      allowRotation: false,
      respectGrain: true,
      patterns: [
        { id: 'p-large', name: 'Large Panel', width: 45, height: 45, quantity: 10 }
      ]
    };
    const partialResult = optimizeFabricCutting(partialInput);
    assert.strictEqual(partialResult.totalPieces, 10, 'Total requested pieces is 10');
    assert(partialResult.placedCount < 10, `Subset placed (${partialResult.placedCount}/10)`);
    assert(partialResult.unplacedCount > 0, `Unplaced count positive (${partialResult.unplacedCount})`);
    assert.strictEqual(partialResult.placedCount + partialResult.unplacedCount, partialResult.totalPieces, 'Conservation: placed + unplaced === totalPieces in partial nesting');
    assert.strictEqual(partialResult.unplacedPieces.length, partialResult.unplacedCount, 'unplacedPieces array length matches unplacedCount');
    assert.strictEqual(partialResult.isFullSuccess, false, 'isFullSuccess is false');

    // Verify unplaced pieces have physical failure reason
    partialResult.unplacedPieces.forEach((p) => {
      assert(typeof p.reason === 'string' && p.reason.length > 0, 'Every unplaced piece has explanatory reason');
    });

    // C. Zero Placed Pieces Edge Case (Roll narrower than any piece)
    const zeroInput = {
      fabricWidth: 20,
      fabricLength: 50,
      minSpacing: 0.5,
      patterns: [
        { id: 'p-huge', name: 'Oversized Bodice', width: 60, height: 80, quantity: 3 }
      ]
    };
    const zeroResult = optimizeFabricCutting(zeroInput);
    assert.strictEqual(zeroResult.totalPieces, 3, 'Total requested pieces is 3');
    assert.strictEqual(zeroResult.placedCount, 0, 'Zero placed pieces');
    assert.strictEqual(zeroResult.unplacedCount, 3, 'All 3 pieces unplaced');
    assert.strictEqual(zeroResult.placedCount + zeroResult.unplacedCount, zeroResult.totalPieces, 'Conservation: 0 + 3 === 3');
    assert.strictEqual(zeroResult.success, false, 'Success is false when 0 pieces placed');
    assert.strictEqual(zeroResult.utilization, 0, 'Utilization is 0%');
    assert.strictEqual(zeroResult.actualLengthUsedCm, 0, 'Actual length used is 0cm');
    assert.strictEqual(zeroResult.actualLengthUsedM, 0, 'Actual length used is 0m');
  });

  // =========================================================================
  // TEST 2: Utilization & Waste Reconciliation (Consistent Denominators)
  // =========================================================================
  await t.test('2. Percentage Reconciliation: utilization + waste strictly equals 100%', () => {
    const input = {
      fabricWidth: 150,
      fabricLength: 400,
      minSpacing: 0.5,
      patterns: [
        { id: 'pat-a', name: 'Top A', width: 35, height: 45, quantity: 6 },
        { id: 'pat-b', name: 'Top B', width: 25, height: 35, quantity: 6 }
      ]
    };
    const res = optimizeFabricCutting(input);

    // Full Roll reconciliation
    const fullRollReconciliation = Number((res.utilization + res.wastePercentage).toFixed(1));
    assert.strictEqual(fullRollReconciliation, 100.0, `Full-roll utilization (${res.utilization}%) + waste (${res.wastePercentage}%) === 100%`);

    // Active Marker reconciliation
    if (res.markerAreaCm2 > 0) {
      const markerReconciliation = Number((res.markerUtilization + res.markerWastePercentage).toFixed(1));
      assert.strictEqual(markerReconciliation, 100.0, `Active-marker utilization (${res.markerUtilization}%) + waste (${res.markerWastePercentage}%) === 100%`);
    }

    // Denominators validation
    const expectedFabricAreaM2 = Number(((input.fabricLength * input.fabricWidth) / 10000).toFixed(3));
    assert.strictEqual(res.totalArea, expectedFabricAreaM2, 'totalArea uses exact full-roll denominator');

    const expectedMarkerAreaM2 = Number(((res.actualLengthUsedCm * input.fabricWidth) / 10000).toFixed(3));
    assert.strictEqual(res.markerAreaM2, expectedMarkerAreaM2, 'markerAreaM2 uses exact cut length × roll width denominator');

    // Pattern area matches placed polygon area exactly
    assert.strictEqual(res.placedPatternAreaM2, res.usedArea, 'placedPatternAreaM2 matches usedArea');
  });

  // =========================================================================
  // TEST 3: Distinction Between Full-Roll and Active-Marker Utilization
  // =========================================================================
  await t.test('3. Full-Roll vs Active-Marker Distinction in Partial Roll Cut', () => {
    // 500cm roll, but pieces only need ~120cm
    const input = {
      fabricWidth: 150,
      fabricLength: 500,
      minSpacing: 0.5,
      patterns: [
        { id: 'p1', name: 'Small Pocket', width: 15, height: 15, quantity: 4 }
      ]
    };
    const res = optimizeFabricCutting(input);

    assert(res.actualLengthUsedCm < 150, `Cut length is compact (${res.actualLengthUsedCm}cm < 500cm)`);
    assert(res.markerUtilization > res.utilization, `Active-marker yield (${res.markerUtilization}%) is higher than full-roll yield (${res.utilization}%)`);
    assert(res.remainingRollLengthCm > 350, `Substantial continuous roll preserved (${res.remainingRollLengthCm}cm)`);
    assert.strictEqual(
      Number((res.actualLengthUsedCm + res.remainingRollLengthCm).toFixed(1)),
      input.fabricLength,
      'Used cut length + remaining continuous roll === total roll length'
    );
  });

  // =========================================================================
  // TEST 4: Irregular Polygon True Area Calculation
  // =========================================================================
  await t.test('4. Irregular Patterns: True polygon area vs bounding box convention', () => {
    // L-shaped concave pattern piece: 40x40 with 20x20 cutout (Normalized area = 0.75, True area = 1200 cm2, BBox = 1600 cm2)
    const lShapedNormalized = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 1 }
    ];
    const normalizedArea = calculatePolygonArea(lShapedNormalized);
    assert.strictEqual(normalizedArea, 0.75, 'Normalized Shoelace area is 0.75 for L-shape');

    const irregularInput = {
      fabricWidth: 100,
      fabricLength: 200,
      minSpacing: 0.5,
      patterns: [
        {
          id: 'l-piece',
          name: 'L-Facing',
          width: 40,
          height: 40,
          quantity: 2,
          outline: lShapedNormalized
        }
      ]
    };
    const res = optimizeFabricCutting(irregularInput);
    assert.strictEqual(res.placedCount, 2, 'Placed 2 irregular pieces');
    
    // Total pattern area should be 2 × 1200 = 2400 cm2 = 0.24 m2 (NOT 2 × 1600 = 3200 cm2)
    assert.strictEqual(res.placedPatternAreaCm2, 2400, 'Pattern area uses exact Shoelace polygon area (2400 cm²)');
    assert.strictEqual(res.placedPatternAreaM2, 0.24, 'Pattern area in m² is 0.24 m²');
  });

  // =========================================================================
  // TEST 5: Different Roll Dimensions (Wide vs Narrow Rolls)
  // =========================================================================
  await t.test('5. Roll Dimensions: Wide roll vs Narrow roll scaling', () => {
    const pieces = [
      { id: 'p1', name: 'Panel', width: 40, height: 60, quantity: 4 }
    ];

    // Wide roll: 180cm width × 200cm length
    const wideRes = optimizeFabricCutting({
      fabricWidth: 180,
      fabricLength: 200,
      patterns: pieces
    });
    assert.strictEqual(wideRes.fabricWidth, 180, 'Wide roll width 180cm');
    assert.strictEqual(wideRes.fabricLength, 200, 'Wide roll length 200cm');
    assert.strictEqual(wideRes.totalArea, 3.6, 'Wide roll totalArea is 3.6 m²');

    // Narrow roll: 90cm width × 500cm length
    const narrowRes = optimizeFabricCutting({
      fabricWidth: 90,
      fabricLength: 500,
      patterns: pieces
    });
    assert.strictEqual(narrowRes.fabricWidth, 90, 'Narrow roll width 90cm');
    assert.strictEqual(narrowRes.fabricLength, 500, 'Narrow roll length 500cm');
    assert.strictEqual(narrowRes.totalArea, 4.5, 'Narrow roll totalArea is 4.5 m²');

    // Both place all 4 panels
    assert.strictEqual(wideRes.placedCount, 4, 'Wide roll places all 4');
    assert.strictEqual(narrowRes.placedCount, 4, 'Narrow roll places all 4');
  });

  // =========================================================================
  // TEST 6: Missing Baseline Handling (Never Invent Figures)
  // =========================================================================
  await t.test('6. Baseline Transparency: Missing baseline never invents savings', () => {
    // Project with explicit hasValidBaseline: false
    const noBaselineProject = {
      id: 'proj-no-base',
      name: 'Custom Cut Without Baseline',
      fabricWidth: 150,
      fabricLength: 500,
      hasValidBaseline: false,
      baselineUtilization: null,
      baselineWastePercentage: null,
      utilization: 88.5,
      wastePercentage: 11.5,
      fabricSavedMeters: 0,
      patterns: [
        { id: 'p1', name: 'Bodice', width: 35, height: 50, quantity: 4 }
      ],
      layoutPlacements: [
        { id: 'pl-1', width: 35, height: 50, x: 0, y: 0 }
      ]
    };

    const plan = generateCuttingPlan(noBaselineProject);
    assert.strictEqual(plan.optimizationSummary.hasValidBaseline, false, 'hasValidBaseline is false');
    assert.strictEqual(plan.optimizationSummary.fabricSavedMeters, 0, 'Fabric saved meters is strictly 0');
    assert.strictEqual(plan.optimizationSummary.estimatedCostSavings, 0, 'Monetary savings is strictly $0.00');

    // Dynamic Sustainability Wording
    const wording = getSustainabilityWording({
      utilization: 88.5,
      waste: 11.5,
      baselineUtilization: null,
      baselineWaste: null,
      utilizationDeltaPp: null,
      fabricSavedMeters: 0,
      fabricSavedKg: 0
    });

    assert.strictEqual(wording.statusKey, 'no-baseline', 'Wording statusKey is "no-baseline"');
    assert(
      wording.impactSummary.includes('Baseline marker data is required for comparative savings analysis') ||
      wording.impactSummary.includes('Baseline marker required') ||
      wording.impactSummary.includes('comparative savings analysis'),
      'Wording explains baseline is required'
    );
  });

  // =========================================================================
  // TEST 7: Monetary Savings Calculation & Clear Assumption Display
  // =========================================================================
  await t.test('7. Monetary Savings: Linear fabric price derivation and assumptions', () => {
    // Baseline consumption: 4.5m; Optimized consumption: 3.5m -> 1.0m saved
    const userPricePerMeter = 250.00; // ₹250.00 / linear meter in INR

    const projectWithBaseline = {
      id: 'proj-monetary',
      name: 'Polo Shirt Batch',
      fabricWidth: 150,
      fabricLength: 500,
      fabricPricePerMeter: userPricePerMeter,
      hasValidBaseline: true,
      baselineUtilization: 78.0,
      baselineWastePercentage: 22.0,
      baselineLengthUsedM: 4.50,
      actualLengthUsedM: 3.50,
      actualLengthUsedCm: 350,
      fabricSavedMeters: 1.00,
      utilization: 88.0,
      wastePercentage: 12.0,
      utilizationDeltaPp: 10.0,
      patterns: [
        { id: 'p1', name: 'Polo Front', width: 40, height: 60, quantity: 2 }
      ],
      layoutPlacements: [
        { id: 'pl-1', width: 40, height: 60, x: 0, y: 0 },
        { id: 'pl-2', width: 40, height: 60, x: 42, y: 0 }
      ]
    };

    const plan = generateCuttingPlan(projectWithBaseline);
    assert.strictEqual(plan.optimizationSummary.fabricPricePerMeter, 250.00, 'Price per meter is ₹250.00');
    assert.strictEqual(plan.optimizationSummary.fabricSavedMeters, 1.00, 'Fabric saved is 1.00m');
    
    // Expected monetary savings: 1.00m × ₹250.00/m = ₹250.00
    const expectedSavings = Number((1.00 * userPricePerMeter).toFixed(2));
    assert.strictEqual(plan.optimizationSummary.estimatedCostSavings, expectedSavings, `Estimated cost savings is ₹${expectedSavings}`);

    // Default price fallback: when not specified, defaults to ₹200/m
    const projectWithoutPrice = {
      ...projectWithBaseline,
      fabricPricePerMeter: undefined,
      fabricPrice: undefined
    };
    const defaultPlan = generateCuttingPlan(projectWithoutPrice);
    assert.strictEqual(defaultPlan.optimizationSummary.fabricPricePerMeter, 200.0, 'Default fabric price is ₹200.00/m');
    assert.strictEqual(defaultPlan.optimizationSummary.estimatedCostSavings, 200.0, 'Default estimated savings is ₹200.00 for 1m saved');

    // Negative / 0 savings case: optimized layout achieves 0m reduction vs baseline
    const zeroSavingProject = {
      ...projectWithBaseline,
      fabricSavedMeters: 0,
      actualLengthUsedM: 4.50
    };
    const zeroPlan = generateCuttingPlan(zeroSavingProject);
    assert.strictEqual(zeroPlan.optimizationSummary.estimatedCostSavings, 0, 'Cost savings is ₹0.00 when 0m saved');
  });

  // =========================================================================
  // TEST 8: Zero Placed Pieces Edge Case in Cutting Time and Generator
  // =========================================================================
  await t.test('8. Edge Case: Zero placed pieces does not divide by zero', () => {
    const emptyTime = calculateEstimatedCuttingTime([], 500, 150);
    assert.strictEqual(emptyTime.totalSeconds, 0, 'Total seconds is 0');
    assert.strictEqual(emptyTime.formatted, '0 min 0 sec', 'Formatted string is 0 min 0 sec');
    assert.strictEqual(emptyTime.averageTimePerPieceSec, 0, 'Average time per piece is 0 sec');

    const emptyProject = {
      id: 'proj-empty',
      name: 'Empty Project',
      fabricWidth: 150,
      fabricLength: 500,
      utilization: 0,
      wastePercentage: 100,
      patterns: [],
      layoutPlacements: []
    };
    const emptyPlan = generateCuttingPlan(emptyProject);
    assert.strictEqual(emptyPlan.placedPiecesCount, 0, 'Placed pieces count is 0');
    assert.strictEqual(emptyPlan.optimizationSummary.actualLengthUsedCm, 0, 'Cut length defaults to 0cm');
    assert.strictEqual(emptyPlan.optimizationSummary.actualLengthUsedM, 0, 'Cut length defaults to 0m');
    assert.strictEqual(emptyPlan.optimizationSummary.markerAreaM2, 0, 'Marker area is 0 m²');
    assert.strictEqual(emptyPlan.optimizationSummary.markerUtilization, 0, 'Marker utilization is 0%');
  });
});
