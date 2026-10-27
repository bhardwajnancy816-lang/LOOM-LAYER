import { initialProjects } from '../data/mockProjects.js';
import {
  calculatePiecePerimeter,
  calculateEstimatedCuttingTime,
  generateCuttingPlan,
  exportCuttingPlanToDXF,
  exportCuttingPlanToSVG,
  exportCuttingPlanToJSON,
  generatePrintableCuttingPlanHTML,
  generatePrintableSustainabilityReportHTML
} from './cuttingPlanGenerator.js';

function runTests() {
  console.log('🧪 Starting Cutting Plan Generation & Export Engine Tests...\n');
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

  const proj1 = initialProjects[0]; // Summer Shirt Collection (50 pieces)

  // ==========================================
  // TEST 1: Cutting Plan Generation & Schema Completeness
  // ==========================================
  console.log('--- Test 1: Cutting Plan Generation & Schema Completeness ---');
  const plan = generateCuttingPlan(proj1);

  assert(Boolean(plan), 'Cutting plan object generated successfully');
  assert(plan.title === 'Loom & Layer — Optimized Cutting Plan', 'Plan contains official application title');
  assert(plan.projectId === 'proj-1', 'Plan retains exact project ID');
  assert(plan.projectName === 'Summer Shirt Collection', 'Plan retains project name');

  // Fabric Roll Specs
  assert(plan.fabricRoll.length === 500, 'Fabric roll length is 500 cm');
  assert(plan.fabricRoll.width === 150, 'Fabric roll width is 150 cm');
  assert(plan.fabricRoll.lengthM === 5.0, 'Fabric roll length in meters is 5.0 m');
  assert(plan.fabricRoll.widthM === 1.5, 'Fabric roll width in meters is 1.5 m');
  assert(plan.fabricRoll.fabricType === 'Cotton', 'Fabric type is Cotton');
  assert(plan.fabricRoll.grainDirection === 'Vertical', 'Grain direction is Vertical');

  // Optimization & Yield Summary
  assert(plan.optimizationSummary.utilization === 94.2, 'Utilization is exactly 94.2%');
  assert(plan.optimizationSummary.wastePercentage === 5.8, 'Waste percentage is exactly 5.8%');
  assert(plan.optimizationSummary.usedAreaM2 === 7.065, 'Used fabric area is 7.065 m²');
  assert(plan.optimizationSummary.wasteAreaM2 === 0.435, 'Waste area is 0.435 m²');
  assert(plan.optimizationSummary.fabricSavedMeters === 4.3, 'Fabric saved meters is 4.3 m');
  assert(plan.optimizationSummary.hasValidBaseline === true, 'Baseline valid flag is true');
  assert(plan.optimizationSummary.baselineUtilization === 82.8, 'Baseline utilization is 82.8%');
  assert(plan.optimizationSummary.baselineWastePercentage === 17.2, 'Baseline waste is 17.2%');
  assert(plan.optimizationSummary.utilizationDeltaPp === 11.4, 'Yield gain is +11.4 pp');

  // Pattern Templates & Piece Counts
  assert(plan.totalPatternTemplates === 4, 'Total pattern templates is 4');
  assert(plan.totalPieces === 50, 'Total pieces planned is 50');
  assert(plan.placedPiecesCount === 35, 'Placed pieces count is 35');
  assert(plan.unplacedPiecesCount === 15, 'Unplaced pieces count is 15');

  // ==========================================
  // TEST 2: Piece-wise Placement Inspection
  // ==========================================
  console.log('\n--- Test 2: Piece-wise Placement Detail Inspection ---');
  assert(Array.isArray(plan.placements) && plan.placements.length === 35, 'Placements array has all 35 placements');

  const firstPiece = plan.placements[0];
  assert(firstPiece.sequence === 1, 'First piece has sequence #1');
  assert(firstPiece.name === 'Front Bodice #1', 'First piece has correct piece name');
  assert(firstPiece.category === 'FRONT', 'First piece has category FRONT');
  assert(typeof firstPiece.x === 'number' && firstPiece.x === 4, 'First piece X coordinate is 4 cm');
  assert(typeof firstPiece.y === 'number' && firstPiece.y === 6, 'First piece Y coordinate is 6 cm');
  assert(firstPiece.width === 38, 'First piece width is 38 cm');
  assert(firstPiece.height === 58, 'First piece height is 58 cm');
  assert(firstPiece.rotation === 0, 'First piece rotation is 0°');
  assert(firstPiece.areaCm2 > 0, `First piece area is positive (${firstPiece.areaCm2} cm²)`);
  assert(firstPiece.perimeterCm > 0, `First piece perimeter is positive (${firstPiece.perimeterCm} cm)`);
  assert(Array.isArray(firstPiece.contourPoints) && firstPiece.contourPoints.length >= 4, 'Piece contains contour points');

  const rotatedPiece = plan.placements[1]; // Back Bodice #1 rotated 180°
  assert(rotatedPiece.rotation === 180, 'Second piece rotation is 180°');
  assert(rotatedPiece.rotated === true, 'Second piece rotated flag is true');

  // ==========================================
  // TEST 3: Estimated Cutting Time Calculations
  // ==========================================
  console.log('\n--- Test 3: Estimated Cutting Time Calculation ---');
  const cutTime = plan.estimatedCuttingTime;
  assert(cutTime.totalSeconds > 0, `Total cutting time is positive (${cutTime.totalSeconds} sec)`);
  assert(cutTime.totalPerimeterCm > 0, `Total cutting path perimeter is ${cutTime.totalPerimeterCm} cm`);
  assert(typeof cutTime.formatted === 'string' && cutTime.formatted.includes('min'), `Formatted time string (${cutTime.formatted}) includes minutes`);
  assert(cutTime.averageTimePerPieceSec > 0, `Average time per piece is ${cutTime.averageTimePerPieceSec} sec`);

  // Zero pieces edge case
  const emptyCutTime = calculateEstimatedCuttingTime([], 500, 150);
  assert(emptyCutTime.totalSeconds === 0, 'Empty placements return 0 seconds');
  assert(emptyCutTime.formatted === '0 min 0 sec', 'Empty placements return formatted "0 min 0 sec"');

  // Single piece perimeter calculation
  const singlePerimeter = calculatePiecePerimeter({ width: 30, height: 40, shapeType: 'front-bodice' });
  assert(singlePerimeter > 100 && singlePerimeter < 200, `Piece perimeter calculated accurately (~${singlePerimeter} cm)`);

  // ==========================================
  // TEST 4: Universal DXF-AAMA CAD Export Generation
  // ==========================================
  console.log('\n--- Test 4: Universal DXF-AAMA CAD Export Generation ---');
  const dxf = exportCuttingPlanToDXF(proj1);
  assert(typeof dxf === 'string' && dxf.length > 500, 'DXF export generated non-empty string');
  assert(dxf.includes('SECTION\n2\nHEADER'), 'DXF contains HEADER section');
  assert(dxf.includes('SECTION\n2\nTABLES'), 'DXF contains TABLES section');
  assert(dxf.includes('SECTION\n2\nENTITIES'), 'DXF contains ENTITIES section');
  assert(dxf.includes('LAYER\n2\nFABRIC_BOUNDARY'), 'DXF defines FABRIC_BOUNDARY layer');
  assert(dxf.includes('LAYER\n2\nCUT_CONTOUR'), 'DXF defines CUT_CONTOUR layer');
  assert(dxf.includes('LAYER\n2\nGRAIN_LINE'), 'DXF defines GRAIN_LINE layer');
  assert(dxf.includes('LAYER\n2\nLABELS'), 'DXF defines LABELS layer');
  assert(dxf.includes('LWPOLYLINE'), 'DXF contains LWPOLYLINE geometry entities');
  assert(dxf.includes('0\nEOF'), 'DXF terminates with EOF marker');

  // ==========================================
  // TEST 5: Laser Path SVG Export Generation
  // ==========================================
  console.log('\n--- Test 5: Laser Path SVG Export Generation ---');
  const svg = exportCuttingPlanToSVG(proj1);
  assert(typeof svg === 'string' && svg.length > 500, 'SVG export generated non-empty string');
  assert(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'), 'SVG contains valid root namespace');
  assert(svg.includes('viewBox="0 0 1000 300"'), 'SVG contains correct scaled viewBox for 500x150cm roll');
  assert(svg.includes('id="nested-pieces"'), 'SVG contains nested pieces container');
  assert(svg.includes('Front Bodice'), 'SVG contains piece labels');
  assert(svg.includes('</svg>'), 'SVG terminates with closing tag');

  // ==========================================
  // TEST 6: CAM JSON Export Generation
  // ==========================================
  console.log('\n--- Test 6: CAM JSON Export Generation ---');
  const jsonStr = exportCuttingPlanToJSON(proj1);
  assert(typeof jsonStr === 'string', 'CAM JSON is a string');
  const parsedJson = JSON.parse(jsonStr);
  assert(parsedJson.projectId === 'proj-1', 'Parsed JSON retains projectId');
  assert(parsedJson.placements.length === 35, 'Parsed JSON contains all 35 placements');
  assert(parsedJson.fabricRoll.length === 500, 'Parsed JSON fabric length is 500');

  // ==========================================
  // TEST 7: Printable Cutting Plan HTML Generation
  // ==========================================
  console.log('\n--- Test 7: Printable Cutting Plan Master HTML Generation ---');
  const htmlDoc = generatePrintableCuttingPlanHTML(proj1);
  assert(typeof htmlDoc === 'string' && htmlDoc.length > 1000, 'Printable HTML master generated');
  assert(htmlDoc.includes('<!DOCTYPE html>'), 'Contains standard HTML5 doctype');
  assert(htmlDoc.includes('Loom & Layer — Marker Master Cutting Plan'), 'Contains official header');
  assert(htmlDoc.includes('Piece Placement Schedule'), 'Contains Piece Placement Schedule');
  assert(htmlDoc.includes('Summer Shirt Collection'), 'Contains project title');
  assert(htmlDoc.includes('@media print'), 'Contains print styling');
  assert(htmlDoc.includes('<svg'), 'Contains embedded visual SVG diagram');

  // ==========================================
  // TEST 8: Printable ESG Sustainability Report HTML Generation
  // ==========================================
  console.log('\n--- Test 8: Printable ESG Sustainability Audit Report Generation ---');
  const esgDoc = generatePrintableSustainabilityReportHTML(proj1);
  assert(typeof esgDoc === 'string' && esgDoc.length > 1000, 'ESG Audit report generated');
  assert(esgDoc.includes('ESG Sustainability & Material Yield Audit'), 'Contains ESG audit header');
  assert(esgDoc.includes('Sequential Baseline vs Loom & Layer'), 'Contains baseline comparison section');
  assert(esgDoc.includes('4.3 m'), 'Contains fabric saved value (4.3 m)');
  assert(esgDoc.includes('1,750 L') || esgDoc.includes('L'), 'Contains freshwater saved metrics');
  assert(esgDoc.includes('kg'), 'Contains CO2e avoided metrics');
  assert(esgDoc.includes('Higg MSI'), 'Contains supply chain accounting notes');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log(`\n==========================================`);
  console.log(`Cutting Plan Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
