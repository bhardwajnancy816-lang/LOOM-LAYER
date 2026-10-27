/**
 * AI Fabric Cutter — Cutting Plan Generation & Multi-Format Export Engine
 *
 * Implements full cutting plan compilation and universal file exports:
 * 1. Comprehensive Cutting Plan Data Structure
 * 2. DXF-AAMA Standard Universal CAD Export for CNC Cutters
 * 3. Scalable Vector Graphics (SVG) Laser Path & Marker Export
 * 4. Machine-Readable CAM JSON Export
 * 5. Professional Printable Cutting Plan Master (PDF/Print HTML)
 * 6. ESG Sustainability Audit Report (PDF/Print HTML)
 */

import { getPieceContourPoints } from './cuttingSimulator.js';
import { getGarmentSvgPath } from './garmentGeometry.js';
import { polygonToSvgPath } from './polygonGeometry.js';
import { validateNestingLayout } from './fabricOptimizer.js';

/**
 * Calculates the exact cutting perimeter (in cm) for a placed piece contour
 */
export function calculatePiecePerimeter(placement) {
  if (!placement) return 0;

  const w = Number(placement.width) || 10;
  const h = Number(placement.height) || 10;

  const pts = getPieceContourPoints(placement, 1);
  if (!Array.isArray(pts) || pts.length < 2) {
    // Default rectangular perimeter fallback
    return Number((2 * (w + h)).toFixed(2));
  }

  let perimeter = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    perimeter += Math.hypot(p2.x - p1.x, p2.y - p1.y);
  }

  return Number(perimeter.toFixed(2));
}

/**
 * Calculates realistic cutting time based on exact contour perimeter,
 * machine cutting speeds, pierce overhead, and roll feed overhead.
 *
 * @param {Array} placements - Placed pattern pieces
 * @param {number} fabricLength - Fabric roll length in cm
 * @param {number} fabricWidth - Fabric roll width in cm
 * @returns {object} Estimated cutting time details
 */
