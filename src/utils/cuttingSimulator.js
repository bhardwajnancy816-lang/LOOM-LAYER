/**
 * AI Fabric Cutter — Realistic Visual Cutting-Process Simulation Engine
 *
 * Simulates a continuous, deterministic garment cutting process:
 * - 'ready': Initial idle state awaiting simulation trigger.
 * - 'cutting': Active cutting animation state processing pieces one by one.
 * - 'paused': Simulation paused mid-cut, retaining exact progress and active piece.
 * - 'completed': Finished state when 100% of pattern piece perimeters have been cut.
 *
 * Guarantees:
 * 1. Zero mutation of pattern coordinates, dimensions, nesting layout, or utilization metrics.
 * 2. Deterministic spatial cutting sequence (ordered by X/Y coordinates).
 * 3. Traces exact perimeter contours for both irregular polygons (placement.outline)
 *    and standard/rectangular garment shapes.
 * 4. Precise pause/resume/reset lifecycle and timer/RAF cleanup.
 */

/**
 * Samples points along a Quadratic Bezier curve
 */
export function sampleQuadBezier(p0, cp, p1, steps = 12) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const x = inv * inv * p0.x + 2 * inv * t * cp.x + t * t * p1.x;
    const y = inv * inv * p0.y + 2 * inv * t * cp.y + t * t * p1.y;
    pts.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  }
  return pts;
}

/**
 * Samples points along a Cubic Bezier curve
 */
export function sampleCubicBezier(p0, cp1, cp2, p1, steps = 16) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const x =
      inv * inv * inv * p0.x +
      3 * inv * inv * t * cp1.x +
      3 * inv * t * t * cp2.x +
      t * t * t * p1.x;
    const y =
      inv * inv * inv * p0.y +
      3 * inv * inv * t * cp1.y +
      3 * inv * t * t * cp2.y +
      t * t * t * p1.y;
    pts.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
  }
  return pts;
}

/**
 * Generates an ordered array of local contour vertices/sample points for a piece.
 * The resulting polygon/polyline forms a closed perimeter loop.
 *
 * @param {object} placement - Placement item with width, height, shapeType, outline
 * @param {number} scale - Optional coordinate scaling factor (default 1)
 * @returns {Array<{x: number, y: number}>} Local scaled contour points
 */
