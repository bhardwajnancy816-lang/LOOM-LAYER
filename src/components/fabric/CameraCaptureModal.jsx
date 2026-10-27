import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  UploadCloud, 
  Info,
  FlipHorizontal,
  ChevronDown,
  ChevronUp,
  Terminal
} from 'lucide-react';
import { Modal } from '../common/FeedbackAndNavigation';
import { Button } from '../common/Button';
import { 
  requestCameraStream, 
  stopCameraStream, 
  captureVideoFrame, 
  listCameraDevices,
  checkCameraEnvironment
} from '../../utils/cameraUtils';

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCaptureConfirm,
  onFallbackToFileUpload,
  title = 'Capture from Camera',
  subtitle = 'Take a clear photograph using your device camera',
  targetType = 'pattern', // 'pattern' | 'fabric'
  referenceNote = null
}) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // default to rear camera on mobile
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [retryCounter, setRetryCounter] = useState(0);
  const [showDiagDetails, setShowDiagDetails] = useState(false);
  const [diagInfo, setDiagInfo] = useState(null);

  const videoRef = useRef(null);
  const activeStreamRef = useRef(null);
  const initIdRef = useRef(0);
  const isVideoReadyRef = useRef(false);
  const framePollIntervalRef = useRef(null);
  const watchdogTimeoutRef = useRef(null);

  // Helper to record runtime diagnostic state both locally and globally for DevTools console
  const updateDiagnostics = useCallback((details) => {
    const env = checkCameraEnvironment();
    const video = videoRef.current;
    const currentStream = activeStreamRef.current;
    const tracks = currentStream && typeof currentStream.getVideoTracks === 'function'
      ? currentStream.getVideoTracks()
      : [];

    const snapshot = {
      timestamp: new Date().toISOString(),
      secureContext: env.isSecureContext,
      protocol: env.protocol,
      hostname: env.hostname,
      hasMediaDevices: env.hasMediaDevices,
      hasGetUserMedia: env.hasGetUserMedia,
      streamExists: Boolean(currentStream),
      streamId: currentStream?.id || null,
      trackCount: tracks.length,
      tracks: tracks.map((t) => ({
        id: t.id,
        label: t.label || '(unlabeled)',
        readyState: t.readyState,
        enabled: t.enabled,
        muted: t.muted
      })),
      videoMounted: Boolean(video),
      videoSrcObjectAssigned: Boolean(video?.srcObject),
      videoDimensions: video ? `${video.videoWidth}x${video.videoHeight}` : 'N/A',
      videoReadyState: video ? video.readyState : -1,
      videoPaused: video ? video.paused : true,
      ...details
    };

    setDiagInfo(snapshot);
    if (typeof window !== 'undefined') {
      window.__loomCameraDiagnosticState = snapshot;
      window.__loomGetCameraDiagnostics = () => snapshot;
    }
  }, []);

  // Main lifecycle: start camera when modal opens; clean up completely when it closes
  useEffect(() => {
    const videoNode = videoRef.current;

    // Increment run ID so any previous or in-flight async operations immediately discard
    initIdRef.current += 1;
    const currentRunId = initIdRef.current;

    // Clear any polling or watchdog timers
    if (framePollIntervalRef.current) {
      clearInterval(framePollIntervalRef.current);
      framePollIntervalRef.current = null;
    }
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = null;
    }

    if (!isOpen) {
      // Modal closed: stop all active tracks and reset video element srcObject
      if (activeStreamRef.current) {
        stopCameraStream(activeStreamRef.current);
        activeStreamRef.current = null;
      }
      if (videoNode) {
        videoNode.srcObject = null;
      }
      return;
    }

    async function initCamera() {
      try {
        setIsLoading(true);
        setCameraError(null);
        setIsVideoReady(false);
        updateDiagnostics({ status: 'initializing' });

      // Clean up previous stream before opening new hardware stream
      if (activeStreamRef.current) {
        stopCameraStream(activeStreamRef.current);
        activeStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      const res = await requestCameraStream({
        facingMode,
        deviceId: selectedDeviceId,
        timeoutMs: 12000
      });

      // Guard against race conditions / modal closure while requestCameraStream was pending
      if (initIdRef.current !== currentRunId) {
        console.info(`[CameraDiag] Run #${currentRunId} superseded by #${initIdRef.current}; cleaning up stream.`);
        if (res.stream) stopCameraStream(res.stream);
        return;
      }

      if (res.success && res.stream) {
        activeStreamRef.current = res.stream;
        setStream(res.stream);
        setCameraError(null);

        const video = videoRef.current;
        if (!video) {
          console.warn('[CameraDiag] Video DOM element not mounted yet when stream resolved.');
          return;
        }

        console.info(`[CameraDiag] Binding stream (id: ${res.stream.id}) to video element.`);
        if (video.srcObject !== res.stream) {
          video.srcObject = res.stream;
        }
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');

        // Verify genuine video frame availability before lifting loading overlay
        const checkFrameReadiness = () => {
          if (initIdRef.current !== currentRunId) return;
          const width = video.videoWidth || 0;
          const height = video.videoHeight || 0;
          const readyState = video.readyState;
          const isPaused = video.paused;

          console.info(`[CameraDiag] Frame status check: ${width}x${height}, readyState=${readyState}, paused=${isPaused}`);

          if (width > 0 && height > 0 && readyState >= 2 && !isPaused) {
            console.info('[CameraDiag] CONFIRMED: Live video frames actively decoding and rendering! Revealing camera preview.');
            isVideoReadyRef.current = true;
            setIsVideoReady(true);
            setIsLoading(false);
            updateDiagnostics({ status: 'active-streaming', readyState, width, height });

            if (framePollIntervalRef.current) {
              clearInterval(framePollIntervalRef.current);
              framePollIntervalRef.current = null;
            }
            if (watchdogTimeoutRef.current) {
              clearTimeout(watchdogTimeoutRef.current);
              watchdogTimeoutRef.current = null;
            }
          }
        };

        const attemptPlay = () => {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => {
                console.info('[CameraDiag] video.play() resolved successfully.');
                checkFrameReadiness();
              })
              .catch((err) => {
                console.warn('[CameraDiag] video.play() rejected:', err.name, err.message);
                updateDiagnostics({ playError: `${err.name}: ${err.message}` });
              });
          }
        };

        // Attach video element lifecycle handlers
        video.onloadedmetadata = () => {
          console.info(`[CameraDiag] Event "loadedmetadata": dimensions ${video.videoWidth}x${video.videoHeight}`);
          attemptPlay();
          checkFrameReadiness();
        };

        video.oncanplay = () => {
          console.info('[CameraDiag] Event "canplay"');
          attemptPlay();
          checkFrameReadiness();
        };

        video.onplaying = () => {
          console.info('[CameraDiag] Event "playing"');
          checkFrameReadiness();
        };

        video.onresize = () => {
          console.info(`[CameraDiag] Event "resize": dimensions ${video.videoWidth}x${video.videoHeight}`);
          checkFrameReadiness();
        };

        video.onerror = () => {
          console.error('[CameraDiag] Event "error" on video element:', video.error);
          if (initIdRef.current === currentRunId) {
            setCameraError({
              type: 'video-error',
              title: 'Video Stream Playback Error',
              message: 'The browser encountered an error rendering the video stream. Please retry camera or use file upload.'
            });
            setIsLoading(false);
            setIsVideoReady(false);
            isVideoReadyRef.current = false;
            updateDiagnostics({ status: 'video-element-error', error: video.error?.message || 'Playback error' });
          }
        };

        // If metadata is already ready, initiate play immediately
        if (video.readyState >= 1) {
          attemptPlay();
          checkFrameReadiness();
        } else {
          attemptPlay();
        }

        // Active frame arrival polling
        framePollIntervalRef.current = setInterval(() => {
          if (video.paused && video.readyState >= 1) {
            attemptPlay();
          }
          checkFrameReadiness();
        }, 200);

        // Frame Watchdog Timer: If after 8 seconds no visual frames arrive, report informative error
        watchdogTimeoutRef.current = setTimeout(() => {
          if (initIdRef.current === currentRunId && !isVideoReadyRef.current) {
            const tracks = res.stream.getVideoTracks ? res.stream.getVideoTracks() : [];
            const isMuted = tracks.some((t) => t.muted);
            console.warn(`[CameraDiag] Frame watchdog timed out. Track muted status: ${isMuted}`);

            setIsLoading(false);
            setIsVideoReady(false);
            isVideoReadyRef.current = false;
            if (framePollIntervalRef.current) {
              clearInterval(framePollIntervalRef.current);
              framePollIntervalRef.current = null;
            }

            if (isMuted) {
              setCameraError({
                type: 'hardware-muted',
                title: 'Camera Video Feed Muted',
                message: 'The camera feed is muted by your hardware or operating system. Check for a physical lens privacy shutter, privacy switch, or camera permission in Windows Settings.'
              });
            } else {
              setCameraError({
                type: 'feed-timeout',
                title: 'No Video Frames Received',
                message: 'Camera stream connected, but did not deliver any visual frames within 8 seconds. The camera may be locked by another application. Please retry or choose a file.'
              });
            }
            updateDiagnostics({ status: 'frame-timeout', trackMuted: isMuted });
          }
        }, 8000);

        // Enumerate available devices for camera switcher
        listCameraDevices()
          .then((devices) => {
            if (initIdRef.current === currentRunId && Array.isArray(devices)) {
              setCameraDevices(devices);
            }
          })
          .catch(() => {});
      } else {
        setIsLoading(false);
        setIsVideoReady(false);
        isVideoReadyRef.current = false;
        setCameraError(res.error);
        updateDiagnostics({ status: 'stream-request-failed', error: res.error });
      }
    } catch (err) {
      console.error('[CameraDiag] Unexpected error in initCamera:', err);
      if (initIdRef.current === currentRunId) {
        setIsLoading(false);
        setIsVideoReady(false);
        setCameraError({
          type: 'unexpected-error',
          title: 'Camera Access Error',
          message: err.message || 'The camera encountered an unexpected initialization error. Please retry or choose a file instead.'
        });
        updateDiagnostics({ status: 'unexpected-error', error: err.message });
      }
    }
  }

  initCamera();

    return () => {
      initIdRef.current += 1;
      isVideoReadyRef.current = false;
      if (framePollIntervalRef.current) {
        clearInterval(framePollIntervalRef.current);
        framePollIntervalRef.current = null;
      }
      if (watchdogTimeoutRef.current) {
        clearTimeout(watchdogTimeoutRef.current);
        watchdogTimeoutRef.current = null;
      }
      if (activeStreamRef.current) {
        stopCameraStream(activeStreamRef.current);
        activeStreamRef.current = null;
      }
      if (videoNode) {
        videoNode.srcObject = null;
      }
    };
  }, [isOpen, facingMode, selectedDeviceId, retryCounter, updateDiagnostics]);

  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    // Ensure the video is genuinely decoding frames before capturing
    if (video.readyState < 2 || video.videoWidth === 0) {
      setCameraError({
        type: 'not-ready',
        title: 'Camera Initializing',
        message: 'The camera is preparing its live feed. Please wait a second and try capturing again.'
      });
      return;
    }

    try {
      const captured = captureVideoFrame(video, { quality: 0.92 });
      setCapturedPhoto(captured);
      console.info('[CameraDiag] Frame captured successfully:', `${captured.width}x${captured.height}`);
    } catch (err) {
      console.error('[CameraDiag] Snapshot capture failed:', err);
      setCameraError({
        type: 'capture-error',
        title: 'Capture Failed',
        message: 'Could not capture frame from camera stream. Please try again or use file upload.'
      });
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setCameraError(null);
    if (videoRef.current && activeStreamRef.current) {
      const video = videoRef.current;
      video.srcObject = activeStreamRef.current;
      video.play().catch(() => {});
    }
  };

  const handleConfirm = () => {
    if (!capturedPhoto) return;
    if (onCaptureConfirm) {
      onCaptureConfirm(capturedPhoto);
    }
    handleClose();
  };

  const handleClose = () => {
    initIdRef.current += 1;
    if (framePollIntervalRef.current) {
      clearInterval(framePollIntervalRef.current);
      framePollIntervalRef.current = null;
    }
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
      watchdogTimeoutRef.current = null;
    }
    if (activeStreamRef.current) {
      stopCameraStream(activeStreamRef.current);
      activeStreamRef.current = null;
    }
    if (stream) {
      stopCameraStream(stream);
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturedPhoto(null);
    setCameraError(null);
    setIsLoading(false);
    setIsVideoReady(false);
    onClose();
  };

  const handleToggleFacingMode = () => {
    setCapturedPhoto(null);
    setIsVideoReady(false);
    if (activeStreamRef.current) {
      stopCameraStream(activeStreamRef.current);
      activeStreamRef.current = null;
    }
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setSelectedDeviceId(null);
  };

  const handleRetry = () => {
    console.info('[CameraDiag] User triggered camera retry.');
    setCameraError(null);
    setIsVideoReady(false);
    setIsLoading(true);
    setRetryCounter((prev) => prev + 1);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Error Notification State (Permission Denied, Unavailable, In-Use, Timeout) */}
        {cameraError && !capturedPhoto && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-amber-900">{cameraError.title}</h4>
                <p className="leading-relaxed text-amber-800">{cameraError.message}</p>
              </div>
            </div>

            {/* Diagnostic Details Accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowDiagDetails((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-900 hover:text-amber-950 underline cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{showDiagDetails ? 'Hide Diagnostics' : 'Inspect Diagnostic Report'}</span>
                {showDiagDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDiagDetails && diagInfo && (
                <div className="mt-2 p-2.5 rounded-lg bg-stone-900 text-stone-200 font-mono text-[11px] space-y-1 overflow-x-auto max-h-48">
                  <div><strong>Secure Context:</strong> {diagInfo.secureContext ? 'YES (Secure)' : 'NO (Insecure Context)'}</div>
                  <div><strong>Protocol / Host:</strong> {diagInfo.protocol} // {diagInfo.hostname}</div>
                  <div><strong>MediaDevices Available:</strong> {diagInfo.hasMediaDevices ? 'YES' : 'NO'}</div>
                  <div><strong>getUserMedia Available:</strong> {diagInfo.hasGetUserMedia ? 'YES' : 'NO'}</div>
                  <div><strong>Stream Acquired:</strong> {diagInfo.streamExists ? `YES (id: ${diagInfo.streamId})` : 'NO'}</div>
                  <div><strong>Track Count:</strong> {diagInfo.trackCount}</div>
                  {diagInfo.tracks?.map((t, idx) => (
                    <div key={t.id || idx} className="pl-2 text-stone-400">
                      • Track #{idx + 1}: {t.label} (readyState: {t.readyState}, enabled: {String(t.enabled)}, muted: {String(t.muted)})
                    </div>
                  ))}
                  <div><strong>Video Element Attached:</strong> {diagInfo.videoMounted ? 'YES' : 'NO'}</div>
                  <div><strong>Video Dimensions:</strong> {diagInfo.videoDimensions}</div>
                  <div><strong>Video ReadyState:</strong> {diagInfo.videoReadyState}</div>
                  <div><strong>Video Paused:</strong> {String(diagInfo.videoPaused)}</div>
                  <div className="pt-1 text-stone-400 text-[10px]">
                    Tip: Open DevTools Console and type <code className="text-amber-400 font-bold">window.__loomCameraDiagnosticState</code> for full details.
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200">
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={handleRetry}
              >
                Retry Camera
              </Button>

              {onFallbackToFileUpload && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={UploadCloud}
                  onClick={() => {
                    handleClose();
                    onFallbackToFileUpload();
                  }}
                >
                  Choose File Instead
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Live Viewfinder or Snapshot Preview Container */}
        <div className="relative overflow-hidden rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center min-h-[300px] sm:min-h-[380px] w-full">
          {isLoading && !capturedPhoto && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stone-950/90 text-white space-y-3 p-4 text-center">
              <RefreshCw className="w-8 h-8 text-crimson-500 animate-spin" />
              <div className="space-y-1">
                <span className="text-xs font-mono font-medium block">Connecting to camera sensor...</span>
                <span className="text-[11px] text-stone-400 block">Waiting for video stream and live frame decoding</span>
              </div>
            </div>
          )}

          {cameraError && !capturedPhoto && !isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-950 text-stone-400 space-y-2.5 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-500 shadow-inner">
                <Camera className="w-6 h-6 stroke-[1.5]" />
              </div>
              <span className="text-xs font-mono text-stone-300 font-medium">Camera Feed Offline</span>
              <p className="text-[11px] text-stone-500 max-w-xs leading-relaxed">
                {cameraError.title}. Check permissions or review diagnostic report above, or choose a file instead.
              </p>
            </div>
          )}

          {capturedPhoto ? (
            /* Freeze-frame Preview View */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-2 min-h-[300px] sm:min-h-[380px]">
              <img
                src={capturedPhoto.dataUrl}
                alt="Captured Snapshot"
                className="max-h-[340px] sm:max-h-[420px] w-auto object-contain rounded-lg"
              />
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-1 rounded-md border border-white/20">
                {capturedPhoto.width} × {capturedPhoto.height} px • {capturedPhoto.formattedSize}
              </div>
            </div>
          ) : (
            /* Active Live Video Stream View */
            <div className="relative w-full h-full min-h-[300px] sm:min-h-[380px] flex items-center justify-center bg-stone-950">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full min-h-[280px] sm:min-h-[360px] max-h-[440px] object-contain block rounded-lg transition-opacity duration-300 ${
                  isVideoReady ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Viewfinder Alignment Framing Guide Overlay */}
              {isVideoReady && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6 sm:p-8 animate-in fade-in duration-200">
                  {/* Framing Box */}
                  <div className="w-full max-w-md h-48 sm:h-64 my-auto border-2 border-dashed border-white/70 rounded-2xl relative shadow-2xs">
                    {/* Corner Target Accents */}
                    <div className="absolute -top-2 -left-2 w-5 h-5 border-t-4 border-l-4 border-crimson-500 rounded-tl-sm"></div>
                    <div className="absolute -top-2 -right-2 w-5 h-5 border-t-4 border-r-4 border-crimson-500 rounded-tr-sm"></div>
                    <div className="absolute -bottom-2 -left-2 w-5 h-5 border-b-4 border-l-4 border-crimson-500 rounded-bl-sm"></div>
                    <div className="absolute -bottom-2 -right-2 w-5 h-5 border-b-4 border-r-4 border-crimson-500 rounded-br-sm"></div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-black/50 backdrop-blur-xs text-white/90 text-[10px] font-mono px-2.5 py-1 rounded-full border border-white/20">
                        {targetType === 'pattern' ? 'Align Pattern Outline' : 'Align Fabric Swatch'}
                      </span>
                    </div>
                  </div>

                  {/* Flip camera toggle if multiple cameras or mobile */}
                  {cameraDevices.length > 1 && (
                    <button
                      type="button"
                      onClick={handleToggleFacingMode}
                      className="absolute top-4 right-4 pointer-events-auto bg-black/60 hover:bg-black/80 text-white p-2 rounded-full border border-white/20 shadow-md cursor-pointer transition-colors"
                      title={`Switch Camera (Currently ${facingMode === 'environment' ? 'Rear' : 'Front'})`}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Guidance Tip / Policy Advisory */}
        <div className="p-3 rounded-lg bg-cream-100 border border-cream-300 text-xs text-stone-700 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-crimson-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {targetType === 'pattern' ? (
              <span>
                <strong>Pattern Capture Tip:</strong> Place garment pattern flat under bright, even lighting on a solid contrasting background. Keep the full outer border visible. Dimensions will be marked uncalibrated until reference scale is set.
              </span>
            ) : (
              <span>
                <strong>Fabric Visual Inspection:</strong> Photography provides visual weave and surface print reference. <em>A photograph does not calculate roll width, length, or elasticity; physical specifications are configured manually above.</em>
              </span>
            )}
            {referenceNote && <div className="mt-1 font-mono text-[11px] text-stone-600">{referenceNote}</div>}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200">
          <Button
            variant="outline"
            size="md"
            onClick={handleClose}
          >
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {capturedPhoto ? (
              <>
                <Button
                  variant="outline"
                  size="md"
                  icon={RotateCcw}
                  onClick={handleRetake}
                >
                  Retake Photo
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={CheckCircle2}
                  onClick={handleConfirm}
                  className="shadow-sm font-semibold"
                >
                  Confirm & Use Image
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                size="md"
                icon={Camera}
                disabled={isLoading || Boolean(cameraError) || !stream || !isVideoReady}
                onClick={handleCaptureSnapshot}
                className="shadow-sm font-semibold"
              >
                Capture Photo
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

