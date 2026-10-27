/**
 * Camera Capture & Device Management Utilities
 *
 * Provides browser MediaDevices API wrappers for mobile and desktop web browsers.
 * - Handles camera detection, secure context validation, and permission checks.
 * - Prioritizes rear/environment camera on mobile devices; gracefully falls back to default on desktop.
 * - Captures high-resolution frames to canvas DataURL for pattern and fabric analysis.
 * - Provides graceful error categorization (denied, not found, in-use, insecure context, timeout).
 */

import { formatFileSize } from './imageUploadValidator.js';

/**
 * Checks if browser environment supports MediaDevices camera capture APIs
 */
export function isCameraSupported() {
  if (typeof navigator === 'undefined') return false;
  return Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}

/**
 * Checks whether the current device is a mobile phone or tablet
 */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))
  );
}

/**
 * Checks whether current window context is secure (HTTPS or localhost)
 * Camera APIs are restricted to secure contexts by modern browsers.
 */
export function isSecureContextSupported() {
  if (typeof window === 'undefined') return true;
  if (typeof window.isSecureContext === 'boolean') {
    return window.isSecureContext;
  }
  const hostname = window.location ? window.location.hostname : '';
  const protocol = window.location ? window.location.protocol : '';
  return (
    protocol === 'https:' ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]'
  );
}

/**
 * Comprehensive runtime environment diagnostic check for camera APIs
 */