export function getPieceContourPoints(placement, scale = 1) {
  if (!placement) return [];

  // 1. Direct relativePoints support (already in local rotated coordinates)
  if (Array.isArray(placement.relativePoints) && placement.relativePoints.length >= 3) {
    const pts = placement.relativePoints.map((pt) => ({
      x: Number((pt.x * scale).toFixed(2)),
      y: Number((pt.y * scale).toFixed(2))
    }));
    if (pts.length > 0) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (Math.hypot(last.x - first.x, last.y - first.y) > 1e-3) {
        pts.push({ x: first.x, y: first.y });
      }
    }
    return pts;
  }

  const w = (Number(placement.width) || 10) * scale;
  const h = (Number(placement.height) || 10) * scale;
  const outline = placement.outline;
  const shapeType = placement.shapeType || 'front-bodice';

  // 1. Irregular polygon outline supplied directly
  if (Array.isArray(outline) && outline.length >= 3) {
    const pts = outline.map((pt) => ({
      x: Number((pt.x * w).toFixed(2)),
      y: Number((pt.y * h).toFixed(2))
    }));
    // Ensure closed loop
    if (pts.length > 0) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (Math.hypot(last.x - first.x, last.y - first.y) > 1e-3) {
        pts.push({ x: first.x, y: first.y });
      }
    }
    return pts;
  }

  // 2. Standard garment shape contour sampling
  switch (shapeType) {
    case 'front-bodice': {
      const neckDrop = h * 0.18;
      const neckWidth = w * 0.35;
      const shoulderX = w * 0.75;
      const shoulderY = h * 0.08;
      const armholeDepth = h * 0.38;

      const neckCurve = sampleQuadBezier(
        { x: 0, y: neckDrop },
        { x: neckWidth * 0.5, y: neckDrop * 0.9 },
        { x: neckWidth, y: 0 },
        8
      );
      const armholeCurve = sampleQuadBezier(
        { x: shoulderX, y: shoulderY },
        { x: w * 0.7, y: armholeDepth * 0.6 },
        { x: w, y: armholeDepth },
        10
      );

      const pts = [
        ...neckCurve,
        ...armholeCurve,
        { x: Number((w * 0.92).toFixed(2)), y: h },
        { x: 0, y: h },
        { x: 0, y: Number(neckDrop.toFixed(2)) }
      ];
      return pts;
    }

    case 'back-bodice': {
      const neckDrop = h * 0.08;
      const neckWidth = w * 0.35;
      const shoulderX = w * 0.75;
      const shoulderY = h * 0.06;
      const armholeDepth = h * 0.36;

      const neckCurve = sampleQuadBezier(
        { x: 0, y: neckDrop },
        { x: neckWidth * 0.5, y: neckDrop * 0.9 },
        { x: neckWidth, y: 0 },
        8
      );
      const armholeCurve = sampleQuadBezier(
        { x: shoulderX, y: shoulderY },
        { x: w * 0.72, y: armholeDepth * 0.6 },
        { x: w, y: armholeDepth },
        10
      );

      const pts = [
        ...neckCurve,
        ...armholeCurve,
        { x: Number((w * 0.94).toFixed(2)), y: h },
        { x: 0, y: h },
        { x: 0, y: Number(neckDrop.toFixed(2)) }
      ];
      return pts;
    }

    case 'sleeve': {
      const capHeight = h * 0.28;
      const wristInset = w * 0.18;

      const cap1 = sampleCubicBezier(
        { x: 0, y: capHeight },
        { x: w * 0.15, y: capHeight * 0.2 },
        { x: w * 0.35, y: 0 },
        { x: w * 0.5, y: 0 },
        10
      );
      const cap2 = sampleCubicBezier(
        { x: w * 0.5, y: 0 },
        { x: w * 0.65, y: 0 },
        { x: w * 0.85, y: capHeight * 0.2 },
        { x: w, y: capHeight },
        10
      );

      const pts = [
        { x: Number(wristInset.toFixed(2)), y: h },
        { x: 0, y: Number(capHeight.toFixed(2)) },
        ...cap1.slice(1),
        ...cap2.slice(1),
        { x: Number((w - wristInset).toFixed(2)), y: h },
        { x: Number(wristInset.toFixed(2)), y: h }
      ];
      return pts;
    }

    case 'collar': {
      const topCurve = sampleQuadBezier(
        { x: 0, y: h * 0.4 },
        { x: w * 0.5, y: 0 },
        { x: w, y: h * 0.4 },
        10
      );
      const botCurve = sampleQuadBezier(
        { x: w * 0.92, y: h },
        { x: w * 0.5, y: h * 0.65 },
        { x: w * 0.08, y: h },
        10
      );

      const pts = [
        ...topCurve,
        { x: Number((w * 0.92).toFixed(2)), y: h },
        ...botCurve,
        { x: 0, y: Number((h * 0.4).toFixed(2)) }
      ];
      return pts;
    }

    case 'pocket': {
      const point = Number((h * 0.82).toFixed(2));
      return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: point },
        { x: Number((w * 0.5).toFixed(2)), y: h },
        { x: 0, y: point },
        { x: 0, y: 0 }
      ];
    }

    default: {
      // Standard rectangle
      return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
        { x: 0, y: 0 }
      ];
    }
  }
}

/**
 * Creates a precomputed cutting profile for a placement piece.
 */
