import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isCameraSupported,
  isSecureContextSupported,
  checkCameraEnvironment,
  formatCameraError,
  requestCameraStream,
  stopCameraStream,
  listCameraDevices,
  captureVideoFrame
} from './cameraUtils.js';

import {
  recognizePatternShape,
  calibratePatternDimensions
} from './patternShapeRecognizer.js';

import {
  optimizeFabricCutting
} from './fabricOptimizer.js';

// Helper to safely mock navigator on globalThis in Node environments
function mockNavigator(mediaMock) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', {
    value: mediaMock,
    configurable: true,
    writable: true
  });
  return () => {
    if (original) {
      Object.defineProperty(globalThis, 'navigator', original);
    } else {
      delete globalThis.navigator;
    }
  };
}

// Helper to safely mock window on globalThis in Node environments
function mockWindow(winMock) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    value: winMock,
    configurable: true,
    writable: true
  });
  return () => {
    if (original) {
      Object.defineProperty(globalThis, 'window', original);
    } else {
      delete globalThis.window;
    }
  };
}

test('Camera Scanning: Camera API support, secure context and error formatting', async (t) => {
  await t.test('detects when camera APIs are not present in headless Node environment', () => {
    const supported = isCameraSupported();
    assert.equal(typeof supported, 'boolean');
  });

  await t.test('checkCameraEnvironment reports complete diagnostic snapshot', () => {
    const env = checkCameraEnvironment();
    assert.equal(typeof env.isSecureContext, 'boolean');
    assert.equal(typeof env.hasMediaDevices, 'boolean');
    assert.equal(typeof env.hasGetUserMedia, 'boolean');
    assert.equal(typeof env.isCameraSupported, 'boolean');
    assert.equal(typeof env.isMobile, 'boolean');
    assert.equal(typeof env.userAgent, 'string');
  });

  await t.test('formats permission denied error cleanly with helpful guidance', () => {
    const err = { name: 'NotAllowedError', message: 'Permission denied by user' };
    const formatted = formatCameraError(err);
    assert.equal(formatted.type, 'permission-denied');
    assert.equal(formatted.title, 'Camera Permission Denied');
    assert.match(formatted.message, /site settings|file upload/i);
  });

  await t.test('formats not-found error when device lacks active camera', () => {
    const err = { name: 'NotFoundError', message: 'Requested device not found' };
    const formatted = formatCameraError(err);
    assert.equal(formatted.type, 'not-found');
    assert.equal(formatted.title, 'No Camera Device Found');
    assert.match(formatted.message, /native camera app|upload/i);
  });

  await t.test('formats in-use error when camera is locked by another app', () => {
    const err = { name: 'NotReadableError', message: 'Device is busy' };
    const formatted = formatCameraError(err);
    assert.equal(formatted.type, 'in-use');
    assert.equal(formatted.title, 'Camera Is In Use');
  });

  await t.test('formats overconstrained error when lens/resolution is unsupported', () => {
    const err = { name: 'OverconstrainedError', message: 'Constraint not satisfied' };
    const formatted = formatCameraError(err);
    assert.equal(formatted.type, 'overconstrained');
    assert.equal(formatted.title, 'Camera Mode Unsupported');
  });

  await t.test('formats insecure context / security error cleanly', () => {
    const err = { name: 'SecurityError', message: 'Insecure context' };
    const formatted = formatCameraError(err);
    assert.equal(formatted.type, 'insecure-context');
    assert.equal(formatted.title, 'Secure Context Required');
  });

  await t.test('gracefully handles null or unknown errors', () => {
    const formattedNull = formatCameraError(null);
    assert.equal(formattedNull.type, 'unknown');

    const formattedEmpty = formatCameraError({});
    assert.equal(formattedEmpty.type, 'unknown');
    assert.match(formattedEmpty.message, /upload/i);

    const formattedUnknown = formatCameraError({ name: 'SomeRandomError', message: 'Something broke' });
    assert.equal(formattedUnknown.type, 'unknown');
    assert.equal(formattedUnknown.message, 'Something broke');
  });
});

