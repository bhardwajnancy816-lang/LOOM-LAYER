/**
 * Garment SVG path generators for cutting pattern visualization
 */
export function getGarmentSvgPath(shapeType, w, h) {
  switch (shapeType) {
    case 'front-bodice': {
      const neckDrop = h * 0.18;
      const neckWidth = w * 0.35;
      const shoulderX = w * 0.75;
      const shoulderY = h * 0.08;
      const armholeDepth = h * 0.38;
      return `M 0,${neckDrop} Q ${neckWidth * 0.5},${neckDrop * 0.9} ${neckWidth},0 L ${shoulderX},${shoulderY} Q ${w * 0.7},${armholeDepth * 0.6} ${w},${armholeDepth} L ${w * 0.92},${h} L 0,${h} Z`;
    }
    case 'back-bodice': {
      const neckDrop = h * 0.08;
      const neckWidth = w * 0.35;
      const shoulderX = w * 0.75;
      const shoulderY = h * 0.06;
      const armholeDepth = h * 0.36;
      return `M 0,${neckDrop} Q ${neckWidth * 0.5},${neckDrop * 0.9} ${neckWidth},0 L ${shoulderX},${shoulderY} Q ${w * 0.72},${armholeDepth * 0.6} ${w},${armholeDepth} L ${w * 0.94},${h} L 0,${h} Z`;
    }
    case 'sleeve': {
      const capHeight = h * 0.28;
      const wristInset = w * 0.18;
      return `M ${wristInset},${h} L 0,${capHeight} C ${w * 0.15},${capHeight * 0.2} ${w * 0.35},0 ${w * 0.5},0 C ${w * 0.65},0 ${w * 0.85},${capHeight * 0.2} ${w},${capHeight} L ${w - wristInset},${h} Z`;
    }
    case 'collar': {
      return `M 0,${h * 0.4} Q ${w * 0.5},0 ${w},${h * 0.4} L ${w * 0.92},${h} Q ${w * 0.5},${h * 0.65} ${w * 0.08},${h} Z`;
    }
    case 'pocket': {
      const point = h * 0.82;
      return `M 0,0 L ${w},0 L ${w},${point} L ${w * 0.5},${h} L 0,${point} Z`;
    }
    case 'waistband': {
      return `M 0,${h * 0.25} Q ${w * 0.5},0 ${w},${h * 0.25} L ${w},${h} Q ${w * 0.5},${h * 0.75} 0,${h} Z`;
    }
    case 'cuff': {
      const r = Math.min(w, h) * 0.15;
      return `M 0,0 L ${w},0 L ${w},${h - r} Q ${w},${h} ${w - r},${h} L ${r},${h} Q 0,${h} 0,${h - r} Z`;
    }
    case 'trouser-front': {
      const waistW = w * 0.7;
      const crotchY = h * 0.32;
      const hemInset = w * 0.15;
      return `M 0,0 L ${waistW},0 Q ${w * 0.95},${crotchY * 0.5} ${w},${crotchY} L ${w - hemInset},${h} L ${hemInset},${h} L 0,${crotchY} Z`;
    }
    case 'trouser-back': {
      const risePeak = h * 0.05;
      const waistW = w * 0.75;
      const crotchY = h * 0.35;
      const hemInset = w * 0.12;
      return `M 0,${risePeak} L ${waistW},0 Q ${w},${crotchY * 0.5} ${w},${crotchY} L ${w - hemInset},${h} L ${hemInset},${h} L 0,${crotchY} Z`;
    }
    case 'skirt-panel': {
      const waistW = w * 0.5;
      const waistOffset = (w - waistW) / 2;
      return `M ${waistOffset},0 Q ${w * 0.5},${h * 0.04} ${w - waistOffset},0 L ${w},${h} Q ${w * 0.5},${h * 0.96} 0,${h} Z`;
    }
    default: {
      const r = Math.min(w, h) * 0.08;
      return `M ${r},0 L ${w - r},0 Q ${w},0 ${w},${r} L ${w},${h - r} Q ${w},${h} ${w - r},${h} L ${r},${h} Q 0,${h} 0,${h - r} L 0,${r} Q 0,0 ${r},0 Z`;
    }
  }
}

/**
 * Samples a quadratic bezier curve from p0 to p2 with control point p1 into intermediate points
 */
function sampleQuadBezier(p0, p1, p2, steps = 4) {
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x;
    const y = mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y;
    pts.push({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) });
  }
  return pts;
}

/**
 * Samples a cubic bezier curve from p0 to p3 with control points p1 and p2 into intermediate points
 */
function sampleCubicBezier(p0, p1, p2, p3, steps = 5) {
  const pts = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
    const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
    pts.push({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) });
  }
  return pts;
}

/**
 * Discretizes standard parametric garment shapes into normalized [0, 1] polygon contours.
 * Matches the exact SVG vector geometry defined in getGarmentSvgPath.
 *
 * @param {string} shapeType - Garment component type
 * @returns {Array<{x: number, y: number}>} Normalized contour points in [0, 1]
 */
