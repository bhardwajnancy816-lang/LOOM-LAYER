import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileImage, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Layers,
  Maximize2,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { validatePatternImageFile, readImageFileAsDataUrl } from '../../utils/imageUploadValidator';
import { recognizePatternShape, calibratePatternDimensions } from '../../utils/patternShapeRecognizer';
import { CameraCaptureModal } from './CameraCaptureModal';
import { ErrorBoundary } from '../common/ErrorBoundary';

export function PatternUploadZone({
  patternImage = null,
  extractedShape = null,
  onUploadImage,
  onRemoveImage,
  onSaveExtractedShape,
  onAddDetectedPattern
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay' | 'side-by-side'
  const [showContour, setShowContour] = useState(true);
  const [addedPieceIds, setAddedPieceIds] = useState(new Set());
  const [calDimension, setCalDimension] = useState('width');
  const [calInput, setCalInput] = useState('');
  const [calNotice, setCalNotice] = useState(null);
  const fileInputRef = useRef(null);

  const candidatesList = extractedShape?.candidates || (extractedShape ? [extractedShape] : []);
  const currentDisplayShape = candidatesList[candidateIndex] || extractedShape;

  const handleApplyCalibration = () => {
    const val = parseFloat(calInput);
    if (!val || val <= 0 || !currentDisplayShape) return;

    const calResult = calibratePatternDimensions(currentDisplayShape, {
      knownLengthCm: val,
      referenceDimension: calDimension
    });

    if (calResult.success && calResult.shape) {
      const updatedShape = calResult.shape;
      const updatedList = candidatesList.map((c, i) => (i === candidateIndex ? updatedShape : c));
      const fullShape = {
        ...extractedShape,
        ...updatedShape,
        candidates: updatedList
      };
      if (onSaveExtractedShape) {
        onSaveExtractedShape(fullShape);
      }
      setCalNotice(`Calibrated ${calDimension} to ${val} cm.`);
      setCalInput('');
      setTimeout(() => setCalNotice(null), 4000);
    }
  };

  const handleProcessFile = async (file) => {
    setErrorMessage(null);
    setAnalysisError(null);
    setCandidateIndex(0);
    setAddedPieceIds(new Set());
    setCalNotice(null);
    if (!file) return;

    const validation = validatePatternImageFile(file);
    if (!validation.isValid) {
      setErrorMessage(validation.error);
      return;
    }

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      if (onUploadImage) {
        onUploadImage({
          imageUrl: dataUrl,
          imageName: validation.fileInfo.name,
          imageType: validation.fileInfo.type,
          imageSize: validation.fileInfo.formattedSize,
          rawBytes: validation.fileInfo.size,
          uploadedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to read image file:', err);
      setErrorMessage('Could not process the selected image. Please try another file.');
    }
  };

  const handleAnalyzePattern = async () => {
    if (!patternImage || !patternImage.imageUrl) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setCandidateIndex(0);
    setAddedPieceIds(new Set());

    try {
      // Execute local in-browser computer-vision boundary contour extraction
      const result = await recognizePatternShape(patternImage.imageUrl, {
        imageName: patternImage.imageName,
        imageType: patternImage.imageType,
        imageSize: patternImage.imageSize
      });

      if (result.success && result.shape) {
        if (onSaveExtractedShape) {
          onSaveExtractedShape({
            ...result.shape,
            candidates: result.candidates || result.shape.candidates || [result.shape],
            totalDetected: result.totalDetected || result.shape.totalDetected || 1,
            isMultiPattern: result.isMultiPattern || result.shape.isMultiPattern || false
          });
        }
      } else {
        setAnalysisError(result.error || 'Could not detect distinct pattern boundary from this image.');
      }
    } catch (err) {
      console.error('Shape recognition error:', err);
      setAnalysisError('An unexpected error occurred during pattern shape recognition.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleTriggerSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setErrorMessage(null);
    setAnalysisError(null);
    setCandidateIndex(0);
    setAddedPieceIds(new Set());
    if (onRemoveImage) {
      onRemoveImage();
    }
  };

  const handleCameraConfirm = (captured) => {
    setErrorMessage(null);
    setAnalysisError(null);
    setCandidateIndex(0);
    setAddedPieceIds(new Set());
    setCalNotice(null);

    if (onUploadImage) {
      onUploadImage({
        imageUrl: captured.dataUrl,
        imageName: `Camera_Pattern_${Date.now().toString(36)}.jpg`,
        imageType: 'JPG',
        imageSize: captured.formattedSize,
        rawBytes: captured.sizeBytes,
        uploadedAt: captured.capturedAt || new Date().toISOString(),
        isCameraCaptured: true
      });
    }
  };

  // Convert full-image normalized coordinates [0, 1] into SVG percentage points string
  const getImageOverlayPoints = (cand) => {
    if (!cand) return '';
    if (Array.isArray(cand.imageOutline) && cand.imageOutline.length > 0) {
      return cand.imageOutline
        .map((pt) => `${(pt.x * 100).toFixed(2)},${(pt.y * 100).toFixed(2)}`)
        .join(' ');
    }
    if (cand.imageBoundingBox && Array.isArray(cand.outline)) {
      const { minX, maxX, minY, maxY } = cand.imageBoundingBox;
      const spanX = maxX - minX;
      const spanY = maxY - minY;
      return cand.outline
        .map((pt) => `${((minX + pt.x * spanX) * 100).toFixed(2)},${((minY + pt.y * spanY) * 100).toFixed(2)}`)
        .join(' ');
    }
    return '';
  };

  // Convert local normalized outline points into SVG polygon points string for isolated preview
  const getSvgPointsString = (outline, boxWidth = 140, boxHeight = 140) => {
    if (!Array.isArray(outline) || outline.length === 0) return '';
    return outline
      .map((pt) => {
        const x = Math.round(pt.x * (boxWidth - 16) + 8);
        const y = Math.round(pt.y * (boxHeight - 16) + 8);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const handleAddPiece = (pieceToAdd, index) => {
    if (!onAddDetectedPattern || !pieceToAdd) return;
    onAddDetectedPattern({
      name: pieceToAdd.name || `Detected Piece ${index + 1}`,
      category: pieceToAdd.category || 'FRONT',
      shapeType: 'irregular',
      width: pieceToAdd.width || 40,
      height: pieceToAdd.height || 60,
      quantity: 1,
      rotationAllowed: true,
      grainConstraint: 'Vertical',
      outline: pieceToAdd.outline,
      normalizedCoordinates: pieceToAdd.outline,
      imageOutline: pieceToAdd.imageOutline,
      isImageDerived: true,
      isUncalibrated: pieceToAdd.isUncalibrated !== undefined ? pieceToAdd.isUncalibrated : true,
      hasCalibrationReference: Boolean(pieceToAdd.hasCalibrationReference),
      calibrationScale: pieceToAdd.calibrationScale || null,
      calibratedDimension: pieceToAdd.calibratedDimension || null,
      calibrationReferenceCm: pieceToAdd.calibrationReferenceCm || null,
      isValidated: true
    });
    setAddedPieceIds((prev) => new Set([...prev, pieceToAdd.id || `pattern-${index + 1}`]));
  };

  const handleAddAllPieces = () => {
    candidatesList.forEach((cand, idx) => {
      handleAddPiece(cand, idx);
    });
  };

  const isCurrentPieceAdded = currentDisplayShape && addedPieceIds.has(currentDisplayShape.id || `pattern-${candidateIndex + 1}`);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 ${
        isDragging
          ? 'border-crimson-500 bg-cream-50'
          : patternImage
          ? extractedShape
            ? 'border-cream-400 bg-cream-50/30'
            : 'border-cream-300 bg-stone-50/50'
          : 'border-stone-300 hover:border-stone-400 bg-white'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg,.dxf,image/png,image/jpeg,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left max-w-lg mx-auto">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong>Upload Error:</strong> {errorMessage}
          </div>
          <button 
            type="button" 
            onClick={() => setErrorMessage(null)} 
            className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {patternImage ? (
        /* Uploaded Image State with Contour Validation Workflow */
        <div className="space-y-5">
          {/* Status Badges */}
          {isAnalyzing ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-cream-100 border border-cream-300 text-stone-800 text-xs font-mono font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 text-crimson-700 animate-spin" />
              <span>Tracing Pattern Boundary & Filtering Markings...</span>
            </div>
          ) : extractedShape ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cream-100 border border-cream-300 text-stone-800 text-xs font-mono font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-crimson-700" />
              <span>
                {candidatesList.length > 1
                  ? `${candidatesList.length} Pattern Pieces Traced • Validation Recommended`
                  : 'Pattern Outline Traced • Validation Recommended'}
              </span>
            </div>
          ) : analysisError ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-xs font-mono font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Could Not Detect Pattern • Try Higher Contrast Image</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-cream-100 border border-cream-300 text-stone-700 text-xs font-mono font-medium">
              <Layers className="w-3.5 h-3.5 text-crimson-700" />
              <span>Ready for Shape Recognition & Validation</span>
            </div>
          )}

          {/* Main Inspection Card */}
          <div className="max-w-2xl mx-auto p-4 sm:p-5 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-4">
            
            {extractedShape ? (
              /* Contour-Validation Workflow View */
              <div className="space-y-4">
                {/* View Controls & Mode Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
                  <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50 text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('overlay')}
                      className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        viewMode === 'overlay'
                          ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Visual Overlay
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('side-by-side')}
                      className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                        viewMode === 'side-by-side'
                          ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Side-by-Side
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {viewMode === 'overlay' && (
                      <button
                        type="button"
                        onClick={() => setShowContour((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          showContour
                            ? 'bg-cream-100 text-stone-800 border-cream-300'
                            : 'bg-stone-100 text-stone-500 border-stone-200'
                        }`}
                        title={showContour ? 'Hide contour to inspect original image' : 'Show contour overlay'}
                      >
                        {showContour ? <Eye className="w-3.5 h-3.5 text-crimson-700" /> : <EyeOff className="w-3.5 h-3.5 text-stone-400" />}
                        <span>{showContour ? 'Contour Visible' : 'Peek Original'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Multiple Pieces Selector Navigation */}
                {candidatesList.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-stone-500 font-semibold uppercase">Pieces:</span>
                    {candidatesList.map((cand, idx) => (
                      <button
                        key={cand.id || idx}
                        type="button"
                        onClick={() => setCandidateIndex(idx)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                          candidateIndex === idx
                            ? 'bg-crimson-700 text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
                        }`}
                      >
                        <span>{`Piece ${idx + 1}: ${cand.category || 'PART'}`}</span>
                        {addedPieceIds.has(cand.id || `pattern-${idx + 1}`) && (
                          <Check className="w-3 h-3 text-emerald-300" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Main Visual Comparison Area */}
                {viewMode === 'overlay' ? (
                  /* Visual Overlay Mode */
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-stone-100/80 border border-stone-200">
                    <div className="relative inline-block max-w-full">
                      <img
                        src={patternImage.imageUrl}
                        alt={patternImage.imageName || 'Pattern Blueprint'}
                        className="max-h-60 sm:max-h-64 w-auto object-contain block rounded"
                      />
                      {showContour && (
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                        >
                          {candidatesList.map((cand, idx) => {
                            const isActive = idx === candidateIndex;
                            const pts = getImageOverlayPoints(cand);
                            if (!pts) return null;
                            return (
                              <polygon
                                key={cand.id || idx}
                                points={pts}
                                fill={isActive ? 'rgba(158, 42, 43, 0.22)' : 'rgba(5, 150, 105, 0.12)'}
                                stroke={isActive ? '#9e2a2b' : '#059669'}
                                strokeWidth={isActive ? '2.2' : '1.4'}
                                strokeDasharray={isActive ? 'none' : '3,3'}
                                strokeLinejoin="round"
                              />
                            );
                          })}
                        </svg>
                      )}
                    </div>
                    <div className="mt-2.5 text-[11px] font-mono text-stone-500 flex flex-wrap items-center justify-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-crimson-700 inline-block"></span>
                        Active Piece Boundary
                      </span>
                      {candidatesList.length > 1 && (
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                          Other Detected Pieces
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Side-by-Side Mode */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="relative group overflow-hidden rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center h-48">
                      <img
                        src={patternImage.imageUrl}
                        alt={patternImage.imageName || 'Pattern Blueprint'}
                        className="max-h-44 w-auto object-contain rounded p-2"
                      />
                    </div>
                    <div className="h-48 rounded-lg bg-cream-50 border border-cream-300 p-3 flex flex-col justify-between text-left">
                      <div className="flex items-center justify-between pb-1.5 border-b border-cream-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-crimson-700" />
                          {currentDisplayShape.name || `Piece ${candidateIndex + 1}`}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-cream-100 text-stone-800 px-1.5 py-0.5 rounded border border-cream-200">
                          {currentDisplayShape.pointCount || currentDisplayShape.outline?.length || 0} pts
                        </span>
                      </div>
                      <div className="h-24 flex items-center justify-center my-auto">
                        <svg viewBox="0 0 140 140" className="h-full w-auto">
                          <polygon
                            points={getSvgPointsString(currentDisplayShape.outline, 140, 140)}
                            fill="rgba(158, 42, 43, 0.18)"
                            stroke="#9e2a2b"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <div className="pt-1.5 border-t border-cream-200 text-[10px] font-mono text-stone-500">
                        Local Aspect Ratio: {currentDisplayShape.aspectRatio}
                      </div>
                    </div>
                  </div>
                )}

                {/* Validation Checklist & Quality Metrics */}
                <div className="p-3.5 rounded-lg bg-cream-25 border border-cream-300 text-left space-y-2">
                  <div className="text-xs font-semibold text-stone-900 flex items-center justify-between">
                    <span>Validation Inspection — {currentDisplayShape.name || `Piece ${candidateIndex + 1}`} ({currentDisplayShape.category || 'PART'})</span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {currentDisplayShape.pointCount || currentDisplayShape.outline?.length || 0} vertices
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-white border border-stone-200">
                      <div className="text-stone-500 text-[10px]">BOUNDARY STATUS</div>
                      <div className="font-semibold text-stone-900 mt-0.5">Continuous Closed Loop</div>
                    </div>
                    <div className="p-2 rounded bg-white border border-stone-200">
                      <div className="text-stone-500 text-[10px]">INTERNAL MARKINGS</div>
                      <div className={`font-semibold mt-0.5 ${currentDisplayShape.hasInternalMarkings ? 'text-amber-700' : 'text-stone-900'}`}>
                        {currentDisplayShape.hasInternalMarkings 
                          ? `Filtered (${currentDisplayShape.internalMarkingCount} excluded)` 
                          : 'Excluded / None'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-white border border-stone-200">
                      <div className="text-stone-500 text-[10px]">DIMENSIONS & SCALE</div>
                      <div className={`font-semibold mt-0.5 ${currentDisplayShape.isUncalibrated ? 'text-amber-700' : 'text-emerald-700'}`}>
                        ~{currentDisplayShape.width}×{currentDisplayShape.height}cm {currentDisplayShape.isUncalibrated ? '(uncalibrated)' : '(calibrated)'}
                      </div>
                    </div>
                  </div>

                  {/* Scale Calibration Controls */}
                  <div className="p-2.5 rounded-md bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-stone-800 text-[11px]">
                        {currentDisplayShape.isUncalibrated ? 'Scale Calibration (Reference Length)' : 'Calibrated Physical Scale'}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        {currentDisplayShape.isUncalibrated
                          ? 'Enter known reference dimension to scale pixels to exact centimetres'
                          : currentDisplayShape.calibrationNotice || `Calibrated with known ${currentDisplayShape.calibratedDimension || 'dimension'}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={calDimension}
                        onChange={(e) => setCalDimension(e.target.value)}
                        className="text-[11px] bg-white border border-stone-300 rounded px-2 py-1 text-stone-700 cursor-pointer"
                      >
                        <option value="width">Known Width</option>
                        <option value="height">Known Height</option>
                      </select>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="1"
                          max="500"
                          step="0.5"
                          placeholder="cm"
                          value={calInput}
                          onChange={(e) => setCalInput(e.target.value)}
                          className="w-16 px-2 py-1 text-[11px] font-mono border border-stone-300 rounded bg-white text-stone-800"
                        />
                        <span className="text-[10px] text-stone-400 absolute right-1.5 pointer-events-none">cm</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyCalibration}
                        disabled={!calInput || parseFloat(calInput) <= 0}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-stone-800 hover:bg-stone-700 text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                      >
                        Apply Scale
                      </button>
                    </div>
                  </div>
                  {calNotice && (
                    <div className="text-[10px] text-emerald-700 font-mono flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{calNotice}</span>
                    </div>
                  )}

                  {/* Advisory Notice when Internal Markings are detected */}
                  {currentDisplayShape.hasInternalMarkings && (
                    <div className="p-2.5 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Internal Markings Advisory:</strong> Construction lines, circular markers, or labels were detected and excluded from the boundary. Please verify that the overlay contour follows the garment profile before cutting.
                      </div>
                    </div>
                  )}

                  {/* Calibration Notice */}
                  <div className="text-[10px] font-mono text-stone-500 pt-1">
                    {currentDisplayShape.isUncalibrated
                      ? '*Note: Dimensions are uncalibrated proportional estimates. Calibrate above or verify measurements in pattern table.'
                      : '*Calibrated: Actual contour and aspect ratio strictly preserved at verified scale.'}
                  </div>
                </div>

                {/* Validation Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                  <div className="text-xs text-stone-600 text-left">
                    {isCurrentPieceAdded ? (
                      <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        This piece has been validated and added to project patterns.
                      </span>
                    ) : (
                      <span>Compare outline against original image, then validate.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {onAddDetectedPattern && (
                      <button
                        type="button"
                        onClick={() => handleAddPiece(currentDisplayShape, candidateIndex)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors inline-flex items-center gap-1.5 ${
                          isCurrentPieceAdded
                            ? 'bg-cream-100 border border-cream-300 text-stone-700 hover:bg-cream-200'
                            : 'bg-crimson-700 hover:bg-crimson-800 text-white'
                        }`}
                      >
                        {isCurrentPieceAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Add Another Copy</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Validate & Add Piece</span>
                          </>
                        )}
                      </button>
                    )}

                    {candidatesList.length > 1 && onAddDetectedPattern && (
                      <button
                        type="button"
                        onClick={handleAddAllPieces}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Validate & Add All ({candidatesList.length})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : isAnalyzing ? (
              /* Scanning State */
              <div className="h-44 rounded-lg bg-stone-50 border border-stone-200 flex flex-col items-center justify-center p-4 text-stone-500 text-xs">
                <Loader2 className="w-6 h-6 text-crimson-700 animate-spin mb-2" />
                <span>Scanning pixel boundary & analyzing pattern shapes...</span>
              </div>
            ) : (
              /* Pre-Analysis State */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="relative group overflow-hidden rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center h-44">
                  <img
                    src={patternImage.imageUrl}
                    alt={patternImage.imageName || 'Pattern Blueprint'}
                    className="max-h-40 w-auto object-contain rounded p-2"
                  />
                </div>
                <div className="h-44 rounded-lg bg-stone-50 border border-dashed border-stone-200 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <Maximize2 className="w-5 h-5 text-stone-400" />
                  <p className="text-xs text-stone-600">
                    Extract digital boundary polygon from this blueprint.
                  </p>
                  <button
                    type="button"
                    onClick={handleAnalyzePattern}
                    disabled={isAnalyzing}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-crimson-700 text-white hover:bg-crimson-800 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Analyze Pattern</span>
                  </button>
                </div>
              </div>
            )}

            {/* Analysis Error Notification if detection failed */}
            {analysisError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs text-left">
                <strong>Detection Notice:</strong> {analysisError}
              </div>
            )}

            {/* File Info Bar & Control Actions */}
            <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-left">
              <div className="truncate mr-3">
                <div className="font-semibold text-stone-900 text-xs truncate">
                  {patternImage.imageName || 'Pattern Blueprint'}
                </div>
                <div className="text-[11px] font-mono text-stone-500 flex items-center gap-1.5 mt-0.5">
                  <span>{patternImage.imageType || 'IMAGE'} • {patternImage.imageSize || 'Uploaded'}</span>
                  {patternImage.isCameraCaptured && (
                    <span className="text-[10px] font-mono font-semibold text-crimson-800 bg-crimson-50 px-1.5 py-0.5 rounded border border-crimson-200">
                      Camera Photo
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {extractedShape && (
                  <button
                    type="button"
                    onClick={handleAnalyzePattern}
                    disabled={isAnalyzing}
                    className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    title="Re-analyze outline"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-stone-600" />
                    <span>Re-Analyze</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="Capture new photo using camera"
                >
                  <Camera className="w-3.5 h-3.5 text-crimson-700" />
                  <span>Camera</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerSelect}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="Replace with another image"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
                  <span>Replace</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Streamlined Single-Layer Upload Dropzone */
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-2 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-stone-600 shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-900">
                Upload or Scan Pattern Blueprints
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Upload PNG, JPG, SVG blueprint or capture contour with camera
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleTriggerSelect}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Select File</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-crimson-800 text-white hover:bg-crimson-900 shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Take Photo</span>
            </button>
          </div>
        </div>
      )}

      {/* Interactive Camera Capture Modal wrapped in ErrorBoundary */}
      <ErrorBoundary
        componentName="PatternCameraModal"
        title="Pattern Camera Unavailable"
        message="The camera subsystem encountered an error. You can continue uploading pattern blueprints and image files manually instead."
        fallbackActionLabel="Upload Blueprint"
        onFallbackAction={handleTriggerSelect}
      >
        <CameraCaptureModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onCaptureConfirm={handleCameraConfirm}
          onFallbackToFileUpload={handleTriggerSelect}
          title="Scan Garment Pattern"
          subtitle="Capture pattern blueprint directly using your device camera"
          targetType="pattern"
        />
      </ErrorBoundary>
    </div>
  );
}
