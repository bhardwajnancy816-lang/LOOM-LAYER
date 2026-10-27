import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateWidthSensitivity } from './widthSensitivitySimulator.js';

test('Width Sensitivity Simulator Tests', async (t) => {
  console.log('🧪 Starting Width Sensitivity Simulator Tests...');

  const samplePatterns = [
    { id: 'bodice-front', name: 'Front Bodice', width: 45, height: 60, quantity: 2, grainConstraint: 'Vertical' },
    { id: 'bodice-back', name: 'Back Bodice', width: 45, height: 60, quantity: 2, grainConstraint: 'Vertical' },
    { id: 'sleeve', name: 'Sleeve', width: 30, height: 45, quantity: 2, grainConstraint: 'Vertical' }
  ];

  await t.test('1. Evaluates narrow (140cm), standard (150cm), and wide (160cm) rolls', () => {
    const report = simulateWidthSensitivity({
      patterns: samplePatterns,
      fabricLength: 500,
      currentWidth: 150,
      candidateWidths: [140, 150, 160],
      fabricPricePerMeter: 250
    });

    assert.equal(report.isValid, true, 'Report is valid');
    assert.equal(report.options.length, 3, 'Evaluated exactly 3 candidate widths');
    assert.deepEqual(report.options.map(o => o.width), [140, 150, 160], 'Correct widths evaluated');

    // Exactly one option is flagged as recommended
    const recommended = report.options.filter(o => o.isRecommended);
    assert.equal(recommended.length, 1, 'Single recommended best-buy width identified');
    assert.equal(typeof report.recommendedWidth, 'number', 'Recommended width is a valid number');
    assert.equal(typeof report.maxSavings, 'number', 'Computed maximum savings value');
    assert.match(report.recommendationSummary, /roll/i, 'Informative recommendation summary generated');
  });

  await t.test('2. Handles empty pattern list gracefully', () => {
    const report = simulateWidthSensitivity({ patterns: [] });
    assert.equal(report.isValid, false, 'Invalid on empty pattern list');
    assert.equal(report.options.length, 0);
  });
});
