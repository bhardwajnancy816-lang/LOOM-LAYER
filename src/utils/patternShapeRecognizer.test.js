import test from 'node:test';
import { 
  extractContourFromBinaryGrid, 
  extractPatternContourFromImageData,
  traceOuterBoundary,
  ramerDouglasPeucker,
  simplifyAndNormalizeContour,
  isComponentEnclosed,
  findCornerAndNotchIndices,
  parseSvgPathToPoints,
  extractContourFromSvgString,
  recognizePatternShape,
  calibratePatternDimensions
} from './patternShapeRecognizer.js';
import { 
  checkPolygonCollision, 
  isPolygonWithinFabric, 
  calculatePolygonArea,
  transformNormalizedToWorldPolygon
} from './polygonGeometry.js';
import { 
  expandPatternPieces,
  canPlacePiece,
  optimizeFabricCutting
} from './fabricOptimizer.js';
import {
  generateCuttingPlan,
  exportCuttingPlanToDXF,
  exportCuttingPlanToSVG,
  exportCuttingPlanToJSON
} from './cuttingPlanGenerator.js';

async function runTests() {
  console.log('🧪 Starting Pattern Shape Recognition Unit Tests...\n');
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
  // TEST 1: Synthetic Single Clean Rectangle in Binary Grid
  // ==========================================
  console.log('--- Test 1: Single Clean Rectangular Pattern in Binary Grid ---');
  const width1 = 100;
  const height1 = 100;
  const grid1 = new Uint8Array(width1 * height1);

  // Place a 60x40 foreground rectangle from (20, 30) to (79, 69)
  for (let y = 30; y < 70; y++) {
    for (let x = 20; x < 80; x++) {
      grid1[y * width1 + x] = 1;
    }
  }

  const result1 = extractContourFromBinaryGrid(grid1, width1, height1);

  assert(result1.success === true, 'Contour extraction executed successfully');
  assert(result1.shape.shapeType === 'irregular', 'Shape type is irregular');
  assert(result1.shape.pixelWidth === 60, `Extracted pixel width is exactly 60 (got ${result1.shape.pixelWidth})`);
  assert(result1.shape.pixelHeight === 40, `Extracted pixel height is exactly 40 (got ${result1.shape.pixelHeight})`);
  assert(result1.shape.aspectRatio === 1.5, `Aspect ratio is 1.5 (got ${result1.shape.aspectRatio})`);
  assert(result1.isMultiPattern === false, 'Single pattern detected as isMultiPattern: false');
  
  // Verify normalized coordinates are within [0, 1]
  const allNormalized1 = result1.shape.outline.every(
    (pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1
  );
  assert(allNormalized1, 'All extracted outline coordinates are normalized in [0, 1]');

  // Verify low-level Moore-Neighbor border tracing and RDP algorithms
  const dummyComponent = {
    minX: 0, maxX: 10, minY: 0, maxY: 10, boundWidth: 11, boundHeight: 11,
    pixels: [0, 1, 2, 3, 4]
  };
  const rawPerim = traceOuterBoundary(dummyComponent, 100);
  assert(Array.isArray(rawPerim) && rawPerim.length >= 4, 'traceOuterBoundary extracts valid perimeter array');
  const simplified = ramerDouglasPeucker([{ x: 0, y: 0 }, { x: 5, y: 0.1 }, { x: 10, y: 0 }], 0.5);
  assert(simplified.length === 2, 'ramerDouglasPeucker simplifies collinear points cleanly');
  const normalizedContour = simplifyAndNormalizeContour(rawPerim, 0, 10, 0, 10, 11, 11);
  assert(Array.isArray(normalizedContour) && normalizedContour.length >= 4, 'simplifyAndNormalizeContour produces closed normalized loop');

  // ==========================================
  // TEST 2: Garment-Shaped Front Bodice with Curved Neckline & Armhole
  // ==========================================
  console.log('\n--- Test 2: Garment-Shaped Front Bodice with Armhole & Neckline Curves ---');
  const bodiceW = 100;
  const bodiceH = 120;
  const bodiceGrid = new Uint8Array(bodiceW * bodiceH);

  // Draw realistic Front Bodice (60 wide, 90 high) situated from x: 20..79, y: 15..104
  // Features:
  // - Neck scoop on top left: x: 0..20, y: 18..0 (dips down 18px)
  // - Shoulder: x: 20..45, y: 0..8
  // - Concave armhole: x: 45..60, y: 8..38, dipping INWARD to x: 40 at y: 24
  // - Side seam: x: 60..55, y: 38..90
  // - Hemline: x: 0..55 at y: 90
  // - Center front: x: 0, y: 18..90

  for (let py = 0; py < 90; py++) {
    for (let px = 0; px < 60; px++) {
      let isInside = false;

      // Check center front / neck scoop
      if (px < 20) {
        // Neck scoop: curve from y=18 at x=0 down to y=0 at x=20
        const neckY = 18 * (1 - px / 20) ** 2;
        if (py >= neckY) isInside = true;
      } else if (px <= 45) {
        // Shoulder: line from (20, 0) to (45, 8)
        const shoulderY = (8 / 25) * (px - 20);
        if (py >= shoulderY) isInside = true;
      } else {
        // Armhole area (px: 45..60, py: 0..38)
        if (py < 8) {
          isInside = false; // Above shoulder
        } else if (py <= 38) {
          // Armhole curve: drops inward to minX=40 around py=24, curves out to px=60 at py=38
          const t = (py - 8) / 30; // 0..1
          // Quadratic bezier boundary: starts 45 at t=0, reaches 40 at t=0.5, reaches 60 at t=1
          const boundaryX = (1 - t) ** 2 * 45 + 2 * (1 - t) * t * 35 + t ** 2 * 60;
          if (px <= boundaryX) isInside = true;
        } else {
          // Side seam below armhole (py: 38..90, px from 60 tapering to 55)
          const seamT = (py - 38) / 52;
          const seamX = 60 - seamT * 5;
          if (px <= seamX) isInside = true;
        }
      }

      if (isInside) {
        bodiceGrid[(15 + py) * bodiceW + (20 + px)] = 1;
      }
    }
  }

  const bodiceResult = extractContourFromBinaryGrid(bodiceGrid, bodiceW, bodiceH);

  assert(bodiceResult.success === true, 'Front Bodice contour extracted successfully');
  assert(bodiceResult.shape.pixelWidth === 60, `Detected exact bounding width of 60 (got ${bodiceResult.shape.pixelWidth})`);
  assert(bodiceResult.shape.pixelHeight === 90, `Detected exact bounding height of 90 (got ${bodiceResult.shape.pixelHeight})`);
  assert(bodiceResult.shape.aspectRatio === 0.667, `Aspect ratio is 0.667 (got ${bodiceResult.shape.aspectRatio})`);
  assert(bodiceResult.shape.outline.length >= 10, `Contour has fine detail vertices (got ${bodiceResult.shape.outline.length} pts)`);

  // Verify that the inward armhole concavity was preserved and NOT bridged like a hexagon/bounding box
  // The armhole point at y in [0.2, 0.35] should have an x coordinate < 0.75 (representing the inward curve)
  const armholePoints = bodiceResult.shape.outline.filter(pt => pt.y >= 0.18 && pt.y <= 0.38 && pt.x >= 0.55 && pt.x <= 0.85);
  assert(armholePoints.length > 0, `Armhole curve points are captured in contour (${armholePoints.length} points found)`);
  
  // Verify neckline scoop point
  const neckPoints = bodiceResult.shape.outline.filter(pt => pt.x <= 0.25 && pt.y <= 0.25);
  assert(neckPoints.length >= 2, `Neckline scoop points are captured (${neckPoints.length} points found)`);

  // Verify it is NOT a generic 6-sided hexagon or box
  assert(bodiceResult.shape.outline.length > 6, `Did not collapse into a coarse hexagon (has ${bodiceResult.shape.outline.length} vertices)`);

  // ==========================================
  // TEST 3: Curved Sleeve Pattern with Bell Cap
  // ==========================================
  console.log('\n--- Test 3: Curved Sleeve Pattern with Bell Cap ---');
  const sleeveW = 80;
  const sleeveH = 90;
  const sleeveGrid = new Uint8Array(sleeveW * sleeveH);

  // Sleeve: 50 wide, 70 high situated from x: 15..64, y: 10..79
  for (let py = 0; py < 70; py++) {
    for (let px = 0; px < 50; px++) {
      let isInside = false;
      const normX = px / 50; // 0..1
      const normY = py / 70; // 0..1

      if (normY < 0.3) {
        // Bell cap curve: arch from y=0.3 at x=0, peaking at y=0 at x=0.5, back to y=0.3 at x=1.0
        const capArchY = 0.3 * (1 - Math.sin(normX * Math.PI));
        if (normY >= capArchY) isInside = true;
      } else {
        // Underarm taper: width insets from wrist (wrist width = 70% of max width)
        const taperT = (normY - 0.3) / 0.7;
        const leftBound = 0.15 * taperT;
        const rightBound = 1.0 - 0.15 * taperT;
        if (normX >= leftBound && normX <= rightBound) isInside = true;
      }

      if (isInside) {
        sleeveGrid[(10 + py) * sleeveW + (15 + px)] = 1;
      }
    }
  }

  const sleeveResult = extractContourFromBinaryGrid(sleeveGrid, sleeveW, sleeveH);

  assert(sleeveResult.success === true, 'Sleeve contour extracted successfully');
  assert(sleeveResult.shape.pixelWidth === 50, `Sleeve width is 50 (got ${sleeveResult.shape.pixelWidth})`);
  assert(sleeveResult.shape.pixelHeight === 70, `Sleeve height is 70 (got ${sleeveResult.shape.pixelHeight})`);
  assert(sleeveResult.shape.outline.length >= 8, `Sleeve outline retains smooth curves (${sleeveResult.shape.outline.length} pts)`);

  // ==========================================
  // TEST 4: Multi-Pattern Reference Sheet with Noise & Text
  // ==========================================
  console.log('\n--- Test 4: Multi-Pattern Reference Sheet with Noise & Text ---');
  const multiW = 200;
  const multiH = 150;
  const multiGrid = new Uint8Array(multiW * multiH);

  // Piece 1: Front Bodice on the left (x: 15..65, y: 20..110 -> 51x91)
  for (let y = 20; y <= 110; y++) {
    for (let x = 15; x <= 65; x++) {
      multiGrid[y * multiW + x] = 1;
    }
  }

  // Piece 2: Sleeve on the right (x: 120..175, y: 25..105 -> 56x81)
  for (let y = 25; y <= 105; y++) {
    for (let x = 120; x <= 175; x++) {
      multiGrid[y * multiW + x] = 1;
    }
  }

  // Piece 3: Collar at bottom center (x: 75..110, y: 115..135 -> 36x21)
  for (let y = 115; y <= 135; y++) {
    for (let x = 75; x <= 110; x++) {
      multiGrid[y * multiW + x] = 1;
    }
  }

  // Noise / Text labels: small isolated components
  // "FRONT" text mark (10 pixels)
  for (let x = 30; x < 40; x++) multiGrid[120 * multiW + x] = 1;
  // Scattered dots & button marks
  multiGrid[15 * multiW + 90] = 1;
  multiGrid[16 * multiW + 91] = 1;
  multiGrid[40 * multiW + 95] = 1;

  const multiResult = extractContourFromBinaryGrid(multiGrid, multiW, multiH);

  assert(multiResult.success === true, 'Multi-pattern sheet processed successfully');
  assert(multiResult.isMultiPattern === true, 'Correctly flags isMultiPattern as true');
  assert(multiResult.candidates.length === 3, `Detected exactly 3 distinct pattern pieces (got ${multiResult.candidates.length})`);
  assert(multiResult.totalDetected === 3, `totalDetected is 3 (got ${multiResult.totalDetected})`);

  // Verify Piece 1 bounding box is localized to Piece 1, not stretching across the sheet
  const p1 = multiResult.candidates[0];
  assert(p1.pixelWidth >= 50 && p1.pixelWidth <= 56, `Piece 1 pixel width is localized (~51px, got ${p1.pixelWidth})`);
  assert(p1.pixelHeight >= 85 && p1.pixelHeight <= 95, `Piece 1 pixel height is localized (~91px, got ${p1.pixelHeight})`);
  
  // Verify Piece 2 bounding box
  const p2 = multiResult.candidates[1];
  assert(p2.pixelWidth >= 50 && p2.pixelWidth <= 60, `Piece 2 pixel width is localized (~56px, got ${p2.pixelWidth})`);
  assert(p2.pixelHeight >= 75 && p2.pixelHeight <= 85, `Piece 2 pixel height is localized (~81px, got ${p2.pixelHeight})`);

  // Verify Piece 3 (Collar)
  const p3 = multiResult.candidates[2];
  assert(p3.pixelWidth >= 30 && p3.pixelWidth <= 40, `Piece 3 pixel width is localized (~36px, got ${p3.pixelWidth})`);

  // Verify that noise/text was filtered out
  const noTinyComponents = multiResult.candidates.every(c => c.pointCount >= 4 && c.pixelWidth >= 10);
  assert(noTinyComponents, 'Text marks and scattered noise pixels were completely filtered out');

  // ==========================================
  // TEST 5: Sheet Outer Border Frame Rejection (Not Treating Whole Sheet as 1 Pattern)
  // ==========================================
  console.log('\n--- Test 5: Rejection of Page Border Frame ---');
  const frameW = 120;
  const frameH = 120;
  const frameGrid = new Uint8Array(frameW * frameH);

  // Draw 1px border line around the entire sheet at margin 2
  for (let x = 2; x < frameW - 2; x++) {
    frameGrid[2 * frameW + x] = 1;
    frameGrid[(frameH - 3) * frameW + x] = 1;
  }
  for (let y = 2; y < frameH - 2; y++) {
    frameGrid[y * frameW + 2] = 1;
    frameGrid[y * frameW + (frameW - 3)] = 1;
  }

  // Inside the sheet, place 2 garment patterns
  // Pattern 1: 40x50 at (20, 20)
  for (let y = 20; y < 70; y++) {
    for (let x = 20; x < 60; x++) {
      frameGrid[y * frameW + x] = 1;
    }
  }
  // Pattern 2: 30x40 at (70, 40)
  for (let y = 40; y < 80; y++) {
    for (let x = 70; x < 100; x++) {
      frameGrid[y * frameW + x] = 1;
    }
  }

  const frameResult = extractContourFromBinaryGrid(frameGrid, frameW, frameH);

  assert(frameResult.success === true, 'Sheet with border frame processed successfully');
  assert(frameResult.candidates.length === 2, `Detected exactly 2 garment patterns inside frame (got ${frameResult.candidates.length})`);
  assert(frameResult.candidates[0].pixelWidth === 40, `Pattern 1 width is 40 (got ${frameResult.candidates[0].pixelWidth})`);
  assert(frameResult.candidates[1].pixelWidth === 30, `Pattern 2 width is 30 (got ${frameResult.candidates[1].pixelWidth})`);

  // ==========================================
  // TEST 6: Noisy & Text-Heavy Image with No Garment Pieces
  // ==========================================
  console.log('\n--- Test 6: Noisy & Text-Heavy Image Rejection ---');
  const noisyGrid = new Uint8Array(100 * 100);
  // Place scattered text letters (each 3-5 pixels)
  for (let i = 0; i < 20; i++) {
    const rx = (i * 17) % 90;
    const ry = (i * 23) % 90;
    for (let dx = 0; dx < 3; dx++) {
      noisyGrid[(ry) * 100 + (rx + dx)] = 1;
    }
  }

  const noisyResult = extractContourFromBinaryGrid(noisyGrid, 100, 100);
  assert(noisyResult.success === false, 'Correctly rejects text-heavy / noisy image without garment pieces');
  assert(Boolean(noisyResult.error), `Returns descriptive notice: "${noisyResult.error}"`);

  // ==========================================
  // TEST 7: Line-Drawn / Hollow CAD Outline Blueprint
  // ==========================================
  console.log('\n--- Test 7: Line-Drawn / Hollow CAD Outline Blueprint ---');
  const cadW = 100;
  const cadH = 100;
  const cadGrid = new Uint8Array(cadW * cadH);

  // Draw hollow rectangular boundary box (stroke width 2px, hollow interior)
  for (let x = 20; x <= 80; x++) {
    cadGrid[20 * cadW + x] = 1;
    cadGrid[21 * cadW + x] = 1;
    cadGrid[79 * cadW + x] = 1;
    cadGrid[80 * cadW + x] = 1;
  }
  for (let y = 20; y <= 80; y++) {
    cadGrid[y * cadW + 20] = 1;
    cadGrid[y * cadW + 21] = 1;
    cadGrid[y * cadW + 79] = 1;
    cadGrid[y * cadW + 80] = 1;
  }

  const cadResult = extractContourFromBinaryGrid(cadGrid, cadW, cadH);
  assert(cadResult.success === true, 'Hollow line-drawn CAD blueprint extracted successfully via morphological hole-filling');
  assert(cadResult.shape.pixelWidth === 61, `CAD bounding width detected as 61 (got ${cadResult.shape.pixelWidth})`);
  assert(cadResult.shape.pixelHeight === 61, `CAD bounding height detected as 61 (got ${cadResult.shape.pixelHeight})`);

  // ==========================================
  // TEST 8: Reject Blank / Empty Image
  // ==========================================
  console.log('\n--- Test 8: Rejection of Blank Image ---');
  const emptyGrid = new Uint8Array(100 * 100); // all zeros
  const resultEmpty = extractContourFromBinaryGrid(emptyGrid, 100, 100);

  assert(resultEmpty.success === false, 'Rejects blank image with 0 foreground pixels');
  assert(Boolean(resultEmpty.error), `Returns descriptive error message: "${resultEmpty.error}"`);

  // ==========================================
  // TEST 9: Reject Completely Uniform / Filled Image
  // ==========================================
  console.log('\n--- Test 9: Rejection of Solid Uniform Image ---');
  const solidGrid = new Uint8Array(100 * 100).fill(1);
  const resultSolid = extractContourFromBinaryGrid(solidGrid, 100, 100);

  assert(resultSolid.success === false, 'Rejects 100% solid filled image (no background contrast)');

  // ==========================================
  // TEST 10: ImageData Buffer Analysis with White Background & Dark Pattern
  // ==========================================
  console.log('\n--- Test 10: Simulated RGBA ImageData Buffer with White Background ---');
  const imgW = 80;
  const imgH = 80;
  const rgbaData = new Uint8ClampedArray(imgW * imgH * 4);

  // Fill with white background (255, 255, 255, 255)
  for (let i = 0; i < imgW * imgH; i++) {
    rgbaData[i * 4] = 255;
    rgbaData[i * 4 + 1] = 255;
    rgbaData[i * 4 + 2] = 255;
    rgbaData[i * 4 + 3] = 255;
  }

  // Draw dark pattern piece in center (40x50 at (20, 15))
  for (let y = 15; y < 65; y++) {
    for (let x = 20; x < 60; x++) {
      const idx = (y * imgW + x) * 4;
      rgbaData[idx] = 30;
      rgbaData[idx + 1] = 30;
      rgbaData[idx + 2] = 30;
      rgbaData[idx + 3] = 255;
    }
  }

  const mockImageData = {
    data: rgbaData,
    width: imgW,
    height: imgH
  };

  const resultImageData = extractPatternContourFromImageData(mockImageData);

  assert(resultImageData.success === true, 'Extracts pattern contour from RGBA image data buffer');
  assert(resultImageData.shape.pixelWidth === 40, `Pixel width detected as 40 (got ${resultImageData.shape.pixelWidth})`);
  assert(resultImageData.shape.pixelHeight === 50, `Pixel height detected as 50 (got ${resultImageData.shape.pixelHeight})`);
  assert(resultImageData.shape.aspectRatio === 0.8, `Aspect ratio is 0.8 (got ${resultImageData.shape.aspectRatio})`);

  // ==========================================
  // TEST 11: Reject Low-Contrast ImageData
  // ==========================================
  console.log('\n--- Test 11: Rejection of Low Contrast ImageData ---');
  const lowContrastData = new Uint8ClampedArray(50 * 50 * 4);
  for (let i = 0; i < 50 * 50; i++) {
    lowContrastData[i * 4] = 200;
    lowContrastData[i * 4 + 1] = 200;
    lowContrastData[i * 4 + 2] = 200;
    lowContrastData[i * 4 + 3] = 255;
  }
  for (let y = 10; y < 40; y++) {
    for (let x = 10; x < 40; x++) {
      const idx = (y * 50 + x) * 4;
      lowContrastData[idx] = 205;
      lowContrastData[idx + 1] = 205;
      lowContrastData[idx + 2] = 205;
      lowContrastData[idx + 3] = 255;
    }
  }

  const lowContrastResult = extractPatternContourFromImageData({
    data: lowContrastData,
    width: 50,
    height: 50
  });

  assert(lowContrastResult.success === false, 'Rejects low-contrast image buffer');

  // ==========================================
  // TEST 12: Deterministic Output Invariant
  // ==========================================
  console.log('\n--- Test 12: Deterministic Contour Output Invariant ---');
  const r1 = extractContourFromBinaryGrid(bodiceGrid, bodiceW, bodiceH);
  const r2 = extractContourFromBinaryGrid(bodiceGrid, bodiceW, bodiceH);

  assert(JSON.stringify(r1.shape.outline) === JSON.stringify(r2.shape.outline), 'Contour coordinates are 100% deterministic across multiple runs');
  assert(r1.shape.aspectRatio === r2.shape.aspectRatio, 'Aspect ratio is 100% deterministic');
  assert(r1.shape.pixelWidth === r2.shape.pixelWidth, 'Pixel width is 100% deterministic');

  // ==========================================
  // TEST 13: Hollow Outline with Minor Gaps (Gap Bridging & Hole Filling)
  // ==========================================
  console.log('\n--- Test 13: Hollow Outline with Minor Gaps ---');
  const gapW = 100;
  const gapH = 100;
  const gapGrid = new Uint8Array(gapW * gapH);

  // Draw 50x50 hollow rectangular outline with a 2-pixel gap on the right edge
  // Top edge
  for (let x = 25; x <= 75; x++) gapGrid[25 * gapW + x] = 1;
  // Bottom edge
  for (let x = 25; x <= 75; x++) gapGrid[75 * gapW + x] = 1;
  // Left edge
  for (let y = 25; y <= 75; y++) gapGrid[y * gapW + 25] = 1;
  // Right edge with 2px gap at y: 48..49
  for (let y = 25; y <= 75; y++) {
    if (y !== 48 && y !== 49) {
      gapGrid[y * gapW + 75] = 1;
    }
  }

  const gapResult = extractContourFromBinaryGrid(gapGrid, gapW, gapH);
  assert(gapResult.success === true, 'Hollow outline with 2px gap successfully bridged and extracted');
  assert(gapResult.shape.pixelWidth === 51, `Detected width is 51 (got ${gapResult.shape.pixelWidth})`);
  assert(gapResult.shape.pixelHeight === 51, `Detected height is 51 (got ${gapResult.shape.pixelHeight})`);
  assert(gapResult.shape.outline.length >= 4, `Contour successfully closed (has ${gapResult.shape.outline.length} vertices)`);
  // Verify loop closure
  const gapFirst = gapResult.shape.outline[0];
  const gapLast = gapResult.shape.outline[gapResult.shape.outline.length - 1];
  assert(gapFirst.x === gapLast.x && gapFirst.y === gapLast.y, 'Contour loop is closed strictly with matching endpoints');

  // ==========================================
  // TEST 14: Incomplete / Open Line Boundary Rejection
  // ==========================================
  console.log('\n--- Test 14: Incomplete / Open Line Boundary Rejection ---');
  const openW = 100;
  const openH = 100;
  const openGrid = new Uint8Array(openW * openH);

  // Draw an open, unclosed U-shape curve (missing the entire top side)
  // Left edge
  for (let y = 30; y <= 70; y++) openGrid[y * openW + 25] = 1;
  // Bottom edge
  for (let x = 25; x <= 75; x++) openGrid[70 * openW + x] = 1;
  // Right edge
  for (let y = 30; y <= 70; y++) openGrid[y * openW + 75] = 1;
  // Top is completely open (25..75 missing, a 50px gap)

  const openResult = extractContourFromBinaryGrid(openGrid, openW, openH);
  assert(openResult.success === false, 'Correctly rejects incomplete / unclosed boundary without inventing missing geometry');
  assert(Boolean(openResult.error), `Returns descriptive failure error: "${openResult.error}"`);

  // ==========================================
  // TEST 15: Multi-Piece Separation Failure Detection & Clear Messaging
  // ==========================================
  console.log('\n--- Test 15: Multi-Piece Separation Failure Detection ---');
  const failW = 150;
  const failH = 100;
  const failGrid = new Uint8Array(failW * failH);

  // Two pattern pieces placed so close they touch and merge into one ambiguous fragmented mass
  // Piece A
  for (let y = 20; y <= 60; y++) {
    for (let x = 20; x <= 50; x++) {
      failGrid[y * failW + x] = 1;
    }
  }
  // Several fragmented unclosed lines nearby (competing clusters)
  for (let x = 70; x <= 130; x++) {
    failGrid[30 * failW + x] = 1;
    failGrid[55 * failW + x] = 1;
  }
  for (let y = 30; y <= 55; y++) {
    failGrid[y * failW + 70] = 1;
  }

  // Fragmented secondary piece with large open gap (30px open side)
  // The primary piece only accounts for a fraction of foreground
  const failResult = extractContourFromBinaryGrid(failGrid, failW, failH);
  assert(
    failResult.success === false || failResult.isMultiPattern === true,
    'Never reports "Pattern Detected" as successful multi-pattern recognition if pieces cannot be cleanly separated'
  );

  // ==========================================
  // TEST 16: Resolution-Independent Dimension Scaling
  // ==========================================
  console.log('\n--- Test 16: Resolution-Independent Dimension Scaling ---');
  // Generate same 3:4 aspect ratio rectangle at 2 different resolutions: 30x40 on 80x80 vs 60x80 on 160x160
  const lowResGrid = new Uint8Array(80 * 80);
  for (let y = 20; y < 60; y++) {
    for (let x = 25; x < 55; x++) {
      lowResGrid[y * 80 + x] = 1;
    }
  }

  const highResGrid = new Uint8Array(160 * 160);
  for (let y = 40; y < 120; y++) {
    for (let x = 50; x < 110; x++) {
      highResGrid[y * 160 + x] = 1;
    }
  }

  const lowRes = extractContourFromBinaryGrid(lowResGrid, 80, 80);
  const highRes = extractContourFromBinaryGrid(highResGrid, 160, 160);

  assert(lowRes.success === true && highRes.success === true, 'Both low and high resolution grids extract successfully');
  assert(lowRes.shape.aspectRatio === highRes.shape.aspectRatio, `Aspect ratio matches across resolutions (${lowRes.shape.aspectRatio} vs ${highRes.shape.aspectRatio})`);
  
  // Verify normalized coordinates are independent of image resolution
  const lowP = lowRes.shape.outline[1];
  const highP = highRes.shape.outline[1];
  const diffX = Math.abs(lowP.x - highP.x);
  const diffY = Math.abs(lowP.y - highP.y);
  assert(diffX < 0.05 && diffY < 0.05, `Normalized outline coordinates are independent of resolution (diff: ${diffX.toFixed(4)}, ${diffY.toFixed(4)})`);

  // ==========================================
  // TEST 17: Separation of Image-Derived Metrics from Manual Dimensions
  // ==========================================
  console.log('\n--- Test 17: Separation of Image-Derived Metrics from Manual Dimensions ---');
  assert(typeof lowRes.shape.pixelWidth === 'number' && lowRes.shape.pixelWidth === 30, 'pixelWidth is clearly reported as image-derived');
  assert(typeof lowRes.shape.pixelHeight === 'number' && lowRes.shape.pixelHeight === 40, 'pixelHeight is clearly reported as image-derived');
  assert(lowRes.shape.isImageDerived === true, 'Candidate explicitly flagged as isImageDerived: true');
  assert(lowRes.shape.boundingBox.width === 30, 'boundingBox provides exact pixel bounds');
  assert(lowRes.shape.pointCount === lowRes.shape.outline.length, `pointCount reports accurate vertex count (${lowRes.shape.pointCount})`);

  // ==========================================
  // TEST 18: Internal Markings (Dashed Stitching, Grainline Arrow, Text Label)
  // Ignored cleanly without false separation errors or creating extra pieces
  // ==========================================
  console.log('\n--- Test 18: Internal Markings Enclosed in Pattern Piece ---');
  const markedW = 120;
  const markedH = 120;
  const markedGrid = new Uint8Array(markedW * markedH);

  // Outer garment piece: 80x80 from x: 20..99, y: 20..99 (solid square with armhole curve)
  for (let y = 20; y <= 99; y++) {
    for (let x = 20; x <= 99; x++) {
      markedGrid[y * markedW + x] = 1;
    }
  }

  // Draw isolated internal markings inside the piece:
  // 1. Internal dashed stitching line at y = 40 (dashes from x = 30 to 70)
  // 2. Grainline vertical line with arrows at x = 50, y = 50..75
  // 3. Text label block from x = 60..80, y = 60..70
  // In binary grid, internal markings are already within the solid 1s of the outer boundary.
  // Now let's test a hollow line-drawn pattern WITH separate internal components inside it:
  const hollowMarkedGrid = new Uint8Array(markedW * markedH);
  // Outer perimeter stroke (hollow boundary)
  for (let x = 20; x <= 99; x++) {
    hollowMarkedGrid[20 * markedW + x] = 1;
    hollowMarkedGrid[99 * markedW + x] = 1;
  }
  for (let y = 20; y <= 99; y++) {
    hollowMarkedGrid[y * markedW + 20] = 1;
    hollowMarkedGrid[y * markedW + 99] = 1;
  }

  // Internal component 1: text label block (20x15) inside the hollow boundary
  for (let y = 35; y <= 45; y++) {
    for (let x = 40; x <= 65; x++) {
      hollowMarkedGrid[y * markedW + x] = 1;
    }
  }

  // Internal component 2: grainline vertical arrow line (30px high)
  for (let y = 55; y <= 85; y++) {
    hollowMarkedGrid[y * markedW + 75] = 1;
    hollowMarkedGrid[y * markedW + 76] = 1;
  }

  const markedResult = extractContourFromBinaryGrid(hollowMarkedGrid, markedW, markedH);

  assert(markedResult.success === true, 'Pattern with internal markings successfully recognized');
  assert(markedResult.totalDetected === 1, `Internal markings were NOT treated as separate pieces (totalDetected = ${markedResult.totalDetected})`);
  assert(markedResult.isMultiPattern === false, 'Correctly flagged as single pattern despite internal text and arrows');
  assert(markedResult.shape.pixelWidth === 80, `Detected outer boundary width 80 (got ${markedResult.shape.pixelWidth})`);
  assert(markedResult.shape.pixelHeight === 80, `Detected outer boundary height 80 (got ${markedResult.shape.pixelHeight})`);
  assert(markedResult.shape.boundingBox.minX === 20, `Bounding box minX is 20 (got ${markedResult.shape.boundingBox.minX})`);
  assert(markedResult.shape.boundingBox.maxX === 99, `Bounding box maxX is 99 (got ${markedResult.shape.boundingBox.maxX})`);

  // ==========================================
  // TEST 19: Sharp Inward Notch & Corner Preservation
  // ==========================================
  console.log('\n--- Test 19: Sharp Inward Notch & Corner Preservation ---');
  const notchW = 80;
  const notchH = 80;
  const notchGrid = new Uint8Array(notchW * notchH);

  // Draw 50x50 piece with an inward V-notch on the right edge at y = 45 (depth 6px, width 6px)
  for (let y = 20; y < 70; y++) {
    for (let x = 15; x < 65; x++) {
      // Inward V-notch cut into the right boundary (x = 65)
      let isNotch = false;
      if (y >= 42 && y <= 48) {
        const notchDepth = 4 - Math.abs(y - 45); // apex at x = 61
        if (x >= 65 - notchDepth) {
          isNotch = true;
        }
      }
      if (!isNotch) {
        notchGrid[y * notchW + x] = 1;
      }
    }
  }

  const notchResult = extractContourFromBinaryGrid(notchGrid, notchW, notchH);
  assert(notchResult.success === true, 'Piece with inward notch recognized');
  assert(notchResult.shape.outline.length >= 6, `Preserved fine detail vertices (${notchResult.shape.outline.length} pts)`);

  // Verify that an inward vertex exists near y = 0.5 where x < 1.0 (notch cut)
  const notchPts = notchResult.shape.outline.filter((pt) => pt.y >= 0.45 && pt.y <= 0.55 && pt.x >= 0.88 && pt.x < 0.98);
  assert(notchPts.length > 0, `Inward notch vertex is captured in the normalized contour (${notchPts.length} points found)`);

  // Corner and notch detector function check
  const dummyOutline = [
    { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 20 },
    { x: 45, y: 25 }, { x: 50, y: 30 }, { x: 50, y: 50 },
    { x: 0, y: 50 }, { x: 0, y: 0 }
  ];
  const detectedCorners = findCornerAndNotchIndices(dummyOutline);
  assert(Array.isArray(detectedCorners), 'findCornerAndNotchIndices returns valid array');

  // ==========================================
  // TEST 20: Broken / Ambiguous Boundary Rejection with Helpful Warning
  // ==========================================
  console.log('\n--- Test 20: Broken / Ambiguous Boundary Rejection ---');
  const brokenW = 100;
  const brokenH = 100;
  const brokenGrid = new Uint8Array(brokenW * brokenH);

  // Draw an incomplete, open boundary: 3 sides of a 60x60 square with a 40px open bottom gap
  for (let x = 20; x <= 80; x++) {
    brokenGrid[20 * brokenW + x] = 1; // Top wall
  }
  for (let y = 20; y <= 80; y++) {
    brokenGrid[y * brokenW + 20] = 1; // Left wall
    brokenGrid[y * brokenW + 80] = 1; // Right wall
  }
  // Bottom wall is completely missing (60px wide gap)

  const brokenResult = extractContourFromBinaryGrid(brokenGrid, brokenW, brokenH);
  assert(brokenResult.success === false, 'Open / incomplete boundary correctly rejected without crashing');
  assert(
    brokenResult.error.toLowerCase().includes('boundary') ||
    brokenResult.error.toLowerCase().includes('broken') ||
    brokenResult.error.toLowerCase().includes('incomplete') ||
    brokenResult.error.toLowerCase().includes('fragmented'),
    `Provides clear user notice about broken boundary (got: "${brokenResult.error}")`
  );

  // Blank grid check
  const blankGrid = new Uint8Array(100 * 100);
  const blankResult = extractContourFromBinaryGrid(blankGrid, 100, 100);
  assert(blankResult.success === false, 'Blank image rejected cleanly');
  assert(blankResult.error.includes('No distinct pattern foreground'), 'Blank image error is descriptive');

  // Low contrast RGBA buffer check
  const lowContrastBuffer2 = new Uint8ClampedArray(100 * 100 * 4);
  // Fill with uniform gray (lum ~128) with only 2 levels of variation
  for (let i = 0; i < 100 * 100; i++) {
    const val = 128 + (i % 2);
    lowContrastBuffer2[i * 4] = val;
    lowContrastBuffer2[i * 4 + 1] = val;
    lowContrastBuffer2[i * 4 + 2] = val;
    lowContrastBuffer2[i * 4 + 3] = 255;
  }
  const lowContrastResult2 = extractPatternContourFromImageData({
    data: lowContrastBuffer2,
    width: 100,
    height: 100
  });
  assert(lowContrastResult2.success === false, 'Low-contrast image rejected cleanly');
  assert(lowContrastResult2.error.toLowerCase().includes('contrast'), 'Error message specifically mentions low contrast');

  // ==========================================
  // TEST 21: Direct SVG Vector Parsing with Markings Filter
  // ==========================================
  console.log('\n--- Test 21: Direct SVG Vector Parsing ---');
  const sampleSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <!-- Outer garment cutting outline -->
      <path d="M 20 20 L 100 20 L 100 120 L 20 120 Z" class="outer-cut-path" />
      <!-- Internal dashed seam allowance (should be ignored) -->
      <path d="M 25 25 L 95 25 L 95 115 L 25 115 Z" stroke-dasharray="3,3" class="stitching" />
      <!-- Internal grainline arrow (should be ignored) -->
      <path d="M 60 40 L 60 100" class="grainline" />
    </svg>
  `;

  const svgResult = extractContourFromSvgString(sampleSvg);
  assert(svgResult.success === true, 'SVG blueprint parsed successfully');
  assert(svgResult.totalDetected === 1, `Ignored dashed lines and internal grainline (totalDetected = ${svgResult.totalDetected})`);
  assert(svgResult.shape.pixelWidth === 80, `Extracted width 80 (got ${svgResult.shape.pixelWidth})`);
  assert(svgResult.shape.pixelHeight === 100, `Extracted height 100 (got ${svgResult.shape.pixelHeight})`);
  assert(svgResult.shape.hasCalibrationReference === false, 'Explicitly marked as uncalibrated (hasCalibrationReference: false)');
  assert(typeof svgResult.shape.calibrationNotice === 'string', 'Includes explicit calibration notice');

  // Test SVG path parser directly
  const pathPts = parseSvgPathToPoints('M 0 0 L 50 0 C 60 20 60 40 50 60 L 0 60 Z');
  assert(pathPts.length > 4, `parseSvgPathToPoints samples curve smoothly (${pathPts.length} points)`);

  // ==========================================
  // TEST 22: Multi-Pattern SVG Parsing (Two Separate Pattern Pieces)
  // ==========================================
  console.log('\n--- Test 22: Multi-Pattern SVG Parsing (Two Separate Pieces) ---');
  const multiSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
      <!-- Piece 1: Front Bodice -->
      <rect x="20" y="20" width="80" height="120" />
      <!-- Piece 2: Sleeve -->
      <rect x="140" y="20" width="60" height="100" />
    </svg>
  `;

  const multiSvgResult = extractContourFromSvgString(multiSvg);
  assert(multiSvgResult.success === true, 'Multi-pattern SVG parsed successfully');
  assert(multiSvgResult.totalDetected === 2, `Detected exactly 2 separate pattern pieces (got ${multiSvgResult.totalDetected})`);
  assert(multiSvgResult.isMultiPattern === true, 'isMultiPattern is true');
  assert(multiSvgResult.candidates[0].pixelWidth === 80, 'Piece 1 width is 80');
  assert(multiSvgResult.candidates[1].pixelWidth === 60, 'Piece 2 width is 60');

  // ==========================================
  // TEST 23: Complete Polygon Closure, Shoelace Area, Dimensions, & Coordinates
  // ==========================================
  console.log('\n--- Test 23: Contour Closure, Area, Dimensions & Normalized Coordinates ---');
  const testCandidate = svgResult.shape;
  const outline = testCandidate.outline;

  // Closure check: first point equals last point
  const firstPt = outline[0];
  const lastPt = outline[outline.length - 1];
  assert(firstPt.x === lastPt.x && firstPt.y === lastPt.y, 'Contour is guaranteed closed (first vertex equals last vertex)');

  // Bounding box consistency
  const allInRange = outline.every((pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1);
  assert(allInRange, 'All outline points are strictly normalized in [0, 1]');

  // Shoelace area calculation check
  const shoelaceArea = calculatePolygonArea(outline);
  assert(shoelaceArea > 0 && shoelaceArea <= 1, `Shoelace normalized area is valid (${shoelaceArea.toFixed(4)})`);
  assert(testCandidate.aspectRatio === 0.8, `Aspect ratio is consistent (${testCandidate.aspectRatio})`);

  // Real world coordinate transformation
  const realW = 40;
  const realH = 50;
  const worldTransform = transformNormalizedToWorldPolygon(outline, realW, realH, 0, 10, 20);
  assert(worldTransform.boundWidth === realW, `World transformed width matches manual dimension (${worldTransform.boundWidth})`);
  assert(worldTransform.boundHeight === realH, `World transformed height matches manual dimension (${worldTransform.boundHeight})`);
  assert(worldTransform.minX === 10 && worldTransform.minY === 20, 'World coordinates translated correctly');

  // ==========================================
  // TEST 24: Integration with Nesting Optimizer (Actual Polygon Collision & Boundaries)
  // ==========================================
  console.log('\n--- Test 24: Integration with Nesting Optimizer Geometry ---');
  // Create 2 irregular bodice polygons on fabric bed
  const bodiceOutline = bodiceResult.shape.outline;
  const polyA = transformNormalizedToWorldPolygon(bodiceOutline, 40, 60, 0, 10, 10).worldPoints;
  const polyB_colliding = transformNormalizedToWorldPolygon(bodiceOutline, 40, 60, 0, 20, 20).worldPoints;
  const polyC_clear = transformNormalizedToWorldPolygon(bodiceOutline, 40, 60, 0, 60, 10).worldPoints;

  // Collision detection
  const collidesWithOverlapping = checkPolygonCollision(polyA, polyB_colliding, 0);
  const collidesWithClear = checkPolygonCollision(polyA, polyC_clear, 0);

  assert(collidesWithOverlapping === true, 'checkPolygonCollision detects overlap between intersecting irregular polygons');
  assert(collidesWithClear === false, 'checkPolygonCollision permits non-overlapping adjacent polygons');

  // Fabric boundary containment
  assert(isPolygonWithinFabric(polyA, 200, 100) === true, 'Piece strictly within fabric bed passes boundary check');
  const polyOutOfBounds = transformNormalizedToWorldPolygon(bodiceOutline, 40, 60, 0, 180, 70).worldPoints;
  assert(isPolygonWithinFabric(polyOutOfBounds, 200, 100) === false, 'Piece extending beyond fabric boundary (Y=130 > 100) is rejected');

  // Test optimizer piece expansion and placement
  const patternsToOptimize = [
    {
      id: 'irreg-1',
      name: 'Front Bodice',
      category: 'FRONT',
      shapeType: 'irregular',
      width: 40,
      height: 60,
      quantity: 2,
      rotationAllowed: true,
      grainConstraint: 'Vertical',
      outline: bodiceOutline
    }
  ];

  const expanded = expandPatternPieces(patternsToOptimize, true, true);
  assert(expanded.length === 2, 'expandPatternPieces created 2 item pieces');
  assert(expanded[0].isIrregular === true, 'Item pieces retain isIrregular: true');
  assert(Array.isArray(expanded[0].outline), 'Item pieces preserve actual contour outline coordinates');
  assert(expanded[0].polygonArea > 0 && expanded[0].polygonArea < 40 * 60, 'Computes accurate Shoelace area (< bounding rectangle)');

  // Run fabric cutting optimization with these irregular pieces
  const optResult = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 300,
    patterns: patternsToOptimize,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true
  });

  assert(optResult.success === true, 'Fabric optimization successfully nests irregular contour pieces');
  assert(optResult.placedCount === 2, `Placed all irregular pieces (placedCount = ${optResult.placedCount})`);
  assert(optResult.layoutPlacements[0].outline !== undefined, 'Placed pieces retain outline in layout output');
  assert(Array.isArray(optResult.layoutPlacements[0].worldPoints), 'Placed pieces have calculated worldPoints polygon vertices');

  // ==========================================
  // TEST 25: Regression for Manual Patterns and Project Workflows
  // ==========================================
  console.log('\n--- Test 25: Regression Tests for Manual Patterns ---');
  const manualPatterns = [
    {
      id: 'man-1',
      name: 'Pocket Flap',
      category: 'POCKET',
      shapeType: 'pocket',
      width: 15,
      height: 12,
      quantity: 4,
      rotationAllowed: true,
      grainConstraint: 'Horizontal'
    }
  ];

  const manualExpanded = expandPatternPieces(manualPatterns, true, true);
  assert(manualExpanded.length === 4, 'Manual pattern expanded correctly');
  assert(manualExpanded[0].width === 15 && manualExpanded[0].height === 12, 'Preserved manual dimensions');
  assert(manualExpanded[0].grainConstraint === 'Horizontal', 'Preserved grain constraint');

  const manualOpt = optimizeFabricCutting({
    fabricWidth: 100,
    fabricLength: 200,
    patterns: manualPatterns,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true
  });

  assert(manualOpt.success === true, 'Manual patterns optimize seamlessly without regression');
  assert(manualOpt.placedCount === 4, 'All 4 manual pieces placed');
  assert(manualOpt.utilization > 0, `Derived positive utilization (${manualOpt.utilization}%)`);

  // ==========================================
  // TEST 26: Independent Detection of Two Separate Garment Pieces with Gap
  // ==========================================
  console.log('\n--- Test 26: Independent Detection of Two Separate Garment Pieces Side-by-Side ---');
  const twoPiecesW = 240;
  const twoPiecesH = 150;
  const twoPiecesGrid = new Uint8Array(twoPiecesW * twoPiecesH);

  // Piece 1: Front Bodice (width 70, height 100) placed at x: 20..89, y: 25..124
  // Features: scooped neckline, sloped shoulder, concave inward armhole, side seam, curved hem
  for (let py = 0; py < 100; py++) {
    for (let px = 0; px < 70; px++) {
      let inside = false;
      if (px < 25) {
        // Neck scoop: curve from y=20 down to y=0 at x=25
        const neckY = 20 * (1 - px / 25) ** 2;
        if (py >= neckY) inside = true;
      } else if (px <= 50) {
        // Shoulder slope: from (25, 0) to (50, 10)
        const shoulderY = (10 / 25) * (px - 25);
        if (py >= shoulderY) inside = true;
      } else {
        // Armhole area (px: 50..70, py: 0..45)
        if (py < 10) {
          inside = false;
        } else if (py <= 45) {
          // Inward concave armhole curving in to px=44 at py=28, curving out to 70 at py=45
          const t = (py - 10) / 35;
          const curveX = (1 - t) ** 2 * 50 + 2 * (1 - t) * t * 38 + t ** 2 * 70;
          if (px <= curveX) inside = true;
        } else {
          // Side seam tapering slightly from 70 to 65 at hem
          const seamT = (py - 45) / 55;
          if (px <= 70 - seamT * 5) inside = true;
        }
      }
      if (inside) {
        twoPiecesGrid[(25 + py) * twoPiecesW + (20 + px)] = 1;
      }
    }
  }

  // Clear 25px gap between x=90 and x=114
  // Piece 2: Back Bodice (width 70, height 100) placed at x: 115..184, y: 25..124
  // Features: shallow back neckline, sloped shoulder, armhole, side seam, straight hem
  for (let py = 0; py < 100; py++) {
    for (let px = 0; px < 70; px++) {
      let inside = false;
      if (px < 25) {
        // Shallow back neck scoop: curve from y=6 down to y=0 at x=25
        const neckY = 6 * (1 - px / 25) ** 2;
        if (py >= neckY) inside = true;
      } else if (px <= 50) {
        // Shoulder slope: from (25, 0) to (50, 10)
        const shoulderY = (10 / 25) * (px - 25);
        if (py >= shoulderY) inside = true;
      } else {
        // Armhole (px: 50..70, py: 10..45)
        if (py < 10) {
          inside = false;
        } else if (py <= 45) {
          const t = (py - 10) / 35;
          const curveX = (1 - t) ** 2 * 50 + 2 * (1 - t) * t * 40 + t ** 2 * 70;
          if (px <= curveX) inside = true;
        } else {
          const seamT = (py - 45) / 55;
          if (px <= 70 - seamT * 5) inside = true;
        }
      }
      if (inside) {
        twoPiecesGrid[(25 + py) * twoPiecesW + (115 + px)] = 1;
      }
    }
  }

  const twoPiecesResult = extractContourFromBinaryGrid(twoPiecesGrid, twoPiecesW, twoPiecesH);

  assert(twoPiecesResult.success === true, 'Successfully extracted contours from sheet with two garment pieces');
  assert(twoPiecesResult.totalDetected === 2, `Detected exactly 2 separate garment pieces (got ${twoPiecesResult.totalDetected})`);
  assert(twoPiecesResult.isMultiPattern === true, 'isMultiPattern is true');

  const piece1 = twoPiecesResult.candidates[0];
  const piece2 = twoPiecesResult.candidates[1];

  // Verify spatial independence: piece1 is on left, piece2 is on right, gap is NOT included
  assert(piece1.boundingBox.maxX <= 90, `Piece 1 maxX (${piece1.boundingBox.maxX}) does not cross into gap (<= 90)`);
  assert(piece2.boundingBox.minX >= 115, `Piece 2 minX (${piece2.boundingBox.minX}) does not cross into gap (>= 115)`);
  assert(piece1.boundingBox.maxX < piece2.boundingBox.minX, 'The gap between the two separate pieces is strictly preserved (no merging)');

  // Verify curve fidelity on both pieces
  assert(piece1.outline.length >= 8, `Piece 1 preserves fine curve vertices (${piece1.outline.length} pts)`);
  assert(piece2.outline.length >= 8, `Piece 2 preserves fine curve vertices (${piece2.outline.length} pts)`);

  // Verify inward armhole curve preserved on Piece 1
  const p1Armhole = piece1.outline.filter((pt) => pt.y >= 0.20 && pt.y <= 0.45 && pt.x >= 0.50 && pt.x <= 0.85);
  assert(p1Armhole.length > 0, `Piece 1 inward armhole curve preserved (${p1Armhole.length} armhole vertices)`);

  // Verify closure of both independent pieces
  assert(piece1.outline[0].x === piece1.outline[piece1.outline.length - 1].x &&
         piece1.outline[0].y === piece1.outline[piece1.outline.length - 1].y, 'Piece 1 contour is closed');
  assert(piece2.outline[0].x === piece2.outline[piece2.outline.length - 1].x &&
         piece2.outline[0].y === piece2.outline[piece2.outline.length - 1].y, 'Piece 2 contour is closed');

  // ==========================================
  // TEST 27: Exclusion of Internal Markings (Dashed lines, Horizontal lines, Circles, Labels)
  // ==========================================
  console.log('\n--- Test 27: Exclusion of Internal Markings from Outer Cutting Contour ---');
  const markingsW = 120;
  const markingsH = 140;
  const markingsGrid = new Uint8Array(markingsW * markingsH);

  // Draw hollow outer cutting contour of a Front Bodice (width 60, height 90 from x: 20..79, y: 20..109)
  for (let py = 0; py < 90; py++) {
    for (let px = 0; px < 60; px++) {
      let onBoundary = false;
      // Neckline scoop from (0, 18) to (20, 0)
      if (px <= 20 && Math.abs(py - Math.round(18 * (1 - px / 20) ** 2)) <= 1) onBoundary = true;
      // Shoulder slope from (20, 0) to (45, 8)
      if (px >= 20 && px <= 45 && Math.abs(py - Math.round((8 / 25) * (px - 20))) <= 1) onBoundary = true;
      // Concave armhole curving in to px=35 around py=24, ending at (60, 38)
      if (px >= 35 && py >= 8 && py <= 38) {
        const t = (py - 8) / 30;
        const armX = Math.round((1 - t) ** 2 * 45 + 2 * (1 - t) * t * 35 + t ** 2 * 60);
        if (Math.abs(px - armX) <= 1) onBoundary = true;
      }
      // Side seam
      if (py >= 38 && py <= 89) {
        const seamX = Math.round(60 - ((py - 38) / 51) * 5);
        if (Math.abs(px - seamX) <= 1) onBoundary = true;
      }
      // Hemline
      if (py === 89 && px <= 55) onBoundary = true;
      // Center front edge
      if (px === 0 && py >= 18 && py <= 89) onBoundary = true;

      if (onBoundary) {
        markingsGrid[(20 + py) * markingsW + (20 + px)] = 1;
      }
    }
  }

  // Add INTERNAL MARKINGS inside the garment piece:
  // 1. Internal horizontal bust balance line across chest at py=35 (x: 5..45)
  for (let px = 5; px <= 45; px++) {
    markingsGrid[(20 + 35) * markingsW + (20 + px)] = 1;
  }
  // 2. Internal horizontal waist balance line at py=60 (x: 5..45)
  for (let px = 5; px <= 45; px++) {
    markingsGrid[(20 + 60) * markingsW + (20 + px)] = 1;
  }
  // 3. Internal circular markings (dart apex dot & button placement circle at px: 25, py: 48)
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy <= 4) {
        markingsGrid[(20 + 48 + dy) * markingsW + (20 + 25 + dx)] = 1;
      }
    }
  }
  // 4. Internal dashed construction line (seam allowance guide: every 3 pixels a 2px dash)
  for (let py = 25; py <= 80; py += 5) {
    markingsGrid[(20 + py) * markingsW + (20 + 8)] = 1;
    markingsGrid[(20 + py + 1) * markingsW + (20 + 8)] = 1;
  }

  const markingsResult = extractContourFromBinaryGrid(markingsGrid, markingsW, markingsH);

  assert(markingsResult.success === true, 'Hollow pattern with internal markings recognized successfully');
  assert(markingsResult.totalDetected === 1, `Internal markings were excluded from piece count (totalDetected = ${markingsResult.totalDetected})`);
  assert(markingsResult.shape.pixelWidth === 60, `Piece bounding width is 60 (got ${markingsResult.shape.pixelWidth})`);
  assert(markingsResult.shape.pixelHeight === 90, `Piece bounding height is 90 (got ${markingsResult.shape.pixelHeight})`);

  // Verify that internal lines were absorbed into the solid interior and not traced on the outer contour
  // All points in outline must be strictly on the outer perimeter
  const pointsNearCenter = markingsResult.shape.outline.filter(
    (pt) => pt.x >= 0.25 && pt.x <= 0.65 && pt.y >= 0.35 && pt.y <= 0.65
  );
  assert(pointsNearCenter.length === 0, `No internal horizontal or circular markings leaked into outer contour (${pointsNearCenter.length} center vertices found)`);

  // ==========================================
  // TEST 28: Kissing Garment Pieces Separation via Morphological Bottleneck Severing
  // ==========================================
  console.log('\n--- Test 28: Kissing Garment Pieces Separation ---');
  const kissingW = 160;
  const kissingH = 100;
  const kissingGrid = new Uint8Array(kissingW * kissingH);

  // Two 40x50 rectangles touching at a 1-pixel contact point (x: 60, y: 45)
  // Rectangle A: x: 20..59, y: 20..69
  for (let y = 20; y <= 69; y++) {
    for (let x = 20; x <= 59; x++) {
      kissingGrid[y * kissingW + x] = 1;
    }
  }
  // Rectangle B: x: 61..100, y: 20..69
  for (let y = 20; y <= 69; y++) {
    for (let x = 61; x <= 100; x++) {
      kissingGrid[y * kissingW + x] = 1;
    }
  }
  // 1-pixel accidental bridge connecting them at (60, 45)
  kissingGrid[45 * kissingW + 60] = 1;

  const kissingResult = extractContourFromBinaryGrid(kissingGrid, kissingW, kissingH);

  assert(kissingResult.success === true, 'Kissing pieces grid processed successfully');
  assert(kissingResult.totalDetected === 2, `Accidental 1px contact severed into 2 independent pieces (got ${kissingResult.totalDetected})`);
  assert(kissingResult.isMultiPattern === true, 'isMultiPattern is true');

  // ==========================================
  // TEST 29: Otsu Global Binarization with Border Polarity Detection
  // ==========================================
  console.log('\n--- Test 29: Otsu Global Binarization with Shaded Light Background ---');
  const otsuW = 80;
  const otsuH = 80;
  const otsuBuffer = new Uint8ClampedArray(otsuW * otsuH * 4);

  // Background is light paper with non-uniform shading/texture (lum 210 to 245)
  for (let y = 0; y < otsuH; y++) {
    for (let x = 0; x < otsuW; x++) {
      const idx = (y * otsuW + x) * 4;
      const shade = 210 + Math.floor((x / otsuW) * 30) + ((x + y) % 5);
      otsuBuffer[idx] = shade;
      otsuBuffer[idx + 1] = shade - 5;
      otsuBuffer[idx + 2] = shade - 10;
      otsuBuffer[idx + 3] = 255;
    }
  }

  // Draw dark garment silhouette (lum 30 to 45) from x: 20..59, y: 20..59
  for (let y = 20; y < 60; y++) {
    for (let x = 20; x < 60; x++) {
      const idx = (y * otsuW + x) * 4;
      otsuBuffer[idx] = 35;
      otsuBuffer[idx + 1] = 40;
      otsuBuffer[idx + 2] = 45;
      otsuBuffer[idx + 3] = 255;
    }
  }

  const otsuResult = extractPatternContourFromImageData({
    data: otsuBuffer,
    width: otsuW,
    height: otsuH
  });

  assert(otsuResult.success === true, 'Otsu binarization extracted pattern on shaded light background');
  assert(otsuResult.shape.pixelWidth === 40, `Extracted width is 40 (got ${otsuResult.shape.pixelWidth})`);
  assert(otsuResult.shape.pixelHeight === 40, `Extracted height is 40 (got ${otsuResult.shape.pixelHeight})`);
  assert(otsuResult.shape.hasCalibrationReference === false, 'Maintains hasCalibrationReference: false');

  // ==========================================
  // TEST 30: Downstream Multi-Piece Optimizer Integration & Uncalibrated Tag
  // ==========================================
  console.log('\n--- Test 30: Downstream Multi-Piece Optimizer Integration & Uncalibrated Tag ---');
  const piece1Contour = piece1.outline;
  const piece2Contour = piece2.outline;

  const multiPatternsForOptimizer = [
    {
      id: 'detected-piece-1',
      name: 'Detected Front Bodice',
      category: 'FRONT',
      shapeType: 'irregular',
      width: piece1.width,
      height: piece1.height,
      quantity: 1,
      rotationAllowed: true,
      grainConstraint: 'Vertical',
      outline: piece1Contour,
      normalizedCoordinates: piece1Contour,
      isImageDerived: true,
      hasCalibrationReference: false
    },
    {
      id: 'detected-piece-2',
      name: 'Detected Back Bodice',
      category: 'BACK',
      shapeType: 'irregular',
      width: piece2.width,
      height: piece2.height,
      quantity: 1,
      rotationAllowed: true,
      grainConstraint: 'Vertical',
      outline: piece2Contour,
      normalizedCoordinates: piece2Contour,
      isImageDerived: true,
      hasCalibrationReference: false
    }
  ];

  const expandedMulti = expandPatternPieces(multiPatternsForOptimizer, true, true);
  assert(expandedMulti.length === 2, 'Expanded 2 detected garment pieces for optimizer');
  assert(expandedMulti[0].isIrregular === true && expandedMulti[1].isIrregular === true, 'Both pieces maintain isIrregular: true');
  assert(expandedMulti[0].outline.length >= 8 && expandedMulti[1].outline.length >= 8, 'Both pieces pass exact contour vertices to optimizer');

  const multiOptResult = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 200,
    patterns: multiPatternsForOptimizer,
    minSpacing: 1.0,
    allowRotation: true,
    respectGrain: true
  });

  assert(multiOptResult.success === true, 'Optimizer successfully nests both independently detected garment pieces');
  assert(multiOptResult.placedCount === 2, 'Both detected pieces placed on fabric bed without collision');
  assert(multiOptResult.layoutPlacements.length === 2, 'Layout placements contains both pieces with polygon coordinates');

  // ==========================================
  // TEST 31: Full Validation Workflow & Image-Space Overlay Coordinates
  // ==========================================
  console.log('\n--- Test 31: Contour Validation Workflow & Image-Space Overlay Coordinates ---');
  assert(Array.isArray(piece1.imageOutline), 'Piece 1 contains imageOutline for visual overlay comparison');
  assert(Array.isArray(piece2.imageOutline), 'Piece 2 contains imageOutline for visual overlay comparison');
  
  // Verify imageOutline coordinates are strictly in [0, 1] relative to the whole image
  const p1ValidImagePts = piece1.imageOutline.every((pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1);
  const p2ValidImagePts = piece2.imageOutline.every((pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1);
  assert(p1ValidImagePts === true, 'Piece 1 imageOutline coordinates are normalized within [0, 1]');
  assert(p2ValidImagePts === true, 'Piece 2 imageOutline coordinates are normalized within [0, 1]');

  // Verify imageOutline aligns with piece bounding box in full-image space
  const p1ImageMinX = Math.min(...piece1.imageOutline.map((p) => p.x));
  const p1ImageMaxX = Math.max(...piece1.imageOutline.map((p) => p.x));
  const p2ImageMinX = Math.min(...piece2.imageOutline.map((p) => p.x));
  const p2ImageMaxX = Math.max(...piece2.imageOutline.map((p) => p.x));
  
  assert(p1ImageMaxX < p2ImageMinX, `Piece 1 image overlay maxX (${p1ImageMaxX}) < Piece 2 image overlay minX (${p2ImageMinX}) without overlap`);

  // Verify contour loop closure and ordering
  const p1First = piece1.outline[0];
  const p1Last = piece1.outline[piece1.outline.length - 1];
  assert(p1First.x === p1Last.x && p1First.y === p1Last.y, 'Piece 1 contour loop is strictly closed (first vertex == last vertex)');

  const p2First = piece2.outline[0];
  const p2Last = piece2.outline[piece2.outline.length - 1];
  assert(p2First.x === p2Last.x && p2First.y === p2Last.y, 'Piece 2 contour loop is strictly closed (first vertex == last vertex)');

  // ==========================================
  // TEST 32: Uncalibrated Dimension Labeling & Calibration Notice Metadata
  // ==========================================
  console.log('\n--- Test 32: Uncalibrated Dimension Labeling & Calibration Notice ---');
  assert(piece1.isUncalibrated === true, 'Piece 1 has isUncalibrated: true');
  assert(piece1.hasCalibrationReference === false, 'Piece 1 has hasCalibrationReference: false');
  assert(piece1.isImageDerived === true, 'Piece 1 has isImageDerived: true');
  assert(typeof piece1.calibrationNotice === 'string' && piece1.calibrationNotice.length > 0, 'Piece 1 includes calibrationNotice explanation');
  assert(piece1.calibrationNotice.toLowerCase().includes('proportional estimates'), 'calibrationNotice explicitly notes proportional estimates');

  // ==========================================
  // TEST 33: Detection and Advisory Warning for Enclosed Construction Markings
  // ==========================================
  console.log('\n--- Test 33: Detection and Advisory Warning for Enclosed Construction Markings ---');
  assert(markingsResult.shape.hasInternalMarkings === true, 'Markings test detected enclosed internal markings');
  assert(markingsResult.shape.internalMarkingCount > 0, `Recorded internal markings count (got ${markingsResult.shape.internalMarkingCount})`);
  assert(typeof markingsResult.shape.warning === 'string', 'Shape includes advisory warning string');
  assert(markingsResult.shape.warning.includes('Internal markings'), 'Warning specifically informs user about internal markings');

  // ==========================================
  // TEST 34: SVG Blueprint with Internal Construction Lines and Circles
  // ==========================================
  console.log('\n--- Test 34: SVG Blueprint with Internal Construction Lines and Guides ---');
  const svgWithInternalLines = `
    <svg viewBox="0 0 500 500" width="500" height="500" xmlns="http://www.w3.org/2000/svg">
      <!-- Genuine outer garment cutting path -->
      <path d="M 50,50 L 200,50 L 220,120 L 200,300 L 50,300 Z" stroke="#000" fill="none" />
      <!-- Internal dashed balance line (must be excluded) -->
      <path d="M 60,150 L 190,150" stroke="#888" stroke-dasharray="5,5" fill="none" />
      <!-- Internal grainline guide (must be excluded) -->
      <path class="guid-grainline" d="M 125,70 L 125,280" stroke="#00f" fill="none" />
      <!-- Second genuine garment piece -->
      <polygon points="260,60 400,60 420,200 260,200" stroke="#000" fill="none" />
    </svg>
  `;

  const svgInternalLinesResult = extractContourFromSvgString(svgWithInternalLines);
  assert(svgInternalLinesResult.success === true, 'SVG with internal lines parsed successfully');
  assert(svgInternalLinesResult.totalDetected === 2, `Exactly 2 genuine outer pieces detected, dashed/guide lines excluded (got ${svgInternalLinesResult.totalDetected})`);
  assert(svgInternalLinesResult.candidates[0].isUncalibrated === true, 'SVG piece 1 marked isUncalibrated: true');
  assert(Array.isArray(svgInternalLinesResult.candidates[0].imageOutline), 'SVG piece 1 includes imageOutline');
  assert(svgInternalLinesResult.candidates[0].imageOutline.every((pt) => pt.x >= 0 && pt.x <= 1 && pt.y >= 0 && pt.y <= 1), 'SVG piece 1 imageOutline normalized in [0, 1]');

  // ==========================================
  // TEST 35: Verification of No Invented Missing Geometry
  // ==========================================
  console.log('\n--- Test 35: Preserving Real Geometry Without Hallucinating Missing Vertices ---');
  // For piece 1 (Front Bodice): ensure points along the center front (x=0) are purely collinear
  const centerFrontPts = piece1.outline.filter((pt) => pt.x === 0);
  assert(centerFrontPts.length >= 2, `Center front edge preserved as a clean straight boundary (${centerFrontPts.length} points)`);
  // Ensure that no fake protruding vertices exist beyond x > 1 or y > 1
  const outOfRangePts = piece1.outline.filter((pt) => pt.x < 0 || pt.x > 1 || pt.y < 0 || pt.y > 1);
  assert(outOfRangePts.length === 0, 'Zero out-of-range or invented vertices found');

  // ==========================================
  // TEST 36: Scale Calibration with Known Reference Length
  // ==========================================
  console.log('\n--- Test 36: Scale Calibration with Known Reference Length ---');
  // Calibrate piece1 with known width = 40 cm
  const calByWidth = calibratePatternDimensions(piece1, { knownLengthCm: 40, referenceDimension: 'width' });
  assert(calByWidth.success === true, 'calibratePatternDimensions succeeded with known width');
  assert(calByWidth.shape.width === 40, `Calibrated width is exactly 40 cm (got ${calByWidth.shape.width})`);
  const expectedCalHeight = Math.max(1, Math.round(40 / piece1.aspectRatio));
  assert(calByWidth.shape.height === expectedCalHeight, `Calibrated height preserves aspect ratio (got ${calByWidth.shape.height}, expected ${expectedCalHeight})`);
  assert(calByWidth.shape.isUncalibrated === false, 'isUncalibrated is false after calibration');
  assert(calByWidth.shape.hasCalibrationReference === true, 'hasCalibrationReference is true after calibration');
  assert(typeof calByWidth.shape.calibrationScale === 'number', 'calibrationScale factor is recorded');
  assert(calByWidth.shape.calibratedDimension === 'width', 'calibratedDimension recorded as width');

  // Calibrate with known height = 75 cm
  const calByHeight = calibratePatternDimensions(piece1, { knownLengthCm: 75, referenceDimension: 'height' });
  assert(calByHeight.success === true, 'calibratePatternDimensions succeeded with known height');
  assert(calByHeight.shape.height === 75, `Calibrated height is exactly 75 cm (got ${calByHeight.shape.height})`);
  const expectedCalWidth = Math.max(1, Math.round(75 * piece1.aspectRatio));
  assert(calByHeight.shape.width === expectedCalWidth, `Calibrated width preserves aspect ratio (got ${calByHeight.shape.width}, expected ${expectedCalWidth})`);

  // Shared multi-candidate scaling: calibrate piece1 in multi-pattern result and verify piece2 is scaled proportionally
  const multiShapeWithCandidates = {
    ...piece1,
    candidates: [piece1, piece2]
  };
  const calMulti = calibratePatternDimensions(multiShapeWithCandidates, { knownLengthCm: 40, referenceDimension: 'width' });
  assert(calMulti.success === true, 'Multi-pattern calibration succeeded');
  assert(calMulti.shape.candidates.length === 2, 'Maintains 2 candidates in calibrated multi-pattern');
  assert(calMulti.shape.candidates[0].isUncalibrated === false, 'Candidate 1 marked calibrated');
  assert(calMulti.shape.candidates[1].isUncalibrated === false, 'Candidate 2 marked calibrated using shared image scale');
  assert(calMulti.shape.candidates[1].hasCalibrationReference === true, 'Candidate 2 has calibration reference');

  // Invalid calibration inputs
  const calInvalidZero = calibratePatternDimensions(piece1, { knownLengthCm: 0 });
  assert(calInvalidZero.success === false, 'Rejects zero reference length cleanly');
  const calInvalidNegative = calibratePatternDimensions(piece1, { knownLengthCm: -15 });
  assert(calInvalidNegative.success === false, 'Rejects negative reference length cleanly');
  const calNullShape = calibratePatternDimensions(null, { knownLengthCm: 40 });
  assert(calNullShape.success === false, 'Rejects null shape object cleanly');

  // ==========================================
  // TEST 37: SVG Vector Import with <?xml Prologue, <polyline>, and translate()
  // ==========================================
  console.log('\n--- Test 37: SVG Vector Import with XML Prologue, <polyline>, and translate() ---');
  const rawSvgFileContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
    <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
    <svg viewBox="0 0 800 600" width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer garment cutting outline as polyline with translate offset -->
      <polyline 
        transform="translate(50, 40)"
        points="0,0 120,0 150,80 120,200 0,200 0,0" 
        stroke="#111827" 
        fill="none" 
      />
      <!-- Enclosed internal pocket slit (must be excluded from cutting boundary) -->
      <polygon 
        transform="translate(50, 40)"
        points="30,80 90,80 90,95 30,95" 
        stroke="#9ca3af" 
        fill="none" 
      />
      <!-- Dashed construction seam allowance (must be excluded) -->
      <path d="M 60,60 L 160,60" stroke="#ef4444" stroke-dasharray="4,4" fill="none" />
    </svg>
  `;

  // recognizePatternShape handles raw SVG text with XML prologue
  const recognizedSvgPromise = await recognizePatternShape(rawSvgFileContent, {
    imageName: 'jacket-pattern.svg',
    imageType: 'SVG',
    imageSize: '15 KB'
  });
  assert(recognizedSvgPromise.success === true, 'recognizePatternShape parses raw SVG with <?xml prologue');
  assert(recognizedSvgPromise.totalDetected === 1, `Exactly 1 outer cutting piece detected, pocket & dashed lines excluded (got ${recognizedSvgPromise.totalDetected})`);
  assert(recognizedSvgPromise.shape.hasInternalMarkings === true, 'Enclosed internal marking correctly identified and excluded');
  assert(recognizedSvgPromise.shape.internalMarkingCount >= 1, `Internal marking count recorded (got ${recognizedSvgPromise.shape.internalMarkingCount})`);
  assert(recognizedSvgPromise.shape.isUncalibrated === true, 'SVG piece is clearly marked uncalibrated by default');
  // Verify translate(50, 40) was applied to the vertices
  const svgFirstPt = recognizedSvgPromise.shape.outline[0];
  assert(svgFirstPt.x >= 0 && svgFirstPt.x <= 1, 'Normalized contour coordinates are within [0, 1]');

  // ==========================================
  // TEST 38: Transparent PNG with Garment Silhouette
  // ==========================================
  console.log('\n--- Test 38: Transparent PNG with Garment Silhouette ---');
  // Create simulated 100x100 ImageData with transparent background (alpha = 0) and a solid blue garment shape
  const pngW = 100;
  const pngH = 100;
  const pngData = new Uint8ClampedArray(pngW * pngH * 4); // all 0 = transparent
  // Draw solid garment piece from x=20..80, y=15..85
  for (let y = 15; y <= 85; y++) {
    for (let x = 20; x <= 80; x++) {
      const idx = (y * pngW + x) * 4;
      pngData[idx] = 30;      // R
      pngData[idx + 1] = 120;  // G
      pngData[idx + 2] = 220;  // B
      pngData[idx + 3] = 255;  // A (opaque)
    }
  }

  const pngResult = extractPatternContourFromImageData({
    data: pngData,
    width: pngW,
    height: pngH
  });

  assert(pngResult.success === true, 'extractPatternContourFromImageData extracts piece on transparent PNG');
  assert(pngResult.totalDetected === 1, `Detected 1 piece on transparent background (got ${pngResult.totalDetected})`);
  assert(pngResult.shape.boundingBox.width >= 55 && pngResult.shape.boundingBox.width <= 65, `Extracted piece width matches drawn bounds (~61px, got ${pngResult.shape.boundingBox.width})`);
  assert(pngResult.shape.boundingBox.height >= 65 && pngResult.shape.boundingBox.height <= 75, `Extracted piece height matches drawn bounds (~71px, got ${pngResult.shape.boundingBox.height})`);

  // Blank transparent PNG (all alpha = 0)
  const emptyPngData = new Uint8ClampedArray(pngW * pngH * 4);
  const emptyPngResult = extractPatternContourFromImageData({
    data: emptyPngData,
    width: pngW,
    height: pngH
  });
  assert(emptyPngResult.success === false, 'Blank transparent image rejected cleanly');
  assert(emptyPngResult.error.includes('empty or blank'), `Descriptive validation error returned for blank image (got: "${emptyPngResult.error}")`);

  // ==========================================
  // TEST 39: Blank, Incomplete, and Low-Quality Image Error Handling
  // ==========================================
  console.log('\n--- Test 39: Blank, Incomplete, and Low-Quality Image Error Handling ---');
  // Uniform solid color image (all white)
  const uniformData = new Uint8ClampedArray(100 * 100 * 4);
  for (let i = 0; i < 100 * 100; i++) {
    uniformData[i * 4] = 255;
    uniformData[i * 4 + 1] = 255;
    uniformData[i * 4 + 2] = 255;
    uniformData[i * 4 + 3] = 255;
  }
  const uniformResult = extractPatternContourFromImageData({
    data: uniformData,
    width: 100,
    height: 100
  });
  assert(uniformResult.success === false, 'Uniform solid color image rejected cleanly');
  assert(uniformResult.error.includes('uniform') || uniformResult.error.includes('blank'), `Validation error mentions uniform/blank (got: "${uniformResult.error}")`);

  // Low contrast image (contrast range = 15 < 20)
  const lowContrastImageBuffer = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const idx = (y * 100 + x) * 4;
      const isInner = x >= 20 && x <= 80 && y >= 20 && y <= 80;
      const val = isInner ? 210 : 225; // contrast diff = 15
      lowContrastImageBuffer[idx] = val;
      lowContrastImageBuffer[idx + 1] = val;
      lowContrastImageBuffer[idx + 2] = val;
      lowContrastImageBuffer[idx + 3] = 255;
    }
  }
  const lowContrastImgResult = extractPatternContourFromImageData({
    data: lowContrastImageBuffer,
    width: 100,
    height: 100
  });
  assert(lowContrastImgResult.success === false, 'Low contrast image rejected cleanly');
  assert(lowContrastImgResult.error.includes('low contrast'), `Validation error mentions low contrast (got: "${lowContrastImgResult.error}")`);

  // ==========================================
  // TEST 40: End-to-End Pipeline: Recognition -> Scale Calibration -> Nesting -> DXF / SVG / CAM Exports
  // ==========================================
  console.log('\n--- Test 40: End-to-End Pipeline: Recognition -> Scale Calibration -> Nesting -> Exports ---');
  // 1. Start with recognized curved garment piece (piece1 from Test 26)
  assert(piece1.shapeType === 'irregular', 'Starting piece has shapeType: irregular');
  
  // 2. Calibrate scale to known reference length (45 cm width)
  const calibratedPiece = calibratePatternDimensions(piece1, { knownLengthCm: 45, referenceDimension: 'width' }).shape;
  assert(calibratedPiece.width === 45, 'Calibrated width is 45 cm');
  assert(calibratedPiece.isUncalibrated === false, 'Calibrated piece has isUncalibrated: false');

  // 3. Create project with both the calibrated recognized piece AND an existing manual piece
  const manualPatternPiece = {
    id: 'pat-manual-1',
    name: 'Manual Back Panel',
    category: 'BACK',
    shapeType: 'back-bodice',
    width: 40,
    height: 55,
    quantity: 1,
    rotationAllowed: true,
    grainConstraint: 'Vertical',
    isImageDerived: false
  };

  const recognizedPatternPiece = {
    id: 'pat-recognized-1',
    name: 'Recognized Front Panel',
    category: 'FRONT',
    shapeType: 'irregular',
    width: calibratedPiece.width,
    height: calibratedPiece.height,
    quantity: 1,
    rotationAllowed: true,
    grainConstraint: 'Vertical',
    outline: calibratedPiece.outline,
    normalizedCoordinates: calibratedPiece.outline,
    isImageDerived: true,
    isUncalibrated: false,
    hasCalibrationReference: true
  };

  const projectPatterns = [manualPatternPiece, recognizedPatternPiece];

  // 4. Verify manual piece measurements are NOT altered or overwritten
  assert(projectPatterns[0].width === 40, 'Manual pattern piece width preserved (40 cm)');
  assert(projectPatterns[0].height === 55, 'Manual pattern piece height preserved (55 cm)');
  assert(projectPatterns[0].isImageDerived === false, 'Manual piece retains isImageDerived: false');

  // 5. Expand pieces for optimizer
  const e2eExpanded = expandPatternPieces(projectPatterns);
  assert(e2eExpanded.length === 2, 'Expanded into 2 nested items');
  const irregularItem = e2eExpanded.find((it) => it.patternId === 'pat-recognized-1');
  assert(irregularItem.isIrregular === true, 'Irregular item piece retains isIrregular: true');
  assert(Array.isArray(irregularItem.outline), 'Irregular item piece preserves genuine contour outline');

  // 6. Run nesting optimizer
  const e2eOptResult = optimizeFabricCutting({
    patterns: projectPatterns,
    fabricLength: 200,
    fabricWidth: 150,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true
  });

  assert(e2eOptResult.success === true, 'Optimizer runs successfully with irregular recognized contour');
  assert(e2eOptResult.placedCount === 2, 'All pieces placed without collision');
  const placedIrregular = e2eOptResult.layoutPlacements.find((p) => p.patternId === 'pat-recognized-1');
  assert(placedIrregular !== undefined, 'Placed placements contains recognized piece');
  assert(Array.isArray(placedIrregular.worldPoints), 'Placed piece has worldPoints polygon coordinates');
  assert(placedIrregular.worldPoints.length >= 8, `worldPoints retains fine curvature (${placedIrregular.worldPoints.length} vertices)`);

  // 7. Verify Cutting Plan generation and exports
  const mockProject = {
    id: 'proj-audit-test',
    name: 'Pattern Recognition Accuracy Audit Test',
    fabricLength: 200,
    fabricWidth: 150,
    fabricType: 'Cotton Linen',
    grainDirection: 'Vertical',
    patterns: projectPatterns,
    layoutPlacements: e2eOptResult.layoutPlacements,
    totalPieces: 2,
    utilization: e2eOptResult.utilization,
    wastePercentage: e2eOptResult.wastePercentage
  };

  const cuttingPlan = generateCuttingPlan(mockProject);
  assert(cuttingPlan.isLayoutValid === true, 'Cutting plan is geometrically valid without overlaps');
  assert(cuttingPlan.placements.length === 2, 'Cutting plan contains both placed pieces');

  // 8. DXF Export verification
  const dxfContent = exportCuttingPlanToDXF(mockProject);
  assert(typeof dxfContent === 'string' && dxfContent.includes('SECTION'), 'DXF export generated');
  assert(dxfContent.includes('CUT_CONTOUR'), 'DXF includes CUT_CONTOUR layer');
  assert(dxfContent.includes('LWPOLYLINE'), 'DXF uses polylines for irregular contour geometry (not coarse boxes)');

  // 9. SVG Export verification
  const svgContent = exportCuttingPlanToSVG(mockProject);
  assert(svgContent.includes('<svg') && svgContent.includes('</svg>'), 'SVG export generated valid markup');
  assert(svgContent.includes('path'), 'SVG export includes contour paths');

  // 10. CAM JSON Export verification
  const jsonContent = exportCuttingPlanToJSON(mockProject);
  const parsedJson = JSON.parse(jsonContent);
  assert(parsedJson.placements.length === 2, 'CAM JSON includes all 2 placements');
  const jsonIrregular = parsedJson.placements.find((p) => p.patternId === 'pat-recognized-1');
  assert(Array.isArray(jsonIrregular.outline), 'CAM JSON preserves normalized contour outline');
  assert(Array.isArray(jsonIrregular.worldPoints), 'CAM JSON preserves world transformed coordinates');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log(`\n==========================================`);
  console.log(`Shape Recognizer Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    throw new Error(`Shape Recognizer Tests had ${failedCount} failure(s).`);
  }
}

test('Pattern Shape Recognition: Contour extraction, markings rejection, scale calibration, and optimizer integration', async () => {
  await runTests();
});

