/**
 * AI Fabric Cutter — Robust Pattern Shape Recognition Engine
 * 
 * Features:
 * - Multi-Pattern Connected-Component Analysis (CCA) to isolate separate pattern pieces in single reference images
 * - Line-drawn & hollow outline morphological gap-closing and interior hole-filling
 * - Moore-Neighbor boundary tracing to accurately extract real garment curves (armholes, necklines, sleeves, collars, hems)
 * - Curvature-preserving adaptive contour sampling (prevents coarse polygon/hexagon over-simplification)
 * - Strict rejection of page border frames, text labels, grainline markers, stray lines, and scattered noise specks
 * - Reliable failure messaging when multiple pattern pieces cannot be cleanly separated
 * - Independent boundary contour extraction and normalized [0, 1] coordinates for every detected pattern piece
 * - Resolution-independent scaling distinguishing image-derived metrics from manual production dimensions
 * - Pure client-side JavaScript implementation without external AI API dependencies
 */

import { calculatePolygonArea } from './polygonGeometry.js';

/**
 * 8-directional neighbor offsets in clockwise order:
 * 0: North (0, -1)
 * 1: North-East (1, -1)
 * 2: East (1, 0)
 * 3: South-East (1, 1)
 * 4: South (0, 1)
 * 5: South-West (-1, 1)
 * 6: West (-1, 0)
 * 7: North-West (-1, -1)
 */
const CLOCKWISE_DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 1, dy: 1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: -1, dy: -1 }
];

/**
 * Finds all 8-connected components in a binary grid.
 */
export function findConnectedComponents(grid, width, height) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const components = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const startIdx = y * width + x;
      if (grid[startIdx] === 1 && visited[startIdx] === 0) {
        // Start BFS for new component
        const pixels = [];
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let sumX = 0;
        let sumY = 0;

        const queue = [startIdx];
        visited[startIdx] = 1;
        let head = 0;

        while (head < queue.length) {
          const idx = queue[head++];
          const px = idx % width;
          const py = Math.floor(idx / width);

          pixels.push(idx);
          sumX += px;
          sumY += py;

          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;

          // 8-neighborhood
          for (let dy = -1; dy <= 1; dy++) {
            const ny = py + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = px + dx;
              if (nx < 0 || nx >= width) continue;

              const nIdx = ny * width + nx;
              if (grid[nIdx] === 1 && visited[nIdx] === 0) {
                visited[nIdx] = 1;
                queue.push(nIdx);
              }
            }
          }
        }

        const area = pixels.length;
        const boundWidth = maxX - minX + 1;
        const boundHeight = maxY - minY + 1;
        const bboxArea = boundWidth * boundHeight;
        const density = bboxArea > 0 ? area / bboxArea : 0;

        components.push({
          pixels,
          area,
          minX,
          maxX,
          minY,
          maxY,
          boundWidth,
          boundHeight,
          bboxArea,
          density,
          centerX: sumX / area,
          centerY: sumY / area
        });
      }
    }
  }

  return components;
}

/**
 * Detects if a large connected component actually consists of two separate garment pieces
 * kissing at a thin 1-2 pixel contact/isthmus, and cleanly severs the accidental bridge.
 */
export function separateKissingComponents(components, width, height) {
  const result = [];

  for (let c = 0; c < components.length; c++) {
    const comp = components[c];
    // Only test large components (area >= 500) that might be two pieces touching
    if (comp.area < 500 || comp.boundWidth < 30 || comp.boundHeight < 30) {
      result.push(comp);
      continue;
    }

    // Create local binary mask
    const padW = comp.boundWidth + 2;
    const padH = comp.boundHeight + 2;
    const local = new Uint8Array(padW * padH);

    for (let i = 0; i < comp.pixels.length; i++) {
      const idx = comp.pixels[i];
      const px = idx % width;
      const py = Math.floor(idx / width);
      const lx = px - comp.minX + 1;
      const ly = py - comp.minY + 1;
      local[ly * padW + lx] = 1;
    }

    // 1-pixel morphological erosion (orthogonal 4-connectivity)
    const eroded = new Uint8Array(padW * padH);
    for (let y = 1; y < padH - 1; y++) {
      for (let x = 1; x < padW - 1; x++) {
        const idx = y * padW + x;
        if (
          local[idx] === 1 &&
          local[(y - 1) * padW + x] === 1 &&
          local[(y + 1) * padW + x] === 1 &&
          local[y * padW + (x - 1)] === 1 &&
          local[y * padW + (x + 1)] === 1
        ) {
          eroded[idx] = 1;
        }
      }
    }

    // Find connected components on eroded mask
    const subComponents = findConnectedComponents(eroded, padW, padH);
    // Find significant sub-components (each having at least 15% of original area and area >= 120)
    const significantSubs = subComponents.filter((sc) => sc.area >= 120 && sc.area >= comp.area * 0.15);

    if (significantSubs.length >= 2) {
      // Accidental kissing contact detected!
      // Assign each original pixel to the nearest sub-component centroid
      const pieces = significantSubs.map(() => ({
        pixels: [],
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        sumX: 0,
        sumY: 0
      }));

      for (let i = 0; i < comp.pixels.length; i++) {
        const idx = comp.pixels[i];
        const px = idx % width;
        const py = Math.floor(idx / width);
        const lx = px - comp.minX + 1;
        const ly = py - comp.minY + 1;

        let bestSub = 0;
        let minDistSq = Infinity;
        for (let s = 0; s < significantSubs.length; s++) {
          const dSq = (lx - significantSubs[s].centerX) ** 2 + (ly - significantSubs[s].centerY) ** 2;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            bestSub = s;
          }
        }

        const pObj = pieces[bestSub];
        pObj.pixels.push(idx);
        pObj.sumX += px;
        pObj.sumY += py;
        if (px < pObj.minX) pObj.minX = px;
        if (px > pObj.maxX) pObj.maxX = px;
        if (py < pObj.minY) pObj.minY = py;
        if (py > pObj.maxY) pObj.maxY = py;
      }

      for (let s = 0; s < pieces.length; s++) {
        const pObj = pieces[s];
        if (pObj.pixels.length >= 80) {
          const bW = pObj.maxX - pObj.minX + 1;
          const bH = pObj.maxY - pObj.minY + 1;
          result.push({
            pixels: pObj.pixels,
            area: pObj.pixels.length,
            minX: pObj.minX,
            maxX: pObj.maxX,
            minY: pObj.minY,
            maxY: pObj.maxY,
            boundWidth: bW,
            boundHeight: bH,
            bboxArea: bW * bH,
            density: (bW * bH > 0) ? pObj.pixels.length / (bW * bH) : 0,
            centerX: pObj.sumX / pObj.pixels.length,
            centerY: pObj.sumY / pObj.pixels.length
          });
        }
      }
    } else {
      result.push(comp);
    }
  }

  return result;
}

/**
 * Bridges minor gaps (1-3 pixels) in local binary masks without inventing missing geometry.
 * Connects stroke endpoints or small gaps where opposing pixels are foreground.
 */
function bridgeMinorGaps(localMask, width, height) {
  const result = new Uint8Array(localMask);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (result[idx] === 0) {
        // Check horizontal gap [1, 0, 1]
        const left = localMask[y * width + (x - 1)];
        const right = localMask[y * width + (x + 1)];
        if (left === 1 && right === 1) {
          result[idx] = 1;
          continue;
        }

        // Check vertical gap
        const top = localMask[(y - 1) * width + x];
        const bottom = localMask[(y + 1) * width + x];
        if (top === 1 && bottom === 1) {
          result[idx] = 1;
          continue;
        }

        // Check 2-pixel horizontal gap [1, 0, 0, 1]
        if (x + 2 < width - 1) {
          const right2 = localMask[y * width + (x + 2)];
          if (left === 1 && right2 === 1) {
            result[idx] = 1;
            result[y * width + (x + 1)] = 1;
            continue;
          }
        }

        // Check 2-pixel vertical gap
        if (y + 2 < height - 1) {
          const bottom2 = localMask[(y + 2) * width + x];
          if (top === 1 && bottom2 === 1) {
            result[idx] = 1;
            result[(y + 1) * width + x] = 1;
            continue;
          }
        }

        // Check 3-pixel horizontal gap [1, 0, 0, 0, 1] (dashed line gap bridging)
        if (x + 3 < width - 1) {
          const right3 = localMask[y * width + (x + 3)];
          if (left === 1 && right3 === 1) {
            result[idx] = 1;
            result[y * width + (x + 1)] = 1;
            result[y * width + (x + 2)] = 1;
            continue;
          }
        }

        // Check 3-pixel vertical gap
        if (y + 3 < height - 1) {
          const bottom3 = localMask[(y + 3) * width + x];
          if (top === 1 && bottom3 === 1) {
            result[idx] = 1;
            result[(y + 1) * width + x] = 1;
            result[(y + 2) * width + x] = 1;
            continue;
          }
        }

        // Diagonal gap checks
        const tl = localMask[(y - 1) * width + (x - 1)];
        const br = localMask[(y + 1) * width + (x + 1)];
        if (tl === 1 && br === 1) {
          result[idx] = 1;
          continue;
        }

        const tr = localMask[(y - 1) * width + (x + 1)];
        const bl = localMask[(y + 1) * width + (x - 1)];
        if (tr === 1 && bl === 1) {
          result[idx] = 1;
          continue;
        }
      }
    }
  }

  return result;
}

