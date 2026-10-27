/**
 * AI Fabric Cutter — Client-Side Fabric Analysis Engine
 *
 * Provides practical, deterministic computer vision analysis of fabric swatch images:
 * 1. Image Clarity & Exposure Assessment (brightness, contrast, edge energy)
 * 2. Visible Surface Texture & Weave Characterization (smooth, woven, ribbed, coarse)
 * 3. Visible Surface Print & Pattern Detection (uniform dyed vs patterned/printed)
 * 4. Directional Grain Analysis (Sobel gradient orientation histogram for warp/weft)
 * 5. Transparent AI Service Integration Reporting (local CV active vs external cloud AI status)
 *
 * Designed to run purely client-side without external API keys or fake AI results.
 * Works both in browser DOM (Canvas/Image) and in Node.js headless environments (pixel grids).
 */

/**
 * Checks whether an external Cloud Vision AI service is configured
 */
export function isExternalVisionConfigured() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return Boolean(import.meta.env.VITE_VISION_AI_ENDPOINT || import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY);
  }
  return false;
}

/**
 * Extracts grayscale luminance and dimensions from various image input types:
 * - HTMLCanvasElement / ImageData
 * - Pre-extracted pixel arrays { width, height, data }
 * - HTMLImageElement
 * - DataURL / URL string (browser only)
 */
export async function extractLuminanceGrid(imageInput) {
  if (!imageInput) {
    throw new Error('Image source is required for fabric analysis.');
  }

  // Direct pixel data object (useful for Node tests or pre-decoded canvas)
  if (imageInput.data && typeof imageInput.width === 'number' && typeof imageInput.height === 'number') {
    const { width, height, data } = imageInput;
    const luminance = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // ITU-R BT.601 standard perceptual luminance
      luminance[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return { width, height, luminance, rawRgba: data };
  }

  // Browser HTMLCanvasElement
  if (typeof HTMLCanvasElement !== 'undefined' && imageInput instanceof HTMLCanvasElement) {
    const ctx = imageInput.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D canvas context.');
    const imgData = ctx.getImageData(0, 0, imageInput.width, imageInput.height);
    return extractLuminanceGrid(imgData);
  }

  // Browser HTMLImageElement or Image URL
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    let img = imageInput;
    if (typeof imageInput === 'string') {
      img = await new Promise((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = (e) => reject(new Error('Failed to load image for fabric analysis: ' + (e?.message || 'invalid image format')));
        image.src = imageInput;
      });
    }

    const maxDimension = 512;
    let w = img.naturalWidth || img.width || 256;
    let h = img.naturalHeight || img.height || 256;

    if (w > maxDimension || h > maxDimension) {
      if (w >= h) {
        h = Math.round((h * maxDimension) / w);
        w = maxDimension;
      } else {
        w = Math.round((w * maxDimension) / h);
        h = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context for image analysis.');

    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    return extractLuminanceGrid(imgData);
  }

  throw new Error('Unsupported image input type for fabric analysis.');
}

/**
 * Assesses photo clarity, exposure quality, and focus contrast
 */
export function assessClarity(luminance, width, height) {
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return {
      score: 0,
      rating: 'Poor',
      isClear: false,
      exposure: 'Invalid image dimensions',
      reason: 'Image dimensions are zero.'
    };
  }

  let sum = 0;
  for (let i = 0; i < totalPixels; i++) {
    sum += luminance[i];
  }
  const meanBrightness = sum / totalPixels;

  let varSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const diff = luminance[i] - meanBrightness;
    varSum += diff * diff;
  }
  const contrast = Math.sqrt(varSum / totalPixels);

  // Sharpness metric via Laplacian filter variance
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let sampleCount = 0;

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;
      // Discrete 3x3 Laplacian kernel: center -4, neighbors +1
      const lap =
        luminance[idx - width] +
        luminance[idx + width] +
        luminance[idx - 1] +
        luminance[idx + 1] -
        4 * luminance[idx];

      laplacianSum += lap;
      laplacianSqSum += lap * lap;
      sampleCount++;
    }
  }

  const lapMean = sampleCount > 0 ? laplacianSum / sampleCount : 0;
  const lapVariance = sampleCount > 0 ? (laplacianSqSum / sampleCount) - (lapMean * lapMean) : 0;

  // Exposure diagnosis
  let exposure = 'Adequate Lighting';
  let isExposurePoor = false;
  if (meanBrightness < 35) {
    exposure = 'Underexposed (Too Dark)';
    isExposurePoor = true;
  } else if (meanBrightness > 225) {
    exposure = 'Overexposed (Washed Out)';
    isExposurePoor = true;
  }

  // Composite clarity score 0 to 100
  let clarityScore = 0;
  if (!isExposurePoor) {
    const contrastContribution = Math.min(50, contrast * 1.5);
    const sharpnessContribution = Math.min(50, Math.sqrt(Math.max(0, lapVariance)) * 2.0);
    clarityScore = Math.round(contrastContribution + sharpnessContribution);
  } else {
    clarityScore = Math.max(10, Math.round(contrast * 0.5));
  }

  let rating = 'Good';
  let isClear = true;
  let reason = 'Lighting and visual focus are adequate for surface analysis.';

  if (clarityScore < 30 || isExposurePoor) {
    rating = 'Poor';
    isClear = false;
    reason = isExposurePoor
      ? `Image is ${exposure.toLowerCase()}. Texture and grain cannot be reliably evaluated.`
      : 'Image lacks sufficient contrast or focus detail. Weave features cannot be distinguished.';
  } else if (clarityScore < 50) {
    rating = 'Marginal';
    isClear = true;
    reason = 'Lighting is moderate; subtle weave characteristics may have reduced reliability.';
  }

  return {
    score: clarityScore,
    meanBrightness: Number(meanBrightness.toFixed(1)),
    contrast: Number(contrast.toFixed(1)),
    sharpness: Number(lapVariance.toFixed(1)),
    rating,
    isClear,
    exposure,
    reason
  };
}

