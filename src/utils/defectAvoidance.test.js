import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPieceDefectCollision } from './polygonGeometry.js';
import { canPlacePiece, validateNestingLayout, optimizeFabricCutting } from './fabricOptimizer.js';

test('Fabric Defect / Obstacle Avoidance Engine Tests', async (t) => {
  console.log('🧪 Starting Fabric Defect Avoidance Engine Tests...');

  await t.test('1. Direct Piece-Defect Collision Detection', () => {
    const piece = { x: 50, y: 50, width: 20, height: 20 };

    // Defect directly inside piece
    const defectInside = { id: 'd1', x: 60, y: 60, radius: 4 };
    assert.equal(checkPieceDefectCollision(piece, defectInside, 0), true, 'Direct collision detected');

    // Defect safely outside piece without clearance
    const defectOutside = { id: 'd2', x: 80, y: 50, radius: 4 };
    assert.equal(checkPieceDefectCollision(piece, defectOutside, 0), false, 'Clear separation detected');

    // Defect within clearance buffer (distance = 5cm, spacing = 6cm)
    const defectNear = { id: 'd3', x: 74, y: 60, radius: 2 };
    // Nearest edge of piece is at x=70. Distance to defect center (74, 60) is 4cm. Defect radius is 2cm. Distance to defect boundary = 2cm.
    // If spacing is 3cm, clearance is violated!
    assert.equal(checkPieceDefectCollision(piece, defectNear, 3), true, 'Clearance buffer violation detected');
    assert.equal(checkPieceDefectCollision(piece, defectNear, 1), false, 'Sufficient clearance detected');
  });

  await t.test('2. canPlacePiece rejects placements over active defects', () => {
    const defect = { id: 'flaw-1', x: 30, y: 30, radius: 5 };
    const placed = [];
    const fabricL = 200;
    const fabricW = 100;

    // Piece overlapping flaw
    const badPiece = { x: 25, y: 25, width: 20, height: 20 };
    assert.equal(
      canPlacePiece(badPiece, placed, fabricL, fabricW, 0.5, [defect]),
      false,
      'canPlacePiece rejects piece overlapping defect'
    );

    // Piece positioned clear of flaw
    const goodPiece = { x: 45, y: 30, width: 20, height: 20 };
    assert.equal(
      canPlacePiece(goodPiece, placed, fabricL, fabricW, 0.5, [defect]),
      true,
      'canPlacePiece allows piece clear of defect'
    );
  });

  await t.test('3. Nesting Optimizer routes pattern pieces around active roll defects', () => {
    const patterns = [
      { id: 'p1', name: 'Front Panel', width: 40, height: 40, quantity: 2, grainConstraint: 'Any' },
      { id: 'p2', name: 'Sleeve', width: 25, height: 30, quantity: 2, grainConstraint: 'Any' }
    ];

    // Place a prominent defect right in the prime bottom-left nesting spot: (X: 10, Y: 10, radius: 8)
    const defects = [
      { id: 'flaw-oil-stain', x: 15, y: 15, radius: 8, type: 'Oil Stain' }
    ];

    const result = optimizeFabricCutting({
      fabricWidth: 100,
      fabricLength: 200,
      minSpacing: 1.0,
      patterns,
      defects,
      allowRotation: true
    });

    assert.equal(result.success, true, 'Optimizer succeeds with defect avoidance');
    assert.equal(result.placedCount, 4, 'All 4 pieces successfully placed');

    // Verify ZERO placed pieces touch or overlap the defect
    for (const pl of result.layoutPlacements) {
      const collides = checkPieceDefectCollision(pl, defects[0], 1.0);
      assert.equal(
        collides,
        false,
        `Placed piece "${pl.name}" at (${pl.x}, ${pl.y}) does not collide with defect at (${defects[0].x}, ${defects[0].y})`
      );
    }

    // Verify independent layout validation confirms 0 defect violations
    const validation = validateNestingLayout(result.layoutPlacements, 200, 100, 1.0, defects);
    assert.equal(validation.isValid, true, 'Layout validation passes with defects');
    assert.equal(validation.defectViolationCount, 0, 'Zero defect violations confirmed');
  });

  await t.test('4. validateNestingLayout reports exact defect violation details', () => {
    const defect = { id: 'hole-1', x: 50, y: 50, radius: 5, type: 'Hole' };
    const invalidPlacements = [
      { id: 'violating-piece', name: 'Violating Bodice', x: 45, y: 45, width: 20, height: 20 }
    ];

    const validation = validateNestingLayout(invalidPlacements, 200, 100, 0.5, [defect]);
    assert.equal(validation.isValid, false, 'Validation caught defect collision');
    assert.equal(validation.defectViolationCount, 1, 'Exactly 1 defect violation recorded');
    assert.match(validation.errors[0], /touches or violates clearance around Fabric Defect/i);
  });
});