/**
 * Fills interior holes for a connected component (e.g. hollow line-drawn CAD outlines)
 * using background flood fill from outer bounding box margins.
 * 
 * If a component is an open line / incomplete boundary that does not enclose a region,
 * flood fill reaches both sides and enclosed area is zero.
 */
function fillComponentInterior(component, gridWidth) {
  const { minX, minY, boundWidth, boundHeight, pixels } = component;

  // Add 2px border padding around local component bounding box
  const padW = boundWidth + 4;
  const padH = boundHeight + 4;
  const localMask = new Uint8Array(padW * padH);

  for (let i = 0; i < pixels.length; i++) {
    const idx = pixels[i];
    const px = idx % gridWidth;
    const py = Math.floor(idx / gridWidth);
    const lx = px - minX + 2;
    const ly = py - minY + 2;
    localMask[ly * padW + lx] = 1;
  }

  // Bridge minor gaps in stroke lines (1-3 pixels)
  const closedMask = bridgeMinorGaps(localMask, padW, padH);

  // Flood fill external background starting from the 4 outer padded borders
  const isExterior = new Uint8Array(padW * padH);
  const queue = [];

  // Enqueue top and bottom borders
  for (let x = 0; x < padW; x++) {
    const topIdx = x;
    if (closedMask[topIdx] === 0 && isExterior[topIdx] === 0) {
      isExterior[topIdx] = 1;
      queue.push(topIdx);
    }
    const btmIdx = (padH - 1) * padW + x;
    if (closedMask[btmIdx] === 0 && isExterior[btmIdx] === 0) {
      isExterior[btmIdx] = 1;
      queue.push(btmIdx);
    }
  }

  // Enqueue left and right borders
  for (let y = 0; y < padH; y++) {
    const leftIdx = y * padW + 0;
    if (closedMask[leftIdx] === 0 && isExterior[leftIdx] === 0) {
      isExterior[leftIdx] = 1;
      queue.push(leftIdx);
    }
    const rightIdx = y * padW + (padW - 1);
    if (closedMask[rightIdx] === 0 && isExterior[rightIdx] === 0) {
      isExterior[rightIdx] = 1;
      queue.push(rightIdx);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % padW;
    const y = Math.floor(idx / padW);

    // 4-connectivity for background flood fill
    const neighbors = [
      { nx: x + 1, ny: y },
      { nx: x - 1, ny: y },
      { nx: x, ny: y + 1 },
      { nx: x, ny: y - 1 }
    ];

    for (let i = 0; i < 4; i++) {
      const { nx, ny } = neighbors[i];
      if (nx >= 0 && nx < padW && ny >= 0 && ny < padH) {
        const nIdx = ny * padW + nx;
        if (closedMask[nIdx] === 0 && isExterior[nIdx] === 0) {
          isExterior[nIdx] = 1;
          queue.push(nIdx);
        }
      }
    }
  }

  // Any pixel not reachable by exterior flood fill is part of the filled pattern (stroke + enclosed interior)
  const filledPixels = [];
  let sumX = 0;
  let sumY = 0;
  let enclosedHoleCount = 0;

  for (let ly = 2; ly < padH - 2; ly++) {
    for (let lx = 2; lx < padW - 2; lx++) {
      const lIdx = ly * padW + lx;
      if (isExterior[lIdx] === 0) {
        const gx = minX + (lx - 2);
        const gy = minY + (ly - 2);
        const gIdx = gy * gridWidth + gx;
        filledPixels.push(gIdx);
        sumX += gx;
        sumY += gy;

        if (localMask[lIdx] === 0) {
          enclosedHoleCount++;
        }
      }
    }
  }

  const filledArea = filledPixels.length;
  const bboxArea = boundWidth * boundHeight;
  const filledDensity = bboxArea > 0 ? filledArea / bboxArea : 0;
  const filledPixelSet = new Set(filledPixels);

  return {
    ...component,
    pixels: filledPixels.length > 0 ? filledPixels : pixels,
    filledPixelSet,
    area: filledArea > 0 ? filledArea : component.area,
    density: filledDensity > 0 ? filledDensity : component.density,
    centerX: filledPixels.length > 0 ? sumX / filledArea : component.centerX,
    centerY: filledPixels.length > 0 ? sumY / filledArea : component.centerY,
    enclosedHoleCount,
    isHollow: enclosedHoleCount > (pixels.length * 0.3)
  };
}

/**
 * Checks whether an inner component is physically enclosed inside a larger outer component's
 * filled region (e.g. internal text labels, grainline arrows, internal dart lines, stitch markings).
 *
 * @param {object} innerComp - Candidate component that may be an internal marking
 * @param {object} outerComp - Candidate outer garment pattern piece
 * @param {number} width - Grid width
 * @returns {boolean} True if innerComp is enclosed within outerComp
 */
export function isComponentEnclosed(innerComp, outerComp, width) {
  // 1. Inner component must have smaller area
  if (innerComp.area >= outerComp.area * 0.65) return false;

  // 2. Inner bounding box must be substantially within outer bounding box
  const margin = 2;
  if (
    innerComp.minX < outerComp.minX - margin ||
    innerComp.maxX > outerComp.maxX + margin ||
    innerComp.minY < outerComp.minY - margin ||
    innerComp.maxY > outerComp.maxY + margin
  ) {
    return false;
  }

  // 3. Test pixel containment against outer component's filled pixel set
  if (outerComp.filledPixelSet && outerComp.filledPixelSet.size > 0) {
    let insideCount = 0;
    const sampleLimit = Math.min(innerComp.pixels.length, 60);
    const step = Math.max(1, Math.floor(innerComp.pixels.length / sampleLimit));
    let testedCount = 0;

    for (let i = 0; i < innerComp.pixels.length; i += step) {
      testedCount++;
      if (outerComp.filledPixelSet.has(innerComp.pixels[i])) {
        insideCount++;
      }
    }
    return testedCount > 0 && (insideCount / testedCount) >= 0.7;
  }

  // Fallback: check center coordinates
  return (
    innerComp.centerX >= outerComp.minX &&
    innerComp.centerX <= outerComp.maxX &&
    innerComp.centerY >= outerComp.minY &&
    innerComp.centerY <= outerComp.maxY
  );
}

/**
 * Traces the exact outer perimeter of a connected component using Moore-Neighbor boundary tracing
 * with Jacob's stopping condition.
 * Accurately traces concave and curved features like armholes, necklines, sleeves, and collars.
 */
export function traceOuterBoundary(component, width) {
  const { minX, maxX, minY, maxY, boundWidth, boundHeight, pixels } = component;

  // Fallback for trivial or tiny components
  if (boundWidth <= 2 || boundHeight <= 2 || pixels.length <= 4) {
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
  }

  // Create padded local binary mask (2-pixel border around the component for safe border traversal)
  const padW = boundWidth + 4;
  const padH = boundHeight + 4;
  const mask = new Uint8Array(padW * padH);

  for (let i = 0; i < pixels.length; i++) {
    const idx = pixels[i];
    const px = idx % width;
    const py = Math.floor(idx / width);
    const lx = px - minX + 2;
    const ly = py - minY + 2;
    if (lx >= 0 && lx < padW && ly >= 0 && ly < padH) {
      mask[ly * padW + lx] = 1;
    }
  }

  // Find start pixel: scan top-to-bottom, left-to-right for the topmost-leftmost 1
  let startX = -1;
  let startY = -1;

  for (let y = 1; y < padH - 1; y++) {
    for (let x = 1; x < padW - 1; x++) {
      if (mask[y * padW + x] === 1) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) {
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
  }

  // Moore-Neighbor border tracing
  const contour = [];
  let curX = startX;
  let curY = startY;
  // Background neighbor of start is (startX, startY - 1), which is North (direction 0)
  let bgDir = 0;
  let firstNext = null;

  const maxSteps = padW * padH * 4;
  let steps = 0;

  while (steps < maxSteps) {
    contour.push({
      x: curX - 2 + minX,
      y: curY - 2 + minY
    });

    let foundNext = false;
    let nextX = curX;
    let nextY = curY;
    let nextBgDir = 0;
    let lastBgDir = bgDir;

    // Scan clockwise starting from the background neighbor
    for (let i = 0; i < 8; i++) {
      const d = (bgDir + i) % 8;
      const nx = curX + CLOCKWISE_DIRS[d].dx;
      const ny = curY + CLOCKWISE_DIRS[d].dy;

      if (nx >= 0 && nx < padW && ny >= 0 && ny < padH && mask[ny * padW + nx] === 1) {
        nextX = nx;
        nextY = ny;

        // Background neighbor for the next pixel is the last background pixel in this scan
        const prevBgX = curX + CLOCKWISE_DIRS[lastBgDir].dx;
        const prevBgY = curY + CLOCKWISE_DIRS[lastBgDir].dy;
        const ddx = prevBgX - nextX;
        const ddy = prevBgY - nextY;

        let foundDir = 0;
        for (let j = 0; j < 8; j++) {
          if (CLOCKWISE_DIRS[j].dx === ddx && CLOCKWISE_DIRS[j].dy === ddy) {
            foundDir = j;
            break;
          }
        }
        nextBgDir = foundDir;
        foundNext = true;
        break;
      } else {
        lastBgDir = d;
      }
    }

    if (!foundNext) {
      // Isolated single pixel
      break;
    }

    // Jacob's stopping condition: visited start pixel and the next step would repeat the first step
    if (steps === 0) {
      firstNext = { x: nextX, y: nextY };
    } else if (curX === startX && curY === startY && nextX === firstNext.x && nextY === firstNext.y) {
      break;
    }

    curX = nextX;
    curY = nextY;
    bgDir = nextBgDir;
    steps++;
  }

  if (contour.length < 3) {
    return [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ];
  }

  return contour;
}

/**
 * Computes perpendicular Euclidean distance from point P to line segment AB
 */
function perpendicularDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

/**
 * Ramer-Douglas-Peucker (RDP) curve simplification algorithm
 */
export function ramerDouglasPeucker(points, epsilon) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = ramerDouglasPeucker(points.slice(0, maxIdx + 1), epsilon);
    const right = ramerDouglasPeucker(points.slice(maxIdx), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [start, end];
  }
}

/**
 * Detects sharp corner and notch vertices along the raw perimeter
 * Uses a chord span window that bridges discrete pixel stair-steps.
 */
export function findCornerAndNotchIndices(points) {
  const corners = [];
  const n = points.length;
  if (n < 8) return corners;

  const k = Math.min(8, Math.max(3, Math.floor(n / 35)));

  for (let i = 0; i < n; i++) {
    const prev = points[(i - k + n) % n];
    const curr = points[i];
    const next = points[(i + k) % n];

    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);

    if (len1 > 1e-4 && len2 > 1e-4) {
      const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
      // Sharp turn (> 38 degrees) indicates a corner or notch
      if (dot < 0.788) {
        corners.push(i);
      }
    }
  }

  // Deduplicate consecutive detections within cluster window
  const dedup = [];
  for (let i = 0; i < corners.length; i++) {
    if (dedup.length === 0 || (corners[i] - dedup[dedup.length - 1] > Math.max(3, k))) {
      dedup.push(corners[i]);
    }
  }
  return dedup;
}

