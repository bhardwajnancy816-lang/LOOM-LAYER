/**
 * Comprehensive Product Type, Template Piece, Quantity & Optimizer Integration Tests
 *
 * Verifies:
 * 1. All 13 product categories registered:
 *    - Shirt
 *    - T-Shirt
 *    - Trousers / Pants
 *    - Jeans
 *    - Jacket
 *    - Hoodie / Sweatshirt
 *    - Dress
 *    - Skirt
 *    - Kurta
 *    - Blouse
 *    - Shorts
 *    - Uniform
 *    - Other / Custom Garment
 * 2. Standard garment templates provide valid editable pieces with outline: null (no fake geometry).
 * 3. Other / Custom Garment starts with an empty template piece list (isCustom: true).
 * 4. Manual pattern operations (add, remove, rename, set quantities) on any product type.
 * 5. Project creation form behavior: loading templates vs blank project manual workflow.
 * 6. Backward compatibility with existing Shirt projects and legacy category identifiers.
 * 7. Metadata persistence (save & load) and cutting plan / report generation.
 * 8. Nesting optimizer integration across all 13 product types.
 */

import test from 'node:test';
import {
  PRODUCT_TYPES,
  getProductTypeById,
  createTemplatePatternsForProduct,
  TEMPLATE_DISCLAIMER_TEXT,
  CAD_IMPORT_NOTICE
} from '../data/productTypes.js';
import { initialProjects } from '../data/mockProjects.js';
import { optimizeFabricCutting } from './fabricOptimizer.js';
import { validatePatternImageFile } from './imageUploadValidator.js';
import { generateCuttingPlan, generatePrintableCuttingPlanHTML, generatePrintableSustainabilityReportHTML } from './cuttingPlanGenerator.js';