export function createPieceCuttingProfile(placement, scale = 1) {
  const points = getPieceContourPoints(placement, scale);
  const cumDistances = [0];
  let totalLength = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const segLen = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    totalLength += segLen;
    cumDistances.push(totalLength);
  }

  // Ensure positive length fallback
  if (totalLength <= 0) {
    totalLength = 1;
    cumDistances[0] = 0;
    cumDistances[1] = 1;
  }

  const fullPathD =
    points.length >= 2
      ? points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z'
      : '';

  return {
    placementId: placement.id,
    points,
    totalLength,
    cumDistances,
    fullPathD,
    /**
     * Computes the cutting head position and traced path string for a progress [0, 1]
     */
    getCutStateAt(progress) {
      const t = Math.max(0, Math.min(1, Number(progress) || 0));
      const p0 = points[0] || { x: 0, y: 0 };

      if (t <= 0) {
        return {
          currentPoint: { x: p0.x, y: p0.y },
          tracedPath: `M ${p0.x},${p0.y}`,
          isCompleted: false
        };
      }

      if (t >= 1) {
        return {
          currentPoint: { x: p0.x, y: p0.y },
          tracedPath: fullPathD,
          isCompleted: true
        };
      }

      const targetDist = t * totalLength;
      let k = 0;
      for (let i = 0; i < cumDistances.length - 1; i++) {
        if (targetDist <= cumDistances[i + 1]) {
          k = i;
          break;
        }
      }

      const segStartDist = cumDistances[k];
      const segEndDist = cumDistances[k + 1] || totalLength;
      const segLen = segEndDist - segStartDist;
      const subT = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;

      const pStart = points[k] || p0;
      const pEnd = points[k + 1] || p0;

      const curX = Number((pStart.x + subT * (pEnd.x - pStart.x)).toFixed(2));
      const curY = Number((pStart.y + subT * (pEnd.y - pStart.y)).toFixed(2));

      const pathSegments = [];
      for (let i = 0; i <= k; i++) {
        pathSegments.push(`${i === 0 ? 'M' : 'L'} ${points[i].x},${points[i].y}`);
      }
      pathSegments.push(`L ${curX},${curY}`);

      return {
        currentPoint: { x: curX, y: curY },
        tracedPath: pathSegments.join(' '),
        isCompleted: false
      };
    },

    /**
     * Converts the local cut point at progress t to world fabric coordinates (cm)
     */
    getWorldCutPointAt(progress) {
      const { currentPoint } = this.getCutStateAt(progress);
      const w = Number(placement.width) || 10;
      const h = Number(placement.height) || 10;
      const rotation = Number(placement.rotation) || 0;
      const px = Number(placement.x) || 0;
      const py = Number(placement.y) || 0;

      // Local unscaled coordinates
      const lx = currentPoint.x / scale;
      const ly = currentPoint.y / scale;

      const cx = w / 2;
      const cy = h / 2;
      const rad = (rotation * Math.PI) / 180;
      const dx = lx - cx;
      const dy = ly - cy;

      const rx = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
      const ry = cy + dx * Math.sin(rad) + dy * Math.cos(rad);

      return {
        worldX: Number((px + rx).toFixed(2)),
        worldY: Number((py + ry).toFixed(2))
      };
    }
  };
}

/**
 * Deterministically constructs a real cutting sequence from placed pattern pieces.
 * Sorts primarily by X (fabric roll direction), then Y (transverse direction), with ID as tie-breaker.
 */
