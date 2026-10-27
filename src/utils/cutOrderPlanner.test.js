import test from 'node:test';
import assert from 'node:assert/strict';
import { solveCutOrderPlan, generateCopMarkerPatterns, calculateArrayGCD } from './cutOrderPlanner.js';

test('Cut-Order Planning (COP) Engine Tests', async (t) => {
  console.log('🧪 Starting Cut-Order Planning (COP) Engine Tests...');

  await t.test('1. GCD calculation utility', () => {
    assert.equal(calculateArrayGCD([120, 360, 360, 120]), 120);
    assert.equal(calculateArrayGCD([50, 150, 250]), 50);
    assert.equal(calculateArrayGCD([7, 13]), 1);
  });

  await t.test('2. Solves 960-Garment Order: S: 120, M: 360, L: 360, XL: 120', () => {
    const cop = solveCutOrderPlan({
      demands: { S: 120, M: 360, L: 360, XL: 120 },
      maxPlies: 120,
      maxGarmentsPerMarker: 8
    });

    assert.equal(cop.isValid, true, 'COP solution is valid');
    assert.equal(cop.totalDemand, 960, 'Total demand matches 960');
    assert.equal(cop.totalCut, 960, 'Total cut matches 960');
    assert.equal(cop.fulfillmentPercentage, 100, '100% fulfillment');

    // Ratio verification
    assert.deepEqual(cop.primaryRatio, { S: 1, M: 3, L: 3, XL: 1 }, 'Solved exact 1S:3M:3L:1XL ratio');
    assert.equal(cop.garmentsPerMarker, 8, '8 garments combined per marker');
    assert.equal(cop.lays[0].plies, 120, '120 plies spread on table');
    assert.match(cop.estimatedInterlockingYieldBoost, /Interlocking/i, 'Reports interlocking boost');
  });

  await t.test('3. Generates multi-size graded pattern pieces for Stage 2 Nesting', () => {
    const basePatterns = [
      { id: 'pat-bodice', name: 'Front Bodice', width: 40, height: 60, quantity: 1 },
      { id: 'pat-sleeve', name: 'Sleeve', width: 30, height: 40, quantity: 2 }
    ];

    const ratio = { S: 1, M: 2 };
    const markerPieces = generateCopMarkerPatterns(basePatterns, ratio);

    // Total patterns: (2 base * 2 sizes) = 4 pattern groups
    assert.equal(markerPieces.length, 4, '4 graded pattern groups generated');

    const sBodice = markerPieces.find(p => p.id === 'pat-bodice-S');
    const mBodice = markerPieces.find(p => p.id === 'pat-bodice-M');

    assert.ok(sBodice, 'Small bodice exists');
    assert.ok(mBodice, 'Medium bodice exists');

    // S is scaled down (0.95), M is 1.0
    assert.equal(sBodice.quantity, 1, 'S Bodice quantity = 1 * 1 = 1');
    assert.equal(mBodice.quantity, 2, 'M Bodice quantity = 1 * 2 = 2');
    assert.ok(sBodice.width < mBodice.width, 'S width is smaller than M width');
  });
});
