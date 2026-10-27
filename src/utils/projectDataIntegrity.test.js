import { initialProjects } from '../data/mockProjects.js';

function runTests() {
  console.log('🧪 Starting Project Data Persistence & Dashboard Metrics Integrity Tests...\n');
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
  // TEST 1: Mock Projects Baseline and Metric Completeness
  // ==========================================
  console.log('--- Test 1: Mock Projects Baseline and Metric Completeness ---');
  assert(Array.isArray(initialProjects) && initialProjects.length === 4, 'Mock projects has exactly 4 demo projects');

  initialProjects.forEach((proj, idx) => {
    assert(typeof proj.id === 'string' && proj.id.length > 0, `Project #${idx + 1} (${proj.name}) has valid ID`);
    assert(typeof proj.fabricWidth === 'number' && proj.fabricWidth > 0, `Project #${idx + 1} has positive fabricWidth`);
    assert(typeof proj.fabricLength === 'number' && proj.fabricLength > 0, `Project #${idx + 1} has positive fabricLength`);
    assert(typeof proj.utilization === 'number' && proj.utilization > 0, `Project #${idx + 1} has positive utilization (${proj.utilization}%)`);
    assert(typeof proj.wastePercentage === 'number' && proj.wastePercentage > 0, `Project #${idx + 1} has positive wastePercentage (${proj.wastePercentage}%)`);
    assert(typeof proj.fabricSavedMeters === 'number' && proj.fabricSavedMeters >= 0, `Project #${idx + 1} has fabricSavedMeters (${proj.fabricSavedMeters}m)`);
    assert(proj.hasValidBaseline === true, `Project #${idx + 1} hasValidBaseline is true`);
    assert(typeof proj.baselineUtilization === 'number' && proj.baselineUtilization > 0, `Project #${idx + 1} has baselineUtilization (${proj.baselineUtilization}%)`);
    assert(typeof proj.baselineWastePercentage === 'number' && proj.baselineWastePercentage > 0, `Project #${idx + 1} has baselineWastePercentage (${proj.baselineWastePercentage}%)`);
    assert(typeof proj.utilizationDeltaPp === 'number', `Project #${idx + 1} has utilizationDeltaPp (${proj.utilizationDeltaPp} pp)`);
    assert(typeof proj.wasteDeltaPp === 'number', `Project #${idx + 1} has wasteDeltaPp (${proj.wasteDeltaPp} pp)`);
  });

  // ==========================================
  // TEST 2: Dashboard Cumulative Metrics Calculations
  // ==========================================
  console.log('\n--- Test 2: Dashboard Metric Calculations ---');
  const totalProjectsCount = initialProjects.length;
  assert(totalProjectsCount === 4, 'Total projects count is 4');

  // Total Fabric Saved: 4.3 + 7.2 + 3.8 + 3.1 = 18.4 m
  const totalSavedMeters = initialProjects
    .reduce((sum, p) => sum + (typeof p.fabricSavedMeters === 'number' ? p.fabricSavedMeters : 0), 0)
    .toFixed(1);
  assert(totalSavedMeters === '18.4', `Total fabric saved is exactly 18.4 m (got ${totalSavedMeters} m)`);

  // Average Efficiency: (94.2 + 91.7 + 93.8 + 95.4) / 4 = 375.1 / 4 = 93.775 -> 93.8%
  const completedProjects = initialProjects.filter(p => typeof p.utilization === 'number' && p.utilization > 0);
  const avgEfficiency = (
    completedProjects.reduce((sum, p) => sum + p.utilization, 0) / completedProjects.length
  ).toFixed(1);
  assert(avgEfficiency === '93.8', `Average efficiency is calculated as 93.8% (got ${avgEfficiency}%)`);

  // Average Waste Reduced: (11.4 + 10.2 + 10.2 + 11.2) / 4 = 43.0 / 4 = 10.75 -> 10.8 pp
  const projectsWithBaseline = initialProjects.filter(p => p.hasValidBaseline && typeof p.wasteDeltaPp === 'number');
  const avgWasteReduction = (
    projectsWithBaseline.reduce((sum, p) => sum + p.wasteDeltaPp, 0) / projectsWithBaseline.length
  ).toFixed(1);
  assert(avgWasteReduction === '10.8', `Average waste reduction is calculated as 10.8 pp (got ${avgWasteReduction} pp)`);

  // Average Yield Gain in percentage points
  const avgYieldGainPp = (
    projectsWithBaseline.reduce((sum, p) => sum + p.utilizationDeltaPp, 0) / projectsWithBaseline.length
  ).toFixed(1);
  assert(avgYieldGainPp === '10.8', `Average yield gain is 10.8 pp (got ${avgYieldGainPp} pp)`);

  // ==========================================
  // TEST 3: Edge Case: Draft Projects with 0 utilization do not corrupt averages
  // ==========================================
  console.log('\n--- Test 3: Handling Draft Project Additions ---');
  const draftProject = {
    id: 'proj-new-draft',
    name: 'Draft Project',
    fabricType: 'Silk',
    fabricWidth: 140,
    fabricLength: 300,
    status: 'Draft',
    utilization: 0,
    wastePercentage: 0,
    fabricSavedMeters: 0,
    patterns: []
  };

  const projectListWithDraft = [draftProject, ...initialProjects];
  assert(projectListWithDraft.length === 5, 'Project list includes 5 projects with draft');

  const draftCompleted = projectListWithDraft.filter(p => typeof p.utilization === 'number' && p.utilization > 0);
  const avgEfficiencyWithDraft = (
    draftCompleted.reduce((sum, p) => sum + p.utilization, 0) / draftCompleted.length
  ).toFixed(1);

  assert(avgEfficiencyWithDraft === '93.8', `Average efficiency of completed batches remains 93.8% (got ${avgEfficiencyWithDraft}%)`);

  const totalSavedWithDraft = projectListWithDraft
    .reduce((sum, p) => sum + (typeof p.fabricSavedMeters === 'number' ? p.fabricSavedMeters : 0), 0)
    .toFixed(1);

  assert(totalSavedWithDraft === '18.4', `Total fabric saved remains 18.4 m without fake fallback additions (got ${totalSavedWithDraft} m)`);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log(`\n==========================================`);
  console.log(`Data Integrity Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
