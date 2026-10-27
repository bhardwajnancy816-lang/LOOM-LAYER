import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateScrapRecommendations, RETHREAD_PRODUCTS } from './rethreadCatalog.js';

test('rethreadCatalog: handles invalid or zero inputs gracefully', () => {
  const result1 = evaluateScrapRecommendations({ width: 0, length: 0, quantity: 0 });
  assert.equal(result1.isValidInput, false);
  assert.equal(result1.recommendations.length, 0);

  const result2 = evaluateScrapRecommendations({ width: -10, length: 50, quantity: 5 });
  assert.equal(result2.isValidInput, false);
});

test('rethreadCatalog: computes direct cut yields for standard cotton shirting scraps', () => {
  // Scraps: 24 cm wide, 36 cm long, 20 pieces, Cotton, rectangular
  // Zipper pouch requires 22x16 cm panels (piecesPerUnit: 2)
  // Each 24x36 piece yields 2 panels of 22x16. 20 pieces * 2 = 40 panels -> 20 pouches.
  const result = evaluateScrapRecommendations({
    width: 24,
    length: 36,
    quantity: 20,
    fabricType: 'Cotton',
    shapeType: 'rectangular'
  });

  assert.equal(result.isValidInput, true);
  assert.ok(result.recommendations.length > 0);

  const pouch = result.recommendations.find((r) => r.id === 'zipper-pouch');
  assert.ok(pouch);
  assert.equal(pouch.isDirectFit, true);
  assert.equal(pouch.fabricMatch, true);
  assert.ok(pouch.estimatedUnits >= 20);
  assert.equal(pouch.status, 'optimal');
});

test('rethreadCatalog: identifies scrunchies as optimal for long narrow selvedge strips', () => {
  // Scraps: 12 cm wide, 90 cm long, 15 pieces, Silk, strips
  // Scrunchie requires 10x45 cm strip (piecesPerUnit: 1)
  // Each piece yields 2 scrunchie strips. 15 pieces * 2 = 30 scrunchies.
  const result = evaluateScrapRecommendations({
    width: 12,
    length: 90,
    quantity: 15,
    fabricType: 'Silk',
    shapeType: 'strips'
  });

  const scrunchie = result.recommendations.find((r) => r.id === 'hair-scrunchie');
  assert.ok(scrunchie);
  assert.equal(scrunchie.isDirectFit, true);
  assert.equal(scrunchie.fabricMatch, true);
  assert.ok(scrunchie.estimatedUnits >= 30);
  assert.equal(scrunchie.status, 'optimal');
});

test('rethreadCatalog: enables patchwork piecing for market tote bags when direct size is insufficient', () => {
  // Small scraps: 18x20 cm, 50 pieces, Denim, patches
  // Market tote needs 38x42 cm panels, but patchworkFriendly is true
  const result = evaluateScrapRecommendations({
    width: 18,
    length: 20,
    quantity: 50,
    fabricType: 'Denim',
    shapeType: 'patches'
  });

  const tote = result.recommendations.find((r) => r.id === 'market-tote');
  assert.ok(tote);
  assert.equal(tote.isDirectFit, false);
  assert.equal(tote.isPatchworkFit, true);
  assert.ok(tote.estimatedUnits > 0);
  assert.equal(tote.status, 'patchwork');
});

test('rethreadCatalog: catalog products are all well-defined with positive required area and dimensions', () => {
  assert.ok(RETHREAD_PRODUCTS.length >= 6);
  for (const prod of RETHREAD_PRODUCTS) {
    assert.ok(prod.id.length > 0);
    assert.ok(prod.name.length > 0);
    assert.ok(prod.minPieceWidth > 0);
    assert.ok(prod.minPieceLength > 0);
    assert.ok(prod.requiredAreaCm2 > 0);
    assert.ok(Array.isArray(prod.suitableFabrics));
    assert.ok(Array.isArray(prod.suitableShapes));
  }
});
