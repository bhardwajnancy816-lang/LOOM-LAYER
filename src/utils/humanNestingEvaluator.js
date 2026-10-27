/**
 * AI Fabric Cutter — Human vs. AI Real-Time Layout Evaluator
 * 
 * Evaluates live manual pattern piece arrangements against AI optimized benchmarks:
 * - Pairwise polygon and clearance boundary overlap detection
 * - Continuous marker length and active marker yield calculation
 * - Grain direction compliance validation
 * - Roll boundary violation detection
 * - Live Human vs. AI comparative score metrics
 */

import { checkPolygonCollision, getPolygonBoundingBox } from './polygonGeometry.js';

/**
 * Creates world-space polygon vertices for a piece at its current (x, y, width, height, rotation)
 */
export function getPieceWorldVertices(piece) {
  if (piece.relativePoints && Array.isArray(piece.relativePoints) && piece.relativePoints.length >= 3) {
    return piece.relativePoints.map((pt) => ({
      x: pt.x + piece.x,
      y: pt.y + piece.y
    }));
  }

  // Fallback to bounding rectangle
  return [
    { x: piece.x, y: piece.y },
    { x: piece.x + piece.width, y: piece.y },
    { x: piece.x + piece.width, y: piece.y + piece.height },
    { x: piece.x, y: piece.y + piece.height }
  ];
}

/**
 * Evaluates a set of pattern piece placements on the fabric roll
 *
 * @param {Array<Object>} placements - Current pieces with coordinates
 * @param {number} fabricWidth - Fabric roll width in cm
 * @param {number} fabricLength - Continuous fabric roll length in cm
 * @param {number} minSpacing - Blade clearance spacing in cm
 * @param {Object} aiBenchmark - Baseline AI metrics to compare against
 * @param {Object} options - Validation options (e.g. respectGrain)
 */
