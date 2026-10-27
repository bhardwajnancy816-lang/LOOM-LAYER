/**
 * AI Fabric Cutter — 2D Polygon Geometry & Contour Collision Engine
 *
 * Implements:
 * - Shoelace formula for exact 2D polygon area calculation
 * - Normalized contour coordinate transformation with rotation and translation
 * - Exact polygon-polygon intersection and clearance spacing detection
 * - Point-in-polygon containment (Ray Casting Algorithm)
 * - Line segment intersection and minimum point-to-segment clearance distance
 * - Fabric boundary containment validation
 * - SVG vector path generation for irregular garment pieces
 */

/**
 * Calculates the exact 2D area of a simple polygon using the Shoelace Formula (Gauss's Area Formula)
 * @param {Array<{x: number, y: number}>} points - Ordered array of polygon vertices
 * @returns {number} Non-negative area
 */
export function calculatePolygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;

  let sum = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    sum += points[i].x * points[next].y - points[next].x * points[i].y;
  }

  return Math.abs(sum) / 2;
}

/**
 * Transforms normalized contour coordinates [0, 1] to real-world centimeter coordinates
 * with rotation around center and translation offset.
 *
 * @param {Array<{x: number, y: number}>} normalizedOutline - Points with x, y in [0, 1]
 * @param {number} width - Real width in cm
 * @param {number} height - Real height in cm
 * @param {number} rotation - Rotation angle in degrees (0, 90, 180, 270)
 * @param {number} offsetX - Translation X coordinate on fabric bed
 * @param {number} offsetY - Translation Y coordinate on fabric bed
 * @returns {{
 *   worldPoints: Array<{x: number, y: number}>,
 *   relativePoints: Array<{x: number, y: number}>,
 *   boundWidth: number,
 *   boundHeight: number,
 *   minX: number,
 *   minY: number,
 *   maxX: number,
 *   maxY: number
 * }}
 */
export function transformNormalizedToWorldPolygon(
  normalizedOutline,
  width,
  height,
  rotation = 0,
  offsetX = 0,
  offsetY = 0
) {
  if (!Array.isArray(normalizedOutline) || normalizedOutline.length === 0) {
    // Fallback: rectangular polygon
    const rectRel = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ];
    return {
      worldPoints: rectRel.map((pt) => ({ x: pt.x + offsetX, y: pt.y + offsetY })),
      relativePoints: rectRel,
      boundWidth: width,
      boundHeight: height,
      minX: offsetX,
      minY: offsetY,
      maxX: offsetX + width,
      maxY: offsetY + height
    };
  }

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const cx = width / 2;
  const cy = height / 2;

  // 1. Scale to real cm and rotate around pattern center
  const rotatedPoints = normalizedOutline.map((pt) => {
    const px = pt.x * width;
    const py = pt.y * height;
    const dx = px - cx;
    const dy = py - cy;
    const rx = cx + dx * cos - dy * sin;
    const ry = cy + dx * sin + dy * cos;
    return { x: rx, y: ry };
  });

  // 2. Find local bounding box of rotated vertices
  let localMinX = Infinity;
  let localMaxX = -Infinity;
  let localMinY = Infinity;
  let localMaxY = -Infinity;

  for (const pt of rotatedPoints) {
    if (pt.x < localMinX) localMinX = pt.x;
    if (pt.x > localMaxX) localMaxX = pt.x;
    if (pt.y < localMinY) localMinY = pt.y;
    if (pt.y > localMaxY) localMaxY = pt.y;
  }

  const boundWidth = Number((localMaxX - localMinX).toFixed(3));
  const boundHeight = Number((localMaxY - localMinY).toFixed(3));

  // 3. Shift so top-left of rotated polygon sits at (0, 0) locally
  const relativePoints = rotatedPoints.map((pt) => ({
    x: Number((pt.x - localMinX).toFixed(3)),
    y: Number((pt.y - localMinY).toFixed(3))
  }));

  // 4. Translate to world position on fabric bed
  const worldPoints = relativePoints.map((pt) => ({
    x: Number((pt.x + offsetX).toFixed(3)),
    y: Number((pt.y + offsetY).toFixed(3))
  }));

  return {
    worldPoints,
    relativePoints,
    boundWidth,
    boundHeight,
    minX: offsetX,
    minY: offsetY,
    maxX: offsetX + boundWidth,
    maxY: offsetY + boundHeight
  };
}

/**
 * Computes the Axis-Aligned Bounding Box (AABB) of a polygon
 */