/**
 * Evaluates surface texture and color variance (printed vs solid)
 */
export function analyzeSurfaceAndPattern(rawRgba, luminance, width, height) {
  const totalPixels = width * height;
  if (totalPixels === 0) {
    return {
      texture: { appearance: 'Unknown', description: 'No pixel data available.' },
      pattern: { type: 'Unknown', hasRepeatingPattern: false, description: 'No pixel data.' }
    };
  }

  // 1. Color variance across 16 spatial tiles to detect printed vs solid fabric
  const tilesX = 4;
  const tilesY = 4;
  const tileW = Math.floor(width / tilesX);
  const tileH = Math.floor(height / tilesY);
  const tileMeans = [];

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let y = ty * tileH; y < (ty + 1) * tileH && y < height; y++) {
        for (let x = tx * tileW; x < (tx + 1) * tileW && x < width; x++) {
          const idx = (y * width + x) * 4;
          rSum += rawRgba[idx];
          gSum += rawRgba[idx + 1];
          bSum += rawRgba[idx + 2];
          count++;
        }
      }
      if (count > 0) {
        tileMeans.push({ r: rSum / count, g: gSum / count, b: bSum / count });
      }
    }
  }

  // Compute inter-tile chromatic variance
  let rVar = 0, gVar = 0, bVar = 0;
  if (tileMeans.length > 0) {
    const avgR = tileMeans.reduce((s, t) => s + t.r, 0) / tileMeans.length;
    const avgG = tileMeans.reduce((s, t) => s + t.g, 0) / tileMeans.length;
    const avgB = tileMeans.reduce((s, t) => s + t.b, 0) / tileMeans.length;

    tileMeans.forEach((t) => {
      rVar += (t.r - avgR) ** 2;
      gVar += (t.g - avgG) ** 2;
      bVar += (t.b - avgB) ** 2;
    });
    rVar = Math.sqrt(rVar / tileMeans.length);
    gVar = Math.sqrt(gVar / tileMeans.length);
    bVar = Math.sqrt(bVar / tileMeans.length);
  }

  const chromaticVariance = (rVar + gVar + bVar) / 3;
  const isPatterned = chromaticVariance > 18;

  const pattern = isPatterned
    ? {
        type: 'Patterned / Printed Fabric',
        hasRepeatingPattern: true,
        chromaticVariance: Number(chromaticVariance.toFixed(1)),
        description: 'Noticeable spatial color variance detected across swatch, indicating a printed or woven multi-tone pattern.'
      }
    : {
        type: 'Solid / Uniform Color',
        hasRepeatingPattern: false,
        chromaticVariance: Number(chromaticVariance.toFixed(1)),
        description: 'Consistent color tone throughout image, typical of piece-dyed or solid raw yardage.'
      };

  // 2. Local texture roughness via gradient magnitude density
  let edgeEnergy = 0;
  let edgeCount = 0;

  for (let y = 1; y < height - 1; y += 2) {
    const row = y * width;
    for (let x = 1; x < width - 1; x += 2) {
      const idx = row + x;
      const gx = luminance[idx + 1] - luminance[idx - 1];
      const gy = luminance[idx + width] - luminance[idx - width];
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > 8) {
        edgeEnergy += mag;
        edgeCount++;
      }
    }
  }

  const edgeDensity = (edgeCount / (totalPixels / 4)) * 100;
  let appearance = 'Woven / Structured Weave';
  let textureDesc = 'Visible weave surface with defined interlacing structure.';

  if (edgeDensity < 3.5) {
    appearance = 'Smooth / Low Texture';
    textureDesc = 'Low surface edge variation; characteristic of fine satin, synthetic microfiber, or smooth jersey knit.';
  } else if (edgeDensity > 35) {
    appearance = 'Coarse / Highly Textured';
    textureDesc = 'Prominent surface variation; characteristic of heavy canvas, twill, slub linen, or ribbed corduroy.';
  }

  return {
    texture: {
      appearance,
      edgeDensity: Number(edgeDensity.toFixed(1)),
      description: textureDesc
    },
    pattern
  };
}