export function evaluatePlacements(
  placements = [],
  fabricWidth = 150,
  fabricLength = 500,
  minSpacing = 0.5,
  aiBenchmark = null,
  options = {}
) {
  const safeWidth = Number(fabricWidth) || 150;
  const safeLength = Number(fabricLength) || 500;
  const spacing = Math.max(0, Number(minSpacing) || 0);
  const respectGrain = options.respectGrain !== false;

  if (!Array.isArray(placements) || placements.length === 0) {
    return {
      isValid: true,
      placedCount: 0,
      cutLengthCm: 0,
      cutLengthM: 0,
      markerAreaM2: 0,
      totalPieceAreaM2: 0,
      markerYield: 0,
      scrapPercent: 100,
      fullRollUtilization: 0,
      overlaps: [],
      collidingPieceIds: new Set(),
      outOfBoundsPieceIds: new Set(),
      grainViolationPieceIds: new Set(),
      comparison: null
    };
  }

  const collidingPieceIds = new Set();
  const outOfBoundsPieceIds = new Set();
  const grainViolationPieceIds = new Set();
  const overlaps = [];

  // 1. Boundary & Grain Checks
  for (const p of placements) {
    const pWidth = Number(p.width) || 0;
    const pHeight = Number(p.height) || 0;
    const px = Number(p.x) || 0;
    const py = Number(p.y) || 0;

    // Boundary check (with small floating epsilon)
    if (px < -0.01 || py < -0.01 || px + pWidth > safeLength + 0.01 || py + pHeight > safeWidth + 0.01) {
      outOfBoundsPieceIds.add(p.id);
    }

    // Grainline check (Vertical grain strictness prevents 90° or 270° flips)
    if (respectGrain) {
      const grain = p.grainConstraint || p.grainDirection || 'Vertical';
      const rot = Number(p.rotation) || 0;
      if (grain === 'Vertical' && (rot === 90 || rot === 270)) {
        grainViolationPieceIds.add(p.id);
      }
    }
  }

  // 2. Pairwise Collision & Clearance Check
  const n = placements.length;
  for (let i = 0; i < n; i++) {
    const p1 = placements[i];
    const poly1 = getPieceWorldVertices(p1);
    const box1 = {
      minX: p1.x,
      maxX: p1.x + p1.width,
      minY: p1.y,
      maxY: p1.y + p1.height
    };

    for (let j = i + 1; j < n; j++) {
      const p2 = placements[j];
      const box2 = {
        minX: p2.x,
        maxX: p2.x + p2.width,
        minY: p2.y,
        maxY: p2.y + p2.height
      };

      // Fast AABB rejection with spacing buffer
      const aabbOverlap = !(
        box1.maxX + spacing <= box2.minX ||
        box2.maxX + spacing <= box1.minX ||
        box1.maxY + spacing <= box2.minY ||
        box2.maxY + spacing <= box1.minY
      );

      if (aabbOverlap) {
        // Detailed polygon check
        const poly2 = getPieceWorldVertices(p2);
        const collides = checkPolygonCollision(poly1, poly2, spacing);

        if (collides) {
          collidingPieceIds.add(p1.id);
          collidingPieceIds.add(p2.id);
          overlaps.push({
            piece1: { id: p1.id, name: p1.name },
            piece2: { id: p2.id, name: p2.name }
          });
        }
      }
    }
  }

  // 3. Metric Calculations
  const cutLengthCm = placements.reduce((max, p) => Math.max(max, (Number(p.x) || 0) + (Number(p.width) || 0)), 0);
  const cutLengthM = Number((cutLengthCm / 100).toFixed(2));

  // Compute piece areas
  let totalPieceAreaCm2 = 0;
  for (const p of placements) {
    if (p.area && Number(p.area) > 0) {
      totalPieceAreaCm2 += Number(p.area);
    } else {
      totalPieceAreaCm2 += (Number(p.width) || 0) * (Number(p.height) || 0);
    }
  }

  const markerAreaCm2 = cutLengthCm * safeWidth;
  const markerYield = markerAreaCm2 > 0 ? Number(((totalPieceAreaCm2 / markerAreaCm2) * 100).toFixed(1)) : 0;
  const scrapPercent = Number(Math.max(0, 100 - markerYield).toFixed(1));

  const rollAreaCm2 = safeLength * safeWidth;
  const fullRollUtilization = rollAreaCm2 > 0 ? Number(((totalPieceAreaCm2 / rollAreaCm2) * 100).toFixed(1)) : 0;

  const isValid = collidingPieceIds.size === 0 && outOfBoundsPieceIds.size === 0;

  // 4. Comparison vs AI Benchmark
  let comparison = null;
  if (aiBenchmark) {
    const aiYield = Number(aiBenchmark.markerUtilization || aiBenchmark.utilization || 0);
    const aiLengthCm = Number(aiBenchmark.actualLengthUsedCm || aiBenchmark.cutLengthCm || 0);
    const yieldDelta = Number((markerYield - aiYield).toFixed(1));
    const lengthDelta = Number((cutLengthCm - aiLengthCm).toFixed(1));

    let status = 'tied';
    let verdictText = '';

    if (!isValid) {
      status = 'invalid';
      verdictText = `⚠️ ${collidingPieceIds.size > 0 ? `${overlaps.length} Collision${overlaps.length > 1 ? 's' : ''}` : 'Out of bounds'} — fix overlaps to validate cut`;
    } else if (grainViolationPieceIds.size > 0) {
      status = 'grain_warning';
      verdictText = `⚠️ ${grainViolationPieceIds.size} piece${grainViolationPieceIds.size > 1 ? 's' : ''} violate vertical grainline strictness`;
    } else if (yieldDelta > 0.1) {
      status = 'human_ahead';
      verdictText = `🏆 Impressive! You beat the AI marker by +${yieldDelta} pp (${Math.abs(lengthDelta)} cm shorter)!`;
    } else if (yieldDelta < -0.1) {
      status = 'ai_ahead';
      verdictText = `🤖 AI marker is +${Math.abs(yieldDelta)} pp tighter (saves ${Math.abs(lengthDelta)} cm fabric)`;
    } else {
      status = 'tied';
      verdictText = `⚖️ Exact match! You achieved the same ${markerYield}% yield as the AI engine!`;
    }

    comparison = {
      aiYield,
      aiLengthCm,
      yieldDelta,
      lengthDelta,
      status,
      verdictText,
      humanWins: isValid && grainViolationPieceIds.size === 0 && yieldDelta > 0.1
    };
  }

  return {
    isValid,
    placedCount: placements.length,
    cutLengthCm: Number(cutLengthCm.toFixed(1)),
    cutLengthM,
    markerAreaM2: Number((markerAreaCm2 / 10000).toFixed(2)),
    totalPieceAreaM2: Number((totalPieceAreaCm2 / 10000).toFixed(2)),
    markerYield,
    scrapPercent,
    fullRollUtilization,
    overlaps,
    collidingPieceIds,
    outOfBoundsPieceIds,
    grainViolationPieceIds,
    comparison
  };
}