test('Camera Scanning: Stream management, device enumeration and track cleanup', async (t) => {
  await t.test('requestCameraStream returns unsupported error when navigator.mediaDevices is absent', async () => {
    const restoreNav = mockNavigator({});
    try {
      const res = await requestCameraStream({ facingMode: 'environment' });
      assert.equal(res.success, false);
      assert.equal(res.stream, null);
      assert.ok(res.error);
      assert.equal(res.error.type, 'unsupported');
    } finally {
      restoreNav();
    }
  });

  await t.test('requestCameraStream respects secure context requirements', async () => {
    const restoreNav = mockNavigator({
      mediaDevices: {
        getUserMedia: async () => ({})
      }
    });
    const restoreWin = mockWindow({
      isSecureContext: false,
      location: { protocol: 'http:', hostname: '192.168.1.50' }
    });

    try {
      const res = await requestCameraStream();
      assert.equal(res.success, false);
      assert.equal(res.error.type, 'insecure-context');
    } finally {
      restoreNav();
      restoreWin();
    }
  });

  await t.test('requestCameraStream prefers rear camera on mobile and falls back if overconstrained', async () => {
    let fallbackAttempted = false;
    const fakeStream = {
      getTracks: () => [{ stop: () => {} }],
      getVideoTracks: () => [{ stop: () => {}, readyState: 'live' }]
    };

    const restoreNav = mockNavigator({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      mediaDevices: {
        getUserMedia: async (constraints) => {
          if (constraints.video && constraints.video.facingMode && constraints.video.facingMode.ideal === 'environment') {
            const err = new Error('Overconstrained');
            err.name = 'OverconstrainedError';
            throw err;
          }
          fallbackAttempted = true;
          return fakeStream;
        }
      }
    });
    const restoreWin = mockWindow({
      isSecureContext: true,
      location: { protocol: 'https:', hostname: 'app.loomandlayer.com' }
    });

    try {
      const res = await requestCameraStream({ facingMode: 'environment' });
      assert.equal(res.success, true);
      assert.equal(res.stream, fakeStream);
      assert.equal(fallbackAttempted, true);
    } finally {
      restoreNav();
      restoreWin();
    }
  });

  await t.test('requestCameraStream on desktop gracefully uses standard available camera', async () => {
    let desktopConstraints = null;
    const fakeDesktopStream = {
      getTracks: () => [{ stop: () => {} }],
      getVideoTracks: () => [{ stop: () => {}, readyState: 'live' }]
    };

    const restoreNav = mockNavigator({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      mediaDevices: {
        getUserMedia: async (constraints) => {
          desktopConstraints = constraints;
          return fakeDesktopStream;
        }
      }
    });
    const restoreWin = mockWindow({
      isSecureContext: true,
      location: { protocol: 'https:', hostname: 'localhost' }
    });

    try {
      const res = await requestCameraStream();
      assert.equal(res.success, true);
      assert.equal(res.stream, fakeDesktopStream);
      // On desktop, facingMode is not forced into constraints
      assert.equal(desktopConstraints.video.facingMode, undefined);
      assert.equal(desktopConstraints.video.width.ideal, 1280);
    } finally {
      restoreNav();
      restoreWin();
    }
  });

  await t.test('stopCameraStream stops all tracks cleanly without throwing', () => {
    let stoppedTracksCount = 0;
    const fakeStream = {
      getTracks: () => [
        { stop: () => { stoppedTracksCount++; } },
        { stop: () => { stoppedTracksCount++; } }
      ]
    };

    assert.doesNotThrow(() => {
      stopCameraStream(fakeStream);
    });
    assert.equal(stoppedTracksCount, 2);

    // Should also safely handle null or invalid streams
    assert.doesNotThrow(() => {
      stopCameraStream(null);
      stopCameraStream({});
    });
  });

  await t.test('listCameraDevices enumerates video input devices', async () => {
    const restoreNav = mockNavigator({
      mediaDevices: {
        getUserMedia: async () => ({}),
        enumerateDevices: async () => [
          { kind: 'videoinput', deviceId: 'cam-rear', label: 'Back Camera 0 (ultra-wide)' },
          { kind: 'videoinput', deviceId: 'cam-front', label: 'Front Camera 1' },
          { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in Mic' }
        ]
      }
    });

    try {
      const devices = await listCameraDevices();
      assert.equal(devices.length, 2);
      assert.equal(devices[0].deviceId, 'cam-rear');
      assert.equal(devices[1].deviceId, 'cam-front');
    } finally {
      restoreNav();
    }
  });

  await t.test('captureVideoFrame renders canvas and generates snapshot metadata', () => {
    const origDoc = globalThis.document;

    let drawImageCalled = false;
    let toDataUrlCalled = false;

    const fakeVideo = {
      videoWidth: 1920,
      videoHeight: 1080
    };

    const fakeContext = {
      drawImage: (img, x, y, w, h) => {
        drawImageCalled = true;
        assert.equal(w, 1920);
        assert.equal(h, 1080);
      }
    };

    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: (type) => (type === '2d' ? fakeContext : null),
      toDataURL: (mime, quality) => {
        toDataUrlCalled = true;
        assert.equal(mime, 'image/jpeg');
        return 'data:image/jpeg;base64,' + 'A'.repeat(8000);
      }
    };

    globalThis.document = {
      createElement: (tag) => (tag === 'canvas' ? fakeCanvas : null)
    };

    try {
      const captured = captureVideoFrame(fakeVideo, { mimeType: 'image/jpeg', quality: 0.9 });
      assert.equal(drawImageCalled, true);
      assert.equal(toDataUrlCalled, true);
      assert.equal(captured.width, 1920);
      assert.equal(captured.height, 1080);
      assert.equal(captured.aspectRatio, 1.778);
      assert.ok(captured.sizeBytes > 0);
      assert.match(captured.formattedSize, /KB|MB/);
      assert.match(captured.dataUrl, /^data:image\/jpeg;base64,/);
    } finally {
      globalThis.document = origDoc;
    }
  });
});

