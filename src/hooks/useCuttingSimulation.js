import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CuttingSimulator } from '../utils/cuttingSimulator';

/**
 * React Hook for Realistic Garment Cutting Simulation
 *
 * Manages simulation state using CuttingSimulator:
 * - Piece-by-piece sequential processing
 * - Contour tracing and cutting head coordinate tracking
 * - Pause / Resume / Stop / Reset controls
 * - Unmount cleanup and repeated click prevention
 * - Guaranteed immunity from infinite render loops
 */
export function useCuttingSimulation(options = {}) {
  const duration = options.duration || 5000;
  const placements = options.placements;
  const onComplete = options.onComplete;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [simState, setSimState] = useState(() => {
    const sim = new CuttingSimulator({
      duration,
      placements: placements || []
    });
    return sim.getState();
  });

  const simRef = useRef(null);
  if (!simRef.current) {
    simRef.current = new CuttingSimulator({
      duration,
      placements: placements || [],
      onStateChange: (newState) => {
        if (isMountedRef.current) {
          setSimState(newState);
        }
      },
      onComplete: () => {
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    });
  }

  // Derive stable cache key for placements to prevent re-triggering on identical [] references
  const placementsKey = useMemo(() => {
    if (!Array.isArray(placements) || placements.length === 0) return 'empty_0';
    return `${placements.length}:${placements.map((p) => p.id || `${p.x}_${p.y}`).join('|')}`;
  }, [placements]);

  const isFirstRenderRef = useRef(true);

  // Synchronize simulator instance when placements or duration genuinely change (skip first mount)
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (simRef.current) {
      simRef.current.duration = duration;
      simRef.current.setPlacements(placements || []);
      if (isMountedRef.current) {
        setSimState(simRef.current.getState());
      }
    }
  }, [placementsKey, duration]);

  // Clean up simulator on unmount
  useEffect(() => {
    return () => {
      if (simRef.current) {
        simRef.current.destroy();
      }
    };
  }, []);

  const start = useCallback(() => {
    if (simRef.current) {
      simRef.current.start();
    }
  }, []);

  const pause = useCallback(() => {
    if (simRef.current) {
      simRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (simRef.current) {
      simRef.current.resume();
    }
  }, []);

  const stop = useCallback(() => {
    if (simRef.current) {
      simRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (simRef.current) {
      simRef.current.reset();
    }
  }, []);

  const toggle = useCallback(() => {
    if (simRef.current) {
      simRef.current.toggle();
    }
  }, []);

  return {
    ...simState,
    start,
    pause,
    resume,
    stop,
    reset,
    toggle
  };
}