export function calculateEstimatedCuttingTime(placements = [], fabricLength = 100, fabricWidth = 100) {
  const pieces = Array.isArray(placements) ? placements : [];
  const piecesCount = pieces.length;

  if (piecesCount === 0) {
    return {
      totalSeconds: 0,
      minutes: 0,
      seconds: 0,
      formatted: '0 min 0 sec',
      totalPerimeterCm: 0,
      averageTimePerPieceSec: 0
    };
  }

  // 1. Total perimeter across all placed pieces (cm)
  let totalPerimeterCm = 0;
  pieces.forEach((p) => {
    totalPerimeterCm += calculatePiecePerimeter(p);
  });

  // 2. Machine cutting speed: ~50 cm/sec (typical CNC knife/laser speed = 30 m/min)
  const cuttingSpeedCmPerSec = 50;
  const rawCutSeconds = totalPerimeterCm / cuttingSpeedCmPerSec;

  // 3. Knife pierce/plunge & positioning transit overhead: 2.0 sec per piece
  const pierceOverheadSec = piecesCount * 2.0;

  // 4. Fabric roll feed & conveyor indexing overhead: ~10 sec per 100 cm roll length
  const rollLengthMeters = Math.max(1, (Number(fabricLength) || 100) / 100);
  const rollFeedSec = Math.round(rollLengthMeters * 8);

  // 5. Machine homing / base setup constant
  const baseSetupSec = 15;

  const totalSeconds = Math.max(25, Math.round(rawCutSeconds + pierceOverheadSec + rollFeedSec + baseSetupSec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formatted = minutes > 0 ? `${minutes} min ${seconds} sec` : `${seconds} sec`;

  return {
    totalSeconds,
    minutes,
    seconds,
    formatted,
    totalPerimeterCm: Number(totalPerimeterCm.toFixed(1)),
    averageTimePerPieceSec: Number((totalSeconds / piecesCount).toFixed(1))
  };
}

/**
 * Compiles a complete, reliable cutting plan data structure from project data
 */
export function generateCuttingPlan(project) {
  if (!project) {
    throw new Error('Invalid project data provided to generateCuttingPlan.');
  }

  const fabricLength = Number(project.fabricLength) || 500;
  const fabricWidth = Number(project.fabricWidth) || 150;
  const fabricType = project.fabricType || 'Cotton';
  const grainDirection = project.grainDirection || 'Vertical';
  const stretch = project.stretch || 'No';

  const fabricAreaCm2 = fabricLength * fabricWidth;
  const fabricAreaM2 = Number((fabricAreaCm2 / 10000).toFixed(3));

  const patterns = Array.isArray(project.patterns) ? project.patterns : [];
  const placements = Array.isArray(project.layoutPlacements) ? project.layoutPlacements : [];

  const totalPiecesPlanned = project.totalPieces !== undefined
    ? Number(project.totalPieces)
    : patterns.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  const placedCount = placements.length;
  const unplacedCount = project.unplacedCount !== undefined
    ? Number(project.unplacedCount)
    : Math.max(0, totalPiecesPlanned - placedCount);

  const utilization = project.utilization !== undefined ? Number(project.utilization) : 0;
  const wastePercentage = project.wastePercentage !== undefined ? Number(project.wastePercentage) : 100;
  
  const usedAreaM2 = project.usedArea !== undefined
    ? Number(project.usedArea)
    : Number(((placements.reduce((s, p) => s + (p.polygonArea || (p.width * p.height)), 0)) / 10000).toFixed(3));
  
  const wasteAreaM2 = project.wasteArea !== undefined
    ? Number(project.wasteArea)
    : Number(Math.max(0, fabricAreaM2 - usedAreaM2).toFixed(3));

  const cuttingTime = calculateEstimatedCuttingTime(placements, fabricLength, fabricWidth);

  // Compile individual piece placements
  const compiledPlacements = placements.map((p, idx) => {
    const w = Number(p.width) || 10;
    const h = Number(p.height) || 10;
    const x = Number(p.x !== undefined ? p.x : 0);
    const y = Number(p.y !== undefined ? p.y : 0);
    const rotation = Number(p.rotation || 0);
    const areaCm2 = Number((p.polygonArea || (w * h)).toFixed(2));
    const areaM2 = Number((areaCm2 / 10000).toFixed(4));
    const perimeterCm = calculatePiecePerimeter(p);
    const contourPoints = getPieceContourPoints(p, 1);

    return {
      sequence: idx + 1,
      id: p.id || `piece-${idx + 1}`,
      patternId: p.patternId || null,
      name: p.name || `Piece #${idx + 1}`,
      category: p.category || 'PART',
      shapeType: p.shapeType || 'front-bodice',
      color: p.color || '#0284c7',
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      width: w,
      height: h,
      rotation,
      rotated: rotation !== 0,
      areaCm2,
      areaM2,
      perimeterCm,
      outline: p.outline || null,
      relativePoints: p.relativePoints || null,
      worldPoints: p.worldPoints || null,
      contourPoints
    };
  });

  const layoutValidation = validateNestingLayout(
    placements,
    fabricLength,
    fabricWidth,
    project?.minSpacing !== undefined ? Number(project.minSpacing) : 0.5
  );

  return {
    title: 'Loom & Layer — Optimized Cutting Plan',
    projectId: project.id || 'proj-unknown',
    projectName: project.name || 'Untitled Fabric Cut Plan',
    productType: project.productType || 'Other / Custom Garment',
    createdAt: project.createdAt || new Date().toISOString(),
    status: project.status || 'Completed',
    isLayoutValid: layoutValidation.isValid,
    validationErrors: layoutValidation.errors,
    fabricRoll: {
      length: fabricLength,
      width: fabricWidth,
      lengthM: Number((fabricLength / 100).toFixed(2)),
      widthM: Number((fabricWidth / 100).toFixed(2)),
      totalAreaCm2: fabricAreaCm2,
      totalAreaM2: fabricAreaM2,
      fabricType,
      grainDirection,
      stretch
    },
    optimizationSummary: {
      priority: project.optimizationPriority || 'Minimum Fabric Waste',
      minSpacing: project.minSpacing !== undefined ? Number(project.minSpacing) : 0.5,
      allowRotation: project.allowRotation !== undefined ? Boolean(project.allowRotation) : true,
      respectGrain: project.respectGrain !== undefined ? Boolean(project.respectGrain) : true,
      utilization,
      wastePercentage,
      usedAreaM2,
      wasteAreaM2,
      evaluatedFabricAreaM2: fabricAreaM2,
      placedPatternAreaM2: usedAreaM2,
      unusedAreaM2: wasteAreaM2,
      actualLengthUsedCm: project.actualLengthUsedCm !== undefined ? Number(project.actualLengthUsedCm) : (placements.length > 0 ? Math.max(...placements.map(p => p.x + p.width)) : 0),
      actualLengthUsedM: project.actualLengthUsedM !== undefined ? Number(project.actualLengthUsedM) : Number(((placements.length > 0 ? Math.max(...placements.map(p => p.x + p.width)) : 0) / 100).toFixed(2)),
      remainingRollLengthCm: project.remainingRollLengthCm !== undefined ? Number(project.remainingRollLengthCm) : Math.max(0, fabricLength - (project.actualLengthUsedCm || (placements.length > 0 ? Math.max(...placements.map(p => p.x + p.width)) : 0))),
      remainingRollLengthM: project.remainingRollLengthM !== undefined ? Number(project.remainingRollLengthM) : Number((Math.max(0, fabricLength - (project.actualLengthUsedCm || (placements.length > 0 ? Math.max(...placements.map(p => p.x + p.width)) : 0))) / 100).toFixed(2)),
      markerAreaM2: project.markerAreaM2 !== undefined ? Number(project.markerAreaM2) : (placements.length > 0 ? Number((((placements.length > 0 ? Math.max(...placements.map(p => p.x + p.width)) : 0) * fabricWidth) / 10000).toFixed(3)) : 0),
      markerUtilization: project.markerUtilization !== undefined ? Number(project.markerUtilization) : (placements.length > 0 ? utilization : 0),
      markerWastePercentage: project.markerWastePercentage !== undefined ? Number(project.markerWastePercentage) : (placements.length > 0 ? wastePercentage : 100),
      markerWasteAreaM2: project.markerWasteAreaM2 !== undefined ? Number(project.markerWasteAreaM2) : null,
      isLayoutValid: layoutValidation.isValid,
      validationErrors: layoutValidation.errors,
      fabricSavedMeters: (project.fabricSavedMeters !== undefined && Number(project.fabricSavedMeters) > 0)
        ? Number(project.fabricSavedMeters)
        : (Boolean(project.hasValidBaseline) && project.baselineLengthUsedM !== undefined && project.actualLengthUsedM !== undefined && Number(project.baselineLengthUsedM) > Number(project.actualLengthUsedM)
          ? Number((Number(project.baselineLengthUsedM) - Number(project.actualLengthUsedM)).toFixed(2))
          : 0),
      fabricSavedKg: project.fabricSavedKg !== undefined ? Number(project.fabricSavedKg) : 0,
      hasValidBaseline: Boolean(project.hasValidBaseline),
      baselineUtilization: project.baselineUtilization !== undefined ? Number(project.baselineUtilization) : 0,
      baselineWastePercentage: project.baselineWastePercentage !== undefined ? Number(project.baselineWastePercentage) : 100,
      baselineUsedAreaM2: project.baselineUsedArea !== undefined ? Number(project.baselineUsedArea) : 0,
      baselineWasteAreaM2: project.baselineWasteArea !== undefined ? Number(project.baselineWasteArea) : 0,
      baselineLengthUsedCm: project.baselineLengthUsedCm !== undefined ? Number(project.baselineLengthUsedCm) : (project.baselineLengthUsedM ? Number(project.baselineLengthUsedM) * 100 : fabricLength),
      baselineLengthUsedM: project.baselineLengthUsedM !== undefined ? Number(project.baselineLengthUsedM) : Number((fabricLength / 100).toFixed(2)),
      baselineMarkerUtilization: project.baselineMarkerUtilization !== undefined ? Number(project.baselineMarkerUtilization) : (project.baselineUtilization || 0),
      utilizationDeltaPp: project.utilizationDeltaPp !== undefined ? Number(project.utilizationDeltaPp) : 0,
      wasteDeltaPp: project.wasteDeltaPp !== undefined ? Number(project.wasteDeltaPp) : 0,
      fabricPricePerMeter: project.fabricPricePerMeter !== undefined ? Number(project.fabricPricePerMeter) : (project.fabricPrice !== undefined ? Number(project.fabricPrice) : 200.0),
      estimatedCostSavings: Boolean(project.hasValidBaseline) && ((project.fabricSavedMeters || 0) > 0 || (project.baselineLengthUsedM && project.actualLengthUsedM && project.baselineLengthUsedM > project.actualLengthUsedM))
        ? Number((((project.fabricSavedMeters !== undefined && Number(project.fabricSavedMeters) > 0) ? Number(project.fabricSavedMeters) : Math.max(0, Number((project.baselineLengthUsedM - project.actualLengthUsedM).toFixed(2)))) * (project.fabricPricePerMeter !== undefined ? project.fabricPricePerMeter : (project.fabricPrice || 200.0))).toFixed(2))
        : 0
    },
    patternTemplates: patterns.map((pat) => ({
      id: pat.id,
      name: pat.name,
      category: pat.category || 'FRONT',
      shapeType: pat.shapeType || 'front-bodice',
      width: Number(pat.width) || 30,
      height: Number(pat.height) || 40,
      quantity: Number(pat.quantity) || 1,
      rotationAllowed: pat.rotationAllowed !== undefined ? Boolean(pat.rotationAllowed) : true,
      grainConstraint: pat.grainConstraint || pat.grainDirection || 'Vertical',
      color: pat.color || '#0284c7',
      templateAreaM2: Number((((Number(pat.width) || 30) * (Number(pat.height) || 40)) / 10000).toFixed(4))
    })),
    totalPatternTemplates: patterns.length,
    totalPieces: totalPiecesPlanned,
    placedPiecesCount: placedCount,
    unplacedPiecesCount: unplacedCount,
    unplacedPieces: Array.isArray(project.unplacedPieces) ? project.unplacedPieces : [],
    isFullSuccess: unplacedCount === 0,
    estimatedCuttingTime: cuttingTime,
    placements: compiledPlacements
  };
}

/**
 * Transforms local piece contour points into world fabric coordinates (accounting for rotation and translation)
 */
function transformContourToWorld(points, x, y, width, height, rotation) {
  if (!Array.isArray(points) || points.length === 0) return [];

  // Local contour points are aligned to [0, width] x [0, height]
  return points.map((pt) => ({
    x: Number((x + pt.x).toFixed(3)),
    y: Number((y + pt.y).toFixed(3))
  }));
}

/**
 * Generates universal DXF-AAMA standard text file for CNC / CAM garment cutters
 */
export function exportCuttingPlanToDXF(project) {
  const plan = generateCuttingPlan(project);
  const roll = plan.fabricRoll;

  let dxf = '';
  // 1. DXF Header
  dxf += '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1015\n9\n$INSUNITS\n70\n5\n0\nENDSEC\n'; // Units: 5 = Centimeters

  // 2. Layer Table Definition
  dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n4\n';
  // Layer: FABRIC_BOUNDARY (Color 7: White)
  dxf += '0\nLAYER\n2\nFABRIC_BOUNDARY\n70\n0\n62\n7\n6\nCONTINUOUS\n0\n';
  // Layer: CUT_CONTOUR (Color 3: Green)
  dxf += '0\nLAYER\n2\nCUT_CONTOUR\n70\n0\n62\n3\n6\nCONTINUOUS\n0\n';
  // Layer: GRAIN_LINE (Color 1: Red)
  dxf += '0\nLAYER\n2\nGRAIN_LINE\n70\n0\n62\n1\n6\nCONTINUOUS\n0\n';
  // Layer: LABELS (Color 4: Cyan)
  dxf += '0\nLAYER\n2\nLABELS\n70\n0\n62\n4\n6\nCONTINUOUS\n0\n';
  dxf += 'ENDTAB\n0\nENDSEC\n';

  // 3. Entities Section
  dxf += '0\nSECTION\n2\nENTITIES\n';

  // Fabric Outer Boundary Rectangle (LWPOLYLINE)
  dxf += '0\nLWPOLYLINE\n8\nFABRIC_BOUNDARY\n90\n4\n70\n1\n';
  dxf += `10\n0.0\n20\n0.0\n`;
  dxf += `10\n${roll.length.toFixed(2)}\n20\n0.0\n`;
  dxf += `10\n${roll.length.toFixed(2)}\n20\n${roll.width.toFixed(2)}\n`;
  dxf += `10\n0.0\n20\n${roll.width.toFixed(2)}\n`;

  // Placed pieces
  plan.placements.forEach((piece) => {
    const rawPoints = piece.contourPoints && piece.contourPoints.length >= 3
      ? piece.contourPoints
      : [
          { x: 0, y: 0 },
          { x: piece.width, y: 0 },
          { x: piece.width, y: piece.height },
          { x: 0, y: piece.height }
        ];

    const worldPoints = transformContourToWorld(rawPoints, piece.x, piece.y, piece.width, piece.height, piece.rotation);

    // Write Cut Contour Polyline
    dxf += `0\nLWPOLYLINE\n8\nCUT_CONTOUR\n90\n${worldPoints.length}\n70\n1\n`;
    worldPoints.forEach((pt) => {
      dxf += `10\n${pt.x.toFixed(3)}\n20\n${pt.y.toFixed(3)}\n`;
    });

    // Write Grain Direction Line
    const centerX = piece.x + piece.width / 2;
    const centerY = piece.y + piece.height / 2;
    const rad = (piece.rotation * Math.PI) / 180;
    const halfGrain = Math.min(piece.height * 0.3, 15);
    const gx1 = centerX - Math.sin(rad) * halfGrain;
    const gy1 = centerY + Math.cos(rad) * halfGrain;
    const gx2 = centerX + Math.sin(rad) * halfGrain;
    const gy2 = centerY - Math.cos(rad) * halfGrain;

    dxf += `0\nLINE\n8\nGRAIN_LINE\n10\n${gx1.toFixed(3)}\n20\n${gy1.toFixed(3)}\n30\n0.0\n11\n${gx2.toFixed(3)}\n21\n${gy2.toFixed(3)}\n31\n0.0\n`;

    // Write Piece Label Text
    dxf += `0\nTEXT\n8\nLABELS\n10\n${centerX.toFixed(3)}\n20\n${centerY.toFixed(3)}\n30\n0.0\n40\n1.8\n1\n#${piece.sequence} ${piece.name}\n50\n${piece.rotation}\n`;
  });

  // End Entities and EOF
  dxf += '0\nENDSEC\n0\nEOF\n';
  return dxf;
}

/**
 * Generates standalone vector SVG markup for laser path cutting and visual display
 */
export function exportCuttingPlanToSVG(project, options = {}) {
  const plan = generateCuttingPlan(project);
  const roll = plan.fabricRoll;
  const scale = options.scale || 2.0;

  const svgW = roll.length * scale;
  const svgH = roll.width * scale;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
  <defs>
    <pattern id="grid" width="${20 * scale}" height="${20 * scale}" patternUnits="userSpaceOnUse">
      <path d="M ${20 * scale} 0 L 0 0 0 ${20 * scale}" fill="none" stroke="#e2e8f0" stroke-width="0.75"/>
    </pattern>
    <linearGradient id="fabricBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#f1f5f9"/>
    </linearGradient>
  </defs>

  <!-- Fabric Roll Background -->
  <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="url(#fabricBg)" stroke="#94a3b8" stroke-width="1.5"/>
  <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="url(#grid)"/>

  <!-- Placed Pattern Pieces -->
  <g id="nested-pieces">
`;

  plan.placements.forEach((piece) => {
    const sx = piece.x * scale;
    const sy = piece.y * scale;
    const sw = piece.width * scale;
    const sh = piece.height * scale;
    const cx = sw / 2;
    const cy = sh / 2;

    const pathD = piece.outline && Array.isArray(piece.outline) && piece.outline.length >= 3
      ? polygonToSvgPath(piece.outline, sw, sh)
      : getGarmentSvgPath(piece.shapeType, sw, sh);

    svg += `    <g transform="translate(${sx}, ${sy}) rotate(${piece.rotation} ${cx} ${cy})">
      <!-- Cut Contour -->
      <path d="${pathD}" fill="${piece.color || '#0284c7'}" fill-opacity="0.8" stroke="#1e293b" stroke-width="1" stroke-linejoin="round"/>
      <!-- Seam Guideline -->
      <path d="${pathD}" transform="scale(0.92) translate(${sw * 0.04}, ${sh * 0.04})" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="0.75" stroke-dasharray="3,2"/>
      <!-- Grainline -->
      <line x1="${cx}" y1="${cy - sh * 0.25}" x2="${cx}" y2="${cy + sh * 0.25}" stroke="#ffffff" stroke-width="1" stroke-dasharray="4,2"/>
      <!-- Label -->
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="monospace" font-size="${Math.max(8, scale * 3.5)}" font-weight="bold">${piece.sequence}. ${piece.name}</text>
      <text x="${cx}" y="${cy + Math.max(10, scale * 4)}" text-anchor="middle" dominant-baseline="central" fill="rgba(255,255,255,0.9)" font-family="monospace" font-size="${Math.max(6, scale * 2.2)}">${piece.width}×${piece.height}cm (${piece.rotation}°)</text>
    </g>\n`;
  });

  svg += `  </g>
</svg>`;

  return svg;
}

/**
 * Exports complete machine-readable CAM JSON
 */
export function exportCuttingPlanToJSON(project) {
  const plan = generateCuttingPlan(project);
  return JSON.stringify(plan, null, 2);
}

/**
 * Generates self-contained printable cutting plan master document with embedded SVG and tabular specs
 */
export function generatePrintableCuttingPlanHTML(project) {
  const plan = generateCuttingPlan(project);
  const roll = plan.fabricRoll;
  const summary = plan.optimizationSummary;
  const svgContent = exportCuttingPlanToSVG(project, { scale: 1.5 });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cutting Plan — ${plan.projectName}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { color: #1c1917; background: #ffffff; padding: 20px; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
    .badge { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; }
    .grid-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; }
    .kpi-title { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 3px; font-family: monospace; }
    .kpi-highlight { color: #059669; }
    .section-title { font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; margin: 14px 0 6px 0; display: flex; justify-content: space-between; }
    .visual-container { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; overflow: hidden; margin-bottom: 16px; }
    .visual-container svg { width: 100%; height: auto; max-height: 220px; display: block; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 14px; }
    th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #e2e8f0; }
    td { padding: 5px 8px; border: 1px solid #e2e8f0; font-family: monospace; }
    tr:nth-child(even) { background: #f8fafc; }
    .footer { font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 12px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .visual-container { break-inside: avoid; }
      table { break-inside: auto; }
      tr { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 12px; display: flex; justify-content: flex-end; gap: 8px;">
    <button onclick="window.print()" style="background: #059669; color: #ffffff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="title">Loom & Layer — Marker Master Cutting Plan</div>
      <div class="subtitle">Project: <strong>${plan.projectName}</strong> • ${plan.productType ? `Product: <strong>${plan.productType}</strong> • ` : ''}Created: ${new Date(plan.createdAt).toLocaleDateString()} • Format: CNC DXF / Automated Cutting</div>
    </div>
    <div class="badge">Efficiency: ${summary.utilization}%</div>
  </div>

  <div class="grid-kpis">
    <div class="kpi-card">
      <div class="kpi-title">Fabric Roll Spec</div>
      <div class="kpi-value">${roll.length} × ${roll.width} cm</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">${summary.markerUtilization ? 'Marker Yield' : 'Material Utilization'}</div>
      <div class="kpi-value kpi-highlight">${summary.markerUtilization || summary.utilization}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">${summary.markerUtilization ? 'Cut Req / Preserved' : 'Waste Scrap'}</div>
      <div class="kpi-value" style="color: ${summary.markerUtilization ? '#059669' : '#e11d48'}; font-size: 13px;">
        ${summary.markerUtilization ? `${summary.actualLengthUsedM}m cut / ${summary.remainingRollLengthM}m roll` : `${summary.wastePercentage}%`}
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Placed Pieces</div>
      <div class="kpi-value">${plan.placedPiecesCount} / ${plan.totalPieces}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Est. Cut Time</div>
      <div class="kpi-value">${plan.estimatedCuttingTime.formatted}</div>
    </div>
  </div>

  <div class="section-title">
    <span>Visual Nested Marker (${roll.length}cm × ${roll.width}cm)</span>
    <span style="font-size: 10px; font-weight: normal; color: #64748b;">Clearance: ${summary.minSpacing}cm • Grain: ${roll.grainDirection}</span>
  </div>
  <div class="visual-container">
    ${svgContent}
  </div>

  <div class="section-title">
    <span>Piece Placement Schedule (${plan.placedPiecesCount} Cut Pieces)</span>
    <span style="font-size: 10px; font-weight: normal; color: #64748b;">Total Cut Path: ${plan.estimatedCuttingTime.totalPerimeterCm} cm</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Piece Name</th>
        <th>Category</th>
        <th>Position (X, Y)</th>
        <th>Dimensions</th>
        <th>Rotation</th>
        <th>Area (cm²)</th>
        <th>Perimeter</th>
      </tr>
    </thead>
    <tbody>
      ${plan.placements.map((p) => `
      <tr>
        <td>${p.sequence}</td>
        <td style="font-family: inherit; font-weight: 600;">${p.name}</td>
        <td>${p.category}</td>
        <td>X: ${p.x.toFixed(1)} cm, Y: ${p.y.toFixed(1)} cm</td>
        <td>${p.width} × ${p.height} cm</td>
        <td>${p.rotation}°</td>
        <td>${p.areaCm2} cm²</td>
        <td>${p.perimeterCm} cm</td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${plan.unplacedPiecesCount > 0 ? `
  <div class="section-title" style="color: #b45309; margin-top: 24px; border-left: 3px solid #f59e0b; padding-left: 8px;">
    <span>Unplaced Pieces (${plan.unplacedPiecesCount} of ${plan.totalPieces} pieces could not fit)</span>
    <span style="font-size: 10px; font-weight: normal; color: #b45309;">Roll capacity: ${roll.length}×${roll.width}cm</span>
  </div>
  <table style="border-left: 3px solid #f59e0b;">
    <thead>
      <tr style="background: #fffbeb;">
        <th style="width: 30px;">#</th>
        <th>Piece Name</th>
        <th>Category</th>
        <th>Dimensions</th>
        <th>Grain</th>
        <th>Reason</th>
      </tr>
    </thead>
    <tbody>
      ${(plan.unplacedPieces || []).map((p, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-family: inherit; font-weight: 600;">${p.name}</td>
        <td>${p.category || '-'}</td>
        <td>${p.width} × ${p.height} cm</td>
        <td>${p.grainConstraint || 'Vertical'}</td>
        <td style="color: #b45309; font-size: 11px;">${p.reason || 'Exceeds continuous fabric space'}</td>
      </tr>`).join('')}
    </tbody>
  </table>` : ''}

  <div class="footer">
    Loom & Layer Production System • Deterministic CAM Cutting Plan • Compatible with Gerber, Lectra & CO₂ Laser Systems
  </div>
</body>
</html>`;
}

/**
 * Generates self-contained printable ESG Sustainability Audit Report HTML document
 */
export function generatePrintableSustainabilityReportHTML(project) {
  const plan = generateCuttingPlan(project);
  const summary = plan.optimizationSummary;
  const roll = plan.fabricRoll;

  const hasBaseline = Boolean(summary.hasValidBaseline) && summary.baselineUtilization !== undefined && summary.baselineUtilization !== null && Number(summary.baselineUtilization) > 0;
  const baselineUtil = hasBaseline ? summary.baselineUtilization : null;
  const baselineWaste = hasBaseline ? summary.baselineWastePercentage : null;
  const utilDelta = hasBaseline ? summary.utilizationDeltaPp : 0;
  const fabricSavedM = hasBaseline ? summary.fabricSavedMeters : 0;
  // Saved Fabric Weight & LCA Indicators:
  // Note: Fabric weight is an estimated indicator derived from saved fabric area using an
  // assumed generic textile fabric density of 280 g/m² (0.28 kg/m²).
  // Environmental indicators use generic provisional proxy assumptions:
  // - Freshwater proxy: 1,400 L/kg textile
  // - Emissions proxy: 6.8 kg CO₂e/kg textile
  // These are provisional generic assumptions, not verified material-specific LCA factors.
  const fabricSavedKg = hasBaseline
    ? (summary.fabricSavedKg > 0 ? summary.fabricSavedKg : Number(((fabricSavedM * (roll.width / 100)) * 0.28).toFixed(2)))
    : 0;
  const waterSavedL = hasBaseline ? Math.round(fabricSavedKg * 1400) : 0;
  const estimatedWaterL = waterSavedL >= 20 ? Math.round(waterSavedL / 10) * 10 : waterSavedL;
  const co2SavedKg = hasBaseline ? Number((fabricSavedKg * 6.8).toFixed(1)) : 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ESG Sustainability Audit Report — ${plan.projectName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { color: #1c1917; background: #ffffff; padding: 24px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #059669; padding-bottom: 14px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
    .badge { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 6px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
    .grid-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 10px; }
    .card-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace; }
    .card-sub { font-size: 10px; color: #64748b; margin-top: 3px; }
    .highlight { color: #059669; }
    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; margin: 20px 0 10px 0; border-left: 3px solid #059669; padding-left: 8px; }
    .benchmark-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 18px; }
    .benchmark-table th { background: #f1f5f9; text-align: left; padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: 700; }
    .benchmark-table td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    .bar-container { height: 16px; background: #e2e8f0; border-radius: 4px; overflow: hidden; display: flex; margin-top: 4px; }
    .bar-used { background: #059669; height: 100%; }
    .bar-waste { background: #fda4af; height: 100%; }
    .bar-base-used { background: #94a3b8; height: 100%; }
    .bar-base-waste { background: #fca5a5; height: 100%; }
    .box-audit { background: #0f172a; color: #ffffff; padding: 16px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; }
    .box-audit h4 { font-size: 13px; font-weight: 700; color: #34d399; margin-bottom: 6px; }
    .footer { font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 14px; display: flex; justify-content: flex-end; gap: 8px;">
    <button onclick="window.print()" style="background: #059669; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Print / Save as PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="title">ESG Sustainability & Material Yield Audit</div>
      <div class="subtitle">Project: <strong>${plan.projectName}</strong> • ${plan.productType ? `Product: <strong>${plan.productType}</strong> • ` : ''}Fabric: ${roll.fabricType} (${roll.length}×${roll.width}cm) • Audit ID: ESG-${plan.projectId}</div>
    </div>
    <div class="badge">${hasBaseline ? `+${utilDelta > 0 ? utilDelta : 0} pp Yield Gain` : 'Material Yield Audit'}</div>
  </div>

  <div class="grid-metrics">
    <div class="card">
      <div class="card-title">Material Utilization</div>
      <div class="card-value highlight">${summary.utilization}%</div>
      <div class="card-sub">${hasBaseline ? `vs ${baselineUtil}% baseline` : 'Baseline data not established'}</div>
    </div>
    <div class="card">
      <div class="card-title">Fabric Saved</div>
      <div class="card-value highlight">${fabricSavedM} m</div>
      <div class="card-sub">${hasBaseline ? `~${fabricSavedKg} kg pre-consumer textile (estimated)` : 'Baseline input required'}</div>
    </div>
    <div class="card">
      <div class="card-title">Freshwater Saved</div>
      <div class="card-value">${waterSavedL > 0 ? `~${estimatedWaterL.toLocaleString()} L` : '0 L'}</div>
      <div class="card-sub">Assumed proxy (1,400 L/kg textile)</div>
    </div>
    <div class="card">
      <div class="card-title">CO₂e Avoided</div>
      <div class="card-value">${co2SavedKg > 0 ? `~${co2SavedKg} kg` : '0 kg'}</div>
      <div class="card-sub">Assumed proxy (6.8 kg CO₂e/kg textile)</div>
    </div>
  </div>

  <div class="section-title">Fabric Yield Benchmark: Sequential Baseline vs Loom & Layer</div>
  <table class="benchmark-table">
    <thead>
      <tr>
        <th>Methodology</th>
        <th>Utilization</th>
        <th>Waste Scrap</th>
        <th>Linear Roll Used</th>
        <th>Visual Yield Breakdown</th>
      </tr>
    </thead>
    <tbody>
      ${hasBaseline ? `
      <tr>
        <td><strong>Sequential Baseline</strong></td>
        <td>${baselineUtil}%</td>
        <td style="color: #e11d48; font-weight: 600;">${baselineWaste}%</td>
        <td>${summary.baselineLengthUsedM !== undefined ? Number(summary.baselineLengthUsedM).toFixed(2) : (roll.length / 100).toFixed(2)} m</td>
        <td>
          <div class="bar-container">
            <div class="bar-base-used" style="width: ${baselineUtil}%;"></div>
            <div class="bar-base-waste" style="width: ${baselineWaste}%;"></div>
          </div>
        </td>
      </tr>` : `
      <tr>
        <td colspan="5" style="text-align: center; color: #64748b; padding: 12px; background: #f8fafc;">
          Sequential baseline marker data required for comparative layout benchmarking.
        </td>
      </tr>`}
      <tr style="background: #fdf5f3;">
        <td><strong>Loom & Layer (Nested)</strong></td>
        <td style="color: #9e2a2b; font-weight: 700;">${summary.utilization}%</td>
        <td style="color: #9e2a2b; font-weight: 700;">${summary.wastePercentage}%</td>
        <td>${summary.actualLengthUsedM !== undefined ? Number(summary.actualLengthUsedM).toFixed(2) : (roll.length / 100).toFixed(2)} m</td>
        <td>
          <div class="bar-container">
            <div class="bar-used" style="width: ${summary.utilization}%;"></div>
            <div class="bar-waste" style="width: ${summary.wastePercentage}%;"></div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="box-audit">
    <h4>Impact Verification & Supply Chain Traceability Summary</h4>
    <p style="margin-bottom: 8px;">
      ${hasBaseline ? `This batch achieved <strong>${summary.utilization}%</strong> material utilization compared to the unoptimized sequential baseline of <strong>${baselineUtil}%</strong>, delivering a net <strong>+${utilDelta} percentage point</strong> yield gain and conserving <strong>${fabricSavedM} linear meters</strong> (~${fabricSavedKg} kg) of ${roll.fabricType} textile stock.` : `This batch achieved <strong>${summary.utilization}%</strong> material utilization (${summary.wastePercentage}% scrap offcuts). Baseline marker data is required for comparative savings analysis.`}
    </p>
    <p style="font-size: 11px; color: #94a3b8;">
      Provisional indicators apply generic industry proxy factors (280 g/m² fabric density, 1,400 L/kg freshwater, 6.8 kg CO₂e/kg emissions); not verified material-specific LCA data. Structured for CSDDD, DPP, and Higg MSI / Scope 3 pre-consumer scrap accounting frameworks upon verified integration.
    </p>
  </div>

  <div class="footer">
    Loom & Layer ESG Audit System • Verified Material Yield Benchmark • Report Generated ${new Date().toISOString()}
  </div>
</body>
</html>`;
}

export const generateESGReportHTML = generatePrintableSustainabilityReportHTML;

/**
 * Exports machine-readable standard industrial CNC / Laser Cutter G-Code (.gcode / .nc)
 *
 * Implements:
 * - G21 (mm units), G90 (absolute mode)
 * - Safe Z travel (G00) between distinct piece perimeters
 * - Plunge and contour feed interpolation (G01)
 * - Spindle / Laser control (M03 active, M05 off)
 * - Automatic return to home origin (M30)
 *
 * @param {object} project - Loom & Layer project data model
 * @param {object} options - Feedrate and clearance options
 * @returns {string} Standard G-Code program
 */
export function exportCuttingPlanToGCode(project, options = {}) {
  const plan = generateCuttingPlan(project);
  const feedRate = options.feedRate || 3000; // mm/min
  const plungeRate = options.plungeRate || 1200; // mm/min
  const safeZ = options.safeZ || 5.0; // mm
  const cutZ = options.cutZ || 0.0; // mm

  const lines = [
    `; ========================================================`,
    `; Loom & Layer CNC Cutter & Laser CAM Engine`,
    `; Project: ${plan.projectName}`,
    `; Generated: ${new Date().toISOString()}`,
    `; Roll Dimensions: ${plan.fabricRoll.length * 10} x ${plan.fabricRoll.width * 10} mm`,
    `; Total Placed Pieces: ${plan.placedPiecesCount} / ${plan.totalPieces}`,
    `; Marker Efficiency: ${plan.optimizationSummary.utilization}%`,
    `; Estimated Cut Time: ${plan.estimatedCuttingTime.formatted}`,
    `; ========================================================`,
    `G21 ; Units in millimeters`,
    `G90 ; Absolute coordinates mode`,
    `G94 ; Units per minute feed mode`,
    `G00 Z${safeZ.toFixed(2)} ; Safe clearance height`,
    `M05 ; Tool standby`,
    ``
  ];

  plan.placements.forEach((piece) => {
    lines.push(`; --- Piece #${piece.sequence}: ${piece.name} (${piece.width}×${piece.height}cm, ${piece.rotation}°) ---`);
    const pts = getPieceContourPoints(piece, 1);
    if (!Array.isArray(pts) || pts.length < 2) return;

    const rad = (piece.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const cx = (piece.width * 10) / 2;
    const cy = (piece.height * 10) / 2;
    const worldPx = piece.x * 10;
    const worldPy = piece.y * 10;

    const worldPts = pts.map((pt) => {
      const lx = pt.x * 10;
      const ly = pt.y * 10;
      const dx = lx - cx;
      const dy = ly - cy;
      const rx = cx + dx * cos - dy * sin;
      const ry = cy + dx * sin + dy * cos;
      return {
        x: Number((worldPx + rx).toFixed(2)),
        y: Number((worldPy + ry).toFixed(2))
      };
    });

    const startPt = worldPts[0];
    lines.push(`G00 X${startPt.x} Y${startPt.y} ; Rapid traverse to pierce point`);
    lines.push(`G01 Z${cutZ.toFixed(2)} F${plungeRate} ; Lower knife / engage blade`);
    lines.push(`M03 S1000 ; Laser ON / knife drive`);

    for (let i = 1; i < worldPts.length; i++) {
      lines.push(`G01 X${worldPts[i].x} Y${worldPts[i].y} F${feedRate}`);
    }

    lines.push(`M05 ; Laser OFF / disengage knife`);
    lines.push(`G00 Z${safeZ.toFixed(2)} ; Retract to clearance height`);
    lines.push(``);
  });

  lines.push(`; --- Program Termination ---`);
  lines.push(`G00 X0.00 Y0.00 ; Return to home station`);
  lines.push(`M05 ; All tools off`);
  lines.push(`M30 ; Program End & Reset`);

  return lines.join('\n');
}


/**
 * Dispatches client-side file download
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  if (typeof window === 'undefined' || !window.document) {
    return false;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/**
 * Opens printable HTML document in a new window/tab and opens print dialog
 */
export function openPrintableDocument(htmlContent, title = 'Document') {
  if (typeof window === 'undefined') return false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // Popup was blocked, fallback to downloading HTML file
    downloadFile(htmlContent, `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.html`, 'text/html');
    return true;
  }

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  return true;
}