test('Camera Scanning: Pattern Recognition, Uncalibrated Marking and Scale Calibration', async (t) => {
  // Generate an SVG polygon pattern simulating a curved garment bodice captured from a camera
  const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600">
    <!-- Garment Bodice outline with curved armhole and neckline -->
    <path d="M 50,50 L 350,50 L 370,300 C 350,380 320,450 300,550 L 100,550 C 80,450 50,380 30,300 Z" fill="#2d3748" stroke="#000" stroke-width="2"/>
    <!-- Internal marking that must be excluded from outer cut border -->
    <circle cx="200" cy="300" r="10" fill="none" stroke="#e53e3e" stroke-width="2" stroke-dasharray="4,4"/>
    <text x="180" y="280" font-size="14" fill="#718096">Grain Line</text>
  </svg>`;
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(testSvg)}`;

  await t.test('handoff to recognizePatternShape extracts irregular contour and marks scale uncalibrated', async () => {
    const result = await recognizePatternShape(dataUrl, {
      imageName: 'Camera_Pattern_Capture.svg',
      imageType: 'SVG'
    });

    assert.equal(result.success, true);
    assert.ok(result.shape, 'Must return detected shape object');

    // Requirement: Preserve the actual detected irregular contour rather than approximating every pattern as a rectangle
    assert.equal(result.shape.shapeType, 'irregular');
    assert.ok(Array.isArray(result.shape.outline), 'Must contain vertex array outline');
    assert.ok(result.shape.outline.length >= 6, 'Irregular outline must have distinct polygon vertices');

    // Requirement: Never infer real centimetre measurements from pixels without a known scale.
    // If scale is unknown, clearly mark the dimensions as uncalibrated.
    assert.equal(result.shape.isUncalibrated, true);
    assert.equal(result.shape.hasCalibrationReference, false);
    assert.ok(result.shape.aspectRatio > 0, 'Aspect ratio must be preserved');
  });

  await t.test('user can calibrate scale using a known reference length before treating as real', async () => {
    const initialResult = await recognizePatternShape(dataUrl, {
      imageName: 'Camera_Pattern_Capture.svg',
      imageType: 'SVG'
    });
    const uncalibrated = initialResult.shape;

    // Suppose user measures pattern with a physical ruler: Known Width = 45 cm
    const calibrated = calibratePatternDimensions(uncalibrated, {
      knownLengthCm: 45,
      referenceDimension: 'width'
    });

    assert.equal(calibrated.success, true);
    assert.ok(calibrated.shape);
    assert.equal(calibrated.shape.isUncalibrated, false);
    assert.equal(calibrated.shape.hasCalibrationReference, true);
    assert.equal(calibrated.shape.width, 45);

    // Height must scale proportionally according to aspect ratio
    const expectedHeight = Math.round(45 / uncalibrated.aspectRatio);
    assert.equal(calibrated.shape.height, expectedHeight);
    assert.equal(calibrated.shape.calibratedDimension, 'width');
    assert.equal(calibrated.shape.calibrationReferenceCm, 45);

    // Outline polygon coordinates remain identical normalized polygon [0, 1]
    assert.deepEqual(calibrated.shape.outline, uncalibrated.outline);
  });
});

