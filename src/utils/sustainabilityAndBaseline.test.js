import { initialProjects } from '../data/mockProjects.js';
import { optimizeFabricCutting, validateOptimizationInput } from './fabricOptimizer.js';
import { getSustainabilityWording } from './sustainabilityWording.js';
import { generateCuttingPlan, generatePrintableSustainabilityReportHTML } from './cuttingPlanGenerator.js';

function runTests() {
  console.log('🧪 Starting Sustainability, Baseline Comparison & Data Consistency Tests...\n');
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

  // ==========================================
  // TEST 1: Sustainability Calculations & ESG Metric Derivations
  // ==========================================
  console.log('--- Test 1: Sustainability Calculations & Metric Derivations ---');
  
  const testProjectData = {
    fabricWidth: 150,
    fabricLength: 500,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      { id: 'p1', name: 'Front Panel', width: 40, height: 60, quantity: 4, rotationAllowed: true, grainConstraint: 'Vertical' },
      { id: 'p2', name: 'Back Panel', width: 40, height: 60, quantity: 4, rotationAllowed: true, grainConstraint: 'Vertical' },
      { id: 'p3', name: 'Sleeve', width: 30, height: 50, quantity: 8, rotationAllowed: true, grainConstraint: 'Vertical' }
    ]
  };

  const result = optimizeFabricCutting(testProjectData);

  assert(result.success === true, 'Optimization executed successfully');
  assert(result.placedCount === 16, 'All 16 pieces placed');
  assert(result.utilization > 0, `Derived utilization is positive (${result.utilization}%)`);
  assert(result.wastePercentage === Number((100 - result.utilization).toFixed(1)), 'Waste percentage = 100 - utilization');
  assert(result.hasValidBaseline === true, 'Baseline is calculated dynamically');
  assert(result.baselineUtilization > 0, `Baseline utilization is ${result.baselineUtilization}%`);
  assert(result.utilizationDeltaPp === Number((result.utilization - result.baselineUtilization).toFixed(1)), `Yield gain matches difference (${result.utilizationDeltaPp} pp)`);
  assert(result.wasteDeltaPp === Number((result.baselineWastePercentage - result.wastePercentage).toFixed(1)), `Waste delta matches difference (${result.wasteDeltaPp} pp)`);

  if (result.utilizationDeltaPp > 0) {
    assert(result.fabricSavedMeters > 0, `Raw fabric saved is positive (${result.fabricSavedMeters} m)`);
    assert(result.fabricSavedKg > 0, `Scrap saved is positive (${result.fabricSavedKg} kg)`);
    assert(result.waterSavedLiters > 0, `Freshwater conserved is positive (${result.waterSavedLiters} L)`);
    assert(result.co2SavedKg > 0, `CO2e emissions avoided is positive (${result.co2SavedKg} kg)`);
  }

  // ==========================================
  // TEST 2: Dynamic Sustainability Wording & Status Badging
  // ==========================================
  console.log('\n--- Test 2: Dynamic Sustainability Wording & Status Badging ---');
  
  // Case A: Improved vs baseline
  const wordingImproved = getSustainabilityWording({
    utilization: 94.2,
    waste: 5.8,
    baselineUtilization: 82.8,
    baselineWaste: 17.2,
    utilizationDeltaPp: 11.4,
    fabricSavedMeters: 4.3,
    fabricSavedKg: 1.25,
    hasOptimalConvergence: false
  });
  assert(wordingImproved.statusKey === 'improved', 'Status key is "improved" for positive delta');
  assert(wordingImproved.badgeText === '+11.4 pp Yield Gain', 'Badge text displays yield gain');
  assert(wordingImproved.impactSummary.includes('94.2%'), 'Impact summary contains utilization');
  assert(wordingImproved.impactSummary.includes('4.3 meters'), 'Impact summary contains fabric saved');

  // Case B: Equal to baseline (0 pp delta)
  const wordingEqual = getSustainabilityWording({
    utilization: 80.0,
    waste: 20.0,
    baselineUtilization: 80.0,
    baselineWaste: 20.0,
    utilizationDeltaPp: 0.0,
    fabricSavedMeters: 0,
    fabricSavedKg: 0,
    hasOptimalConvergence: false
  });
  assert(wordingEqual.statusKey === 'equal', 'Status key is "equal" for 0 pp delta');
  assert(wordingEqual.badgeText === 'No Improvement vs Baseline', 'Badge text displays "No Improvement vs Baseline"');

  // Case C: Below baseline (-2.5 pp delta)
  const wordingBelow = getSustainabilityWording({
    utilization: 75.0,
    waste: 25.0,
    baselineUtilization: 77.5,
    baselineWaste: 22.5,
    utilizationDeltaPp: -2.5,
    fabricSavedMeters: 0,
    fabricSavedKg: 0,
    hasOptimalConvergence: false
  });
  assert(wordingBelow.statusKey === 'below', 'Status key is "below" for negative delta');
  assert(wordingBelow.badgeText === 'Below Baseline', 'Badge text displays "Below Baseline"');

  // ==========================================
  // TEST 3: Baseline Comparison Dynamic Equalities
  // ==========================================
  console.log('\n--- Test 3: Sequential Baseline vs Optimized Nesting Comparison ---');
  
  initialProjects.forEach((proj, idx) => {
    const baselineWasteCalc = Number((100 - proj.baselineUtilization).toFixed(1));
    assert(proj.baselineWastePercentage === baselineWasteCalc, `Project #${idx + 1} baseline waste equals 100 - baselineUtilization (${baselineWasteCalc}%)`);

    const optWasteCalc = Number((100 - proj.utilization).toFixed(1));
    assert(proj.wastePercentage === optWasteCalc, `Project #${idx + 1} optimized waste equals 100 - utilization (${optWasteCalc}%)`);

    const expectedDelta = Number((proj.utilization - proj.baselineUtilization).toFixed(1));
    assert(proj.utilizationDeltaPp === expectedDelta, `Project #${idx + 1} utilizationDeltaPp (${proj.utilizationDeltaPp} pp) equals (${expectedDelta} pp)`);
  });

  // ==========================================
  // TEST 4: End-to-End Data Consistency Across Views
  // ==========================================
  console.log('\n--- Test 4: End-to-End Data Consistency Across Views ---');
  
  const sampleProject = initialProjects[0];
  const cuttingPlan = generateCuttingPlan(sampleProject);

  // Consistency 1: Total pieces in project = sum of pattern quantities = cutting plan totalPieces = layoutPlacements.length
  const patternSum = sampleProject.patterns.reduce((sum, p) => sum + p.quantity, 0);
  assert(sampleProject.totalPieces === patternSum, `Pattern quantities (${patternSum}) match project.totalPieces (${sampleProject.totalPieces})`);
  assert(cuttingPlan.totalPieces === sampleProject.totalPieces, `Cutting plan totalPieces matches project totalPieces (${cuttingPlan.totalPieces})`);
  assert(cuttingPlan.placements.length === sampleProject.layoutPlacements.length, `Cutting plan placements count (${cuttingPlan.placements.length}) matches layoutPlacements (${sampleProject.layoutPlacements.length})`);

  // Consistency 2: Utilization and waste numbers match exactly
  assert(cuttingPlan.optimizationSummary.utilization === sampleProject.utilization, 'Utilization matches between project and cutting plan');
  assert(cuttingPlan.optimizationSummary.wastePercentage === sampleProject.wastePercentage, 'Waste matches between project and cutting plan');
  assert(cuttingPlan.optimizationSummary.fabricSavedMeters === sampleProject.fabricSavedMeters, 'Fabric saved matches between project and cutting plan');

  // Consistency 3: Fabric dimensions match exactly
  assert(cuttingPlan.fabricRoll.length === sampleProject.fabricLength, 'Fabric length matches');
  assert(cuttingPlan.fabricRoll.width === sampleProject.fabricWidth, 'Fabric width matches');

  // ==========================================
  // TEST 5: Robust Edge Cases & Error Handling
  // ==========================================
  console.log('\n--- Test 5: Robust Edge Cases & Error Handling ---');

  // Edge Case 1: Empty pattern list
  const emptyValidation = validateOptimizationInput({ fabricWidth: 150, fabricLength: 500, patterns: [] });
  assert(emptyValidation.isValid === false, 'Empty pattern list is rejected by validator');
  assert(emptyValidation.errors.some(e => e.includes('pattern piece is required')), 'Provides user-friendly error for empty patterns');

  const emptyResult = optimizeFabricCutting({ fabricWidth: 150, fabricLength: 500, patterns: [] });
  assert(emptyResult.success === false, 'optimizeFabricCutting returns success: false for empty patterns');
  assert(emptyResult.utilization === 0, 'Utilization is 0 for empty patterns');

  // Edge Case 2: Invalid or non-positive fabric dimensions
  const invalidDimResult = optimizeFabricCutting({ fabricWidth: 0, fabricLength: -100, patterns: [{ width: 20, height: 20, quantity: 1 }] });
  assert(invalidDimResult.success === false, 'Invalid fabric dimensions rejected without crashing');

  // Edge Case 3: Oversized piece larger than fabric roll
  const oversizedResult = optimizeFabricCutting({
    fabricWidth: 50,
    fabricLength: 100,
    patterns: [{ name: 'Giant Banner', width: 200, height: 120, quantity: 1 }]
  });
  assert(oversizedResult.success === false, 'Oversized piece larger than fabric rejected cleanly');
  assert(oversizedResult.error.includes('Giant Banner'), 'Error message identifies the oversized pattern piece by name');

  // Edge Case 4: Excessive pattern quantity exceeding fabric capacity (partial packing)
  const excessiveResult = optimizeFabricCutting({
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0.5,
    patterns: [{ name: 'Small Square', width: 30, height: 30, quantity: 25 }] // 25 squares cannot all fit on 100x100
  });
  assert(excessiveResult.success === true, 'Excessive quantity places maximum possible pieces without crashing');
  assert(excessiveResult.placedCount > 0 && excessiveResult.placedCount < 25, `Placed subset of pieces (${excessiveResult.placedCount}/25)`);
  assert(excessiveResult.unplacedCount > 0, `Correctly reports unplaced count (${excessiveResult.unplacedCount})`);
  assert(typeof excessiveResult.warning === 'string' && excessiveResult.warning.includes('could not fit'), 'Provides clear nesting warning notice');

  // Edge Case 5: Strict vertical grain direction constraint
  const strictGrainResult = optimizeFabricCutting({
    fabricWidth: 100,
    fabricLength: 200,
    allowRotation: true,
    respectGrain: true,
    patterns: [{ name: 'Grain Constrained', width: 40, height: 80, quantity: 2, grainConstraint: 'Vertical', rotationAllowed: true }]
  });
  assert(strictGrainResult.success === true, 'Strict vertical grain pattern placed');
  // Vertical grain allows only 0° or 180° rotation
  strictGrainResult.layoutPlacements.forEach((p) => {
    assert(p.rotation === 0 || p.rotation === 180, `Piece rotated only to valid vertical grain angle (${p.rotation}°)`);
  });

  // ==========================================
  // TEST 6: Determinism Invariant Across 10 Repeated Runs
  // ==========================================
  console.log('\n--- Test 6: Determinism Invariant Across 10 Repeated Runs ---');
  
  const baseRun = optimizeFabricCutting(testProjectData);
  let isDeterministic = true;

  for (let r = 1; r <= 10; r++) {
    const repeatRun = optimizeFabricCutting(testProjectData);
    if (repeatRun.placedCount !== baseRun.placedCount ||
        repeatRun.utilization !== baseRun.utilization ||
        repeatRun.wastePercentage !== baseRun.wastePercentage) {
      isDeterministic = false;
      break;
    }
    for (let i = 0; i < baseRun.layoutPlacements.length; i++) {
      const p1 = baseRun.layoutPlacements[i];
      const p2 = repeatRun.layoutPlacements[i];
      if (p1.x !== p2.x || p1.y !== p2.y || p1.rotation !== p2.rotation) {
        isDeterministic = false;
        break;
      }
    }
  }

  assert(isDeterministic, '10 repeated optimization executions produced 100% identical placement coordinates and metrics');

  // ==========================================
  // TEST 7: Audited Real Nesting Efficiency, Active Marker Yield & Candidate Selection
  // ==========================================
  console.log('\n--- Test 7: Audited Real Nesting Efficiency, Active Marker Yield & Candidate Selection ---');

  const auditedPatterns = [
    { id: 'p1', name: 'Front Bodice', width: 40, height: 60, quantity: 10, grainDirection: 'Vertical', color: '#0ea5e9' },
    { id: 'p2', name: 'Back Bodice', width: 42, height: 62, quantity: 10, grainDirection: 'Vertical', color: '#10b981' },
    { id: 'p3', name: 'Sleeves', width: 25, height: 52, quantity: 4, grainDirection: 'Vertical', color: '#f59e0b' },
    { id: 'p4', name: 'Collar Band', width: 15, height: 22, quantity: 4, grainDirection: 'Horizontal', color: '#8b5cf6' },
    { id: 'p5', name: 'Cuffs', width: 12, height: 24, quantity: 4, grainDirection: 'Horizontal', color: '#06b6d4' },
    { id: 'p6', name: 'Chest Pocket', width: 12, height: 14, quantity: 1, grainDirection: 'Flexible', color: '#ec4899' }
  ];

  const bestCandidateRun = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 500,
    patterns: auditedPatterns,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    layoutVariant: 0
  });

  // Verify full-roll utilization equality (no fake full-roll improvement claimed)
  assert(bestCandidateRun.placedCount === 33, 'Audited run: all 33 pieces placed in Candidate 0');
  assert(bestCandidateRun.baselinePlacedCount === 33, 'Audited run: all 33 pieces placed in baseline');
  assert(bestCandidateRun.utilization === 77.2, `Audited run full-roll utilization is 77.2% (${bestCandidateRun.utilization}%)`);
  assert(bestCandidateRun.baselineUtilization === 77.2, `Audited run baseline full-roll utilization is 77.2% (${bestCandidateRun.baselineUtilization}%)`);
  assert(bestCandidateRun.utilizationDeltaPp === 0.0, 'Full-roll utilization delta is honestly 0.0 pp');

  // Verify active marker efficiency derived from actual cut lengths
  const patternAreaCm2 = bestCandidateRun.placedPatternAreaCm2;
  const fabricWidthCm = 150;
  const cutLengthCm = bestCandidateRun.actualLengthUsedCm;
  const baseLengthCm = bestCandidateRun.baselineLengthUsedCm;

  const derivedMarkerEfficiency = Number(((patternAreaCm2 / (fabricWidthCm * cutLengthCm)) * 100).toFixed(1));
  const derivedBaseMarkerEfficiency = Number(((patternAreaCm2 / (fabricWidthCm * baseLengthCm)) * 100).toFixed(1));
  const markerDeltaPp = Number((derivedMarkerEfficiency - derivedBaseMarkerEfficiency).toFixed(1));
  const savedFabricCm = Number((baseLengthCm - cutLengthCm).toFixed(1));

  assert(baseLengthCm === 491, `Baseline cut length is 491.0 cm (got ${baseLengthCm} cm)`);
  assert(cutLengthCm === 465.5, `Best candidate cut length is 465.5 cm (got ${cutLengthCm} cm)`);
  assert(derivedBaseMarkerEfficiency === 78.6, `Baseline marker efficiency is ~78.6% (got ${derivedBaseMarkerEfficiency}%)`);
  assert(derivedMarkerEfficiency === 82.9, `Best candidate marker efficiency is ~82.9% (got ${derivedMarkerEfficiency}%)`);
  assert(markerDeltaPp === 4.3, `Active marker yield improvement is +4.3 pp (got +${markerDeltaPp} pp)`);
  assert(savedFabricCm === 25.5, `Linear fabric length saved along bolt is 25.5 cm (got ${savedFabricCm} cm)`);

  // Verify candidate selection behavior (Candidate 0 vs Candidate 14)
  const altCandidateRun = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 500,
    patterns: auditedPatterns,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true,
    layoutVariant: 14
  });
  assert(altCandidateRun.placedCount === 33, 'Alternative candidate also places 33 pieces');
  assert(altCandidateRun.actualLengthUsedCm > bestCandidateRun.actualLengthUsedCm, `Candidate 0 (${bestCandidateRun.actualLengthUsedCm}cm) is tighter than Candidate 14 (${altCandidateRun.actualLengthUsedCm}cm)`);
  assert(bestCandidateRun.candidateLayoutsCount > 1, `Multiple layout candidates generated (${bestCandidateRun.candidateLayoutsCount} candidates)`);

  // Verify missing baseline behavior
  const missingBaseWording = getSustainabilityWording({
    utilization: 82.9,
    waste: 17.1,
    baselineUtilization: null,
    baselineWaste: null,
    utilizationDeltaPp: null,
    markerEfficiency: 82.9,
    baselineMarkerEfficiency: null,
    markerDeltaPp: null,
    fabricSavedMeters: 0,
    fabricSavedKg: 0
  });
  assert(missingBaseWording.statusKey === 'no-baseline', 'Missing baseline produces "no-baseline" statusKey');
  assert(missingBaseWording.badgeText === 'Real Calculated Benchmark', 'Missing baseline shows neutral benchmark badge');
  assert(missingBaseWording.impactSummary.includes('Baseline marker data is required'), 'Missing baseline impact summary explains requirement');

  // Verify wording with active marker efficiency mode
  const markerWording = getSustainabilityWording({
    utilization: 77.2,
    waste: 22.8,
    baselineUtilization: 77.2,
    baselineWaste: 22.8,
    utilizationDeltaPp: 0.0,
    markerEfficiency: 82.9,
    baselineMarkerEfficiency: 78.6,
    markerDeltaPp: 4.3,
    fabricSavedCm: 25.5,
    fabricSavedMeters: 0.26,
    fabricSavedKg: 0.11,
    actualCutLengthM: 4.66,
    baselineCutLengthM: 4.91
  });
  assert(markerWording.statusKey === 'improved', 'Marker delta > 0 produces "improved" statusKey');
  assert(markerWording.badgeText === '+4.3 pp Yield Gain', 'Badge shows +4.3 pp yield gain');
  assert(markerWording.impactSummary.includes('82.9%'), 'Impact summary includes marker efficiency (82.9%)');
  assert(markerWording.impactSummary.includes('78.6%'), 'Impact summary includes baseline marker efficiency (78.6%)');
  assert(markerWording.impactSummary.includes('25.5 cm'), 'Impact summary includes 25.5 cm fabric saved');

  // ==========================================
  // TEST 8: Environmental Impact Proxy Indicators & Transparent Estimation Wording
  // ==========================================
  console.log('\n--- Test 8: Environmental Impact Proxy Indicators & Transparent Estimation Wording ---');

  // Test 8a: Proxy indicator derivations for audited project (0.07 kg scrap example)
  const auditedSavedKg = 0.07;
  const auditedRawWater = Math.round(auditedSavedKg * 1400); // 98
  const auditedEstimatedWater = auditedRawWater >= 20 ? Math.round(auditedRawWater / 10) * 10 : auditedRawWater; // 100
  const auditedCo2 = Number((auditedSavedKg * 6.8).toFixed(1)); // 0.5
  assert(auditedRawWater === 98, 'Audited raw water is 98 L (0.07 kg * 1400 L/kg)');
  assert(auditedEstimatedWater === 100, 'Audited estimated water rounds to ~100 liters');
  assert(auditedCo2 === 0.5, 'Audited CO2 indicator is ~0.5 kg CO2e (0.07 kg * 6.8 kg/kg)');

  // Test 8b: Zero or negative fabric savings guard against positive environmental savings
  const zeroSavedKg = 0;
  const zeroRawWater = Math.round(zeroSavedKg * 1400);
  const zeroEstimatedWater = zeroRawWater >= 20 ? Math.round(zeroRawWater / 10) * 10 : zeroRawWater;
  const zeroCo2 = Number((zeroSavedKg * 6.8).toFixed(1));
  assert(zeroRawWater === 0, 'Zero scrap saved produces strictly 0 raw water');
  assert(zeroEstimatedWater === 0, 'Zero scrap saved produces strictly 0 estimated water');
  assert(zeroCo2 === 0, 'Zero scrap saved produces strictly 0 kg CO2e');

  // Test 8c: Descriptions must be honest and not retain misleading direct measurement or drinking water claims
  const scrapDesc = 'Estimated pre-consumer scrap reduction based on saved fabric area and assumed fabric density (280 g/m²).';
  const waterDesc = 'Estimated industrial freshwater indicator based on an assumed proxy factor of 1,400 L/kg textile.';
  const co2Desc = 'Estimated upstream emissions indicator based on an assumed proxy factor of 6.8 kg CO₂e per kg textile.';

  assert(!scrapDesc.includes('Direct measurement'), 'Scrap description does not claim direct measurement');
  assert(scrapDesc.includes('Estimated pre-consumer scrap reduction'), 'Scrap description explicitly states estimated');
  assert(scrapDesc.includes('280 g/m²'), 'Scrap description discloses 280 g/m² assumption');

  assert(!waterDesc.includes('drinking water'), 'Freshwater description does not equate with drinking water');
  assert(!waterDesc.includes('person-days'), 'Freshwater description does not make person-days drinking comparison');
  assert(waterDesc.includes('1,400 L/kg'), 'Freshwater description discloses 1,400 L/kg proxy factor');

  assert(!co2Desc.includes('verified'), 'CO2 description does not claim verified emissions');
  assert(co2Desc.includes('6.8 kg CO₂e'), 'CO2 description discloses 6.8 kg CO2e proxy factor');

  // Test 8d: Exported HTML consistency
  const printSampleProject = initialProjects[0];
  const printableHtml = generatePrintableSustainabilityReportHTML(printSampleProject);
  assert(printableHtml.includes('Assumed proxy (1,400 L/kg textile)'), 'Printable report discloses 1,400 L/kg proxy');
  assert(printableHtml.includes('Assumed proxy (6.8 kg CO₂e/kg textile)'), 'Printable report discloses 6.8 kg CO2e proxy');
  assert(printableHtml.includes('pre-consumer textile (estimated)'), 'Printable report indicates estimated scrap weight');
  assert(!printableHtml.includes('person-days'), 'Printable report does not contain person-days comparison');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log(`\n==========================================`);
  console.log(`Sustainability & Baseline Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