/**
 * Curvature-Preserving Adaptive Contour Simplification:
 * Preserves curved boundaries (necklines, armholes, bell-cap sleeves, curved hems)
 * and sharp corners/notches with high geometric fidelity while avoiding coarse polygon/hexagon over-simplification.
 * 
 * Partitions the closed perimeter into monotonic segments between anchor points/corners and simplifies
 * with adaptive RDP in strict perimeter order, completely preventing self-intersections and out-of-order vertices.
 */
export function simplifyAndNormalizeContour(rawContour, minX, maxX, minY, maxY, boundWidth, boundHeight) {
  if (!rawContour || rawContour.length < 3) {
    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 }
    ];
  }

  const n = rawContour.length;
  if (n <= 4) {
    const denomX = Math.max(1, boundWidth - 1);
    const denomY = Math.max(1, boundHeight - 1);
    const norm = rawContour.map((pt) => ({
      x: Number(Math.max(0, Math.min(1, (pt.x - minX) / denomX)).toFixed(4)),
      y: Number(Math.max(0, Math.min(1, (pt.y - minY) / denomY)).toFixed(4))
    }));
    if (norm[0].x !== norm[norm.length - 1].x || norm[0].y !== norm[norm.length - 1].y) {
      norm.push({ x: norm[0].x, y: norm[0].y });
    }
    return norm;
  }

  // 1. Find the point furthest from rawContour[0] to split the loop into two antipodal chains
  const p0 = rawContour[0];
  let maxDistSq = 0;
  let splitIdx = Math.floor(n / 2);

  for (let i = 1; i < n; i++) {
    const dSq = (rawContour[i].x - p0.x) ** 2 + (rawContour[i].y - p0.y) ** 2;
    if (dSq > maxDistSq) {
      maxDistSq = dSq;
      splitIdx = i;
    }
  }

  // 2. Identify sharp corners and notches along the perimeter
  const rawCorners = findCornerAndNotchIndices(rawContour);

  // 3. Adaptive epsilon tuned to preserve curves without pixel stair-step noise
  const maxDim = Math.max(boundWidth, boundHeight);
  const pixelEpsilon = Math.max(0.6, Math.min(1.8, maxDim * 0.0025));

  // Helper to simplify an ordered sequence of anchor segments along rawContour
  function simplifyAnchorSegments(anchorIdxs) {
    const pts = [];
    for (let i = 0; i < anchorIdxs.length - 1; i++) {
      const startI = anchorIdxs[i];
      const endI = anchorIdxs[i + 1];
      if (startI === endI) continue;

      let subSegment;
      if (endI > startI) {
        subSegment = rawContour.slice(startI, endI + 1);
      } else {
        // Wrap around point 0
        subSegment = rawContour.slice(startI).concat(rawContour.slice(0, endI + 1));
      }

      if (subSegment.length <= 2) {
        if (pts.length === 0) pts.push(subSegment[0]);
        pts.push(subSegment[subSegment.length - 1]);
      } else {
        const simp = ramerDouglasPeucker(subSegment, pixelEpsilon);
        const startOffset = pts.length === 0 ? 0 : 1;
        for (let s = startOffset; s < simp.length; s++) {
          pts.push(simp[s]);
        }
      }
    }
    return pts;
  }

  // Separate corners into chain1 (0 to splitIdx) and chain2 (splitIdx to n)
  const cChain1 = rawCorners.filter((c) => c > 0 && c < splitIdx).sort((a, b) => a - b);
  const cChain2 = rawCorners.filter((c) => c > splitIdx && c < n).sort((a, b) => a - b);

  const chain1Anchors = [0, ...cChain1, splitIdx];
  const chain2Anchors = [splitIdx, ...cChain2, 0];

  const simplified1 = simplifyAnchorSegments(chain1Anchors);
  const simplified2 = simplifyAnchorSegments(chain2Anchors);

  // Merge simplified chains (omitting duplicate midpoint and endpoints)
  let merged = simplified1;
  const startOffset2 = (simplified2.length > 0 && merged.length > 0 &&
    simplified2[0].x === merged[merged.length - 1].x &&
    simplified2[0].y === merged[merged.length - 1].y) ? 1 : 0;
  
  const endOffset2 = (simplified2.length > 0 && merged.length > 0 &&
    simplified2[simplified2.length - 1].x === merged[0].x &&
    simplified2[simplified2.length - 1].y === merged[0].y) ? simplified2.length - 1 : simplified2.length;

  for (let i = startOffset2; i < endOffset2; i++) {
    merged.push(simplified2[i]);
  }

  // Deduplicate consecutive identical vertices
  const cleanMerged = [];
  for (let i = 0; i < merged.length; i++) {
    const pt = merged[i];
    if (cleanMerged.length === 0 ||
        Math.hypot(pt.x - cleanMerged[cleanMerged.length - 1].x, pt.y - cleanMerged[cleanMerged.length - 1].y) > 0.01) {
      cleanMerged.push(pt);
    }
  }

  // Normalize points to [0, 1] relative to component bounding box
  const denomX = Math.max(1, boundWidth - 1);
  const denomY = Math.max(1, boundHeight - 1);

  const normalized = cleanMerged.map((pt) => ({
    x: Number(Math.max(0, Math.min(1, (pt.x - minX) / denomX)).toFixed(4)),
    y: Number(Math.max(0, Math.min(1, (pt.y - minY) / denomY)).toFixed(4))
  }));

  // Ensure closed loop
  if (normalized.length >= 3) {
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    if (first.x !== last.x || first.y !== last.y) {
      normalized.push({ x: first.x, y: first.y });
    }
  }

  // Fallback if simplification collapsed
  if (normalized.length < 4) {
    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 }
    ];
  }

  return normalized;
}