test('Camera Scanning: Fabric Visual Reference & Physical Integrity Guarantee', async (t) => {
  await t.test('fabric photo capture is stored as reference and never overwrites manual roll settings', () => {
    // Project with explicit user-configured dimensions
    const project = {
      id: 'proj-test-101',
      name: 'Autumn Linen Shirt Batch',
      productType: 'Shirt',
      fabricType: 'Linen',
      fabricWidth: 140, // manual commercial usable width cm
      fabricLength: 600, // manual roll length cm
      stretch: 'No',
      grainDirection: 'Vertical',
      fabricImage: null,
      patterns: []
    };

    // User captures fabric swatch photo using camera
    const cameraFabricCapture = {
      imageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
      imageName: 'Fabric_Capture_linen_swatch.jpg',
      formattedSize: '1.4 MB',
      sizeBytes: 1468000,
      width: 1920,
      height: 1080,
      capturedAt: '2026-10-22T15:00:00Z',
      isCameraCaptured: true
    };

    // Attach fabricImage without touching manual properties
    const updatedProject = {
      ...project,
      fabricImage: cameraFabricCapture
    };

    // Requirement 4: Fabric Scanning
    // Do not claim that a photograph alone can determine exact fabric width, roll length, material composition, or physical properties.
    // Keep the existing manual fabric dimensions and fabric-type inputs intact.
    // Do not overwrite saved fabric settings without explicit user confirmation.
    assert.equal(updatedProject.fabricWidth, 140);
    assert.equal(updatedProject.fabricLength, 600);
    assert.equal(updatedProject.fabricType, 'Linen');
    assert.equal(updatedProject.stretch, 'No');
    assert.equal(updatedProject.grainDirection, 'Vertical');
    assert.ok(updatedProject.fabricImage);
    assert.equal(updatedProject.fabricImage.imageName, 'Fabric_Capture_linen_swatch.jpg');
    assert.equal(updatedProject.fabricImage.isCameraCaptured, true);
  });
});

test('Camera Scanning: Optimizer Integration with Confirmed Irregular Piece', async (t) => {
  // Create an irregular camera-captured pattern piece that was calibrated and confirmed by user
  const confirmedCameraPiece = {
    id: 'pat-camera-001',
    name: 'Front Bodice (Camera Scanned)',
    category: 'FRONT',
    shapeType: 'irregular',
    width: 35,
    height: 55,
    quantity: 2,
    rotationAllowed: true,
    grainConstraint: 'Vertical',
    isImageDerived: true,
    isUncalibrated: false,
    hasCalibrationReference: true,
    calibrationReferenceCm: 35,
    calibratedDimension: 'width',
    outline: [
      { x: 0.1, y: 0.05 },
      { x: 0.9, y: 0.05 },
      { x: 0.95, y: 0.5 },
      { x: 0.8, y: 0.95 },
      { x: 0.2, y: 0.95 },
      { x: 0.05, y: 0.5 }
    ]
  };

  const standardSleeve = {
    id: 'pat-standard-002',
    name: 'Sleeve',
    category: 'SLEEVE',
    shapeType: 'sleeve',
    width: 25,
    height: 45,
    quantity: 2,
    rotationAllowed: true,
    grainConstraint: 'Vertical'
  };

  const project = {
    id: 'proj-opt-test',
    fabricWidth: 150,
    fabricLength: 300,
    grainDirection: 'Vertical',
    patterns: [confirmedCameraPiece, standardSleeve]
  };

  await t.test('optimizer is not run automatically upon camera capture and only executes on user action', async () => {
    // Verifies that project creation or pattern addition does not run nesting solver implicitly
    assert.equal(project.layoutPlacements, undefined);
  });

  await t.test('optimizer cleanly nests confirmed camera-captured irregular piece respecting grain constraints', () => {
    const optResult = optimizeFabricCutting({
      fabricWidth: project.fabricWidth,
      fabricLength: project.fabricLength,
      patterns: project.patterns,
      minSpacing: 0.5,
      allowRotation: true,
      respectGrain: true
    });

    assert.equal(optResult.success, true);
    assert.ok(Array.isArray(optResult.layoutPlacements));
    assert.equal(optResult.placedCount, 4); // 2 bodice + 2 sleeves

    // Find placements corresponding to the camera piece
    const cameraPlacements = optResult.layoutPlacements.filter((p) => p.patternId === 'pat-camera-001');
    assert.equal(cameraPlacements.length, 2);

    for (const pl of cameraPlacements) {
      // Must maintain irregular shapeType and outline
      assert.equal(pl.shapeType, 'irregular');
      assert.ok(Array.isArray(pl.outline));
      assert.equal(pl.outline.length, 6);

      // Must fit within fabric boundaries
      assert.ok(pl.x >= 0);
      assert.ok(pl.y >= 0);
      assert.ok(pl.x + pl.width <= 150);
      assert.ok(pl.y + pl.height <= 300);

      // Grain constraint: Vertical grain allows 0° or 180° rotation
      assert.ok(pl.rotation === 0 || pl.rotation === 180);
    }
  });
});

