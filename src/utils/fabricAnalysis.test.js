import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeFabricImage,
  assessClarity,
  analyzeSurfaceAndPattern,
  analyzeGrainDirection,
  isExternalVisionConfigured
} from './fabricAnalysisEngine.js';

test('isExternalVisionConfigured returns false when no external vision provider is set', () => {
  const configured = isExternalVisionConfigured();
  assert.equal(configured, false, 'External vision should be false by default without API keys');
});

test('analyzeFabricImage handles invalid or empty inputs gracefully without throwing', async () => {
  const result = await analyzeFabricImage(null);
  assert.equal(result.success, false);
  assert.equal(result.grain.detectedDirection, 'Uncertain');
  assert.equal(result.grain.confidence, 'None');
  assert(result.error);
});

test('analyzeFabricImage accurately diagnoses underexposed (dark) image', async () => {
  // 64x64 very dark pixels
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 15;     // R
    data[i + 1] = 15; // G
    data[i + 2] = 15; // B
    data[i + 3] = 255;
  }

  const result = await analyzeFabricImage({ data, width, height });
  assert.equal(result.success, true);
  assert.equal(result.clarity.isClear, false);
  assert.equal(result.clarity.exposure, 'Underexposed (Too Dark)');
  assert.equal(result.grain.detectedDirection, 'Uncertain');
  assert.equal(result.grain.confidence, 'None');
  assert(result.clarity.reason.includes('underexposed'));
});

test('analyzeFabricImage accurately diagnoses overexposed (washed out) image', async () => {
  // 64x64 very bright pixels
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 248;
    data[i + 1] = 248;
    data[i + 2] = 248;
    data[i + 3] = 255;
  }

  const result = await analyzeFabricImage({ data, width, height });
  assert.equal(result.success, true);
  assert.equal(result.clarity.isClear, false);
  assert.equal(result.clarity.exposure, 'Overexposed (Washed Out)');
  assert.equal(result.grain.detectedDirection, 'Uncertain');
  assert.equal(result.grain.confidence, 'None');
});

test('analyzeFabricImage detects vertical grain on synthetic vertical striped weave', async () => {
  // 64x64 with strong vertical stripe pattern (warp threads)
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // High contrast vertical stripes: alternates every 2 columns
      const val = (x % 4 < 2) ? 40 : 220;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  const result = await analyzeFabricImage({ data, width, height });
  assert.equal(result.success, true);
  assert.equal(result.clarity.isClear, true);
  assert.equal(result.grain.detectedDirection, 'Vertical');
  assert(['High', 'Moderate'].includes(result.grain.confidence));
  assert(result.grain.evidenceNote.includes('warp grain'));
});

test('analyzeFabricImage detects horizontal grain on synthetic horizontal striped weave', async () => {
  // 64x64 with strong horizontal stripe pattern (weft threads)
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // High contrast horizontal stripes: alternates every 2 rows
      const val = (y % 4 < 2) ? 40 : 220;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  const result = await analyzeFabricImage({ data, width, height });
  assert.equal(result.success, true);
  assert.equal(result.clarity.isClear, true);
  assert.equal(result.grain.detectedDirection, 'Horizontal');
  assert(['High', 'Moderate'].includes(result.grain.confidence));
  assert(result.grain.evidenceNote.includes('weft grain'));
});

test('analyzeFabricImage returns Uncertain when pattern has no directional bias (checkerboard)', async () => {
  // 64x64 isotropic checkerboard
  const width = 64;
  const height = 64;
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isEven = ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0);
      const val = isEven ? 60 : 190;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  const result = await analyzeFabricImage({ data, width, height });
  assert.equal(result.success, true);
  assert.equal(result.grain.detectedDirection, 'Uncertain');
  assert(['Low', 'None'].includes(result.grain.confidence));
});

test('analyzeFabricImage distinguishes solid vs patterned fabric appearance', async () => {
  const width = 64;
  const height = 64;

  // Solid smooth fabric
  const solidData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < solidData.length; i += 4) {
    solidData[i] = 120;
    solidData[i + 1] = 120;
    solidData[i + 2] = 120;
    solidData[i + 3] = 255;
  }
  const solidResult = await analyzeFabricImage({ data: solidData, width, height });
  assert.equal(solidResult.pattern.type, 'Solid / Uniform Color');

  // Multi-color printed fabric (contrasting colors across spatial grid tiles)
  const patternData = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (x < 32 && y < 32) {
        patternData[idx] = 240; patternData[idx + 1] = 20; patternData[idx + 2] = 20; // red
      } else if (x >= 32 && y < 32) {
        patternData[idx] = 20; patternData[idx + 1] = 230; patternData[idx + 2] = 20; // green
      } else {
        patternData[idx] = 20; patternData[idx + 1] = 20; patternData[idx + 2] = 240; // blue
      }
      patternData[idx + 3] = 255;
    }
  }
  const patternResult = await analyzeFabricImage({ data: patternData, width, height });
  assert.equal(patternResult.pattern.type, 'Patterned / Printed Fabric');
  assert.equal(patternResult.pattern.hasRepeatingPattern, true);
});

test('analysis output is transparent about provider and unconfigured cloud AI', async () => {
  const width = 32;
  const height = 32;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 128;
    data[i + 1] = 128;
    data[i + 2] = 128;
    data[i + 3] = 255;
  }

  const result = await analyzeFabricImage({ data, width, height });
  assert.equal(result.provider, 'Local Computer Vision Engine');
  assert(result.externalAiStatus.includes('Unconfigured'));
  assert.equal(result.isConfirmedByUser, false);
});
