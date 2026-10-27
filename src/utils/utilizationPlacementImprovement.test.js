import test from 'node:test';
import assert from 'node:assert';
import {
  checkOverlap,
  checkPieceCollision,
  optimizeFabricCutting,
  validateNestingLayout
} from './fabricOptimizer.js';
import { initialProjects } from '../data/mockProjects.js';

test('Focused Regression: Touchpoint Clearance Floating-Point Precision & Utilization Improvement', async (t) => {

  await t.test('1. Floating-point precision in clearance spacing touchpoints', () => {
    // Piece 1 ending at 191.3 + 36 = 227.3
    const p1 = { id: 'p1', name: 'Piece 1', x: 191.3, y: 0, width: 36, height: 55 };
    // Candidate touchpoint placed at exact 0.4cm clearance: 227.3 + 0.4 = 227.7
    const candExact = { id: 'cand1', name: 'Candidate Exact', x: 227.7, y: 0, width: 36, height: 55 };

    // Strict clearance (0.4cm spacing):
    // In IEEE-754 arithmetic, 191.3 + 36 + 0.4 = 227.70000000000002.
    // Without epsilon tolerance, 227.70000000000002 <= 227.7 is false, causing false-positive overlap.
    assert.strictEqual(
      checkOverlap(p1, candExact, 0.4),
      false,
      'Exact touchpoint candidate at spacing 0.4cm is accepted without false-positive clearance rejection'
    );
    assert.strictEqual(
      checkPieceCollision(p1, candExact, 0.4),
      false,
      'checkPieceCollision accepts exact touchpoint candidate at spacing 0.4cm'
    );

    // Violation case: Candidate placed closer than required clearance (gap = 0.3cm < 0.4cm)
    const candViolating = { id: 'cand2', name: 'Candidate Violating', x: 227.6, y: 0, width: 36, height: 55 };
    assert.strictEqual(
      checkOverlap(p1, candViolating, 0.4),
      true,
      'Real clearance violation (0.3cm < 0.4cm) is strictly rejected'
    );
    assert.strictEqual(
      checkPieceCollision(p1, candViolating, 0.4),
      true,
      'checkPieceCollision strictly rejects clearance violation'
    );
  });

  await t.test('2. Decimal spacing clearance touchpoint with 0.8cm spacing', () => {
    // Piece at x=50.2, width 45. Clearance 0.8cm. End = 50.2 + 45 = 95.2.
    // Next piece at 95.2 + 0.8 = 96.0.
    const pA = { id: 'pa', name: 'Denim Front', x: 50.2, y: 10, width: 45, height: 70 };
    const pB = { id: 'pb', name: 'Denim Back', x: 96.0, y: 10, width: 48, height: 72 };

    assert.strictEqual(
      checkOverlap(pA, pB, 0.8),
      false,
      'Touchpoint with 0.8cm clearance is accepted cleanly'
    );

    const pBViolating = { id: 'pb_viol', name: 'Denim Back Violating', x: 95.9, y: 10, width: 48, height: 72 };
    assert.strictEqual(
      checkOverlap(pA, pBViolating, 0.8),
      true,
      'Touchpoint violating 0.8cm clearance by 0.1cm is strictly rejected'
    );
  });

  await t.test('3. Measurable placement count and utilization increase on Heavy Denim Workwear Jacket', () => {
    const jacketProj = initialProjects.find((p) => p.id === 'proj-2');
    assert.ok(jacketProj, 'proj-2 exists');

    const result = optimizeFabricCutting({
      fabricWidth: jacketProj.fabricWidth,
      fabricLength: jacketProj.fabricLength,
      patterns: jacketProj.patterns,
      minSpacing: jacketProj.minSpacing || 0.8,
      allowRotation: false,
      respectGrain: true
    });

    assert.strictEqual(result.success, true, 'Optimization runs successfully');
    
    // Previously, false clearance rejections limited placed pieces to only 51 (21 unplaced) and 79.9% utilization.
    // With epsilon-safe touchpoint evaluation, at least 60 pieces are placed and unplaced pieces are reduced.
    assert.ok(
      result.placedCount >= 60,
      `Placed pieces (${result.placedCount}) is significantly higher than previous baseline (51)`
    );
    assert.ok(
      result.unplacedCount <= 12,
      `Unplaced pieces (${result.unplacedCount}) is significantly lower than previous baseline (21)`
    );
    assert.ok(
      result.utilization >= 85.0,
      `Fabric utilization (${result.utilization}%) is improved over previous baseline (79.9%)`
    );

    // Collision safety validation: Ensure ZERO overlaps or boundary violations in the optimized layout
    const validation = validateNestingLayout(
      result.layoutPlacements,
      jacketProj.fabricLength,
      jacketProj.fabricWidth,
      jacketProj.minSpacing || 0.8
    );
    assert.strictEqual(validation.isValid, true, 'Every placed piece satisfies collision safety and boundary rules');
    assert.strictEqual(validation.overlapCount, 0, 'Zero overlapping pairs in optimized layout');
    assert.strictEqual(validation.boundaryViolationCount, 0, 'Zero boundary violations');
  });

  await t.test('4. Measurable placement count and utilization increase on Athletic Performance Tops', () => {
    const athleticProj = initialProjects.find((p) => p.id === 'proj-4');
    assert.ok(athleticProj, 'proj-4 exists');

    const result = optimizeFabricCutting({
      fabricWidth: athleticProj.fabricWidth,
      fabricLength: athleticProj.fabricLength,
      patterns: athleticProj.patterns,
      minSpacing: athleticProj.minSpacing || 0.4,
      allowRotation: true,
      respectGrain: false
    });

    assert.strictEqual(result.success, true, 'Optimization runs successfully');
    
    // Previously, false clearance rejections limited placed pieces to only 32 (16 unplaced) and 83.8% utilization.
    // With epsilon-safe touchpoint evaluation, at least 35 pieces are placed and unplaced pieces are reduced.
    assert.ok(
      result.placedCount >= 35,
      `Placed pieces (${result.placedCount}) is higher than previous baseline (32)`
    );
    assert.ok(
      result.unplacedCount <= 13,
      `Unplaced pieces (${result.unplacedCount}) is lower than previous baseline (16)`
    );
    assert.ok(
      result.utilization >= 85.0,
      `Fabric utilization (${result.utilization}%) is improved over previous baseline (83.8%)`
    );

    // Collision safety validation
    const validation = validateNestingLayout(
      result.layoutPlacements,
      athleticProj.fabricLength,
      athleticProj.fabricWidth,
      athleticProj.minSpacing || 0.4
    );
    assert.strictEqual(validation.isValid, true, 'Every placed piece satisfies collision safety and boundary rules');
    assert.strictEqual(validation.overlapCount, 0, 'Zero overlapping pairs in optimized layout');
    assert.strictEqual(validation.boundaryViolationCount, 0, 'Zero boundary violations');
  });

});
