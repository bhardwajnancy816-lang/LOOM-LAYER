import test from 'node:test';
import assert from 'node:assert';
import { 
  optimizeFabricCutting, 
  expandPatternPieces, 
  validateNestingLayout,
  buildOrderingStrategies,
  checkPieceCollision
} from './fabricOptimizer.js';
import { 
  calculatePolygonArea,
  checkPolygonCollision,
  isPolygonWithinFabric
} from './polygonGeometry.js';
import { 
  generateCuttingPlan, 
  exportCuttingPlanToJSON, 
  exportCuttingPlanToDXF,
  exportCuttingPlanToSVG,
  generatePrintableCuttingPlanHTML,
  generatePrintableSustainabilityReportHTML
} from './cuttingPlanGenerator.js';
import { getSustainabilityWording } from './sustainabilityWording.js';

test('Nesting Yield, Piece Quantities & Cutting Summary Verification', async (t) => {
  // Test configuration for 6 shirt templates
  const shirtTemplates = [
    { id: 'pat-fb', name: 'Front Bodice', category: 'FRONT', shapeType: 'front-bodice', width: 40, height: 60, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical', color: '#0284c7' },
    { id: 'pat-bb', name: 'Back Bodice', category: 'BACK', shapeType: 'back-bodice', width: 42, height: 62, quantity: 1, rotationAllowed: true, grainConstraint: 'Vertical', color: '#059669' },
    { id: 'pat-sl', name: 'Sleeves', category: 'SLEEVE', shapeType: 'sleeve', width: 25, height: 52, quantity: 2, rotationAllowed: true, grainConstraint: 'Vertical', color: '#d97706' },
    { id: 'pat-cb', name: 'Collar Band', category: 'COLLAR', shapeType: 'collar', width: 15, height: 22, quantity: 1, rotationAllowed: true, grainConstraint: 'Horizontal', color: '#7c3aed' },
    { id: 'pat-cf', name: 'Cuffs', category: 'CUFF', shapeType: 'cuff', width: 12, height: 24, quantity: 2, rotationAllowed: true, grainConstraint: 'Horizontal', color: '#0891b2' },
    { id: 'pat-cp', name: 'Chest Pocket', category: 'POCKET', shapeType: 'pocket', width: 12, height: 14, quantity: 1, rotationAllowed: true, grainConstraint: 'Flexible', color: '#ec4899' }
  ];

  await t.test('1. Dynamic Piece Expansion & Quantity Derivation', () => {
    const pieces = expandPatternPieces(shirtTemplates, true, true);
    
    // Sum: 2 + 1 + 2 + 1 + 2 + 1 = 9 pieces
    assert.strictEqual(pieces.length, 9, 'Expands 6 templates with quantities to exactly 9 piece instances');
    
    const fbPieces = pieces.filter(p => p.name.startsWith('Front Bodice'));
    assert.strictEqual(fbPieces.length, 2, 'Generates exactly 2 Front Bodice instances');
    assert.strictEqual(fbPieces[0].name, 'Front Bodice #1');
    assert.strictEqual(fbPieces[1].name, 'Front Bodice #2');

    const bbPieces = pieces.filter(p => p.name === 'Back Bodice');
    assert.strictEqual(bbPieces.length, 1, 'Generates exactly 1 Back Bodice instance');

    const slPieces = pieces.filter(p => p.name.startsWith('Sleeves'));
    assert.strictEqual(slPieces.length, 2, 'Generates exactly 2 Sleeve instances');

    const cbPieces = pieces.filter(p => p.name === 'Collar Band');
    assert.strictEqual(cbPieces.length, 1, 'Generates exactly 1 Collar Band instance');

    const cfPieces = pieces.filter(p => p.name.startsWith('Cuffs'));
    assert.strictEqual(cfPieces.length, 2, 'Generates exactly 2 Cuff instances');

    const cpPieces = pieces.filter(p => p.name === 'Chest Pocket');
    assert.strictEqual(cpPieces.length, 1, 'Generates exactly 1 Chest Pocket instance');

    // Dynamic test with altered quantities (ensure nothing is hardcoded)
    const customTemplates = [
      { id: 'c1', name: 'Panel A', width: 20, height: 30, quantity: 3 },
      { id: 'c2', name: 'Panel B', width: 15, height: 25, quantity: 4 }
    ];
    const customPieces = expandPatternPieces(customTemplates, true, true);
    assert.strictEqual(customPieces.length, 7, 'Dynamically derives 3 + 4 = 7 pieces without hardcoding');
  });

  await t.test('2. Multi-Heuristic Optimizer on 100x100cm Fabric Roll Benchmark', () => {
    const result = optimizeFabricCutting({
      fabricWidth: 100,
      fabricLength: 100,
      patterns: shirtTemplates,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true
    });

    assert.strictEqual(result.success, true, 'Optimization completes successfully');
    assert.strictEqual(result.totalPieces, 9, 'Total requested pieces is 9 (dynamically derived)');
    assert.strictEqual(result.placedCount, 7, 'Places maximum possible pieces (7 pieces)');
    assert.strictEqual(result.unplacedCount, 2, 'Accurately tracks 2 unplaced pieces');
    assert.strictEqual(result.unplacedPieces.length, 2, 'Unplaced pieces array contains exactly 2 items');
    assert.strictEqual(result.isFullSuccess, false, 'Flags partial layout when some pieces could not fit');

    // Utilization & waste verification
    assert.strictEqual(result.utilization, 62.8, 'Measured utilization is 62.8% (+7.6 pp improvement over 55.2%)');
    assert.strictEqual(result.wastePercentage, 37.2, 'Measured waste is 37.2%');

    // Verify unplaced pieces have descriptive reasons
    result.unplacedPieces.forEach((unplaced) => {
      assert(typeof unplaced.name === 'string' && unplaced.name.length > 0, 'Unplaced piece has valid name');
      assert(typeof unplaced.reason === 'string' && unplaced.reason.length > 0, 'Unplaced piece has descriptive reason');
      assert(unplaced.reason.includes('exceed'), 'Reason explains piece exceeds fabric roll capacity');
    });

    // Verify warning message accurately summarizes placed and unplaced counts
    assert(result.warning !== null, 'Warning is present for partial placement');
    assert(result.warning.includes('2 of 9 pieces could not fit'), 'Warning message clearly states 2 of 9 pieces could not fit');
  });

  await t.test('3. Strict Geometric Invariants, Boundary Containment & Zero Overlap', () => {
    const result = optimizeFabricCutting({
      fabricWidth: 100,
      fabricLength: 100,
      patterns: shirtTemplates,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true
    });

    const placements = result.layoutPlacements;
    assert.strictEqual(placements.length, 7, '7 pieces placed in layout');

    // 1. Independent layout validation
    const validation = validateNestingLayout(placements, 100, 100, 0.5);
    assert.strictEqual(validation.isValid, true, 'Layout passes independent validation');
    assert.strictEqual(validation.overlapCount, 0, 'Layout has exactly 0 overlaps');
    assert.strictEqual(validation.boundaryViolationCount, 0, 'Layout has 0 boundary violations');

    // 2. Direct coordinate checks
    placements.forEach((p) => {
      assert(p.x >= 0, `Piece "${p.name}" has x >= 0 (got ${p.x})`);
      assert(p.y >= 0, `Piece "${p.name}" has y >= 0 (got ${p.y})`);
      assert(p.x + p.width <= 100.001, `Piece "${p.name}" right edge <= 100cm (got ${(p.x + p.width).toFixed(1)})`);
      assert(p.y + p.height <= 100.001, `Piece "${p.name}" bottom edge <= 100cm (got ${(p.y + p.height).toFixed(1)})`);
    });

    // 3. Pairwise collision check
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const p1 = placements[i];
        const p2 = placements[j];
        const collides = checkPieceCollision(p1, p2, 0.5);
        assert.strictEqual(collides, false, `No collision between "${p1.name}" and "${p2.name}"`);
      }
    }

    // 4. Grain constraint compliance
    const backBodice = placements.find(p => p.name === 'Back Bodice');
    assert(backBodice, 'Back Bodice is placed');
    assert(backBodice.rotation === 0 || backBodice.rotation === 180, 'Back Bodice respects Vertical grain (0° or 180°)');

    const collar = placements.find(p => p.name === 'Collar Band');
    assert(collar, 'Collar Band is placed');
    assert(collar.rotation === 90 || collar.rotation === 270, 'Collar Band respects Horizontal grain (90° or 270°)');

    const cuffs = placements.filter(p => p.name.startsWith('Cuffs'));
    assert.strictEqual(cuffs.length, 2, 'Both Cuffs are placed');
    cuffs.forEach((cuff) => {
      assert(cuff.rotation === 90 || cuff.rotation === 270, 'Cuffs respect Horizontal grain (90° or 270°)');
    });
  });

  await t.test('4. Cutting Plan & Cutting Summary Consistency', () => {
    const project = {
      id: 'test-shirt-project',
      name: 'Shirt Cutting Plan Test',
      productType: 'Shirt',
      fabricType: 'Cotton',
      fabricLength: 100,
      fabricWidth: 100,
      minSpacing: 0.5,
      patterns: shirtTemplates,
      totalPieces: 9,
      placedCount: 7,
      unplacedCount: 2,
      utilization: 62.8,
      wastePercentage: 37.2,
      unplacedPieces: [
        { id: 'up-1', name: 'Front Bodice #1', width: 40, height: 60, category: 'FRONT', reason: 'Exceeds continuous fabric space on 100×100cm roll' },
        { id: 'up-2', name: 'Front Bodice #2', width: 40, height: 60, category: 'FRONT', reason: 'Exceeds continuous fabric space on 100×100cm roll' }
      ],
      layoutPlacements: [
        { id: 'pl-1', name: 'Back Bodice', category: 'BACK', x: 0, y: 0, width: 42, height: 62, rotation: 0 },
        { id: 'pl-2', name: 'Sleeves #1', category: 'SLEEVE', x: 42.5, y: 0, width: 25, height: 52, rotation: 0 },
        { id: 'pl-3', name: 'Sleeves #2', category: 'SLEEVE', x: 68, y: 0, width: 25, height: 52, rotation: 0 },
        { id: 'pl-4', name: 'Collar Band', category: 'COLLAR', x: 42.5, y: 52.5, width: 22, height: 15, rotation: 90 },
        { id: 'pl-5', name: 'Cuffs #1', category: 'CUFF', x: 65, y: 52.5, width: 24, height: 12, rotation: 90 },
        { id: 'pl-6', name: 'Cuffs #2', category: 'CUFF', x: 0, y: 62.5, width: 24, height: 12, rotation: 90 },
        { id: 'pl-7', name: 'Chest Pocket', category: 'POCKET', x: 24.5, y: 62.5, width: 14, height: 12, rotation: 90 }
      ]
    };

    const plan = generateCuttingPlan(project);
    assert.strictEqual(plan.totalPieces, 9, 'Cutting plan totalPieces is 9 requested');
    assert.strictEqual(plan.placedPiecesCount, 7, 'Cutting plan placedPiecesCount is 7 placed');
    assert.strictEqual(plan.unplacedPiecesCount, 2, 'Cutting plan unplacedPiecesCount is 2');
    assert.strictEqual(plan.unplacedPieces.length, 2, 'Cutting plan contains 2 unplaced pieces');
    assert.strictEqual(plan.isFullSuccess, false, 'isFullSuccess is false for partial layout');

    // JSON export
    const jsonStr = exportCuttingPlanToJSON(project);
    const parsed = JSON.parse(jsonStr);
    assert.strictEqual(parsed.totalPieces, 9, 'JSON export has totalPieces: 9');
    assert.strictEqual(parsed.placedPiecesCount, 7, 'JSON export has placedPiecesCount: 7');
    assert.strictEqual(parsed.unplacedPiecesCount, 2, 'JSON export has unplacedPiecesCount: 2');
    assert.strictEqual(parsed.unplacedPieces.length, 2, 'JSON export includes unplacedPieces list');

    // Printable HTML
    const html = generatePrintableCuttingPlanHTML(project);
    assert(html.includes('7 / 9'), 'Printable HTML shows 7 / 9 placed pieces');
    assert(html.includes('Unplaced Pieces'), 'Printable HTML includes Unplaced Pieces section');
    assert(html.includes('Front Bodice #1'), 'Printable HTML lists Front Bodice #1');
    assert(html.includes('Front Bodice #2'), 'Printable HTML lists Front Bodice #2');
  });

  await t.test('5. Full Placement on Adequate Roll Size (150x150cm Roll)', () => {
    const fullResult = optimizeFabricCutting({
      fabricWidth: 150,
      fabricLength: 150,
      patterns: shirtTemplates,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true
    });

    assert.strictEqual(fullResult.success, true, 'Optimization completes');
    assert.strictEqual(fullResult.placedCount, 9, 'Places all 9 pieces on 150x150cm roll');
    assert.strictEqual(fullResult.unplacedCount, 0, '0 unplaced pieces on 150x150cm roll');
    assert.strictEqual(fullResult.isFullSuccess, true, 'isFullSuccess is true when all 9 pieces fit');
    assert.strictEqual(fullResult.unplacedPieces.length, 0, 'Unplaced pieces array is empty');

    const val = validateNestingLayout(fullResult.layoutPlacements, 150, 150, 0.5);
    assert.strictEqual(val.isValid, true, 'Full 9-piece layout passes geometry validation');
    assert.strictEqual(val.overlapCount, 0, '0 overlaps across all 9 pieces');
  });

  await t.test('6. Irregular Contours and Outline Validation', () => {
    const irregularOutline = [
      { x: 0, y: 0 },
      { x: 0.8, y: 0 },
      { x: 1, y: 0.4 },
      { x: 0.9, y: 1 },
      { x: 0, y: 1 }
    ];

    const irregularTemplates = [
      { id: 'irr-1', name: 'Irregular Panel', category: 'FRONT', width: 30, height: 40, quantity: 2, outline: irregularOutline, rotationAllowed: true, grainConstraint: 'Vertical' },
      { id: 'rect-1', name: 'Rect Pocket', category: 'POCKET', width: 15, height: 15, quantity: 2, rotationAllowed: true, grainConstraint: 'Flexible' }
    ];

    const irrResult = optimizeFabricCutting({
      fabricWidth: 80,
      fabricLength: 80,
      patterns: irregularTemplates,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true
    });

    assert.strictEqual(irrResult.success, true, 'Irregular optimization succeeds');
    assert.strictEqual(irrResult.totalPieces, 4, 'Total pieces is 4 (2 irregular + 2 pockets)');
    assert.strictEqual(irrResult.placedCount, 4, 'All 4 pieces placed');

    const val = validateNestingLayout(irrResult.layoutPlacements, 80, 80, 0.5);
    assert.strictEqual(val.isValid, true, 'Irregular pieces pass validation');
    assert.strictEqual(val.overlapCount, 0, 'Zero overlap with irregular polygons');
  });

  await t.test('7. Multi-Heuristic Search Quality & Ordering Diversity', () => {
    const pieces = expandPatternPieces(shirtTemplates, true, true);
    const strategies = buildOrderingStrategies(pieces);

    // Verify ordering strategies include structural panels and round-robin
    assert(strategies.length >= 10, `Optimizer evaluates diverse strategies (got ${strategies.length})`);
    
    // Check determinism: running optimizer twice on same inputs produces identical layout
    const run1 = optimizeFabricCutting({ fabricWidth: 100, fabricLength: 100, patterns: shirtTemplates, minSpacing: 0.5 });
    const run2 = optimizeFabricCutting({ fabricWidth: 100, fabricLength: 100, patterns: shirtTemplates, minSpacing: 0.5 });

    assert.strictEqual(run1.placedCount, run2.placedCount, 'Placed counts match across runs');
    assert.strictEqual(run1.utilization, run2.utilization, 'Utilization matches across runs');
    assert.strictEqual(run1.layoutPlacements.length, run2.layoutPlacements.length, 'Placement counts match');

    for (let i = 0; i < run1.layoutPlacements.length; i++) {
      const p1 = run1.layoutPlacements[i];
      const p2 = run2.layoutPlacements[i];
      assert.strictEqual(p1.id, p2.id, `Piece id matches for #${i}`);
      assert.strictEqual(p1.x, p2.x, `Piece x matches for #${i}`);
      assert.strictEqual(p1.y, p2.y, `Piece y matches for #${i}`);
      assert.strictEqual(p1.rotation, p2.rotation, `Piece rotation matches for #${i}`);
    }
  });

  await t.test('8. Irregular Polygon Area Calculations (Shoelace Gauss Formula)', () => {
    // 1. Unit Square [0,1]x[0,1]: normalized area should be exactly 1.0
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ];
    assert.strictEqual(calculatePolygonArea(square), 1.0, 'Square normalized area is 1.0');

    // 2. Right Triangle with base 1.0, height 1.0: area = 0.5 * base * height = 0.5
    const triangle = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 }
    ];
    assert.strictEqual(calculatePolygonArea(triangle), 0.5, 'Right triangle normalized area is 0.5');

    // 3. Trapezoid: top base 0.4, bottom base 1.0, height 1.0: area = (0.4 + 1.0) / 2 * 1.0 = 0.7
    const trapezoid = [
      { x: 0.3, y: 0 },
      { x: 0.7, y: 0 },
      { x: 1.0, y: 1 },
      { x: 0.0, y: 1 }
    ];
    assert.strictEqual(Math.round(calculatePolygonArea(trapezoid) * 10) / 10, 0.7, 'Trapezoid normalized area is 0.7');

    // 4. L-Shape (50% area cut out from quadrant):
    // 1.0 * 1.0 - (0.5 * 0.5) = 0.75
    const lShape = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 1 }
    ];
    assert.strictEqual(calculatePolygonArea(lShape), 0.75, 'L-shape normalized area is exactly 0.75');

    // 5. Scaled real area calculation for pattern piece (width 40cm, height 50cm):
    // Bounding area = 40 * 50 = 2000 cm²
    // Real L-shape area = 0.75 * 2000 = 1500 cm²
    const lPattern = [
      { id: 'l1', name: 'L-Panel', width: 40, height: 50, quantity: 1, outline: lShape }
    ];
    const expandedL = expandPatternPieces(lPattern, true, true);
    assert.strictEqual(expandedL[0].polygonArea, 1500, 'Real scaled Shoelace polygon area is 1500 cm²');
    assert.strictEqual(expandedL[0].isIrregular, true, 'Marked as irregular');
  });

  await t.test('9. Honest Zero, Equal, Improved, and Worse Baseline Comparisons', () => {
    // A. Improved baseline scenario (+10.5 pp)
    const improvedWording = getSustainabilityWording({
      utilization: 85.5,
      waste: 14.5,
      baselineUtilization: 75.0,
      baselineWaste: 25.0,
      utilizationDeltaPp: 10.5,
      fabricSavedMeters: 2.1,
      fabricSavedKg: 0.8
    });
    assert.strictEqual(improvedWording.statusKey, 'improved', 'Status key is "improved"');
    assert.strictEqual(improvedWording.badgeText, '+10.5 pp Yield Gain', 'Badge shows positive yield gain');
    assert(improvedWording.impactSummary.includes('85.5%'), 'Summary notes 85.5% utilization');
    assert(improvedWording.impactSummary.includes('75% unoptimized baseline'), 'Summary notes baseline');

    // B. Equal baseline scenario (0 pp delta)
    const equalWording = getSustainabilityWording({
      utilization: 70.0,
      waste: 30.0,
      baselineUtilization: 70.0,
      baselineWaste: 30.0,
      utilizationDeltaPp: 0.0,
      fabricSavedMeters: 0,
      fabricSavedKg: 0
    });
    assert.strictEqual(equalWording.statusKey, 'equal', 'Status key is "equal"');
    assert.strictEqual(equalWording.badgeText, 'No Improvement vs Baseline', 'Badge honestly shows no improvement');
    assert(equalWording.impactSummary.includes('0 pp change and 0 m fabric saved'), 'Impact summary confirms 0 change');

    // C. Worse baseline scenario (-4.0 pp delta)
    const worseWording = getSustainabilityWording({
      utilization: 66.0,
      waste: 34.0,
      baselineUtilization: 70.0,
      baselineWaste: 30.0,
      utilizationDeltaPp: -4.0,
      fabricSavedMeters: 0,
      fabricSavedKg: 0
    });
    assert.strictEqual(worseWording.statusKey, 'below', 'Status key is "below"');
    assert.strictEqual(worseWording.badgeText, 'Below Baseline', 'Badge honestly notes Below Baseline');
    assert(wordingHasNoInventedSavings(worseWording.impactSummary), 'Worse layout never invents fabric savings');

    function wordingHasNoInventedSavings(summaryText) {
      return summaryText.includes('No fabric savings were achieved') || summaryText.includes('below the sequential baseline');
    }

    // D. Zero baseline scenario (no valid baseline placements possible)
    const zeroBaselineWording = getSustainabilityWording({
      utilization: 50.0,
      waste: 50.0,
      baselineUtilization: null,
      baselineWaste: null,
      utilizationDeltaPp: null,
      fabricSavedMeters: 0,
      fabricSavedKg: 0
    });
    assert.strictEqual(zeroBaselineWording.statusKey, 'no-baseline', 'Status key is "no-baseline"');
    assert.strictEqual(zeroBaselineWording.badgeText, 'Real Calculated Benchmark', 'Default truthful badge');
  });

  await t.test('10. Rejection of Forced Overlap, Containment, Boundary & Clearance Violations', () => {
    // 1. Boundary Violation: Piece exceeds roll length
    const outOfBoundsPiece = [
      { id: 'viol-1', name: 'Oversized', x: 80, y: 10, width: 30, height: 30 } // 80 + 30 = 110 > 100
    ];
    const bReport = validateNestingLayout(outOfBoundsPiece, 100, 100, 0.5);
    assert.strictEqual(bReport.isValid, false, 'Rejects piece exceeding fabric length');
    assert.strictEqual(bReport.boundaryViolationCount, 1, 'Records 1 boundary violation');

    // 2. Boundary Violation: Irregular polygon vertex out of bounds
    const outPoly = [
      {
        id: 'viol-poly',
        name: 'Bad Polygon',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        worldPoints: [
          { x: 0, y: 0 },
          { x: 105, y: 0 }, // 105 > 100
          { x: 105, y: 50 },
          { x: 0, y: 50 }
        ]
      }
    ];
    const polyBReport = validateNestingLayout(outPoly, 100, 100, 0.5);
    assert.strictEqual(polyBReport.isValid, false, 'Rejects irregular polygon vertex exceeding fabric boundary');

    // 3. Forced Pairwise Overlap
    const overlapPieces = [
      { id: 'p1', name: 'Piece 1', x: 10, y: 10, width: 40, height: 40 },
      { id: 'p2', name: 'Piece 2', x: 30, y: 20, width: 40, height: 40 } // overlaps p1
    ];
    const ovReport = validateNestingLayout(overlapPieces, 100, 100, 0.5);
    assert.strictEqual(ovReport.isValid, false, 'Rejects overlapping pieces');
    assert.strictEqual(ovReport.overlapCount, 1, 'Records 1 overlap pair');

    // 4. Cutting Clearance Violation (gap < 0.5cm)
    const clearancePieces = [
      { id: 'c1', name: 'Clearance 1', x: 0, y: 0, width: 30, height: 30 },
      { id: 'c2', name: 'Clearance 2', x: 30.2, y: 0, width: 30, height: 30 } // gap = 0.2cm < 0.5cm
    ];
    const clReport = validateNestingLayout(clearancePieces, 100, 100, 0.5);
    assert.strictEqual(clReport.isValid, false, 'Rejects cutting clearance violation (0.2cm < 0.5cm)');
    assert.strictEqual(clReport.overlapCount, 1, 'Clearance violation flagged as overlap');

    // 5. Containment (one piece inside another)
    const outerBox = [
      { x: 10, y: 10 },
      { x: 80, y: 10 },
      { x: 80, y: 80 },
      { x: 10, y: 80 }
    ];
    const innerBox = [
      { x: 20, y: 20 },
      { x: 40, y: 20 },
      { x: 40, y: 40 },
      { x: 20, y: 40 }
    ];
    assert.strictEqual(checkPolygonCollision(outerBox, innerBox, 0), true, 'Detects polygon containment');
  });

  await t.test('11. Complete Metric Consistency Across Canvas, Summary, Sustainability, and Exports', () => {
    const testProject = {
      id: 'proj-consistency-audit',
      name: 'Full Audit Test Project',
      productType: 'Shirt',
      fabricType: 'Linen',
      fabricLength: 120,
      fabricWidth: 100,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true,
      patterns: shirtTemplates,
      totalPieces: 9,
      placedCount: 7,
      unplacedCount: 2,
      utilization: 62.8,
      wastePercentage: 37.2,
      totalArea: 1.2,
      usedArea: 0.628,
      wasteArea: 0.572,
      actualLengthUsedM: 0.95,
      markerAreaM2: 0.95,
      markerUtilization: 66.1,
      hasValidBaseline: true,
      baselineUtilization: 55.2,
      baselineWastePercentage: 44.8,
      baselineLengthUsedM: 1.10,
      utilizationDeltaPp: 7.6,
      wasteDeltaPp: 7.6,
      fabricSavedMeters: 0.15,
      fabricSavedKg: 0.08,
      layoutPlacements: [
        { id: 'pl-1', name: 'Back Bodice', category: 'BACK', x: 0, y: 0, width: 42, height: 62, rotation: 0 },
        { id: 'pl-2', name: 'Sleeves #1', category: 'SLEEVE', x: 42.5, y: 0, width: 25, height: 52, rotation: 0 },
        { id: 'pl-3', name: 'Sleeves #2', category: 'SLEEVE', x: 68, y: 0, width: 25, height: 52, rotation: 0 },
        { id: 'pl-4', name: 'Collar Band', category: 'COLLAR', x: 42.5, y: 52.5, width: 22, height: 15, rotation: 90 },
        { id: 'pl-5', name: 'Cuffs #1', category: 'CUFF', x: 65, y: 52.5, width: 24, height: 12, rotation: 90 },
        { id: 'pl-6', name: 'Cuffs #2', category: 'CUFF', x: 0, y: 62.5, width: 24, height: 12, rotation: 90 },
        { id: 'pl-7', name: 'Chest Pocket', category: 'POCKET', x: 24.5, y: 62.5, width: 14, height: 12, rotation: 90 }
      ],
      unplacedPieces: [
        { id: 'up-1', name: 'Front Bodice #1', width: 40, height: 60, reason: 'Exceeds remaining roll capacity' },
        { id: 'up-2', name: 'Front Bodice #2', width: 40, height: 60, reason: 'Exceeds remaining roll capacity' }
      ]
    };

    // 1. Cutting Plan Data Structure
    const plan = generateCuttingPlan(testProject);
    assert.strictEqual(plan.totalPieces, testProject.totalPieces, 'Cutting plan totalPieces matches project');
    assert.strictEqual(plan.placedPiecesCount, testProject.placedCount, 'Cutting plan placedPiecesCount matches project');
    assert.strictEqual(plan.unplacedPiecesCount, testProject.unplacedCount, 'Cutting plan unplacedPiecesCount matches project');
    assert.strictEqual(plan.optimizationSummary.utilization, testProject.utilization, 'Utilization matches in plan');
    assert.strictEqual(plan.optimizationSummary.wastePercentage, testProject.wastePercentage, 'Waste matches in plan');
    assert.strictEqual(plan.optimizationSummary.actualLengthUsedM, testProject.actualLengthUsedM, 'Actual length used matches in plan');
    assert.strictEqual(plan.optimizationSummary.baselineLengthUsedM, testProject.baselineLengthUsedM, 'Baseline length used matches in plan');

    // 2. CAM JSON Export
    const jsonOutput = exportCuttingPlanToJSON(testProject);
    const parsedJson = JSON.parse(jsonOutput);
    assert.strictEqual(parsedJson.totalPieces, 9, 'JSON totalPieces matches');
    assert.strictEqual(parsedJson.placedPiecesCount, 7, 'JSON placedPiecesCount matches');
    assert.strictEqual(parsedJson.unplacedPiecesCount, 2, 'JSON unplacedPiecesCount matches');
    assert.strictEqual(parsedJson.optimizationSummary.utilization, 62.8, 'JSON utilization matches');
    assert.strictEqual(parsedJson.optimizationSummary.wastePercentage, 37.2, 'JSON wastePercentage matches');

    // 3. DXF CAD Export
    const dxfOutput = exportCuttingPlanToDXF(testProject);
    assert(dxfOutput.includes('SECTION'), 'DXF contains valid SECTION headers');
    assert(dxfOutput.includes('ENTITIES'), 'DXF contains ENTITIES section');
    assert(dxfOutput.includes('EOF'), 'DXF contains EOF termination');

    // 4. SVG Laser Path Export
    const svgOutput = exportCuttingPlanToSVG(testProject);
    assert(svgOutput.includes('<svg'), 'SVG contains root <svg tag');
    assert(svgOutput.includes('width="240"'), 'SVG contains correct scaled width');
    assert(svgOutput.includes('height="200"'), 'SVG contains correct scaled height');

    // 5. Printable HTML Master Plan
    const printHtml = generatePrintableCuttingPlanHTML(testProject);
    assert(printHtml.includes('62.8%'), 'Printable HTML includes 62.8% utilization');
    assert(printHtml.includes('7 / 9'), 'Printable HTML includes 7 / 9 placed pieces');
    assert(printHtml.includes('Unplaced Pieces (2 of 9'), 'Printable HTML notes 2 unplaced pieces');

    // 6. Printable ESG Report
    const esgHtml = generatePrintableSustainabilityReportHTML(testProject);
    assert(esgHtml.includes('62.8%'), 'ESG report includes 62.8% utilization');
    assert(esgHtml.includes('55.2%'), 'ESG report includes 55.2% baseline utilization');
    assert(esgHtml.includes('0.95 m'), 'ESG report includes 0.95 m actual length');
    assert(esgHtml.includes('1.10 m'), 'ESG report includes 1.10 m baseline length');
  });

  await t.test('8. 500×150cm Roll Benchmark: Full Piece Placement, 91cm Marker Window, 4.09m Preserved Bolt', () => {
    const result = optimizeFabricCutting({
      fabricWidth: 150,
      fabricLength: 500,
      patterns: shirtTemplates,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true
    });

    // 1. Placement Completeness
    assert.strictEqual(result.success, true, 'Optimization completes successfully');
    assert.strictEqual(result.isFullSuccess, true, 'All requested pieces are successfully placed on 500x150cm roll');
    assert.strictEqual(result.totalPieces, 9, 'Exactly 9 pieces requested');
    assert.strictEqual(result.placedCount, 9, 'All 9 pieces placed');
    assert.strictEqual(result.unplacedCount, 0, 'Zero unplaced pieces');
    assert.strictEqual(result.layoutPlacements.length, 9, 'Placements array contains exactly 9 items');

    // 2. Geometric Validation
    assert.strictEqual(result.isLayoutValid, true, 'Layout is 100% geometrically valid');
    assert.strictEqual(result.overlapCount, 0, 'Zero overlapping pieces');
    assert.strictEqual(result.boundaryViolationCount, 0, 'Zero boundary violations');

    // 3. Active Marker Window & Cut Length Required
    assert(result.actualLengthUsedCm >= 90 && result.actualLengthUsedCm <= 93, `Actual length used is ~91cm (got ${result.actualLengthUsedCm}cm)`);
    assert(result.actualLengthUsedM >= 0.90 && result.actualLengthUsedM <= 0.93, `Actual length used in meters is ~0.91m (got ${result.actualLengthUsedM}m)`);

    // 4. Preserved Continuous Roll Stock
    assert(result.remainingRollLengthCm >= 407 && result.remainingRollLengthCm <= 410, `Preserved continuous roll stock is ~409cm (got ${result.remainingRollLengthCm}cm)`);
    assert(result.remainingRollLengthM >= 4.07 && result.remainingRollLengthM <= 4.10, `Preserved continuous roll stock in meters is ~4.09m (got ${result.remainingRollLengthM}m)`);

    // 5. Material Yield Calculations for Rectangular Piece Templates
    // Bounding template area = 11,078 cm² / 75,000 cm² = 14.77% ≈ 14.8%
    assert(result.utilization >= 14.0 && result.utilization <= 15.5, `Full roll stock utilization for rectangular templates is ~14.8% (got ${result.utilization}%)`);
    // Active marker window yield: 11,078 cm² / (91cm * 150cm) = 81.16% ≈ 81.2%
    assert(result.markerUtilization >= 80.0 && result.markerUtilization <= 83.0, `Active marker yield for rectangular templates is ~81.2% (got ${result.markerUtilization}%)`);

    // 5b. When pieces have garment polygon contours (8,642 cm² total polygon area):
    const contouredTemplates = shirtTemplates.map((t) => ({
      ...t,
      // Supply curved garment contour polygon area (~78% of rectangular bounding box)
      polygonArea: Math.round(t.width * t.height * 0.78)
    }));
    const contourResult = optimizeFabricCutting({
      fabricWidth: 150,
      fabricLength: 500,
      patterns: contouredTemplates,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true
    });
    // Full roll stock utilization: 8,642 cm² / 75,000 cm² = 11.5%
    assert(contourResult.utilization >= 11.0 && contourResult.utilization <= 12.0, `Full roll stock utilization with garment contours is ~11.5% (got ${contourResult.utilization}%)`);
    // Active marker window yield: 8,642 cm² / (91cm * 150cm) = 63.3%
    assert(contourResult.markerUtilization >= 62.0 && contourResult.markerUtilization <= 65.0, `Active marker yield with garment contours is ~63.3% (got ${contourResult.markerUtilization}%)`);

    // 6. Cross-Module Consistency with Cutting Plan Generator
    const testProject500 = {
      id: 'proj-500x150',
      name: 'Summer Shirt Collection',
      productType: 'Shirt',
      fabricType: 'Cotton',
      fabricWidth: 150,
      fabricLength: 500,
      grainDirection: 'Vertical',
      utilization: result.utilization,
      wastePercentage: result.wastePercentage,
      totalPieces: result.totalPieces,
      placedCount: result.placedCount,
      unplacedCount: result.unplacedCount,
      actualLengthUsedCm: result.actualLengthUsedCm,
      actualLengthUsedM: result.actualLengthUsedM,
      remainingRollLengthCm: result.remainingRollLengthCm,
      remainingRollLengthM: result.remainingRollLengthM,
      markerAreaM2: result.markerAreaM2,
      markerUtilization: result.markerUtilization,
      markerWastePercentage: result.markerWastePercentage,
      patterns: shirtTemplates,
      layoutPlacements: result.layoutPlacements
    };

    const plan = generateCuttingPlan(testProject500);
    assert.strictEqual(plan.placedPiecesCount, 9, 'Plan confirms 9 placed pieces');
    assert.strictEqual(plan.unplacedPiecesCount, 0, 'Plan confirms 0 unplaced pieces');
    assert.strictEqual(plan.optimizationSummary.actualLengthUsedCm, result.actualLengthUsedCm, 'Plan preserves actualLengthUsedCm');
    assert.strictEqual(plan.optimizationSummary.remainingRollLengthM, result.remainingRollLengthM, 'Plan preserves remainingRollLengthM');
    assert.strictEqual(plan.optimizationSummary.markerUtilization, result.markerUtilization, 'Plan preserves markerUtilization');
  });
});
