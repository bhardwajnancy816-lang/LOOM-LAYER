import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Download, 
  RotateCcw, 
  Leaf, 
  Scissors, 
  Layers, 
  CheckCircle2, 
  Play, 
  Pause, 
  ChevronRight,
  BarChart3,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../components/common/FeedbackAndNavigation';
import { FabricCanvas } from '../components/fabric/FabricCanvas';
import { useProjects } from '../context/useProjects';
import { useUserProfile } from '../context/useUserProfile';
import { useCuttingSimulation } from '../hooks/useCuttingSimulation';

import { 
  generateCuttingPlan,
  exportCuttingPlanToDXF,
  exportCuttingPlanToSVG,
  exportCuttingPlanToJSON,
  exportCuttingPlanToGCode,
  generatePrintableCuttingPlanHTML,
  downloadFile,
  openPrintableDocument
} from '../utils/cuttingPlanGenerator';

export function OptimizeResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProject } = useProjects();
  const { profile } = useUserProfile();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [simSpeed, setSimSpeed] = useState('normal'); // 'slow', 'normal', 'fast'

  const project = getProject(id);

  // Derive duration based on simulation speed
  const simDuration = useMemo(() => {
    if (simSpeed === 'slow') return 10000;
    if (simSpeed === 'fast') return 2500;
    return 5000;
  }, [simSpeed]);

  const simulation = useCuttingSimulation({
    duration: simDuration,
    placements: project?.layoutPlacements
  });

  // Reset simulation when project changes
  useEffect(() => {
    if (simulation.status === 'cutting' || simulation.status === 'paused') {
      simulation.stop();
    }
  }, [project?.id]);

  if (!project) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center bg-white rounded-2xl border border-[#E8E2D6] my-8 shadow-xs">
        <h2 className="text-xl font-serif font-bold text-[#143823]">Project Not Found</h2>
        <p className="text-xs text-[#7C857E] mt-2">The requested cutting project does not exist.</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const placements = project.layoutPlacements || [];
  const totalPlacements = placements.length || 12;
  const currentPieceIndex = Math.min(
    simulation.currentPieceIndex || 0,
    Math.max(0, totalPlacements - 1)
  );
  const currentPiece = placements[currentPieceIndex] || {
    name: 'Front Bodice',
    width: 52,
    height: 45
  };

  const isCutting = simulation.status === 'cutting';
  const progressPercent = Math.min(
    100,
    Math.round(simulation.progress || ((currentPieceIndex + 1) / totalPlacements) * 100)
  );
  const placedPiecesCount = Math.min(
    totalPlacements,
    simulation.piecesPlaced?.length || currentPieceIndex + (isCutting ? 1 : 0)
  );

  const handleTogglePlay = () => {
    if (isCutting) {
      simulation.pause();
    } else if (simulation.status === 'paused') {
      simulation.resume();
    } else {
      simulation.start();
    }
  };

  const handleResetSim = () => {
    simulation.reset();
  };

  const handleNextPiece = () => {
    if (simulation.stepForward) {
      simulation.stepForward();
    } else {
      simulation.start();
    }
  };

  // Helper SVG silhouette renderer
  const renderSilhouette = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('sleeve')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full text-stone-600 stroke-current fill-[#F5EFE6]" strokeWidth="1.5">
          <path d="M12 10 C16 6 24 6 28 10 L32 32 L8 32 Z" />
        </svg>
      );
    }
    if (n.includes('collar')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full text-stone-600 stroke-current fill-[#F5EFE6]" strokeWidth="1.5">
          <path d="M6 16 C14 20 26 20 34 16 L32 26 C24 28 16 28 8 26 Z" />
        </svg>
      );
    }
    if (n.includes('pocket')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full text-stone-600 stroke-current fill-[#F5EFE6]" strokeWidth="1.5">
          <path d="M10 12 H30 V24 L20 30 L10 24 Z" />
        </svg>
      );
    }
    // Bodice
    return (
      <svg viewBox="0 0 40 40" className="w-full h-full text-[#143823] stroke-current fill-[#E5EFE6]" strokeWidth="1.5">
        <path d="M12 8 L8 14 L14 18 L14 32 H26 L26 18 L32 14 L28 8 C24 10 16 10 12 8 Z" />
      </svg>
    );
  };

  const handleDownload = (format) => {
    try {
      const plan = generateCuttingPlan(project);
      const safeProjectName = (project.name || 'cutting_plan').replace(/\s+/g, '_').toLowerCase();

      if (format === 'dxf') {
        const dxfContent = exportCuttingPlanToDXF(plan);
        downloadFile(dxfContent, `${safeProjectName}_aama.dxf`, 'application/dxf');
      } else if (format === 'pdf') {
        const printHtml = generatePrintableCuttingPlanHTML(plan);
        openPrintableDocument(printHtml);
      } else if (format === 'svg') {
        const svgContent = exportCuttingPlanToSVG(plan);
        downloadFile(svgContent, `${safeProjectName}_vector.svg`, 'image/svg+xml');
      } else if (format === 'gcode') {
        const gcodeContent = exportCuttingPlanToGCode(plan);
        downloadFile(gcodeContent, `${safeProjectName}_cnc_laser.nc`, 'text/plain');
      }
      
      setDownloadSuccess(true);
      setTimeout(() => {
        setDownloadSuccess(false);
        setIsExportModalOpen(false);
      }, 1600);
    } catch (err) {
      console.error('Error generating cutting plan export:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          1. HEADER BAR (Reference Screen 4)
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#D8DFD8] shadow-xs bg-[#E5EFE6] shrink-0">
            <img
              src={profile?.avatar || "/atelier/user_avatar.jpg"}
              alt={profile?.name || "Designer"}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/atelier/user_avatar.jpg";
              }}
            />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#143823] tracking-tight">
              Cutting Simulation
            </h1>
            <p className="text-xs text-[#5C665F]">
              Visualize the cutting process step by step.
            </p>
          </div>
        </div>

        {/* Right Playback Controls */}
        <div className="flex items-center gap-2.5">
          {/* Speed Selector */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600 bg-white border border-[#DDD5C7] rounded-xl px-2.5 py-1.5 shadow-2xs">
            <span className="text-[#7C857E]">Speed:</span>
            <select
              value={simSpeed}
              onChange={(e) => setSimSpeed(e.target.value)}
              className="bg-transparent font-semibold text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="slow">Slow</option>
              <option value="normal">Normal</option>
              <option value="fast">Fast</option>
            </select>
          </div>

          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors shadow-xs cursor-pointer"
          >
            {isCutting ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isCutting ? 'Pause' : 'Play'}</span>
          </button>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleResetSim}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-[#DDD5C7] text-stone-700 hover:bg-[#FAF7F2] transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. TWO-COLUMN WORKSPACE: CONTROLS & CANVAS (Reference Screen 4)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Subpanel: Progress, Current Piece, Sequence (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Simulation Progress Card */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-stone-800">
                Simulation Progress
              </h3>
              <span className="text-xs font-serif font-bold text-[#143823]">
                {placedPiecesCount} / {totalPlacements} pieces
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2.5 rounded-full bg-[#EAE4D8] overflow-hidden">
                <div
                  className="h-full bg-[#143823] transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-end text-[11px] font-mono text-[#7C857E]">
                {progressPercent}%
              </div>
            </div>
          </div>

          {/* Current Piece Card */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-stone-800">
              Current Piece
            </h3>

            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
              <div className="w-12 h-12 rounded-lg bg-white border border-[#E8E2D6] p-1.5 flex items-center justify-center shrink-0">
                {renderSilhouette(currentPiece.name)}
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  {currentPiece.name || 'Front Bodice'}
                </h4>
                <p className="text-[11px] text-[#7C857E]">
                  Piece {currentPieceIndex + 1} of {totalPlacements}
                </p>
                <p className="text-[10px] font-mono text-stone-500">
                  {currentPiece.width || 52} × {currentPiece.height || 45} cm
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-1 text-[11px] text-[#5C665F]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#143823]" />
                <span>Placed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-300" />
                <span>Pending</span>
              </div>
            </div>
          </div>

          {/* Cutting Sequence Strip Card */}
          <div className="bg-white rounded-2xl border border-[#E8E2D6] p-4 sm:p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold text-stone-800">
              Cutting Sequence
            </h3>

            {/* Sequence Thumbnails Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {placements.slice(0, 5).map((pl, idx) => {
                const isActive = idx === currentPieceIndex;
                const isDone = idx < currentPieceIndex;
                return (
                  <div
                    key={idx}
                    className={`w-12 h-12 rounded-xl p-1 flex items-center justify-center shrink-0 border transition-all ${
                      isActive
                        ? 'border-[#143823] ring-2 ring-[#143823]/30 bg-[#E5EFE6]'
                        : isDone
                        ? 'border-[#CCDCCD] bg-[#FAF8F5]'
                        : 'border-[#DDD5C7] bg-white opacity-70'
                    }`}
                  >
                    {renderSilhouette(pl.name)}
                  </div>
                );
              })}
            </div>

            {/* Next Piece Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleNextPiece}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Next Piece</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(true)}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-white border border-[#DDD5C7] text-stone-800 hover:bg-[#FAF7F2] transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Plan</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/project/${project.id}/sustainability`)}
              className="py-2 px-3 rounded-xl text-xs font-semibold bg-[#E5EFE6] text-[#143823] hover:bg-[#D5E5D7] transition-colors flex items-center gap-1.5 cursor-pointer"
              title="View Sustainability ESG Report"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>ESG</span>
            </button>
          </div>

        </div>

        {/* Right Subpanel: Fabric Canvas Preview Workspace (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E8E2D6] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0EBE0]">
            <div>
              <h2 className="text-sm font-semibold text-[#143823]">
                Cutting Layout Preview
              </h2>
              <p className="text-[11px] text-[#7C857E]">
                Fabric Roll: {project.fabricLength} × {project.fabricWidth} cm ({project.fabricType || 'Cotton'})
              </p>
            </div>

            {/* Yield Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5EFE6] text-[#143823] text-xs font-semibold">
              <Leaf className="w-3.5 h-3.5" />
              <span>{project.utilization || 85}% Utilization</span>
            </div>
          </div>

          {/* Interactive Fabric Canvas */}
          <div className="rounded-xl overflow-hidden border border-[#DDD5C7] bg-[#FAF8F5]">
            <FabricCanvas
              project={project}
              interactive={true}
              showLabels={true}
              showRulers={true}
              simulation={simulation}
              className="w-full"
            />
          </div>

          {/* Bottom Metric Strip */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
              <span className="text-[10px] text-[#7C857E] block">Waste Ratio</span>
              <strong className="text-stone-900 font-mono text-sm">{project.wastePercentage || 15}%</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
              <span className="text-[10px] text-[#7C857E] block">Fabric Saved</span>
              <strong className="text-[#143823] font-mono text-sm">{project.fabricSavedMeters || '2.4'} m</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7]">
              <span className="text-[10px] text-[#7C857E] block">Nested Pieces</span>
              <strong className="text-stone-900 font-mono text-sm">{totalPlacements} pcs</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Export / Download Modal (Preserved) */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Download Cutting Plan & Markers"
        subtitle="Export CAD files ready for automated CNC cutting machines or manual plotters"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          {downloadSuccess ? (
            <div className="p-6 text-center space-y-2 bg-[#E5EFE6] rounded-xl border border-[#CCDCCD]">
              <div className="w-12 h-12 bg-white text-[#143823] rounded-full flex items-center justify-center mx-auto mb-2 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#143823]">Cutting Plan Exported!</h4>
              <p className="text-xs text-[#5C665F]">
                Your marker file has been exported with high-precision vector coordinates.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2.5">
                <div
                  onClick={() => handleDownload('dxf')}
                  className="p-3.5 rounded-xl border border-[#DDD5C7] hover:border-[#143823] hover:bg-[#FAF8F5] cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-stone-100 text-stone-800 font-mono font-bold text-xs">
                      DXF
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">DXF-AAMA Standard</div>
                      <div className="text-[11px] text-stone-500">Universal CAD vector format for CNC cutters</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-stone-400" />
                </div>

                <div
                  onClick={() => handleDownload('pdf')}
                  className="p-3.5 rounded-xl border border-[#DDD5C7] hover:border-[#143823] hover:bg-[#FAF8F5] cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-50 text-rose-800 font-mono font-bold text-xs">
                      PDF
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">1:1 Scale Marker Plotter PDF</div>
                      <div className="text-[11px] text-stone-500">Print-ready cutting master with grain markings</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-stone-400" />
                </div>

                <div
                  onClick={() => handleDownload('svg')}
                  className="p-3.5 rounded-xl border border-[#DDD5C7] hover:border-[#143823] hover:bg-[#FAF8F5] cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#FAF5EC] text-stone-800 font-mono font-bold text-xs border border-[#E5DFD4]">
                      SVG
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">Laser Path SVG</div>
                      <div className="text-[11px] text-stone-500">Optimized continuous contour stroke sequence</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-stone-400" />
                </div>

                <div
                  onClick={() => handleDownload('gcode')}
                  className="p-3.5 rounded-xl border border-[#DDD5C7] hover:border-[#143823] hover:bg-[#FAF8F5] cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#E5EFE6] text-[#143823] font-mono font-bold text-xs border border-[#CCDCCD]">
                      .NC
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-900">CNC / Laser G-Code (.nc)</div>
                      <div className="text-[11px] text-stone-500">Toolpath coordinates for automated cutter beds</div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-stone-400" />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-[#DDD5C7] bg-white text-stone-700 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

    </div>
  );
}
