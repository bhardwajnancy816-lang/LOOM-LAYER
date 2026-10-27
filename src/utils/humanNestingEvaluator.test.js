import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePlacements, snapPiecePosition } from './humanNestingEvaluator.js';

test('humanNestingEvaluator: evaluates clean non-overlapping layout', () => {
  const pieces = [
    { id: 'p1', name: 'Front', x: 0, y: 0, width: 40, height: 50, rotation: 0 },
    { id: 'p2', name: 'Back', x: 41, y: 0, width: 40, height: 50, rotation: 0 }
  ];

  const evalResult = evaluatePlacements(pieces, 150, 500, 0.5);

  assert.equal(evalResult.isValid, true);
  assert.equal(evalResult.overlaps.length, 0);
  assert.equal(evalResult.collidingPieceIds.size, 0);
  assert.equal(evalResult.cutLengthCm, 81);
  assert.ok(evalResult.markerYield > 0);
});

test('humanNestingEvaluator: detects collision when pieces overlap', () => {
  const pieces = [
    { id: 'p1', name: 'Front', x: 0, y: 0, width: 40, height: 50, rotation: 0 },
    { id: 'p2', name: 'Back', x: 20, y: 10, width: 40, height: 50, rotation: 0 } // Overlaps p1
  ];

  const evalResult = evaluatePlacements(pieces, 150, 500, 0.5);

  assert.equal(evalResult.isValid, false);
  assert.equal(evalResult.overlaps.length, 1);
  assert.ok(evalResult.collidingPieceIds.has('p1'));
  assert.ok(evalResult.collidingPieceIds.has('p2'));
});

test('humanNestingEvaluator: compares human score vs AI benchmark', () => {
  const pieces = [
    { id: 'p1', name: 'Front', x: 0, y: 0, width: 50, height: 50, rotation: 0 }
  ];

  const aiBenchmark = {
    markerUtilization: 80.0,
    actualLengthUsedCm: 55.0
  };

  const evalResult = evaluatePlacements(pieces, 100, 500, 0.5, aiBenchmark);

  assert.ok(evalResult.comparison !== null);
  assert.equal(evalResult.comparison.aiYield, 80.0);
  assert.ok(evalResult.comparison.verdictText.length > 0);
});

test('humanNestingEvaluator: snaps candidate coordinate to fabric border', () => {
  const activePiece = { id: 'p1', width: 30, height: 40 };
  const snapped = snapPiecePosition(0.4, 0.6, activePiece, [], 150, 500, 0.5, 1.0);

  assert.equal(snapped.x, 0);
  assert.equal(snapped.y, 0);
  assert.equal(snapped.snapped, true);
});