export function getGarmentNormalizedOutline(shapeType) {
  switch (shapeType) {
    case 'front-bodice': {
      const p0 = { x: 0, y: 0.18 };
      const pNeckCtrl = { x: 0.175, y: 0.162 };
      const pNeckEnd = { x: 0.35, y: 0 };
      const pShoulder = { x: 0.75, y: 0.08 };
      const pArmCtrl = { x: 0.7, y: 0.228 };
      const pArmEnd = { x: 1, y: 0.38 };
      const pHemR = { x: 0.92, y: 1 };
      const pHemL = { x: 0, y: 1 };

      return [
        p0,
        ...sampleQuadBezier(p0, pNeckCtrl, pNeckEnd, 4),
        pShoulder,
        ...sampleQuadBezier(pShoulder, pArmCtrl, pArmEnd, 4),
        pHemR,
        pHemL
      ];
    }
    case 'back-bodice': {
      const p0 = { x: 0, y: 0.08 };
      const pNeckCtrl = { x: 0.175, y: 0.072 };
      const pNeckEnd = { x: 0.35, y: 0 };
      const pShoulder = { x: 0.75, y: 0.06 };
      const pArmCtrl = { x: 0.72, y: 0.216 };
      const pArmEnd = { x: 1, y: 0.36 };
      const pHemR = { x: 0.94, y: 1 };
      const pHemL = { x: 0, y: 1 };

      return [
        p0,
        ...sampleQuadBezier(p0, pNeckCtrl, pNeckEnd, 4),
        pShoulder,
        ...sampleQuadBezier(pShoulder, pArmCtrl, pArmEnd, 4),
        pHemR,
        pHemL
      ];
    }
    case 'sleeve': {
      const pWristL = { x: 0.18, y: 1 };
      const pCapL = { x: 0, y: 0.28 };
      const pCapPeak = { x: 0.5, y: 0 };
      const pCapR = { x: 1, y: 0.28 };
      const pWristR = { x: 0.82, y: 1 };

      return [
        pWristL,
        pCapL,
        ...sampleCubicBezier(pCapL, { x: 0.15, y: 0.056 }, { x: 0.35, y: 0 }, pCapPeak, 4),
        ...sampleCubicBezier(pCapPeak, { x: 0.65, y: 0 }, { x: 0.85, y: 0.056 }, pCapR, 4),
        pWristR
      ];
    }
    case 'collar': {
      const pL = { x: 0, y: 0.4 };
      const pR = { x: 1, y: 0.4 };
      const pBotR = { x: 0.92, y: 1 };
      const pBotL = { x: 0.08, y: 1 };

      return [
        pL,
        ...sampleQuadBezier(pL, { x: 0.5, y: 0 }, pR, 4),
        pBotR,
        ...sampleQuadBezier(pBotR, { x: 0.5, y: 0.65 }, pBotL, 4)
      ];
    }
    case 'pocket': {
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0.82 },
        { x: 0.5, y: 1 },
        { x: 0, y: 0.82 }
      ];
    }
    case 'waistband': {
      const pTopL = { x: 0, y: 0.25 };
      const pTopR = { x: 1, y: 0.25 };
      const pBotR = { x: 1, y: 1 };
      const pBotL = { x: 0, y: 1 };

      return [
        pTopL,
        ...sampleQuadBezier(pTopL, { x: 0.5, y: 0 }, pTopR, 4),
        pBotR,
        ...sampleQuadBezier(pBotR, { x: 0.5, y: 0.75 }, pBotL, 4)
      ];
    }
    case 'cuff': {
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 0.85 },
        { x: 0.85, y: 1 },
        { x: 0.15, y: 1 },
        { x: 0, y: 0.85 }
      ];
    }
    case 'trouser-front': {
      const pWaistL = { x: 0, y: 0 };
      const pWaistR = { x: 0.7, y: 0 };
      const pCrotchR = { x: 1, y: 0.32 };
      const pHemR = { x: 0.85, y: 1 };
      const pHemL = { x: 0.15, y: 1 };
      const pCrotchL = { x: 0, y: 0.32 };

      return [
        pWaistL,
        pWaistR,
        ...sampleQuadBezier(pWaistR, { x: 0.95, y: 0.16 }, pCrotchR, 4),
        pHemR,
        pHemL,
        pCrotchL
      ];
    }
    case 'trouser-back': {
      const pWaistL = { x: 0, y: 0.05 };
      const pWaistR = { x: 0.75, y: 0 };
      const pCrotchR = { x: 1, y: 0.35 };
      const pHemR = { x: 0.88, y: 1 };
      const pHemL = { x: 0.12, y: 1 };
      const pCrotchL = { x: 0, y: 0.35 };

      return [
        pWaistL,
        pWaistR,
        ...sampleQuadBezier(pWaistR, { x: 1, y: 0.175 }, pCrotchR, 4),
        pHemR,
        pHemL,
        pCrotchL
      ];
    }
    case 'skirt-panel': {
      const pWaistL = { x: 0.25, y: 0 };
      const pWaistR = { x: 0.75, y: 0 };
      const pHemR = { x: 1, y: 1 };
      const pHemL = { x: 0, y: 1 };

      return [
        pWaistL,
        ...sampleQuadBezier(pWaistL, { x: 0.5, y: 0.04 }, pWaistR, 4),
        pHemR,
        ...sampleQuadBezier(pHemR, { x: 0.5, y: 0.96 }, pHemL, 4)
      ];
    }
    default: {
      return [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
      ];
    }
  }
}

