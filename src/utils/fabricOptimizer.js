import {
  calculatePolygonArea,
  transformNormalizedToWorldPolygon,
  checkPolygonCollision,
  checkPieceDefectCollision,
  isPolygonWithinFabric
} from './polygonGeometry.js';
import { getGarmentNormalizedOutline } from './garmentGeometry.js';


/**
 * Validates input parameters for fabric optimization
 */
export function validateOptimizationInput(params) {
  const errors = [];

  if (!params) {
    return { isValid: false, errors: ['No optimization parameters provided.'] };
  }

  const { fabricWidth, fabricLength, patterns } = params;

  if (typeof fabricWidth !== 'number' || isNaN(fabricWidth) || fabricWidth <= 0) {
    errors.push('Fabric width must be a positive number.');
  }

  if (typeof fabricLength !== 'number' || isNaN(fabricLength) || fabricLength <= 0) {
    errors.push('Fabric length must be a positive number.');
  }

  if (!Array.isArray(patterns) || patterns.length === 0) {
    errors.push('At least one pattern piece is required.');
  } else {
    patterns.forEach((pat, idx) => {
      if (!pat.width || pat.width <= 0) {
        errors.push(`Pattern #${idx + 1} (${pat.name || 'Untitled'}) has invalid width.`);
      }
      if (!pat.height || pat.height <= 0) {
        errors.push(`Pattern #${idx + 1} (${pat.name || 'Untitled'}) has invalid height.`);
      }
      if (!pat.quantity || pat.quantity <= 0) {
        errors.push(`Pattern #${idx + 1} (${pat.name || 'Untitled'}) has invalid quantity.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Checks if two rectangular pieces overlap considering clearance spacing
 */
export function checkOverlap(rect1, rect2, spacing = 0) {
  // rect format: { x, y, width, height }
  const s = Math.max(0, Number(spacing) || 0);
  const eps = 1e-4;
  const r1Right = rect1.x + rect1.width + s;
  const r1Bottom = rect1.y + rect1.height + s;
  const r2Right = rect2.x + rect2.width + s;
  const r2Bottom = rect2.y + rect2.height + s;

  return !(
    rect1.x >= r2Right - eps ||
    r1Right <= rect2.x + eps ||
    rect1.y >= r2Bottom - eps ||
    r1Bottom <= rect2.y + eps
  );
}

/**
 * Checks collision between two pieces (supporting both rectangular and irregular polygon contours)
 */
export function checkPieceCollision(piece1, piece2, spacing = 0) {
  // FAST AABB REJECTION:
  // If the outer bounding boxes do not overlap (including clearance spacing),
  // then neither rectangular nor irregular polygon contours inside them can collide.
  if (!checkOverlap(piece1, piece2, spacing)) {
    return false;
  }

  // If both pieces have polygon world vertices, perform exact polygon collision check
  if (piece1.worldPoints && piece2.worldPoints) {
    return checkPolygonCollision(piece1.worldPoints, piece2.worldPoints, spacing);
  }

  // If piece1 is polygon and piece2 is rectangle
  if (piece1.worldPoints && !piece2.worldPoints) {
    const rectPoly2 = [
      { x: piece2.x, y: piece2.y },
      { x: piece2.x + piece2.width, y: piece2.y },
      { x: piece2.x + piece2.width, y: piece2.y + piece2.height },
      { x: piece2.x, y: piece2.y + piece2.height }
    ];
    return checkPolygonCollision(piece1.worldPoints, rectPoly2, spacing);
  }

  // If piece1 is rectangle and piece2 is polygon
  if (!piece1.worldPoints && piece2.worldPoints) {
    const rectPoly1 = [
      { x: piece1.x, y: piece1.y },
      { x: piece1.x + piece1.width, y: piece1.y },
      { x: piece1.x + piece1.width, y: piece1.y + piece1.height },
      { x: piece1.x, y: piece1.y + piece1.height }
    ];
    return checkPolygonCollision(rectPoly1, piece2.worldPoints, spacing);
  }

  // Fallback: Two rectangular pieces verified by AABB checkOverlap above
  return true;
}

/**
 * Tests if a candidate piece is within fabric boundaries and doesn't collide with existing placements
 */
export function canPlacePiece(candidate, placedPieces, fabricLength, fabricWidth, spacing = 0, defects = []) {
  // 1. Fast AABB fabric boundaries check
  if (
    candidate.x < 0 ||
    candidate.y < 0 ||
    candidate.x + candidate.width > fabricLength ||
    candidate.y + candidate.height > fabricWidth
  ) {
    return false;
  }

  // 2. Exact polygon boundary containment check if irregular
  if (candidate.worldPoints) {
    if (!isPolygonWithinFabric(candidate.worldPoints, fabricLength, fabricWidth)) {
      return false;
    }
  }

  // 3. Check overlap/clearance with all previously placed pieces
  for (let i = 0; i < placedPieces.length; i++) {
    if (checkPieceCollision(candidate, placedPieces[i], spacing)) {
      return false;
    }
  }

  // 4. Check collision/clearance with all active fabric roll defects / flaws
  if (Array.isArray(defects) && defects.length > 0) {
    for (let i = 0; i < defects.length; i++) {
      if (checkPieceDefectCollision(candidate, defects[i], spacing)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Independent layout validator that verifies:
 * 1. Fabric boundary containment for all placed pieces (including rotated shapes and irregular polygons)
 * 2. Pairwise collision / clearance spacing between every pair of placed pieces
 * 3. Non-negative coordinates and valid dimensions
 *
 * @param {Array<object>} placements - List of placed pieces
 * @param {number} fabricLength - Usable fabric length in cm
 * @param {number} fabricWidth - Usable fabric width in cm
 * @param {number} spacing - Minimum clearance spacing in cm
 * @returns {{
 *   isValid: boolean,
 *   errors: string[],
 *   overlapPairs: Array<{ piece1: string, piece2: string, reason: string }>,
 *   boundaryViolations: Array<{ piece: string, reason: string }>,
 *   overlapCount: number,
 *   boundaryViolationCount: number
 * }}
 */
export function validateNestingLayout(placements, fabricLength, fabricWidth, spacing = 0, defects = []) {
  const errors = [];
  const overlapPairs = [];
  const boundaryViolations = [];
  const defectViolations = [];

  if (!Array.isArray(placements)) {
    return {
      isValid: false,
      errors: ['Placements must be an array.'],
      overlapPairs: [],
      boundaryViolations: [],
      defectViolations: [],
      overlapCount: 0,
      boundaryViolationCount: 1,
      defectViolationCount: 0
    };
  }

  const s = Math.max(0, Number(spacing) || 0);
  const maxL = Number(fabricLength) || 0;
  const maxW = Number(fabricWidth) || 0;

  // 1. Fabric boundary containment checks
  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    const name = p.name || p.id || `Piece #${i + 1}`;

    if (typeof p.x !== 'number' || typeof p.y !== 'number' || p.x < -1e-4 || p.y < -1e-4) {
      const msg = `Piece "${name}" has negative or invalid coordinates (x: ${p.x}, y: ${p.y}).`;
      errors.push(msg);
      boundaryViolations.push({ piece: name, pieceId: p.id, reason: msg });
    }

    const rX = p.x + p.width;
    const bY = p.y + p.height;

    if (rX > maxL + 1e-4 || bY > maxW + 1e-4) {
      const msg = `Piece "${name}" exceeds fabric boundaries (${maxL}×${maxW}cm): bounds reach (${rX.toFixed(1)}×${bY.toFixed(1)}cm).`;
      errors.push(msg);
      boundaryViolations.push({ piece: name, pieceId: p.id, reason: msg });
    }

    if (p.worldPoints && Array.isArray(p.worldPoints)) {
      for (const pt of p.worldPoints) {
        if (pt.x < -1e-4 || pt.y < -1e-4 || pt.x > maxL + 1e-4 || pt.y > maxW + 1e-4) {
          const msg = `Piece "${name}" has vertex (${pt.x}, ${pt.y}) outside fabric boundaries (${maxL}×${maxW}cm).`;
          errors.push(msg);
          boundaryViolations.push({ piece: name, pieceId: p.id, reason: msg });
          break;
        }
      }
    }
  }

  // 2. Pairwise collision / clearance spacing checks
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const p1 = placements[i];
      const p2 = placements[j];

      if (checkPieceCollision(p1, p2, s)) {
        const p1Name = p1.name || p1.id || `Piece #${i + 1}`;
        const p2Name = p2.name || p2.id || `Piece #${j + 1}`;
        const msg = `Pieces "${p1Name}" and "${p2Name}" overlap or violate minimum clearance spacing (${s}cm).`;
        errors.push(msg);
        overlapPairs.push({
          piece1: p1Name,
          piece1Id: p1.id,
          piece2: p2Name,
          piece2Id: p2.id,
          reason: msg
        });
      }
    }
  }

  // 3. Fabric Defect / Flaw Zone obstacle violations
  if (Array.isArray(defects) && defects.length > 0) {
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      for (let d = 0; d < defects.length; d++) {
        const def = defects[d];
        if (checkPieceDefectCollision(p, def, s)) {
          const pName = p.name || p.id || `Piece #${i + 1}`;
          const msg = `Piece "${pName}" touches or violates clearance around Fabric Defect zone #${def.id || d + 1} (${def.type || 'Flaw'}).`;
          errors.push(msg);
          defectViolations.push({
            piece: pName,
            pieceId: p.id,
            defectId: def.id || d + 1,
            reason: msg
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    overlapPairs,
    boundaryViolations,
    defectViolations,
    overlapCount: overlapPairs.length,
    boundaryViolationCount: boundaryViolations.length,
    defectViolationCount: defectViolations.length
  };
}

/**
 * Expands pattern templates and quantities into individual item pieces,
 * computing exact Shoelace polygon areas and attaching contour geometry where present.
 */
export function expandPatternPieces(
  patterns,
  globalAllowRotation = true,
  globalRespectGrain = true,
  globalExtractedShape = null,
  options = {}
) {
  const pieces = [];
  let counter = 1;
  const useParametric = (typeof options === 'object' && options?.useParametricContour) || false;

  patterns.forEach((pattern, patIdx) => {
    const qty = Math.max(1, Math.floor(Number(pattern.quantity) || 1));
    const width = Number(pattern.width);
    const height = Number(pattern.height);
    const allowRot = pattern.rotationAllowed !== undefined 
      ? (pattern.rotationAllowed && globalAllowRotation) 
      : globalAllowRotation;
    const grain = pattern.grainConstraint || pattern.grainDirection || 'Vertical';

    // Identify digital contour outline if present (direct, pattern-level, or multi-candidate shape)
    let outline = null;
    if (Array.isArray(pattern.outline) && pattern.outline.length >= 3) {
      outline = pattern.outline;
    } else if (pattern.extractedShape && Array.isArray(pattern.extractedShape.outline) && pattern.extractedShape.outline.length >= 3) {
      outline = pattern.extractedShape.outline;
    } else if (globalExtractedShape) {
      const candidates = Array.isArray(globalExtractedShape.candidates) ? globalExtractedShape.candidates : null;
      if (pattern.candidateId && candidates) {
        const found = candidates.find((c) => c.id === pattern.candidateId);
        if (found && Array.isArray(found.outline)) outline = found.outline;
      } else if (pattern.candidateIndex !== undefined && candidates && candidates[pattern.candidateIndex]) {
        outline = candidates[pattern.candidateIndex].outline;
      } else if (candidates && candidates.length > 0) {
        // Match by category if possible
        const patCat = (pattern.category || '').toUpperCase();
        const foundByCat = candidates.find((c) => (c.category || '').toUpperCase() === patCat);
        if (foundByCat && Array.isArray(foundByCat.outline)) {
          outline = foundByCat.outline;
        } else if (patIdx < candidates.length && Array.isArray(candidates[patIdx].outline)) {
          outline = candidates[patIdx].outline;
        } else if (Array.isArray(globalExtractedShape.outline)) {
          outline = globalExtractedShape.outline;
        }
      } else if (Array.isArray(globalExtractedShape.outline)) {
        if (pattern.shapeType === 'irregular' || patterns.length === 1 || pattern.useExtractedShape) {
          outline = globalExtractedShape.outline;
        }
      }
    } else if ((useParametric || pattern.useParametricContour) && pattern.shapeType) {
      const gen = getGarmentNormalizedOutline(pattern.shapeType);
      if (Array.isArray(gen) && gen.length >= 3) {
        outline = gen;
      }
    }

    let isIrregular = false;
    let normalizedArea = 1;
    let polygonArea = (pattern.polygonArea !== undefined && Number(pattern.polygonArea) > 0)
      ? Number(pattern.polygonArea)
      : width * height;

    if (outline) {
      isIrregular = true;
      normalizedArea = calculatePolygonArea(outline);
      // Real polygon area from Shoelace formula scaled by width * height
      polygonArea = Number((normalizedArea * width * height).toFixed(2));
      if (polygonArea <= 0) {
        polygonArea = (pattern.polygonArea !== undefined && Number(pattern.polygonArea) > 0)
          ? Number(pattern.polygonArea)
          : width * height;
        isIrregular = false;
      }
    }

    for (let i = 0; i < qty; i++) {
      pieces.push({
        id: `piece-${pattern.id || 'pat'}-${counter}`,
        patternId: pattern.id || `pat-${counter}`,
        name: qty > 1 ? `${pattern.name || 'Piece'} #${i + 1}` : (pattern.name || 'Piece'),
        category: pattern.category || 'PART',
        shapeType: pattern.shapeType || (isIrregular ? 'irregular' : 'front-bodice'),
        color: pattern.color || '#0284c7',
        width,
        height,
        area: polygonArea,
        polygonArea,
        normalizedArea,
        isIrregular,
        outline,
        allowRotation: allowRot,
        grainConstraint: grain,
        globalRespectGrain,
        orderIndex: counter
      });
      counter++;
    }
  });

  return pieces;
}

/**
 * Gets valid rotation orientations for a piece based on rotation & grain rules
 */
export function getValidOrientations(piece) {
  const { width, height, allowRotation, grainConstraint, globalRespectGrain, outline } = piece;

  const allowedAngles = [0];

  if (allowRotation) {
    if (!globalRespectGrain || grainConstraint === 'Flexible' || grainConstraint === 'Any' || !grainConstraint) {
      if (width !== height || outline) {
        allowedAngles.push(90);
      }
      allowedAngles.push(180);
      if (width !== height || outline) {
        allowedAngles.push(270);
      }
    } else if (grainConstraint === 'Vertical') {
      allowedAngles.push(180);
    } else if (grainConstraint === 'Horizontal') {
      allowedAngles.length = 0;
      allowedAngles.push(90);
      allowedAngles.push(270);
    }
  } else {
    // When rotation is disallowed, respect mandatory horizontal cross-grain alignment
    if (globalRespectGrain && grainConstraint === 'Horizontal') {
      allowedAngles.length = 0;
      allowedAngles.push(90);
    }
  }

  const uniqueAngles = Array.from(new Set(allowedAngles));

  const orientations = uniqueAngles.map((rotation) => {
    if (outline) {
      const transform = transformNormalizedToWorldPolygon(outline, width, height, rotation, 0, 0);
      return {
        width: transform.boundWidth,
        height: transform.boundHeight,
        rotation,
        relativePoints: transform.relativePoints,
        outline
      };
    } else {
      const is90or270 = rotation === 90 || rotation === 270;
      return {
        width: is90or270 ? height : width,
        height: is90or270 ? width : height,
        rotation,
        relativePoints: null,
        outline: null
      };
    }
  });

  return orientations;
}

/**
 * Generates all candidate touchpoint coordinates for 2D nesting packing,
 * including corner touchpoints, pairwise boundary projections, and contour vertices.
 */
export function getCandidateCoordinates(placedPieces, fabricLength, fabricWidth, spacing = 0, orientation = null, defects = []) {
  const points = [{ x: 0, y: 0 }];
  const s = Math.max(0, Number(spacing) || 0);
  const targetW = orientation ? orientation.width : 0;
  const targetH = orientation ? orientation.height : 0;

  const maxX = fabricLength - targetW;
  const maxY = fabricWidth - targetH;

  // Fast exit if target piece cannot fit anywhere in fabric
  if (maxX < 0 || maxY < 0) return [];

  // Defect obstacle boundary touchpoints: allow nesting directly adjacent to fabric flaws
  if (Array.isArray(defects) && defects.length > 0) {
    for (const d of defects) {
      const dx = Number(d.x) || 0;
      const dy = Number(d.y) || 0;
      const radius = Number(d.radius) || 0;
      const dw = d.width ? Number(d.width) : (radius > 0 ? radius * 2 : 10);
      const dh = d.height ? Number(d.height) : (radius > 0 ? radius * 2 : 10);
      const defLeft = radius > 0 ? dx - radius : dx;
      const defTop = radius > 0 ? dy - radius : dy;
      const defRight = defLeft + dw;
      const defBottom = defTop + dh;

      const rX = defRight + s;
      const bY = defBottom + s;
      const lX = defLeft - targetW - s;
      const tY = defTop - targetH - s;

      if (rX >= 0 && rX <= maxX) {
        if (defTop >= 0 && defTop <= maxY) points.push({ x: rX, y: defTop });
        if (bY >= 0 && bY <= maxY) points.push({ x: rX, y: bY });
        points.push({ x: rX, y: 0 });
      }
      if (bY >= 0 && bY <= maxY) {
        if (defLeft >= 0 && defLeft <= maxX) points.push({ x: defLeft, y: bY });
        points.push({ x: 0, y: bY });
      }
      if (lX >= 0 && lX <= maxX) {
        if (defTop >= 0 && defTop <= maxY) points.push({ x: lX, y: defTop });
        if (bY >= 0 && bY <= maxY) points.push({ x: lX, y: bY });
      }
      if (tY >= 0 && tY <= maxY) {
        if (defLeft >= 0 && defLeft <= maxX) points.push({ x: defLeft, y: tY });
        if (rX >= 0 && rX <= maxX) points.push({ x: rX, y: tY });
      }
    }
  }

  for (let i = 0; i < placedPieces.length; i++) {
    const p = placedPieces[i];
    const rX = p.x + p.width + s;
    const bY = p.y + p.height + s;

    // Corner touchpoints relative to placed piece p
    if (rX <= maxX) {
      if (p.y <= maxY) points.push({ x: rX, y: p.y });
      if (bY <= maxY) points.push({ x: rX, y: bY });
      points.push({ x: rX, y: 0 });
    }

    if (bY <= maxY) {
      if (p.x <= maxX) points.push({ x: p.x, y: bY });
      points.push({ x: 0, y: bY });
    }

    // Touchpoints with adjacent pieces within proximity
    for (let j = 0; j < placedPieces.length; j++) {
      if (i === j) continue;
      const q = placedPieces[j];
      if (rX <= maxX) {
        if (q.y <= maxY && Math.abs(q.x - p.x) < 200) points.push({ x: rX, y: q.y });
        if (q.y + q.height + s <= maxY && Math.abs(q.x - p.x) < 200) points.push({ x: rX, y: q.y + q.height + s });
      }
      if (bY <= maxY) {
        if (q.x <= maxX && Math.abs(q.y - p.y) < 150) points.push({ x: q.x, y: bY });
        if (q.x + q.width + s <= maxX && Math.abs(q.y - p.y) < 150) points.push({ x: q.x + q.width + s, y: bY });
      }
    }

    // Key vertices for irregular contour nesting (sampled without over-density)
    if (p.worldPoints && Array.isArray(p.worldPoints) && p.worldPoints.length > 0) {
      const pts = p.worldPoints;
      const stride = pts.length > 8 ? Math.ceil(pts.length / 6) : 1;
      for (let v = 0; v < pts.length; v += stride) {
        const pt = pts[v];
        if (pt.x + s <= maxX && pt.y <= maxY) points.push({ x: pt.x + s, y: pt.y });
        if (pt.x <= maxX && pt.y + s <= maxY) points.push({ x: pt.x, y: pt.y + s });
        if (pt.x + s <= maxX && pt.y + s <= maxY) points.push({ x: pt.x + s, y: pt.y + s });

        if (orientation && orientation.relativePoints && Array.isArray(orientation.relativePoints)) {
          const relPts = orientation.relativePoints;
          const relStride = relPts.length > 8 ? Math.ceil(relPts.length / 4) : 1;
          for (let u = 0; u < relPts.length; u += relStride) {
            const vQ = relPts[u];
            // Horizontal mating: align X with spacing
            const pxH = pt.x + s - vQ.x;
            const pyH = pt.y - vQ.y;
            if (pxH >= 0 && pxH <= maxX && pyH >= 0 && pyH <= maxY) {
              points.push({ x: pxH, y: pyH });
            }
            // Vertical mating: align Y with spacing
            const pxV = pt.x - vQ.x;
            const pyV = pt.y + s - vQ.y;
            if (pxV >= 0 && pxV <= maxX && pyV >= 0 && pyV <= maxY) {
              points.push({ x: pxV, y: pyV });
            }
          }
        }
      }
    }
  }

  // Deduplicate and filter out-of-bounds points
  const uniqueMap = new Map();
  for (let k = 0; k < points.length; k++) {
    const pt = points[k];
    if (pt.x >= 0 && pt.y >= 0 && pt.x <= maxX && pt.y <= maxY) {
      const rx = Math.round(pt.x * 10) / 10;
      const ry = Math.round(pt.y * 10) / 10;
      const key = `${rx},${ry}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { x: rx, y: ry });
      }
    }
  }

  return Array.from(uniqueMap.values());
}

/**
 * Calculates adjacency / contact edge length between candidate placement and fabric boundaries / placed pieces
 */
function calculateContactLength(candidate, placedPieces, fabricLength, fabricWidth, spacing = 0) {
  let contact = 0;
  const s = Math.max(0, Number(spacing) || 0);

  // Contact with fabric boundary walls
  if (candidate.x <= 0.001) contact += candidate.height;
  if (candidate.y <= 0.001) contact += candidate.width;
  if (Math.abs((candidate.x + candidate.width) - fabricLength) <= 0.001) contact += candidate.height;
  if (Math.abs((candidate.y + candidate.height) - fabricWidth) <= 0.001) contact += candidate.width;

  // Contact with adjacent placed pieces
  const cRight = candidate.x + candidate.width;
  const cBottom = candidate.y + candidate.height;

  for (let i = 0; i < placedPieces.length; i++) {
    const p = placedPieces[i];
    const pRight = p.x + p.width;
    const pBottom = p.y + p.height;

    // Horizontal adjacency
    if (Math.abs(candidate.x - (pRight + s)) <= 0.05 || Math.abs((cRight + s) - p.x) <= 0.05) {
      const overlapY = Math.max(0, Math.min(cBottom, pBottom) - Math.max(candidate.y, p.y));
      contact += overlapY;
    }

    // Vertical adjacency
    if (Math.abs(candidate.y - (pBottom + s)) <= 0.05 || Math.abs((cBottom + s) - p.y) <= 0.05) {
      const overlapX = Math.max(0, Math.min(cRight, pRight) - Math.max(candidate.x, p.x));
      contact += overlapX;
    }
  }

  return contact;
}

/**
 * Scores candidate placement according to a specific heuristic rule
 */
function scorePlacement(candidate, placedPieces, fabricLength, fabricWidth, spacing, heuristicRule) {
  switch (heuristicRule) {
    case 'BL_Y': {
      // Bottom-Left Y-first (Fill columns/rows along width)
      return (candidate.y + candidate.height) * 2.0 + (candidate.x + candidate.width);
    }
    case 'BSSF': {
      // Best Short Side Fit
      const gapX = fabricLength - (candidate.x + candidate.width);
      const gapY = fabricWidth - (candidate.y + candidate.height);
      const shortSideGap = Math.min(gapX, gapY);
      return shortSideGap + (candidate.x * 0.2) + (candidate.y * 0.1);
    }
    case 'BAF': {
      // Best Area Fit / Minimal Bounding Expansion
      let curMaxX = 0;
      let curMaxY = 0;
      for (let i = 0; i < placedPieces.length; i++) {
        const p = placedPieces[i];
        if (p.x + p.width > curMaxX) curMaxX = p.x + p.width;
        if (p.y + p.height > curMaxY) curMaxY = p.y + p.height;
      }
      const newMaxX = Math.max(curMaxX, candidate.x + candidate.width);
      const newMaxY = Math.max(curMaxY, candidate.y + candidate.height);
      return (newMaxX * newMaxY) + (candidate.x + candidate.width) * 0.1;
    }
    case 'MAX_CONTACT': {
      // Maximal Contact Perimeter Adjacency
      const contact = calculateContactLength(candidate, placedPieces, fabricLength, fabricWidth, spacing);
      return -contact * 100 + (candidate.x + candidate.width) * 1.5 + (candidate.y + candidate.height);
    }
    case 'BL_X':
    default: {
      // Bottom-Left X-first (Minimizes roll consumption along length X)
      return (candidate.x + candidate.width) * 2.0 + (candidate.y + candidate.height);
    }
  }
}

/**
 * Deterministically compacts a valid candidate placement into tight interlocking contact
 * using hierarchical exponential stepping.
 */
function compactCandidate(candidate, orient, placedPieces, fabricLength, fabricWidth, spacing, defects = []) {
  if (placedPieces.length === 0 && (!defects || defects.length === 0)) return candidate;

  let curX = candidate.x;
  let curY = candidate.y;
  const s = Math.max(0, Number(spacing) || 0);
  if (curX <= 0 && curY <= 0) return candidate;

  const minStep = Math.max(0.5, s > 0 ? s : 0.5);
  const testSteps = [16, 8, 4, 2, 1, minStep];

  const makeCand = (x, y) => {
    const relPts = orient.relativePoints || candidate.relativePoints || null;
    return {
      ...candidate,
      x,
      y,
      relativePoints: relPts,
      worldPoints: relPts
        ? relPts.map((p) => ({
            x: Number((p.x + x).toFixed(3)),
            y: Number((p.y + y).toFixed(3))
          }))
        : null
    };
  };

  // Slide leftwards in X
  for (const step of testSteps) {
    let limit = 20;
    while (curX - step >= 0 && limit-- > 0) {
      const test = makeCand(curX - step, curY);
      if (canPlacePiece(test, placedPieces, fabricLength, fabricWidth, spacing, defects)) {
        curX -= step;
      } else {
        break;
      }
    }
  }

  // Slide upwards in Y
  for (const step of testSteps) {
    let limit = 20;
    while (curY - step >= 0 && limit-- > 0) {
      const test = makeCand(curX, curY - step);
      if (canPlacePiece(test, placedPieces, fabricLength, fabricWidth, spacing, defects)) {
        curY -= step;
      } else {
        break;
      }
    }
  }

  // Slide leftwards in X again
  for (const step of testSteps) {
    let limit = 20;
    while (curX - step >= 0 && limit-- > 0) {
      const test = makeCand(curX - step, curY);
      if (canPlacePiece(test, placedPieces, fabricLength, fabricWidth, spacing, defects)) {
        curX -= step;
      } else {
        break;
      }
    }
  }

  // Slide upwards in Y again (completes 2-cycle alternating coordinate descent for irregular shapes)
  if (orient.relativePoints || candidate.relativePoints) {
    for (const step of testSteps) {
      let limit = 20;
      while (curY - step >= 0 && limit-- > 0) {
        const test = makeCand(curX, curY - step);
        if (canPlacePiece(test, placedPieces, fabricLength, fabricWidth, spacing, defects)) {
          curY -= step;
        } else {
          break;
        }
      }
    }
  }

  return makeCand(Number(curX.toFixed(3)), Number(curY.toFixed(3)));
}

/**
 * Runs a single 2D packing heuristic pass with a specific piece ordering and placement rule
 */
export function packPiecesWithOrder(pieces, fabricLength, fabricWidth, spacing = 0, heuristicRule = 'BL_X', defects = []) {
  const placedPieces = [];
  const unplacedPieces = [];

  const isLargeSet = pieces.length > 20;
  const maxEvalBudget = isLargeSet ? 85 : 120;
  const topCount = isLargeSet ? 65 : 90;
  const sampleTarget = maxEvalBudget - topCount;

  for (const piece of pieces) {
    const validOrientations = getValidOrientations(piece);
    let bestPlacement = null;
    let bestOrient = null;
    let minScore = Infinity;

    for (const orient of validOrientations) {
      const rawCandidatePoints = getCandidateCoordinates(placedPieces, fabricLength, fabricWidth, spacing, orient, defects);
      
      // Sort candidate points according to heuristic priority
      const candidatePoints = [...rawCandidatePoints].sort((a, b) => {
        if (heuristicRule === 'BL_Y') {
          if (a.y !== b.y) return a.y - b.y;
          return a.x - b.x;
        }
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
      });

      // Bound candidate evaluation per orientation using stratified sampling:
      // Preserves top primary candidates by heuristic priority plus distributed representative candidates
      let candidatesToEvaluate;
      if (candidatePoints.length <= maxEvalBudget) {
        candidatesToEvaluate = candidatePoints;
      } else {
        const topCandidates = candidatePoints.slice(0, topCount);
        const remaining = candidatePoints.slice(topCount);
        const step = Math.ceil(remaining.length / sampleTarget);
        const sampled = [];
        for (let i = 0; i < remaining.length && sampled.length < sampleTarget; i += step) {
          sampled.push(remaining[i]);
        }
        candidatesToEvaluate = [...topCandidates, ...sampled];
      }

      for (const pt of candidatesToEvaluate) {
        // Fast AABB pre-check before allocating candidate object
        if (pt.x < 0 || pt.y < 0 || pt.x + orient.width > fabricLength || pt.y + orient.height > fabricWidth) {
          continue;
        }

        const candidate = {
          id: piece.id,
          patternId: piece.patternId,
          name: piece.name,
          category: piece.category,
          shapeType: piece.shapeType,
          color: piece.color,
          x: pt.x,
          y: pt.y,
          width: orient.width,
          height: orient.height,
          rotation: orient.rotation,
          rotated: orient.rotation !== 0,
          originalWidth: piece.width,
          originalHeight: piece.height,
          polygonArea: piece.polygonArea,
          normalizedArea: piece.normalizedArea,
          isIrregular: piece.isIrregular,
          outline: piece.outline,
          relativePoints: orient.relativePoints || null,
          get worldPoints() {
            if (!this._worldPoints && this.relativePoints) {
              const cx = this.x;
              const cy = this.y;
              this._worldPoints = this.relativePoints.map((p) => ({
                x: Number((p.x + cx).toFixed(3)),
                y: Number((p.y + cy).toFixed(3))
              }));
            }
            return this._worldPoints || null;
          },
          set worldPoints(val) {
            this._worldPoints = val;
          }
        };

        if (canPlacePiece(candidate, placedPieces, fabricLength, fabricWidth, spacing, defects)) {
          const score = scorePlacement(candidate, placedPieces, fabricLength, fabricWidth, spacing, heuristicRule);
          
          if (score < minScore) {
            minScore = score;
            bestPlacement = candidate;
            bestOrient = orient;
          }
        }
      }
    }

    if (bestPlacement) {
      const concretePlacement = {
        ...bestPlacement,
        worldPoints: bestPlacement.worldPoints
      };
      const finalPlacement = bestOrient
        ? compactCandidate(concretePlacement, bestOrient, placedPieces, fabricLength, fabricWidth, spacing, defects)
        : concretePlacement;
      placedPieces.push(finalPlacement);
    } else {
      unplacedPieces.push(piece);
    }
  }

  return {
    placedPieces,
    unplacedPieces
  };
}

/**
 * Evaluates candidate layout ranking strictly adhering to user specifications:
 * 1. Maximum placed piece count (minimum unplaced pieces)
 * 2. Maximum actual placed polygon / shape area
 * 3. Minimum fabric length consumed (compact roll length along X)
 * 4. Minimum bounding height along Y (compact width along Y)
 */
export function isCandidateBetter(candidate, currentBest) {
  if (!currentBest) return true;

  // Priority 1: Maximum placed piece count
  if (candidate.placedCount !== currentBest.placedCount) {
    return candidate.placedCount > currentBest.placedCount;
  }

  // Priority 2: Maximum actual placed polygon / shape area
  if (Math.abs(candidate.placedArea - currentBest.placedArea) > 0.001) {
    return candidate.placedArea > currentBest.placedArea;
  }

  // Priority 3: Minimum fabric length consumed
  if (Math.abs(candidate.maxUsedX - currentBest.maxUsedX) > 0.001) {
    return candidate.maxUsedX < currentBest.maxUsedX;
  }

  // Priority 4: Minimum bounding height along Y
  return candidate.maxUsedY < currentBest.maxUsedY;
}

/**
 * Builds diverse ordering strategies for the multi-heuristic 2D nesting search
 */
/**
 * Builds diverse, deduplicated ordering strategies for the multi-heuristic 2D nesting search
 */
export function buildOrderingStrategies(allPieces) {
  const byAreaDesc = [...allPieces].sort(
    (a, b) => b.area - a.area || (b.width * b.height) - (a.width * a.height)
  );

  // Group by patternId / template
  const patternGroups = new Map();
  for (const p of allPieces) {
    const pid = p.patternId || p.id;
    if (!patternGroups.has(pid)) patternGroups.set(pid, []);
    patternGroups.get(pid).push(p);
  }

  // Round robin: Pick 1st instance of each template (sorted by template area desc), then 2nd instance, etc.
  const sortedTemplatesByArea = Array.from(patternGroups.values()).sort(
    (a, b) => (b[0].area || (b[0].width * b[0].height)) - (a[0].area || (a[0].width * a[0].height))
  );
  const roundRobinArea = [];
  const maxInst = Math.max(...sortedTemplatesByArea.map((g) => g.length));
  for (let step = 0; step < maxInst; step++) {
    for (const grp of sortedTemplatesByArea) {
      if (step < grp.length) roundRobinArea.push(grp[step]);
    }
  }

  // Interleaved template order: alternating tall/slender and wide/large templates
  const sortedTemplatesByHeight = Array.from(patternGroups.values()).sort(
    (a, b) => b[0].height - a[0].height
  );
  const interleaveTemplates = [];
  let tL = 0;
  let tR = sortedTemplatesByHeight.length - 1;
  while (tL <= tR) {
    if (tL === tR) {
      interleaveTemplates.push(...sortedTemplatesByHeight[tL]);
      break;
    }
    interleaveTemplates.push(...sortedTemplatesByHeight[tL]);
    interleaveTemplates.push(...sortedTemplatesByHeight[tR]);
    tL++;
    tR--;
  }

  // Category Priority: Structural panels first (Back -> Sleeve -> Front -> Collar -> Cuff -> Pocket)
  const catPriorityBackFirst = ['BACK', 'SLEEVE', 'FRONT', 'BOTTOM', 'COLLAR', 'WAISTBAND', 'CUFF', 'POCKET', 'PART'];
  const byCategoryBackFirst = [...allPieces].sort((a, b) => {
    const idxA = catPriorityBackFirst.indexOf((a.category || '').toUpperCase());
    const idxB = catPriorityBackFirst.indexOf((b.category || '').toUpperCase());
    const prioA = idxA >= 0 ? idxA : 99;
    const prioB = idxB >= 0 ? idxB : 99;
    if (prioA !== prioB) return prioA - prioB;
    return (b.area || (b.width * b.height)) - (a.area || (a.width * a.height));
  });

  // Category Priority: Front panels first (Front -> Sleeve -> Back -> Collar -> Cuff -> Pocket)
  const catPriorityFrontFirst = ['FRONT', 'SLEEVE', 'BACK', 'BOTTOM', 'COLLAR', 'WAISTBAND', 'CUFF', 'POCKET', 'PART'];
  const byCategoryFrontFirst = [...allPieces].sort((a, b) => {
    const idxA = catPriorityFrontFirst.indexOf((a.category || '').toUpperCase());
    const idxB = catPriorityFrontFirst.indexOf((b.category || '').toUpperCase());
    const prioA = idxA >= 0 ? idxA : 99;
    const prioB = idxB >= 0 ? idxB : 99;
    if (prioA !== prioB) return prioA - prioB;
    return (b.area || (b.width * b.height)) - (a.area || (a.width * a.height));
  });

  // Interleaved / alternating large & small
  const interleaved = [];
  let left = 0;
  let right = byAreaDesc.length - 1;
  while (left <= right) {
    if (left === right) {
      interleaved.push(byAreaDesc[left]);
      break;
    }
    interleaved.push(byAreaDesc[left]);
    interleaved.push(byAreaDesc[right]);
    left++;
    right--;
  }

  const rawStrategies = [
    // 1. Largest Area First (Best-fit standard)
    byAreaDesc,
    // 2. Structural Panels (Back & Sleeves first)
    byCategoryBackFirst,
    // 3. Structural Panels (Front & Sleeves first)
    byCategoryFrontFirst,
    // 4. Round-Robin by Template Area
    roundRobinArea,
    // 5. Largest Height First
    [...allPieces].sort((a, b) => b.height - a.height || b.area - a.area),
    // 6. Largest Width First
    [...allPieces].sort((a, b) => b.width - a.width || b.area - a.area),
    // 7. Interleaved Templates (Tall & Short)
    interleaveTemplates,
    // 8. Largest Perimeter First
    [...allPieces].sort((a, b) => (b.width + b.height) - (a.width + a.height) || b.area - a.area),
    // 9. Largest Max Dimension First
    [...allPieces].sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height) || b.area - a.area),
    // 10. Pattern Grouped, then Area Descending
    [...allPieces].sort((a, b) => {
      if (a.patternId !== b.patternId) return String(a.patternId).localeCompare(String(b.patternId));
      return b.area - a.area;
    }),
    // 11. Interleaved Large and Small
    interleaved,
    // 12. Irregular First (When irregular contours exist)
    [...allPieces].sort((a, b) => (b.isIrregular ? 1 : 0) - (a.isIrregular ? 1 : 0) || b.area - a.area),
    // 13. Largest Aspect Ratio First
    [...allPieces].sort((a, b) => Math.max(b.width / b.height, b.height / b.width) - Math.max(a.width / a.height, a.height / a.width)),
    // 14. Smallest Area First (Reverse)
    [...allPieces].sort((a, b) => a.area - b.area || (a.width * a.height) - (b.width * b.height)),
    // 15. Sequential Input Order
    [...allPieces]
  ];

  // Deduplicate strategies by piece ID sequence to avoid redundant identical packing runs
  const seen = new Set();
  const uniqueStrategies = [];
  for (const s of rawStrategies) {
    const key = s.map((p) => p.id).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueStrategies.push(s);
    }
  }

  return uniqueStrategies;
}

/**
 * Computes a deterministic geometric layout signature from placed pieces.
 * Rounded to 0.5cm resolution to avoid floating point jitter.
 * Sorts piece signatures by pattern/geometry so swapping identical labels
 * does not falsely produce a distinct signature.
 */
export function getLayoutSignature(placedPieces) {
  if (!placedPieces || !Array.isArray(placedPieces) || placedPieces.length === 0) return 'empty';
  const pieceSigs = placedPieces.map((p) => {
    const rx = Math.round((Number(p.x) || 0) * 2) / 2;
    const ry = Math.round((Number(p.y) || 0) * 2) / 2;
    const rot = Number(p.rotation) || 0;
    const shapeKey = p.patternId || p.shapeType || p.name || 'piece';
    return `${shapeKey}:${rx}:${ry}:${rot}`;
  });
  pieceSigs.sort();
  return pieceSigs.join('|');
}

/**
 * Builds and pre-calculates the optimization context, validating parameters,
 * expanding pieces, running the baseline pass, and configuring search combinations.
 */
export function buildOptimizationContext(inputParams, options = {}) {
  const validation = validateOptimizationInput(inputParams);
  if (!validation.isValid) {
    return {
      isEarlyExit: true,
      earlyExitResult: {
        success: false,
        isFullSuccess: false,
        error: validation.errors.join(' '),
        errors: validation.errors,
        utilization: 0,
        wastePercentage: 100,
        totalPieces: 0,
        placedCount: 0,
        unplacedCount: 0,
        candidateLayoutsCount: 0,
        selectedLayoutIndex: 0,
        hasAlternativeLayout: false,
        layoutPlacements: []
      }
    };
  }

  const fabricWidth = Number(inputParams.fabricWidth);
  const fabricLength = Number(inputParams.fabricLength);
  const spacing = typeof inputParams.minSpacing === 'number' 
    ? inputParams.minSpacing 
    : typeof inputParams.spacing === 'number' 
    ? inputParams.spacing 
    : 0.5;
  const allowRotation = inputParams.allowRotation !== undefined ? Boolean(inputParams.allowRotation) : true;
  const respectGrain = inputParams.respectGrain !== undefined ? Boolean(inputParams.respectGrain) : true;
  const extractedShape = inputParams.extractedShape || null;
  const useParametricContour = Boolean(inputParams.useParametricContour || options.useParametricContour);
  const defects = Array.isArray(inputParams.defects) ? inputParams.defects : [];

  // 1. Expand all pattern groups and quantities into individual pieces
  const allPieces = expandPatternPieces(
    inputParams.patterns,
    allowRotation,
    respectGrain,
    extractedShape,
    { useParametricContour }
  );
  const totalPiecesCount = allPieces.length;

  if (totalPiecesCount === 0) {
    return {
      isEarlyExit: true,
      earlyExitResult: {
        success: false,
        isFullSuccess: false,
        error: 'No pattern pieces to place.',
        utilization: 0,
        wastePercentage: 100,
        totalPieces: 0,
        placedCount: 0,
        unplacedCount: 0,
        candidateLayoutsCount: 0,
        selectedLayoutIndex: 0,
        hasAlternativeLayout: false,
        layoutPlacements: []
      }
    };
  }

  // Check if any individual piece cannot fit inside fabric in any orientation
  const oversizedPieces = allPieces.filter((p) => {
    const orientations = getValidOrientations(p);
    return !orientations.some(
      (o) => o.width <= fabricLength && o.height <= fabricWidth
    );
  });

  if (oversizedPieces.length > 0) {
    const firstOver = oversizedPieces[0];
    const fabricAreaCm2 = fabricWidth * fabricLength;
    const fabricAreaM2 = Number((fabricAreaCm2 / 10000).toFixed(3));
    return {
      isEarlyExit: true,
      earlyExitResult: {
        success: false,
        isFullSuccess: false,
        error: `Pattern "${firstOver.name}" (${firstOver.width}×${firstOver.height}cm) is larger than usable fabric dimensions (${fabricLength}×${fabricWidth}cm).`,
        fabricWidth,
        fabricLength,
        totalArea: fabricAreaM2,
        usedArea: 0,
        wasteArea: fabricAreaM2,
        evaluatedFabricAreaCm2: fabricAreaCm2,
        evaluatedFabricAreaM2: fabricAreaM2,
        placedPatternAreaCm2: 0,
        placedPatternAreaM2: 0,
        unusedAreaCm2: fabricAreaCm2,
        unusedAreaM2: fabricAreaM2,
        utilization: 0,
        wastePercentage: 100,
        totalPieces: totalPiecesCount,
        placedCount: 0,
        unplacedCount: totalPiecesCount,
        actualLengthUsedCm: 0,
        actualLengthUsedM: 0,
        remainingRollLengthCm: fabricLength,
        remainingRollLengthM: Number((fabricLength / 100).toFixed(2)),
        markerAreaCm2: 0,
        markerAreaM2: 0,
        markerUtilization: 0,
        markerWastePercentage: 100,
        markerWasteAreaM2: 0,
        hasValidBaseline: false,
        baselineUtilization: 0,
        baselineWastePercentage: 100,
        fabricSavedMeters: 0,
        fabricSavedKg: 0,
        candidateLayoutsCount: 0,
        selectedLayoutIndex: 0,
        hasAlternativeLayout: false,
        unplacedPieces: allPieces.map((p) => ({
          id: p.id,
          patternId: p.patternId,
          name: p.name,
          category: p.category,
          shapeType: p.shapeType,
          width: p.width,
          height: p.height,
          color: p.color,
          grainConstraint: p.grainConstraint || 'Vertical',
          reason: `Dimensions (${p.width}×${p.height}cm) exceed usable fabric dimensions (${fabricLength}×${fabricWidth}cm).`
        })),
        layoutPlacements: []
      }
    };
  }

  const fabricAreaCm2 = fabricWidth * fabricLength;
  const fabricAreaM2 = Number((fabricAreaCm2 / 10000).toFixed(3));

  // 2. Real Sequential Baseline Calculation (Unoptimized first-fit without rotation)
  const baselinePieces = expandPatternPieces(
    inputParams.patterns,
    false,
    respectGrain,
    extractedShape,
    { useParametricContour }
  );
  const baselineResult = packPiecesWithOrder(baselinePieces, fabricLength, fabricWidth, spacing, 'BL_X', defects);
  const baselinePlacedPieces = baselineResult.placedPieces;

  const hasValidBaseline = baselinePlacedPieces.length > 0;
  const baselineUsedAreaCm2 = baselinePlacedPieces.reduce(
    (sum, p) => sum + (p.polygonArea !== undefined ? p.polygonArea : (p.width * p.height)), 0
  );
  const baselineUsedAreaM2 = Number((baselineUsedAreaCm2 / 10000).toFixed(3));
  const baselineWasteAreaCm2 = Math.max(0, fabricAreaCm2 - baselineUsedAreaCm2);
  const baselineWasteAreaM2 = Number((baselineWasteAreaCm2 / 10000).toFixed(3));
  const baselineUtilization = hasValidBaseline
    ? Number(((baselineUsedAreaCm2 / fabricAreaCm2) * 100).toFixed(1))
    : 0;
  const baselineWastePercentage = hasValidBaseline
    ? Number((100 - baselineUtilization).toFixed(1))
    : 100;

  const baselineLengthUsedCm = baselinePlacedPieces.length > 0
    ? Math.max(...baselinePlacedPieces.map((p) => p.x + p.width))
    : 0;
  const baselineLengthUsedM = Number((baselineLengthUsedCm / 100).toFixed(2));

  const baselineEval = {
    placedCount: baselinePlacedPieces.length,
    placedArea: baselineUsedAreaCm2,
    maxUsedX: baselineLengthUsedCm,
    maxUsedY: baselinePlacedPieces.length > 0 ? Math.max(...baselinePlacedPieces.map((p) => p.y + p.height)) : 0,
    result: baselineResult,
    rule: 'BASELINE'
  };

  // 3. Multi-Heuristic Search: Evaluate multiple ordering strategies and placement rules
  const uniqueStrategies = buildOrderingStrategies(allPieces);
  const placementRules = ['BL_X', 'BL_Y', 'BAF', 'MAX_CONTACT', 'BSSF'];

  const combinations = [];
  for (const rule of placementRules) {
    for (let sIdx = 0; sIdx < uniqueStrategies.length; sIdx++) {
      combinations.push({ rule, strat: uniqueStrategies[sIdx], stratIndex: sIdx });
    }
  }

  const hasIrregularPieces = allPieces.some((p) => p.isIrregular);
  const maxTimeMs = typeof options.maxTimeMs === 'number' 
    ? options.maxTimeMs 
    : (hasIrregularPieces ? 3200 : 8000);
  const maxEvaluations = typeof options.maxEvaluations === 'number' 
    ? options.maxEvaluations 
    : (hasIrregularPieces ? 18 : 25);
  const totalEvaluationsTarget = Math.min(combinations.length, maxEvaluations);

  return {
    isEarlyExit: false,
    inputParams,
    options,
    fabricWidth,
    fabricLength,
    spacing,
    allowRotation,
    respectGrain,
    extractedShape,
    useParametricContour,
    allPieces,
    totalPiecesCount,
    fabricAreaCm2,
    fabricAreaM2,
    baselineEval,
    baselinePlacedPieces,
    baselineUsedAreaCm2,
    baselineUsedAreaM2,
    baselineWasteAreaCm2,
    baselineWasteAreaM2,
    baselineUtilization,
    baselineWastePercentage,
    baselineLengthUsedCm,
    baselineLengthUsedM,
    baselineResult,
    hasValidBaseline,
    combinations,
    maxTimeMs,
    maxEvaluations,
    totalEvaluationsTarget,
    defects
  };
}

/**
 * Evaluates a single candidate strategy and rule, recording best layout and distinct signatures
 */
function evaluateCandidateIteration(
  comb,
  ctx,
  state
) {
  const { rule, strat, stratIndex } = comb;
  const { fabricLength, fabricWidth, spacing, fabricAreaCm2, totalPiecesCount, totalEvaluationsTarget } = ctx;
  const { onProgress } = ctx.options;

  const candidateResult = packPiecesWithOrder(strat, fabricLength, fabricWidth, spacing, rule, ctx.defects);
  state.evaluationsDone++;

  const placedCount = candidateResult.placedPieces.length;
  const placedArea = candidateResult.placedPieces.reduce(
    (sum, p) => sum + (p.polygonArea !== undefined ? p.polygonArea : (p.width * p.height)), 0
  );
  const maxUsedX = candidateResult.placedPieces.length > 0
    ? Math.max(...candidateResult.placedPieces.map((p) => p.x + p.width))
    : 0;
  const maxUsedY = candidateResult.placedPieces.length > 0
    ? Math.max(...candidateResult.placedPieces.map((p) => p.y + p.height))
    : 0;

  const candidateEval = {
    placedCount,
    placedArea,
    maxUsedX,
    maxUsedY,
    result: candidateResult,
    rule,
    stratIndex
  };

  if (isCandidateBetter(candidateEval, state.bestEval)) {
    state.bestEval = candidateEval;
  }

  // Record geometrically distinct candidates
  if (placedCount > 0) {
    const sig = getLayoutSignature(candidateResult.placedPieces);
    if (!state.distinctCandidates.has(sig)) {
      state.distinctCandidates.set(sig, {
        sig,
        rule,
        stratIndex,
        placedCount,
        placedArea,
        maxUsedX,
        maxUsedY,
        result: candidateResult
      });
    }
  }

  // Report actual work progress
  if (typeof onProgress === 'function') {
    const pct = Math.min(96, Math.max(15, Math.round(15 + (state.evaluationsDone / totalEvaluationsTarget) * 80)));
    onProgress({
      percent: pct,
      status: `Evaluating multi-angle heuristic layout (${state.evaluationsDone}/${totalEvaluationsTarget})...`,
      stepId: 4,
      evaluationsDone: state.evaluationsDone,
      totalEvaluationsTarget
    });
  }

  // Optimal convergence check: If all pieces are placed and yield is near 98%+
  if (placedCount === totalPiecesCount && (placedArea / fabricAreaCm2 >= 0.98)) {
    if (state.distinctCandidates.size >= 5 || state.evaluationsDone >= 10) {
      return true; // Stop early
    }
  }

  return false;
}

/**
 * Finalizes optimization metrics, layout variant selection, boundary validation, and ESG impact values
 */
export function finalizeOptimizationResult(ctx, searchState, options = {}) {
  const {
    inputParams,
    fabricWidth,
    fabricLength,
    spacing,
    allPieces,
    totalPiecesCount,
    fabricAreaCm2,
    fabricAreaM2,
    baselineEval,
    baselinePlacedPieces,
    baselineUsedAreaCm2,
    baselineUsedAreaM2,
    baselineWasteAreaCm2,
    baselineWasteAreaM2,
    baselineUtilization,
    baselineWastePercentage,
    baselineLengthUsedCm,
    baselineLengthUsedM,
    baselineResult,
    hasValidBaseline
  } = ctx;

  let { bestEval, distinctCandidates, isBudgetExceeded } = searchState;

  // Fallback check: if baseline placed more pieces or has higher area than best search result, use baseline
  if (isCandidateBetter(baselineEval, bestEval)) {
    bestEval = baselineEval;
  }

  // If no candidates were placed during search, or baseline beat all candidates, include baseline
  if (distinctCandidates.size === 0 || bestEval === baselineEval) {
    if (baselinePlacedPieces.length > 0) {
      const baseSig = getLayoutSignature(baselinePlacedPieces);
      distinctCandidates.set(baseSig, {
        sig: baseSig,
        rule: 'BASELINE',
        stratIndex: -1,
        placedCount: baselinePlacedPieces.length,
        placedArea: baselineUsedAreaCm2,
        maxUsedX: baselineLengthUsedCm,
        maxUsedY: baselinePlacedPieces.length > 0 ? Math.max(...baselinePlacedPieces.map((p) => p.y + p.height)) : 0,
        result: baselineResult
      });
    }
  }

  // Filter and sort distinct candidate layouts that achieve the maximum placed piece count
  const allCandidatesList = Array.from(distinctCandidates.values());
  const maxPlacedCount = allCandidatesList.reduce((max, c) => Math.max(max, c.placedCount), 0);
  const maxCandidates = allCandidatesList.filter((c) => c.placedCount === maxPlacedCount);

  // Deterministically sort candidates using standard multi-tier priority:
  // Candidate 0 matches bestEval exactly
  const bestSig = bestEval && bestEval.result ? getLayoutSignature(bestEval.result.placedPieces) : null;
  maxCandidates.sort((a, b) => {
    if (bestSig) {
      if (a.sig === bestSig && b.sig !== bestSig) return -1;
      if (b.sig === bestSig && a.sig !== bestSig) return 1;
    }
    if (b.placedCount !== a.placedCount) return b.placedCount - a.placedCount;
    if (Math.abs(b.placedArea - a.placedArea) > 0.001) return b.placedArea - a.placedArea;
    if (Math.abs(a.maxUsedX - b.maxUsedX) > 0.001) return a.maxUsedX - b.maxUsedX;
    if (Math.abs(a.maxUsedY - b.maxUsedY) > 0.001) return a.maxUsedY - b.maxUsedY;
    return a.sig.localeCompare(b.sig);
  });

  const requestedVariant = typeof options.layoutVariant === 'number'
    ? Math.max(0, Math.floor(options.layoutVariant))
    : typeof inputParams.layoutVariant === 'number'
    ? Math.max(0, Math.floor(inputParams.layoutVariant))
    : 0;

  const candidateLayoutsCount = maxCandidates.length;
  const hasAlternativeLayout = candidateLayoutsCount > 1;
  const selectedLayoutIndex = candidateLayoutsCount > 0 ? (requestedVariant % candidateLayoutsCount) : 0;
  const selectedCandidate = candidateLayoutsCount > 0 ? maxCandidates[selectedLayoutIndex] : (bestEval || baselineEval);

  const bestResult = selectedCandidate ? selectedCandidate.result : (bestEval ? bestEval.result : baselineResult);
  const rawPlacedPieces = bestResult ? bestResult.placedPieces : [];
  const rawUnplacedPieces = bestResult ? bestResult.unplacedPieces : allPieces;

  // Final Safety Validation: Enforce that all placed pieces strictly satisfy
  // fabric boundary containment and have zero collision / spacing violation with any other piece.
  const placedPieces = [];
  const unplacedPieces = [...rawUnplacedPieces];

  for (let i = 0; i < rawPlacedPieces.length; i++) {
    const candidate = rawPlacedPieces[i];
    let isValid = true;

    if (
      candidate.x < -1e-4 ||
      candidate.y < -1e-4 ||
      candidate.x + candidate.width > fabricLength + 1e-4 ||
      candidate.y + candidate.height > fabricWidth + 1e-4
    ) {
      isValid = false;
    } else if (candidate.worldPoints) {
      if (!isPolygonWithinFabric(candidate.worldPoints, fabricLength, fabricWidth)) {
        isValid = false;
      }
    }

    if (isValid) {
      for (let j = 0; j < placedPieces.length; j++) {
        if (checkPieceCollision(candidate, placedPieces[j], spacing)) {
          isValid = false;
          break;
        }
      }
    }

    if (isValid) {
      placedPieces.push(candidate);
    } else {
      unplacedPieces.push(candidate);
    }
  }

  // Run final independent layout validation to ensure zero collision or boundary violations
  const layoutValidation = validateNestingLayout(placedPieces, fabricLength, fabricWidth, spacing, ctx.defects);
  if (!layoutValidation.isValid) {
    const invalidIds = new Set();
    layoutValidation.overlapPairs.forEach((pair) => invalidIds.add(pair.piece2Id));
    layoutValidation.boundaryViolations.forEach((bv) => invalidIds.add(bv.pieceId));
    if (layoutValidation.defectViolations) {
      layoutValidation.defectViolations.forEach((dv) => invalidIds.add(dv.pieceId));
    }

    for (let i = placedPieces.length - 1; i >= 0; i--) {
      if (invalidIds.has(placedPieces[i].id)) {
        unplacedPieces.push(placedPieces.splice(i, 1)[0]);
      }
    }
  }
  const finalValidation = validateNestingLayout(placedPieces, fabricLength, fabricWidth, spacing, ctx.defects);

  // 4. Real Calculations for Final Optimized Result
  const usedAreaCm2 = placedPieces.reduce(
    (sum, p) => sum + (p.polygonArea !== undefined ? p.polygonArea : (p.width * p.height)), 0
  );
  const usedAreaM2 = Number((usedAreaCm2 / 10000).toFixed(3));

  const wasteAreaCm2 = Math.max(0, fabricAreaCm2 - usedAreaCm2);
  const wasteAreaM2 = Number((wasteAreaCm2 / 10000).toFixed(3));

  // Efficiency / Material Utilization
  const utilization = Number(((usedAreaCm2 / fabricAreaCm2) * 100).toFixed(1));
  const wastePercentage = Number((100 - utilization).toFixed(1));

  // Actual bounding roll length consumed
  const actualLengthUsedCm = placedPieces.length > 0
    ? Math.max(...placedPieces.map((p) => p.x + p.width))
    : 0;
  const actualLengthUsedM = Number((actualLengthUsedCm / 100).toFixed(2));

  // Active marker window area & utilization (actual roll length consumed × fabric width)
  const markerAreaCm2 = actualLengthUsedCm * fabricWidth;
  const markerAreaM2 = Number((markerAreaCm2 / 10000).toFixed(3));
  const markerUtilization = markerAreaCm2 > 0
    ? Number(((usedAreaCm2 / markerAreaCm2) * 100).toFixed(1))
    : 0;
  const markerWastePercentage = markerAreaCm2 > 0
    ? Number((100 - markerUtilization).toFixed(1))
    : 100;
  const markerWasteAreaCm2 = Math.max(0, markerAreaCm2 - usedAreaCm2);
  const markerWasteAreaM2 = Number((markerWasteAreaCm2 / 10000).toFixed(3));

  // Remaining uncut roll length preserved on bolt
  const remainingRollLengthCm = Math.max(0, Number((fabricLength - actualLengthUsedCm).toFixed(2)));
  const remainingRollLengthM = Number((remainingRollLengthCm / 100).toFixed(2));

  const baselineMarkerAreaCm2 = baselineLengthUsedCm * fabricWidth;
  const baselineMarkerAreaM2 = Number((baselineMarkerAreaCm2 / 10000).toFixed(3));
  const baselineMarkerUtilization = baselineMarkerAreaCm2 > 0
    ? Number(((baselineUsedAreaCm2 / baselineMarkerAreaCm2) * 100).toFixed(1))
    : 0;

  // Real differences in percentage points (pp)
  const utilizationDeltaPp = hasValidBaseline
    ? Number((utilization - baselineUtilization).toFixed(1))
    : 0;
  const wasteDeltaPp = hasValidBaseline
    ? Number((baselineWastePercentage - wastePercentage).toFixed(1))
    : 0;

  // Saved Fabric Area: difference between unoptimized baseline waste and optimized waste
  const savedAreaCm2 = utilizationDeltaPp > 0
    ? Math.max(0, baselineWasteAreaCm2 - wasteAreaCm2)
    : 0;
  const savedAreaM2 = Number((savedAreaCm2 / 10000).toFixed(3));

  // Linear fabric saved from saved area using actual fabric width (1 m = 100 cm):
  const linearSavedFromAreaM = fabricWidth > 0 && savedAreaCm2 > 0
    ? savedAreaCm2 / (fabricWidth * 100)
    : 0;

  const boundingLengthSavedM = (utilizationDeltaPp > 0 && baselineLengthUsedCm > actualLengthUsedCm)
    ? (baselineLengthUsedCm - actualLengthUsedCm) / 100
    : 0;

  const fabricSavedMeters = (hasValidBaseline && utilizationDeltaPp > 0)
    ? Number(Math.max(linearSavedFromAreaM, boundingLengthSavedM).toFixed(2))
    : 0;

  // Fabric weight in kg:
  // Note: Fabric weight is an estimated indicator derived from saved fabric area using an
  // assumed generic textile fabric density of 280 g/m² (0.28 kg/m²). This is a provisional
  // rule of thumb, not a physically weighed measurement or certified material-specific value.
  const fabricSavedKg = utilizationDeltaPp > 0
    ? Number((savedAreaM2 * 0.28).toFixed(2))
    : 0;
  
  // LCA metrics: Provisional indicators based on generic industry proxy assumptions:
  // - Freshwater proxy: 1,400 L/kg textile
  // - Emissions proxy: 6.8 kg CO₂e/kg textile
  // These are generic provisional assumptions, not verified material-specific LCA factors.
  const hasVerifiedLca = hasValidBaseline && utilizationDeltaPp > 0 && fabricSavedKg > 0;
  const waterSavedLiters = hasVerifiedLca ? Math.round(fabricSavedKg * 1400) : 0;
  const co2SavedKg = hasVerifiedLca ? Number((fabricSavedKg * 6.8).toFixed(1)) : 0;

  const isFullSuccess = unplacedPieces.length === 0;

  // Format unplaced pieces with clear, informative reason for failing placement
  const formattedUnplacedPieces = unplacedPieces.map((p) => {
    let reason = p.reason;
    if (!reason) {
      const gStr = p.grainConstraint ? ` (${p.grainConstraint} grain)` : '';
      reason = `Dimensions (${p.width}×${p.height}cm${gStr}) exceed remaining continuous fabric capacity on ${fabricLength}×${fabricWidth}cm roll with ${spacing}cm clearance.`;
    }
    return {
      id: p.id,
      patternId: p.patternId,
      name: p.name,
      category: p.category,
      shapeType: p.shapeType,
      width: p.width,
      height: p.height,
      color: p.color,
      grainConstraint: p.grainConstraint || 'Vertical',
      reason
    };
  });

  // Real verifiable optimality condition (e.g. 100% full tessellation / zero scrap)
  const hasOptimalConvergence = isFullSuccess && (
    utilization === 100 || 
    (fabricAreaCm2 > 0 && fabricAreaCm2 === usedAreaCm2)
  );

  const hasPlacedAny = placedPieces.length > 0;

  return {
    success: hasPlacedAny,
    isFullSuccess,
    hasOptimalConvergence,
    isSearchComplete: !isBudgetExceeded,
    searchNotice: isBudgetExceeded
      ? 'Search computation budget limit reached; returning best fully validated layout.'
      : null,
    error: !hasPlacedAny 
      ? `None of the pattern pieces could fit within the specified fabric dimensions (${fabricLength}×${fabricWidth}cm) and spacing constraints.`
      : null,
    warning: !isFullSuccess ? `${formattedUnplacedPieces.length} of ${totalPiecesCount} pieces could not fit within the specified fabric dimensions (${fabricLength}×${fabricWidth}cm).` : null,
    fabricWidth,
    fabricLength,
    totalArea: fabricAreaM2,
    usedArea: usedAreaM2,
    wasteArea: wasteAreaM2,
    evaluatedFabricAreaCm2: fabricAreaCm2,
    evaluatedFabricAreaM2: fabricAreaM2,
    placedPatternAreaCm2: usedAreaCm2,
    placedPatternAreaM2: usedAreaM2,
    unusedAreaCm2: wasteAreaCm2,
    unusedAreaM2: wasteAreaM2,
    utilization,
    wastePercentage,
    totalPieces: totalPiecesCount,
    placedCount: placedPieces.length,
    unplacedCount: formattedUnplacedPieces.length,
    unplacedPieces: formattedUnplacedPieces,
    actualLengthUsedCm,
    actualLengthUsedM,
    remainingRollLengthCm,
    remainingRollLengthM,
    markerAreaCm2,
    markerAreaM2,
    markerUtilization,
    markerWastePercentage,
    markerWasteAreaCm2,
    markerWasteAreaM2,
    hasValidBaseline,
    baselineUtilization,
    baselineWastePercentage,
    baselineUsedArea: baselineUsedAreaM2,
    baselineWasteArea: baselineWasteAreaM2,
    baselineLengthUsedCm,
    baselineLengthUsedM,
    baselinePlacedCount: baselinePlacedPieces.length,
    baselineMarkerAreaCm2,
    baselineMarkerAreaM2,
    baselineMarkerUtilization,
    utilizationDeltaPp,
    wasteDeltaPp,
    fabricSavedMeters,
    fabricSavedKg,
    hasVerifiedLca,
    waterSavedLiters,
    co2SavedKg,
    defects: ctx.defects || [],
    layoutPlacements: placedPieces,
    layoutVariant: requestedVariant,
    candidateLayoutsCount,
    selectedLayoutIndex,
    hasAlternativeLayout,
    layoutSignature: getLayoutSignature(placedPieces),
    isNewLayoutGenerated: hasAlternativeLayout && requestedVariant > 0,
    candidateSummaries: maxCandidates.map((c, idx) => ({
      index: idx,
      rule: c.rule,
      placedCount: c.placedCount,
      placedArea: Number((c.placedArea / 10000).toFixed(3)),
      maxUsedX: Number((c.maxUsedX / 100).toFixed(2)),
      maxUsedY: c.maxUsedY
    })),
    isLayoutValid: finalValidation.isValid,
    validationErrors: finalValidation.errors,
    overlapCount: finalValidation.overlapCount,
    boundaryViolationCount: finalValidation.boundaryViolationCount
  };
}

/**
 * Main Optimization Engine: Evaluates deterministic multi-heuristic 2D nesting search
 * across multiple piece ordering strategies and placement rules, selecting the layout
 * with maximum fabric utilization, lowest waste, and most compact placement.
 */
export function optimizeFabricCutting(inputParams, options = {}) {
  const { signal = null } = options;

  const ctx = buildOptimizationContext(inputParams, options);
  if (ctx.isEarlyExit) {
    return ctx.earlyExitResult;
  }

  const { combinations, maxTimeMs, maxEvaluations } = ctx;

  const state = {
    bestEval: null,
    distinctCandidates: new Map(),
    evaluationsDone: 0,
    isBudgetExceeded: false
  };

  const startTime = Date.now();

  for (let cIdx = 0; cIdx < combinations.length; cIdx++) {
    // Check cancellation signal
    if (signal && signal.aborted) {
      return {
        cancelled: true,
        success: false,
        error: 'Optimization was cancelled.'
      };
    }

    // Check computation budget
    if (Date.now() - startTime > maxTimeMs || state.evaluationsDone >= maxEvaluations) {
      state.isBudgetExceeded = true;
      break;
    }

    const shouldStop = evaluateCandidateIteration(combinations[cIdx], ctx, state);
    if (shouldStop) {
      break;
    }
  }

  return finalizeOptimizationResult(ctx, state, options);
}

/**
 * Asynchronous cooperative solver that yields execution to the host environment
 * between heuristic iterations to prevent browser lockup on the main thread.
 */
export async function optimizeFabricCuttingAsync(inputParams, options = {}) {
  const {
    signal = null,
    onProgress = null,
    maxTimeMs = 5000,
    maxEvaluations = 30
  } = options;

  onProgress?.({ percent: 12, status: 'Analyzing fabric dimensions & grain alignment...', stepId: 1 });
  await new Promise((r) => setTimeout(r, 10));

  if (signal && signal.aborted) {
    return { cancelled: true, success: false, error: 'Optimization was cancelled.' };
  }

  const ctx = buildOptimizationContext(inputParams, {
    ...options,
    maxTimeMs,
    maxEvaluations
  });

  if (ctx.isEarlyExit) {
    return ctx.earlyExitResult;
  }

  onProgress?.({ percent: 25, status: 'Processing 2D pattern polygon contours...', stepId: 2 });
  await new Promise((r) => setTimeout(r, 10));

  if (signal && signal.aborted) {
    return { cancelled: true, success: false, error: 'Optimization was cancelled.' };
  }

  onProgress?.({ percent: 35, status: 'Calculating baseline sequential layout...', stepId: 3 });
  await new Promise((r) => setTimeout(r, 10));

  if (signal && signal.aborted) {
    return { cancelled: true, success: false, error: 'Optimization was cancelled.' };
  }

  const { combinations } = ctx;

  const state = {
    bestEval: null,
    distinctCandidates: new Map(),
    evaluationsDone: 0,
    isBudgetExceeded: false
  };

  const startTime = Date.now();

  for (let cIdx = 0; cIdx < combinations.length; cIdx++) {
    if (signal && signal.aborted) {
      return {
        cancelled: true,
        success: false,
        error: 'Optimization was cancelled.'
      };
    }

    if (Date.now() - startTime > maxTimeMs || state.evaluationsDone >= maxEvaluations) {
      state.isBudgetExceeded = true;
      break;
    }

    const shouldStop = evaluateCandidateIteration(combinations[cIdx], ctx, state);
    if (shouldStop) {
      break;
    }

    // Yield cooperatively to the event loop every 2 heuristic iterations
    if (state.evaluationsDone % 2 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return finalizeOptimizationResult(ctx, state, options);
}


