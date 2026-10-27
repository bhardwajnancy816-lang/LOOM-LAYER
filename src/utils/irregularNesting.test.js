import {
  calculatePolygonArea,
  transformNormalizedToWorldPolygon,
  getPolygonBoundingBox,
  isPointInPolygon,
  checkSegmentIntersection,
  pointToSegmentDistance,
  checkPolygonCollision,
  isPolygonWithinFabric,
  polygonToSvgPath
} from './polygonGeometry.js';
import { optimizeFabricCutting } from './fabricOptimizer.js';

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
  console.log('🧪 Starting Irregular-Shape Contour Nesting Engine Tests...\n');

  // ==========================================
  // TEST CASE 1: Shoelace Formula for Polygon Area
  // ==========================================
  console.log('--- Test Case 1: Shoelace Polygon Area Calculations ---');
  // Right-angled triangle: base 10, height 20 -> Area = 100
  const triangle = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 0, y: 20 }
  ];
  const triangleArea = calculatePolygonArea(triangle);
  assert(triangleArea === 100, `Right-angled triangle (10×20) area is exactly 100 (got ${triangleArea})`);

  // Rectangle: 40 x 50 -> Area = 2000
  const rectangle = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 40, y: 50 },
    { x: 0, y: 50 }
  ];
  const rectArea = calculatePolygonArea(rectangle);
  assert(rectArea === 2000, `Rectangle (40×50) area is exactly 2000 (got ${rectArea})`);

  // L-shape Polygon: 20x20 with 10x10 cutout -> Area = 400 - 100 = 300
  const lShape = [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 10 },
    { x: 10, y: 10 },
    { x: 10, y: 20 },
    { x: 0, y: 20 }
  ];
  const lArea = calculatePolygonArea(lShape);
  assert(lArea === 300, `L-shape polygon area is exactly 300 (got ${lArea})`);

  // Normalized irregular bodice outline [0, 1]
  const normalizedBodice = [
    { x: 0.0, y: 0.18 },
    { x: 0.18, y: 0.08 },
    { x: 0.35, y: 0.0 },
    { x: 0.75, y: 0.08 },
    { x: 0.65, y: 0.25 },
    { x: 1.0, y: 0.38 },
    { x: 0.92, y: 1.0 },
    { x: 0.0, y: 1.0 },
    { x: 0.0, y: 0.18 }
  ];
  const normArea = calculatePolygonArea(normalizedBodice);
  assert(normArea > 0.5 && normArea < 1.0, `Normalized bodice area is fractional between 0.5 and 1.0 (got ${normArea.toFixed(4)})`);

  // ==========================================
  // TEST CASE 2: Normalized Coordinate Transformation & Rotation Scaled to Manual Dimensions
  // ==========================================
  console.log('\n--- Test Case 2: Polygon Scaling to Manual Dimensions (40×60 cm) & Rotation ---');
  const manualW = 40;
  const manualH = 60;

  // Unrotated transformation (0°) at offset (10, 15)
  const unrotated = transformNormalizedToWorldPolygon(normalizedBodice, manualW, manualH, 0, 10, 15);
  assert(unrotated.worldPoints.length === normalizedBodice.length, `World points count matches outline count (${unrotated.worldPoints.length})`);
  assert(unrotated.minX === 10, `minX equals offset X (got ${unrotated.minX})`);
  assert(unrotated.minY === 15, `minY equals offset Y (got ${unrotated.minY})`);
  assert(unrotated.boundWidth === manualW, `boundWidth equals manual width (${unrotated.boundWidth} vs ${manualW})`);
  assert(unrotated.boundHeight === manualH, `boundHeight equals manual height (${unrotated.boundHeight} vs ${manualH})`);

  // Rotated 90°
  const rotated90 = transformNormalizedToWorldPolygon(normalizedBodice, manualW, manualH, 90, 0, 0);
  assert(rotated90.boundWidth === manualH, `Rotated 90° boundWidth equals manual height (${rotated90.boundWidth} vs ${manualH})`);
  assert(rotated90.boundHeight === manualW, `Rotated 90° boundHeight equals manual width (${rotated90.boundHeight} vs ${manualW})`);

  // Rotated 180°
  const rotated180 = transformNormalizedToWorldPolygon(normalizedBodice, manualW, manualH, 180, 0, 0);
  assert(rotated180.boundWidth === manualW, `Rotated 180° boundWidth equals manual width (${rotated180.boundWidth} vs ${manualW})`);
  assert(rotated180.boundHeight === manualH, `Rotated 180° boundHeight equals manual height (${rotated180.boundHeight} vs ${manualH})`);

  // ==========================================
  // TEST CASE 3: Point-in-Polygon & Segment Intersection
  // ==========================================
  console.log('\n--- Test Case 3: Geometric Intersection & Containment ---');
  const insidePt = { x: 5, y: 5 };
  const outsidePt = { x: 35, y: 35 };
  assert(isPointInPolygon(insidePt, lShape) === true, 'Point (5,5) is inside L-shape');
  assert(isPointInPolygon(outsidePt, lShape) === false, 'Point (35,35) is outside L-shape');

  // Intersecting segments
  const s1a = { x: 0, y: 0 };
  const s1b = { x: 10, y: 10 };
  const s2a = { x: 0, y: 10 };
  const s2b = { x: 10, y: 0 };
  assert(checkSegmentIntersection(s1a, s1b, s2a, s2b) === true, 'Crossing segments correctly detect intersection');

  // Parallel non-intersecting segments
  const s3a = { x: 0, y: 0 };
  const s3b = { x: 10, y: 0 };
  const s4a = { x: 0, y: 5 };
  const s4b = { x: 10, y: 5 };
  assert(checkSegmentIntersection(s3a, s3b, s4a, s4b) === false, 'Parallel separated segments do not intersect');

  // Point to segment distance and bounding box calculations
  const ptDist = pointToSegmentDistance({ x: 5, y: 4 }, s3a, s3b);
  assert(Math.abs(ptDist - 4) < 1e-4, `pointToSegmentDistance calculates accurate Euclidean distance (got ${ptDist})`);
  const bboxL = getPolygonBoundingBox(lShape);
  assert(bboxL.width === 20 && bboxL.height === 20, `getPolygonBoundingBox computes accurate AABB (got ${bboxL.width}×${bboxL.height})`);

  // ==========================================
  // TEST CASE 4: Polygon-Polygon Collision with Clearance Spacing
  // ==========================================
  console.log('\n--- Test Case 4: Polygon Collision Detection with Clearance ---');
  const polyA = [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 20 },
    { x: 0, y: 20 }
  ];

  // Overlapping with polyA
  const polyOverlap = [
    { x: 10, y: 10 },
    { x: 30, y: 10 },
    { x: 30, y: 30 },
    { x: 10, y: 30 }
  ];
  assert(checkPolygonCollision(polyA, polyOverlap, 0) === true, 'Overlapping polygons correctly detect collision');

  // Separated with 5cm gap (polyA [0..20], polyFar [25..45])
  const polyFar = [
    { x: 25, y: 0 },
    { x: 45, y: 0 },
    { x: 45, y: 20 },
    { x: 25, y: 20 }
  ];
  assert(checkPolygonCollision(polyA, polyFar, 0) === false, 'Separated polygons do not collide');
  assert(checkPolygonCollision(polyA, polyFar, 4) === false, 'Separated polygons with 5cm gap satisfy 4cm spacing clearance');
  assert(checkPolygonCollision(polyA, polyFar, 6) === true, 'Separated polygons with 5cm gap detect violation for 6cm required spacing');

  // ==========================================
  // TEST CASE 5: Fabric Boundary Containment
  // ==========================================
  console.log('\n--- Test Case 5: Fabric Boundary Containment ---');
  const insideFabric = [
    { x: 10, y: 10 },
    { x: 90, y: 10 },
    { x: 90, y: 90 },
    { x: 10, y: 90 }
  ];
  assert(isPolygonWithinFabric(insideFabric, 100, 100) === true, 'Polygon fully within 100×100 fabric is valid');

  const outOfBoundsFabric = [
    { x: -5, y: 10 },
    { x: 50, y: 10 },
    { x: 50, y: 50 },
    { x: -5, y: 50 }
  ];
  assert(isPolygonWithinFabric(outOfBoundsFabric, 100, 100) === false, 'Polygon crossing negative boundary is rejected');

  const overflowingFabric = [
    { x: 60, y: 10 },
    { x: 110, y: 10 },
    { x: 110, y: 50 },
    { x: 60, y: 50 }
  ];
  assert(isPolygonWithinFabric(overflowingFabric, 100, 100) === false, 'Polygon exceeding 100cm fabric length is rejected');

  // ==========================================
  // TEST CASE 6: Irregular Pattern Nesting (Manual 40×60 cm Dimensions)
  // ==========================================
  console.log('\n--- Test Case 6: Irregular Contour Nesting Scaled to Manual Dimensions (40×60 cm) ---');
  const irregularInput = {
    fabricWidth: 150,
    fabricLength: 120,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: false,
    patterns: [
      {
        id: 'pat-bodice',
        name: 'Front Bodice Contour',
        shapeType: 'irregular',
        width: 40,
        height: 60,
        quantity: 4,
        outline: normalizedBodice
      }
    ]
  };

  const optResult = optimizeFabricCutting(irregularInput);
  assert(optResult.success === true, 'Irregular pattern optimization executed successfully');
  assert(optResult.totalPieces === 4, 'Total pieces is 4');
  assert(optResult.placedCount === 4, `All 4 irregular pattern pieces placed (got ${optResult.placedCount})`);
  assert(optResult.unplacedCount === 0, 'Zero unplaced pieces');

  // Verify manual 40x60 dimensions are preserved
  const p0 = optResult.layoutPlacements[0];
  assert(p0.originalWidth === 40, `Original width preserved as 40 cm (got ${p0.originalWidth})`);
  assert(p0.originalHeight === 60, `Original height preserved as 60 cm (got ${p0.originalHeight})`);
  assert(p0.width === 40 || p0.width === 60, `Placement bounding width matches rotation (${p0.width})`);
  assert(p0.height === 40 || p0.height === 60, `Placement bounding height matches rotation (${p0.height})`);

  // Verify all placed pieces stay strictly inside fabric bounds
  let allInside = true;
  optResult.layoutPlacements.forEach((p) => {
    if (p.worldPoints && !isPolygonWithinFabric(p.worldPoints, 120, 150)) {
      allInside = false;
    }
  });
  assert(allInside, 'All 4 placed irregular pieces stay strictly inside 120×150 fabric boundary');

  // Verify zero collision and minimum clearance between all placed irregular polygons
  let hasOverlap = false;
  for (let i = 0; i < optResult.layoutPlacements.length; i++) {
    for (let j = i + 1; j < optResult.layoutPlacements.length; j++) {
      if (checkPolygonCollision(optResult.layoutPlacements[i].worldPoints, optResult.layoutPlacements[j].worldPoints, 0.5)) {
        hasOverlap = true;
      }
    }
  }
  assert(!hasOverlap, 'Zero collision between all placed irregular polygons with 0.5cm clearance');

  // Verify utilization is calculated from actual polygon area rather than full bounding box
  const singlePolygonArea = optResult.layoutPlacements[0].polygonArea;
  const singleBoundingArea = 40 * 60;
  assert(singlePolygonArea < singleBoundingArea, `Single irregular polygon area (${singlePolygonArea} cm²) < bounding rectangle area (${singleBoundingArea} cm²)`);
  const expectedUsedAreaM2 = Number(((singlePolygonArea * 4) / 10000).toFixed(3));
  assert(optResult.usedArea === expectedUsedAreaM2, `Total used area (${optResult.usedArea} m²) matches exact Shoelace sum (${expectedUsedAreaM2} m²)`);

  const expectedUtilization = Number(((singlePolygonArea * 4 / (150 * 120)) * 100).toFixed(1));
  assert(optResult.utilization === expectedUtilization, `Utilization (${optResult.utilization}%) derived directly from actual polygon area vs full roll area (${expectedUtilization}%)`);

  // ==========================================
  // TEST CASE 7: Contour Interlocking Around Armholes & Necklines
  // ==========================================
  console.log('\n--- Test Case 7: Contour Interlocking Around Armholes & Neckline Spaces ---');
  // Two Front Bodices (40×60 cm) placed with 180° rotation allowing mutual interlocking
  const interlockingInput = {
    fabricWidth: 100,
    fabricLength: 100,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true, // Vertical grain allows 0° and 180°
    patterns: [
      {
        id: 'pat-bodice-pair',
        name: 'Front Bodice',
        shapeType: 'irregular',
        width: 40,
        height: 60,
        quantity: 2,
        grainConstraint: 'Vertical',
        outline: normalizedBodice
      }
    ]
  };

  const interlockResult = optimizeFabricCutting(interlockingInput);
  assert(interlockResult.success === true, 'Interlocking optimization succeeded');
  assert(interlockResult.placedCount === 2, 'Both 2 bodices placed');

  // Check no collision between the two interlocked pieces
  const piece1 = interlockResult.layoutPlacements[0];
  const piece2 = interlockResult.layoutPlacements[1];
  const interlockCollision = checkPolygonCollision(piece1.worldPoints, piece2.worldPoints, 0.5);
  assert(!interlockCollision, 'Zero collision between interlocked bodice pair');

  // Both pieces stay inside fabric
  assert(isPolygonWithinFabric(piece1.worldPoints, 100, 100), 'Piece 1 stays within fabric');
  assert(isPolygonWithinFabric(piece2.worldPoints, 100, 100), 'Piece 2 stays within fabric');

  // ==========================================
  // TEST CASE 8: Mixed Irregular & Rectangular Pattern Nesting
  // ==========================================
  console.log('\n--- Test Case 8: Mixed Irregular & Manual Rectangular Pattern Nesting ---');
  const mixedInput = {
    fabricWidth: 120,
    fabricLength: 180,
    minSpacing: 1.0,
    allowRotation: true,
    respectGrain: true,
    patterns: [
      {
        id: 'pat-irregular',
        name: 'Bodice',
        shapeType: 'irregular',
        width: 40,
        height: 60,
        quantity: 2,
        outline: normalizedBodice
      },
      {
        id: 'pat-rect',
        name: 'Manual Pocket',
        shapeType: 'pocket',
        width: 30,
        height: 25,
        quantity: 2
      }
    ]
  };

  const mixedResult = optimizeFabricCutting(mixedInput);
  assert(mixedResult.success === true, 'Mixed irregular & rectangular optimization succeeded');
  assert(mixedResult.placedCount === 4, `All 4 mixed pieces placed (got ${mixedResult.placedCount})`);

  // Verify non-collision between mixed irregular and rectangular pieces
  let mixedOverlap = false;
  for (let i = 0; i < mixedResult.layoutPlacements.length; i++) {
    for (let j = i + 1; j < mixedResult.layoutPlacements.length; j++) {
      const p1 = mixedResult.layoutPlacements[i];
      const p2 = mixedResult.layoutPlacements[j];
      const poly1 = p1.worldPoints || [
        { x: p1.x, y: p1.y },
        { x: p1.x + p1.width, y: p1.y },
        { x: p1.x + p1.width, y: p1.y + p1.height },
        { x: p1.x, y: p1.y + p1.height }
      ];
      const poly2 = p2.worldPoints || [
        { x: p2.x, y: p2.y },
        { x: p2.x + p2.width, y: p2.y },
        { x: p2.x + p2.width, y: p2.y + p2.height },
        { x: p2.x, y: p2.y + p2.height }
      ];
      if (checkPolygonCollision(poly1, poly2, 1.0)) {
        mixedOverlap = true;
      }
    }
  }
  assert(!mixedOverlap, 'Zero collision between mixed irregular and rectangular pieces with 1.0cm clearance');

  // ==========================================
  // TEST CASE 9: Strict Determinism Invariant
  // ==========================================
  console.log('\n--- Test Case 9: Deterministic Irregular Nesting Across Repeated Executions ---');
  const run1 = optimizeFabricCutting(irregularInput);
  const run2 = optimizeFabricCutting(irregularInput);

  assert(run1.placedCount === run2.placedCount, 'Placed count is identical');
  assert(run1.utilization === run2.utilization, 'Utilization is identical');
  assert(run1.wastePercentage === run2.wastePercentage, 'Waste percentage is identical');
  assert(run1.actualLengthUsedM === run2.actualLengthUsedM, 'Roll length consumed is identical');
  assert(JSON.stringify(run1.layoutPlacements) === JSON.stringify(run2.layoutPlacements), 'Exact placement coordinates and rotations are 100% deterministic');

  // ==========================================
  // TEST CASE 10: SVG Path Generation
  // ==========================================
  console.log('\n--- Test Case 10: SVG Polygon Vector Path Generation ---');
  const svgPath = polygonToSvgPath(normalizedBodice, 100, 100);
  assert(svgPath.startsWith('M ') && svgPath.endsWith(' Z'), `SVG path generated properly (${svgPath.slice(0, 20)}...)`);
  assert(svgPath.includes('L '), 'SVG path contains line-to instructions for all vertices');

  // ==========================================
  // TEST CASE 11: Multi-Candidate Recognition Integration With Irregular Nesting
  // ==========================================
  console.log('\n--- Test Case 11: Multi-Candidate Recognition Integration ---');
  // Two distinct irregular shapes extracted from a multi-pattern blueprint:
  // Candidate 1: Bodice
  // Candidate 2: Curved Sleeve
  const normalizedSleeve = [
    { x: 0.15, y: 1.0 },
    { x: 0.0, y: 0.28 },
    { x: 0.2, y: 0.05 },
    { x: 0.5, y: 0.0 },
    { x: 0.8, y: 0.05 },
    { x: 1.0, y: 0.28 },
    { x: 0.85, y: 1.0 },
    { x: 0.15, y: 1.0 }
  ];

  const multiCandidateShape = {
    totalDetected: 2,
    isMultiPattern: true,
    outline: normalizedBodice,
    candidates: [
      {
        id: 'cand-bodice',
        name: 'Front Bodice',
        category: 'FRONT',
        outline: normalizedBodice,
        aspectRatio: 0.667,
        pixelWidth: 60,
        pixelHeight: 90
      },
      {
        id: 'cand-sleeve',
        name: 'Sleeve',
        category: 'SLEEVE',
        outline: normalizedSleeve,
        aspectRatio: 0.714,
        pixelWidth: 50,
        pixelHeight: 70
      }
    ]
  };

  const multiPatternInput = {
    fabricWidth: 140,
    fabricLength: 160,
    minSpacing: 0.8,
    allowRotation: true,
    respectGrain: true,
    extractedShape: multiCandidateShape,
    patterns: [
      {
        id: 'pat-front',
        name: 'Production Front Bodice',
        category: 'FRONT',
        shapeType: 'irregular',
        width: 45,
        height: 65,
        quantity: 2
      },
      {
        id: 'pat-sleeve',
        name: 'Production Sleeve',
        category: 'SLEEVE',
        shapeType: 'irregular',
        width: 35,
        height: 50,
        quantity: 2
      }
    ]
  };

  const multiOptResult = optimizeFabricCutting(multiPatternInput);
  assert(multiOptResult.success === true, 'Multi-candidate irregular optimization executed successfully');
  assert(multiOptResult.placedCount === 4, `All 4 multi-candidate irregular pieces placed (got ${multiOptResult.placedCount})`);
  
  // Verify manual dimensions are preserved on each pattern
  const placedBodice = multiOptResult.layoutPlacements.find(p => p.patternId === 'pat-front');
  const placedSleeve = multiOptResult.layoutPlacements.find(p => p.patternId === 'pat-sleeve');
  assert(placedBodice.originalWidth === 45 && placedBodice.originalHeight === 65, 'Bodice preserved manual 45×65 cm production dimensions');
  assert(placedSleeve.originalWidth === 35 && placedSleeve.originalHeight === 50, 'Sleeve preserved manual 35×50 cm production dimensions');

  // Verify distinct contours were assigned to each piece
  assert(placedBodice.outline.length === normalizedBodice.length, 'Bodice received bodice contour');
  assert(placedSleeve.outline.length === normalizedSleeve.length, 'Sleeve received sleeve contour');

  // Verify zero collision between all placed pieces with 0.8cm clearance
  let multiCollision = false;
  for (let i = 0; i < multiOptResult.layoutPlacements.length; i++) {
    for (let j = i + 1; j < multiOptResult.layoutPlacements.length; j++) {
      if (checkPolygonCollision(multiOptResult.layoutPlacements[i].worldPoints, multiOptResult.layoutPlacements[j].worldPoints, 0.8)) {
        multiCollision = true;
      }
    }
  }
  assert(!multiCollision, 'Zero collision between all multi-candidate irregular pieces with 0.8cm clearance');

  // ==========================================
  // TEST CASE 12: Zero Placement When Collision or Fabric Boundary Fails
  // ==========================================
  console.log('\n--- Test Case 12: Strict Rejection of Boundary & Collision Violations ---');
  // Pattern piece wider than fabric length (150cm piece on 100cm length fabric)
  const impossibleInput = {
    fabricWidth: 100,
    fabricLength: 80,
    minSpacing: 0.5,
    allowRotation: false,
    respectGrain: true,
    patterns: [
      {
        id: 'pat-oversized',
        name: 'Oversized Robe Pattern',
        shapeType: 'irregular',
        width: 120, // 120cm > 80cm fabric length
        height: 60,
        quantity: 1,
        outline: normalizedBodice
      }
    ]
  };

  const impossibleResult = optimizeFabricCutting(impossibleInput);
  assert(impossibleResult.success === false, 'Never reports success when pattern cannot fit within fabric bounds');
  assert(impossibleResult.placedCount === 0, 'Zero placed count when piece violates fabric boundary');
  assert(impossibleResult.unplacedCount === 1, 'Piece correctly reported as unplaced');
  assert(Boolean(impossibleResult.error), `Error message clearly identifies violation: "${impossibleResult.error}"`);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log(`\n==========================================`);
  console.log(`Irregular Nesting Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