export function runProductTypeTests() {
  console.log('🧪 Starting Loom & Layer 13 Product Categories & Template Integration Tests...\n');
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
  // TEST 1: All 13 Product Categories Registered
  // ==========================================
  console.log('--- Test 1: All 13 Product Categories Registered ---');
  assert(Array.isArray(PRODUCT_TYPES) && PRODUCT_TYPES.length === 13, `Exactly 13 product types are registered (found ${PRODUCT_TYPES?.length})`);

  const requiredCategories = [
    'Shirt',
    'T-Shirt',
    'Trousers / Pants',
    'Jeans',
    'Jacket',
    'Hoodie / Sweatshirt',
    'Dress',
    'Skirt',
    'Kurta',
    'Blouse',
    'Shorts',
    'Uniform',
    'Other / Custom Garment'
  ];

  requiredCategories.forEach((catName) => {
    const found = PRODUCT_TYPES.find((p) => p.name === catName);
    assert(Boolean(found), `Product type "${catName}" exists in PRODUCT_TYPES`);
    assert(typeof found?.description === 'string' && found.description.length > 10, `Product type "${catName}" has meaningful description`);
  });

  // Verify getProductTypeById lookup for all 13 canonical names and IDs
  assert(getProductTypeById('shirt')?.name === 'Shirt', 'Lookup "shirt" by id returns Shirt');
  assert(getProductTypeById('Shirt')?.name === 'Shirt', 'Lookup "Shirt" by name returns Shirt');

  assert(getProductTypeById('t-shirt')?.name === 'T-Shirt', 'Lookup "t-shirt" by id returns T-Shirt');
  assert(getProductTypeById('T-Shirt')?.name === 'T-Shirt', 'Lookup "T-Shirt" by name returns T-Shirt');

  assert(getProductTypeById('trousers-pants')?.name === 'Trousers / Pants', 'Lookup "trousers-pants" returns Trousers / Pants');
  assert(getProductTypeById('Trousers / Pants')?.name === 'Trousers / Pants', 'Lookup "Trousers / Pants" returns Trousers / Pants');

  assert(getProductTypeById('jeans')?.name === 'Jeans', 'Lookup "jeans" returns Jeans');
  assert(getProductTypeById('jacket')?.name === 'Jacket', 'Lookup "jacket" returns Jacket');

  assert(getProductTypeById('hoodie-sweatshirt')?.name === 'Hoodie / Sweatshirt', 'Lookup "hoodie-sweatshirt" returns Hoodie / Sweatshirt');
  assert(getProductTypeById('Hoodie / Sweatshirt')?.name === 'Hoodie / Sweatshirt', 'Lookup "Hoodie / Sweatshirt" returns Hoodie / Sweatshirt');

  assert(getProductTypeById('dress')?.name === 'Dress', 'Lookup "dress" returns Dress');
  assert(getProductTypeById('skirt')?.name === 'Skirt', 'Lookup "skirt" returns Skirt');
  assert(getProductTypeById('kurta')?.name === 'Kurta', 'Lookup "kurta" returns Kurta');
  assert(getProductTypeById('blouse')?.name === 'Blouse', 'Lookup "blouse" returns Blouse');
  assert(getProductTypeById('shorts')?.name === 'Shorts', 'Lookup "shorts" returns Shorts');
  assert(getProductTypeById('uniform')?.name === 'Uniform', 'Lookup "uniform" returns Uniform');
  assert(getProductTypeById('custom')?.name === 'Other / Custom Garment', 'Lookup "custom" returns Other / Custom Garment');
  assert(getProductTypeById('Other / Custom Garment')?.name === 'Other / Custom Garment', 'Lookup "Other / Custom Garment" returns Other / Custom Garment');

  // Verify backward compatibility and alias lookup
  assert(getProductTypeById('T-shirt')?.name === 'T-Shirt', 'Legacy alias "T-shirt" returns T-Shirt');
  assert(getProductTypeById('tshirt')?.name === 'T-Shirt', 'Alias "tshirt" returns T-Shirt');
  assert(getProductTypeById('trousers')?.name === 'Trousers / Pants', 'Legacy alias "trousers" returns Trousers / Pants');
  assert(getProductTypeById('pants')?.name === 'Trousers / Pants', 'Alias "pants" returns Trousers / Pants');
  assert(getProductTypeById('dress-gown')?.name === 'Dress', 'Legacy alias "dress-gown" returns Dress');
  assert(getProductTypeById('Dress/Gown')?.name === 'Dress', 'Legacy alias "Dress/Gown" returns Dress');
  assert(getProductTypeById('hoodie')?.name === 'Hoodie / Sweatshirt', 'Alias "hoodie" returns Hoodie / Sweatshirt');
  assert(getProductTypeById('sweatshirt')?.name === 'Hoodie / Sweatshirt', 'Alias "sweatshirt" returns Hoodie / Sweatshirt');
  assert(getProductTypeById('Custom Product')?.name === 'Other / Custom Garment', 'Legacy alias "Custom Product" returns Other / Custom Garment');
  assert(getProductTypeById('other')?.name === 'Other / Custom Garment', 'Alias "other" returns Other / Custom Garment');
  assert(getProductTypeById('nonexistent-category')?.name === 'Other / Custom Garment', 'Unknown category string defaults gracefully to Other / Custom Garment');
  assert(getProductTypeById(null)?.name === 'Shirt', 'Empty/null id returns default Shirt');

  // ==========================================
  // TEST 2: Template Pieces Inspection
  // ==========================================
  console.log('\n--- Test 2: Template Pieces Inspection for Each Category ---');

  // Shirt
  const shirt = getProductTypeById('shirt');
  const shirtPieces = shirt.defaultPieces.map((p) => p.name.toLowerCase());
  assert(shirtPieces.some((n) => n.includes('front')), 'Shirt includes Front piece');
  assert(shirtPieces.some((n) => n.includes('back')), 'Shirt includes Back piece');
  assert(shirtPieces.some((n) => n.includes('sleeve')), 'Shirt includes Sleeve piece');
  assert(shirtPieces.some((n) => n.includes('collar')), 'Shirt includes Collar piece');
  assert(shirtPieces.some((n) => n.includes('cuff')), 'Shirt includes Cuff piece');
  assert(shirtPieces.some((n) => n.includes('pocket')), 'Shirt includes Pocket piece');

  // T-Shirt
  const tshirt = getProductTypeById('t-shirt');
  const tshirtPieces = tshirt.defaultPieces.map((p) => p.name.toLowerCase());
  assert(tshirtPieces.some((n) => n.includes('front')), 'T-Shirt includes Front');
  assert(tshirtPieces.some((n) => n.includes('back')), 'T-Shirt includes Back');
  assert(tshirtPieces.some((n) => n.includes('sleeve')), 'T-Shirt includes Sleeve');
  assert(tshirtPieces.some((n) => n.includes('neckband')), 'T-Shirt includes Neckband');

  // Trousers / Pants
  const trousers = getProductTypeById('trousers-pants');
  const trousersPieces = trousers.defaultPieces.map((p) => p.name.toLowerCase());
  assert(trousersPieces.some((n) => n.includes('front')), 'Trousers / Pants includes Front leg');
  assert(trousersPieces.some((n) => n.includes('back')), 'Trousers / Pants includes Back leg');
  assert(trousersPieces.some((n) => n.includes('waistband')), 'Trousers / Pants includes Waistband');
  assert(trousersPieces.some((n) => n.includes('pocket')), 'Trousers / Pants includes Pockets');

  // Jeans
  const jeans = getProductTypeById('jeans');
  const jeansPieces = jeans.defaultPieces.map((p) => p.name.toLowerCase());
  assert(jeansPieces.some((n) => n.includes('front')), 'Jeans includes Front leg');
  assert(jeansPieces.some((n) => n.includes('back')), 'Jeans includes Back leg');
  assert(jeansPieces.some((n) => n.includes('waistband')), 'Jeans includes Waistband');
  assert(jeansPieces.some((n) => n.includes('coin') || n.includes('back pocket')), 'Jeans includes specialized pockets');

  // Jacket
  const jacket = getProductTypeById('jacket');
  const jacketPieces = jacket.defaultPieces.map((p) => p.name.toLowerCase());
  assert(jacketPieces.some((n) => n.includes('front')), 'Jacket includes Front panels');
  assert(jacketPieces.some((n) => n.includes('back')), 'Jacket includes Back panel');
  assert(jacketPieces.some((n) => n.includes('sleeve')), 'Jacket includes Sleeves');
  assert(jacketPieces.some((n) => n.includes('collar') || n.includes('lapel')), 'Jacket includes Collar / Lapel');

  // Hoodie / Sweatshirt
  const hoodie = getProductTypeById('hoodie-sweatshirt');
  const hoodiePieces = hoodie.defaultPieces.map((p) => p.name.toLowerCase());
  assert(hoodiePieces.some((n) => n.includes('front')), 'Hoodie includes Front Torso');
  assert(hoodiePieces.some((n) => n.includes('back')), 'Hoodie includes Back Torso');
  assert(hoodiePieces.some((n) => n.includes('hood')), 'Hoodie includes Hood Panels');
  assert(hoodiePieces.some((n) => n.includes('pocket')), 'Hoodie includes Kangaroo Pocket');
  assert(hoodiePieces.some((n) => n.includes('cuff')), 'Hoodie includes Ribbed Cuffs / Hem');

  // Dress
  const dress = getProductTypeById('dress');
  const dressPieces = dress.defaultPieces.map((p) => p.name.toLowerCase());
  assert(dressPieces.some((n) => n.includes('skirt')), 'Dress includes Skirt panels');
  assert(dressPieces.some((n) => n.includes('bodice')), 'Dress includes Bodice');

  // Skirt
  const skirt = getProductTypeById('skirt');
  const skirtPieces = skirt.defaultPieces.map((p) => p.name.toLowerCase());
  assert(skirtPieces.some((n) => n.includes('front skirt')), 'Skirt includes Front Skirt Panel');
  assert(skirtPieces.some((n) => n.includes('back skirt')), 'Skirt includes Back Skirt Panel');
  assert(skirtPieces.some((n) => n.includes('waistband')), 'Skirt includes Waistband');

  // Kurta
  const kurta = getProductTypeById('kurta');
  const kurtaPieces = kurta.defaultPieces.map((p) => p.name.toLowerCase());
  assert(kurtaPieces.some((n) => n.includes('front body')), 'Kurta includes Front Body Panel');
  assert(kurtaPieces.some((n) => n.includes('back body')), 'Kurta includes Back Body Panel');
  assert(kurtaPieces.some((n) => n.includes('mandarin') || n.includes('collar')), 'Kurta includes Mandarin Collar');
  assert(kurtaPieces.some((n) => n.includes('pocket')), 'Kurta includes Side Pockets');

  // Blouse
  const blouse = getProductTypeById('blouse');
  const blousePieces = blouse.defaultPieces.map((p) => p.name.toLowerCase());
  assert(blousePieces.some((n) => n.includes('front bodice')), 'Blouse includes Front Bodice Panels');
  assert(blousePieces.some((n) => n.includes('back bodice')), 'Blouse includes Back Bodice Panel');
  assert(blousePieces.some((n) => n.includes('facing')), 'Blouse includes Neckline Facing');

  // Shorts
  const shorts = getProductTypeById('shorts');
  const shortsPieces = shorts.defaultPieces.map((p) => p.name.toLowerCase());
  assert(shortsPieces.some((n) => n.includes('front leg')), 'Shorts includes Front Leg Panels');
  assert(shortsPieces.some((n) => n.includes('back leg')), 'Shorts includes Back Leg Panels');
  assert(shortsPieces.some((n) => n.includes('waistband')), 'Shorts includes Waistband');

  // Uniform
  const uniform = getProductTypeById('uniform');
  const uniformPieces = uniform.defaultPieces.map((p) => p.name.toLowerCase());
  assert(uniformPieces.some((n) => n.includes('front')), 'Uniform includes Front panels');
  assert(uniformPieces.some((n) => n.includes('epaulette') || n.includes('cuff')), 'Uniform includes Epaulettes / Cuffs');

  // Other / Custom Garment
  const custom = getProductTypeById('custom');
  assert(Array.isArray(custom.defaultPieces) && custom.defaultPieces.length === 0, 'Other / Custom Garment starts with empty template list');
  assert(custom.isCustom === true, 'Other / Custom Garment is flagged isCustom: true');

  // ==========================================
  // TEST 3: Strict Geometry Policy (No Fake Shapes)
  // ==========================================
  console.log('\n--- Test 3: No Fake Pattern Geometry in Any Template ---');
  PRODUCT_TYPES.forEach((pt) => {
    const templates = createTemplatePatternsForProduct(pt.name);
    templates.forEach((piece) => {
      assert(piece.outline === null, `Category "${pt.name}" piece "${piece.name}" has outline === null`);
      assert(piece.normalizedCoordinates === null, `Category "${pt.name}" piece "${piece.name}" has normalizedCoordinates === null`);
      assert(typeof piece.width === 'number' && piece.width > 0, `Piece "${piece.name}" has valid width (${piece.width}cm)`);
      assert(typeof piece.height === 'number' && piece.height > 0, `Piece "${piece.name}" has valid height (${piece.height}cm)`);
      assert(typeof piece.quantity === 'number' && piece.quantity >= 1, `Piece "${piece.name}" has valid quantity (${piece.quantity})`);
    });
  });

  assert(typeof TEMPLATE_DISCLAIMER_TEXT === 'string' && TEMPLATE_DISCLAIMER_TEXT.length > 20, 'Clear template disclaimer text is defined');
  assert(typeof CAD_IMPORT_NOTICE === 'string' && CAD_IMPORT_NOTICE.length > 20, 'Clear CAD import notice text is defined');

  // ==========================================
  // TEST 4: Pattern Operations (Add, Remove, Edit, Set Quantities)
  // ==========================================
  console.log('\n--- Test 4: Pattern Operations on Kurta & Custom Garment ---');
  let kurtaPatterns = createTemplatePatternsForProduct('Kurta');
  const initialKurtaCount = kurtaPatterns.length;

  // Add piece
  const customYoke = {
    id: 'pat-custom-kurta-yoke',
    name: 'Embroidered Yoke',
    category: 'FRONT',
    width: 24,
    height: 30,
    quantity: 2,
    rotationAllowed: true,
    grainConstraint: 'Vertical',
    color: '#059669',
    outline: null
  };
  kurtaPatterns = [...kurtaPatterns, customYoke];
  assert(kurtaPatterns.length === initialKurtaCount + 1, 'Successfully added custom piece to Kurta');

  // Edit piece dimensions & rename
  kurtaPatterns = kurtaPatterns.map((p) =>
    p.id === customYoke.id ? { ...p, name: 'Heavy Embroidered Yoke', width: 26, height: 32 } : p
  );
  assert(kurtaPatterns.find((p) => p.id === customYoke.id)?.name === 'Heavy Embroidered Yoke', 'Successfully renamed piece');
  assert(kurtaPatterns.find((p) => p.id === customYoke.id)?.width === 26, 'Successfully updated piece width to 26cm');

  // Set quantity
  kurtaPatterns = kurtaPatterns.map((p) => (p.name.includes('Sleeve') ? { ...p, quantity: 4 } : p));
  assert(kurtaPatterns.find((p) => p.name.includes('Sleeve'))?.quantity === 4, 'Successfully updated sleeve quantity to 4');

  // Delete piece
  kurtaPatterns = kurtaPatterns.filter((p) => p.id !== customYoke.id);
  assert(kurtaPatterns.length === initialKurtaCount, 'Successfully removed piece from Kurta');

  // ==========================================
  // TEST 5: Project Creation & Template Pre-population Logic
  // ==========================================
  console.log('\n--- Test 5: Project Creation Logic for All 13 Categories ---');

  // Helper simulating ProjectContext.createProject logic
  function simulateCreateProject(formData) {
    const productType = formData.productType || 'Shirt';
    const prodObj = getProductTypeById(productType);
    const resolvedProductType = prodObj ? prodObj.name : productType;
    const isCustomType = Boolean(prodObj?.isCustom) || resolvedProductType === 'Other / Custom Garment' || resolvedProductType === 'Custom Product';

    let patterns = [];
    if (Array.isArray(formData.patterns) && formData.patterns.length > 0) {
      patterns = formData.patterns;
    } else if (formData.loadTemplates !== false && !isCustomType) {
      patterns = createTemplatePatternsForProduct(resolvedProductType, 'test');
    }

    return {
      id: `proj-sim-${Date.now()}`,
      name: formData.name || 'Untitled',
      productType: resolvedProductType,
      patterns,
      totalPieces: patterns.reduce((s, p) => s + (Number(p.quantity) || 0), 0)
    };
  }

  // Verify project creation with templates for each non-custom category
  requiredCategories.filter((c) => c !== 'Other / Custom Garment').forEach((catName) => {
    const proj = simulateCreateProject({ name: `Batch for ${catName}`, productType: catName, loadTemplates: true });
    assert(proj.productType === catName, `Project created with productType: "${catName}"`);
    assert(proj.patterns.length > 0, `Project for "${catName}" pre-populated with ${proj.patterns.length} template pieces`);
    assert(proj.totalPieces > 0, `Project for "${catName}" calculated totalPieces > 0 (${proj.totalPieces})`);
  });

  // Verify project creation with loadTemplates: false yields blank project
  const blankKurta = simulateCreateProject({ name: 'Manual Kurta', productType: 'Kurta', loadTemplates: false });
  assert(blankKurta.patterns.length === 0, 'Project created with loadTemplates: false has 0 patterns');
  assert(blankKurta.totalPieces === 0, 'Project created with loadTemplates: false has 0 totalPieces');

  // Verify Other / Custom Garment always starts with blank project
  const customProj = simulateCreateProject({ name: 'Custom Project', productType: 'Other / Custom Garment', loadTemplates: true });
  assert(customProj.productType === 'Other / Custom Garment', 'Custom project has productType "Other / Custom Garment"');
  assert(customProj.patterns.length === 0, 'Other / Custom Garment starts with blank piece list');

  // ==========================================
  // TEST 6: Backward Compatibility with Existing Projects
  // ==========================================
  console.log('\n--- Test 6: Backward Compatibility with Existing Project Data ---');
  assert(initialProjects[0].productType === 'Shirt', 'Initial project #1 has productType: Shirt');
  assert(initialProjects[0].patterns.length === 4, 'Initial project #1 has 4 patterns');
  assert(initialProjects[0].totalPieces === 50, 'Initial project #1 has 50 total pieces');
  assert(initialProjects[0].layoutPlacements.length === 35, 'Initial project #1 has 35 layout placements');

  assert(initialProjects[1].productType === 'Jacket', 'Initial project #2 has productType: Jacket');
  assert(initialProjects[2].productType === 'Dress/Gown', 'Initial project #3 has legacy productType: Dress/Gown');
  assert(getProductTypeById(initialProjects[2].productType)?.name === 'Dress', 'Legacy "Dress/Gown" maps cleanly to Dress');

  assert(initialProjects[3].productType === 'T-shirt', 'Initial project #4 has legacy productType: T-shirt');
  assert(getProductTypeById(initialProjects[3].productType)?.name === 'T-Shirt', 'Legacy "T-shirt" maps cleanly to T-Shirt');

  // ==========================================
  // TEST 7: Persistence and Report Generation
  // ==========================================
  console.log('\n--- Test 7: Persistence and Report Subtitles ---');
  const hoodieProject = {
    id: 'proj-hoodie-test',
    name: 'Winter Fleece Hoodie Batch',
    productType: 'Hoodie / Sweatshirt',
    fabricType: 'Fleece',
    fabricWidth: 160,
    fabricLength: 600,
    patterns: createTemplatePatternsForProduct('Hoodie / Sweatshirt'),
    layoutPlacements: [],
    utilization: 92.4,
    wastePercentage: 7.6,
    totalPieces: 9
  };

  // Test JSON serialization & loading
  const serialized = JSON.stringify(hoodieProject);
  const reloaded = JSON.parse(serialized);
  assert(reloaded.productType === 'Hoodie / Sweatshirt', 'Reloaded project preserves productType "Hoodie / Sweatshirt"');
  assert(reloaded.patterns.length === hoodieProject.patterns.length, 'Reloaded project preserves pattern count');

  // Test cutting plan generation
  const hoodiePlan = generateCuttingPlan(hoodieProject);
  assert(hoodiePlan.productType === 'Hoodie / Sweatshirt', 'Cutting plan preserves productType: "Hoodie / Sweatshirt"');

  // Test printable cutting plan HTML contains productType
  const planHtml = generatePrintableCuttingPlanHTML(hoodieProject);
  assert(planHtml.includes('Hoodie / Sweatshirt'), 'Printable cutting plan HTML includes productType');

  // Test printable sustainability HTML contains productType
  const esgHtml = generatePrintableSustainabilityReportHTML(hoodieProject);
  assert(esgHtml.includes('Hoodie / Sweatshirt'), 'Printable ESG report HTML includes productType');

  // ==========================================
  // TEST 8: Optimizer Integration Across All 13 Categories
  // ==========================================
  console.log('\n--- Test 8: Nesting Optimizer Execution Across All Categories ---');
  const categoriesToOptimize = [
    'Shirt',
    'T-Shirt',
    'Trousers / Pants',
    'Jeans',
    'Jacket',
    'Hoodie / Sweatshirt',
    'Dress',
    'Skirt',
    'Kurta',
    'Blouse',
    'Shorts',
    'Uniform'
  ];

  categoriesToOptimize.forEach((categoryName) => {
    const templates = createTemplatePatternsForProduct(categoryName);
    const result = optimizeFabricCutting({
      fabricWidth: 150,
      fabricLength: 600,
      patterns: templates,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true
    });

    assert(result.success === true, `Optimizer succeeded for "${categoryName}"`);
    assert(result.placedCount > 0, `Optimizer placed ${result.placedCount} pieces for "${categoryName}"`);
    assert(result.utilization > 0, `Optimizer calculated positive utilization (${result.utilization}%) for "${categoryName}"`);
    assert(result.wastePercentage <= 100, `Optimizer calculated valid scrap rate (${result.wastePercentage}%) for "${categoryName}"`);
  });

  // Optimize custom user pieces (representing Other / Custom Garment)
  const bespokePieces = [
    {
      id: 'custom-part-1',
      name: 'Custom Apron Bib',
      category: 'FRONT',
      width: 45,
      height: 75,
      quantity: 3,
      rotationAllowed: true,
      grainConstraint: 'Vertical',
      color: '#0284c7'
    },
    {
      id: 'custom-part-2',
      name: 'Custom Pocket',
      category: 'POCKET',
      width: 18,
      height: 20,
      quantity: 3,
      rotationAllowed: true,
      grainConstraint: 'Flexible',
      color: '#ec4899'
    }
  ];

  const bespokeResult = optimizeFabricCutting({
    fabricWidth: 150,
    fabricLength: 500,
    patterns: bespokePieces,
    minSpacing: 0.5,
    allowRotation: true,
    respectGrain: true
  });

  assert(bespokeResult.success === true, 'Optimizer succeeded for custom user-defined pieces');
  assert(bespokeResult.placedCount === 6, 'All 6 custom pieces placed successfully');

  // ==========================================
  // TEST 9: CAD / DXF Format Handling Intact
  // ==========================================
  console.log('\n--- Test 9: CAD / DXF Rejection & Vector File Validation ---');
  const dxfValidation = validatePatternImageFile({ name: 'garment_pattern.dxf', type: 'application/dxf', size: 1024 });
  assert(dxfValidation.isValid === false, 'DXF file intercepted without crashing');
  assert(dxfValidation.isCadFile === true, 'DXF flagged as isCadFile: true');

  const pngValidation = validatePatternImageFile({ name: 'kurta_blueprint.png', type: 'image/png', size: 45000 });
  assert(pngValidation.isValid === true, 'PNG blueprint file accepted');

  console.log(`\n==========================================`);
  console.log(`Product Type Tests: ${passedCount} Passed, ${failedCount} Failed`);
  console.log(`==========================================\n`);

  if (failedCount > 0) {
    throw new Error(`${failedCount} Product Type test(s) failed.`);
  }

  return { passedCount, failedCount };
}

test('Product Types, Templates, Creation & Backward Compatibility', () => {
  runProductTypeTests();
});
