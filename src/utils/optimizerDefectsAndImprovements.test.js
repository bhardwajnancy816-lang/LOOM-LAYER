import test from 'node:test';
import assert from 'node:assert';
import {
  optimizeFabricCutting,
  optimizeFabricCuttingAsync,
  getValidOrientations,
  expandPatternPieces,
  validateNestingLayout,
  checkPieceCollision
} from './fabricOptimizer.js';
import {
  isPolygonWithinFabric,
  calculatePolygonArea,
  checkPolygonCollision
} from './polygonGeometry.js';
import { getGarmentNormalizedOutline } from './garmentGeometry.js';

test('Targeted Verification of Optimizer Defect Fixes & Algorithmic Improvements', async (t) => {

  await t.test('1. Defect Fix: Horizontal Grain Constraint when allowRotation is false', () => {
    const horizontalPiece = {
      id: 'h-1',
      name: 'Collar Band',
      width: 15,
      height: 40,
      allowRotation: false,
      grainConstraint: 'Horizontal',
      globalRespectGrain: true
    };

    const orientations = getValidOrientations(horizontalPiece);
    assert.strictEqual(orientations.length, 1, 'Only one orientation permitted when rotation is disabled');
    assert.strictEqual(orientations[0].rotation, 90, 'Horizontal grain piece is oriented at 90° (cross-grain), never 0°');

    // Run actual optimization with allowRotation: false
    const result = optimizeFabricCutting({
      fabricWidth: 100,
      fabricLength: 100,
      allowRotation: false,
      respectGrain: true,
      patterns: [
        {
          id: 'pat-collar',
          name: 'Horizontal Collar',
          width: 15,
          height: 40,
          quantity: 2,
          rotationAllowed: false,
          grainConstraint: 'Horizontal'
        }
      ]
    });

    assert.strictEqual(result.success, true, 'Horizontal grain pieces placed successfully with rotation disabled');
    assert.strictEqual(result.placedCount, 2, 'Both horizontal grain pieces placed');
    result.layoutPlacements.forEach((p) => {
      assert.strictEqual(p.rotation, 90, `Piece ${p.name} rotated strictly to horizontal grain angle 90°`);
    });
  });

  await t.test('2. Defect Fix: Floating-Point Epsilon Tolerance in Fabric Boundary Containment', () => {
    // Exact fabric bounds [0, 100] x [0, 100]
    // Point at -1e-5 (microscopic IEEE-754 precision delta)
    const slightlyNegative = [
      { x: -1e-5, y: 10 },
      { x: 50, y: 10 },
      { x: 50, y: 50 },
      { x: -1e-5, y: 50 }
    ];
    assert.strictEqual(
      isPolygonWithinFabric(slightlyNegative, 100, 100),
      true,
      'Microscopic negative floating point delta (-1e-5) is safely accepted by epsilon tolerance'
    );

    // Point at 100 + 1e-5
    const slightlyOver = [
      { x: 10, y: 10 },
      { x: 100 + 1e-5, y: 10 },
      { x: 100 + 1e-5, y: 50 },
      { x: 10, y: 50 }
    ];
    assert.strictEqual(
      isPolygonWithinFabric(slightlyOver, 100, 100),
      true,
      'Microscopic overflow delta (100 + 1e-5) is safely accepted by epsilon tolerance'
    );

    // Gross violation (> 0.01) must still be rejected
    const grossNegative = [
      { x: -0.1, y: 10 },
      { x: 50, y: 10 },
      { x: 50, y: 50 },
      { x: -0.1, y: 50 }
    ];
    assert.strictEqual(
      isPolygonWithinFabric(grossNegative, 100, 100),
      false,
      'Real negative coordinate boundary violation (-0.1) is rejected'
    );

    const grossOver = [
      { x: 10, y: 10 },
      { x: 100.2, y: 10 },
      { x: 100.2, y: 50 },
      { x: 10, y: 50 }
    ];
    assert.strictEqual(
      isPolygonWithinFabric(grossOver, 100, 100),
      false,
      'Real length overflow boundary violation (100.2) is rejected'
    );
  });

  await t.test('3. Geometric Discretization: Parametric Garment Shape Normalized Outlines', () => {
    const garmentShapes = [
      'front-bodice',
      'back-bodice',
      'sleeve',
      'collar',
      'pocket',
      'waistband',
      'cuff',
      'trouser-front',
      'trouser-back',
      'skirt-panel'
    ];

    garmentShapes.forEach((shape) => {
      const outline = getGarmentNormalizedOutline(shape);
      assert(Array.isArray(outline), `getGarmentNormalizedOutline returns array for ${shape}`);
      assert(outline.length >= 5, `Outline has at least 5 vertices for ${shape} (got ${outline.length})`);

      // All points within [0, 1] x [0, 1]
      outline.forEach((pt) => {
        assert(pt.x >= -1e-4 && pt.x <= 1.0001, `Vertex X (${pt.x}) in [0, 1] for ${shape}`);
        assert(pt.y >= -1e-4 && pt.y <= 1.0001, `Vertex Y (${pt.y}) in [0, 1] for ${shape}`);
      });

      // Valid Shoelace area
      const area = calculatePolygonArea(outline);
      assert(area > 0.1 && area <= 1.0, `Normalized polygon area (${area.toFixed(3)}) is within valid range for ${shape}`);
    });

    // Test opt-in useParametricContour in optimizeFabricCutting
    const parametricResult = optimizeFabricCutting({
      fabricWidth: 120,
      fabricLength: 120,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      useParametricContour: true,
      patterns: [
        {
          id: 'p-bodice',
          name: 'Parametric Bodice',
          shapeType: 'front-bodice',
          width: 40,
          height: 60,
          quantity: 2,
          grainConstraint: 'Vertical'
        }
      ]
    });

    assert.strictEqual(parametricResult.success, true, 'Parametric contour nesting executes successfully');
    assert.strictEqual(parametricResult.placedCount, 2, 'Both parametric bodices placed');
    assert(parametricResult.layoutPlacements[0].isIrregular === true, 'Piece flagged as irregular polygon');
    assert(Array.isArray(parametricResult.layoutPlacements[0].worldPoints), 'Piece has true world polygon vertices');
    assert(parametricResult.layoutPlacements[0].polygonArea < 40 * 60, 'Area derived from exact Shoelace polygon, not full rectangle');
  });

  await t.test('4. Cooperative Asynchronous Solver Yielding and Cancellation', async () => {
    let progressCallCount = 0;
    const progressPercents = [];

    const asyncResult = await optimizeFabricCuttingAsync(
      {
        fabricWidth: 150,
        fabricLength: 200,
        patterns: [
          { id: 'p1', name: 'Front', width: 40, height: 50, quantity: 2, rotationAllowed: true },
          { id: 'p2', name: 'Back', width: 40, height: 50, quantity: 2, rotationAllowed: true }
        ],
        minSpacing: 0.5
      },
      {
        onProgress: (p) => {
          progressCallCount++;
          progressPercents.push(p.percent);
        }
      }
    );

    assert.strictEqual(asyncResult.success, true, 'Async optimizer completes successfully');
    assert.strictEqual(asyncResult.placedCount, 4, 'All 4 pieces placed');
    assert(progressCallCount >= 3, `Dispatched multiple cooperative progress updates (got ${progressCallCount})`);

    // Test cancellation aborts immediately
    const abortController = new AbortController();
    abortController.abort(); // Pre-aborted

    const cancelledResult = await optimizeFabricCuttingAsync(
      {
        fabricWidth: 150,
        fabricLength: 200,
        patterns: [{ id: 'p1', name: 'Front', width: 40, height: 50, quantity: 2 }],
        minSpacing: 0.5
      },
      { signal: abortController.signal }
    );

    assert.strictEqual(cancelledResult.cancelled, true, 'Cancellation signal aborts async solver immediately');
    assert.strictEqual(cancelledResult.success, false, 'Cancelled result reports success: false');
  });

  await t.test('5. Multi-Heuristic Layout Validation & Honest Optimality Reporting', () => {
    const complexResult = optimizeFabricCutting({
      fabricWidth: 100,
      fabricLength: 100,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      patterns: [
        { id: 'p-a', name: 'Large Panel', width: 40, height: 50, quantity: 2 },
        { id: 'p-b', name: 'Medium Panel', width: 25, height: 35, quantity: 3 },
        { id: 'p-c', name: 'Small Collar', width: 15, height: 20, quantity: 2, grainConstraint: 'Horizontal' }
      ]
    });

    assert.strictEqual(complexResult.success, true, 'Complex multi-piece optimization succeeds');
    assert(complexResult.placedCount > 0, `Placed ${complexResult.placedCount} pieces`);

    // Verify zero collision between any pair of placed pieces
    const validation = validateNestingLayout(
      complexResult.layoutPlacements,
      complexResult.fabricLength,
      complexResult.fabricWidth,
      0.5
    );
    assert.strictEqual(validation.isValid, true, 'Independent validator verifies zero collision and boundary adherence');
    assert.strictEqual(validation.overlapCount, 0, 'Zero overlapping pairs');
    assert.strictEqual(validation.boundaryViolationCount, 0, 'Zero boundary violations');

    // Honest optimality reporting: if fabric has scrap, hasOptimalConvergence must be false
    if (complexResult.wastePercentage > 0) {
      assert.strictEqual(
        complexResult.hasOptimalConvergence,
        false,
        'Honest reporting: does not falsely claim global optimality when scrap remains'
      );
    }
  });

  await t.test('6. Determinism Invariant Across 10 Repeated Runs', () => {
    const testInput = {
      fabricWidth: 150,
      fabricLength: 250,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      patterns: [
        { id: 'det-1', name: 'Panel 1', width: 35, height: 45, quantity: 3, grainConstraint: 'Vertical' },
        { id: 'det-2', name: 'Panel 2', width: 20, height: 30, quantity: 3, grainConstraint: 'Horizontal' }
      ]
    };

    let firstSignature = null;
    let firstCoordinates = null;

    for (let run = 0; run < 10; run++) {
      const runRes = optimizeFabricCutting(testInput);
      const coords = runRes.layoutPlacements.map((p) => `${p.id}@${p.x},${p.y},rot:${p.rotation}`).join(';');

      if (run === 0) {
        firstSignature = runRes.layoutSignature;
        firstCoordinates = coords;
      } else {
        assert.strictEqual(
          runRes.layoutSignature,
          firstSignature,
          `Run #${run + 1} layout signature matches run #1 exactly`
        );
        assert.strictEqual(
          coords,
          firstCoordinates,
          `Run #${run + 1} placement coordinates are 100% bitwise identical to run #1`
        );
      }
    }
  });

});
