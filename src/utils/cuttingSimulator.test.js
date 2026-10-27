import { 
  CuttingSimulator, 
  buildCuttingSequence, 
  getPieceContourPoints, 
  createPieceCuttingProfile 
} from './cuttingSimulator.js';

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

async function runTests() {
  console.log('🧪 Starting Cutting Simulator & State Controller Verification Tests...\n');

  // ==========================================
  // TEST CASE 1: Initial Ready to Cut State
  // ==========================================
  console.log('--- Test Case 1: Initial Ready to Cut State ---');
  const placementsMock = [
    { id: 'p1', name: 'Front Bodice', category: 'FRONT', x: 10, y: 15, width: 40, height: 50, rotation: 0, shapeType: 'front-bodice' },
    { id: 'p2', name: 'Sleeve', category: 'SLEEVE', x: 60, y: 15, width: 30, height: 45, rotation: 90, shapeType: 'sleeve' }
  ];

  const simulator = new CuttingSimulator({ duration: 5000, placements: placementsMock });
  const initialState = simulator.getState();

  assert(initialState.status === 'ready', `Initial status is 'ready' (got '${initialState.status}')`);
  assert(initialState.progress === 0, `Initial progress is exactly 0 (got ${initialState.progress})`);
  assert(initialState.progressPercent === 0, `Initial progress percentage is 0% (got ${initialState.progressPercent}%)`);
  assert(initialState.isReady === true, 'isReady boolean flag is true');
  assert(initialState.isCutting === false, 'isCutting boolean flag is false');
  assert(initialState.isPaused === false, 'isPaused boolean flag is false');
  assert(initialState.isCompleted === false, 'isCompleted boolean flag is false');
  assert(initialState.totalPieces === 2, `Total pieces tracked is 2 (got ${initialState.totalPieces})`);
  assert(initialState.completedPieceIds.length === 0, 'No pieces completed in initial state');

  // ==========================================
  // TEST CASE 2: Deterministic Cutting Sequence Generation
  // ==========================================
  console.log('\n--- Test Case 2: Deterministic Cutting Sequence Generation ---');
  const unorderedPlacements = [
    { id: 'c', x: 100, y: 10 },
    { id: 'a', x: 20, y: 50 },
    { id: 'b', x: 20, y: 10 },
    { id: 'd', x: 100, y: 80 }
  ];

  const sequence = buildCuttingSequence(unorderedPlacements);
  assert(sequence[0].id === 'b', `First piece is 'b' at (20, 10) (got '${sequence[0].id}')`);
  assert(sequence[1].id === 'a', `Second piece is 'a' at (20, 50) (got '${sequence[1].id}')`);
  assert(sequence[2].id === 'c', `Third piece is 'c' at (100, 10) (got '${sequence[2].id}')`);
  assert(sequence[3].id === 'd', `Fourth piece is 'd' at (100, 80) (got '${sequence[3].id}')`);
  assert(unorderedPlacements[0].id === 'c', 'Original input placements array was not mutated');

  // ==========================================
  // TEST CASE 3: Rectangular & Standard Shape Contour Points & Path Tracing
  // ==========================================
  console.log('\n--- Test Case 3: Rectangular & Standard Shape Contour Points ---');
  const rectPlacement = { id: 'rect1', width: 40, height: 60, shapeType: 'rectangle' };
  const rectPoints = getPieceContourPoints(rectPlacement, 1);
  assert(rectPoints.length >= 4, `Rectangle contour generated vertices (got ${rectPoints.length})`);
  
  const rectProfile = createPieceCuttingProfile(rectPlacement, 1);
  assert(rectProfile.totalLength > 0, `Total perimeter calculated: ${rectProfile.totalLength}`);
  
  const cutMid = rectProfile.getCutStateAt(0.5);
  assert(cutMid.isCompleted === false, 'Cut at 50% is not completed');
  assert(cutMid.tracedPath.startsWith('M 0,0 L 40,0'), `Traced path correctly starts from origin (got '${cutMid.tracedPath}')`);
  assert(cutMid.currentPoint.x === 40 && cutMid.currentPoint.y === 60, `Cut point at 50% perimeter is at corner (40, 60) (got ${cutMid.currentPoint.x}, ${cutMid.currentPoint.y})`);

  const cutFull = rectProfile.getCutStateAt(1.0);
  assert(cutFull.isCompleted === true, 'Cut at 100% is completed');

  // ==========================================
  // TEST CASE 4: Irregular Polygon Contour Path Following
  // ==========================================
  console.log('\n--- Test Case 4: Irregular Polygon Contour Path Following ---');
  const irregularPlacement = {
    id: 'irreg1',
    width: 50,
    height: 40,
    outline: [
      { x: 0, y: 0.2 },
      { x: 0.5, y: 0 },
      { x: 1.0, y: 0.3 },
      { x: 0.8, y: 1.0 },
      { x: 0.2, y: 1.0 }
    ]
  };

  const irregPoints = getPieceContourPoints(irregularPlacement, 1);
  assert(irregPoints.length === 6, `Irregular closed polygon has 6 points including closed loop (got ${irregPoints.length})`);
  assert(irregPoints[0].x === 0 && irregPoints[0].y === 8, `First point is at scaled (0, 8) (got ${irregPoints[0].x}, ${irregPoints[0].y})`);
  assert(irregPoints[1].x === 25 && irregPoints[1].y === 0, `Second point is at scaled (25, 0) (got ${irregPoints[1].x}, ${irregPoints[1].y})`);

  const irregProfile = createPieceCuttingProfile(irregularPlacement, 1);
  const irregCut = irregProfile.getCutStateAt(0.3);
  assert(irregCut.tracedPath.length > 0, 'Irregular partial cut path string generated');
  assert(irregCut.currentPoint.x >= 0 && irregCut.currentPoint.y >= 0, `Irregular cutting head point: (${irregCut.currentPoint.x}, ${irregCut.currentPoint.y})`);

  // ==========================================
  // TEST CASE 5: Starting Simulation & Piece-by-Piece Progression
  // ==========================================
  console.log('\n--- Test Case 5: Starting Simulation & Piece-by-Piece Progression ---');
  const multiPieceSim = new CuttingSimulator({
    duration: 4000,
    placements: [
      { id: 'pieceA', name: 'Front', width: 40, height: 40, x: 0, y: 0 },
      { id: 'pieceB', name: 'Back', width: 40, height: 40, x: 50, y: 0 }
    ]
  });

  const started = multiPieceSim.start();
  assert(started.status === 'cutting', `Status transitioned to 'cutting' (got '${started.status}')`);
  assert(started.isCutting === true, 'isCutting is true');

  // Step to 25% (Piece A is being cut)
  multiPieceSim.step(1000);
  const state25 = multiPieceSim.getState();
  assert(state25.progress === 0.25, `Overall progress is 0.25 (got ${state25.progress})`);
  assert(state25.currentPieceIndex === 0, `Active piece index is 0 (got ${state25.currentPieceIndex})`);
  assert(state25.activePieceId === 'pieceA', `Active piece ID is 'pieceA' (got '${state25.activePieceId}')`);
  assert(state25.completedPieceIds.length === 0, 'No completed pieces yet at 25%');
  assert(state25.activeCutPoint !== null, 'Active cut head point is computed');

  // Step to 60% (Piece A is completed, Piece B is being cut)
  multiPieceSim.step(2400);
  const state60 = multiPieceSim.getState();
  assert(state60.currentPieceIndex === 1, `Active piece index transitioned to 1 (got ${state60.currentPieceIndex})`);
  assert(state60.activePieceId === 'pieceB', `Active piece ID is 'pieceB' (got '${state60.activePieceId}')`);
  assert(state60.completedPieceIds.includes('pieceA'), `Piece A is in completedPieceIds (got ${JSON.stringify(state60.completedPieceIds)})`);
  assert(!state60.completedPieceIds.includes('pieceB'), 'Piece B is not yet completed');

  // Step to 100% (All pieces completed)
  let completeCalled = false;
  multiPieceSim.onComplete = () => { completeCalled = true; };
  multiPieceSim.step(4000);
  const state100 = multiPieceSim.getState();
  assert(state100.status === 'completed', `Status is 'completed' (got '${state100.status}')`);
  assert(state100.isCompleted === true, 'isCompleted flag is true');
  assert(state100.completedPieceIds.length === 2, `All 2 pieces marked as completed (got ${state100.completedPieceIds.length})`);
  assert(completeCalled === true, 'onComplete callback executed successfully');

  // ==========================================
  // TEST CASE 6: Pause and Resume Support
  // ==========================================
  console.log('\n--- Test Case 6: Pause and Resume Support ---');
  const pauseSim = new CuttingSimulator({
    duration: 5000,
    placements: [
      { id: 'p1', width: 50, height: 50, x: 0, y: 0 },
      { id: 'p2', width: 50, height: 50, x: 60, y: 0 }
    ]
  });

  pauseSim.start();
  pauseSim.step(2500); // 50%
  assert(pauseSim.progress === 0.5, 'Stepped to 50%');

  // Pause
  const pausedState = pauseSim.pause();
  assert(pausedState.status === 'paused', `Status is 'paused' (got '${pausedState.status}')`);
  assert(pausedState.isPaused === true, 'isPaused flag is true');
  assert(pausedState.isCutting === false, 'isCutting flag is false');
  assert(pausedState.progress === 0.5, `Progress retained at exact 0.5 on pause (got ${pausedState.progress})`);

  // Resume
  const resumedState = pauseSim.resume();
  assert(resumedState.status === 'cutting', `Status resumed to 'cutting' (got '${resumedState.status}')`);
  assert(resumedState.isCutting === true, 'isCutting is true after resume');
  assert(resumedState.progress === 0.5, `Progress preserved on resume (got ${resumedState.progress})`);

  // Finish
  pauseSim.step(5000);
  assert(pauseSim.status === 'completed', 'Completed after resumed run');

  // ==========================================
  // TEST CASE 7: Stop and Reset to Ready to Cut
  // ==========================================
  console.log('\n--- Test Case 7: Stop and Reset to Ready to Cut ---');
  const resetSim = new CuttingSimulator({
    duration: 3000,
    placements: [{ id: 'p1', width: 40, height: 40, x: 0, y: 0 }]
  });

  resetSim.start();
  resetSim.step(1500);
  assert(resetSim.progress === 0.5, 'Simulation was halfway');

  const stopped = resetSim.stop();
  assert(stopped.status === 'ready', `Status reset to 'ready' (got '${stopped.status}')`);
  assert(stopped.progress === 0, `Progress reset to exactly 0 (got ${stopped.progress})`);
  assert(stopped.isReady === true, 'isReady is true');
  assert(stopped.completedPieceIds.length === 0, 'Completed pieces cleared on stop');
  assert(resetSim._isRunning === false, 'Running flag is false');

  // ==========================================
  // TEST CASE 8: Repeated Click Protection & Concurrency Safety
  // ==========================================
  console.log('\n--- Test Case 8: Repeated Click Protection ---');
  const freshSim = new CuttingSimulator({ duration: 5000 });
  freshSim.start();
  for (let i = 0; i < 5; i++) {
    freshSim.start();
  }
  assert(freshSim.status === 'cutting', 'Status remains cleanly in cutting state');
  assert(freshSim._isRunning === true, 'Running flag is cleanly maintained');
  freshSim.destroy();
  assert(freshSim._isRunning === false, 'Destroy stops simulation cleanly');

  // ==========================================
  // TEST CASE 9: Layout Geometry & Metrics Invariance
  // ==========================================
  console.log('\n--- Test Case 9: Layout Geometry & Metrics Invariance ---');
  const demoProject = {
    id: 'proj-demo-1',
    name: 'Summer Shirt',
    fabricLength: 500,
    fabricWidth: 150,
    utilization: 94.2,
    wastePercentage: 5.8,
    fabricSavedMeters: 4.3,
    layoutPlacements: [
      { id: 'front-1', name: 'Front Bodice', x: 0, y: 0, width: 75, height: 100, rotation: 0 },
      { id: 'back-1', name: 'Back Bodice', x: 75, y: 0, width: 75, height: 100, rotation: 0 },
      { id: 'sleeve-1', name: 'Sleeve', x: 150, y: 0, width: 45, height: 60, rotation: 90, outline: [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}] }
    ]
  };

  const snapshotBefore = JSON.stringify(demoProject);

  const testSim = new CuttingSimulator({
    duration: 2000,
    placements: demoProject.layoutPlacements
  });

  testSim.start();
  testSim.step(500);
  testSim.pause();
  testSim.resume();
  testSim.step(1500);
  testSim.step(2000);
  testSim.destroy();

  const snapshotAfter = JSON.stringify(demoProject);
  assert(snapshotBefore === snapshotAfter, 'Project geometry, placements, utilization, and waste remain 100% immutable throughout entire simulation cycle');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log(`\n==========================================`);
  console.log(`Cutting Simulator Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
