/**
 * Product Categories & Pattern Piece Templates for Loom & Layer
 *
 * Requirements:
 * 1. Product categories:
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
 * 2. Templates provide optional, editable product-specific pattern-piece templates
 *    (front, back, sleeves, collar, waistband, pockets, cuffs, etc.).
 * 3. Templates do NOT introduce fake default pattern geometry (outline: null) or claim to generate accurate tailor-graded garments.
 * 4. Other / Custom Garment starts with a clean slate for manual pattern definition and blueprint uploads.
 * 5. Full backward compatibility with existing Shirt projects and legacy category identifiers.
 */

export const TEMPLATE_DISCLAIMER_TEXT =
  'Templates provide standard garment piece lists and default cut quantities. Adjust dimensions to your sizing spec or upload pattern blueprints.';

export const CAD_IMPORT_NOTICE =
  'CAD / DXF vector import is an upcoming capability. Upload PNG, JPG, or SVG pattern blueprints or define pieces manually.';

export const PRODUCT_TYPES = [
  {
    id: 'shirt',
    name: 'Shirt',
    category: 'Shirt',
    description: 'Classic collared button-down shirt with structured cuffs, collar, and front/back bodices.',
    isCustom: false,
    aliases: ['shirt', 'button-down', 'formal-shirt'],
    defaultPieces: [
      {
        name: 'Front Bodice',
        category: 'FRONT',
        shapeType: 'front-bodice',
        width: 40,
        height: 60,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Left & right front shirt panels'
      },
      {
        name: 'Back Bodice',
        category: 'BACK',
        shapeType: 'back-bodice',
        width: 42,
        height: 62,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Full back panel across shoulders'
      },
      {
        name: 'Sleeves',
        category: 'SLEEVE',
        shapeType: 'sleeve',
        width: 25,
        height: 52,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Left and right set-in sleeves'
      },
      {
        name: 'Collar Band',
        category: 'COLLAR',
        shapeType: 'collar',
        width: 15,
        height: 22,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Collar and collar stand band'
      },
      {
        name: 'Cuffs',
        category: 'CUFF',
        shapeType: 'cuff',
        width: 12,
        height: 24,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#0891b2',
        description: 'Left and right wrist cuffs'
      },
      {
        name: 'Chest Pocket',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 12,
        height: 14,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#ec4899',
        description: 'Single chest patch pocket'
      }
    ]
  },
  {
    id: 't-shirt',
    name: 'T-Shirt',
    category: 'T-Shirt',
    description: 'Casual crewneck or V-neck knit tee with front, back, short sleeves, and neckband.',
    isCustom: false,
    aliases: ['t-shirt', 't-shirt', 'tshirt', 'tee', 't-shirts'],
    defaultPieces: [
      {
        name: 'Front Bodice',
        category: 'FRONT',
        shapeType: 'front-bodice',
        width: 44,
        height: 66,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Front torso panel'
      },
      {
        name: 'Back Bodice',
        category: 'BACK',
        shapeType: 'back-bodice',
        width: 44,
        height: 68,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Back torso panel'
      },
      {
        name: 'Sleeves',
        category: 'SLEEVE',
        shapeType: 'sleeve',
        width: 24,
        height: 28,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Short sleeves'
      },
      {
        name: 'Neckband',
        category: 'COLLAR',
        shapeType: 'collar',
        width: 8,
        height: 36,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Ribbed circular neckline band'
      }
    ]
  },
  {
    id: 'trousers-pants',
    name: 'Trousers / Pants',
    category: 'Trousers / Pants',
    description: 'Tailored trousers with front and back leg panels, contoured waistband, and pocket bags.',
    isCustom: false,
    aliases: ['trousers', 'pants', 'trouser', 'trousers / pants', 'trousers-pants', 'slacks', 'chinos'],
    defaultPieces: [
      {
        name: 'Front Leg Panels',
        category: 'FRONT',
        shapeType: 'trouser-front',
        width: 32,
        height: 98,
        quantity: 2,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Left & right front leg panels'
      },
      {
        name: 'Back Leg Panels',
        category: 'BACK',
        shapeType: 'trouser-back',
        width: 36,
        height: 100,
        quantity: 2,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Left & right back leg panels with seat curve'
      },
      {
        name: 'Waistband',
        category: 'WAISTBAND',
        shapeType: 'waistband',
        width: 10,
        height: 86,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Contoured waist facing'
      },
      {
        name: 'Side Pockets',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 18,
        height: 24,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#ec4899',
        description: 'Slant pocket lining and bags'
      }
    ]
  },
  {
    id: 'jeans',
    name: 'Jeans',
    category: 'Jeans',
    description: 'Durable 5-pocket denim trousers with front/back legs, curved waistband, and back yoke.',
    isCustom: false,
    aliases: ['jeans', 'denim', '5-pocket-jeans'],
    defaultPieces: [
      {
        name: 'Front Leg Panels',
        category: 'FRONT',
        shapeType: 'trouser-front',
        width: 33,
        height: 102,
        quantity: 2,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Denim front leg panels'
      },
      {
        name: 'Back Leg Panels',
        category: 'BACK',
        shapeType: 'trouser-back',
        width: 37,
        height: 104,
        quantity: 2,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Denim back leg panels'
      },
      {
        name: 'Waistband',
        category: 'WAISTBAND',
        shapeType: 'waistband',
        width: 10,
        height: 88,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Curved denim waistband'
      },
      {
        name: 'Back Pockets',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 15,
        height: 17,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Rear patch pockets'
      },
      {
        name: 'Front Scoop Pockets',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 16,
        height: 20,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#ec4899',
        description: 'Front scoop pocket bags'
      },
      {
        name: 'Coin Pocket',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 8,
        height: 9,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#0891b2',
        description: 'Watch/coin pocket'
      }
    ]
  },
  {
    id: 'jacket',
    name: 'Jacket',
    category: 'Jacket',
    description: 'Structured outerwear jacket with tailored fronts, back panel, two-piece sleeves, and lapel/collar.',
    isCustom: false,
    aliases: ['jacket', 'blazer', 'coat', 'outerwear'],
    defaultPieces: [
      {
        name: 'Front Panels',
        category: 'FRONT',
        shapeType: 'front-bodice',
        width: 42,
        height: 72,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Left & right front jacket panels'
      },
      {
        name: 'Back Panel',
        category: 'BACK',
        shapeType: 'back-bodice',
        width: 44,
        height: 74,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Jacket back panel with center seam'
      },
      {
        name: 'Sleeves',
        category: 'SLEEVE',
        shapeType: 'sleeve',
        width: 28,
        height: 58,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Tailored jacket sleeves'
      },
      {
        name: 'Collar / Lapel',
        category: 'COLLAR',
        shapeType: 'collar',
        width: 16,
        height: 40,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Collar and lapel facing'
      },
      {
        name: 'Flap Pockets',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 16,
        height: 18,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#ec4899',
        description: 'Front flap pockets'
      }
    ]
  },
  {
    id: 'hoodie-sweatshirt',
    name: 'Hoodie / Sweatshirt',
    category: 'Hoodie / Sweatshirt',
    description: 'Casual pullover or zip-up sweatshirt with front/back body panels, hood, sleeves, and pouch pocket.',
    isCustom: false,
    aliases: ['hoodie', 'sweatshirt', 'hoodie / sweatshirt', 'hoodie-sweatshirt', 'fleece'],
    defaultPieces: [
      {
        name: 'Front Torso Panel',
        category: 'FRONT',
        shapeType: 'front-bodice',
        width: 46,
        height: 68,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Front sweatshirt body panel'
      },
      {
        name: 'Back Torso Panel',
        category: 'BACK',
        shapeType: 'back-bodice',
        width: 46,
        height: 70,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Back sweatshirt body panel'
      },
      {
        name: 'Sleeves',
        category: 'SLEEVE',
        shapeType: 'sleeve',
        width: 26,
        height: 60,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Left and right hoodie sleeves'
      },
      {
        name: 'Hood Panels',
        category: 'COLLAR',
        shapeType: 'collar',
        width: 28,
        height: 36,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#7c3aed',
        description: 'Contoured left & right hood panels'
      },
      {
        name: 'Kangaroo Pocket',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 32,
        height: 22,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#ec4899',
        description: 'Front kangaroo pouch pocket'
      },
      {
        name: 'Ribbed Cuffs & Hem',
        category: 'CUFF',
        shapeType: 'cuff',
        width: 12,
        height: 26,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#0891b2',
        description: 'Wrist cuffs or waistband ribbing'
      }
    ]
  },
  {
    id: 'dress',
    name: 'Dress',
    category: 'Dress',
    description: 'One-piece garment with fitted bodice panels, sleeves, and flowing skirt panels.',
    isCustom: false,
    aliases: ['dress', 'dress/gown', 'dress-gown', 'gown', 'frock'],
    defaultPieces: [
      {
        name: 'Front Bodice',
        category: 'FRONT',
        shapeType: 'front-bodice',
        width: 38,
        height: 44,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Upper bodice front panel'
      },
      {
        name: 'Back Bodice',
        category: 'BACK',
        shapeType: 'back-bodice',
        width: 38,
        height: 44,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Upper bodice back panel'
      },
      {
        name: 'Skirt Panels',
        category: 'SKIRT',
        shapeType: 'skirt-panel',
        width: 65,
        height: 90,
        quantity: 2,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#7c3aed',
        description: 'Front and back flared skirt panels'
      },
      {
        name: 'Sleeves',
        category: 'SLEEVE',
        shapeType: 'sleeve',
        width: 22,
        height: 45,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Dress sleeves'
      }
    ]
  },
  {
    id: 'skirt',
    name: 'Skirt',
    category: 'Skirt',
    description: 'A-line, pencil, or flared skirt with front and back panels, waistband facing, and pocket bags.',
    isCustom: false,
    aliases: ['skirt', 'skirts', 'a-line-skirt', 'pencil-skirt'],
    defaultPieces: [
      {
        name: 'Front Skirt Panel',
        category: 'SKIRT',
        shapeType: 'skirt-panel',
        width: 52,
        height: 65,
        quantity: 1,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Front skirt panel cut on fold'
      },
      {
        name: 'Back Skirt Panels',
        category: 'SKIRT',
        shapeType: 'skirt-panel',
        width: 28,
        height: 65,
        quantity: 2,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Left and right back skirt panels'
      },
      {
        name: 'Waistband',
        category: 'WAISTBAND',
        shapeType: 'waistband',
        width: 10,
        height: 78,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Structured waistband or facing'
      },
      {
        name: 'Pocket Bags',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 16,
        height: 22,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#ec4899',
        description: 'In-seam side pocket bags'
      }
    ]
  },
  {
    id: 'kurta',
    name: 'Kurta',
    category: 'Kurta',
    description: 'Traditional straight or A-line tunic with front/back panels, side slits, sleeves, and mandarin collar.',
    isCustom: false,
    aliases: ['kurta', 'kurti', 'kurtas', 'tunic'],
    defaultPieces: [
      {
        name: 'Front Body Panel',
        category: 'FRONT',
        shapeType: 'front-bodice',
        width: 48,
        height: 105,
        quantity: 1,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Front long tunic panel with placket slit'
      },
      {
        name: 'Back Body Panel',
        category: 'BACK',
        shapeType: 'back-bodice',
        width: 48,
        height: 106,
        quantity: 1,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Full back long tunic panel'
      },
      {
        name: 'Sleeves',
        category: 'SLEEVE',
        shapeType: 'sleeve',
        width: 25,
        height: 56,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Left and right straight sleeves'
      },
      {
        name: 'Mandarin Collar Band',
        category: 'COLLAR',
        shapeType: 'collar',
        width: 8,
        height: 42,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Standing mandarin collar band'
      },
      {
        name: 'Side Pockets',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 15,
        height: 26,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#ec4899',
        description: 'Slit seam side pockets'
      }
    ]
  },
  {
    id: 'blouse',
    name: 'Blouse',
    category: 'Blouse',
    description: 'Fitted or relaxed top with front/back bodices, bust contours, sleeves, and neckline facing.',
    isCustom: false,
    aliases: ['blouse', 'blouses', 'saree-blouse', 'top'],
    defaultPieces: [
      {
        name: 'Front Bodice Panels',
        category: 'FRONT',
        shapeType: 'front-bodice',
        width: 36,
        height: 40,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Left & right front bodice pieces with bust contour'
      },
      {
        name: 'Back Bodice Panel',
        category: 'BACK',
        shapeType: 'back-bodice',
        width: 38,
        height: 40,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Back bodice panel across shoulders'
      },
      {
        name: 'Sleeves',
        category: 'SLEEVE',
        shapeType: 'sleeve',
        width: 22,
        height: 28,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Short blouse sleeves'
      },
      {
        name: 'Neckline Facing',
        category: 'COLLAR',
        shapeType: 'collar',
        width: 10,
        height: 34,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#7c3aed',
        description: 'Neckline reinforcement facing'
      }
    ]
  },
  {
    id: 'shorts',
    name: 'Shorts',
    category: 'Shorts',
    description: 'Casual or tailored shorts with front and back leg panels, waistband, and side pockets.',
    isCustom: false,
    aliases: ['shorts', 'short', 'bermuda-shorts'],
    defaultPieces: [
      {
        name: 'Front Leg Panels',
        category: 'FRONT',
        shapeType: 'trouser-front',
        width: 34,
        height: 46,
        quantity: 2,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Left & right front short legs'
      },
      {
        name: 'Back Leg Panels',
        category: 'BACK',
        shapeType: 'trouser-back',
        width: 38,
        height: 48,
        quantity: 2,
        rotationAllowed: false,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Left & right back short legs'
      },
      {
        name: 'Waistband',
        category: 'WAISTBAND',
        shapeType: 'waistband',
        width: 10,
        height: 84,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Contoured shorts waistband'
      },
      {
        name: 'Pocket Bags',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 16,
        height: 20,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#ec4899',
        description: 'Slant pocket bags'
      }
    ]
  },
  {
    id: 'uniform',
    name: 'Uniform',
    category: 'Uniform',
    description: 'Workwear or institutional uniform shirt/jacket with reinforced panels, epaulettes, and pockets.',
    isCustom: false,
    aliases: ['uniform', 'workwear-uniform', 'uniforms'],
    defaultPieces: [
      {
        name: 'Front Panels',
        category: 'FRONT',
        shapeType: 'front-bodice',
        width: 42,
        height: 68,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#0284c7',
        description: 'Front utility panels with button closure'
      },
      {
        name: 'Back Panel',
        category: 'BACK',
        shapeType: 'back-bodice',
        width: 44,
        height: 70,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#059669',
        description: 'Reinforced back panel'
      },
      {
        name: 'Sleeves',
        category: 'SLEEVE',
        shapeType: 'sleeve',
        width: 26,
        height: 54,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Vertical',
        color: '#d97706',
        description: 'Uniform sleeves'
      },
      {
        name: 'Collar Band',
        category: 'COLLAR',
        shapeType: 'collar',
        width: 14,
        height: 22,
        quantity: 1,
        rotationAllowed: true,
        grainConstraint: 'Horizontal',
        color: '#7c3aed',
        description: 'Structured stand/fall collar'
      },
      {
        name: 'Chest Pockets',
        category: 'POCKET',
        shapeType: 'pocket',
        width: 14,
        height: 16,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#ec4899',
        description: 'Flapped chest utility pockets'
      },
      {
        name: 'Epaulettes / Cuffs',
        category: 'CUFF',
        shapeType: 'cuff',
        width: 6,
        height: 16,
        quantity: 2,
        rotationAllowed: true,
        grainConstraint: 'Flexible',
        color: '#0891b2',
        description: 'Shoulder epaulettes or cuff tabs'
      }
    ]
  },
  {
    id: 'custom',
    name: 'Other / Custom Garment',
    category: 'Other / Custom Garment',
    description: 'Blank project setup. Define pieces manually or upload PNG, JPG, or SVG pattern blueprints.',
    isCustom: true,
    aliases: [
      'custom',
      'other',
      'custom product',
      'custom-product',
      'other / custom garment',
      'other/custom garment',
      'custom garment',
      'bespoke'
    ],
    defaultPieces: []
  }
];

