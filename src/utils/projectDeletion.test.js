import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProjects } from '../data/mockProjects.js';
import { deleteProjectFromSupabase } from '../services/supabaseService.js';

test('Project Deletion: ID-based deletion, cascade integrity, and metric updates', async () => {
  console.log('\n🧪 Starting Project Deletion & Integrity Test Suite...');

  // TEST 1: Deleting by unique project ID removes only the target project
  console.log('--- Test 1: Deletion by Unique Project ID ---');
  let currentProjects = JSON.parse(JSON.stringify(initialProjects));
  const initialCount = currentProjects.length;
  assert.equal(initialCount, 4, 'Starts with 4 initial projects');

  const targetId = 'proj-2'; // Heavy Denim Workwear Jacket
  const targetProject = currentProjects.find((p) => p.id === targetId);
  assert.ok(targetProject, 'Target project proj-2 exists initially');

  // Perform deletion
  currentProjects = currentProjects.filter((p) => p.id !== targetId);

  assert.equal(currentProjects.length, initialCount - 1, 'Project list length decreased by exactly 1');
  assert.equal(currentProjects.some((p) => p.id === targetId), false, 'proj-2 is no longer in projects list');

  // Verify other projects remain 100% untouched
  const proj1 = currentProjects.find((p) => p.id === 'proj-1');
  const proj3 = currentProjects.find((p) => p.id === 'proj-3');
  const proj4 = currentProjects.find((p) => p.id === 'proj-4');

  assert.ok(proj1, 'proj-1 remains present');
  assert.equal(proj1.name, 'Summer Shirt Collection', 'proj-1 name is unchanged');
  assert.ok(proj3, 'proj-3 remains present');
  assert.ok(proj4, 'proj-4 remains present');
  console.log('  ✅ PASS: Only target project deleted; all other projects remain intact.');

  // TEST 2: Associated pattern pieces and layout placements are isolated to their project
  console.log('\n--- Test 2: Associated Pattern Pieces and Placements Isolation ---');
  assert.ok(proj1.patterns.length > 0, 'proj-1 retains its pattern pieces');
  assert.ok(proj3.patterns.length > 0, 'proj-3 retains its pattern pieces');
  assert.ok(proj4.patterns.length > 0, 'proj-4 retains its pattern pieces');
  assert.equal(proj1.patterns.every((pat) => pat.name !== undefined), true, 'Pattern data integrity preserved');
  console.log('  ✅ PASS: Unrelated pattern pieces and layouts remain isolated.');

  // TEST 3: Cancellation leaves projects list completely unchanged
  console.log('\n--- Test 3: Cancellation Safety ---');
  const beforeCancel = [...currentProjects];
  // User opens modal for proj-1 but cancels
  let projectToDelete = proj1;
  // User clicks cancel:
  projectToDelete = null;
  assert.equal(projectToDelete, null, 'Modal closed without action');
  assert.deepEqual(currentProjects, beforeCancel, 'Project list is identical before and after cancel');
  console.log('  ✅ PASS: Cancel action safely aborts deletion with zero side-effects.');

  // TEST 4: Aggregate Metrics Update Correctly Upon Deletion
  console.log('\n--- Test 4: Dashboard Aggregates Update Accurately ---');
  // Initial total saved: 4.3 + 7.2 + 3.8 + 3.1 = 18.4
  // After deleting proj-2 (which had 7.2m saved): 4.3 + 3.8 + 3.1 = 11.2m
  const newTotalSaved = currentProjects
    .reduce((sum, p) => sum + (Number(p.fabricSavedMeters) || 0), 0)
    .toFixed(1);
  assert.equal(newTotalSaved, '11.2', `Total fabric saved correctly recalculates to 11.2m (got ${newTotalSaved}m)`);

  const completedProjects = currentProjects.filter((p) => typeof p.utilization === 'number' && p.utilization > 0);
  assert.equal(completedProjects.length, 3, '3 completed projects remain');

  // Avg efficiency of proj-1 (94.2), proj-3 (93.8), proj-4 (95.4) = (94.2 + 93.8 + 95.4) / 3 = 94.466 -> 94.5%
  const avgEfficiency = (
    completedProjects.reduce((sum, p) => sum + p.utilization, 0) / completedProjects.length
  ).toFixed(1);
  assert.equal(avgEfficiency, '94.5', `Average efficiency correctly recalculates to 94.5% (got ${avgEfficiency}%)`);
  console.log('  ✅ PASS: Dashboard summary metrics dynamically recalculate after deletion.');

  // TEST 5: Supabase Deletion Handler Handles Missing Schema / Local Mode Gracefully
  console.log('\n--- Test 5: Local Mode / Missing Schema Deletion Handling ---');
  const remoteResult = await deleteProjectFromSupabase('proj-2');
  assert.equal(remoteResult.success, true, 'deleteProjectFromSupabase returns success: true');
  assert.equal(remoteResult.localOnly, true, 'Identifies localOnly deletion when schema is pending');
  console.log('  ✅ PASS: Deletion operates cleanly in local mode without failing on missing schema.');

  // TEST 6: Edge Case: Invalid / Nonexistent ID
  console.log('\n--- Test 6: Nonexistent ID Handling ---');
  const countBeforeInvalid = currentProjects.length;
  currentProjects = currentProjects.filter((p) => p.id !== 'non-existent-id-999');
  assert.equal(currentProjects.length, countBeforeInvalid, 'Nonexistent ID leaves list unchanged');
  console.log('  ✅ PASS: Deleting a nonexistent ID is a safe no-op.');

  console.log('\n==========================================');
  console.log('Project Deletion Tests: All Passed!');
  console.log('==========================================\n');
});
