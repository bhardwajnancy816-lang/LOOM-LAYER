/**
 * AI Fabric Cutter — Pattern Overlap & Nesting Collision Engine Tests
 *
 * Requirements:
 * 1. Two overlapping rectangles
 * 2. Overlapping irregular polygons
 * 3. One polygon fully contained inside another
 * 4. Valid non-overlapping pieces
 * 5. Rotated pieces and transformed coordinates
 * 6. Small pieces placed beside large pieces (collar bands, cuffs, pockets)
 * 7. Cutting-clearance violations (< minSpacing)
 * 8. Fabric-boundary violations (usable length and width)
 * 9. Multiple quantities and irregular contours
 * 10. Consistency between optimizer geometry and rendered geometry
 */

import {
  checkOverlap,
  checkPieceCollision,
  canPlacePiece,
  validateNestingLayout,
  getValidOrientations,
  expandPatternPieces,
  optimizeFabricCutting
} from './fabricOptimizer.js';
import {
  checkPolygonCollision,
  isPointInPolygon,
  transformNormalizedToWorldPolygon,
  polygonToSvgPath
} from './polygonGeometry.js';

function runNestingCollisionTests() {
  console.log('🧪 Starting Pattern Overlap & Nesting Collision Invariant Tests...\n');
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
  // TEST 1: Two Overlapping Rectangles
  // ==========================================
  console.log('--- Test 1: Two Overlapping Rectangles ---');
  const rectA = { id: 'r1', name: 'Rect A', x: 10, y: 10, width: 30, height: 40 };
  const rectB_overlapping = { id: 'r2', name: 'Rect B', x: 25, y: 25, width: 30, height: 40 };
  const rectC_separate = { id: 'r3', name: 'Rect C', x: 45, y: 10, width: 30, height: 40 };

  assert(checkOverlap(rectA, rectB_overlapping, 0) === true, 'AABB detects overlapping rectangles');
  assert(checkPieceCollision(rectA, rectB_overlapping, 0) === true, 'checkPieceCollision rejects overlapping rectangles');
  assert(checkOverlap(rectA, rectC_separate, 0) === false, 'AABB accepts non-overlapping adjacent rectangles');
  assert(checkPieceCollision(rectA, rectC_separate, 0) === false, 'checkPieceCollision accepts non-overlapping rectangles');

  // ==========================================
  // TEST 2: Overlapping Irregular Polygons
  // ==========================================
  console.log('\n--- Test 2: Overlapping Irregular Polygons ---');
  // Triangle 1
  const polyA = [
    { x: 10, y: 10 },
    { x: 50, y: 10 },
    { x: 30, y: 50 }
  ];
  // Inverted triangle overlapping Poly A
  const polyB_intersecting = [
    { x: 30, y: 0 },
    { x: 50, y: 40 },
    { x: 10, y: 40 }
  ];
  // Triangle outside Poly A
  const polyC_clear = [
    { x: 60, y: 10 },
    { x: 90, y: 10 },
    { x: 75, y: 50 }
  ];

  assert(checkPolygonCollision(polyA, polyB_intersecting, 0) === true, 'Detects crossing edge collision between irregular polygons');
  assert(checkPolygonCollision(polyA, polyC_clear, 0) === false, 'Accepts separated irregular polygons');

  // ==========================================
  // TEST 3: One Polygon Fully Contained Inside Another
  // ==========================================
  console.log('\n--- Test 3: One Polygon Fully Contained Inside Another ---');
  const outerPolygon = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 }
  ];
  const innerPolygon = [
    { x: 20, y: 20 },
    { x: 40, y: 20 },
    { x: 40, y: 40 },
    { x: 20, y: 40 }
  ];

  assert(isPointInPolygon({ x: 30, y: 30 }, outerPolygon) === true, 'Inner point is contained in outer polygon');
  assert(checkPolygonCollision(outerPolygon, innerPolygon, 0) === true, 'Detects containment: inner polygon inside outer polygon');
  assert(checkPolygonCollision(innerPolygon, outerPolygon, 0) === true, 'Detects containment bidirectionally (outer around inner)');

  // ==========================================
  // TEST 4: Valid Non-Overlapping Pieces
  // ==========================================
  console.log('\n--- Test 4: Valid Non-Overlapping Pieces ---');
  const validPlacements = [
    { id: 'p1', name: 'Piece 1', x: 0, y: 0, width: 40, height: 60 },
    { id: 'p2', name: 'Piece 2', x: 41, y: 0, width: 40, height: 60 },
    { id: 'p3', name: 'Piece 3', x: 0, y: 61, width: 40, height: 60 },
    { id: 'p4', name: 'Piece 4', x: 41, y: 61, width: 40, height: 60 }
  ];

  const validReport = validateNestingLayout(validPlacements, 200, 150, 0.5);
  assert(validReport.isValid === true, 'validateNestingLayout accepts valid non-overlapping grid');
  assert(validReport.overlapPairs.length === 0, 'Zero overlap pairs detected');
  assert(validReport.boundaryViolations.length === 0, 'Zero boundary violations detected');

  // ==========================================
  // TEST 5: Rotated Pieces and Transformed Coordinates
  // ==========================================
  console.log('\n--- Test 5: Rotated Pieces and Transformed Coordinates ---');
  // Rectangular pattern: width 15, height 22
  const pieceToRotate = {
    width: 15,
    height: 22,
    allowRotation: true,
    grainConstraint: 'Flexible',
    globalRespectGrain: false
  };

  const orientations = getValidOrientations(pieceToRotate);
  const rot0 = orientations.find((o) => o.rotation === 0);
  const rot90 = orientations.find((o) => o.rotation === 90);
  const rot180 = orientations.find((o) => o.rotation === 180);
  const rot270 = orientations.find((o) => o.rotation === 270);

  assert(rot0 && rot0.width === 15 && rot0.height === 22, 'Rotation 0° preserves width 15, height 22');
  assert(rot90 && rot90.width === 22 && rot90.height === 15, 'Rotation 90° swaps to width 22, height 15');
  assert(rot180 && rot180.width === 15 && rot180.height === 22, 'Rotation 180° has width 15, height 22');
  assert(rot270 && rot270.width === 22 && rot270.height === 15, 'Rotation 270° swaps to width 22, height 15');

  // Verify relative points bounds for 90° irregular polygon
  const lShapeTest = [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0.5, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];
  const irregularPiece = {
    width: 15,
    height: 22,
    allowRotation: true,
    grainConstraint: 'Flexible',
    globalRespectGrain: false,
    outline: lShapeTest
  };
  const irrOrients = getValidOrientations(irregularPiece);
  const irr90 = irrOrients.find((o) => o.rotation === 90);
  assert(Array.isArray(irr90.relativePoints) && irr90.relativePoints.length === 6, '90° irregular orientation provides relativePoints');
  const maxX90 = Math.max(...irr90.relativePoints.map((p) => p.x));
  const maxY90 = Math.max(...irr90.relativePoints.map((p) => p.y));
  assert(Math.abs(maxX90 - irr90.width) < 1e-4, 'Relative points max X equals rotated width');
  assert(Math.abs(maxY90 - irr90.height) < 1e-4, 'Relative points max Y equals rotated height');

  // Test placing rot90 piece next to a piece at x=0
  const placed1 = { id: 'pl1', x: 0, y: 0, width: 22, height: 15, rotation: 90 };
  const placed2 = { id: 'pl2', x: 22.5, y: 0, width: 22, height: 15, rotation: 90 };
  assert(checkPieceCollision(placed1, placed2, 0.5) === false, 'Adjacent 90° rotated pieces with 0.5cm clearance do not collide');

  // ==========================================
  // TEST 6: Small Pieces Placed Beside Large Pieces
  // ==========================================
  console.log('\n--- Test 6: Small Pieces Beside Large Pieces ---');
  // Large Bodice (40x60), Sleeves (25x52), Collar Band (15x22 rot 90 = 22x15), Cuff (12x24 rot 90 = 24x12)
  const bodicePiece = {
    id: 'large-bodice',
    name: 'Front Bodice',
    x: 0,
    y: 0,
    width: 40,
    height: 60,
    rotation: 0
  };
  // Collar placed below Bodice with exactly 0.5cm spacing
  const collarPieceValid = {
    id: 'small-collar',
    name: 'Collar Band',
    x: 0,
    y: 60.5,
    width: 22,
    height: 15,
    rotation: 90
  };
  // Collar overlapping bottom of Bodice by 2cm
  const collarPieceOverlapping = {
    id: 'small-collar-bad',
    name: 'Collar Band Bad',
    x: 0,
    y: 58.0,
    width: 22,
    height: 15,
    rotation: 90
  };

  assert(checkPieceCollision(bodicePiece, collarPieceValid, 0.5) === false, 'Small collar band placed with 0.5cm clearance is valid');
  assert(checkPieceCollision(bodicePiece, collarPieceOverlapping, 0.5) === true, 'Detects small collar band protruding into large bodice');

  // ==========================================
  // TEST 7: Cutting-Clearance Violations
  // ==========================================
  console.log('\n--- Test 7: Cutting-Clearance Violations ---');
  const pieceL = { id: 'cl1', name: 'Piece Left', x: 0, y: 0, width: 30, height: 30 };
  const pieceClose = { id: 'cl2', name: 'Piece Close', x: 30.2, y: 0, width: 30, height: 30 };
  const pieceCleared = { id: 'cl3', name: 'Piece Cleared', x: 30.6, y: 0, width: 30, height: 30 };

  // Spacing required = 0.5 cm. Distance between pieceL and pieceClose is 0.2 cm (< 0.5 cm)
  assert(checkOverlap(pieceL, pieceClose, 0.5) === true, 'Clearance check detects 0.2cm gap is < 0.5cm required spacing');
  assert(checkPieceCollision(pieceL, pieceClose, 0.5) === true, 'checkPieceCollision flags clearance violation');
  // Distance between pieceL and pieceCleared is 0.6 cm (> 0.5 cm)
  assert(checkOverlap(pieceL, pieceCleared, 0.5) === false, 'Clearance check accepts 0.6cm gap >= 0.5cm');
  assert(checkPieceCollision(pieceL, pieceCleared, 0.5) === false, 'checkPieceCollision accepts compliant spacing');

  // ==========================================
  // TEST 8: Fabric-Boundary Violations
  // ==========================================
  console.log('\n--- Test 8: Fabric-Boundary Violations ---');
  const boundaryFabricL = 200;
  const boundaryFabricW = 100;

  const validInBounds = [
    { id: 'b1', name: 'Inside', x: 10, y: 10, width: 50, height: 50 }
  ];
  const outOfLength = [
    { id: 'b2', name: 'Exceeds Length', x: 170, y: 10, width: 40, height: 40 } // 170 + 40 = 210 > 200
  ];
  const outOfWidth = [
    { id: 'b3', name: 'Exceeds Width', x: 10, y: 70, width: 40, height: 40 } // 70 + 40 = 110 > 100
  ];
  const negativeCoord = [
    { id: 'b4', name: 'Negative X', x: -5, y: 10, width: 40, height: 40 }
  ];

  assert(validateNestingLayout(validInBounds, boundaryFabricL, boundaryFabricW, 0.5).isValid === true, 'Accepts piece within fabric boundaries');
  const lenReport = validateNestingLayout(outOfLength, boundaryFabricL, boundaryFabricW, 0.5);
  assert(lenReport.isValid === false && lenReport.boundaryViolations.length > 0, 'Rejects piece exceeding fabric usable length');
  const widthReport = validateNestingLayout(outOfWidth, boundaryFabricL, boundaryFabricW, 0.5);
  assert(widthReport.isValid === false && widthReport.boundaryViolations.length > 0, 'Rejects piece exceeding fabric usable width');
  const negReport = validateNestingLayout(negativeCoord, boundaryFabricL, boundaryFabricW, 0.5);
  assert(negReport.isValid === false && negReport.boundaryViolations.length > 0, 'Rejects piece with negative coordinates');

  // ==========================================
  // TEST 9: Multiple Quantities and Irregular Contours
  // ==========================================
  console.log('\n--- Test 9: Multiple Quantities and Irregular Contours ---');
  // L-shaped polygon contour in [0, 1]
  const lShapeOutline = [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0.5, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ];

  const patternsWithQty = [
    {
      id: 'l-pattern',
      name: 'L-Bracket Pattern',
      width: 30,
      height: 30,
      quantity: 4,
      rotationAllowed: true,
      grainConstraint: 'Flexible',
      outline: lShapeOutline
    }
  ];

  const expanded = expandPatternPieces(patternsWithQty, true, false);
  assert(expanded.length === 4, 'Expands quantity: 4 into exactly 4 distinct item pieces');
  assert(expanded[0].id !== expanded[1].id, 'Each piece has a distinct unique ID');
  assert(expanded.every((p) => p.isIrregular === true), 'All 4 pieces retain irregular contour');

  const nestResult = optimizeFabricCutting({
    fabricWidth: 100,
    fabricLength: 200,
    patterns: patternsWithQty,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: false
  });

  assert(nestResult.success === true, 'Successfully optimizes 4 irregular pattern pieces');
  assert(nestResult.placedCount === 4, 'All 4 irregular pieces are placed');
  assert(nestResult.isLayoutValid === true, 'Optimized irregular layout passes independent validator with zero overlaps');

  // Verify all 4 placements have pairwise zero collision
  const layoutCheck = validateNestingLayout(nestResult.layoutPlacements, 200, 100, 0.5);
  assert(layoutCheck.isValid === true, 'Independent validation confirms zero overlap across all 4 placed irregular instances');

  // ==========================================
  // TEST 10: Consistency Between Optimizer Geometry and Rendered Geometry
  // ==========================================
  console.log('\n--- Test 10: Optimizer Geometry vs Rendered Geometry Consistency ---');
  // Test irregular piece rotation and verify worldPoints match relativePoints translated
  const origW = 20;
  const origH = 30;
  const testRotAngle = 90;
  const testX = 15.5;
  const testY = 22.0;

  const transformed = transformNormalizedToWorldPolygon(lShapeOutline, origW, origH, testRotAngle, testX, testY);

  // Optimizer world points
  const worldPoints = transformed.worldPoints;
  const relativePoints = transformed.relativePoints;

  assert(worldPoints.length === relativePoints.length, 'worldPoints length matches relativePoints length');

  // Verify each worldPoint = relativePoint + (testX, testY)
  let coordinatesMatch = true;
  for (let i = 0; i < worldPoints.length; i++) {
    const expectedX = Number((relativePoints[i].x + testX).toFixed(3));
    const expectedY = Number((relativePoints[i].y + testY).toFixed(3));
    if (Math.abs(worldPoints[i].x - expectedX) > 1e-4 || Math.abs(worldPoints[i].y - expectedY) > 1e-4) {
      coordinatesMatch = false;
      break;
    }
  }
  assert(coordinatesMatch === true, 'worldPoints identically match relativePoints translated by (x, y)');

  // Verify rendered SVG path coordinates
  const svgPath = polygonToSvgPath(relativePoints, 1, 1);
  assert(typeof svgPath === 'string' && svgPath.startsWith('M ') && svgPath.endsWith(' Z'), 'Rendered SVG path is closed and valid');

  // Summary
  console.log(`\n==========================================`);
  console.log(`Nesting Collision Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    throw new Error(`${failedCount} collision invariant tests failed.`);
  }
}

runNestingCollisionTests();