/**
 * Finds a product type by ID, exact name, category, or alias match (case-insensitive)
 */
export function getProductTypeById(idOrName) {
  if (!idOrName) return PRODUCT_TYPES.find((p) => p.id === 'shirt');
  const target = String(idOrName).trim().toLowerCase();

  // 1. Direct search by id, name, category, or registered aliases
  const directMatch = PRODUCT_TYPES.find(
    (p) =>
      p.id.toLowerCase() === target ||
      p.name.toLowerCase() === target ||
      p.category.toLowerCase() === target ||
      (Array.isArray(p.aliases) && p.aliases.some((a) => a.toLowerCase() === target))
  );
  if (directMatch) return directMatch;

  // 2. Normalized fallback aliases for backward compatibility & user input variances
  if (target === 'tshirt' || target === 't-shirt' || target === 't shirt') {
    return PRODUCT_TYPES.find((p) => p.id === 't-shirt');
  }
  if (
    target === 'trousers' ||
    target === 'pants' ||
    target === 'trousers / pants' ||
    target === 'trousers/pants' ||
    target === 'trouser'
  ) {
    return PRODUCT_TYPES.find((p) => p.id === 'trousers-pants');
  }
  if (target === 'dress' || target === 'dress/gown' || target === 'dress-gown' || target === 'gown') {
    return PRODUCT_TYPES.find((p) => p.id === 'dress');
  }
  if (
    target === 'hoodie' ||
    target === 'sweatshirt' ||
    target === 'hoodie / sweatshirt' ||
    target === 'hoodie/sweatshirt'
  ) {
    return PRODUCT_TYPES.find((p) => p.id === 'hoodie-sweatshirt');
  }
  if (
    target === 'custom' ||
    target === 'custom product' ||
    target === 'custom-product' ||
    target === 'other' ||
    target === 'other / custom garment' ||
    target === 'other/custom garment' ||
    target === 'custom garment'
  ) {
    return PRODUCT_TYPES.find((p) => p.id === 'custom');
  }

  // Gracefully fallback to custom product for any unknown category string
  return PRODUCT_TYPES.find((p) => p.id === 'custom');
}