/**
 * Analyzes directional gradient orientations to detect warp/weft grain alignment
 */
export function analyzeGrainDirection(luminance, width, height, clarity) {
  // If clarity is inadequate, do not attempt to guess grain
  if (!clarity.isClear || clarity.rating === 'Poor') {
    return {
      detectedDirection: 'Uncertain',
      confidence: 'None',
      coherenceScore: 0,
      evidenceNote: 'Image clarity is insufficient to resolve directional yarn structure. Please confirm grain manually.'
    };
  }

  let horizontalEdgeEnergy = 0; // Vertical thread lines create horizontal gradients (Gx)
  let verticalEdgeEnergy = 0;   // Horizontal thread lines create vertical gradients (Gy)
  let diagonalEdgeEnergy = 0;   // 45° / 135° twill gradients

  let significantEdgeCount = 0;
  const gradientNoiseThreshold = 10.0;

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x;

      // 3x3 Sobel horizontal filter (detects vertical lines)
      const gx =
        -1 * luminance[idx - width - 1] + 1 * luminance[idx - width + 1] +
        -2 * luminance[idx - 1]         + 2 * luminance[idx + 1] +
        -1 * luminance[idx + width - 1] + 1 * luminance[idx + width + 1];

      // 3x3 Sobel vertical filter (detects horizontal lines)
      const gy =
        -1 * luminance[idx - width - 1] - 2 * luminance[idx - width] - 1 * luminance[idx - width + 1] +
         1 * luminance[idx + width - 1] + 2 * luminance[idx + width] + 1 * luminance[idx + width + 1];

      const mag = Math.hypot(gx, gy);
      if (mag < gradientNoiseThreshold) continue;

      significantEdgeCount++;
      const absGx = Math.abs(gx);
      const absGy = Math.abs(gy);

      // Dominance test
      if (absGx > absGy * 1.6) {
        // Vertical lines dominate (warp grain along image height)
        horizontalEdgeEnergy += mag;
      } else if (absGy > absGx * 1.6) {
        // Horizontal lines dominate (weft grain across image width)
        verticalEdgeEnergy += mag;
      } else {
        // Diagonal or isotropic
        diagonalEdgeEnergy += mag;
      }
    }
  }

  const totalEnergy = horizontalEdgeEnergy + verticalEdgeEnergy + diagonalEdgeEnergy;

  if (significantEdgeCount < 200 || totalEnergy === 0) {
    return {
      detectedDirection: 'Uncertain',
      confidence: 'Low',
      coherenceScore: 0,
      evidenceNote: 'Weave threads or directional ribs are not distinctly visible at this photo resolution. Manual confirmation recommended.'
    };
  }

  const verticalGrainRatio = horizontalEdgeEnergy / totalEnergy;
  const horizontalGrainRatio = verticalEdgeEnergy / totalEnergy;
  const diagonalGrainRatio = diagonalEdgeEnergy / totalEnergy;

  // Strict evidence threshold: dominant ratio must be at least 1.4x the opposing axis
  const warpOverWeft = horizontalEdgeEnergy / (verticalEdgeEnergy + 1e-5);
  const weftOverWarp = verticalEdgeEnergy / (horizontalEdgeEnergy + 1e-5);

  let detectedDirection = 'Uncertain';
  let confidence = 'None';
  let coherenceScore = 0;
  let evidenceNote = 'Directional yarn alignment could not be conclusively determined from surface gradients.';

  if (verticalGrainRatio > 0.45 && warpOverWeft >= 1.45) {
    detectedDirection = 'Vertical';
    coherenceScore = Number(verticalGrainRatio.toFixed(2));
    confidence = warpOverWeft > 2.2 ? 'High' : 'Moderate';
    evidenceNote = `Strong vertical line structure detected along image vertical axis (${(verticalGrainRatio * 100).toFixed(0)}% directional energy). Indicates lengthwise warp grain.`;
  } else if (horizontalGrainRatio > 0.45 && weftOverWarp >= 1.45) {
    detectedDirection = 'Horizontal';
    coherenceScore = Number(horizontalGrainRatio.toFixed(2));
    confidence = weftOverWarp > 2.2 ? 'High' : 'Moderate';
    evidenceNote = `Strong horizontal line structure detected across image horizontal axis (${(horizontalGrainRatio * 100).toFixed(0)}% directional energy). Indicates crosswise weft grain.`;
  } else if (diagonalGrainRatio > 0.55 && diagonalGrainRatio > verticalGrainRatio * 1.5 && diagonalGrainRatio > horizontalGrainRatio * 1.5) {
    detectedDirection = 'Diagonal';
    coherenceScore = Number(diagonalGrainRatio.toFixed(2));
    confidence = 'Moderate';
    evidenceNote = `Diagonal 45°/135° gradient dominance detected (${(diagonalGrainRatio * 100).toFixed(0)}% directional energy). Characteristic of twill weave (e.g. denim, gabardine).`;
  } else {
    detectedDirection = 'Uncertain';
    confidence = 'Low';
    coherenceScore = Number(Math.max(verticalGrainRatio, horizontalGrainRatio, diagonalGrainRatio).toFixed(2));
    evidenceNote = 'Surface gradients are balanced or isotropic without a single dominant grain direction. User confirmation required.';
  }

  return {
    detectedDirection,
    confidence,
    coherenceScore,
    evidenceNote,
    ratios: {
      verticalGrain: Number(verticalGrainRatio.toFixed(2)),
      horizontalGrain: Number(horizontalGrainRatio.toFixed(2)),
      diagonalGrain: Number(diagonalGrainRatio.toFixed(2))
    }
  };
}