/**
 * Extracts a normalized outer polygon contour [0, 1] for a single connected component.
 */
export function extractContourForComponent(component, componentGrid, width, _height) {
  const { minX, maxX, minY, maxY, boundWidth, boundHeight } = component;
  const rawPerimeter = traceOuterBoundary(component, width);
  return simplifyAndNormalizeContour(rawPerimeter, minX, maxX, minY, maxY, boundWidth, boundHeight);
}

/**
 * Extracts outer polygon contours for separate garment pattern pieces from a 2D binary grid.
 * 
 * Supports:
 * - Multi-pattern sheets (detects multiple separate garment pattern pieces in a single image)
 * - Independent boundary contour extraction and normalized [0, 1] coordinates
 * - Hole-filling and gap-closing for hollow line-drawn CAD blueprints
 * - Real garment curves (armholes, necklines, sleeves, collars, curved hems)
 * - Strict rejection of page border frames, text labels, measurement lines, and scattered noise specks
 * - Reliable failure messaging when multiple pattern pieces cannot be reliably separated
 */
export function extractContourFromBinaryGrid(grid, width, height) {
  if (!grid || width <= 0 || height <= 0) {
    return {
      success: false,
      error: 'Invalid grid data.'
    };
  }

  const totalPixels = width * height;
  let rawForegroundCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (grid[i] === 1) rawForegroundCount++;
  }

  const foregroundRatio = rawForegroundCount / totalPixels;

  // Validation: empty image or completely solid filled image
  if (rawForegroundCount === 0 || foregroundRatio < 0.003) {
    return {
      success: false,
      error: 'No distinct pattern foreground detected in the image.'
    };
  }

  if (foregroundRatio > 0.985) {
    return {
      success: false,
      error: 'Image appears uniform or lacks clear pattern contrast.'
    };
  }

  // Make a working copy of grid to allow clean removal of full-page border frames
  const workGrid = new Uint8Array(grid);

  // Initial Connected Components
  const rawComponents = findConnectedComponents(workGrid, width, height);

  if (rawComponents.length === 0) {
    return {
      success: false,
      error: 'No distinct pattern foreground detected in the image.'
    };
  }

  // Detect and remove page border frames (frames spanning nearly the whole image with low density)
  let removedBorderFrame = false;
  for (let i = 0; i < rawComponents.length; i++) {
    const comp = rawComponents[i];
    const isPageFrame = comp.boundWidth >= width - 6 && comp.boundHeight >= height - 6 && comp.density < 0.25;
    if (isPageFrame) {
      for (let p = 0; p < comp.pixels.length; p++) {
        workGrid[comp.pixels[p]] = 0;
      }
      removedBorderFrame = true;
    }
  }

  // Re-run connected components if border frame was stripped
  const rawCleanComponents = removedBorderFrame 
    ? findConnectedComponents(workGrid, width, height) 
    : rawComponents;

  if (rawCleanComponents.length === 0) {
    return {
      success: false,
      error: 'Detected shapes appear fragmented or noisy without distinct garment pattern boundaries.'
    };
  }

  // Sever any accidental 1-2 pixel bridges/bottlenecks between kissing garment pieces
  const allComponents = separateKissingComponents(rawCleanComponents, width, height);

  // Process and fill hollow line-drawn patterns (e.g. CAD blueprints or scanned line drawings)
  const filledComponents = allComponents.map((comp) => fillComponentInterior(comp, width));

  // Distinguish outer cutting boundary from internal markings (stitching lines, dashed lines, labels, arrows, darts):
  // Check if any component is physically enclosed within another larger component.
  const isEnclosed = new Array(filledComponents.length).fill(false);
  for (let i = 0; i < filledComponents.length; i++) {
    for (let j = 0; j < filledComponents.length; j++) {
      if (i === j) continue;
      if (filledComponents[i].area > filledComponents[j].area && isComponentEnclosed(filledComponents[j], filledComponents[i], width)) {
        isEnclosed[j] = true;
      }
    }
  }

  // Filter out internal markings from piece candidates and cluster count
  const externalFilledComponents = filledComponents.filter((_, idx) => !isEnclosed[idx]);

  // Minimum area thresholds to filter out isolated text characters, button marks, notch ticks, and noise specks
  const minAreaThreshold = Math.max(30, Math.min(200, totalPixels * 0.005));

  // Find max filled area among external components
  let maxArea = 0;
  for (let i = 0; i < externalFilledComponents.length; i++) {
    const comp = externalFilledComponents[i];
    const isFrame = comp.boundWidth >= width - 6 && comp.boundHeight >= height - 6 && comp.density < 0.25;
    if (!isFrame && comp.area > maxArea) {
      maxArea = comp.area;
    }
  }

  const relativeAreaThreshold = maxArea * 0.04; // at least 4% of largest piece

  const validComponents = externalFilledComponents.filter((comp) => {
    // Page border frame check
    if (comp.boundWidth >= width - 6 && comp.boundHeight >= height - 6 && comp.density < 0.25) {
      return false;
    }

    // Minimum area check (rejects scattered noise specks and small text characters)
    if (comp.area < minAreaThreshold && comp.area < relativeAreaThreshold) {
      return false;
    }

    // Minimum bounding dimension check (must be a 2D garment piece, not a 1px stray line or dot)
    if (comp.boundWidth < 12 || comp.boundHeight < 12) {
      return false;
    }

    // Extreme aspect ratio line check (e.g. single long grainline arrow or ruler line with no interior)
    const aspect = comp.boundWidth / comp.boundHeight;
    if ((aspect > 20 || aspect < 0.05) && comp.density < 0.2) {
      return false;
    }

    // Incomplete / Open Line Boundary check:
    // A genuine pattern piece (whether solid or hollow filled) must enclose a 2D area.
    // If a component was a thin stroke with no enclosed interior and low density, reject as incomplete boundary.
    if (!comp.isHollow && comp.enclosedHoleCount === 0 && comp.density < 0.08 && (comp.boundWidth > 30 || comp.boundHeight > 30)) {
      return false;
    }

    return true;
  });

  // Check if multiple pieces were present in image but could not be cleanly separated:
  // Identify count of significant foreground clusters before filtering (excluding internal markings and thin single lines!)
  const significantClusterCount = externalFilledComponents.filter(
    (c) => c.boundWidth >= 16 && c.boundHeight >= 16 && c.area >= 120 &&
      !(c.boundWidth >= width - 6 && c.boundHeight >= height - 6) &&
      (c.boundWidth / c.boundHeight <= 15 && c.boundWidth / c.boundHeight >= 0.067)
  ).length;

  if (significantClusterCount > 1 && validComponents.length === 1) {
    return {
      success: false,
      error: 'Multiple pattern pieces could not be reliably separated. Please ensure clear spacing between pieces on a clean background.'
    };
  }

  // If no component passes the filter, check if the input was fragmented or noisy or broken boundary
  if (validComponents.length === 0) {
    const hasBrokenBoundary = allComponents.some(
      (c) => (c.boundWidth > 30 || c.boundHeight > 30) && c.density < 0.15
    );
    if (hasBrokenBoundary) {
      return {
        success: false,
        error: 'Pattern boundary appears incomplete or broken. Please ensure the outer cutting outline forms a continuous closed boundary, or adjust manual pattern dimensions.'
      };
    }
    return {
      success: false,
      error: 'Detected shapes appear fragmented or noisy without distinct garment pattern boundaries.'
    };
  }

  // Sort valid components spatially: primary by reading order (top-to-bottom, left-to-right)
  const sortedComponents = [...validComponents].sort((a, b) => {
    const yDiff = a.minY - b.minY;
    if (Math.abs(yDiff) > height * 0.15) return yDiff;
    return a.minX - b.minX;
  });

  const candidates = sortedComponents.map((comp, idx) => {
    const outline = extractContourForComponent(comp, workGrid, width, height);
    const aspectRatio = Number((comp.boundWidth / comp.boundHeight).toFixed(3));
    
    // Proportional reference dimensions in cm based on aspect ratio (with 50cm standard base dimension)
    const baseDim = 50;
    const pieceWidth = Math.round(aspectRatio >= 1 ? baseDim : baseDim * aspectRatio);
    const pieceHeight = Math.round(aspectRatio < 1 ? baseDim : baseDim / aspectRatio);

    const categoryNames = ['FRONT', 'BACK', 'SLEEVE', 'COLLAR', 'CUFF', 'POCKET'];
    const assignedCategory = categoryNames[idx % categoryNames.length];

    const polygonAreaNorm = calculatePolygonArea(outline);

    // Compute image-space normalized coordinates [0, 1] across the full image for pixel-accurate overlay comparison
    const denomX = Math.max(1, comp.boundWidth - 1);
    const denomY = Math.max(1, comp.boundHeight - 1);
    const imageOutline = outline.map((pt) => ({
      x: Number(Math.max(0, Math.min(1, (comp.minX + pt.x * denomX) / width)).toFixed(4)),
      y: Number(Math.max(0, Math.min(1, (comp.minY + pt.y * denomY) / height)).toFixed(4))
    }));

    // Detect if internal markings (dashed lines, circles, labels, darts) were enclosed inside this component
    const enclosedMarkings = filledComponents.filter(
      (c, cIdx) => isEnclosed[cIdx] && isComponentEnclosed(c, comp, width)
    );
    const hasInternalMarkings = enclosedMarkings.length > 0;
    const internalMarkingCount = enclosedMarkings.length;

    let warning = null;
    if (hasInternalMarkings) {
      warning = `Internal markings (${internalMarkingCount} detected: dashed lines, circular markings, or labels) were filtered from the cutting boundary. Please verify the overlay contour matches your pattern before cutting.`;
    }

    return {
      id: `pattern-${idx + 1}`,
      name: `Pattern Piece ${idx + 1}`,
      category: assignedCategory,
      shapeType: 'irregular',
      outline,
      contour: outline,
      normalizedCoordinates: outline,
      imageOutline,
      imageBoundingBox: {
        minX: Number((comp.minX / width).toFixed(4)),
        maxX: Number((comp.maxX / width).toFixed(4)),
        minY: Number((comp.minY / height).toFixed(4)),
        maxY: Number((comp.maxY / height).toFixed(4))
      },
      pointCount: outline.length,
      pixelWidth: comp.boundWidth,
      pixelHeight: comp.boundHeight,
      boundingBox: {
        minX: comp.minX,
        maxX: comp.maxX,
        minY: comp.minY,
        maxY: comp.maxY,
        width: comp.boundWidth,
        height: comp.boundHeight
      },
      aspectRatio,
      pixelArea: comp.area,
      areaRatio: Number((comp.area / totalPixels).toFixed(4)),
      polygonAreaNormalized: Number(polygonAreaNorm.toFixed(4)),
      width: pieceWidth,
      height: pieceHeight,
      isImageDerived: true,
      hasCalibrationReference: false,
      isUncalibrated: true,
      hasInternalMarkings,
      internalMarkingCount,
      warning,
      calibrationNotice: 'Dimensions are proportional estimates based on aspect ratio without calibration reference. Please verify or input manual dimensions.'
    };
  });

  // Verify that all extracted candidates have valid, non-collapsed contours
  const validCandidates = candidates.filter(
    (c) => c.pointCount >= 4 && c.polygonAreaNormalized > 0.02
  );

  if (validCandidates.length === 0) {
    return {
      success: false,
      error: 'Extracted pattern boundaries are incomplete or degenerate.'
    };
  }

  // If the image contained multiple pieces but one or more were incomplete or collapsed,
  // do not falsely report single pattern success. Return a clear separation failure message.
  if (candidates.length > 1 && validCandidates.length < candidates.length) {
    return {
      success: false,
      error: 'Multiple pattern pieces could not be reliably separated. One or more pattern boundaries appear incomplete or broken.'
    };
  }

  return {
    success: true,
    shape: validCandidates[0],
    candidates: validCandidates,
    totalDetected: validCandidates.length,
    isMultiPattern: validCandidates.length > 1
  };
}

