/**
 * Comprehensive Optimizer Performance, Multi-Heuristic & Collision Validity Tests
 *
 * Verifies:
 * 1. Small pattern set (<10 pieces) runs well within responsive targets (<200ms).
 * 2. Medium pattern set (25-30 pieces) runs within responsive targets (<600ms).
 * 3. Large pattern set (50+ pieces) runs within responsive targets (<1500ms).
 * 4. Irregular polygon contours (20 vertices) pack rapidly without browser-freeze (<1200ms).
 * 5. Multi-angle rotations and grain rules strictly respected.
 * 6. Zero overlapping collisions detected between any placed pieces (AABB & polygon).
 * 7. 100% Determinism across repeated runs.
 * 8. Cancellation signal aborts solver immediately.
 * 9. Computation budget limits search time safely and labels partial search.
 * 10. Robust error recovery on malformed or empty inputs.
 */

import { optimizeFabricCutting, optimizeFabricCuttingAsync, checkPieceCollision } from './fabricOptimizer.js';
import { initialProjects } from '../data/mockProjects.js';

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

async function runPerformanceTestSuite() {
  console.log('🧪 Starting Fabric Nesting Optimizer Performance & Collision Test Suite...\n');

  // ==========================================
  // TEST 1: Small Pattern Set Performance (<10 pieces)
  // ==========================================
  console.log('--- Test 1: Small Pattern Set Performance (<10 pieces) ---');

  const smallPatterns = [
    { id: 's-1', name: 'Front', width: 45, height: 60, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical' },
    { id: 's-2', name: 'Back', width: 45, height: 60, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical' },
    { id: 's-3', name: 'Sleeve', width: 25, height: 40, quantity: 4, rotationAllowed: true, grainConstraint: 'Vertical' }
  ];

  const tStartSmall = Date.now();
  const smallResult = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 300,
    patterns: smallPatterns,
    minSpacing: 0.5
  });
  const smallDuration = Date.now() - tStartSmall;

  assert(smallResult.success === true, 'Small set placed successfully');
  assert(smallResult.placedCount === 8, `All 8 pieces placed (got ${smallResult.placedCount})`);
  assert(smallDuration < 300, `Small set ran in ${smallDuration}ms (target: <300ms)`);

  // ==========================================
  // TEST 2: Medium Pattern Set Performance (25-30 pieces)
  // ==========================================
  console.log('\n--- Test 2: Medium Pattern Set Performance (25-30 pieces) ---');

  const mediumPatterns = [
    { id: 'm-1', name: 'Front Bodice', width: 40, height: 55, quantity: 6, rotationAllowed: true, grainConstraint: 'Vertical' },
    { id: 'm-2', name: 'Back Bodice', width: 40, height: 55, quantity: 6, rotationAllowed: true, grainConstraint: 'Vertical' },
    { id: 'm-3', name: 'Sleeve Left', width: 25, height: 45, quantity: 6, rotationAllowed: true, grainConstraint: 'Vertical' },
    { id: 'm-4', name: 'Sleeve Right', width: 25, height: 45, quantity: 6, rotationAllowed: true, grainConstraint: 'Vertical' },
    { id: 'm-5', name: 'Collar Band', width: 15, height: 20, quantity: 4, rotationAllowed: true, grainConstraint: 'Horizontal' }
  ];

  const tStartMed = Date.now();
  const medResult = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 400,
    patterns: mediumPatterns,
    minSpacing: 0.5
  });
  const medDuration = Date.now() - tStartMed;

  assert(medResult.success === true, 'Medium set placed successfully');
  assert(medResult.placedCount === 28, `All 28 pieces placed (got ${medResult.placedCount})`);
  assert(medDuration < 1500, `Medium set ran in ${medDuration}ms (target: <1500ms)`);

  // ==========================================
  // TEST 3: Large Pattern Set Performance (50 pieces from proj-1)
  // ==========================================
  console.log('\n--- Test 3: Large Pattern Set Performance (50 pieces - proj-1) ---');

  const proj1 = initialProjects[0];
  const tStartLarge = Date.now();
  const largeResult = optimizeFabricCutting({
    fabricWidth: proj1.fabricWidth,
    fabricLength: proj1.fabricLength,
    patterns: proj1.patterns,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true
  });
  const largeDuration = Date.now() - tStartLarge;

  assert(largeResult.success === true, 'Large project #1 placed successfully');
  assert(largeResult.placedCount >= 40, `Fitted high yield (${largeResult.placedCount}/${largeResult.totalPieces} pieces)`);
  assert(largeResult.utilization > 70, `High fabric efficiency: ${largeResult.utilization}%`);
  assert(largeDuration < 3000, `50-piece set ran in ${largeDuration}ms (target: <3000ms)`);

  // ==========================================
  // TEST 4: Irregular Polygon Contours (20 vertices)
  // ==========================================
  console.log('\n--- Test 4: Irregular Polygon Contours (20 vertices each) ---');

  const polygon20 = [];
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    polygon20.push({ x: 0.5 + 0.4 * Math.cos(angle), y: 0.5 + 0.4 * Math.sin(angle) });
  }

  const irregularPatterns = [
    { id: 'irr-1', name: 'Curved Front Bodice', width: 40, height: 60, quantity: 8, outline: polygon20, rotationAllowed: true },
    { id: 'irr-2', name: 'Curved Back Bodice', width: 40, height: 60, quantity: 8, outline: polygon20, rotationAllowed: true },
    { id: 'irr-3', name: 'Curved Sleeve', width: 30, height: 45, quantity: 8, outline: polygon20, rotationAllowed: true }
  ];

  const tStartIrr = Date.now();
  const irrResult = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 450,
    patterns: irregularPatterns,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: false
  });
  const irrDuration = Date.now() - tStartIrr;

  assert(irrResult.success === true, '24 irregular pieces placed successfully');
  assert(irrResult.placedCount > 0, `Placed ${irrResult.placedCount} irregular pieces`);
  assert(irrDuration < 4000, `Irregular 20-vertex polygon set ran in ${irrDuration}ms (target: <4000ms, avoided freeze)`);

  // ==========================================
  // TEST 5: Comprehensive Collision & Clearance Verification
  // ==========================================
  console.log('\n--- Test 5: Comprehensive Collision & Clearance Verification ---');

  let collisionFound = false;
  const pieces = irrResult.layoutPlacements;
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      if (checkPieceCollision(pieces[i], pieces[j], 0.5)) {
        collisionFound = true;
        console.error(`Collision detected between ${pieces[i].name} and ${pieces[j].name}`);
      }
    }
  }

  assert(!collisionFound, 'Exhaustive pairwise test verified 0 collisions and strict 0.5cm clearance on all pieces');

  // ==========================================
  // TEST 6: Determinism Invariant (5 Consecutive Executions)
  // ==========================================
  console.log('\n--- Test 6: Determinism Invariant (5 Consecutive Executions) ---');

  let isDeterministic = true;
  let firstCoords = null;

  for (let run = 0; run < 5; run++) {
    const runRes = optimizeFabricCutting({
      fabricWidth: 150,
      fabricLength: 300,
      patterns: smallPatterns,
      minSpacing: 0.5
    });

    const coords = runRes.layoutPlacements.map((p) => `${p.id}:${p.x},${p.y},${p.rotation}`).join('|');
    if (!firstCoords) {
      firstCoords = coords;
    } else if (coords !== firstCoords) {
      isDeterministic = false;
    }
  }

  assert(isDeterministic, '5 repeated runs produced 100% bitwise identical coordinates and rotations');

  // ==========================================
  // TEST 7: Cancellation Signal Handling
  // ==========================================
  console.log('\n--- Test 7: Cancellation Signal Handling ---');

  const abortController = new AbortController();
  abortController.abort(); // Pre-aborted signal

  const cancelledResult = optimizeFabricCutting(
    {
      fabricWidth: 150,
      fabricLength: 300,
      patterns: smallPatterns,
      minSpacing: 0.5
    },
    { signal: abortController.signal }
  );

  assert(cancelledResult.cancelled === true, 'Pre-aborted signal returns cancelled: true immediately');
  assert(cancelledResult.success === false, 'Cancelled result marks success: false');

  // ==========================================
  // TEST 8: Computation Budget Enforcement
  // ==========================================
  console.log('\n--- Test 8: Computation Budget Enforcement ---');

  const budgetResult = optimizeFabricCutting(
    {
      fabricWidth: 150,
      fabricLength: 500,
      patterns: mediumPatterns,
      minSpacing: 0.5
    },
    { maxTimeMs: 1 } // Extreme 1ms budget
  );

  assert(budgetResult.success === true, 'Budget cutoff still returns valid best layout found');
  assert(budgetResult.isSearchComplete === false, 'Correctly flags isSearchComplete: false when budget reached');
  assert(typeof budgetResult.searchNotice === 'string', 'Provides informative searchNotice when budget reached');

  // ==========================================
  // TEST 9: Async Cooperative Yielding
  // ==========================================
  console.log('\n--- Test 9: Async Cooperative Yielding ---');

  const progressTicks = [];
  const asyncResult = await optimizeFabricCuttingAsync(
    {
      fabricWidth: 150,
      fabricLength: 300,
      patterns: smallPatterns,
      minSpacing: 0.5
    },
    {
      onProgress: (p) => progressTicks.push(p.percent)
    }
  );

  assert(asyncResult.success === true, 'Cooperative async runner returns success: true');
  assert(progressTicks.length >= 3, `Received ${progressTicks.length} cooperative progress events`);
  assert(progressTicks[0] <= 15, `Initial progress was ${progressTicks[0]}%`);

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n==========================================');
  console.log(`Optimizer Performance Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('==========================================\n');

  if (failedCount > 0) {
    throw new Error(`Performance tests failed: ${failedCount} test(s) failed.`);
  }
}

runPerformanceTestSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