export function getPolygonBoundingBox(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Ray casting point-in-polygon test
 * @param {{x: number, y: number}} point - Test coordinate
 * @param {Array<{x: number, y: number}>} polygon - Ordered vertices
 * @returns {boolean} True if point is inside or on boundary
 */
export function isPointInPolygon(point, polygon) {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;
  const { x, y } = point;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    // Check if point lies on edge segment
    const onSegment =
      Math.abs((yj - yi) * (x - xi) - (y - yi) * (xj - xi)) < 1e-5 &&
      x >= Math.min(xi, xj) - 1e-5 &&
      x <= Math.max(xi, xj) + 1e-5 &&
      y >= Math.min(yi, yj) - 1e-5 &&
      y <= Math.max(yi, yj) + 1e-5;

    if (onSegment) return true;

    const intersect =
      (yi > y !== yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Checks if two 2D line segments (p1-p2) and (p3-p4) intersect
 */
export function checkSegmentIntersection(p1, p2, p3, p4) {
  const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  const intersectProper =
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);

  if (intersectProper) return true;

  // Collinear overlap check
  const onSegment = (p, a, b) =>
    p.x >= Math.min(a.x, b.x) - 1e-5 &&
    p.x <= Math.max(a.x, b.x) + 1e-5 &&
    p.y >= Math.min(a.y, b.y) - 1e-5 &&
    p.y <= Math.max(a.y, b.y) + 1e-5 &&
    Math.abs((b.y - a.y) * (p.x - a.x) - (p.y - a.y) * (b.x - a.x)) < 1e-5;

  return (
    onSegment(p1, p3, p4) ||
    onSegment(p2, p3, p4) ||
    onSegment(p3, p1, p2) ||
    onSegment(p4, p1, p2)
  );
}

/**
 * Computes shortest Euclidean distance from a point P to a line segment AB
 */
export function pointToSegmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(p.x - projX, p.y - projY);
}

/**
 * Exact polygon-polygon collision and clearance distance validation
 * @param {Array<{x: number, y: number}>} poly1 - World vertices of polygon 1
 * @param {Array<{x: number, y: number}>} poly2 - World vertices of polygon 2
 * @param {number} spacing - Minimum required clearance distance in cm
 * @returns {boolean} True if polygons intersect or violate minimum clearance spacing
 */
export function checkPolygonCollision(poly1, poly2, spacing = 0) {
  if (!Array.isArray(poly1) || poly1.length < 3 || !Array.isArray(poly2) || poly2.length < 3) {
    return false;
  }

  const s = Math.max(0, Number(spacing) || 0);

  // 1. Fast AABB Rejection
  const box1 = getPolygonBoundingBox(poly1);
  const box2 = getPolygonBoundingBox(poly2);

  if (
    box1.maxX + s < box2.minX ||
    box2.maxX + s < box1.minX ||
    box1.maxY + s < box2.minY ||
    box2.maxY + s < box1.minY
  ) {
    return false;
  }

  // 2. Direct Edge-Edge Intersection Check with fast segment AABB pre-filtering
  const n1 = poly1.length;
  const n2 = poly2.length;

  for (let i = 0; i < n1; i++) {
    const a1 = poly1[i];
    const a2 = poly1[(i + 1) % n1];
    const aMinX = Math.min(a1.x, a2.x);
    const aMaxX = Math.max(a1.x, a2.x);
    const aMinY = Math.min(a1.y, a2.y);
    const aMaxY = Math.max(a1.y, a2.y);

    for (let j = 0; j < n2; j++) {
      const b1 = poly2[j];
      const b2 = poly2[(j + 1) % n2];

      // Fast rejection: segment bounding boxes must overlap
      if (
        aMaxX < Math.min(b1.x, b2.x) ||
        Math.max(b1.x, b2.x) < aMinX ||
        aMaxY < Math.min(b1.y, b2.y) ||
        Math.max(b1.y, b2.y) < aMinY
      ) {
        continue;
      }

      if (checkSegmentIntersection(a1, a2, b1, b2)) {
        return true;
      }
    }
  }

  // 3. Point Containment Check (one polygon entirely inside the other)
  for (let i = 0; i < n1; i++) {
    if (isPointInPolygon(poly1[i], poly2)) return true;
  }
  for (let j = 0; j < n2; j++) {
    if (isPointInPolygon(poly2[j], poly1)) return true;
  }

  // 4. Clearance Spacing Check (minimum distance between vertices and edges)
  if (s > 0) {
    for (let i = 0; i < n1; i++) {
      const pt = poly1[i];
      for (let j = 0; j < n2; j++) {
        const segA = poly2[j];
        const segB = poly2[(j + 1) % n2];

        // Segment AABB pre-rejection with clearance s
        const minX = Math.min(segA.x, segB.x) - s;
        const maxX = Math.max(segA.x, segB.x) + s;
        const minY = Math.min(segA.y, segB.y) - s;
        const maxY = Math.max(segA.y, segB.y) + s;
        if (pt.x < minX || pt.x > maxX || pt.y < minY || pt.y > maxY) {
          continue;
        }

        if (pointToSegmentDistance(pt, segA, segB) < s - 1e-4) {
          return true;
        }
      }
    }

    for (let j = 0; j < n2; j++) {
      const pt = poly2[j];
      for (let i = 0; i < n1; i++) {
        const segA = poly1[i];
        const segB = poly1[(i + 1) % n1];

        // Segment AABB pre-rejection with clearance s
        const minX = Math.min(segA.x, segB.x) - s;
        const maxX = Math.max(segA.x, segB.x) + s;
        const minY = Math.min(segA.y, segB.y) - s;
        const maxY = Math.max(segA.y, segB.y) + s;
        if (pt.x < minX || pt.x > maxX || pt.y < minY || pt.y > maxY) {
          continue;
        }

        if (pointToSegmentDistance(pt, segA, segB) < s - 1e-4) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Validates that all vertices of a polygon lie strictly within fabric boundaries
 * @param {Array<{x: number, y: number}>} polygon - World coordinates
 * @param {number} fabricLength - Fabric X dimension in cm
 * @param {number} fabricWidth - Fabric Y dimension in cm
 * @returns {boolean} True if strictly within bounds
 */
export function isPolygonWithinFabric(polygon, fabricLength, fabricWidth) {
  if (!Array.isArray(polygon) || polygon.length === 0) return false;

  const EPS = 1e-4;
  for (const pt of polygon) {
    if (pt.x < -EPS || pt.y < -EPS || pt.x > fabricLength + EPS || pt.y > fabricWidth + EPS) {
      return false;
    }
  }

  return true;
}


/**
 * Converts polygon points (normalized or relative) into an SVG path d-attribute
 */
export function polygonToSvgPath(points, scaleX = 1, scaleY = 1) {
  if (!Array.isArray(points) || points.length < 3) return '';

  return (
    points
      .map((pt, idx) => {
        const cmd = idx === 0 ? 'M' : 'L';
        const px = Number((pt.x * scaleX).toFixed(2));
        const py = Number((pt.y * scaleY).toFixed(2));
        return `${cmd} ${px},${py}`;
      })
      .join(' ') + ' Z'
  );
}

/**
 * Checks collision between a pattern piece placement and a fabric roll defect / flaw zone
 * with clearance spacing enforcement.
 *
 * @param {object} piece - Placement piece with { x, y, width, height, worldPoints }
 * @param {object} defect - Defect zone with { x, y, radius, width, height }
 * @param {number} spacing - Minimum clearance spacing (cm)
 * @returns {boolean} True if piece collides or violates clearance buffer around defect
 */
export function checkPieceDefectCollision(piece, defect, spacing = 0) {
  if (!piece || !defect) return false;
  const s = Math.max(0, Number(spacing) || 0);

  const dx = Number(defect.x) || 0;
  const dy = Number(defect.y) || 0;
  const radius = Number(defect.radius) || 0;
  const dw = defect.width ? Number(defect.width) : (radius > 0 ? radius * 2 : 10);
  const dh = defect.height ? Number(defect.height) : (radius > 0 ? radius * 2 : 10);
  const defLeft = radius > 0 ? dx - radius : dx;
  const defTop = radius > 0 ? dy - radius : dy;
  const defRight = defLeft + dw;
  const defBottom = defTop + dh;

  // Fast AABB rejection
  const pRight = piece.x + piece.width + s;
  const pBottom = piece.y + piece.height + s;

  if (
    piece.x >= defRight + s ||
    pRight <= defLeft ||
    piece.y >= defBottom + s ||
    pBottom <= defTop
  ) {
    return false;
  }

  // Circular flaw boundary check
  if (radius > 0) {
    const effectiveRadius = radius + s;
    const nearestX = Math.max(piece.x, Math.min(dx, piece.x + piece.width));
    const nearestY = Math.max(piece.y, Math.min(dy, piece.y + piece.height));
    const distSq = (dx - nearestX) ** 2 + (dy - nearestY) ** 2;

    if (distSq > effectiveRadius * effectiveRadius) {
      return false;
    }

    if (piece.worldPoints && Array.isArray(piece.worldPoints) && piece.worldPoints.length >= 3) {
      if (isPointInPolygon({ x: dx, y: dy }, piece.worldPoints)) {
        return true;
      }
      const pts = piece.worldPoints;
      const n = pts.length;
      for (let i = 0; i < n; i++) {
        const segA = pts[i];
        const segB = pts[(i + 1) % n];
        if (pointToSegmentDistance({ x: dx, y: dy }, segA, segB) < effectiveRadius) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  // Rectangular obstacle polygon check
  const defectPoly = [
    { x: defLeft, y: defTop },
    { x: defRight, y: defTop },
    { x: defRight, y: defBottom },
    { x: defLeft, y: defBottom }
  ];

  if (piece.worldPoints && Array.isArray(piece.worldPoints)) {
    return checkPolygonCollision(piece.worldPoints, defectPoly, s);
  }

  return true;
}

