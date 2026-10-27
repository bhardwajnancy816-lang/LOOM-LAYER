import test from 'node:test';
import assert from 'node:assert';
import {
  calculateFabricRequirement,
  exploreFabricRequirement,
  STOCK_STATUS
} from './fabricRequirementPlanner.js';
import { initialProjects } from '../data/mockProjects.js';

test('Fabric Requirement Planner — Stock Sufficiency, Feasibility Estimation & Cost Analysis', async (t) => {

  await t.test('1. Sufficient Stock: Available roll exceeds estimated requirement', () => {
    // 4 small panels (40×50cm) on a 150cm width fabric roll of 500cm length
    const sampleInput = {
      fabricWidth: 150,
      fabricLength: 500, // 5.0m available
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      fabricPricePerMeter: 250.0, // ₹250/m
      patterns: [
        {
          id: 'p-1',
          name: 'Front Panel',
          width: 40,
          height: 50,
          quantity: 4,
          rotationAllowed: true,
          grainConstraint: 'Vertical'
        }
      ]
    };

    const plan = calculateFabricRequirement(sampleInput);

    assert.strictEqual(plan.isValid, true, 'Planner executes successfully');
    assert.strictEqual(plan.totalRequestedPieces, 4, '4 pattern pieces requested');
    assert.strictEqual(plan.isSufficient, true, 'Stock is marked sufficient');
    assert.strictEqual(plan.stockStatus, STOCK_STATUS.SUFFICIENT, 'Status is SUFFICIENT_STOCK');
    
    // 4 pieces of 40x50 fit in ~100-110cm on 150cm roll
    assert.ok(plan.estimatedRequiredLengthCm <= 200, `Estimated length (${plan.estimatedRequiredLengthCm}cm) is reasonable`);
    assert.ok(plan.surplusCm > 300, `Surplus length (${plan.surplusCm}cm) is reported accurately`);
    assert.strictEqual(plan.shortfallCm, 0, 'Zero shortfall');
    assert.strictEqual(plan.shortfallM, 0, 'Zero shortfall meters');

    // Financial calculations in INR (₹)
    const expectedCost = Number((plan.estimatedRequiredLengthM * 250.0).toFixed(2));
    assert.strictEqual(plan.estimatedFabricCost, expectedCost, `Estimated cost ₹${plan.estimatedFabricCost} matches rate ₹250/m`);
    assert.strictEqual(plan.shortfallCost, 0, 'Shortfall cost is ₹0.00');
    assert.ok(plan.surplusStockValue > 0, `Surplus stock value (+₹${plan.surplusStockValue}) is positive`);
  });

  await t.test('2. Insufficient Stock: Order demand exceeds available roll length', () => {
    // 20 jackets on a short 200cm (2.0m) fabric roll
    const insufficientInput = {
      fabricWidth: 150,
      fabricLength: 200, // Only 2.0m available
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      fabricPricePerMeter: 300.0, // ₹300/m
      patterns: [
        {
          id: 'j-1',
          name: 'Jacket Front',
          width: 45,
          height: 70,
          quantity: 10,
          rotationAllowed: true,
          grainConstraint: 'Vertical'
        },
        {
          id: 'j-2',
          name: 'Jacket Back',
          width: 45,
          height: 70,
          quantity: 10,
          rotationAllowed: true,
          grainConstraint: 'Vertical'
        }
      ]
    };

    const plan = calculateFabricRequirement(insufficientInput);

    assert.strictEqual(plan.isValid, true, 'Planner executes successfully');
    assert.strictEqual(plan.totalRequestedPieces, 20, '20 pattern pieces requested');
    assert.strictEqual(plan.isSufficient, false, 'Stock is flagged insufficient');
    assert.strictEqual(plan.stockStatus, STOCK_STATUS.INSUFFICIENT, 'Status is STOCK_SHORTFALL');
    
    // 20 panels of 45x70cm require significantly more than 200cm
    assert.ok(plan.estimatedRequiredLengthCm > 400, `Estimated length (${plan.estimatedRequiredLengthCm}cm) correctly exceeds 200cm`);
    assert.ok(plan.shortfallCm > 200, `Shortfall length (${plan.shortfallCm}cm) is accurately calculated`);
    assert.ok(plan.shortfallM > 2.0, `Shortfall in meters (${plan.shortfallM}m) is positive`);
    assert.strictEqual(plan.surplusCm, 0, 'Zero surplus on shortfall');

    // Cost calculations
    assert.ok(plan.shortfallCost > 0, `Shortfall cost (+₹${plan.shortfallCost}) reflects additional purchase needed`);
    assert.strictEqual(plan.surplusStockValue, 0, 'Surplus value is ₹0.00 on shortfall');
  });

  await t.test('3. Methodology Transparency: 2D Nesting Feasibility vs Geometric Area Floor', () => {
    const proj1 = initialProjects[0]; // Summer Shirt Collection (50 pieces)
    const plan = calculateFabricRequirement({
      fabricWidth: proj1.fabricWidth,
      fabricLength: proj1.fabricLength,
      patterns: proj1.patterns,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      fabricPricePerMeter: 200.0
    });

    assert.strictEqual(plan.isValid, true, 'Execution succeeds');
    
    // Theoretical floor: pure net pattern area divided by fabric width
    assert.ok(plan.theoreticalMinLengthCm > 0, 'Theoretical floor length is positive');
    
    // 2D nesting feasibility must be greater than theoretical floor due to clearance and geometry
    assert.ok(
      plan.estimatedRequiredLengthCm > plan.theoreticalMinLengthCm,
      `Feasibility estimate (${plan.estimatedRequiredLengthCm}cm) exceeds theoretical zero-waste floor (${plan.theoreticalMinLengthCm}cm) by clearance & grain margin`
    );

    // Verifies preliminary estimate is explicitly labeled
    assert.strictEqual(plan.isPreliminaryEstimate, true, 'Explicitly labeled as preliminary estimate');
  });

  await t.test('4. Safe What-If Stock Exploration without Silent Mutation', () => {
    const baseParams = {
      fabricWidth: 140,
      fabricLength: 300,
      minSpacing: 0.5,
      patterns: [
        { id: 't-1', name: 'Tee Front', width: 40, height: 60, quantity: 8 }
      ]
    };

    const originalLength = baseParams.fabricLength;
    const originalWidth = baseParams.fabricWidth;

    // Explore a longer roll of 600cm and wider width 150cm
    const exploration = exploreFabricRequirement(baseParams, {
      fabricLength: 600,
      fabricWidth: 150
    });

    assert.strictEqual(exploration.isExploration, true, 'Flagged as exploration scenario');
    assert.strictEqual(exploration.exploredLength, 600, 'Explored length is 600cm');
    assert.strictEqual(exploration.exploredWidth, 150, 'Explored width is 150cm');
    assert.strictEqual(exploration.originalLength, 300, 'Original length preserved in exploration record');
    assert.strictEqual(exploration.originalWidth, 140, 'Original width preserved in exploration record');

    // Verify baseParams was NOT mutated silently
    assert.strictEqual(baseParams.fabricLength, originalLength, 'Base project length is untouched');
    assert.strictEqual(baseParams.fabricWidth, originalWidth, 'Base project width is untouched');
  });

  await t.test('5. Post-Nesting Validation & Unplaced Pieces Handling', () => {
    // Project with completed nesting where 8 pieces were unplaced
    const projectWithUnplaced = {
      fabricWidth: 150,
      fabricLength: 500,
      patterns: [
        { id: 'pat-1', name: 'Bodice', width: 40, height: 60, quantity: 10 }
      ],
      // 8 pieces placed out of 10
      layoutPlacements: Array(8).fill(null).map((_, i) => ({
        id: `pl-${i}`,
        name: `Bodice #${i + 1}`,
        x: i * 40.5,
        y: 0,
        width: 40,
        height: 60
      })),
      actualLengthUsedCm: 324.0
    };

    const plan = calculateFabricRequirement(projectWithUnplaced);

    assert.strictEqual(plan.hasValidatedResult, true, 'Detects validated post-nesting layout');
    assert.strictEqual(plan.validatedPlacedCount, 8, '8 placed pieces validated');
    assert.strictEqual(plan.validatedUnplacedCount, 2, '2 unplaced pieces detected');
    assert.strictEqual(plan.isOrderFullyPlaced, false, 'Does NOT claim order is fully completed when unplaced pieces exist');
    assert.strictEqual(plan.validatedCutLengthCm, 324.0, 'Validated cut length matches actual length used');

    // Completed project where ALL pieces were placed
    const projectAllPlaced = {
      fabricWidth: 150,
      fabricLength: 500,
      patterns: [
        { id: 'pat-1', name: 'Bodice', width: 40, height: 60, quantity: 4 }
      ],
      layoutPlacements: Array(4).fill(null).map((_, i) => ({
        id: `pl-${i}`,
        name: `Bodice #${i + 1}`,
        x: i * 40.5,
        y: 0,
        width: 40,
        height: 60
      })),
      actualLengthUsedCm: 162.0
    };

    const fullyPlacedPlan = calculateFabricRequirement(projectAllPlaced);
    assert.strictEqual(fullyPlacedPlan.hasValidatedResult, true);
    assert.strictEqual(fullyPlacedPlan.validatedPlacedCount, 4);
    assert.strictEqual(fullyPlacedPlan.validatedUnplacedCount, 0);
    assert.strictEqual(fullyPlacedPlan.isOrderFullyPlaced, true, 'Correctly flags order as fully placed when unplacedCount is 0');
  });

  await t.test('6. Dynamic Response to Fabric Width Changes (150cm vs 200cm vs 250cm on 9-piece project)', () => {
    // Exact standard 9-piece shirt project: 6 pattern templates totaling 9 garment pieces
    const standard9PiecePatterns = [
      { id: 'pat-fb', name: 'Front Bodice', category: 'FRONT', shapeType: 'front-bodice', width: 40, height: 60, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical' },
      { id: 'pat-bb', name: 'Back Bodice', category: 'BACK', shapeType: 'back-bodice', width: 42, height: 62, quantity: 1, rotationAllowed: true, grainConstraint: 'Vertical' },
      { id: 'pat-sl', name: 'Sleeves', category: 'SLEEVE', shapeType: 'sleeve', width: 25, height: 52, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical' },
      { id: 'pat-cb', name: 'Collar Band', category: 'COLLAR', shapeType: 'collar', width: 15, height: 22, quantity: 1, rotationAllowed: true, grainConstraint: 'Horizontal' },
      { id: 'pat-cf', name: 'Cuffs', category: 'CUFF', shapeType: 'cuff', width: 12, height: 24, quantity: 2, rotationAllowed: true, grainConstraint: 'Horizontal' },
      { id: 'pat-cp', name: 'Chest Pocket', category: 'POCKET', shapeType: 'pocket', width: 12, height: 14, quantity: 1, rotationAllowed: true, grainConstraint: 'Flexible' }
    ];

    // Evaluate at 150cm width
    const plan150 = calculateFabricRequirement({
      fabricWidth: 150,
      fabricLength: 500,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      fabricPricePerMeter: 200.0,
      patterns: standard9PiecePatterns
    });

    // Evaluate at 200cm width
    const plan200 = calculateFabricRequirement({
      fabricWidth: 200,
      fabricLength: 500,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      fabricPricePerMeter: 200.0,
      patterns: standard9PiecePatterns
    });

    // Evaluate at 250cm width
    const plan250 = calculateFabricRequirement({
      fabricWidth: 250,
      fabricLength: 500,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      fabricPricePerMeter: 200.0,
      patterns: standard9PiecePatterns
    });

    // 150cm: Must match actual validated nesting cut length of 0.91m
    assert.strictEqual(plan150.estimatedRequiredLengthM, 0.91, '150cm width estimate matches 0.91m validated nesting length');
    assert.strictEqual(plan150.estimatedFabricCost, 182.0, '150cm cost is ₹182.00 (0.91m × ₹200)');

    // 200cm: Must scale down significantly from 150cm (not stall at 1.05m)
    assert.ok(
      plan200.estimatedRequiredLengthM < plan150.estimatedRequiredLengthM,
      `200cm width estimate (${plan200.estimatedRequiredLengthM}m) is less than 150cm estimate (${plan150.estimatedRequiredLengthM}m)`
    );
    assert.ok(
      plan200.estimatedRequiredLengthM <= 0.70,
      `200cm width estimate (${plan200.estimatedRequiredLengthM}m) packs across width efficiently (<= 0.70m)`
    );
    assert.strictEqual(plan200.estimatedFabricCost, Number((plan200.estimatedRequiredLengthM * 200.0).toFixed(2)), '200cm cost matches linear metres × ₹200');

    // 250cm: Must scale down further or equal 200cm
    assert.ok(
      plan250.estimatedRequiredLengthM <= plan200.estimatedRequiredLengthM,
      `250cm width estimate (${plan250.estimatedRequiredLengthM}m) is <= 200cm estimate (${plan200.estimatedRequiredLengthM}m)`
    );
    assert.ok(
      plan250.estimatedRequiredLengthM <= 0.68,
      `250cm width estimate (${plan250.estimatedRequiredLengthM}m) is <= 0.68m`
    );
    assert.strictEqual(plan250.estimatedFabricCost, Number((plan250.estimatedRequiredLengthM * 200.0).toFixed(2)), '250cm cost matches linear metres × ₹200');
  });

  await t.test('7. Dynamic Response to Roll Length Changes (Surplus vs Shortfall)', () => {
    const patterns = [
      { id: 'pat-1', name: 'Bodice', width: 40, height: 60, quantity: 2 }
    ];

    // Case A: 500cm (5.0m) roll stock
    const longRollPlan = calculateFabricRequirement({
      fabricWidth: 150,
      fabricLength: 500,
      patterns
    });
    assert.strictEqual(longRollPlan.isSufficient, true, 'Long roll is sufficient');
    assert.strictEqual(longRollPlan.stockStatus, STOCK_STATUS.SUFFICIENT);
    assert.ok(longRollPlan.surplusM > 4.0, 'Reports large surplus on 5m roll');
    assert.strictEqual(longRollPlan.shortfallM, 0, 'Zero shortfall on 5m roll');

    // Case B: 25cm (0.25m) roll stock (insufficient for pieces of 40x60cm)
    const shortRollPlan = calculateFabricRequirement({
      fabricWidth: 150,
      fabricLength: 25,
      patterns
    });
    assert.strictEqual(shortRollPlan.isSufficient, false, 'Short roll is insufficient');
    assert.strictEqual(shortRollPlan.stockStatus, STOCK_STATUS.INSUFFICIENT);
    assert.ok(shortRollPlan.shortfallM > 0, 'Reports positive shortfall on 50cm roll');
    assert.strictEqual(shortRollPlan.surplusM, 0, 'Zero surplus on 50cm roll');
    assert.ok(shortRollPlan.shortfallCost > 0, 'Shortfall cost is positive');
  });

  await t.test('8. Fresh Recalculations without Stale Estimates', () => {
    const patterns = [
      { id: 'pat-1', name: 'Small Panel', width: 30, height: 30, quantity: 1 }
    ];

    // Initial calculation
    const run1 = calculateFabricRequirement({ fabricWidth: 100, fabricLength: 200, patterns });
    // Same pieces on a roll 5 times wider
    const run2 = calculateFabricRequirement({ fabricWidth: 500, fabricLength: 200, patterns });

    assert.notStrictEqual(run1.fabricWidth, run2.fabricWidth, 'Widths differ between runs');
    assert.strictEqual(run1.fabricWidth, 100);
    assert.strictEqual(run2.fabricWidth, 500);

    // Using exploreFabricRequirement
    const explored = exploreFabricRequirement({ fabricWidth: 100, fabricLength: 200, patterns }, { fabricWidth: 300, fabricLength: 400 });
    assert.strictEqual(explored.fabricWidth, 300, 'Exploration reflects new width');
    assert.strictEqual(explored.availableRollLengthCm, 400, 'Exploration reflects new length');
  });

  await t.test('9. Verification of Area-Floor Units and Zero-Waste Lower Bound', () => {
    // 9-piece project: totalPatternArea = 11,078 cm2
    const patterns = [
      { id: 'p1', width: 40, height: 60, quantity: 2 }, // 4800 cm2
      { id: 'p2', width: 42, height: 62, quantity: 1 }, // 2604 cm2
      { id: 'p3', width: 25, height: 52, quantity: 2 }, // 2600 cm2
      { id: 'p4', width: 15, height: 22, quantity: 1 }, // 330 cm2
      { id: 'p5', width: 12, height: 24, quantity: 2 }, // 576 cm2
      { id: 'p6', width: 12, height: 14, quantity: 1 }  // 168 cm2
    ];
    // Total net area = 11,078 cm2

    const widthCm = 150;
    const plan = calculateFabricRequirement({
      fabricWidth: widthCm,
      fabricLength: 500,
      patterns
    });

    // Verification of units:
    // Area (cm2) / Width (cm) = Length (cm)
    // 11078 cm2 / 150 cm = 73.85 cm
    const expectedFloorCm = Number((11078 / 150).toFixed(1));
    const expectedFloorM = Number((expectedFloorCm / 100).toFixed(2));

    assert.strictEqual(plan.totalPatternAreaCm2, 11078, 'Total pattern area is exactly 11,078 cm²');
    assert.strictEqual(plan.theoreticalMinLengthCm, expectedFloorCm, 'Floor length in cm is area divided by width');
    assert.strictEqual(plan.theoreticalMinLengthM, expectedFloorM, 'Floor length in m is cm / 100');

    // Theoretical floor assumes 0% waste / 100% packing, so 2D nesting feasibility MUST strictly exceed floor
    assert.ok(
      plan.estimatedRequiredLengthCm > plan.theoreticalMinLengthCm,
      `Realistic 2D nesting feasibility (${plan.estimatedRequiredLengthCm}cm) strictly exceeds theoretical zero-waste floor (${plan.theoreticalMinLengthCm}cm)`
    );
  });

  await t.test('10. Financial Calculation: Cost Derived Exactly Once as Linear Metres × Unit Rate', () => {
    const patterns = [
      { id: 'p1', width: 50, height: 100, quantity: 2 }
    ];

    const unitPrice = 275.50; // ₹275.50 per linear metre
    const plan = calculateFabricRequirement({
      fabricWidth: 150,
      fabricLength: 500,
      patterns,
      fabricPricePerMeter: unitPrice
    });

    const expectedCost = Number((plan.estimatedRequiredLengthM * unitPrice).toFixed(2));
    assert.strictEqual(plan.estimatedFabricCost, expectedCost, 'Fabric cost is estimated linear metres × unit price');
    assert.strictEqual(plan.fabricPricePerMeter, unitPrice, 'Preserves configured unit price');
  });

  await t.test('11. Validated Cut Comparison: Strict Comparability vs Informational Notice', () => {
    const patterns = [
      { id: 'p1', name: 'Front', width: 40, height: 60, quantity: 2 },
      { id: 'p2', name: 'Back', width: 40, height: 60, quantity: 2 }
    ];

    const baseProject = {
      fabricWidth: 150,
      fabricLength: 500,
      patterns,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      actualLengthUsedCm: 90.0,
      layoutPlacements: [
        { id: 'pl-1', width: 40, height: 60, x: 0, y: 0 },
        { id: 'pl-2', width: 40, height: 60, x: 41, y: 0 },
        { id: 'pl-3', width: 40, height: 60, x: 0, y: 65 },
        { id: 'pl-4', width: 40, height: 60, x: 41, y: 65 }
      ]
    };

    // Case A: Identical project, width, and quantities -> Comparable
    const matchPlan = calculateFabricRequirement(baseProject);
    assert.strictEqual(matchPlan.isValidatedComparable, true, 'Matching configuration is comparable');
    assert.strictEqual(matchPlan.validatedCutLengthM, 0.90, 'Reports 0.90m validated cut length');
    assert.strictEqual(matchPlan.validatedComparisonNotice, null, 'No warning notice when matching');

    // Case B: User explores different width (200cm) -> NOT comparable
    const widthMismatchPlan = exploreFabricRequirement(baseProject, { fabricWidth: 200 });
    assert.strictEqual(widthMismatchPlan.isValidatedComparable, false, 'Different width is NOT comparable');
    assert.ok(
      widthMismatchPlan.validatedComparisonNotice.includes('150cm width'),
      'Notice informs user of original validated width'
    );

    // Case C: User changes pattern piece quantities (adds 2 more pieces) -> NOT comparable
    const quantityMismatchProject = {
      ...baseProject,
      totalPieces: 4, // Previous run had 4 pieces
      patterns: [
        { id: 'p1', name: 'Front', width: 40, height: 60, quantity: 3 },
        { id: 'p2', name: 'Back', width: 40, height: 60, quantity: 3 }
      ] // Now total is 6
    };
    const qtyMismatchPlan = calculateFabricRequirement(quantityMismatchProject);
    assert.strictEqual(qtyMismatchPlan.isValidatedComparable, false, 'Different quantity is NOT comparable');
    assert.ok(
      qtyMismatchPlan.validatedComparisonNotice.includes('quantities have changed'),
      'Notice informs user of pattern quantity change'
    );
  });

});