/**
 * Main Entry Point: Analyzes a captured or selected fabric image
 *
 * @param {HTMLImageElement|HTMLCanvasElement|ImageData|string|object} imageInput
 * @returns {Promise<object>} Complete fabric analysis result
 */
export async function analyzeFabricImage(imageInput) {
  const startTime = Date.now();
  const externalConfigured = isExternalVisionConfigured();

  try {
    const grid = await extractLuminanceGrid(imageInput);
    const clarity = assessClarity(grid.luminance, grid.width, grid.height);
    const surface = analyzeSurfaceAndPattern(grid.rawRgba, grid.luminance, grid.width, grid.height);
    const grain = analyzeGrainDirection(grid.luminance, grid.width, grid.height, clarity);
    const durationMs = Date.now() - startTime;

    return {
      success: true,
      timestamp: new Date().toISOString(),
      durationMs,
      dimensions: {
        width: grid.width,
        height: grid.height
      },
      clarity,
      texture: surface.texture,
      pattern: surface.pattern,
      grain,
      provider: 'Local Computer Vision Engine',
      externalAiConfigured: externalConfigured,
      externalAiStatus: externalConfigured
        ? 'External Vision Cloud AI: Configured'
        : 'External Vision Cloud AI: Unconfigured (Local Computer Vision Active)',
      isConfirmedByUser: false
    };
  } catch (err) {
    console.warn('[FabricAnalysis] Analysis failed:', err);
    return {
      success: false,
      error: err.message || 'Could not analyze fabric image.',
      provider: 'Local Computer Vision Engine',
      externalAiConfigured: externalConfigured,
      externalAiStatus: externalConfigured
        ? 'External Vision Cloud AI: Configured'
        : 'External Vision Cloud AI: Unconfigured',
      grain: {
        detectedDirection: 'Uncertain',
        confidence: 'None',
        evidenceNote: 'Analysis could not be completed. Please specify grain manually.'
      }
    };
  }
}