/**
 * Snaps piece coordinates to fabric bounds and adjacent pattern edges
 *
 * @param {number} rawX - Candidate X coordinate in cm
 * @param {number} rawY - Candidate Y coordinate in cm
 * @param {Object} activePiece - The piece being moved
 * @param {Array<Object>} otherPieces - Other pieces currently placed on roll
 * @param {number} fabricWidth - Roll width in cm
 * @param {number} fabricLength - Roll length in cm
 * @param {number} spacing - Minimum blade clearance spacing in cm
 * @param {number} snapThreshold - Distance within which snapping activates in cm (default 1.0cm)
 * @returns {{ x: number, y: number, snapped: boolean, snapAxis: string|null }}
 */
export function snapPiecePosition(
  rawX,
  rawY,
  activePiece,
  otherPieces = [],
  fabricWidth = 150,
  fabricLength = 500,
  spacing = 0.5,
  snapThreshold = 1.0
) {
  const pWidth = Number(activePiece.width) || 0;
  const pHeight = Number(activePiece.height) || 0;

  // 1. Clamp to roll boundaries
  let x = Math.max(0, Math.min(fabricLength - pWidth, rawX));
  let y = Math.max(0, Math.min(fabricWidth - pHeight, rawY));

  let snapped = false;
  let snapAxis = null;

  // 2. Snap to fabric borders
  if (x <= snapThreshold) {
    x = 0;
    snapped = true;
    snapAxis = 'x-left';
  }

  if (y <= snapThreshold) {
    y = 0;
    snapped = true;
    snapAxis = 'y-top';
  }

  if (fabricWidth - (y + pHeight) <= snapThreshold) {
    y = Number((fabricWidth - pHeight).toFixed(2));
    snapped = true;
    snapAxis = 'y-bottom';
  }

  // 3. Snap to adjacent pieces
  for (const other of otherPieces) {
    if (other.id === activePiece.id) continue;

    const oX = Number(other.x) || 0;
    const oY = Number(other.y) || 0;
    const oW = Number(other.width) || 0;
    const oH = Number(other.height) || 0;

    // Check vertical alignment overlap
    const vOverlap = !(y + pHeight < oY || y > oY + oH);
    // Check horizontal alignment overlap
    const hOverlap = !(x + pWidth < oX || x > oX + oW);

    // Snap to right edge of other piece
    if (vOverlap && Math.abs(x - (oX + oW + spacing)) <= snapThreshold) {
      x = Number((oX + oW + spacing).toFixed(2));
      snapped = true;
      snapAxis = 'x-edge';
    }

    // Snap to left edge of other piece
    if (vOverlap && Math.abs(x + pWidth + spacing - oX) <= snapThreshold) {
      x = Number((oX - pWidth - spacing).toFixed(2));
      snapped = true;
      snapAxis = 'x-edge';
    }

    // Snap to bottom edge of other piece
    if (hOverlap && Math.abs(y - (oY + oH + spacing)) <= snapThreshold) {
      y = Number((oY + oH + spacing).toFixed(2));
      snapped = true;
      snapAxis = 'y-edge';
    }

    // Snap to top edge of other piece
    if (hOverlap && Math.abs(y + pHeight + spacing - oY) <= snapThreshold) {
      y = Number((oY - pHeight - spacing).toFixed(2));
      snapped = true;
      snapAxis = 'y-edge';
    }
  }

  // Final sanity clamp
  x = Math.max(0, Math.min(fabricLength - pWidth, Number(x.toFixed(1))));
  y = Math.max(0, Math.min(fabricWidth - pHeight, Number(y.toFixed(1))));

  return { x, y, snapped, snapAxis };
}
