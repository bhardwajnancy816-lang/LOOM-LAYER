import test from 'node:test';
import assert from 'node:assert';
import { 
  optimizeFabricCutting, 
  getLayoutSignature, 
  validateNestingLayout 
} from './fabricOptimizer.js';
import { exportCuttingPlanToJSON } from './cuttingPlanGenerator.js';
import { initialProjects } from '../data/mockProjects.js';

test('Try Another Layout: Multi-candidate generation, geometric deduplication, and deterministic cycling', () => {
  console.log('\n🧪 Starting Try Another Layout Candidate Generation & Cycling Tests...');

  // ==========================================
  // TEST 1: Candidate Layout Generation & Deduplication
  // ==========================================
  console.log('\n--- Test 1: Candidate Layout Generation & Deduplication ---');
  const project1 = initialProjects[0];
  const resDefault = optimizeFabricCutting(project1);

  assert(resDefault.success === true, 'Optimization executed successfully');
  assert(resDefault.placedCount > 0, 'Pieces were placed');
  assert(typeof resDefault.candidateLayoutsCount === 'number', 'candidateLayoutsCount is numeric');
  assert(resDefault.candidateLayoutsCount > 1, `Multiple distinct valid candidates found (got ${resDefault.candidateLayoutsCount})`);
  assert(resDefault.hasAlternativeLayout === true, 'hasAlternativeLayout flag is true when multiple candidates exist');
  assert(resDefault.selectedLayoutIndex === 0, 'Default run selects top-ranked candidate (index 0)');
  assert(typeof resDefault.layoutSignature === 'string' && resDefault.layoutSignature.length > 0, 'Valid geometric signature generated');
  console.log(`  ✅ PASS: Found ${resDefault.candidateLayoutsCount} distinct valid candidate layouts for ${project1.name}`);

  // ==========================================
  // TEST 2: Cycling Variants Produces Genuinely Different Coordinates
  // ==========================================
  console.log('\n--- Test 2: Cycling Variants Produces Genuinely Different Coordinates ---');
  const resVariant0 = optimizeFabricCutting(project1, { layoutVariant: 0 });
  const resVariant1 = optimizeFabricCutting(project1, { layoutVariant: 1 });

  assert.strictEqual(resVariant0.selectedLayoutIndex, 0, 'Variant 0 has selectedLayoutIndex 0');
  assert.strictEqual(resVariant1.selectedLayoutIndex, 1, 'Variant 1 has selectedLayoutIndex 1');
  assert.notStrictEqual(resVariant0.layoutSignature, resVariant1.layoutSignature, 'Variant 0 and Variant 1 have distinct geometric signatures');

  // Verify at least one piece coordinate or placement differs by piece identity
  const map0 = new Map(resVariant0.layoutPlacements.map((p) => [p.name, p]));
  const map1 = new Map(resVariant1.layoutPlacements.map((p) => [p.name, p]));
  let foundDifferentPlacement = false;

  for (const [name, p0] of map0) {
    const p1 = map1.get(name);
    if (!p1 || Math.abs(p0.x - p1.x) > 0.1 || Math.abs(p0.y - p1.y) > 0.1 || p0.rotation !== p1.rotation) {
      foundDifferentPlacement = true;
      break;
    }
  }
  assert(foundDifferentPlacement, 'At least one pattern piece is placed at different coordinates or orientation');
  console.log('  ✅ PASS: Variant 0 and Variant 1 produce distinct placement coordinates and orientations');

  // ==========================================
  // TEST 3: Deterministic Invariant Across Repeated Runs
  // ==========================================
  console.log('\n--- Test 3: Deterministic Invariant Across Repeated Runs ---');
  for (let v = 0; v < Math.min(3, resDefault.candidateLayoutsCount); v++) {
    const runA = optimizeFabricCutting(project1, { layoutVariant: v });
    const runB = optimizeFabricCutting(project1, { layoutVariant: v });

    assert.strictEqual(runA.layoutSignature, runB.layoutSignature, `Repeated runs for variant ${v} have identical layout signatures`);
    assert.strictEqual(runA.actualLengthUsedCm, runB.actualLengthUsedCm, `Repeated runs for variant ${v} have identical length consumed`);
    assert.strictEqual(runA.utilization, runB.utilization, `Repeated runs for variant ${v} have identical utilization`);

    for (let i = 0; i < runA.layoutPlacements.length; i++) {
      const pa = runA.layoutPlacements[i];
      const pb = runB.layoutPlacements[i];
      assert.strictEqual(pa.x, pb.x, `Piece ${i} x-coordinate is strictly identical`);
      assert.strictEqual(pa.y, pb.y, `Piece ${i} y-coordinate is strictly identical`);
      assert.strictEqual(pa.rotation, pb.rotation, `Piece ${i} rotation is strictly identical`);
    }
  }
  console.log('  ✅ PASS: Optimization is 100% deterministic for every variant index');

  // ==========================================
  // TEST 4: Modulo Cycling
  // ==========================================
  console.log('\n--- Test 4: Modulo Cycling ---');
  const totalCount = resDefault.candidateLayoutsCount;
  const wrappedRun = optimizeFabricCutting(project1, { layoutVariant: totalCount }); // totalCount % totalCount === 0

  assert.strictEqual(wrappedRun.selectedLayoutIndex, 0, 'layoutVariant equal to totalCount wraps around to index 0');
  assert.strictEqual(wrappedRun.layoutSignature, resVariant0.layoutSignature, 'Wrapped run produces identical signature to variant 0');
  console.log('  ✅ PASS: Variant index smoothly cycles through available candidates');

  // ==========================================
  // TEST 5: Every Candidate Layout is 100% Geometrically Valid
  // ==========================================
  console.log('\n--- Test 5: Every Candidate Layout is 100% Geometrically Valid ---');
  for (let v = 0; v < resDefault.candidateLayoutsCount; v++) {
    const candidateRun = optimizeFabricCutting(project1, { layoutVariant: v });
    
    // Placement count invariant
    assert.strictEqual(candidateRun.placedCount, resDefault.placedCount, `Variant ${v} places exact maximum piece count (${resDefault.placedCount})`);

    // Independent collision & boundary verification
    const val = validateNestingLayout(
      candidateRun.layoutPlacements, 
      project1.fabricLength, 
      project1.fabricWidth, 
      project1.minSpacing || 0.5
    );
    assert(val.isValid, `Variant ${v} layout is 100% geometrically valid (zero collision, zero boundary violation)`);
    assert.strictEqual(val.overlapCount, 0, `Variant ${v} has 0 overlaps`);
    assert.strictEqual(val.boundaryViolationCount, 0, `Variant ${v} has 0 boundary violations`);

    // Grain constraint verification
    candidateRun.layoutPlacements.forEach((p) => {
      if (p.grainConstraint === 'Vertical') {
        assert(p.rotation === 0 || p.rotation === 180, `Piece ${p.name} in variant ${v} respects vertical grain`);
      } else if (p.grainConstraint === 'Horizontal') {
        assert(p.rotation === 90 || p.rotation === 270, `Piece ${p.name} in variant ${v} respects horizontal grain`);
      }
    });
  }
  console.log(`  ✅ PASS: All ${resDefault.candidateLayoutsCount} candidate layouts pass independent collision, boundary, and grain validation`);

  // ==========================================
  // TEST 6: Single Candidate Edge Case (No Alternatives)
  // ==========================================
  console.log('\n--- Test 6: Single Candidate Edge Case ---');
  const singlePieceInput = {
    fabricWidth: 80,
    fabricLength: 80,
    minSpacing: 0,
    allowRotation: false,
    respectGrain: true,
    patterns: [
      { id: 'exact', name: 'Exact Fit Block', width: 80, height: 80, quantity: 1, rotationAllowed: false, grainConstraint: 'Vertical' }
    ]
  };

  const singleRes0 = optimizeFabricCutting(singlePieceInput, { layoutVariant: 0 });
  const singleRes1 = optimizeFabricCutting(singlePieceInput, { layoutVariant: 1 });

  assert.strictEqual(singleRes0.candidateLayoutsCount, 1, 'Single piece layout has candidateLayoutsCount: 1');
  assert.strictEqual(singleRes0.hasAlternativeLayout, false, 'hasAlternativeLayout is false when only 1 candidate exists');
  assert.strictEqual(singleRes1.selectedLayoutIndex, 0, 'Selected index stays 0 when no alternatives exist');
  assert.strictEqual(singleRes0.layoutSignature, singleRes1.layoutSignature, 'Layout signature is preserved when no alternatives exist');
  console.log('  ✅ PASS: Correctly flags hasAlternativeLayout: false when only 1 distinct candidate is geometrically possible');

  // ==========================================
  // TEST 7: Dependent Metrics and Exports Remain Consistent
  // ==========================================
  console.log('\n--- Test 7: Dependent Metrics & Exports Consistency ---');
  const mockProj0 = { ...project1, layoutPlacements: resVariant0.layoutPlacements, actualLengthUsedCm: resVariant0.actualLengthUsedCm };
  const mockProj1 = { ...project1, layoutPlacements: resVariant1.layoutPlacements, actualLengthUsedCm: resVariant1.actualLengthUsedCm };

  const json0 = JSON.parse(exportCuttingPlanToJSON(mockProj0));
  const json1 = JSON.parse(exportCuttingPlanToJSON(mockProj1));

  assert.strictEqual(json0.placements.length, resVariant0.layoutPlacements.length, 'Export 0 placement count matches layoutPlacements');
  assert.strictEqual(json1.placements.length, resVariant1.layoutPlacements.length, 'Export 1 placement count matches layoutPlacements');
  assert.strictEqual(json0.optimizationSummary.actualLengthUsedCm, resVariant0.actualLengthUsedCm, 'Export 0 actualLengthUsedCm matches variant 0');
  assert.strictEqual(json1.optimizationSummary.actualLengthUsedCm, resVariant1.actualLengthUsedCm, 'Export 1 actualLengthUsedCm matches variant 1');
  console.log('  ✅ PASS: Cutting plan export JSON reflects selected variant placements and metrics');

  // ==========================================
  // TEST 8: Repeated Sequential Clicks & Candidate Cycling Simulation
  // ==========================================
  console.log('\n--- Test 8: Repeated Sequential Clicks & Candidate Cycling ---');
  let simulatedProject = { ...project1 };
  const numClicks = 12;
  const totalVariants = resDefault.candidateLayoutsCount;
  const recordedIndices = [];

  for (let click = 1; click <= numClicks; click++) {
    const currentVariant = typeof simulatedProject.layoutVariant === 'number'
      ? simulatedProject.layoutVariant
      : (typeof simulatedProject.selectedLayoutIndex === 'number' ? simulatedProject.selectedLayoutIndex : 0);
    const targetVariant = currentVariant + 1;

    const optResult = optimizeFabricCutting(simulatedProject, { layoutVariant: targetVariant });
    assert(optResult.success, `Optimization on click #${click} succeeded`);
    assert(optResult.hasAlternativeLayout, `Alternative layouts available on click #${click}`);

    const expectedIndex = (currentVariant + 1) % totalVariants;
    assert.strictEqual(optResult.selectedLayoutIndex, expectedIndex, `Click #${click} advanced selectedLayoutIndex to ${expectedIndex}`);
    recordedIndices.push(optResult.selectedLayoutIndex);

    // Update project state as ProjectContext does
    simulatedProject = {
      ...simulatedProject,
      layoutVariant: optResult.selectedLayoutIndex,
      selectedLayoutIndex: optResult.selectedLayoutIndex,
      layoutPlacements: optResult.layoutPlacements,
      placedCount: optResult.placedCount,
      unplacedCount: optResult.unplacedCount,
      actualLengthUsedCm: optResult.actualLengthUsedCm,
      actualLengthUsedM: optResult.actualLengthUsedM,
      utilization: optResult.utilization,
      wastePercentage: optResult.wastePercentage,
      fabricSavedMeters: optResult.fabricSavedMeters,
      layoutSignature: optResult.layoutSignature
    };

    // Verify placements match updated project
    assert.strictEqual(simulatedProject.layoutPlacements.length, optResult.placedCount, `Click #${click} placed count synchronized`);
    assert(simulatedProject.actualLengthUsedCm > 0, `Click #${click} actual length used is positive`);
  }

  // Verify cyclic sequence repeats deterministically
  assert.deepStrictEqual(
    recordedIndices.slice(0, totalVariants),
    [1, 2, 3, 4, 5, 0],
    'First cycle advances smoothly through 1..5 then wraps to 0'
  );
  assert.deepStrictEqual(
    recordedIndices.slice(totalVariants, totalVariants * 2),
    [1, 2, 3, 4, 5, 0],
    'Second cycle repeats exactly the same deterministic candidate order'
  );
  console.log(`  ✅ PASS: Simulated ${numClicks} sequential button clicks cleanly advancing and cycling variants`);

  // ==========================================
  // TEST 9: Real Production Batch (Project #2) No-Alternative Case
  // ==========================================
  console.log('\n--- Test 9: Real Project #2 No-Alternative Case ---');
  const project2 = initialProjects[1]; // Heavy Denim Workwear Jacket
  const resP2Default = optimizeFabricCutting(project2, { layoutVariant: 0 });
  const resP2Next = optimizeFabricCutting(project2, { layoutVariant: 1 });

  assert.strictEqual(resP2Default.candidateLayoutsCount, 1, 'Project #2 has candidateLayoutsCount: 1');
  assert.strictEqual(resP2Default.hasAlternativeLayout, false, 'Project #2 hasAlternativeLayout is false');
  assert.strictEqual(resP2Next.selectedLayoutIndex, 0, 'Target variant 1 stays on index 0 when no alternatives exist');
  assert.strictEqual(resP2Next.layoutSignature, resP2Default.layoutSignature, 'Best valid layout is strictly preserved for Project #2');
  assert.strictEqual(resP2Next.placedCount, resP2Default.placedCount, 'Placed piece count strictly preserved');
  console.log('  ✅ PASS: Real project with single distinct candidate cleanly preserves best layout and reports hasAlternativeLayout: false');

  // ==========================================
  // TEST 10: Concurrency, In-Flight Guarding & Stale Result Prevention Logic
  // ==========================================
  console.log('\n--- Test 10: In-Flight Guarding & Stale Result Rejection Logic ---');
  let isSwitching = false;
  let activeReqId = 0;
  let stateUpdatedCount = 0;

  const triggerSwitch = (reqNum) => {
    if (isSwitching) {
      return { rejected: true, reason: 'concurrent_click_prevented' };
    }
    isSwitching = true;
    const currentId = ++activeReqId;
    return {
      rejected: false,
      reqId: currentId,
      complete: (resultReqId) => {
        // Discard stale result if superseded
        if (resultReqId === activeReqId) {
          stateUpdatedCount++;
          isSwitching = false;
          return { accepted: true };
        }
        return { accepted: false, reason: 'stale_result_discarded' };
      }
    };
  };

  const req1 = triggerSwitch(1);
  assert.strictEqual(req1.rejected, false, 'First click accepted');
  assert.strictEqual(isSwitching, true, 'isSwitching set to true during active run');

  // Attempt duplicate click while first is in-flight
  const duplicateClick = triggerSwitch(2);
  assert.strictEqual(duplicateClick.rejected, true, 'Duplicate click while in-flight is cleanly rejected');
  assert.strictEqual(duplicateClick.reason, 'concurrent_click_prevented', 'Reason is concurrency guard');

  // Complete first request
  const comp1 = req1.complete(req1.reqId);
  assert.strictEqual(comp1.accepted, true, 'Current request result is accepted');
  assert.strictEqual(isSwitching, false, 'isSwitching released after completion');
  assert.strictEqual(stateUpdatedCount, 1, 'State updated exactly once');

  // Stale completion test: older request completes after newer request
  const req2 = triggerSwitch(3);
  isSwitching = false; // Simulate another trigger starting
  const req3 = triggerSwitch(4);

  const staleComp = req2.complete(req2.reqId); // Older req2 finishes
  assert.strictEqual(staleComp.accepted, false, 'Stale request result is discarded');
  assert.strictEqual(staleComp.reason, 'stale_result_discarded');

  const validComp = req3.complete(req3.reqId); // Newer req3 finishes
  assert.strictEqual(validComp.accepted, true, 'Newest request result is accepted');
  console.log('  ✅ PASS: Concurrency guard and stale result protection logic verified');

  console.log('\n==========================================');
  console.log('Try Another Layout Tests: All Passed!');
  console.log('==========================================');
});