export function buildCuttingSequence(placements) {
  if (!Array.isArray(placements) || placements.length === 0) return [];
  return [...placements].sort((a, b) => {
    const xDiff = (Number(a.x) || 0) - (Number(b.x) || 0);
    if (Math.abs(xDiff) > 1e-4) return xDiff;
    const yDiff = (Number(a.y) || 0) - (Number(b.y) || 0);
    if (Math.abs(yDiff) > 1e-4) return yDiff;
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}

/**
 * Cutting Simulator State Controller
 */
export class CuttingSimulator {
  constructor(options = {}) {
    this.duration = options.duration || 5000; // Total duration in ms
    this.onStateChange = options.onStateChange || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onPieceChange = options.onPieceChange || (() => {});

    this.status = 'ready'; // 'ready' | 'cutting' | 'paused' | 'completed'
    this.progress = 0; // Overall progress (0.0 to 1.0)

    this._timer = null;
    this._rafId = null;
    this._startTime = null;
    this._pausedElapsed = 0;
    this._isRunning = false;

    // Sequence & piece-level tracking
    this.sequence = [];
    this.pieceProfiles = new Map();
    this.pieceWeights = [];
    this.cumWeights = [0];

    if (options.placements) {
      this.setPlacements(options.placements);
    }
  }

  /**
   * Initializes the cutting sequence and geometric piece profiles
   */
  setPlacements(placements) {
    this.sequence = buildCuttingSequence(placements);
    this.pieceProfiles.clear();
    this.pieceWeights = [];
    this.cumWeights = [0];

    if (this.sequence.length === 0) {
      return;
    }

    let totalPerimeterSum = 0;
    const profiles = this.sequence.map((piece) => {
      const profile = createPieceCuttingProfile(piece, 1);
      this.pieceProfiles.set(piece.id, profile);
      totalPerimeterSum += profile.totalLength;
      return profile;
    });

    const n = this.sequence.length;
    let cum = 0;
    for (let i = 0; i < n; i++) {
      const weight = totalPerimeterSum > 0 ? profiles[i].totalLength / totalPerimeterSum : 1 / n;
      this.pieceWeights.push(weight);
      cum += weight;
      this.cumWeights.push(Math.min(1, cum));
    }
    // Ensure exact 1.0 at end
    this.cumWeights[this.cumWeights.length - 1] = 1;
  }

  /**
   * Calculates the active piece index and local piece progress from global progress P
   */
  _calculatePieceProgress(P) {
    const totalPieces = this.sequence.length;
    if (totalPieces === 0) {
      return {
        pieceIndex: -1,
        piece: null,
        pieceProgress: 0,
        completedPieceIds: [],
        activePieceId: null,
        activeCutPoint: null,
        activeTracedPath: '',
        activeWorldPoint: null
      };
    }

    const clampedP = Math.max(0, Math.min(1, P));

    if (this.status === 'ready' || clampedP === 0) {
      return {
        pieceIndex: -1,
        piece: null,
        pieceProgress: 0,
        completedPieceIds: [],
        activePieceId: null,
        activeCutPoint: null,
        activeTracedPath: '',
        activeWorldPoint: null
      };
    }

    if (this.status === 'completed' || clampedP >= 1) {
      return {
        pieceIndex: totalPieces - 1,
        piece: this.sequence[totalPieces - 1],
        pieceProgress: 1,
        completedPieceIds: this.sequence.map((p) => p.id),
        activePieceId: null,
        activeCutPoint: null,
        activeTracedPath: '',
        activeWorldPoint: null
      };
    }

    // Find active piece k where cumWeights[k] <= clampedP < cumWeights[k+1]
    let k = 0;
    for (let i = 0; i < totalPieces; i++) {
      if (clampedP < this.cumWeights[i + 1] || i === totalPieces - 1) {
        k = i;
        break;
      }
    }

    const startW = this.cumWeights[k];
    const endW = this.cumWeights[k + 1] || 1;
    const span = endW - startW;
    const pieceProgress = span > 0 ? Math.max(0, Math.min(1, (clampedP - startW) / span)) : 0;

    const activePiece = this.sequence[k];
    const completedPieceIds = this.sequence.slice(0, k).map((p) => p.id);
    const profile = this.pieceProfiles.get(activePiece.id);

    let activeCutPoint = null;
    let activeTracedPath = '';
    let activeWorldPoint = null;

    if (profile) {
      const cutState = profile.getCutStateAt(pieceProgress);
      activeCutPoint = cutState.currentPoint;
      activeTracedPath = cutState.tracedPath;
      activeWorldPoint = profile.getWorldCutPointAt(pieceProgress);
    }

    return {
      pieceIndex: k,
      piece: activePiece,
      pieceProgress,
      completedPieceIds,
      activePieceId: activePiece.id,
      activeCutPoint,
      activeTracedPath,
      activeWorldPoint
    };
  }

  /**
   * Returns current snapshot of simulation state
   */
  getState() {
    const pieceState = this._calculatePieceProgress(this.progress);

    return {
      status: this.status,
      progress: this.progress,
      progressPercent: Math.round(this.progress * 100),
      isReady: this.status === 'ready',
      isCutting: this.status === 'cutting',
      isPaused: this.status === 'paused',
      isCompleted: this.status === 'completed',
      duration: this.duration,
      sequence: this.sequence,
      totalPieces: this.sequence.length,
      currentPieceIndex: pieceState.pieceIndex,
      currentPiece: pieceState.piece,
      currentPieceProgress: pieceState.pieceProgress,
      completedPieceIds: pieceState.completedPieceIds,
      activePieceId: pieceState.activePieceId,
      activeCutPoint: pieceState.activeCutPoint,
      activeTracedPath: pieceState.activeTracedPath,
      activeWorldPoint: pieceState.activeWorldPoint
    };
  }

  /**
   * Starts or resumes cutting simulation
   */
  start() {
    // Atomic safety: prevent duplicate loops if already running
    if (this._isRunning) {
      return this.getState();
    }

    if (this.status === 'paused') {
      return this.resume();
    }

    this._clearHandles();

    this._isRunning = true;
    this.status = 'cutting';
    this.progress = 0;
    this._pausedElapsed = 0;
    this._startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    this._notifyStateChange();

    this._runLoop();
    return this.getState();
  }

  /**
   * Pauses simulation mid-process
   */
  pause() {
    if (!this._isRunning && this.status !== 'cutting') {
      return this.getState();
    }

    this._clearHandles();
    this._isRunning = false;
    this.status = 'paused';

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._pausedElapsed = Math.min(this.duration, Math.max(0, now - this._startTime));

    this._notifyStateChange();
    return this.getState();
  }

  /**
   * Resumes simulation from paused position
   */
  resume() {
    if (this._isRunning) {
      return this.getState();
    }

    if (this.status !== 'paused') {
      return this.start();
    }

    this._clearHandles();
    this._isRunning = true;
    this.status = 'cutting';

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._startTime = now - (this.progress * this.duration);

    this._notifyStateChange();
    this._runLoop();
    return this.getState();
  }

  /**
   * Stops/resets simulation back to initial Ready to Cut state
   */
  stop() {
    this._clearHandles();

    this._isRunning = false;
    this.status = 'ready';
    this.progress = 0;
    this._pausedElapsed = 0;
    this._startTime = null;

    this._notifyStateChange();
    return this.getState();
  }

  reset() {
    return this.stop();
  }

  /**
   * Toggles simulation between running, paused, and started
   */
  toggle() {
    if (this.status === 'cutting') {
      return this.pause();
    } else if (this.status === 'paused') {
      return this.resume();
    } else {
      return this.start();
    }
  }

  /**
   * Manually steps simulation by elapsed milliseconds (for deterministic testing & control)
   */
  step(elapsedMs) {
    if (this.status === 'ready') {
      this.status = 'cutting';
      this._isRunning = true;
    }

    const currentProgress = Math.min(elapsedMs / this.duration, 1);
    this.progress = currentProgress;
    this.onProgress(this.progress, Math.round(this.progress * 100));

    if (currentProgress >= 1) {
      this._finish();
    } else {
      this._notifyStateChange();
    }

    return this.getState();
  }

  _runLoop() {
    if (typeof requestAnimationFrame !== 'undefined') {
      const stepFrame = (now) => {
        if (!this._isRunning) return;

        const currentTime = typeof performance !== 'undefined' ? performance.now() : now;
        const elapsed = currentTime - this._startTime;
        const currentProgress = Math.min(elapsed / this.duration, 1);

        this.progress = currentProgress;
        this.onProgress(this.progress, Math.round(this.progress * 100));
        this._notifyStateChange();

        if (currentProgress < 1) {
          this._rafId = requestAnimationFrame(stepFrame);
        } else {
          this._finish();
        }
      };

      this._rafId = requestAnimationFrame(stepFrame);
    } else {
      // Fallback for Node / unit test environments
      const intervalMs = 25;
      this._timer = setInterval(() => {
        if (!this._isRunning) return;

        const elapsed = Date.now() - this._startTime;
        const currentProgress = Math.min(elapsed / this.duration, 1);

        this.progress = currentProgress;
        this.onProgress(this.progress, Math.round(this.progress * 100));
        this._notifyStateChange();

        if (currentProgress >= 1) {
          this._finish();
        }
      }, intervalMs);
    }
  }

  _finish() {
    this._clearHandles();

    this._isRunning = false;
    this.status = 'completed';
    this.progress = 1;

    this._notifyStateChange();
    this.onComplete();
  }

  _clearHandles() {
    if (this._rafId !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this._rafId);
      }
      this._rafId = null;
    }

    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _notifyStateChange() {
    this.onStateChange(this.getState());
  }

  destroy() {
    this._clearHandles();
    this._isRunning = false;
    this.status = 'ready';
    this.progress = 0;
    this.onStateChange = () => {};
    this.onProgress = () => {};
    this.onComplete = () => {};
    this.onPieceChange = () => {};
    this.pieceProfiles.clear();
  }
}