/**
 * Parses SVG path data string (d attribute) into an array of 2D points.
 * Supports M, L, H, V, C, S, Q, T, A, Z commands (both absolute and relative).
 */
export function parseSvgPathToPoints(dStr, curveSteps = 10) {
  if (!dStr || typeof dStr !== 'string') return [];

  const points = [];
  const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCommand = '';

  let match;
  while ((match = commandRegex.exec(dStr)) !== null) {
    const cmd = match[1];
    const isRel = cmd === cmd.toLowerCase();
    const type = cmd.toUpperCase();
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !isNaN(n));

    let i = 0;
    while (i < args.length || (type === 'Z' && i === 0)) {
      if (type === 'M') {
        const x = isRel ? curX + args[i] : args[i];
        const y = isRel ? curY + args[i + 1] : args[i + 1];
        curX = x;
        curY = y;
        startX = x;
        startY = y;
        points.push({ x, y });
        i += 2;
        while (i < args.length) {
          const lx = isRel ? curX + args[i] : args[i];
          const ly = isRel ? curY + args[i + 1] : args[i + 1];
          curX = lx;
          curY = ly;
          points.push({ x: lx, y: ly });
          i += 2;
        }
      } else if (type === 'L') {
        const x = isRel ? curX + args[i] : args[i];
        const y = isRel ? curY + args[i + 1] : args[i + 1];
        curX = x;
        curY = y;
        points.push({ x, y });
        i += 2;
      } else if (type === 'H') {
        const x = isRel ? curX + args[i] : args[i];
        curX = x;
        points.push({ x: curX, y: curY });
        i += 1;
      } else if (type === 'V') {
        const y = isRel ? curY + args[i] : args[i];
        curY = y;
        points.push({ x: curX, y: curY });
        i += 1;
      } else if (type === 'C') {
        const cp1x = isRel ? curX + args[i] : args[i];
        const cp1y = isRel ? curY + args[i + 1] : args[i + 1];
        const cp2x = isRel ? curX + args[i + 2] : args[i + 2];
        const cp2y = isRel ? curY + args[i + 3] : args[i + 3];
        const endX = isRel ? curX + args[i + 4] : args[i + 4];
        const endY = isRel ? curY + args[i + 5] : args[i + 5];

        for (let s = 1; s <= curveSteps; s++) {
          const t = s / curveSteps;
          const inv = 1 - t;
          const px = inv * inv * inv * curX + 3 * inv * inv * t * cp1x + 3 * inv * t * t * cp2x + t * t * t * endX;
          const py = inv * inv * inv * curY + 3 * inv * inv * t * cp1y + 3 * inv * t * t * cp2y + t * t * t * endY;
          points.push({ x: Number(px.toFixed(2)), y: Number(py.toFixed(2)) });
        }

        lastControlX = cp2x;
        lastControlY = cp2y;
        curX = endX;
        curY = endY;
        i += 6;
      } else if (type === 'S') {
        const cp1x = (lastCommand === 'C' || lastCommand === 'S') ? 2 * curX - lastControlX : curX;
        const cp1y = (lastCommand === 'C' || lastCommand === 'S') ? 2 * curY - lastControlY : curY;
        const cp2x = isRel ? curX + args[i] : args[i];
        const cp2y = isRel ? curY + args[i + 1] : args[i + 1];
        const endX = isRel ? curX + args[i + 2] : args[i + 2];
        const endY = isRel ? curY + args[i + 3] : args[i + 3];

        for (let s = 1; s <= curveSteps; s++) {
          const t = s / curveSteps;
          const inv = 1 - t;
          const px = inv * inv * inv * curX + 3 * inv * inv * t * cp1x + 3 * inv * t * t * cp2x + t * t * t * endX;
          const py = inv * inv * inv * curY + 3 * inv * inv * t * cp1y + 3 * inv * t * t * cp2y + t * t * t * endY;
          points.push({ x: Number(px.toFixed(2)), y: Number(py.toFixed(2)) });
        }

        lastControlX = cp2x;
        lastControlY = cp2y;
        curX = endX;
        curY = endY;
        i += 4;
      } else if (type === 'Q') {
        const cpx = isRel ? curX + args[i] : args[i];
        const cpy = isRel ? curY + args[i + 1] : args[i + 1];
        const endX = isRel ? curX + args[i + 2] : args[i + 2];
        const endY = isRel ? curY + args[i + 3] : args[i + 3];

        for (let s = 1; s <= curveSteps; s++) {
          const t = s / curveSteps;
          const inv = 1 - t;
          const px = inv * inv * curX + 2 * inv * t * cpx + t * t * endX;
          const py = inv * inv * curY + 2 * inv * t * cpy + t * t * endY;
          points.push({ x: Number(px.toFixed(2)), y: Number(py.toFixed(2)) });
        }

        lastControlX = cpx;
        lastControlY = cpy;
        curX = endX;
        curY = endY;
        i += 4;
      } else if (type === 'T') {
        const cpx = (lastCommand === 'Q' || lastCommand === 'T') ? 2 * curX - lastControlX : curX;
        const cpy = (lastCommand === 'Q' || lastCommand === 'T') ? 2 * curY - lastControlY : curY;
        const endX = isRel ? curX + args[i] : args[i];
        const endY = isRel ? curY + args[i + 1] : args[i + 1];

        for (let s = 1; s <= curveSteps; s++) {
          const t = s / curveSteps;
          const inv = 1 - t;
          const px = inv * inv * curX + 2 * inv * t * cpx + t * t * endX;
          const py = inv * inv * curY + 2 * inv * t * cpy + t * t * endY;
          points.push({ x: Number(px.toFixed(2)), y: Number(py.toFixed(2)) });
        }

        lastControlX = cpx;
        lastControlY = cpy;
        curX = endX;
        curY = endY;
        i += 2;
      } else if (type === 'A') {
        const endX = isRel ? curX + args[i + 5] : args[i + 5];
        const endY = isRel ? curY + args[i + 6] : args[i + 6];
        curX = endX;
        curY = endY;
        points.push({ x: curX, y: curY });
        i += 7;
      } else if (type === 'Z') {
        curX = startX;
        curY = startY;
        points.push({ x: curX, y: curY });
        break;
      } else {
        break;
      }
    }
    lastCommand = type;
  }

  return points;
}

