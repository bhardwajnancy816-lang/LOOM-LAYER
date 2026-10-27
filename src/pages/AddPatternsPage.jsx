import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ArrowRight, 
  ArrowLeft,
  RotateCcw,
  Camera,
  Trash2, 
  Sparkles,
  UploadCloud,
  ChevronRight,
  Leaf,
  Layers,
  Scissors
} from 'lucide-react';
import { PatternFormModal } from '../components/fabric/PatternFormModal';
import { CameraCaptureModal } from '../components/fabric/CameraCaptureModal';
import { FabricAnalysisCard } from '../components/fabric/FabricAnalysisCard';
import { CutOrderPlanningModal } from '../components/fabric/CutOrderPlanningModal';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useProjects } from '../context/useProjects';
import { useUserProfile } from '../context/useUserProfile';
import { PRODUCT_TYPES, getProductTypeById } from '../data/productTypes';
import { validatePatternImageFile, readImageFileAsDataUrl } from '../utils/imageUploadValidator';
import { analyzeFabricImage } from '../utils/fabricAnalysisEngine';

export function AddPatternsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const [isAnalyzingFabric, setIsAnalyzingFabric] = useState(false);
  const [isCopModalOpen, setIsCopModalOpen] = useState(false);
  const { 
    getProject, 
    addPattern, 
    updatePattern, 
    deletePattern, 
    updatePatternQuantity,
    loadProductTemplates,
    uploadProjectPatternImage, 
    removeProjectPatternImage,
    setProjectExtractedShape,
    uploadProjectFabricImage,
    removeProjectFabricImage
  } = useProjects();

  const project = getProject(id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState(null);
  const [isFabricCameraOpen, setIsFabricCameraOpen] = useState(false);
  const patternFileInputRef = useRef(null);

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

  const patterns = project.patterns || [];
  const rawProductType = project.productType || 'Shirt';
  const prodObj = getProductTypeById(rawProductType);
  const productType = prodObj ? prodObj.name : rawProductType;

  const handleOpenAddModal = () => {
    setEditingPattern(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pat) => {
    setEditingPattern(pat);
    setIsModalOpen(true);
  };

  const handleSavePattern = (patternData) => {
    if (editingPattern) {
      updatePattern(project.id, editingPattern.id, patternData);
    } else {
      addPattern(project.id, patternData);
    }
  };

  const handleDeletePattern = (patternId) => {
    deletePattern(project.id, patternId);
  };

  const handleReloadTemplates = (pType) => {
    if (loadProductTemplates) {
      loadProductTemplates(project.id, pType || productType);
    }
  };

  const handlePatternFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validatePatternImageFile(file);
    if (!validation.isValid) return;

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      uploadProjectPatternImage(project.id, {
        imageUrl: dataUrl,
        imageName: validation.fileInfo.name,
        formattedSize: validation.fileInfo.formattedSize,
        sizeBytes: validation.fileInfo.size,
        uploadedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Failed to read pattern image:', err);
    }
  };

  const handleFabricCameraConfirm = (captured) => {
    if (!project || !uploadProjectFabricImage) return;
    uploadProjectFabricImage(project.id, {
      imageUrl: captured.dataUrl,
      imageName: `Fabric_Capture_${Date.now().toString(36)}.jpg`,
      formattedSize: captured.formattedSize,
      sizeBytes: captured.sizeBytes,
      capturedAt: captured.capturedAt || new Date().toISOString(),
      width: captured.width,
      height: captured.height
    });
  };

  const handleContinue = () => {
    navigate(`/project/${project.id}/optimize`);
  };

  // Helper SVG silhouette renderer
  const renderSilhouette = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('sleeve')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full text-stone-400 stroke-current fill-[#FAF5EC]" strokeWidth="1.5">
          <path d="M12 10 C16 6 24 6 28 10 L32 32 L8 32 Z" />
        </svg>
      );
    }
    if (n.includes('collar')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full text-stone-400 stroke-current fill-[#FAF5EC]" strokeWidth="1.5">
          <path d="M6 16 C14 20 26 20 34 16 L32 26 C24 28 16 28 8 26 Z" />
        </svg>
      );
    }
    if (n.includes('pocket')) {
      return (
        <svg viewBox="0 0 40 40" className="w-full h-full text-stone-400 stroke-current fill-[#FAF5EC]" strokeWidth="1.5">
          <path d="M10 12 H30 V24 L20 30 L10 24 Z" />
        </svg>
      );
    }
    // Default Bodice / Torso
    return (
      <svg viewBox="0 0 40 40" className="w-full h-full text-stone-400 stroke-current fill-[#FAF5EC]" strokeWidth="1.5">
        <path d="M12 8 L8 14 L14 18 L14 32 H26 L26 18 L32 14 L28 8 C24 10 16 10 12 8 Z" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* ========================================================
          1. HEADER BAR (Reference Screen 3)
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
              Fabric Optimizer
            </h1>
            <p className="text-xs text-[#5C665F]">
              Get the most efficient nesting layout for your patterns.
            </p>
          </div>
        </div>

        {/* Botanical Sprig Top Right */}
        <div className="hidden sm:flex items-center gap-2 text-[#143823]">
          <Leaf className="w-5 h-5 text-[#143823] opacity-80" />
        </div>
      </div>

      {/* ========================================================
          2. STEP INDICATOR BAR (Reference Screen 3)
          ======================================================== */}
      <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-4 overflow-x-auto pb-1 text-xs font-medium">
        
        {/* Step 1: Active */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#143823] text-white shadow-xs shrink-0">
          <span className="w-4 h-4 rounded-full bg-white text-[#143823] flex items-center justify-center font-bold text-[10px]">
            1
          </span>
          <span className="font-semibold">Upload Patterns</span>
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[#7C857E] hover:text-stone-900 shrink-0">
          <span className="w-4 h-4 rounded-full bg-[#E8E2D6] text-stone-600 flex items-center justify-center text-[10px]">
            2
          </span>
          <span>Fabric Settings</span>
        </div>

        {/* Step 3 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[#7C857E] hover:text-stone-900 shrink-0">
          <span className="w-4 h-4 rounded-full bg-[#E8E2D6] text-stone-600 flex items-center justify-center text-[10px]">
            3
          </span>
          <span>Optimize</span>
        </div>

        {/* Step 4 */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[#7C857E] hover:text-stone-900 shrink-0">
          <span className="w-4 h-4 rounded-full bg-[#E8E2D6] text-stone-600 flex items-center justify-center text-[10px]">
            4
          </span>
          <span>Results</span>
        </div>

      </div>

      {/* ========================================================
          3. TWO-COLUMN LAYOUT: UPLOAD ZONE + PATTERN LIST (Reference Screen 3)
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Upload Pattern Files (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E8E2D6] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#143823]">
              Upload Pattern Files
            </h2>
            <button
              type="button"
              onClick={() => setIsCopModalOpen(true)}
              className="text-[11px] font-mono text-[#143823] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>COP Bundling</span>
            </button>
          </div>

          <input
            ref={patternFileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.svg,.dxf,image/png,image/jpeg"
            onChange={handlePatternFileUpload}
            className="hidden"
          />

          {/* Large Drag & Drop Box */}
          <div 
            onClick={() => patternFileInputRef.current?.click()}
            className="border-2 border-dashed border-[#DDD5C7] hover:border-[#143823] rounded-2xl p-8 text-center bg-[#FAF8F5] transition-colors cursor-pointer group space-y-3"
          >
            <div className="w-12 h-12 rounded-full bg-white text-[#143823] border border-[#DDD5C7] flex items-center justify-center mx-auto shadow-2xs group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-800">
                Drag & drop pattern files here
              </p>
              <p className="text-[11px] text-[#7C857E] mt-0.5">
                Supports PNG, JPG, SVG, DXF
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                patternFileInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors cursor-pointer inline-block"
            >
              Choose Files
            </button>
          </div>

          {/* Pattern Silhouettes Preview Row */}
          <div>
            <p className="text-[11px] font-semibold text-[#7C857E] uppercase tracking-wider mb-2">
              Detected Silhouettes
            </p>
            <div className="grid grid-cols-4 gap-2.5">
              {['Front Bodice', 'Back Bodice', 'Sleeve', 'Pocket'].map((piece, i) => (
                <div key={i} className="h-20 rounded-xl bg-[#FAF8F5] border border-[#DDD5C7] p-2 flex flex-col items-center justify-center">
                  <div className="w-10 h-10">
                    {renderSilhouette(piece)}
                  </div>
                  <span className="text-[9px] font-mono text-[#7C857E] mt-1 truncate max-w-full">
                    {piece}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pattern List (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E8E2D6] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#143823]">
              Pattern List
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReloadTemplates(productType)}
                className="text-xs text-[#7C857E] hover:text-[#143823] cursor-pointer flex items-center gap-1"
                title="Reset to default templates"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#E5EFE6] text-[#143823] hover:bg-[#D5E5D7] cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Piece</span>
              </button>
            </div>
          </div>

          {/* Pattern Items List */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {patterns.length === 0 ? (
              <div className="text-center py-10 text-stone-400 space-y-2">
                <Scissors className="w-8 h-8 mx-auto text-stone-300" />
                <p className="text-xs">No pattern pieces loaded yet.</p>
                <button
                  type="button"
                  onClick={() => handleReloadTemplates(productType)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#143823] text-white cursor-pointer"
                >
                  Load {productType} Templates
                </button>
              </div>
            ) : (
              patterns.map((piece) => (
                <div
                  key={piece.id}
                  className="bg-[#FAF8F5] rounded-xl border border-[#DDD5C7] p-3 flex items-center justify-between gap-3 hover:border-[#143823] transition-colors"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-[#E8E2D6] p-1 flex items-center justify-center shrink-0">
                      {renderSilhouette(piece.name)}
                    </div>
                    <div>
                      <h4 
                        onClick={() => handleOpenEditModal(piece)}
                        className="text-xs font-semibold text-stone-900 hover:text-[#143823] cursor-pointer"
                      >
                        {piece.name}
                      </h4>
                      <p className="text-[11px] font-mono text-[#7C857E]">
                        {piece.width} × {piece.height} cm
                      </p>
                    </div>
                  </div>

                  {/* Right: Quantity Stepper & Delete */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-[#DDD5C7] rounded-lg bg-white overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => updatePatternQuantity(project.id, piece.id, Math.max(1, (Number(piece.quantity) || 1) - 1))}
                        className="px-2 py-1 text-stone-500 hover:bg-[#FAF8F5] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2 font-mono font-semibold text-stone-800">
                        {piece.quantity} pcs
                      </span>
                      <button
                        type="button"
                        onClick={() => updatePatternQuantity(project.id, piece.id, (Number(piece.quantity) || 1) + 1)}
                        className="px-2 py-1 text-stone-500 hover:bg-[#FAF8F5] cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePattern(piece.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete pattern piece"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bottom Next Button */}
          <div className="pt-3 border-t border-[#F0EBE0] flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              className="px-6 py-2 rounded-xl text-xs font-semibold bg-[#143823] text-white hover:bg-[#1A452B] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Pattern Form Modal */}
      <PatternFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePattern}
        initialPattern={editingPattern}
      />

      {/* Camera Capture Modal */}
      <ErrorBoundary
        componentName="FabricCameraModal"
        title="Camera Capture Unavailable"
        message="The camera subsystem encountered an error."
        fallbackActionLabel="Close"
        onFallbackAction={() => setIsFabricCameraOpen(false)}
      >
        <CameraCaptureModal
          isOpen={isFabricCameraOpen}
          onClose={() => setIsFabricCameraOpen(false)}
          onCaptureConfirm={handleFabricCameraConfirm}
          onFallbackToFileUpload={() => {}}
          title="Capture Fabric Swatch"
          subtitle="Photograph fabric weave and pattern grain alignment for visual inspection"
          targetType="fabric"
        />
      </ErrorBoundary>

      {/* Stage 1: Cut-Order Planning Modal */}
      <CutOrderPlanningModal
        isOpen={isCopModalOpen}
        onClose={() => setIsCopModalOpen(false)}
        project={project}
      />

    </div>
  );
}