export function checkCameraEnvironment() {
  const isSecure = isSecureContextSupported();
  const hasNav = typeof navigator !== 'undefined';
  const hasMediaDevices = Boolean(hasNav && navigator.mediaDevices);
  const hasGetUserMedia = Boolean(hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
  const protocol = typeof window !== 'undefined' && window.location ? window.location.protocol : '';
  const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : '';
  const isMobile = isMobileDevice();
  const userAgent = hasNav ? (navigator.userAgent || 'unknown') : 'unknown';

  return {
    isSecureContext: isSecure,
    hasMediaDevices,
    hasGetUserMedia,
    isCameraSupported: hasGetUserMedia && isSecure,
    protocol,
    hostname,
    isMobile,
    userAgent
  };
}

/**
 * Categorizes and formats standard DOMExceptions from getUserMedia
 */
export function formatCameraError(error) {
  if (!error) return { type: 'unknown', title: 'Camera Error', message: 'An unknown camera error occurred.' };

  const name = error.name || '';
  const message = error.message || '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || message.includes('denied')) {
    return {
      type: 'permission-denied',
      title: 'Camera Permission Denied',
      message:
        'Camera access was denied. Please allow camera permissions in your browser address bar or site settings, or use the file upload option instead.'
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || message.includes('found')) {
    return {
      type: 'not-found',
      title: 'No Camera Device Found',
      message:
        'No active camera was detected on this device. You can capture a photo using your native camera app and upload the file directly.'
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError' || message.includes('busy') || message.includes('in use')) {
    return {
      type: 'in-use',
      title: 'Camera Is In Use',
      message:
        'The camera is currently being used by another application, browser tab, or background process. Please close other applications using the camera and try again.'
    };
  }

  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return {
      type: 'overconstrained',
      title: 'Camera Mode Unsupported',
      message:
        'The requested camera resolution or rear-facing lens is not supported by this hardware. Switching to standard camera view.'
    };
  }

  if (name === 'SecurityError' || !isSecureContextSupported()) {
    return {
      type: 'insecure-context',
      title: 'Secure Context Required',
      message:
        'Browser camera access requires a secure connection (HTTPS or localhost). Please access Loom & Layer over HTTPS or upload an image file.'
    };
  }

  if (name === 'TimeoutError' || message.includes('timed out') || message.includes('timeout')) {
    return {
      type: 'timeout',
      title: 'Camera Connection Timed Out',
      message:
        'The camera stream initialization timed out. Please ensure camera permissions are allowed in your browser, or choose the file upload option.'
    };
  }

  return {
    type: 'unknown',
    title: 'Camera Initialization Failed',
    message: error.message || 'Unable to open camera stream. Please try uploading your image file directly.'
  };
}

/**
 * Requests a live camera MediaStream, preferring rear-facing camera on mobile devices
 * and gracefully falling back to a default camera on desktop.
 * Includes complete runtime diagnostics logging.
 */
export async function requestCameraStream(options = {}) {
  const { facingMode = 'environment', deviceId = null, timeoutMs = 12000 } = options;
  const env = checkCameraEnvironment();

  console.info('[CameraDiag] requestCameraStream initiated:', {
    secureContext: env.isSecureContext,
    protocol: env.protocol,
    hostname: env.hostname,
    hasMediaDevices: env.hasMediaDevices,
    hasGetUserMedia: env.hasGetUserMedia,
    isMobile: env.isMobile,
    requestedFacingMode: facingMode,
    requestedDeviceId: deviceId
  });

  if (!isCameraSupported()) {
    console.error('[CameraDiag] FAILED: navigator.mediaDevices.getUserMedia is not available.');
    return {
      success: false,
      stream: null,
      error: {
        type: 'unsupported',
        title: 'Camera APIs Unsupported',
        message: 'Your current browser does not support WebRTC camera capture. Please use the file upload option.'
      }
    };
  }

  if (!isSecureContextSupported()) {
    console.error('[CameraDiag] FAILED: Page is not running in a secure context (requires HTTPS or localhost).');
    return {
      success: false,
      stream: null,
      error: {
        type: 'insecure-context',
        title: 'HTTPS Connection Required',
        message: 'Camera access requires a secure context (HTTPS or localhost). Please upload an image file instead.'
      }
    };
  }

  // Construct tiered constraints
  const buildConstraints = (stage) => {
    if (stage === 1) {
      if (deviceId) {
        return { audio: false, video: { deviceId: { ideal: deviceId } } };
      }
      if (env.isMobile) {
        return {
          audio: false,
          video: {
            facingMode: { ideal: facingMode || 'environment' },
            width: { ideal: 1920, min: 480 },
            height: { ideal: 1080, min: 360 }
          }
        };
      }
      // Desktop: do not force environment facingMode; use default available camera with standard HD resolution
      return {
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
    }
    if (stage === 2) {
      // More permissive fallback: simple facingMode on mobile, generic video on desktop
      if (env.isMobile && facingMode) {
        return { audio: false, video: { facingMode: { ideal: facingMode } } };
      }
      return { audio: false, video: true };
    }
    // Universal permissive fallback
    return { audio: false, video: true };
  };

  const getUserMediaWithTimeout = (constraints, ms, stageName) => {
    console.info(`[CameraDiag] Requesting getUserMedia (${stageName}) with constraints:`, JSON.stringify(constraints));
    return new Promise((resolve, reject) => {
      let timer = null;
      if (ms > 0) {
        timer = setTimeout(() => {
          const timeoutErr = new Error(`Camera initialization timed out after ${ms}ms.`);
          timeoutErr.name = 'TimeoutError';
          console.warn(`[CameraDiag] getUserMedia (${stageName}) timed out after ${ms}ms.`);
          reject(timeoutErr);
        }, ms);
      }

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((s) => {
          if (timer) clearTimeout(timer);
          console.info(`[CameraDiag] getUserMedia (${stageName}) RESOLVED successfully.`);
          resolve(s);
        })
        .catch((err) => {
          if (timer) clearTimeout(timer);
          console.warn(`[CameraDiag] getUserMedia (${stageName}) REJECTED:`, {
            name: err.name,
            message: err.message,
            constraint: err.constraint
          });
          reject(err);
        });
    });
  };

  // Inspect stream tracks and attach diagnostic listeners
  const inspectAndValidateStream = (stream) => {
    if (!stream) return { isValid: false, reason: 'Stream is null or undefined' };
    const tracks = typeof stream.getVideoTracks === 'function' ? stream.getVideoTracks() : [];

    console.info(`[CameraDiag] MediaStream acquired (id: ${stream.id || 'none'}). Total video tracks: ${tracks.length}`);

    if (tracks.length === 0) {
      return { isValid: false, reason: 'No video tracks found in MediaStream' };
    }

    tracks.forEach((track, idx) => {
      const settings = typeof track.getSettings === 'function' ? track.getSettings() : {};
      console.info(`[CameraDiag] Video Track #${idx + 1}:`, {
        id: track.id,
        label: track.label || '(unlabeled camera)',
        kind: track.kind,
        readyState: track.readyState,
        enabled: track.enabled,
        muted: track.muted,
        settings: {
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          facingMode: settings.facingMode,
          deviceId: settings.deviceId
        }
      });

      // Track lifecycle event listeners
      track.onmute = () => {
        console.warn(`[CameraDiag] Track "${track.label || track.id}" MUTED by system/hardware. Camera may be covered or busy.`);
      };
      track.onunmute = () => {
        console.info(`[CameraDiag] Track "${track.label || track.id}" UNMUTED.`);
      };
      track.onended = () => {
        console.info(`[CameraDiag] Track "${track.label || track.id}" ENDED / disconnected.`);
      };
    });

    const activeLiveTrack = tracks.find((t) => t.readyState === 'live');
    if (!activeLiveTrack) {
      return { isValid: false, reason: 'All video tracks are in ended or non-live state' };
    }

    return { isValid: true, stream };
  };

  // Stage 1 attempt
  try {
    const stream = await getUserMediaWithTimeout(buildConstraints(1), timeoutMs, 'Stage 1');
    const validation = inspectAndValidateStream(stream);
    if (!validation.isValid) {
      stopCameraStream(stream);
      return {
        success: false,
        stream: null,
        error: {
          type: 'no-tracks',
          title: 'No Video Track Received',
          message: 'The camera did not provide any active video tracks. Please choose an image file instead.'
        }
      };
    }
    return { success: true, stream, error: null };
  } catch (err1) {
    // If permission was denied, device not found, or in-use by another app, do NOT waste time trying fallback stages
    const isFatal =
      err1.name === 'NotAllowedError' ||
      err1.name === 'PermissionDeniedError' ||
      err1.name === 'SecurityError' ||
      err1.name === 'NotFoundError' ||
      err1.name === 'DevicesNotFoundError' ||
      err1.name === 'NotReadableError' ||
      err1.name === 'TrackStartError';

    if (!isFatal) {
      // Overconstrained or generic constraint error -> attempt relaxed fallback stages
      try {
        const fallbackStream = await getUserMediaWithTimeout(buildConstraints(2), 6000, 'Stage 2 Fallback');
        const validation = inspectAndValidateStream(fallbackStream);
        if (validation.isValid) {
          return { success: true, stream: fallbackStream, error: null };
        }
        stopCameraStream(fallbackStream);
      } catch (err2) {
        try {
          const universalStream = await getUserMediaWithTimeout(buildConstraints(3), 5000, 'Stage 3 Fallback');
          const validation = inspectAndValidateStream(universalStream);
          if (validation.isValid) {
            return { success: true, stream: universalStream, error: null };
          }
          stopCameraStream(universalStream);
        } catch (err3) {
          return { success: false, stream: null, error: formatCameraError(err3 || err2 || err1) };
        }
      }
    }

    return { success: false, stream: null, error: formatCameraError(err1) };
  }
}

/**
 * Stops all active tracks on a MediaStream to release camera hardware
 */
export function stopCameraStream(stream) {
  if (!stream) return;
  try {
    if (typeof stream.getTracks === 'function') {
      const tracks = stream.getTracks();
      console.info(`[CameraDiag] stopCameraStream: stopping ${tracks.length} track(s).`);
      tracks.forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
    }
  } catch (_) {}
}

/**
 * Enumerates connected video input devices for camera switching
 */
export async function listCameraDevices() {
  if (!isCameraSupported()) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${index + 1}`,
        groupId: d.groupId
      }));
  } catch (_) {
    return [];
  }
}

/**
 * Captures the current video element frame onto an offscreen canvas
 * Returns high-quality DataURL, dimensions, and approximate file size.
 */
export function captureVideoFrame(videoElement, options = {}) {
  if (!videoElement) {
    throw new Error('Video element reference is required to capture a frame.');
  }

  const width = videoElement.videoWidth || 1280;
  const height = videoElement.videoHeight || 720;
  const mimeType = options.mimeType || 'image/jpeg';
  const quality = typeof options.quality === 'number' ? options.quality : 0.92;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context for frame capture.');
  }

  // Draw video frame
  ctx.drawImage(videoElement, 0, 0, width, height);

  const dataUrl = canvas.toDataURL(mimeType, quality);
  // Estimate byte size from Base64 Data URL length
  const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
  const sizeBytes = Math.round((base64Length * 3) / 4);

  return {
    dataUrl,
    width,
    height,
    aspectRatio: Number((width / height).toFixed(3)),
    sizeBytes,
    formattedSize: formatFileSize(sizeBytes),
    mimeType,
    capturedAt: new Date().toISOString()
  };
}