/**
 * Creates editable pattern objects from a product template.
 * IMPORTANT: Does NOT introduce fake polygon contours; keeps outline null so optimizer
 * relies on true user-defined dimensions or uploaded blueprints.
 */
export function createTemplatePatternsForProduct(productTypeOrId, idPrefix = 'tmpl') {
  const prodType = getProductTypeById(productTypeOrId);
  if (!prodType || !Array.isArray(prodType.defaultPieces)) return [];

  return prodType.defaultPieces.map((piece, index) => {
    const w = Number(piece.width) || 30;
    const h = Number(piece.height) || 40;
    const qty = Math.max(1, Number(piece.quantity) || 1);

    return {
      id: `pat-${idPrefix}-${index + 1}-${Date.now().toString(36)}`,
      name: piece.name,
      category: piece.category || 'PART',
      shapeType: piece.shapeType || 'front-bodice',
      width: w,
      height: h,
      quantity: qty,
      rotationAllowed: piece.rotationAllowed !== undefined ? piece.rotationAllowed : true,
      grainConstraint: piece.grainConstraint || 'Vertical',
      color: piece.color || '#0284c7',
      outline: null,
      normalizedCoordinates: null,
      isImageDerived: false,
      isTemplatePiece: true,
      productType: prodType.name,
      area: (w * h) / 10000
    };
  });
}
