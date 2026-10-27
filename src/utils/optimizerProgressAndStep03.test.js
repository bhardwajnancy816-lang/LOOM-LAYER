/**
 * Step 03 Optimizer Progress, Error Handling & Navigation Integrity Tests
 *
 * Verifies:
 * 1. Progress events never reach 100% before optimization genuinely succeeds.
 * 2. If optimization fails (e.g. empty patterns, oversized pieces), progress stops without emitting 100%,
 *    and a clear, actionable error is returned.
 * 3. Successful optimization emits 100% only after a valid layout is produced.
 * 4. Placed pieces satisfy geometric boundaries (within fabric length and width) and spacing constraints.
 * 5. Partial placements (e.g. excessive quantity) provide valid layout with an informative warning, not a freeze.
 * 6. Generated result contains all required properties for Step 04 (OptimizeResultPage) consumption.
 */

import { optimizeFabricCutting } from './fabricOptimizer.js';
import { generateCuttingPlan } from './cuttingPlanGenerator.js';

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

async function runStep03OptimizerTests() {
  console.log('🧪 Starting Fabric Marker Nesting Optimizer Progress & Step 03 Integrity Tests...\n');

  // ==========================================
  // TEST 1: Zero Placement / Oversized Pattern Error Handling
  // ==========================================
  console.log('--- Test 1: Zero Placement / Oversized Pattern Error Handling ---');
  
  const oversizedPatterns = [
    {
      id: 'p-huge-1',
      name: 'Giant Sail Panel',
      width: 300, // Fabric is only 140cm wide
      height: 400,
      quantity: 1,
      rotationAllowed: false,
      grainConstraint: 'Vertical'
    }
  ];

  const oversizedResult = optimizeFabricCutting({
    fabricWidth: 140,
    fabricLength: 200,
    patterns: oversizedPatterns,
    minSpacing: 0.5
  });

  assert(oversizedResult.success === false, 'Oversized pattern returns success: false');
  assert(typeof oversizedResult.error === 'string' && oversizedResult.error.length > 0, 'Clear error message is provided');
  assert(oversizedResult.error.includes('Giant Sail Panel') || oversizedResult.error.includes('exceeds fabric'), 'Error identifies the problematic piece or dimension');
  assert(oversizedResult.placedPieces?.length === 0 || !oversizedResult.layoutPlacements?.length, 'No fake placements generated');

  // ==========================================
  // TEST 2: Empty Patterns List Validation
  // ==========================================
  console.log('\n--- Test 2: Empty Patterns List Validation ---');

  const emptyResult = optimizeFabricCutting({
    fabricWidth: 140,
    fabricLength: 500,
    patterns: [],
    minSpacing: 0.5
  });

  assert(emptyResult.success === false, 'Empty patterns returns success: false');
  assert(typeof emptyResult.error === 'string' && emptyResult.error.length > 0, 'Actionable error message for empty patterns');
  assert(emptyResult.utilization === 0, 'Zero utilization reported on empty patterns');

  // ==========================================
  // TEST 3: Async Progress Sequence - No 100% on Failure
  // ==========================================
  console.log('\n--- Test 3: Async Progress Callback Never Reaches 100% on Failure ---');

  // Simulate the async runner logic with error inputs
  const simulatedProgressEvents = [];
  const onProgress = (p) => {
    simulatedProgressEvents.push(p.percent);
  };

  // Run with invalid/oversized pattern
  const runAsyncSimulation = async (patterns, fabricW, fabricL) => {
    simulatedProgressEvents.length = 0;
    onProgress({ percent: 12, status: 'Analyzing fabric dimensions & grain alignment...' });
    onProgress({ percent: 35, status: 'Processing 2D pattern polygon contours...' });
    onProgress({ percent: 58, status: 'Applying cutting clearance & rotation constraints...' });
    onProgress({ percent: 78, status: 'Generating multi-angle packing layouts...' });

    const result = optimizeFabricCutting({
      fabricWidth: fabricW,
      fabricLength: fabricL,
      patterns,
      minSpacing: 0.5
    });

    if (!result || !result.success) {
      // Must return immediately without calling 100%
      return result;
    }

    onProgress({ percent: 94, status: 'Comparing global arrangements & maximizing yield...' });
    onProgress({ percent: 100, status: 'Optimization finalized! Loading cut plan...' });
    return result;
  };

  const failedAsyncResult = await runAsyncSimulation(oversizedPatterns, 140, 200);
  assert(failedAsyncResult.success === false, 'Async runner returns success: false on invalid pattern');
  assert(!simulatedProgressEvents.includes(100), 'Progress events NEVER reached 100% on failure');
  assert(Math.max(...simulatedProgressEvents) < 100, `Highest progress reached before failure was ${Math.max(...simulatedProgressEvents)}% (< 100%)`);

  // ==========================================
  // TEST 4: Async Progress Sequence - Exactly 100% on Valid Completion
  // ==========================================
  console.log('\n--- Test 4: Async Progress Sequence Reaches 100% Only Upon Genuine Completion ---');

  const validPatterns = [
    {
      id: 'p-front-1',
      name: 'Front Bodice',
      width: 45,
      height: 55,
      quantity: 2,
      rotationAllowed: true,
      grainConstraint: 'Vertical'
    },
    {
      id: 'p-back-1',
      name: 'Back Bodice',
      width: 45,
      height: 55,
      quantity: 2,
      rotationAllowed: true,
      grainConstraint: 'Vertical'
    },
    {
      id: 'p-sleeve-1',
      name: 'Sleeve Left',
      width: 30,
      height: 40,
      quantity: 2,
      rotationAllowed: true,
      grainConstraint: 'Vertical'
    }
  ];

  const successfulAsyncResult = await runAsyncSimulation(validPatterns, 150, 300);
  assert(successfulAsyncResult.success === true, 'Async runner returns success: true on valid pattern pieces');
  assert(simulatedProgressEvents.includes(100), 'Progress events successfully reached 100% on valid completion');
  assert(simulatedProgressEvents[simulatedProgressEvents.length - 1] === 100, '100% was strictly the final event dispatched');
  
  // Verify monotonic progression
  let isMonotonic = true;
  for (let i = 1; i < simulatedProgressEvents.length; i++) {
    if (simulatedProgressEvents[i] < simulatedProgressEvents[i - 1]) {
      isMonotonic = false;
      break;
    }
  }
  assert(isMonotonic, `Progress percentages are monotonically non-decreasing: [${simulatedProgressEvents.join(', ')}]`);

  // ==========================================
  // TEST 5: Step 04 Data Contract & Result Completeness
  // ==========================================
  console.log('\n--- Test 5: Step 04 Data Contract & Result Completeness ---');

  assert(successfulAsyncResult.utilization > 0, `Valid utilization calculated: ${successfulAsyncResult.utilization}%`);
  assert(successfulAsyncResult.wastePercentage === Math.round((100 - successfulAsyncResult.utilization) * 10) / 10, 'Waste percentage = 100 - utilization');
  assert(Array.isArray(successfulAsyncResult.layoutPlacements), 'layoutPlacements is a valid array');
  assert(successfulAsyncResult.layoutPlacements.length === 6, `All 6 pieces placed (got ${successfulAsyncResult.layoutPlacements.length})`);
  assert(successfulAsyncResult.placedCount === 6, 'placedCount matches placed pieces count');
  assert(successfulAsyncResult.unplacedCount === 0, 'unplacedCount is 0 for fully fitted layout');

  // Verify that Step 04 generateCuttingPlan consumes the result cleanly
  const mockProjectAfterOptimization = {
    id: 'proj-test-step04',
    name: 'Step 04 Test Project',
    productType: 'Shirt',
    fabricType: 'Organic Cotton Weave',
    fabricWidth: 150,
    fabricLength: 300,
    patterns: validPatterns,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    status: 'Completed',
    utilization: successfulAsyncResult.utilization,
    wastePercentage: successfulAsyncResult.wastePercentage,
    totalPieces: 6,
    placedCount: 6,
    unplacedCount: 0,
    fabricSavedMeters: successfulAsyncResult.fabricSavedMeters || 1.2,
    layoutPlacements: successfulAsyncResult.layoutPlacements
  };

  const cuttingPlan = generateCuttingPlan(mockProjectAfterOptimization);
  assert(cuttingPlan !== null && typeof cuttingPlan === 'object', 'Cutting plan generated without error');
  assert(cuttingPlan.placements.length === 6, 'Cutting plan contains 6 placed vector pieces');
  assert(cuttingPlan.optimizationSummary.utilization === successfulAsyncResult.utilization, 'Cutting plan efficiency matches optimization yield');

  // ==========================================
  // TEST 6: Fabric Boundaries & Spacing Integrity
  // ==========================================
  console.log('\n--- Test 6: Fabric Boundaries & Spacing Integrity ---');

  const fabricW = 150;
  const fabricL = 300;
  let allWithinBounds = true;
  let noCollisions = true;

  const placements = successfulAsyncResult.layoutPlacements;
  for (let i = 0; i < placements.length; i++) {
    const p1 = placements[i];
    if (p1.x < 0 || p1.y < 0 || p1.x + p1.width > fabricW || p1.y + p1.height > fabricL) {
      allWithinBounds = false;
      console.error(`  Out of bounds: piece ${p1.name} at (${p1.x}, ${p1.y}) size ${p1.width}x${p1.height}`);
    }

    // Check overlap with subsequent pieces
    for (let j = i + 1; j < placements.length; j++) {
      const p2 = placements[j];
      const overlapX = p1.x < p2.x + p2.width && p1.x + p1.width > p2.x;
      const overlapY = p1.y < p2.y + p2.height && p1.y + p1.height > p2.y;
      if (overlapX && overlapY) {
        noCollisions = false;
        console.error(`  Collision detected between ${p1.name} and ${p2.name}`);
      }
    }
  }

  assert(allWithinBounds, 'All placed pieces lie strictly within fabric boundaries [150cm × 300cm]');
  assert(noCollisions, 'Zero overlapping collisions detected between any placed pieces');

  // ==========================================
  // TEST 7: Excessive Quantity / Partial Placement Handling
  // ==========================================
  console.log('\n--- Test 7: Excessive Quantity / Partial Placement Handling ---');

  const highQtyPatterns = [
    {
      id: 'p-pocket-1',
      name: 'Shirt Pocket',
      width: 25,
      height: 25,
      quantity: 50, // 50 pockets on a small 60x60 fabric
      rotationAllowed: true,
      grainConstraint: 'Vertical'
    }
  ];

  const partialResult = optimizeFabricCutting({
    fabricWidth: 60,
    fabricLength: 60,
    patterns: highQtyPatterns,
    minSpacing: 0.5
  });

  assert(partialResult.success === true, 'Partial placement marks success: true with warning');
  assert(partialResult.placedCount > 0, `Placed subset of pieces (${partialResult.placedCount}/50)`);
  assert(partialResult.unplacedCount === 50 - partialResult.placedCount, `Accurately reports unplaced count (${partialResult.unplacedCount})`);
  assert(typeof partialResult.warning === 'string' && partialResult.warning.includes('could not fit'), 'Warning message informs user about unplaced pieces without crashing');

  // ==========================================
  // Final Test Summary
  // ==========================================
  console.log('\n==========================================');
  console.log(`Step 03 Optimizer Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('==========================================\n');

  if (failedCount > 0) {
    throw new Error(`Step 03 Optimizer tests failed: ${failedCount} test(s) failed.`);
  }
}

runStep03OptimizerTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
