import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { PatternPiece } from './PatternPiece';
import { Button } from '../common/Button';
import { useCuttingSimulation } from '../../hooks/useCuttingSimulation';
import { useProjects } from '../../context/useProjects';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Compass, 
  Play, 
  Pause, 
  RotateCcw,
  RotateCw,
  CheckCircle2, 
  AlertOctagon, 
  ShieldAlert,
  Trophy,
  AlertTriangle,
  Check,
  Save,
  Sliders
} from 'lucide-react';
import { evaluatePlacements, snapPiecePosition } from '../../utils/humanNestingEvaluator';

export function FabricCanvas({
  project,
  className = '',
  interactive = true,
  compact = false,
  isSimulatingCut: externalIsSimulatingCut,
  cutProgress: externalCutProgress,
  onToggleSimulateCut: externalOnToggleSimulateCut,
  simulationStatus: externalSimulationStatus,
  simulationState: externalSimulationState,
  onTryAnotherLayout,
  isSwitchingLayout = false
}) {
  const { addProjectDefect, removeProjectDefect, updateProject } = useProjects();
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showGrain, setShowGrain] = useState(true);
  const [showLabels] = useState(true);
  const [showDimensions] = useState(true);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [hoveredPiece, setHoveredPiece] = useState(null);
  const [isDefectMode, setIsDefectMode] = useState(false);
  const svgRef = useRef(null);

  // --- Human vs AI Drag-and-Drop Challenge State ---
  const [isHumanMode, setIsHumanMode] = useState(false);
  const [workingPlacements, setWorkingPlacements] = useState(project?.layoutPlacements || []);
  const [activeDragPieceId, setActiveDragPieceId] = useState(null);
  const [snapLine, setSnapLine] = useState(null);
  const [hasManualChanges, setHasManualChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dragRef = useRef(null);

  const fabricWidth = project?.fabricWidth || 150; // cm (Y-axis)
  const fabricLength = project?.fabricLength || 500; // cm (X-axis)
  const minSpacing = Number(project?.minSpacing) || 0.5;
  const defects = Array.isArray(project?.defects) ? project.defects : [];

  // Keep working placements synchronized with incoming layout changes unless manual edits exist
  useEffect(() => {
    if (!hasManualChanges) {
      setWorkingPlacements(project?.layoutPlacements || []);
    }
  }, [project?.layoutPlacements, project?.id, hasManualChanges]);

  // Active pieces currently rendered (working pieces if manual mode or manual edits present)
  const activePlacements = isHumanMode || hasManualChanges
    ? workingPlacements
    : (project?.layoutPlacements || []);

  // AI baseline benchmark
  const aiBaseline = useMemo(() => {
    const origPlacements = project?.layoutPlacements || [];
    const origLength = origPlacements.length > 0
      ? Math.max(...origPlacements.map((p) => p.x + p.width))
      : 0;
    return {
      markerUtilization: project?.markerUtilization || project?.utilization || 0,
      actualLengthUsedCm: Number(project?.actualLengthUsedCm) || origLength,
      placements: origPlacements
    };
  }, [project?.markerUtilization, project?.utilization, project?.actualLengthUsedCm, project?.layoutPlacements]);

  // Live real-time nesting evaluation
  const evaluation = useMemo(() => {
    return evaluatePlacements(
      activePlacements,
      fabricWidth,
      fabricLength,
      minSpacing,
      aiBaseline,
      { respectGrain: project?.respectGrain }
    );
  }, [activePlacements, fabricWidth, fabricLength, minSpacing, aiBaseline, project?.respectGrain]);

  // Active marker length consumed vs total continuous roll length
  const actualLengthUsedCm = evaluation.cutLengthCm > 0
    ? evaluation.cutLengthCm
    : (project?.actualLengthUsedCm !== undefined && project.actualLengthUsedCm > 0
      ? Number(project.actualLengthUsedCm)
      : (activePlacements.length > 0 ? Math.max(...activePlacements.map((p) => p.x + p.width)) : 0));

  const hasPartialRollCut = actualLengthUsedCm > 0 && actualLengthUsedCm < (fabricLength - 1);
  const markerYield = isHumanMode || hasManualChanges ? evaluation.markerYield : (
    project?.markerUtilization !== undefined && project.markerUtilization > 0
      ? project.markerUtilization
      : (project?.utilization !== undefined ? project.utilization : 0)
  );

  // Rotate a pattern piece 90° clockwise
  const handleRotatePiece = useCallback((pieceToRotate) => {
    if (!pieceToRotate) return;
    setWorkingPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== pieceToRotate.id) return p;
        const currentRot = Number(p.rotation) || 0;
        const nextRot = (currentRot + 90) % 360;

        const wasRotated90 = currentRot === 90 || currentRot === 270;
        const willBeRotated90 = nextRot === 90 || nextRot === 270;
        let newWidth = p.width;
        let newHeight = p.height;
        if (wasRotated90 !== willBeRotated90) {
          newWidth = p.height;
          newHeight = p.width;
        }

        const clampedX = Math.max(0, Math.min(fabricLength - newWidth, p.x));
        const clampedY = Math.max(0, Math.min(fabricWidth - newHeight, p.y));

        const updated = {
          ...p,
          rotation: nextRot,
          width: newWidth,
          height: newHeight,
          x: clampedX,
          y: clampedY
        };
        setSelectedPiece(updated);
        return updated;
      })
    );
    setHasManualChanges(true);
    setIsHumanMode(true);
  }, [fabricLength, fabricWidth]);

  // Keyboard shortcut listener ('R' rotates selected piece, 'Esc' clears selection)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'r' || e.key === 'R') && selectedPiece) {
        e.preventDefault();
        handleRotatePiece(selectedPiece);
      } else if (e.key === 'Escape') {
        setSelectedPiece(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPiece, handleRotatePiece]);

  // Pointer drag interactions
  const handlePiecePointerDown = (e, placement) => {
    if (!interactive || isDefectMode) return;
    if (sim.isCutting) return;

    e.stopPropagation();
    setSelectedPiece(placement);

    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const pointerX = (e.clientX - rect.left) / currentScale;
    const pointerY = (e.clientY - rect.top) / currentScale;

    dragRef.current = {
      pieceId: placement.id,
      startPointerX: pointerX,
      startPointerY: pointerY,
      startPieceX: placement.x,
      startPieceY: placement.y,
      hasMoved: false
    };
    setActiveDragPieceId(placement.id);
  };

  const handleSvgPointerMove = (e) => {
    if (!dragRef.current) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const currentPointerX = (e.clientX - rect.left) / currentScale;
    const currentPointerY = (e.clientY - rect.top) / currentScale;

    const deltaX = currentPointerX - dragRef.current.startPointerX;
    const deltaY = currentPointerY - dragRef.current.startPointerY;

    if (!dragRef.current.hasMoved && Math.hypot(deltaX, deltaY) > 0.3) {
      dragRef.current.hasMoved = true;
      setIsHumanMode(true);
      setHasManualChanges(true);
    }

    if (!dragRef.current.hasMoved) return;

    const candidateX = dragRef.current.startPieceX + deltaX;
    const candidateY = dragRef.current.startPieceY + deltaY;

    const activePiece = workingPlacements.find((p) => p.id === dragRef.current.pieceId);
    if (!activePiece) return;

    const snapResult = snapPiecePosition(
      candidateX,
      candidateY,
      activePiece,
      workingPlacements,
      fabricWidth,
      fabricLength,
      minSpacing,
      0.8
    );

    if (snapResult.snapped) {
      if (snapResult.snapAxis?.startsWith('x')) {
        setSnapLine({ x1: snapResult.x, y1: 0, x2: snapResult.x, y2: fabricWidth });
      } else if (snapResult.snapAxis?.startsWith('y')) {
        setSnapLine({ x1: 0, y1: snapResult.y, x2: fabricLength, y2: snapResult.y });
      }
    } else {
      setSnapLine(null);
    }

    setWorkingPlacements((prev) =>
      prev.map((p) => (p.id === activePiece.id ? { ...p, x: snapResult.x, y: snapResult.y } : p))
    );
  };

  const handleSvgPointerUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      setActiveDragPieceId(null);
      setSnapLine(null);
    }
  };

  const handleResetToAi = () => {
    setWorkingPlacements(project?.layoutPlacements || []);
    setHasManualChanges(false);
    setIsHumanMode(false);
    setSelectedPiece(null);
    setSnapLine(null);
  };

  const handleApplyManualLayout = () => {
    if (!evaluation.isValid || !project?.id || typeof updateProject !== 'function') return;
    updateProject(project.id, {
      layoutPlacements: workingPlacements,
      markerUtilization: evaluation.markerYield,
      actualLengthUsedCm: evaluation.cutLengthCm,
      utilization: evaluation.fullRollUtilization,
      placedCount: workingPlacements.length
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Internal fallback simulation if not provided externally
  const internalSim = useCuttingSimulation({
    duration: 5000,
    placements: activePlacements
  });

  const sim = externalSimulationState || {
    status: externalSimulationStatus !== undefined ? externalSimulationStatus : internalSim.status,
    progress: externalCutProgress !== undefined ? externalCutProgress : internalSim.progress,
    progressPercent: Math.round((externalCutProgress !== undefined ? externalCutProgress : internalSim.progress) * 100),
    isCutting: externalIsSimulatingCut !== undefined ? externalIsSimulatingCut : internalSim.isCutting,
    isPaused: externalSimulationStatus === 'paused' || internalSim.isPaused,
    isCompleted: externalSimulationStatus === 'completed' || internalSim.isCompleted,
    isReady: externalSimulationStatus === 'ready' || internalSim.isReady,
    completedPieceIds: internalSim.completedPieceIds || [],
    activePieceId: internalSim.activePieceId || null,
    currentPieceProgress: internalSim.currentPieceProgress || 0,
    currentPieceIndex: internalSim.currentPieceIndex !== undefined ? internalSim.currentPieceIndex : -1,
    totalPieces: internalSim.totalPieces || activePlacements.length,
    currentPiece: internalSim.currentPiece || null,
    toggle: externalOnToggleSimulateCut || internalSim.toggle,
    stop: internalSim.stop
  };

  const canvasContainerRef = useRef(null);

  // Canvas scaling factor: map real cm to SVG coordinate units
  const baseScale = compact ? 1.6 : 2.4;
  const currentScale = baseScale * zoom;

  const svgWidth = fabricLength * currentScale;
  const svgHeight = fabricWidth * currentScale;

  const handleToggleSimulateCut = () => {
    if (externalOnToggleSimulateCut) {
      externalOnToggleSimulateCut();
    } else {
      internalSim.toggle();
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleSvgClick = (e) => {
    if (!isDefectMode || !project?.id) return;
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / currentScale;
    const clickY = (e.clientY - rect.top) / currentScale;
    const clampedX = Math.max(3, Math.min(fabricLength - 3, Math.round(clickX)));
    const clampedY = Math.max(3, Math.min(fabricWidth - 3, Math.round(clickY)));

    if (addProjectDefect) {
      addProjectDefect(project.id, {
        x: clampedX,
        y: clampedY,
        radius: 4.5,
        clearance: 0.5,
        type: 'Fabric Flaw'
      });
    }
  };

  // Ruler tick intervals in cm
  const rulerMajorInterval = 50; // 50cm
  const rulerMinorInterval = 10; // 10cm

  const xTicks = [];
  for (let x = 0; x <= fabricLength; x += rulerMinorInterval) {
    xTicks.push(x);
  }

  const yTicks = [];
  for (let y = 0; y <= fabricWidth; y += rulerMinorInterval) {
    yTicks.push(y);
  }

  const activeInspection = hoveredPiece || selectedPiece;

  return (
    <div className={`flex flex-col bg-cream-25 rounded-2xl border border-cream-300 shadow-sm overflow-hidden ${className}`}>
      {/* Top Canvas Toolbar */}
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-cream-100/90 border-b border-cream-200 text-xs text-stone-600">
          {/* Left: Fabric Specs & Utilization Tag */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono font-semibold text-stone-900 bg-white px-3 py-1.5 rounded-lg border border-cream-300 shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-crimson-700" />
              <span>{fabricLength}cm (L) × {fabricWidth}cm (W)</span>
              {hasPartialRollCut && (
                <>
                  <span className="text-stone-400">|</span>
                  <span className="text-stone-700 font-medium" title={`Minimum linear roll cut required: ${actualLengthUsedCm.toFixed(1)} cm`}>
                    Cut Req: <strong className="text-stone-900">{actualLengthUsedCm.toFixed(1)}cm</strong>
                  </span>
                </>
              )}
              <span className="text-stone-400">|</span>
              <span
                className="text-crimson-800 font-bold"
                title={hasPartialRollCut ? `Active marker cut yield: ${markerYield}% • Full roll stock capacity: ${project?.utilization}%` : undefined}
              >
                {hasPartialRollCut ? `${markerYield}% Marker (${project?.utilization !== undefined ? project.utilization : 0}% Roll)` : `${project?.utilization !== undefined ? project.utilization : 0}% Yield`}
              </span>
              <span className="text-stone-400">|</span>
              <span className="text-stone-700 font-normal">
                {project?.placedCount !== undefined ? project.placedCount : placements.length}
                {project?.totalPieces && project.totalPieces > (project.placedCount || placements.length)
                  ? ` / ${project.totalPieces} placed`
                  : ' placed'}
              </span>
            </div>

            {project?.unplacedCount > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200" title={`${project.unplacedCount} pattern pieces could not fit on fabric roll`}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {project.unplacedCount} unplaced
              </span>
            )}

            <div className="hidden lg:flex items-center gap-1.5 text-stone-600 font-medium font-mono text-[11px]">
              <span>Grain: <strong className="text-stone-900">{project?.grainDirection || 'Vertical'}</strong></span>
              <span>•</span>
              <span>Type: <strong className="text-stone-900">{project?.fabricType || 'Cotton'}</strong></span>
            </div>
          </div>

          {/* Right: View Controls & Animation Toggle */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Try Another Layout Button */}
            {onTryAnotherLayout && (
              <Button
                variant="outline"
                size="sm"
                icon={RotateCcw}
                onClick={onTryAnotherLayout}
                loading={isSwitchingLayout}
                disabled={isSwitchingLayout}
                id="try-another-layout-btn"
                title="Cycle through distinct valid candidate layouts"
                className="font-mono text-xs rounded-lg"
              >
                Try Another Layout
              </Button>
            )}

            {/* Interactive Manual Adjustment Mode Toggle */}
            {interactive && (
              <button
                type="button"
                onClick={() => {
                  setIsHumanMode((prev) => !prev);
                  if (!isHumanMode) {
                    setHasManualChanges(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isHumanMode
                    ? 'bg-[#143823] text-white shadow-xs font-semibold ring-2 ring-[#143823]/20'
                    : 'bg-white border border-[#DDD5C7] text-stone-700 hover:bg-[#FAF8F5]'
                }`}
                title="Toggle interactive manual arrangement — drag, rotate, and fine-tune pattern layout"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{isHumanMode ? 'Manual Adjust: Active' : 'Manual Adjust'}</span>
              </button>
            )}

            {/* Simulation Play/Pause/Resume button */}
            <button
              onClick={handleToggleSimulateCut}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer text-xs ${
                sim.isCutting
                  ? 'bg-[#143823] text-white shadow-xs ring-2 ring-[#143823]/20'
                  : sim.isPaused
                  ? 'bg-[#A87C39] text-white shadow-xs'
                  : sim.isCompleted
                  ? 'bg-[#E5EFE6] border border-[#CDE0D0] text-[#143823] hover:bg-[#D5E5D7]'
                  : 'bg-white border border-[#DDD5C7] text-stone-700 hover:bg-[#FAF8F5]'
              }`}
              title={
                sim.isCutting
                  ? "Pause Cutting Simulation"
                  : sim.isPaused
                  ? "Resume Cutting Simulation"
                  : sim.isCompleted
                  ? "Re-simulate Cutting Process"
                  : "Simulate Visual Cutting Process"
              }
            >
              {sim.isCutting ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>
                    Cutting {sim.currentPieceIndex >= 0 ? `${sim.currentPieceIndex + 1}/${sim.totalPieces || placements.length}` : ''} ({sim.progressPercent}%)
                  </span>
                </>
              ) : sim.isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume ({sim.progressPercent}%)</span>
                </>
              ) : sim.isCompleted ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-Simulate</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Simulate Cut</span>
                </>
              )}
            </button>

            {/* Defect / Flaw Pinning Tool */}
            <button
              onClick={() => setIsDefectMode(!isDefectMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isDefectMode
                  ? 'bg-[#9E533F] text-white shadow-xs ring-2 ring-[#9E533F]/20'
                  : defects.length > 0
                  ? 'bg-[#FDF4F2] text-[#9E533F] border border-[#F3D5CF] hover:bg-[#FAEAE7]'
                  : 'bg-white border border-[#DDD5C7] text-stone-700 hover:bg-[#FAF8F5]'
              }`}
              title={isDefectMode ? 'Click anywhere on fabric canvas to drop a flaw pin' : 'Activate flaw pin tool to mark defective fabric zones'}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{isDefectMode ? 'Click Canvas to Pin' : defects.length > 0 ? `${defects.length} Flaw${defects.length > 1 ? 's' : ''}` : 'Pin Flaw'}</span>
            </button>

            {/* Grid toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showGrid ? 'bg-stone-200 border-stone-300 text-stone-900' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'
              }`}
              title="Toggle 10cm Grid"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Grain toggle */}
            <button
              onClick={() => setShowGrain(!showGrain)}
              className={`p-1.5 rounded-lg border transition-colors ${
                showGrain ? 'bg-stone-200 border-stone-300 text-stone-900' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-100'
              }`}
              title="Toggle Grain Lines"
            >
              <Compass className="w-4 h-4" />
            </button>

            {/* Zoom Controls */}
            <div className="flex items-center bg-white rounded-lg border border-stone-200 p-0.5 shadow-2xs">
              <button
                onClick={handleZoomOut}
                className="p-1 rounded text-stone-600 hover:bg-stone-100 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px] text-stone-600 select-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded text-stone-600 hover:bg-stone-100 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors ml-0.5 border-l border-stone-200"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Manual Arrangement Workbench (Warm Atelier Redesign) */}
      {isHumanMode && (
        <div className="mx-4 sm:mx-6 mt-3 p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] text-stone-900 shadow-xs space-y-3.5 animate-in fade-in slide-in-from-top-2">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E2D6]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#E5EFE6] text-[#143823] border border-[#CDE0D0] shadow-2xs">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-sm text-[#143823]">
                    Interactive Marker Adjustment
                  </h4>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-semibold bg-[#E5EFE6] text-[#143823] border border-[#CDE0D0]">
                    Live Placement Mode
                  </span>
                </div>
                <p className="text-xs text-[#5C665F]">
                  Drag pieces directly to pack closely. Press <strong className="text-stone-800">R</strong> or click ↻ to rotate. Smart edge-snap aligns borders automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToAi}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-[#F5F2EB] text-stone-700 border border-[#DDD5C7] transition-colors cursor-pointer shadow-2xs"
                title="Discard manual changes and restore AI optimal nesting"
              >
                <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                <span>Reset to Optimal</span>
              </button>

              {selectedPiece && (
                <button
                  type="button"
                  onClick={() => handleRotatePiece(selectedPiece)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#E5EFE6] hover:bg-[#D5E5D7] text-[#143823] border border-[#CDE0D0] transition-colors cursor-pointer shadow-2xs"
                  title="Rotate selected piece 90° clockwise (Shortcut: R)"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate (R)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleApplyManualLayout}
                disabled={!evaluation.isValid}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  saveSuccess
                    ? 'bg-[#143823] text-white shadow-xs'
                    : evaluation.isValid
                    ? 'bg-[#143823] hover:bg-[#1A452B] text-white cursor-pointer shadow-xs'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed border border-stone-300'
                }`}
                title={evaluation.isValid ? 'Save manual arrangement to project' : 'Resolve overlapping collisions before saving'}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#A8E6CF]" />
                    <span>Saved to Project</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Layout</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metric Comparison Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            {/* AI Benchmark */}
            <div className="p-3 rounded-xl bg-white border border-[#E8E2D6] space-y-1 shadow-2xs">
              <div className="text-[10px] text-stone-500 font-medium flex items-center justify-between">
                <span>AI Benchmark Layout</span>
                <span className="text-[#2D5A3D] font-semibold bg-[#E5EFE6] px-1.5 py-0.2 rounded text-[9px]">100% Clean</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-serif font-bold text-[#143823]">
                  {evaluation.comparison?.aiYield || markerYield}%
                </span>
                <span className="text-stone-500 text-[11px]">yield</span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono">
                Cut: <strong className="text-stone-800">{evaluation.comparison?.aiLengthCm || actualLengthUsedCm.toFixed(1)} cm</strong>
              </div>
            </div>

            {/* Current Manual Layout */}
            <div className={`p-3 rounded-xl border space-y-1 shadow-2xs ${
              !evaluation.isValid
                ? 'bg-[#FDF4F2] border-[#F3D5CF]'
                : evaluation.comparison?.humanWins
                ? 'bg-[#F0F7F2] border-[#CDE0D0]'
                : 'bg-white border-[#E8E2D6]'
            }`}>
              <div className="text-[10px] font-medium flex items-center justify-between">
                <span className="text-stone-700">Current Arrangement</span>
                {!evaluation.isValid ? (
                  <span className="text-[#9E533F] font-semibold bg-[#FAEAE7] px-1.5 py-0.2 rounded text-[9px]">⚠️ Overlap</span>
                ) : (
                  <span className="text-[#2D5A3D] font-semibold bg-[#E5EFE6] px-1.5 py-0.2 rounded text-[9px]">✓ 0 Collisions</span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-lg font-serif font-bold ${
                  !evaluation.isValid
                    ? 'text-[#9E533F]'
                    : evaluation.comparison?.humanWins
                    ? 'text-[#2D5A3D]'
                    : 'text-[#143823]'
                }`}>
                  {evaluation.markerYield}%
                </span>
                <span className="text-stone-500 text-[11px]">yield</span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono">
                Cut: <strong className="text-stone-800">{evaluation.cutLengthCm} cm</strong>
              </div>
            </div>

            {/* Yield Variance */}
            <div className="p-3 rounded-xl bg-white border border-[#E8E2D6] space-y-1 shadow-2xs">
              <div className="text-[10px] text-stone-500 font-medium">
                Yield Variance
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-lg font-serif font-bold ${
                  evaluation.comparison?.yieldDelta > 0
                    ? 'text-[#2D5A3D]'
                    : evaluation.comparison?.yieldDelta < 0
                    ? 'text-[#9E533F]'
                    : 'text-stone-700'
                }`}>
                  {evaluation.comparison?.yieldDelta > 0 ? `+${evaluation.comparison.yieldDelta}` : evaluation.comparison?.yieldDelta} pp
                </span>
                <span className="text-stone-500 text-[11px]">vs AI</span>
              </div>
              <div className="text-[11px] text-stone-500 font-mono">
                Bolt delta: <strong className={evaluation.comparison?.lengthDelta > 0 ? 'text-[#9E533F]' : 'text-[#2D5A3D]'}>
                  {evaluation.comparison?.lengthDelta > 0 ? `+${evaluation.comparison.lengthDelta} cm` : `${evaluation.comparison?.lengthDelta} cm`}
                </strong>
              </div>
            </div>

            {/* Clearance & Buffer Status */}
            <div className={`p-3 rounded-xl border space-y-1 shadow-2xs ${
              evaluation.overlaps.length > 0
                ? 'bg-[#FDF4F2] border-[#F3D5CF]'
                : 'bg-white border-[#E8E2D6]'
            }`}>
              <div className="text-[10px] text-stone-500 font-medium">Clearance & Safety Buffer</div>
              <div className="text-sm font-semibold">
                {evaluation.overlaps.length > 0 ? (
                  <span className="text-[#9E533F] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {evaluation.overlaps.length} Collisions
                  </span>
                ) : (
                  <span className="text-[#2D5A3D] flex items-center gap-1 font-serif text-base font-bold">
                    <CheckCircle2 className="w-4 h-4 text-[#2D5A3D]" /> 100% Cleared
                  </span>
                )}
              </div>
              <div className="text-[10px] text-stone-500 truncate">
                {evaluation.comparison?.verdictText || 'Drag pieces to fine-tune'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Fabric Visual Area */}
      <div
        ref={canvasContainerRef}
        className="relative flex-1 overflow-auto bg-stone-900/5 p-4 sm:p-6 min-h-[380px] max-h-[620px] select-none"
      >
        {/* Fabric Roll Sheet Container */}
        <div className="relative mx-auto inline-block bg-white rounded-lg shadow-md border-2 border-stone-300 overflow-hidden transition-all duration-200">
          
          {/* Top X-Axis Ruler */}
          <div
            className="h-6 bg-stone-100 border-b border-stone-300 relative flex items-end text-[9px] font-mono text-stone-500 select-none"
            style={{ width: `${svgWidth}px` }}
          >
            {xTicks.map((x) => {
              const isMajor = x % rulerMajorInterval === 0;
              const posX = x * currentScale;
              const cutPosX = actualLengthUsedCm * currentScale;
              // Suppress any tick mark label within 32px of the cut marker to eliminate visual collisions
              const isNearCutLine = hasPartialRollCut && Math.abs(posX - cutPosX) < 32;

              return (
                <div
                  key={`x-${x}`}
                  className="absolute bottom-0 flex flex-col items-center"
                  style={{ left: `${posX}px` }}
                >
                  {isMajor && !isNearCutLine && (
                    <span className="mb-0.5 transform -translate-x-1/2 text-stone-500 font-mono text-[9px]">{x}cm</span>
                  )}
                  <div
                    className={`w-[1px] bg-stone-300 ${isMajor ? 'h-2.5 bg-stone-500' : 'h-1.5'}`}
                  />
                </div>
              );
            })}

            {/* Active Marker Cut Indicator on Ruler */}
            {hasPartialRollCut && (
              <div
                className="absolute bottom-0 flex flex-col items-center z-10"
                style={{ left: `${actualLengthUsedCm * currentScale}px` }}
                title={`Marker cut line: ${actualLengthUsedCm.toFixed(1)} cm`}
              >
                <span className="mb-0.5 transform -translate-x-1/2 text-white font-semibold text-[9px] bg-[#143823] px-1.5 py-0.5 rounded shadow-2xs whitespace-nowrap">
                  ✂ {actualLengthUsedCm.toFixed(0)}cm
                </span>
                <div className="w-[2px] h-3 bg-[#143823]" />
              </div>
            )}
          </div>

          <div className="flex">
            {/* Left Y-Axis Ruler */}
            <div
              className="w-8 bg-stone-100 border-r border-stone-300 relative flex flex-col justify-start text-[9px] font-mono text-stone-500 select-none shrink-0"
              style={{ height: `${svgHeight}px` }}
            >
              {yTicks.map((y) => {
                const isMajor = y % rulerMajorInterval === 0;
                const posY = y * currentScale;
                return (
                  <div
                    key={`y-${y}`}
                    className="absolute right-0 flex items-center justify-end pr-1"
                    style={{ top: `${posY}px` }}
                  >
                    {isMajor && <span className="mr-1 transform -translate-y-1/2">{y}</span>}
                    <div
                      className={`h-[1px] bg-stone-400 ${isMajor ? 'w-2.5 bg-stone-700' : 'w-1.5'}`}
                    />
                  </div>
                );
              })}
            </div>

            {/* SVG Fabric Surface */}
            <div className="relative">
              <svg
                ref={svgRef}
                onClick={handleSvgClick}
                onPointerMove={handleSvgPointerMove}
                onPointerUp={handleSvgPointerUp}
                onPointerLeave={handleSvgPointerUp}
                width={svgWidth}
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className={`fabric-weave-pattern block transition-all ${
                  isDefectMode
                    ? 'cursor-crosshair ring-2 ring-rose-400'
                    : isHumanMode
                    ? 'cursor-default'
                    : ''
                }`}
              >
                <defs>
                  {/* Defect Warning Stripe Pattern */}
                  <pattern
                    id="defect-stripe-pattern"
                    width="6"
                    height="6"
                    patternTransform="rotate(45 0 0)"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="6" height="6" fill="#fef2f2" />
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#dc2626" strokeWidth="2.5" />
                  </pattern>

                  {/* 10cm Grid Pattern */}
                  <pattern
                    id="canvas-grid"
                    width={10 * currentScale}
                    height={10 * currentScale}
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d={`M ${10 * currentScale} 0 L 0 0 0 ${10 * currentScale}`}
                      fill="none"
                      stroke="rgba(203, 213, 225, 0.45)"
                      strokeWidth="1"
                    />
                  </pattern>

                  {/* Laser Beam Glow Filter */}
                  <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Fabric Bed Background */}
                <rect width={svgWidth} height={svgHeight} fill="#fcfbf9" />

                {/* Grid Overlay */}
                {showGrid && (
                  <rect width={svgWidth} height={svgHeight} fill="url(#canvas-grid)" />
                )}

                {/* Fabric Weave Grain Indicator Lines */}
                {showGrain && (
                  <g opacity={0.15}>
                    {xTicks.filter((x) => x % 20 === 0).map((x) => (
                      <line
                        key={`grain-${x}`}
                        x1={x * currentScale}
                        y1={0}
                        x2={x * currentScale}
                        y2={svgHeight}
                        stroke="#0f172a"
                        strokeWidth="1"
                        strokeDasharray="4,8"
                      />
                    ))}
                  </g>
                )}

                {/* Fabric Selvedge / Usable Boundary lines */}
                <rect
                  x={2 * currentScale}
                  y={2 * currentScale}
                  width={(fabricLength - 4) * currentScale}
                  height={(fabricWidth - 4) * currentScale}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                />

                {/* Active Marker Cut-Off Line & Preserved Uncut Roll Stock Shading */}
                {hasPartialRollCut && (
                  <g className="active-marker-cutoff-layer">
                    {/* Uncut Continuous Roll Stock Shading */}
                    <rect
                      x={actualLengthUsedCm * currentScale}
                      y={0}
                      width={Math.max(0, svgWidth - (actualLengthUsedCm * currentScale))}
                      height={svgHeight}
                      fill="#f8fafc"
                      fillOpacity={0.65}
                    />
                    {/* Cut-off vertical dividing line */}
                    <line
                      x1={actualLengthUsedCm * currentScale}
                      y1={0}
                      x2={actualLengthUsedCm * currentScale}
                      y2={svgHeight}
                      stroke="#143823"
                      strokeWidth="1.5"
                      strokeDasharray="6,4"
                    />
                  </g>
                )}

                {/* Snap Alignment Guideline */}
                {snapLine && (
                  <line
                    x1={snapLine.x1 * currentScale}
                    y1={snapLine.y1 * currentScale}
                    x2={snapLine.x2 * currentScale}
                    y2={snapLine.y2 * currentScale}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="4,4"
                  />
                )}

                {/* Nested Pattern Pieces */}
                <g className="patterns-layer">
                  {activePlacements.map((placement) => {
                    const isSelected = selectedPiece?.id === placement.id;
                    const isHovered = hoveredPiece?.id === placement.id;
                    const isColliding = evaluation.collidingPieceIds?.has(placement.id);
                    const isDragging = activeDragPieceId === placement.id;

                    // Determine simulation status for this specific piece
                    let pieceSimStatus = 'ready';
                    let activePieceProgress = 0;

                    if (sim.isCompleted) {
                      pieceSimStatus = 'completed';
                    } else if (sim.isCutting || sim.isPaused) {
                      if (sim.completedPieceIds && sim.completedPieceIds.includes(placement.id)) {
                        pieceSimStatus = 'completed';
                      } else if (sim.activePieceId === placement.id) {
                        pieceSimStatus = 'active';
                        activePieceProgress = sim.currentPieceProgress || 0;
                      } else {
                        pieceSimStatus = 'pending';
                      }
                    }

                    return (
                      <PatternPiece
                        key={placement.id}
                        placement={placement}
                        scale={currentScale}
                        isSelected={isSelected}
                        isHovered={isHovered}
                        isColliding={isColliding}
                        isDragging={isDragging}
                        isInteractiveMode={isHumanMode}
                        showGrainLine={showGrain}
                        showLabels={showLabels}
                        showDimensions={showDimensions}
                        simulationStatus={pieceSimStatus}
                        activePieceProgress={activePieceProgress}
                        onClick={() => setSelectedPiece(isSelected ? null : placement)}
                        onPointerDown={(e) => handlePiecePointerDown(e, placement)}
                        onRotate={() => handleRotatePiece(placement)}
                        onMouseEnter={() => setHoveredPiece(placement)}
                        onMouseLeave={() => setHoveredPiece(null)}
                      />
                    );
                  })}
                </g>

                {/* Fabric Defect Avoidance Obstacle Zones */}
                {defects.length > 0 && (
                  <g className="defect-zones-layer">
                    {defects.map((defect, idx) => {
                      const cx = defect.x * currentScale;
                      const cy = defect.y * currentScale;
                      const rCore = (defect.radius || 4.5) * currentScale;
                      const rClearance = ((defect.radius || 4.5) + (defect.clearance || 0.5)) * currentScale;

                      return (
                        <g
                          key={defect.id || `defect-${idx}`}
                          className="defect-zone group cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (removeProjectDefect && project?.id) {
                              removeProjectDefect(project.id, defect.id);
                            }
                          }}
                        >
                          {/* Clearance Safety Barrier Zone */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={rClearance}
                            fill="rgba(245, 158, 11, 0.12)"
                            stroke="#f59e0b"
                            strokeWidth="1.5"
                            strokeDasharray="4,3"
                          />
                          {/* Flaw Core Body */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={rCore}
                            fill="url(#defect-stripe-pattern)"
                            stroke="#dc2626"
                            strokeWidth="2"
                          />
                          {/* Center Hazard Marker */}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={3}
                            fill="#dc2626"
                          />
                          {/* Flaw Label Badge with click-to-remove */}
                          <g transform={`translate(${cx}, ${cy - rClearance - 8})`}>
                            <rect
                              x="-38"
                              y="-15"
                              width="76"
                              height="17"
                              rx="3"
                              fill="#991b1b"
                              opacity="0.95"
                            />
                            <text
                              x="0"
                              y="-3"
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize="9"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              FLAW #{idx + 1} ✕
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                )}

                {/* Visual Label Badges for Cut Line and Uncut Bolt */}
                {hasPartialRollCut && (
                  <g className="marker-labels-layer pointer-events-none select-none">
                    {/* Cut-off badge */}
                    <g transform={`translate(${Math.min(actualLengthUsedCm * currentScale + 6, svgWidth - 160)}, 10)`}>
                      <rect
                        x={0}
                        y={0}
                        width={145}
                        height={22}
                        rx={6}
                        fill="#FAF8F5"
                        stroke="#DDD5C7"
                        strokeWidth="1"
                      />
                      <text
                        x={8}
                        y={15}
                        fill="#143823"
                        fontSize="10"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fontWeight="600"
                      >
                        ✂ Cut Req: {actualLengthUsedCm.toFixed(1)} cm
                      </text>
                    </g>

                    {/* Uncut continuous roll stock label */}
                    {svgWidth - (actualLengthUsedCm * currentScale) > 180 && (
                      <g transform={`translate(${(actualLengthUsedCm * currentScale) + 12}, ${svgHeight - 16})`}>
                        <rect
                          x={0}
                          y={-16}
                          width={175}
                          height={20}
                          rx={5}
                          fill="#FAF8F5"
                          stroke="#E8E2D6"
                          strokeWidth="1"
                        />
                        <text
                          x={8}
                          y={-3}
                          fill="#5C665F"
                          fontSize="10"
                          fontFamily="system-ui, -apple-system, sans-serif"
                          fontWeight="500"
                        >
                          Uncut Roll: {((fabricLength - actualLengthUsedCm) / 100).toFixed(2)} m Preserved
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Floating Tooltip / Piece Inspector Card */}
        {activeInspection && interactive && (
          <div className="fixed bottom-6 right-6 z-30 bg-stone-900/95 backdrop-blur-md text-white p-4 rounded-xl shadow-2xl border border-stone-700 w-72 text-xs transition-all duration-150 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: activeInspection.color || '#0284c7' }}
                />
                <span className="font-bold text-sm tracking-wide text-white">
                  {activeInspection.category}
                </span>
              </div>
              <span className="text-[10px] font-mono bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                ID: {activeInspection.id.slice(0, 10)}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 font-mono text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">Piece Name:</span>
                <span className="text-stone-100 font-sans font-medium">{activeInspection.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Dimensions:</span>
                <span className="text-stone-100">{activeInspection.width} × {activeInspection.height} cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Orientation:</span>
                <span className="text-emerald-400">{activeInspection.rotation}° Rotation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Coordinates:</span>
                <span className="text-stone-100">X: {activeInspection.x}cm, Y: {activeInspection.y}cm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Grain Match:</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Aligned
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar / Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-stone-50 border-t border-stone-200 text-xs text-stone-600">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-stone-700">Pattern Legend:</span>
          {project?.patterns && project.patterns.length > 0 ? (
            Array.from(
              new Map(
                project.patterns.map((pat) => [
                  (pat.category || pat.name).toUpperCase(),
                  { label: (pat.category || pat.name).toUpperCase(), color: pat.color || '#0284c7' }
                ])
              ).values()
            ).map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: item.color }} />
                <span className="text-stone-600 font-mono text-[11px]">{item.label}</span>
              </div>
            ))
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#0284c7]" />
                <span className="text-stone-600">FRONT</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#059669]" />
                <span className="text-stone-600">BACK</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#d97706]" />
                <span className="text-stone-600">SLEEVE</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#7c3aed]" />
                <span className="text-stone-600">COLLAR</span>
              </div>
            </>
          )}

          {defects.length > 0 && (
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 border border-amber-400" />
              <span>{defects.length} Defect Zones (Avoidance Active)</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
          {isHumanMode ? (
            <span className="text-[#8C5E35] font-sans font-medium">
              Drag pieces to reposition with smart edge-snap. Press <strong className="font-semibold text-[#143823]">'R'</strong> to rotate.
            </span>
          ) : (
            <span className="font-sans text-[#7C857E]">Click <strong className="font-semibold text-[#143823]">'Manual Adjust'</strong> in the toolbar above to reposition pattern pieces on the fabric.</span>
          )}
        </div>
      </div>
    </div>
  );
}