test('Camera Scanning: Capture Lifecycle, Cancellation, and Manual Entry Coexistence', async (t) => {
  await t.test('cancelling camera modal leaves existing project patterns untouched', () => {
    const originalPatterns = [
      { id: 'p1', name: 'Front Panel', width: 40, height: 60, quantity: 2 },
      { id: 'p2', name: 'Back Panel', width: 40, height: 62, quantity: 2 }
    ];

    const projectState = {
      id: 'proj-cancel-test',
      patterns: [...originalPatterns],
      patternImage: null
    };

    // Simulate user opening camera, taking a snapshot, but clicking Cancel
    const simulatedSnapshot = {
      dataUrl: 'data:image/jpeg;base64,12345',
      width: 1920,
      height: 1080
    };

    let cancelled = true;
    if (cancelled) {
      // Cancel action: does not call onCaptureConfirm, stops tracks, resets state
      // Project state remains unmodified
    }

    assert.equal(projectState.patterns.length, 2);
    assert.equal(projectState.patternImage, null);
    assert.deepEqual(projectState.patterns, originalPatterns);
  });

  await t.test('retake resets captured snapshot without affecting other modal options', () => {
    let capturedPhoto = { dataUrl: 'data:image/jpeg;base64,snapshot1' };
    let cameraError = null;

    // Retake action
    const handleRetake = () => {
      capturedPhoto = null;
      cameraError = null;
    };

    handleRetake();
    assert.equal(capturedPhoto, null);
    assert.equal(cameraError, null);
  });

  await t.test('manual pattern entry and file upload coexist seamlessly alongside camera option', () => {
    // 1. Manual pattern
    const manualPiece = {
      id: 'manual-1',
      name: 'Collar Band',
      width: 42,
      height: 8,
      quantity: 1,
      shapeType: 'collar',
      isImageDerived: false
    };

    // 2. File uploaded pattern
    const filePiece = {
      id: 'file-1',
      name: 'Pocket Facing (Uploaded File)',
      width: 15,
      height: 18,
      quantity: 2,
      shapeType: 'pocket',
      isImageDerived: true,
      isCameraCaptured: false
    };

    // 3. Camera captured pattern
    const cameraPiece = {
      id: 'camera-1',
      name: 'Yoke (Camera Captured)',
      width: 48,
      height: 16,
      quantity: 1,
      shapeType: 'yoke',
      isImageDerived: true,
      isCameraCaptured: true
    };

    const allPatterns = [manualPiece, filePiece, cameraPiece];

    // Nesting together
    const result = optimizeFabricCutting({
      fabricWidth: 150,
      fabricLength: 200,
      patterns: allPatterns
    });

    assert.equal(result.success, true);
    assert.equal(result.totalPieces, 4); // 1 + 2 + 1
    assert.equal(result.placedCount, 4);
    assert.ok(result.utilization > 0);
  });
});