/**
 * Parses SVG blueprint string directly to extract pattern boundary contours from vector paths, polygons, and rects.
 * Distinguishes outer cutting boundary from internal markings (dashed stitching lines, darts, grainline arrows, text).
 */
export function extractContourFromSvgString(svgText) {
  if (!svgText || typeof svgText !== 'string' || !svgText.includes('<svg')) {
    return {
      success: false,
      error: 'Invalid or empty SVG content.'
    };
  }

  // Parse SVG canvas dimensions for imageOutline mapping
  let svgW = 1000;
  let svgH = 1000;
  const vbM = /viewBox="([^"]+)"/i.exec(svgText);
  if (vbM) {
    const parts = vbM[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
      svgW = parts[2];
      svgH = parts[3];
    }
  } else {
    const wM = /<svg[^>]*\bwidth="([^"]+)"/i.exec(svgText);
    const hM = /<svg[^>]*\bheight="([^"]+)"/i.exec(svgText);
    if (wM && hM) {
      const parsedW = parseFloat(wM[1]);
      const parsedH = parseFloat(hM[1]);
      if (parsedW > 0 && parsedH > 0) {
        svgW = parsedW;
        svgH = parsedH;
      }
    }
  }

  const parseTranslate = (attrs) => {
    const tm = /transform="[^"]*translate\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/i.exec(attrs);
    if (tm) {
      return {
        tx: parseFloat(tm[1]) || 0,
        ty: parseFloat(tm[2] !== undefined ? tm[2] : '0') || 0
      };
    }
    return { tx: 0, ty: 0 };
  };

  const isInternalSvgElement = (attrs) => {
    return (
      /stroke-dasharray/i.test(attrs) ||
      /stroke-dashoffset/i.test(attrs) ||
      /(?:class|id)="[^"]*(?:stitching|dart|grain|mark|guid|label|internal|notch|seam|hidden|axis|centerline)[^"]*"/i.test(attrs) ||
      /visibility="hidden"/i.test(attrs) ||
      /display="none"/i.test(attrs)
    );
  };

  let internalMarkingCount = 0;
  const dashedMatches = svgText.match(/stroke-dasharray/gi);
  if (dashedMatches) internalMarkingCount += dashedMatches.length;
  const guideMatches = svgText.match(/(?:stitching|dart|grain|mark|guid|label|internal|notch|seam)/gi);
  if (guideMatches) internalMarkingCount += guideMatches.length;

  const candidatePolygons = [];

  // 1. Rectangles: <rect ... />
  const rectRegex = /<rect\b([^>]*)\/?>/gi;
  let match;
  while ((match = rectRegex.exec(svgText)) !== null) {
    const attrs = match[1];
    if (isInternalSvgElement(attrs)) {
      internalMarkingCount++;
      continue;
    }
    const { tx, ty } = parseTranslate(attrs);
    const xM = /x="([^"]+)"/i.exec(attrs);
    const yM = /y="([^"]+)"/i.exec(attrs);
    const wM = /width="([^"]+)"/i.exec(attrs);
    const hM = /height="([^"]+)"/i.exec(attrs);
    if (wM && hM) {
      const x = (parseFloat(xM ? xM[1] : 0) || 0) + tx;
      const y = (parseFloat(yM ? yM[1] : 0) || 0) + ty;
      const w = parseFloat(wM[1]) || 0;
      const h = parseFloat(hM[1]) || 0;
      if (w >= 10 && h >= 10) {
        candidatePolygons.push([
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
          { x, y }
        ]);
      }
    }
  }

  // 2. Polygons: <polygon points="..." />
  const polyRegex = /<polygon\b([^>]*)\/?>/gi;
  while ((match = polyRegex.exec(svgText)) !== null) {
    const attrs = match[1];
    if (isInternalSvgElement(attrs)) {
      internalMarkingCount++;
      continue;
    }
    const { tx, ty } = parseTranslate(attrs);
    const ptsM = /points="([^"]+)"/i.exec(attrs);
    if (ptsM) {
      const numbers = ptsM[1].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
      const pts = [];
      for (let i = 0; i < numbers.length - 1; i += 2) {
        pts.push({ x: numbers[i] + tx, y: numbers[i + 1] + ty });
      }
      if (pts.length >= 3) {
        candidatePolygons.push(pts);
      }
    }
  }

  // 3. Polylines: <polyline points="..." />
  const polylineRegex = /<polyline\b([^>]*)\/?>/gi;
  while ((match = polylineRegex.exec(svgText)) !== null) {
    const attrs = match[1];
    if (isInternalSvgElement(attrs)) {
      internalMarkingCount++;
      continue;
    }
    const { tx, ty } = parseTranslate(attrs);
    const ptsM = /points="([^"]+)"/i.exec(attrs);
    if (ptsM) {
      const numbers = ptsM[1].trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
      const pts = [];
      for (let i = 0; i < numbers.length - 1; i += 2) {
        pts.push({ x: numbers[i] + tx, y: numbers[i + 1] + ty });
      }
      if (pts.length >= 3) {
        candidatePolygons.push(pts);
      }
    }
  }

  // 4. Paths: <path d="..." />
  const pathRegex = /<path\b([^>]*)\/?>/gi;
  while ((match = pathRegex.exec(svgText)) !== null) {
    const attrs = match[1];
    if (isInternalSvgElement(attrs)) {
      internalMarkingCount++;
      continue;
    }
    const { tx, ty } = parseTranslate(attrs);
    const dM = /d="([^"]+)"/i.exec(attrs);
    if (dM) {
      const pts = parseSvgPathToPoints(dM[1]);
      if (pts && pts.length >= 3) {
        const translatedPts = (tx !== 0 || ty !== 0)
          ? pts.map((p) => ({ x: p.x + tx, y: p.y + ty }))
          : pts;
        candidatePolygons.push(translatedPts);
      }
    }
  }

  if (candidatePolygons.length === 0) {
    return {
      success: false,
      error: 'No valid pattern paths or polygons found in the SVG blueprint.'
    };
  }

  // Enclosure check: identify and filter out internal paths enclosed within larger outer pieces
  const polyBoxes = candidatePolygons.map((pts) => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    return { minX, maxX, minY, maxY, w, h, area: w * h, pts };
  });

  const isPolyEnclosed = new Array(polyBoxes.length).fill(false);
  for (let i = 0; i < polyBoxes.length; i++) {
    for (let j = 0; j < polyBoxes.length; j++) {
      if (i === j) continue;
      const bOuter = polyBoxes[i];
      const bInner = polyBoxes[j];
      if (
        bOuter.area > bInner.area * 1.5 &&
        bInner.minX >= bOuter.minX - 2 &&
        bInner.maxX <= bOuter.maxX + 2 &&
        bInner.minY >= bOuter.minY - 2 &&
        bInner.maxY <= bOuter.maxY + 2
      ) {
        isPolyEnclosed[j] = true;
        internalMarkingCount++;
      }
    }
  }

  const externalPolygons = candidatePolygons.filter((_, idx) => !isPolyEnclosed[idx]);

  const validCandidates = [];
  for (let idx = 0; idx < externalPolygons.length; idx++) {
    const rawPts = externalPolygons[idx];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pt of rawPts) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }

    const boundWidth = maxX - minX;
    const boundHeight = maxY - minY;

    if (boundWidth < 12 || boundHeight < 12) continue;

    const denomX = Math.max(1, boundWidth);
    const denomY = Math.max(1, boundHeight);
    const outline = rawPts.map((pt) => ({
      x: Number(Math.max(0, Math.min(1, (pt.x - minX) / denomX)).toFixed(4)),
      y: Number(Math.max(0, Math.min(1, (pt.y - minY) / denomY)).toFixed(4))
    }));

    if (outline.length >= 3) {
      const f = outline[0];
      const l = outline[outline.length - 1];
      if (f.x !== l.x || f.y !== l.y) {
        outline.push({ x: f.x, y: f.y });
      }
    }

    const polygonAreaNorm = calculatePolygonArea(outline);
    if (polygonAreaNorm < 0.02) continue;

    const aspectRatio = Number((boundWidth / boundHeight).toFixed(3));
    const baseDim = 50;
    const pieceWidth = Math.round(aspectRatio >= 1 ? baseDim : baseDim * aspectRatio);
    const pieceHeight = Math.round(aspectRatio < 1 ? baseDim : baseDim / aspectRatio);
    const categoryNames = ['FRONT', 'BACK', 'SLEEVE', 'COLLAR', 'CUFF', 'POCKET'];
    const assignedCategory = categoryNames[validCandidates.length % categoryNames.length];

    const imageOutline = rawPts.map((pt) => ({
      x: Number(Math.max(0, Math.min(1, pt.x / svgW)).toFixed(4)),
      y: Number(Math.max(0, Math.min(1, pt.y / svgH)).toFixed(4))
    }));

    validCandidates.push({
      id: `pattern-${validCandidates.length + 1}`,
      name: `Pattern Piece ${validCandidates.length + 1}`,
      category: assignedCategory,
      shapeType: 'irregular',
      outline,
      contour: outline,
      normalizedCoordinates: outline,
      imageOutline,
      imageBoundingBox: {
        minX: Number((minX / svgW).toFixed(4)),
        maxX: Number((maxX / svgW).toFixed(4)),
        minY: Number((minY / svgH).toFixed(4)),
        maxY: Number((maxY / svgH).toFixed(4))
      },
      pointCount: outline.length,
      pixelWidth: Math.round(boundWidth),
      pixelHeight: Math.round(boundHeight),
      boundingBox: {
        minX: Math.round(minX),
        maxX: Math.round(maxX),
        minY: Math.round(minY),
        maxY: Math.round(maxY),
        width: Math.round(boundWidth),
        height: Math.round(boundHeight)
      },
      aspectRatio,
      pixelArea: Math.round(boundWidth * boundHeight * polygonAreaNorm),
      areaRatio: 1,
      polygonAreaNormalized: Number(polygonAreaNorm.toFixed(4)),
      width: pieceWidth,
      height: pieceHeight,
      isImageDerived: true,
      hasCalibrationReference: false,
      isUncalibrated: true,
      hasInternalMarkings: internalMarkingCount > 0,
      internalMarkingCount,
      warning: internalMarkingCount > 0 ? `Internal markings (${internalMarkingCount}) excluded from cutting boundary.` : null,
      calibrationNotice: 'Dimensions are proportional estimates based on aspect ratio without calibration reference. Please verify or input manual dimensions.'
    });
  }

  if (validCandidates.length === 0) {
    return {
      success: false,
      error: 'Extracted SVG shapes are incomplete or degenerate.'
    };
  }

  return {
    success: true,
    shape: validCandidates[0],
    candidates: validCandidates,
    totalDetected: validCandidates.length,
    isMultiPattern: validCandidates.length > 1
  };
}

