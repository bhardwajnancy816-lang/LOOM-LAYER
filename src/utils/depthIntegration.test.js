import { test } from 'node:test';
import assert from 'node:assert';
import { optimizeFabricCutting, validateNestingLayout } from './fabricOptimizer.js';
import { checkPieceDefectCollision } from './polygonGeometry.js';
import { simulateWidthSensitivity } from './widthSensitivitySimulator.js';
import { solveCutOrderPlan, generateCopMarkerPatterns, SIZE_GRADE_FACTORS } from './cutOrderPlanner.js';
import { exportCuttingPlanToGCode, generateCuttingPlan } from './cuttingPlanGenerator.js';

test('⭐ FLAGSHIP 1: Fabric Defect & Obstacle Avoidance Routing (Zero Gap)', () => {
  const patterns = [
    { id: 'front-1', name: 'Front Bodice', category: 'FRONT', width: 45, height: 60, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical' },
    { id: 'back-1', name: 'Back Bodice', category: 'BACK', width: 45, height: 60, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical' },
    { id: 'sleeve-1', name: 'Sleeve', category: 'SLEEVE', width: 30, height: 45, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical' }
  ];

  // Introduce two active flaw obstacle zones on the fabric roll
  const defects = [
    { id: 'stain-1', x: 50, y: 35, radius: 6, clearance: 0.5, type: 'Dye Stain' },
    { id: 'slub-1', x: 120, y: 70, radius: 8, clearance: 0.5, type: 'Weave Slub' }
  ];

  const result = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 500,
    patterns,
    defects,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    optimizationPriority: 'Minimum Fabric Waste'
  });

  assert.strictEqual(result.success, true, 'Nesting optimization succeeded with active defects');
  assert.ok(result.layoutPlacements.length > 0, 'Pieces were placed on roll');

  // Verify zero collisions with any defect obstacle
  for (const piece of result.layoutPlacements) {
    for (const defect of defects) {
      const collision = checkPieceDefectCollision(piece, defect, 0.5);
      assert.strictEqual(collision, false, `Piece ${piece.name} at (${piece.x}, ${piece.y}) must not collide with defect at (${defect.x}, ${defect.y})`);
    }
  }

  // Validate layout through authoritative Nesting Validator
  const validation = validateNestingLayout(
    result.layoutPlacements,
    150,
    500,
    0.5,
    true,
    'Vertical',
    defects
  );

  assert.strictEqual(validation.isValid, true, 'Validation passes cleanly');
  assert.strictEqual(validation.defectViolationCount, 0, '0 defect violations guaranteed');
  assert.strictEqual(validation.overlapCount, 0, '0 piece-to-piece collisions');
});

test('⭐ FLAGSHIP 2: 1-Click Roll Width Sensitivity Purchasing Simulator (Zero Gap)', () => {
  const patterns = [
    { id: 'p1', name: 'Front Bodice', category: 'FRONT', width: 40, height: 55, quantity: 4 },
    { id: 'p2', name: 'Back Bodice', category: 'BACK', width: 40, height: 55, quantity: 4 },
    { id: 'p3', name: 'Sleeve', category: 'SLEEVE', width: 25, height: 40, quantity: 4 }
  ];

  const sim = simulateWidthSensitivity({
    patterns,
    fabricLength: 600,
    currentWidth: 150,
    candidateWidths: [140, 150, 160],
    fabricPricePerMeter: 200
  });

  assert.strictEqual(sim.isValid, true, 'Simulation returned valid results');
  assert.strictEqual(sim.options.length, 3, 'Evaluated all 3 commercial widths');
  assert.ok(sim.recommendedWidth > 0, 'Identified recommended width');
  assert.ok(sim.bestOption.utilization > 0, 'Best option has high utilization');
  assert.ok(typeof sim.recommendationSummary === 'string' && sim.recommendationSummary.length > 0, 'Has executive summary');

  // All 3 options should have linear consumption and material cost computed
  sim.options.forEach((opt) => {
    assert.ok(opt.linearUsedM > 0, `${opt.width}cm has linear roll cut`);
    assert.ok(opt.materialCost > 0, `${opt.width}cm has material cost`);
    assert.ok(opt.utilization > 0, `${opt.width}cm has utilization`);
  });
});

test('⭐ FLAGSHIP 3: Stage 1 AI: Cut-Order Planning Multi-Ply Solver & Graded Nesting (Zero Gap)', () => {
  // 960-Garment industrial purchase order
  const demand = {
    XS: 0,
    S: 120,
    M: 360,
    L: 360,
    XL: 120,
    XXL: 0
  };

  const plan = solveCutOrderPlan(demand, { maxPlies: 120, allowMultiLay: true });

  assert.strictEqual(plan.isValid, true, 'COP solver found valid solution');
  assert.strictEqual(plan.totalGarmentsDemand, 960, 'Demand is exactly 960 garments');
  assert.strictEqual(plan.totalGarmentsScheduled, 960, '100% order scheduled');
  assert.strictEqual(plan.isFullySatisfied, true, 'Zero over/under cut');
  assert.strictEqual(plan.lays.length, 1, 'Single optimal spread lay');

  const primaryLay = plan.lays[0];
  assert.strictEqual(primaryLay.plyCount, 120, '120 plies spread stack height');
  assert.deepStrictEqual(primaryLay.bundleRatio, { S: 1, M: 3, L: 3, XL: 1 }, '1S:3M:3L:1XL bundle ratio');
  assert.strictEqual(primaryLay.bundleSizeTotal, 8, '8 garments cut per ply');
  assert.ok(plan.interlockingYieldBoostPp > 0, 'Provides interlocking yield bonus');

  // Generate graded pattern pieces for Stage 2 Nesting
  const baseTemplates = [
    { id: 'front-t', name: 'Front Bodice', category: 'FRONT', width: 40, height: 50, quantity: 1 },
    { id: 'sleeve-t', name: 'Sleeve', category: 'SLEEVE', width: 25, height: 35, quantity: 2 }
  ];

  const gradedPieces = generateCopMarkerPatterns(baseTemplates, primaryLay.bundleRatio);
  assert.ok(gradedPieces.length > 0, 'Generated graded pieces');

  // Verify grading scale factors
  const sPiece = gradedPieces.find((p) => p.size === 'S');
  const mPiece = gradedPieces.find((p) => p.size === 'M');
  const lPiece = gradedPieces.find((p) => p.size === 'L');

  assert.ok(sPiece && mPiece && lPiece, 'Contains S, M, and L pieces');
  assert.ok(sPiece.width <= mPiece.width, 'Size S width <= Size M width');
  assert.ok(mPiece.width <= lPiece.width, 'Size M width <= Size L width');
});

test('⭐ INDUSTRIAL CAM EXPORT: CNC & Laser G-Code Generation (Zero Gap)', () => {
  const dummyProject = {
    id: 'proj-cam-1',
    name: 'Industrial Cam Test',
    fabricWidth: 150,
    fabricLength: 500,
    patterns: [
      { id: 'p1', name: 'Front Panel', category: 'FRONT', width: 35, height: 45, quantity: 1 }
    ],
    layoutPlacements: [
      { id: 'pl-1', name: 'Front Panel #1', category: 'FRONT', x: 10, y: 10, width: 35, height: 45, rotation: 0 }
    ],
    utilization: 88.5
  };

  const gcode = exportCuttingPlanToGCode(dummyProject, { feedRate: 3500, plungeRate: 1000, safeZ: 6.0 });

  assert.ok(gcode.includes('G21 ; Units in millimeters'), 'Sets millimeter units (G21)');
  assert.ok(gcode.includes('G90 ; Absolute coordinates mode'), 'Sets absolute mode (G90)');
  assert.ok(gcode.includes('M03'), 'Contains laser ON / knife drive (M03)');
  assert.ok(gcode.includes('M05 ; All tools off'), 'Contains tool off (M05)');
  assert.ok(gcode.includes('M30 ; Program End & Reset'), 'Contains program reset (M30)');
  assert.ok(gcode.includes('F3500'), 'Enforces feedrate 3500 mm/min');
});