/**
 * Calculates the optimal global binarization threshold using Otsu's method.
 * Maximizes between-class variance of the luminance distribution.
 */
export function calculateOtsuThreshold(luminance, alpha, totalPixels) {
  const histogram = new Int32Array(256);
  let validCount = 0;
  let totalLumSum = 0;

  for (let i = 0; i < totalPixels; i++) {
    if (!alpha || alpha[i] > 60) {
      const val = Math.min(255, Math.max(0, Math.round(luminance[i])));
      histogram[val]++;
      validCount++;
      totalLumSum += val;
    }
  }

  if (validCount === 0) return 128;

  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let bestThreshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = validCount - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const meanB = sumB / wB;
    const meanF = (totalLumSum - sumB) / wF;
    const meanDiff = meanB - meanF;
    const betweenVar = wB * wF * meanDiff * meanDiff;

    if (betweenVar > maxVar) {
      maxVar = betweenVar;
      bestThreshold = t;
    }
  }

  return bestThreshold;
}

/**
 * Analyzes an RGBA ImageData pixel buffer to extract pattern contours
 */
export function extractPatternContourFromImageData(imageData) {
  if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
    return {
      success: false,
      error: 'Invalid image data buffer.'
    };
  }

  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const luminance = new Float32Array(totalPixels);
  const alpha = new Uint8Array(totalPixels);

  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    alpha[i] = a;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    luminance[i] = lum;

    if (a > 30) {
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }
  }

  // Sample perimeter border pixels to reliably detect background luminance & polarity
  let borderLumSum = 0;
  let borderAlphaSum = 0;
  let borderTransparentCount = 0;
  let borderCount = 0;

  // Sample top and bottom rows
  for (let x = 0; x < width; x++) {
    borderLumSum += luminance[x];
    borderAlphaSum += alpha[x];
    if (alpha[x] < 50) borderTransparentCount++;
    borderLumSum += luminance[(height - 1) * width + x];
    borderAlphaSum += alpha[(height - 1) * width + x];
    if (alpha[(height - 1) * width + x] < 50) borderTransparentCount++;
    borderCount += 2;
  }
  // Sample left and right columns
  for (let y = 0; y < height; y++) {
    borderLumSum += luminance[y * width];
    borderAlphaSum += alpha[y * width];
    if (alpha[y * width] < 50) borderTransparentCount++;
    borderLumSum += luminance[y * width + (width - 1)];
    borderAlphaSum += alpha[y * width + (width - 1)];
    if (alpha[y * width + (width - 1)] < 50) borderTransparentCount++;
    borderCount += 2;
  }

  const avgBorderLum = borderCount > 0 ? borderLumSum / borderCount : 255;
  const avgBorderAlpha = borderCount > 0 ? borderAlphaSum / borderCount : 255;
  const isTransparentBg = avgBorderAlpha < 80 || (borderCount > 0 && (borderTransparentCount / borderCount) > 0.35);

  // Check if image is blank / empty
  let nonTransparentPixels = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (alpha[i] > 30) nonTransparentPixels++;
  }
  if (nonTransparentPixels < 50) {
    return {
      success: false,
      error: 'Image is empty or blank. No pattern pieces were detected.'
    };
  }

  // Check contrast
  const contrastRange = maxLum - minLum;
  if (!isTransparentBg && contrastRange < 20) {
    return {
      success: false,
      error: contrastRange < 6
        ? 'Image appears blank or has very low contrast (uniform color). No pattern boundary detected.'
        : 'Image has very low contrast. Pattern boundary cannot be clearly distinguished from background.'
    };
  }

  // Otsu's optimal binarization threshold
  const otsuThreshold = calculateOtsuThreshold(luminance, alpha, totalPixels);
  const isLightBackground = avgBorderLum > otsuThreshold;

  // Build binary grid: 1 = Foreground pattern, 0 = Background
  const binaryGrid = new Uint8Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const lumInt = Math.round(luminance[i]);
    if (isTransparentBg) {
      binaryGrid[i] = alpha[i] > 50 ? 1 : 0;
    } else if (isLightBackground) {
      // Light background: darker pixels (lines, markings, solid pieces) are foreground
      binaryGrid[i] = (lumInt <= otsuThreshold && alpha[i] > 60) ? 1 : 0;
    } else {
      // Dark background: lighter pixels are foreground
      binaryGrid[i] = (lumInt >= otsuThreshold && alpha[i] > 60) ? 1 : 0;
    }
  }

  return extractContourFromBinaryGrid(binaryGrid, width, height);
}

/**
 * Calibrates pattern dimensions from a known physical reference length (e.g. width or height in cm, or pixel scale factor).
 * Strictly preserves the detected contour, normalized coordinates, and aspect ratio.
 * 
 * @param {object} shape - Recognized pattern shape object
 * @param {object} options - Calibration options:
 *   - knownLengthCm: number (e.g., 45.0 cm)
 *   - referenceDimension: 'width' | 'height' (which dimension the known length corresponds to, default: 'width')
 *   - pixelsPerCm: optional direct scale factor (pixels / cm)
 * @returns {object} Calibrated shape object with exact physical dimensions and calibration status
 */
export function calibratePatternDimensions(shape, options = {}) {
  if (!shape) {
    return { success: false, error: 'No shape provided for calibration.' };
  }

  const { knownLengthCm, referenceDimension = 'width', pixelsPerCm } = options;

  let targetWidthCm = shape.width;
  let targetHeightCm = shape.height;
  let computedScale = null;

  const aspectRatio = shape.aspectRatio || (shape.pixelWidth && shape.pixelHeight ? shape.pixelWidth / shape.pixelHeight : 1);

  if (typeof pixelsPerCm === 'number' && pixelsPerCm > 0) {
    const pw = shape.pixelWidth || shape.boundingBox?.width || 100;
    const ph = shape.pixelHeight || shape.boundingBox?.height || 100;
    targetWidthCm = Math.max(1, Math.round(pw / pixelsPerCm));
    targetHeightCm = Math.max(1, Math.round(ph / pixelsPerCm));
    computedScale = Number(pixelsPerCm.toFixed(4));
  } else if (typeof knownLengthCm === 'number' && knownLengthCm > 0) {
    if (referenceDimension === 'height') {
      targetHeightCm = Math.max(1, Math.round(knownLengthCm));
      targetWidthCm = Math.max(1, Math.round(knownLengthCm * aspectRatio));
      if (shape.pixelHeight) {
        computedScale = Number((shape.pixelHeight / knownLengthCm).toFixed(4));
      }
    } else {
      // default reference dimension is 'width'
      targetWidthCm = Math.max(1, Math.round(knownLengthCm));
      targetHeightCm = Math.max(1, Math.round(knownLengthCm / aspectRatio));
      if (shape.pixelWidth) {
        computedScale = Number((shape.pixelWidth / knownLengthCm).toFixed(4));
      }
    }
  } else {
    return {
      success: false,
      error: 'Invalid calibration length. Please provide a positive reference measurement in cm.'
    };
  }

  // Update candidate list if multi-pattern
  const updatedCandidates = Array.isArray(shape.candidates)
    ? shape.candidates.map((c) => {
        if (c.id === shape.id) {
          return {
            ...c,
            width: targetWidthCm,
            height: targetHeightCm,
            isUncalibrated: false,
            hasCalibrationReference: true,
            calibrationScale: computedScale,
            calibratedDimension: referenceDimension,
            calibrationReferenceCm: knownLengthCm || null,
            calibrationNotice: `Calibrated with known ${referenceDimension} of ${knownLengthCm || targetWidthCm} cm.`
          };
        }
        if (computedScale && c.pixelWidth && c.pixelHeight) {
          const cW = Math.max(1, Math.round(c.pixelWidth / computedScale));
          const cH = Math.max(1, Math.round(c.pixelHeight / computedScale));
          return {
            ...c,
            width: cW,
            height: cH,
            isUncalibrated: false,
            hasCalibrationReference: true,
            calibrationScale: computedScale,
            calibrationNotice: `Calibrated with shared image scale (${computedScale} px/cm).`
          };
        }
        return c;
      })
    : undefined;

  const calibratedShape = {
    ...shape,
    width: targetWidthCm,
    height: targetHeightCm,
    isUncalibrated: false,
    hasCalibrationReference: true,
    calibrationScale: computedScale,
    calibratedDimension: referenceDimension,
    calibrationReferenceCm: knownLengthCm || null,
    calibrationNotice: `Calibrated with known ${referenceDimension} of ${knownLengthCm || targetWidthCm} cm.`,
    candidates: updatedCandidates || shape.candidates
  };

  return {
    success: true,
    shape: calibratedShape
  };
}

/**
 * High-level Browser/Async Image Recognizer
 * Loads an image from DataURL/Blob/SVG, downscales to standard size for noise filtering, and extracts piece contours
 */
export async function recognizePatternShape(imageUrl, sourceMeta = {}) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return {
      success: false,
      error: 'No image source provided for shape recognition.'
    };
  }

  const trimmed = imageUrl.trim();
  const isSvgString = (trimmed.startsWith('<svg') || (trimmed.startsWith('<') && trimmed.includes('<svg'))) &&
                      !trimmed.startsWith('data:') && !trimmed.startsWith('http:') && !trimmed.startsWith('https:') && !trimmed.startsWith('blob:');

  // Handle direct SVG string or SVG data URI inputs
  if (isSvgString) {
    const svgRes = extractContourFromSvgString(imageUrl);
    if (svgRes.success) {
      let finalShape = {
        ...svgRes.shape,
        candidates: svgRes.candidates,
        totalDetected: svgRes.totalDetected,
        isMultiPattern: svgRes.isMultiPattern,
        sourceImage: {
          name: sourceMeta.imageName || 'Pattern Blueprint (SVG)',
          type: 'SVG',
          size: sourceMeta.imageSize || 'Vector'
        },
        recognizedAt: new Date().toISOString()
      };

      if (sourceMeta.calibration && (sourceMeta.calibration.knownLengthCm > 0 || sourceMeta.calibration.pixelsPerCm > 0)) {
        const cal = calibratePatternDimensions(finalShape, sourceMeta.calibration);
        if (cal.success) finalShape = cal.shape;
      }

      return {
        ...svgRes,
        shape: finalShape,
        candidates: finalShape.candidates || svgRes.candidates
      };
    }
    return svgRes;
  } else if (imageUrl.startsWith('data:image/svg+xml')) {
    try {
      let svgText = '';
      if (imageUrl.includes(';base64,')) {
        const b64 = imageUrl.split(';base64,')[1];
        if (typeof atob === 'function') {
          svgText = atob(b64);
        } else if (typeof Buffer !== 'undefined') {
          svgText = Buffer.from(b64, 'base64').toString('utf-8');
        }
      } else {
        const commaIdx = imageUrl.indexOf(',');
        if (commaIdx !== -1) {
          svgText = decodeURIComponent(imageUrl.slice(commaIdx + 1));
        }
      }
      if (svgText && svgText.includes('<svg')) {
        const svgRes = extractContourFromSvgString(svgText);
        if (svgRes.success) {
          let finalShape = {
            ...svgRes.shape,
            candidates: svgRes.candidates,
            totalDetected: svgRes.totalDetected,
            isMultiPattern: svgRes.isMultiPattern,
            sourceImage: {
              name: sourceMeta.imageName || 'Pattern Blueprint (SVG)',
              type: 'SVG',
              size: sourceMeta.imageSize || 'Vector'
            },
            recognizedAt: new Date().toISOString()
          };

          if (sourceMeta.calibration && (sourceMeta.calibration.knownLengthCm > 0 || sourceMeta.calibration.pixelsPerCm > 0)) {
            const cal = calibratePatternDimensions(finalShape, sourceMeta.calibration);
            if (cal.success) finalShape = cal.shape;
          }

          return {
            ...svgRes,
            shape: finalShape,
            candidates: finalShape.candidates || svgRes.candidates
          };
        }
        return svgRes;
      }
    } catch {
      // Fall through to raster canvas
    }
  }

  // Handle environment without DOM Image/Canvas (fallback for non-browser unit tests)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      success: false,
      error: 'Shape recognition requires a browser environment.'
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // High-fidelity resolution (max 1024x1024) to accurately separate pieces and capture fine curves
        const maxDim = 1024;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (w <= 0 || h <= 0) {
          resolve({ success: false, error: 'Could not read image dimensions.' });
          return;
        }

        if (w > maxDim || h > maxDim) {
          if (w >= h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          resolve({ success: false, error: 'Could not initialize 2D canvas context.' });
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);

        const result = extractPatternContourFromImageData(imgData);

        if (result.success && result.shape) {
          let finalShape = {
            ...result.shape,
            candidates: result.candidates,
            totalDetected: result.totalDetected,
            isMultiPattern: result.isMultiPattern,
            sourceImage: {
              name: sourceMeta.imageName || 'Pattern Blueprint',
              type: sourceMeta.imageType || 'IMAGE',
              size: sourceMeta.imageSize || 'Uploaded File'
            },
            recognizedAt: new Date().toISOString()
          };

          if (sourceMeta.calibration && (sourceMeta.calibration.knownLengthCm > 0 || sourceMeta.calibration.pixelsPerCm > 0)) {
            const cal = calibratePatternDimensions(finalShape, sourceMeta.calibration);
            if (cal.success) finalShape = cal.shape;
          }

          resolve({
            success: true,
            shape: finalShape,
            candidates: finalShape.candidates || result.candidates,
            totalDetected: result.totalDetected,
            isMultiPattern: result.isMultiPattern
          });
        } else {
          resolve({
            success: false,
            error: result.error || 'Could not detect pattern boundary from the image.'
          });
        }
      } catch (err) {
        console.error('Error during shape recognition:', err);
        resolve({
          success: false,
          error: 'An error occurred while processing the pattern image.'
        });
      }
    };

    img.onerror = () => {
      resolve({
        success: false,
        error: 'Failed to load pattern image file for analysis.'
      });
    };

    img.src = imageUrl;
  });
}
